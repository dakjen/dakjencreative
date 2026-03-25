import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'
import { encrypt, decrypt } from '@/lib/vault-crypto'

const sql = () => neon(process.env.DATABASE_URL!)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = sql()
  const rows = await db`SELECT id, label, username, password_enc, url, notes, created_at FROM vault ORDER BY label`

  const entries = rows.map(r => ({
    id: r.id,
    label: r.label,
    username: r.username,
    password: decrypt(r.password_enc),
    url: r.url,
    notes: r.notes,
    created_at: r.created_at,
  }))

  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { label, username, password, url, notes } = await req.json()
  if (!label || !password) {
    return NextResponse.json({ error: 'label and password required' }, { status: 400 })
  }

  const db = sql()
  const rows = await db`
    INSERT INTO vault (label, username, password_enc, url, notes)
    VALUES (${label}, ${username ?? null}, ${encrypt(password)}, ${url ?? null}, ${notes ?? null})
    RETURNING id, label, username, url, notes, created_at
  `

  return NextResponse.json({ ...rows[0], password })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { id, label, username, password, url, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = sql()

  // Fetch current password_enc if no new password provided
  let passwordEnc: string
  if (password) {
    passwordEnc = encrypt(password)
  } else {
    const current = await db`SELECT password_enc FROM vault WHERE id = ${id}`
    if (current.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    passwordEnc = current[0].password_enc
  }

  const rows = await db`
    UPDATE vault
    SET label        = ${label},
        username     = ${username ?? null},
        password_enc = ${passwordEnc},
        url          = ${url ?? null},
        notes        = ${notes ?? null}
    WHERE id = ${id}
    RETURNING id, label, username, url, notes, created_at
  `

  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...rows[0], password: password || decrypt(passwordEnc) })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = sql()
  await db`DELETE FROM vault WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
