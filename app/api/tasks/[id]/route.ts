import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'

const sql = () => neon(process.env.DATABASE_URL!)

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { done } = await req.json()
  const db = sql()
  const rows = await db`
    UPDATE tasks SET done = ${done} WHERE id = ${params.id} RETURNING *
  `
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only owner can delete any task; team can only delete their own
  const role = (session.user as any).role
  const db = sql()

  if (role === 'owner') {
    await db`DELETE FROM tasks WHERE id = ${params.id}`
  } else {
    const userId = (session.user as any).id
    await db`DELETE FROM tasks WHERE id = ${params.id} AND created_by = ${userId}`
  }
  return NextResponse.json({ success: true })
}
