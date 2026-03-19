'use client'
import { useState, useEffect, useMemo } from 'react'

// ── TYPES ──────────────────────────────────────────────────────────────────
interface Contract {
  id: number
  client_name: string
  business_line: string
  stage: string
  probability: number
  contract_value: number | null     // stored as cents
  monthly_retainer: number | null   // stored as cents
  start_date: string | null
  end_date: string | null
  notes: string | null
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const BIZ_LINES: Record<string, { label: string; color: string; bg: string }> = {
  djc:        { label: 'DJC Marketing',    color: '#1C3557', bg: 'rgba(28,53,87,.1)'   },
  notable:    { label: 'Notable',          color: '#b07a8a', bg: 'rgba(176,122,138,.15)'},
  elitewise:  { label: 'Elitewise',        color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
  nreuv:      { label: 'NREUV / CCO',      color: '#0e7490', bg: 'rgba(14,116,144,.1)' },
  fractional: { label: 'Fractional Brand', color: '#059669', bg: 'rgba(5,150,105,.1)'  },
  linkedin:   { label: 'LI Intensive',     color: '#9333ea', bg: 'rgba(147,51,234,.1)' },
}

const STAGES: Record<string, { label: string; color: string; prob: number }> = {
  pipeline:    { label: 'Pipeline',    color: '#9ca3af', prob: 20 },
  proposal:    { label: 'Proposal',    color: '#f59e0b', prob: 40 },
  negotiation: { label: 'Negotiation', color: '#3b82f6', prob: 75 },
  active:      { label: 'Active / Won',color: '#10b981', prob: 100},
  complete:    { label: 'Complete',    color: '#6b7280', prob: 100},
  lost:        { label: 'Lost',        color: '#ef4444', prob: 0  },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)

const fmtShort = (cents: number) => {
  const v = cents / 100
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
}

// ── HELPERS ────────────────────────────────────────────────────────────────

/** Total value of a contract: one-time + (months × retainer) */
function totalContractValue(c: Contract): number {
  const cv = c.contract_value ?? 0
  let retainerTotal = 0
  if (c.monthly_retainer && c.start_date) {
    const start  = new Date(c.start_date)
    const end    = c.end_date ? new Date(c.end_date) : new Date(start.getFullYear(), start.getMonth() + 6, 1)
    const months = Math.max(1,
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    )
    retainerTotal = c.monthly_retainer * months
  } else if (c.monthly_retainer) {
    retainerTotal = c.monthly_retainer * 6 // default 6-month assumption
  }
  return cv + retainerTotal
}

/** Probability-weighted value */
function weightedValue(c: Contract): number {
  return Math.round(totalContractValue(c) * (c.probability / 100))
}

/** Build month-by-month projected revenue for the next 12 months */
function buildMonthlyProjection(contracts: Contract[]) {
  const months: { label: string; key: string; won: number; weighted: number }[] = []
  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    let won = 0, weighted = 0

    for (const c of contracts) {
      if (c.stage === 'lost' || c.stage === 'complete') continue

      // One-time contract value — attribute to start month
      if (c.contract_value && c.start_date) {
        const startKey = c.start_date.slice(0, 7)
        if (startKey === key) {
          const v = c.contract_value
          if (c.stage === 'active') won += v
          weighted += Math.round(v * c.probability / 100)
        }
      }

      // Monthly retainer — spread across term
      if (c.monthly_retainer && c.start_date) {
        const start   = new Date(c.start_date)
        const endDate = c.end_date ? new Date(c.end_date) : new Date(start.getFullYear(), start.getMonth() + 6, 1)
        const monthDate = new Date(d.getFullYear(), d.getMonth(), 1)
        if (monthDate >= start && monthDate < endDate) {
          if (c.stage === 'active') won += c.monthly_retainer
          weighted += Math.round(c.monthly_retainer * c.probability / 100)
        }
      }
    }
    months.push({ label, key, won, weighted })
  }
  return months
}

// ── BAR CHART ──────────────────────────────────────────────────────────────
function BarChart({ months }: { months: ReturnType<typeof buildMonthlyProjection> }) {
  const maxVal = Math.max(...months.map(m => Math.max(m.won, m.weighted)), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px', padding: '0 4px' }}>
      {months.map((m, i) => (
        <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
            {/* Weighted bar */}
            <div style={{
              flex: 1, borderRadius: '3px 3px 0 0',
              background: 'rgba(176,122,138,.25)',
              height: `${Math.round((m.weighted / maxVal) * 100)}%`,
              minHeight: m.weighted > 0 ? '3px' : '0',
              transition: 'height .4s ease',
            }} title={`Weighted: ${fmt(m.weighted)}`} />
            {/* Won bar */}
            <div style={{
              flex: 1, borderRadius: '3px 3px 0 0',
              background: 'var(--navy)',
              height: `${Math.round((m.won / maxVal) * 100)}%`,
              minHeight: m.won > 0 ? '3px' : '0',
              transition: 'height .4s ease',
            }} title={`Confirmed: ${fmt(m.won)}`} />
          </div>
          <span style={{ fontSize: '9px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{m.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── DONUT CHART ────────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '13px' }}>No data yet</div>

  let cumulativePct = 0
  const RADIUS = 50, CX = 60, CY = 60, SW = 18
  const slices = data.filter(d => d.value > 0).map(d => {
    const pct   = d.value / total
    const start = cumulativePct
    cumulativePct += pct
    return { ...d, pct, start }
  })

  function polarToCartesian(pct: number) {
    const angle = (pct * 360 - 90) * (Math.PI / 180)
    return {
      x: CX + RADIUS * Math.cos(angle),
      y: CY + RADIUS * Math.sin(angle),
    }
  }

  function arcPath(startPct: number, endPct: number) {
    if (endPct - startPct >= 0.999) {
      // Full circle — draw two semicircles
      const top = polarToCartesian(startPct)
      const mid = polarToCartesian(startPct + 0.5)
      return `M ${top.x} ${top.y} A ${RADIUS} ${RADIUS} 0 0 1 ${mid.x} ${mid.y} A ${RADIUS} ${RADIUS} 0 0 1 ${top.x} ${top.y} Z`
    }
    const s = polarToCartesian(startPct)
    const e = polarToCartesian(endPct)
    const large = endPct - startPct > 0.5 ? 1 : 0
    return `M ${s.x} ${s.y} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path
            key={i}
            d={arcPath(s.start, s.start + s.pct)}
            fill="none"
            stroke={s.color}
            strokeWidth={SW}
            strokeLinecap="butt"
          />
        ))}
        <text x="60" y="56" textAnchor="middle" style={{ fontSize: '10px', fill: '#6b7280', fontFamily: 'DM Sans' }}>Total</text>
        <text x="60" y="70" textAnchor="middle" style={{ fontSize: '11px', fill: '#1C3557', fontWeight: 600, fontFamily: 'DM Sans' }}>
          {fmtShort(total)}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#6b6560', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#1C3557' }}>{fmtShort(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function RevenueTracker({ userRole }: { userRole: string }) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editContract, setEditContract] = useState<Contract | null>(null)
  const [filter, setFilter] = useState<string>('all')

  // Form state
  const emptyForm = {
    clientName: '', businessLine: 'djc', stage: 'pipeline',
    probability: 50, contractValue: '', monthlyRetainer: '',
    startDate: '', endDate: '', notes: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchContracts() }, [])

  async function fetchContracts() {
    setLoading(true)
    const res  = await fetch('/api/contracts')
    const data = await res.json()
    setContracts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function openAdd() {
    setEditContract(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(c: Contract) {
    setEditContract(c)
    setForm({
      clientName:      c.client_name,
      businessLine:    c.business_line,
      stage:           c.stage,
      probability:     c.probability,
      contractValue:   c.contract_value   ? String(c.contract_value / 100)   : '',
      monthlyRetainer: c.monthly_retainer ? String(c.monthly_retainer / 100) : '',
      startDate:       c.start_date  ?? '',
      endDate:         c.end_date    ?? '',
      notes:           c.notes       ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.clientName.trim()) return
    setSaving(true)
    const payload = {
      clientName:      form.clientName,
      businessLine:    form.businessLine,
      stage:           form.stage,
      probability:     Number(form.probability),
      contractValue:   form.contractValue   ? Number(form.contractValue)   : null,
      monthlyRetainer: form.monthlyRetainer ? Number(form.monthlyRetainer) : null,
      startDate:       form.startDate  || null,
      endDate:         form.endDate    || null,
      notes:           form.notes      || null,
    }

    if (editContract) {
      await fetch(`/api/contracts/${editContract.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false)
    setShowModal(false)
    fetchContracts()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this contract?')) return
    await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
    fetchContracts()
  }

  async function handleStageChange(id: number, stage: string) {
    const prob = STAGES[stage]?.prob ?? 50
    await fetch(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, probability: prob }),
    })
    fetchContracts()
  }

  // ── DERIVED NUMBERS ───────────────────────────────────────────────────
  const active    = contracts.filter(c => c.stage === 'active')
  const pipeline  = contracts.filter(c => !['active','complete','lost'].includes(c.stage))

  const confirmedARR  = active.reduce((s, c) => s + (c.monthly_retainer ?? 0) * 12, 0)
  const confirmedTotal= active.reduce((s, c) => s + totalContractValue(c), 0)
  const weightedTotal = pipeline.reduce((s, c) => s + weightedValue(c), 0)
  const projectedTotal= confirmedTotal + weightedTotal

  const TARGET_CENTS = 50895000 // 2.5× 2025 revenue of $203,581 ≈ $508,950 in cents

  const byLine = Object.entries(BIZ_LINES).map(([key, meta]) => ({
    label: meta.label,
    color: meta.color,
    value: contracts
      .filter(c => c.business_line === key && c.stage !== 'lost')
      .reduce((s, c) => s + weightedValue(c), 0),
  })).filter(d => d.value > 0)

  const monthlyProjection = useMemo(() => buildMonthlyProjection(contracts), [contracts])

  const displayed = filter === 'all'
    ? contracts
    : contracts.filter(c => c.business_line === filter)

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeUp">

      {/* ── SUMMARY METRICS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Confirmed Revenue',   value: fmt(confirmedTotal),  sub: 'Active contracts',      accent: '#10b981' },
          { label: 'Weighted Pipeline',   value: fmt(weightedTotal),   sub: 'Probability-adjusted',  accent: '#f59e0b' },
          { label: 'Total Projected',     value: fmt(projectedTotal),  sub: 'Won + weighted pipeline', accent: '#1C3557' },
          { label: 'Confirmed ARR',       value: fmt(confirmedARR),    sub: 'Active retainers × 12', accent: '#b07a8a' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'white', border: '1px solid #e8e6e1', borderRadius: '12px',
            padding: '20px 24px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: m.accent }} />
            <div style={{ fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '8px' }}>{m.label}</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: '#1C3557', lineHeight: 1, marginBottom: '4px' }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: '#9e9a93' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 2-YEAR TARGET PROGRESS ── */}
      <div style={{ background: 'white', border: '1px solid #e8e6e1', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557' }}>2-Year Revenue Target Progress</span>
          <span style={{ fontSize: '12px', color: '#9e9a93' }}>Goal: {fmt(TARGET_CENTS)} <span style={{ color: '#9ca3af' }}>· 2.5× 2025 baseline</span></span>
        </div>
        <div style={{ background: '#f5f4f2', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            background: 'linear-gradient(90deg, #1C3557, #b07a8a)',
            width: `${Math.min(100, Math.round((projectedTotal / TARGET_CENTS) * 100))}%`,
            transition: 'width .6s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: '#b07a8a', fontWeight: 500 }}>
            {Math.min(100, Math.round((projectedTotal / TARGET_CENTS) * 100))}% of target
          </span>
          <span style={{ fontSize: '11px', color: '#9e9a93' }}>
            {fmt(Math.max(0, TARGET_CENTS - projectedTotal))} remaining
          </span>
        </div>
      </div>

      {/* ── CHARTS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'white', border: '1px solid #e8e6e1', borderRadius: '12px', padding: '20px 24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            12-Month Revenue Forecast
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9e9a93' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#1C3557', display: 'inline-block' }} /> Confirmed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9e9a93' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(176,122,138,.4)', display: 'inline-block' }} /> Weighted
              </span>
            </div>
          </div>
          <BarChart months={monthlyProjection} />
        </div>
        <div style={{ background: 'white', border: '1px solid #e8e6e1', borderRadius: '12px', padding: '20px 24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px' }}>Pipeline by Business Line</div>
          <DonutChart data={byLine} />
        </div>
      </div>

      {/* ── PIPELINE TABLE ── */}
      <div style={{ background: 'white', border: '1px solid #e8e6e1', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginRight: '4px' }}>Contracts & Pipeline</span>
          {['all', ...Object.keys(BIZ_LINES)].map(k => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '5px 12px', borderRadius: '20px', border: '1px solid',
              borderColor: filter === k ? '#1C3557' : '#e8e6e1',
              background: filter === k ? '#1C3557' : 'white',
              color: filter === k ? 'white' : '#6b6560',
              fontSize: '11px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>
              {k === 'all' ? 'All' : BIZ_LINES[k].label}
            </button>
          ))}
          <button onClick={openAdd} style={{
            marginLeft: 'auto', padding: '8px 18px', borderRadius: '8px',
            border: 'none', background: '#b07a8a', color: 'white',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
            + Add Contract
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9e9a93', fontSize: '13px' }}>Loading…</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💼</div>
            No contracts yet. Add your first one above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f5f4f2' }}>
                  {['Client', 'Line', 'Stage', 'Contract Value', 'Monthly', 'Term', 'Weighted Value', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', letterSpacing: '.06em', textTransform: 'uppercase', color: '#9e9a93', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(c => {
                  const bl = BIZ_LINES[c.business_line]
                  const st = STAGES[c.stage]
                  const wv = weightedValue(c)
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f5f4f2', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px', fontWeight: 500, color: '#1a1714' }}>{c.client_name}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, background: bl?.bg, color: bl?.color }}>
                          {bl?.label ?? c.business_line}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={c.stage}
                          onChange={e => handleStageChange(c.id, e.target.value)}
                          style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px',
                            border: '1px solid #e8e6e1', background: 'white',
                            color: st?.color, fontWeight: 500, cursor: 'pointer',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          {Object.entries(STAGES).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px', color: '#1C3557' }}>
                        {c.contract_value ? fmt(c.contract_value) : <span style={{ color: '#d1cec9' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px', color: '#1C3557' }}>
                        {c.monthly_retainer ? `${fmt(c.monthly_retainer)}/mo` : <span style={{ color: '#d1cec9' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px', color: '#6b6560', whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {c.start_date ? (
                          <>
                            {new Date(c.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                            {c.end_date && <> → {new Date(c.end_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</>}
                          </>
                        ) : <span style={{ color: '#d1cec9' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 500, color: wv > 0 ? '#10b981' : '#9e9a93' }}>{fmt(wv)}</div>
                        <div style={{ fontSize: '10px', color: '#9e9a93' }}>{c.probability}% prob.</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', color: '#9e9a93', cursor: 'pointer', fontSize: '15px', padding: '2px 4px' }} title="Edit">✏️</button>
                          {userRole === 'owner' && (
                            <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: '#9e9a93', cursor: 'pointer', fontSize: '15px', padding: '2px 4px' }} title="Delete">🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD/EDIT MODAL ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(15,31,51,.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '36px',
            width: '100%', maxWidth: '540px',
            boxShadow: '0 24px 60px rgba(0,0,0,.2)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1C3557', marginBottom: '24px' }}>
              {editContract ? 'Edit Contract' : 'Add Contract / Retainer'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Client Name - full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Client Name</label>
                <input value={form.clientName} onChange={e => setForm(f => ({...f, clientName: e.target.value}))} placeholder="e.g. UrbanCore Development" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Business Line</label>
                <select value={form.businessLine} onChange={e => setForm(f => ({...f, businessLine: e.target.value}))} style={inputStyle}>
                  {Object.entries(BIZ_LINES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Stage</label>
                <select value={form.stage} onChange={e => {
                  const s = e.target.value
                  setForm(f => ({...f, stage: s, probability: STAGES[s]?.prob ?? f.probability}))
                }} style={inputStyle}>
                  {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>One-Time Contract Value ($)</label>
                <input type="number" value={form.contractValue} onChange={e => setForm(f => ({...f, contractValue: e.target.value}))} placeholder="e.g. 8500" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Monthly Retainer ($)</label>
                <input type="number" value={form.monthlyRetainer} onChange={e => setForm(f => ({...f, monthlyRetainer: e.target.value}))} placeholder="e.g. 3000" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))} style={inputStyle} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Close Probability: <strong style={{ color: '#1C3557' }}>{form.probability}%</strong></label>
                <input type="range" min="0" max="100" step="5" value={form.probability}
                  onChange={e => setForm(f => ({...f, probability: Number(e.target.value)}))}
                  style={{ width: '100%', accentColor: '#1C3557' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9e9a93', marginTop: '2px' }}>
                  <span>0% (unlikely)</span><span>50% (possible)</span><span>100% (won)</span>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  placeholder="Optional notes..." rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.clientName.trim()} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: saving ? 'rgba(176,122,138,.5)' : '#b07a8a', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>
                {saving ? 'Saving…' : editContract ? 'Save Changes' : 'Add Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', letterSpacing: '.08em',
  textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: '1px solid #e8e6e1', borderRadius: '8px',
  fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#1a1714',
  outline: 'none', background: 'white',
}
