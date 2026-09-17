import { createHash } from 'crypto'
import { readBlob, writeBlob } from '@/lib/store/blob-store'

const STORE_KEY = 'admin_users'
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
  const data = await readBlob<{ users: AdminUser[] }>(STORE_KEY, { users: [] })
  let users = data.users || []

  const email = 'admin@gmail.com'
  const exists = users.some((u) => u.email.toLowerCase() === email)
  if (!exists) {
    const now = new Date().toISOString()
    users = [
      ...users,
      {
        id: 'admin-fixed-1',
        email,
        password_hash: hashPassword('admin@123'),
        full_name: 'Platform Admin',
        role: 'SUPER_ADMIN',
        is_active: true,
        last_login_at: null,
        created_at: now,
      },
    ]
    await writeBlob(STORE_KEY, { users })
  }
  return users
}

export async function verifyAdminLogin(
  email: string,
  password: string
): Promise<
  | { ok: true; admin: Omit<AdminUser, 'password_hash'> }
  | { ok: false; error: string }
> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !password) {
    return { ok: false, error: 'Email and password are required' }
  }

  const users = await ensureSeeded()
  const local = users.find(
    (u) => u.email.toLowerCase() === normalized && u.is_active
  )
  if (local) {
    if (local.password_hash !== hashPassword(password)) {
      return { ok: false, error: 'Invalid email or password' }
    }
    local.last_login_at = new Date().toISOString()
    await writeBlob(STORE_KEY, { users })
    const { password_hash: _, ...safe } = local
    return { ok: true, admin: safe }
  }

  return { ok: false, error: 'Invalid email or password' }
}
