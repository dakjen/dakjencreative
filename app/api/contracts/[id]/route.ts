import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'

const db = () => neon(process.env.DATABASE_URL!)

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const sql = db()

  const cvCents  = body.contractValue   != null ? Math.round(body.contractValue * 100)   : undefined
  const mrCents  = body.monthlyRetainer != null ? Math.round(body.monthlyRetainer * 100) : undefined

  const rows = await sql`
    UPDATE contracts SET
      client_name      = COALESCE(${body.clientName     ?? null}, client_name),
      business_line    = COALESCE(${body.businessLine   ?? null}, business_line),
      stage            = COALESCE(${body.stage          ?? null}, stage),
      probability      = COALESCE(${body.probability    ?? null}, probability),
      contract_value   = COALESCE(${cvCents             ?? null}, contract_value),
      monthly_retainer = COALESCE(${mrCents             ?? null}, monthly_retainer),
      start_date       = COALESCE(${body.startDate      ?? null}, start_date),
      end_date         = COALESCE(${body.endDate        ?? null}, end_date),
      notes            = COALESCE(${body.notes          ?? null}, notes)
    WHERE id = ${params.id}
    RETURNING *
  `
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'owner') {
    return NextResponse.json({ error: 'Owner only' }, { status: 403 })
  }
  const sql = db()
  await sql`DELETE FROM contracts WHERE id = ${params.id}`
  return NextResponse.json({ success: true })
}
