import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'

const db = () => neon(process.env.DATABASE_URL!)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = db()
  const rows = await sql`SELECT * FROM contracts ORDER BY created_at DESC`
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    clientName, businessLine, stage, probability,
    contractValue, monthlyRetainer, startDate, endDate, notes
  } = await req.json()

  if (!clientName?.trim() || !businessLine) {
    return NextResponse.json({ error: 'clientName and businessLine required' }, { status: 400 })
  }

  const sql = db()
  const userId = (session.user as any).id

  // Store dollar values as cents to avoid float issues
  const cvCents  = contractValue   ? Math.round(contractValue * 100)   : null
  const mrCents  = monthlyRetainer ? Math.round(monthlyRetainer * 100) : null

  const rows = await sql`
    INSERT INTO contracts
      (client_name, business_line, stage, probability, contract_value, monthly_retainer, start_date, end_date, notes, created_by)
    VALUES
      (${clientName}, ${businessLine}, ${stage ?? 'pipeline'}, ${probability ?? 50},
       ${cvCents}, ${mrCents}, ${startDate ?? null}, ${endDate ?? null}, ${notes ?? null}, ${userId})
    RETURNING *
  `
  return NextResponse.json(rows[0])
}
