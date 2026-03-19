import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const sql = () => neon(process.env.DATABASE_URL!)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = sql()
  const users = await db`SELECT id, name, email, role, initials, created_at FROM users ORDER BY id`
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { name, email, password, role, initials } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, password required' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)
  const db = sql()

  try {
    const rows = await db`
      INSERT INTO users (name, email, password, role, initials)
      VALUES (${name}, ${email.toLowerCase()}, ${hash}, ${role ?? 'team'}, ${initials ?? name.slice(0,2).toUpperCase()})
      RETURNING id, name, email, role, initials
    `
    return NextResponse.json(rows[0])
  } catch {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
  }
}
