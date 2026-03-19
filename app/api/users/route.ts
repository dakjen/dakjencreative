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
  const users = await db`SELECT id, name, email, role, initials, hourly_rate, weekly_hours, pay_schedule, created_at FROM users ORDER BY id`

  const isOwner = (session.user as any).role === 'owner'
  if (!isOwner) {
    return NextResponse.json(users.map(({ hourly_rate, weekly_hours, pay_schedule, ...rest }) => rest))
  }

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { name, email, password, role, initials, hourly_rate, weekly_hours, pay_schedule } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, password required' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)
  const db = sql()

  try {
    const rows = await db`
      INSERT INTO users (name, email, password, role, initials, hourly_rate, weekly_hours, pay_schedule)
      VALUES (${name}, ${email.toLowerCase()}, ${hash}, ${role ?? 'team'}, ${initials ?? name.slice(0,2).toUpperCase()}, ${hourly_rate ?? null}, ${weekly_hours ?? null}, ${pay_schedule ?? null})
      RETURNING id, name, email, role, initials, hourly_rate, weekly_hours, pay_schedule
    `
    return NextResponse.json(rows[0])
  } catch {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { id, hourly_rate, weekly_hours, pay_schedule } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const db = sql()
  const rows = await db`
    UPDATE users
    SET hourly_rate = ${hourly_rate ?? null},
        weekly_hours = ${weekly_hours ?? null},
        pay_schedule = ${pay_schedule ?? null}
    WHERE id = ${id}
    RETURNING id, name, email, role, initials, hourly_rate, weekly_hours, pay_schedule
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}
