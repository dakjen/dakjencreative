import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'

const sql = () => neon(process.env.DATABASE_URL!)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = sql()
  const tasks = await db`SELECT * FROM tasks ORDER BY created_at DESC`
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, tag, due, assignee } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Task text required' }, { status: 400 })

  const db = sql()
  const userId = (session.user as any).id
  const rows = await db`
    INSERT INTO tasks (text, tag, due, assignee, created_by)
    VALUES (${text}, ${tag ?? 'djc'}, ${due ?? null}, ${assignee ?? null}, ${userId})
    RETURNING *
  `
  return NextResponse.json(rows[0])
}
