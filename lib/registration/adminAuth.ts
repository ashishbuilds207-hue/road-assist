import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { getDataDir } from '@/lib/data-dir'

const DATA_DIR = getDataDir()
const ADMIN_FILE = path.join(DATA_DIR, 'admin_users.json')
const SALT = 'rsa-admin-v1'

export type AdminUser = {
  id: string
  email: string
  password_hash: string
  full_name: string
  role: string
  is_active: boolean
  last_login_at?: string | null
  created_at: string
}

function hashPassword(password: string): string {
  return createHash('sha256').update(`${password}${SALT}`).digest('hex')
}

async function ensureSeeded(): Promise<AdminUser[]> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  let users: AdminUser[] = []
  try {
    const raw = await fs.readFile(ADMIN_FILE, 'utf8')
    users = (JSON.parse(raw) as { users: AdminUser[] }).users || []
  } catch {
    users = []
  }

  const email = 'admin@gmail.com'
  const exists = users.some((u) => u.email.toLowerCase() === email)
  if (!exists) {
    const now = new Date().toISOString()
    users.push({
      id: 'admin-fixed-1',
      email,
      password_hash: hashPassword('admin@123'),
      full_name: 'Platform Admin',
      role: 'SUPER_ADMIN',
      is_active: true,
      last_login_at: null,
      created_at: now,
    })
    await fs.writeFile(ADMIN_FILE, JSON.stringify({ users }, null, 2), 'utf8')
  }
  return users
}

export async function verifyAdminLogin(
  email: string,
  password: string
): Promise<{ ok: true; admin: Omit<AdminUser, 'password_hash'> } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !password) {
    return { ok: false, error: 'Email and password are required' }
  }

  // Prefer local seeded DB file (always available)
  const users = await ensureSeeded()
  const local = users.find(
    (u) => u.email.toLowerCase() === normalized && u.is_active
  )
  if (local) {
    if (local.password_hash !== hashPassword(password)) {
      return { ok: false, error: 'Invalid email or password' }
    }
    local.last_login_at = new Date().toISOString()
    await fs.writeFile(ADMIN_FILE, JSON.stringify({ users }, null, 2), 'utf8')
    const { password_hash: _, ...safe } = local
    return { ok: true, admin: safe }
  }

  // Optional: try Supabase admin_users table
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      const res = await fetch(
        `${url}/rest/v1/admin_users?email=eq.${encodeURIComponent(normalized)}&is_active=eq.true&select=*`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        }
      )
      if (res.ok) {
        const rows = (await res.json()) as AdminUser[]
        const row = rows[0]
        if (row && row.password_hash === hashPassword(password)) {
          const { password_hash: _, ...safe } = row
          return { ok: true, admin: safe }
        }
      }
    }
  } catch {
    // ignore — local store is primary
  }

  return { ok: false, error: 'Invalid email or password' }
}
