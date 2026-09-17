import { promises as fs } from 'fs'
import path from 'path'
import { getDataDir } from '@/lib/data-dir'

function supabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return (
    Boolean(url) &&
    Boolean(key) &&
    !url.includes('your-project') &&
    key.length > 20
  )
}

function filePath(key: string) {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, '_')
  return path.join(getDataDir(), `${safe}.json`)
}

async function readFileBlob<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath(key), 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeFileBlob(key: string, value: unknown) {
  const dir = getDataDir()
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath(key), JSON.stringify(value, null, 2), 'utf8')
}

async function readSupabaseBlob<T>(key: string, fallback: T): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const keyAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const res = await fetch(
    `${url}/rest/v1/rsa_store?key=eq.${encodeURIComponent(key)}&select=value`,
    {
      headers: {
        apikey: keyAnon,
        Authorization: `Bearer ${keyAnon}`,
      },
      cache: 'no-store',
    }
  )
  if (!res.ok) return fallback
  const rows = (await res.json()) as { value: T }[]
  if (!Array.isArray(rows) || rows.length === 0) return fallback
  return (rows[0]?.value as T) ?? fallback
}

async function writeSupabaseBlob(key: string, value: unknown) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const keyAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const res = await fetch(`${url}/rest/v1/rsa_store?on_conflict=key`, {
    method: 'POST',
    headers: {
      apikey: keyAnon,
      Authorization: `Bearer ${keyAnon}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      key,
      value,
      updated_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`rsa_store write failed: ${res.status} ${text}`)
  }
}

/**
 * Durable shared JSON blobs.
 * Prefer Supabase `rsa_store` (works across Vercel instances).
 * Fall back to local/.tmp files when Supabase is unavailable.
 */
export async function readBlob<T>(key: string, fallback: T): Promise<T> {
  if (supabaseConfigured()) {
    try {
      return await readSupabaseBlob(key, fallback)
    } catch {
      // fall through to file
    }
  }
  return readFileBlob(key, fallback)
}

export async function writeBlob(key: string, value: unknown): Promise<void> {
  if (supabaseConfigured()) {
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await writeSupabaseBlob(key, value)
        return
      } catch (e) {
        lastErr = e
        await new Promise((r) => setTimeout(r, 80 * (attempt + 1)))
      }
    }
    console.error('rsa_store write failed after retries', lastErr)
  }
  await writeFileBlob(key, value)
}

export function isDurableStoreEnabled() {
  return supabaseConfigured()
}
