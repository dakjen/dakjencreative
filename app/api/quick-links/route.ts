import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'

const sql = () => neon(process.env.DATABASE_URL!)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = sql()
  const rows = await db`SELECT id, name, url, icon, created_at FROM quick_links ORDER BY id`
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { name, url, icon } = await req.json()
  if (!name || !url) {
    return NextResponse.json({ error: 'name and url required' }, { status: 400 })
  }

  const db = sql()
  const rows = await db`
    INSERT INTO quick_links (name, url, icon)
    VALUES (${name}, ${url}, ${icon ?? '🔗'})
    RETURNING id, name, url, icon, created_at
  `
  return NextResponse.json(rows[0])
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { id, name, url, icon } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = sql()
  const rows = await db`
    UPDATE quick_links
    SET name = COALESCE(${name ?? null}, name),
        url = COALESCE(${url ?? null}, url),
        icon = COALESCE(${icon ?? null}, icon)
    WHERE id = ${id}
    RETURNING id, name, url, icon, created_at
  `

  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = sql()
  await db`DELETE FROM quick_links WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
