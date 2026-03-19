'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Session } from 'next-auth'
import RevenueTracker from '@/components/RevenueTracker'

const BIZ_LINES_META = {
  djc:        { label: 'DJC Marketing',    badge: 'Lease-Up Marketing', desc: 'Results-driven lease-up marketing for affordable housing.' },
  notable:    { label: 'Notable',          badge: 'Brand Presence',     desc: 'Platform-building for women founders & executives.'         },
  elitewise:  { label: 'Elitewise Escapes',badge: 'Luxury Travel',      desc: 'Bespoke luxury travel curation.'                           },
  fractional: { label: 'Fractional Services', badge: 'Fractional Services', desc: 'Fractional executive & brand leadership retainers.'       },
  community:  { label: 'Business Community', badge: 'Small Biz Support',   desc: 'Small business consulting & community support.'            },
}

const QUICK_LINKS = [
  { icon: '📁', label: 'Google Drive', href: 'https://drive.google.com'            },
  { icon: '📧', label: 'Gmail',        href: 'https://mail.google.com'             },
  { icon: '💬', label: 'Slack',        href: 'https://slack.com'                   },
  { icon: '📦', label: 'Box',          href: 'https://box.com'                     },
  { icon: '💰', label: 'QuickBooks',   href: 'https://quickbooks.intuit.com'       },
  { icon: '🎨', label: 'Canva',        href: 'https://canva.com'                   },
  { icon: '📋', label: 'Notion',       href: 'https://notion.so'                   },
  { icon: '🔗', label: 'LinkedIn',     href: 'https://linkedin.com'                },
]

const NAV = [
  { id: 'overview',      label: 'Dashboard',      section: 'overview' },
  { id: 'revenue',       label: 'Revenue Tracker',section: 'overview' },
  { id: 'tasks',         label: 'Tasks',           section: 'overview' },
  { id: 'djc',           label: 'DJC Marketing',   section: 'lines'   },
  { id: 'notable',       label: 'Notable',         section: 'lines'   },
  { id: 'elitewise',     label: 'Elitewise',       section: 'lines'   },
  { id: 'websites',      label: 'Websites',        section: 'workspace'},
  { id: 'integrations',  label: 'Integrations',    section: 'workspace'},
  { id: 'financials',    label: 'Financials',      section: 'workspace'},
  { id: 'team',          label: 'Team',            section: 'workspace'},
]

const PAGE_TITLES: Record<string, string> = {
  overview: 'Dashboard', revenue: 'Revenue Tracker', tasks: 'Tasks',
  djc: 'DJC Marketing', notable: 'Notable', elitewise: 'Elitewise Escapes',
  websites: 'Websites', integrations: 'Integrations',
  financials: 'Financials', team: 'Team',
}

// ── TASK TYPES ──
interface Task { id: number; text: string; tag: string; due: string | null; assignee: string | null; done: boolean }

// ── STYLES ──
const card: React.CSSProperties = { background: 'white', border: '1px solid #e8e6e1', borderRadius: '12px', padding: '24px' }

export default function DashboardClient({ session }: { session: Session }) {
  const [page, setPage]         = useState('overview')
  const [tasks, setTasks]       = useState<Task[]>([])
  const [tasksLoaded, setTasksLoaded] = useState(false)
  const [taskFilter, setTaskFilter]   = useState('all')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newTask, setNewTask]   = useState({ text: '', tag: 'djc', due: '', assignee: 'Dakotah' })

  // ── TEAM STATE ──
  interface TeamMember { id: number; name: string; email: string; role: string; initials: string; hourly_rate: number | null; weekly_hours: number | null; pay_schedule: string | null; created_at: string }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamLoaded, setTeamLoaded]   = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [teamForm, setTeamForm] = useState({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '' })
  const [teamMsg, setTeamMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const user     = session.user as any
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()
  const dateStr  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  async function loadTasks() {
    if (tasksLoaded) return
    const res  = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(Array.isArray(data) ? data : [])
    setTasksLoaded(true)
  }

  async function loadTeam() {
    if (teamLoaded) return
    const res  = await fetch('/api/users')
    const data = await res.json()
    setTeamMembers(Array.isArray(data) ? data : [])
    setTeamLoaded(true)
  }

  async function addTeamMember() {
    if (!teamForm.name.trim() || !teamForm.email.trim() || !teamForm.password.trim()) return
    setTeamMsg(null)
    const body: any = { ...teamForm }
    if (body.hourly_rate) body.hourly_rate = Number(body.hourly_rate)
    else delete body.hourly_rate
    if (body.weekly_hours) body.weekly_hours = Number(body.weekly_hours)
    else delete body.weekly_hours
    if (!body.pay_schedule) delete body.pay_schedule
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const member = await res.json()
      setTeamMembers(ms => [...ms, member])
      setTeamForm({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '' })
      setShowTeamModal(false)
      setTeamMsg({ type: 'success', text: `${member.name} added successfully.` })
    } else {
      const err = await res.json()
      setTeamMsg({ type: 'error', text: err.error ?? 'Something went wrong.' })
    }
  }

  async function updateTeamMember() {
    if (!editingMember) return
    setTeamMsg(null)
    const body: any = {
      id: editingMember.id,
      hourly_rate: teamForm.hourly_rate ? Number(teamForm.hourly_rate) : null,
      weekly_hours: teamForm.weekly_hours ? Number(teamForm.weekly_hours) : null,
      pay_schedule: teamForm.pay_schedule || null,
    }
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json()
      setTeamMembers(ms => ms.map(m => m.id === updated.id ? { ...m, ...updated } : m))
      setEditingMember(null)
      setShowTeamModal(false)
      setTeamForm({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '' })
      setTeamMsg({ type: 'success', text: `${updated.name} updated.` })
    } else {
      const err = await res.json()
      setTeamMsg({ type: 'error', text: err.error ?? 'Something went wrong.' })
    }
  }

  function openEditModal(m: TeamMember) {
    setEditingMember(m)
    setTeamForm({
      name: m.name, email: m.email, password: '', role: m.role,
      hourly_rate: m.hourly_rate?.toString() ?? '',
      weekly_hours: m.weekly_hours?.toString() ?? '',
      pay_schedule: m.pay_schedule ?? '',
    })
    setTeamMsg(null)
    setShowTeamModal(true)
  }

  function goTo(id: string) {
    setPage(id)
    if (id === 'tasks') loadTasks()
    if (id === 'team') loadTeam()
  }

  async function toggleTask(id: number, done: boolean) {
    await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !done }) })
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !done } : t))
  }

  async function deleteTask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  async function addTask() {
    if (!newTask.text.trim()) return
    const res  = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTask) })
    const data = await res.json()
    setTasks(ts => [data, ...ts])
    setNewTask({ text: '', tag: 'djc', due: '', assignee: 'Dakotah' })
    setShowTaskModal(false)
  }

  const openTasks   = tasks.filter(t => !t.done)
  const shownTasks  = taskFilter === 'all' ? tasks : tasks.filter(t => t.tag === taskFilter)

  const tagColors: Record<string, string> = { djc: '#1C3557', notable: '#b07a8a', elitewise: '#6366f1', fractional: '#059669', community: '#d97706' }
  const tagBg: Record<string, string>     = { djc: 'rgba(28,53,87,.08)', notable: 'rgba(176,122,138,.12)', elitewise: 'rgba(99,102,241,.08)', fractional: 'rgba(5,150,105,.08)', community: 'rgba(217,119,6,.08)' }
  const tagLabel: Record<string, string>  = { djc: 'DJC Marketing', notable: 'Notable', elitewise: 'Elitewise', fractional: 'Fractional', community: 'Community' }

  // ── SIDEBAR ──
  const sidebar = (
    <nav style={{ width: '240px', background: '#0f1f33', height: '100vh', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,.04)', zIndex: 50 }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontSize: '26px', color: 'white', lineHeight: 1 }}>D</span>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: '26px', color: '#b07a8a', lineHeight: 1 }}>J</span>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'white', letterSpacing: '.06em' }}>DakJen Creative</div>
            <div style={{ fontSize: '10px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginTop: '2px' }}>Command Center</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        {(['overview','lines','workspace'] as const).map(section => (
          <div key={section}>
            <div style={{ fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.2)', padding: '12px 20px 4px' }}>
              {section === 'overview' ? 'Overview' : section === 'lines' ? 'Business Lines' : 'Workspace'}
            </div>
            {NAV.filter(n => n.section === section).map(n => (
              <button key={n.id} onClick={() => goTo(n.id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '9px 20px', textAlign: 'left',
                border: 'none',
                borderLeft: `2px solid ${page === n.id ? '#b07a8a' : 'transparent'}`,
                background: page === n.id ? 'rgba(176,122,138,.08)' : 'transparent',
                color: page === n.id ? 'white' : 'rgba(255,255,255,.5)',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                transition: 'all .15s',
              }}>
                {n.label}
                {n.id === 'tasks' && openTasks.length > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#b07a8a', color: 'white', fontSize: '10px', padding: '1px 7px', borderRadius: '10px' }}>
                    {openTasks.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#b07a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
            {user.initials ?? user.name?.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', textTransform: 'capitalize' }}>{user.role}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)', padding: '4px' }}>
            ⎋
          </button>
        </div>
      </div>
    </nav>
  )

  // ── PAGE CONTENT ──
  const renderPage = () => {
    switch (page) {

      case 'overview': return (
        <div className="animate-fadeUp">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: '2025 Revenue',   value: '$203K', sub: 'Across all lines'    },
              { label: 'Net Income',     value: '$37K',  sub: 'After expenses'      },
              { label: 'Active Clients', value: '6+',    sub: 'Across service lines'},
              { label: 'Open Tasks',     value: String(openTasks.length), sub: 'Assigned to team'},
            ].map((m, i) => (
              <div key={m.label} style={{ background: 'white', border: '1px solid #e8e6e1', borderRadius: '12px', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: i % 2 === 0 ? '#b07a8a' : '#1C3557' }} />
                <div style={{ fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '8px' }}>{m.label}</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '34px', fontWeight: 300, color: '#1C3557', lineHeight: 1, marginBottom: '4px' }}>{m.value}</div>
                <div style={{ fontSize: '12px', color: '#9e9a93' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '14px' }}>Business Lines</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
            {Object.entries(BIZ_LINES_META).map(([key, meta]) => (
              <div key={key} onClick={() => goTo(key.split('_')[0])} style={{ ...card, cursor: 'pointer', transition: 'all .2s', padding: '20px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = '#1C3557' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = '#e8e6e1' }}>
                <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', background: 'rgba(28,53,87,.07)', color: '#1C3557', marginBottom: '10px' }}>{meta.badge}</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '19px', color: '#1C3557', marginBottom: '4px' }}>{meta.label}</div>
                <div style={{ fontSize: '12px', color: '#9e9a93' }}>{meta.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px' }}>Quick Access</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                {QUICK_LINKS.map(ql => (
                  <a key={ql.label} href={ql.href} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', background: '#f5f4f2', borderRadius: '8px', textDecoration: 'none', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1C3557')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f5f4f2')}>
                    <span style={{ fontSize: '18px' }}>{ql.icon}</span>
                    <span style={{ fontSize: '10px', color: '#6b6560', textAlign: 'center' }}>{ql.label}</span>
                  </a>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                Revenue Snapshot
                <button onClick={() => goTo('revenue')} style={{ background: 'none', border: 'none', color: '#b07a8a', fontSize: '12px', cursor: 'pointer' }}>View tracker →</button>
              </div>
              <div style={{ fontSize: '12px', color: '#9e9a93', padding: '20px 0', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', color: '#1C3557', fontWeight: 300, marginBottom: '4px' }}>$203K</div>
                <div>2025 confirmed revenue</div>
                <button onClick={() => goTo('revenue')} style={{ marginTop: '12px', padding: '8px 16px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', fontSize: '12px', color: '#1C3557', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Add contracts & forecast →
                </button>
              </div>
            </div>
          </div>
        </div>
      )

      case 'revenue': return <RevenueTracker userRole={user.role} />

      case 'tasks': return (
        <div className="animate-fadeUp">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {['all','djc','notable','elitewise','fractional','community'].map(f => (
              <button key={f} onClick={() => setTaskFilter(f)} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: taskFilter === f ? '#1C3557' : '#e8e6e1', background: taskFilter === f ? '#1C3557' : 'white', color: taskFilter === f ? 'white' : '#6b6560', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {f === 'all' ? 'All' : tagLabel[f]}
              </button>
            ))}
            <button onClick={() => setShowTaskModal(true)} style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#b07a8a', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              + Add Task
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {shownTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
                No tasks here.
              </div>
            ) : shownTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'white', border: '1px solid #e8e6e1', borderRadius: '10px', padding: '14px 18px' }}>
                <div onClick={() => toggleTask(t.id, t.done)} style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${t.done ? '#b07a8a' : '#e8e6e1'}`, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.done ? '#b07a8a' : 'transparent', color: 'white', fontSize: '10px' }}>
                  {t.done && '✓'}
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: t.done ? '#9e9a93' : '#1a1714', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', background: tagBg[t.tag] ?? '#f5f4f2', color: tagColors[t.tag] ?? '#6b6560' }}>{tagLabel[t.tag] ?? t.tag}</span>
                  {t.due && <span style={{ fontSize: '11px', color: '#9e9a93' }}>{new Date(t.due + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  {t.assignee && <span style={{ fontSize: '11px', background: '#f5f4f2', padding: '2px 8px', borderRadius: '4px', color: '#6b6560' }}>{t.assignee}</span>}
                  <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: '#e8e6e1', cursor: 'pointer', fontSize: '16px' }}>×</button>
                </div>
              </div>
            ))}
          </div>

          {showTaskModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,31,51,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setShowTaskModal(false) }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,.2)' }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1C3557', marginBottom: '24px' }}>Add Task</h2>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Task</label>
                  <input value={newTask.text} onChange={e => setNewTask(n => ({...n, text: e.target.value}))} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="e.g. Send proposal to UrbanCore" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Business Line</label>
                    <select value={newTask.tag} onChange={e => setNewTask(n => ({...n, tag: e.target.value}))} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none' }}>
                      <option value="djc">DJC Marketing</option>
                      <option value="notable">Notable</option>
                      <option value="elitewise">Elitewise</option>
                      <option value="fractional">Fractional</option>
                      <option value="community">Business Community</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Due Date</label>
                    <input type="date" value={newTask.due} onChange={e => setNewTask(n => ({...n, due: e.target.value}))} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Assign To</label>
                  <select value={newTask.assignee} onChange={e => setNewTask(n => ({...n, assignee: e.target.value}))} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none' }}>
                    {['Dakotah','Olivia','Jarea','Brittni','Team'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowTaskModal(false)} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
                  <button onClick={addTask} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#b07a8a', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>Add Task</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )

      case 'financials': return (
        <div className="animate-fadeUp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={card}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px' }}>2025 Revenue by Line</div>
            {[['Creative Consulting','$91,852'],['DJC Marketing','$70,900'],['Family Office Mgmt','$29,000'],['Elitewise Escapes','$9,280'],['Web Dev & Design','$1,989'],['Design & Delivery','$625']].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f5f4f2', fontSize: '13px' }}>
                <span style={{ color: '#6b6560' }}>{l}</span><span style={{ fontWeight: 500, color: '#16a34a' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '13px', borderTop: '2px solid #e8e6e1', marginTop: '4px' }}>
              <span style={{ fontWeight: 600 }}>Total Revenue</span>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#16a34a', fontWeight: 300 }}>$203,581</span>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px' }}>2025 Expenses & Net</div>
            {[['Payroll & Wages','$109,219'],['Marketing Expenses','$35,489'],['Office & Software','$3,651'],['Travel','$2,101'],['Supplies','$2,319'],['Other','$13,738']].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f5f4f2', fontSize: '13px' }}>
                <span style={{ color: '#6b6560' }}>{l}</span><span style={{ fontWeight: 500, color: '#dc2626' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: '13px', borderTop: '2px solid #e8e6e1', marginTop: '4px' }}>
              <span style={{ fontWeight: 600 }}>Net Income</span>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#16a34a', fontWeight: 300 }}>$37,187</span>
            </div>
          </div>
        </div>
      )

      case 'integrations': return (
        <div className="animate-fadeUp" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {[
            { icon:'📁', name:'Google Drive',    href:'https://drive.google.com',           desc:'Team documents & files.',           connected: true },
            { icon:'📧', name:'Gmail',           href:'https://mail.google.com',            desc:'dakjencreativellc@gmail.com',        connected: true },
            { icon:'💬', name:'Slack',           href:'https://slack.com',                  desc:'Team messaging.',                    connected: true },
            { icon:'📦', name:'Box',             href:'https://box.com',                    desc:'Secure client file storage.',       connected: true },
            { icon:'💰', name:'QuickBooks',      href:'https://quickbooks.intuit.com',      desc:'Accounting & invoicing.',           connected: true },
            { icon:'🎨', name:'Canva',           href:'https://canva.com',                  desc:'Design & brand materials.',         connected: true },
            { icon:'📋', name:'Notion',          href:'https://notion.so',                  desc:'Wiki & project management.',        connected: false},
            { icon:'🔗', name:'LinkedIn',        href:'https://linkedin.com',               desc:'~920 connections mapped.',          connected: true },
            { icon:'📅', name:'Google Calendar', href:'https://calendar.google.com',        desc:'Team scheduling.',                  connected: true },
          ].map(i => (
            <div key={i.name} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f5f4f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{i.icon}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{i.name}</div>
                  <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: i.connected ? '#16a34a' : '#9e9a93' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: i.connected ? '#4ade80' : '#d1cec9', display: 'inline-block' }} />
                    {i.connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#9e9a93', flex: 1 }}>{i.desc}</div>
              <a href={i.href} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '12px', fontWeight: 500, background: i.connected ? '#f5f4f2' : '#1C3557', color: i.connected ? '#1C3557' : 'white', border: '1px solid', borderColor: i.connected ? '#e8e6e1' : '#1C3557', textDecoration: 'none', textAlign: 'center' }}>
                {i.connected ? `Open ${i.name} →` : 'Connect →'}
              </a>
            </div>
          ))}
        </div>
      )

      case 'websites': return (
        <div className="animate-fadeUp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { icon:'🎨', name:'DakJen Creative LLC',    url:'dakjencreative.com',         href:'https://dakjencreative.com', desc:'Main brand website' },
            { icon:'✍️', name:'Notable / Go Be Notable', url:'gobenotable.com',            href:'#',                         desc:'Brand presence platform' },
            { icon:'✈️', name:'Elitewise Escapes',       url:'elitewiseescapes.com',       href:'#',                         desc:'Luxury travel curation' },
            { icon:'🏢', name:'DJC Marketing',           url:'dakjencreative.com/marketing',href:'https://dakjencreative.com',desc:'Lease-up marketing' },
          ].map(s => (
            <a key={s.name} href={s.href} target="_blank" rel="noreferrer" style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', transition: 'all .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1C3557'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8e6e1'; (e.currentTarget as HTMLElement).style.transform = '' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#f5f4f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1C3557' }}>{s.name}</div>
                <div style={{ fontSize: '12px', color: '#b07a8a' }}>{s.url}</div>
                <div style={{ fontSize: '11px', color: '#9e9a93', marginTop: '2px' }}>{s.desc}</div>
              </div>
              <span style={{ color: '#e8e6e1', fontSize: '18px' }}>→</span>
            </a>
          ))}
        </div>
      )

      case 'team': {
        const memberColors = ['#1C3557','#b07a8a','#6366f1','#0e7490','#16a34a','#d97706']
        return (
        <div className="animate-fadeUp">
          {/* Header row with Add button */}
          {user.role === 'owner' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={() => { setTeamMsg(null); setEditingMember(null); setTeamForm({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '' }); setShowTeamModal(true) }} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#b07a8a', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                + Add Team Member
              </button>
            </div>
          )}

          {/* Success / error banner */}
          {teamMsg && (
            <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: teamMsg.type === 'success' ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.08)', color: teamMsg.type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${teamMsg.type === 'success' ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}` }}>
              {teamMsg.text}
            </div>
          )}

          {/* Team member cards */}
          {!teamLoaded ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>Loading team...</div>
          ) : teamMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>No team members found.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '28px' }}>
              {teamMembers.map((m, i) => (
                <div key={m.id} style={{ ...card, textAlign: 'center', position: 'relative' }}>
                  {user.role === 'owner' && (
                    <button onClick={() => openEditModal(m)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9a93', fontSize: '12px', padding: '2px 6px' }} title="Edit">
                      Edit
                    </button>
                  )}
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: memberColors[i % memberColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600, color: 'white', margin: '0 auto 12px' }}>{m.initials}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '3px' }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: '#9e9a93', textTransform: 'capitalize' }}>{m.role}</div>
                  <div style={{ fontSize: '10px', color: '#d1cec9', marginTop: '4px' }}>{m.email}</div>
                  {user.role === 'owner' && (m.hourly_rate || m.weekly_hours || m.pay_schedule) && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f5f4f2', fontSize: '11px', color: '#6b6560' }}>
                      {m.hourly_rate != null && <div>${m.hourly_rate}/hr</div>}
                      {m.weekly_hours != null && <div>{m.weekly_hours} hrs/wk</div>}
                      {m.pay_schedule && <div style={{ color: '#9e9a93', marginTop: '2px' }}>{m.pay_schedule}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Team Member Modal */}
          {showTeamModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,31,51,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) { setShowTeamModal(false); setEditingMember(null) } }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,.2)' }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1C3557', marginBottom: '24px' }}>{editingMember ? `Edit ${editingMember.name}` : 'Add Team Member'}</h2>

                {teamMsg?.type === 'error' && (
                  <div style={{ padding: '8px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', background: 'rgba(220,38,38,.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,.2)' }}>{teamMsg.text}</div>
                )}

                {!editingMember && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Full Name</label>
                      <input value={teamForm.name} onChange={e => setTeamForm(f => ({...f, name: e.target.value}))} placeholder="Jane Smith" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Email</label>
                      <input type="email" value={teamForm.email} onChange={e => setTeamForm(f => ({...f, email: e.target.value}))} placeholder="jane@dakjencreative.com" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Password</label>
                        <input type="password" value={teamForm.password} onChange={e => setTeamForm(f => ({...f, password: e.target.value}))} placeholder="Temporary password" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Role</label>
                        <select value={teamForm.role} onChange={e => setTeamForm(f => ({...f, role: e.target.value}))} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                          <option value="team">Team</option>
                          <option value="owner">Owner</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Hourly Rate ($)</label>
                    <input type="number" value={teamForm.hourly_rate} onChange={e => setTeamForm(f => ({...f, hourly_rate: e.target.value}))} placeholder="e.g. 62" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Weekly Hours</label>
                    <input type="number" value={teamForm.weekly_hours} onChange={e => setTeamForm(f => ({...f, weekly_hours: e.target.value}))} placeholder="30" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }}>Pay Schedule</label>
                  <select value={teamForm.pay_schedule} onChange={e => setTeamForm(f => ({...f, pay_schedule: e.target.value}))} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">None</option>
                    <option value="1st & 15th">1st & 15th</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>

                {!editingMember && (
                  <div style={{ fontSize: '11px', color: '#9e9a93', marginBottom: '20px' }}>
                    Initials will be auto-generated from the name.
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowTeamModal(false); setEditingMember(null) }} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
                  <button onClick={editingMember ? updateTeamMember : addTeamMember} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#b07a8a', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>{editingMember ? 'Save Changes' : 'Add Member'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      default:
        const meta = BIZ_LINES_META[page as keyof typeof BIZ_LINES_META]
        if (!meta) return <div style={{ color: '#9e9a93', padding: '40px' }}>Page not found.</div>
        return (
          <div className="animate-fadeUp" style={card}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#1C3557', marginBottom: '8px' }}>{meta.label}</div>
            <div style={{ fontSize: '13px', color: '#9e9a93' }}>{meta.desc}</div>
          </div>
        )
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {sidebar}
      <div style={{ marginLeft: '240px', flex: 1 }}>
        {/* Topbar */}
        <div style={{ height: '64px', background: '#faf8f5', borderBottom: '1px solid #e8e6e1', display: 'flex', alignItems: 'center', padding: '0 32px', gap: '16px', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 300, color: '#1C3557', flex: 1 }}>
            {page === 'overview' ? `${greeting}, ${user.name?.split(' ')[0]}` : PAGE_TITLES[page]}
          </div>
          <div style={{ fontSize: '12px', color: '#9e9a93' }}>{dateStr}</div>
        </div>
        {/* Content */}
        <div style={{ padding: '32px' }}>
          {renderPage()}
        </div>
      </div>
    </div>
  )
}
