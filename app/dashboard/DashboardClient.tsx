'use client'
import { useState, useEffect } from 'react'
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

const NAV = [
  { id: 'overview',      label: 'Dashboard',      section: 'overview',  ownerOnly: false },
  { id: 'revenue',       label: 'Revenue Tracker',section: 'overview',  ownerOnly: true  },
  { id: 'tasks',         label: 'Tasks',           section: 'overview',  ownerOnly: false },
  { id: 'djc',           label: 'DJC Marketing',      section: 'lines', ownerOnly: false },
  { id: 'notable',       label: 'Notable',            section: 'lines', ownerOnly: false },
  { id: 'elitewise',     label: 'Elitewise',          section: 'lines', ownerOnly: false },
  { id: 'fractional',    label: 'Fractional Services',section: 'lines', ownerOnly: false },
  { id: 'community',     label: 'Business Community', section: 'lines', ownerOnly: false },
  { id: 'websites',      label: 'Websites',        section: 'workspace', ownerOnly: false },
  { id: 'vault',         label: 'Password Vault',  section: 'workspace', ownerOnly: false },
  { id: 'integrations',  label: 'Integrations',    section: 'workspace', ownerOnly: true  },
  { id: 'financials',    label: 'Financials',      section: 'workspace', ownerOnly: true  },
  { id: 'team',          label: 'Team',            section: 'workspace', ownerOnly: true  },
]

const PAGE_TITLES: Record<string, string> = {
  overview: 'Dashboard', revenue: 'Revenue Tracker', tasks: 'Tasks',
  djc: 'DJC Marketing', notable: 'Notable', elitewise: 'Elitewise Escapes', fractional: 'Fractional Services', community: 'Business Community',
  websites: 'Websites', vault: 'Password Vault', integrations: 'Integrations',
  financials: 'Financials', team: 'Team',
}

// ── TASK TYPES ──
interface Task { id: number; text: string; tag: string; due: string | null; assignee: string | null; done: boolean }
interface WebsiteItem { id: number; name: string; url: string; description: string | null; icon: string; created_at: string }
interface QuickLinkItem { id: number; name: string; url: string; icon: string; category: string; created_at: string }
interface VaultEntry { id: number; label: string; username: string | null; password: string; url: string | null; notes: string | null }

// ── STYLES ──
const card: React.CSSProperties = { background: 'white', border: '1px solid #e8e6e1', borderRadius: '12px', padding: '24px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e8e6e1', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '6px' }

export default function DashboardClient({ session }: { session: Session }) {
  const [page, setPage]         = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.slice(1) || 'overview'
    }
    return 'overview'
  })
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

  // ── WEBSITES STATE ──
  const [websites, setWebsites] = useState<WebsiteItem[]>([])
  const [websitesLoaded, setWebsitesLoaded] = useState(false)
  const [showWebsiteModal, setShowWebsiteModal] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState<WebsiteItem | null>(null)
  const [websiteForm, setWebsiteForm] = useState({ name: '', url: '', description: '', icon: '🌐' })

  // ── QUICK LINKS STATE ──
  const [quickLinks, setQuickLinks] = useState<QuickLinkItem[]>([])
  const [quickLinksLoaded, setQuickLinksLoaded] = useState(false)
  const [showQLModal, setShowQLModal] = useState(false)
  const [editingQL, setEditingQL] = useState<QuickLinkItem | null>(null)
  const [qlForm, setQLForm] = useState({ name: '', url: '', icon: '🔗', category: 'app' })

  // ── VAULT STATE ──
  const [vault, setVault] = useState<VaultEntry[]>([])
  const [vaultLoaded, setVaultLoaded] = useState(false)
  const [showVaultModal, setShowVaultModal] = useState(false)
  const [editingVault, setEditingVault] = useState<VaultEntry | null>(null)
  const [vaultForm, setVaultForm] = useState({ label: '', username: '', password: '', url: '', notes: '' })
  const [vaultMsg, setVaultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set())

  const user     = session.user as any
  const isOwner  = user.role === 'owner'
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()
  const dateStr  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  // ── LOAD DATA ──
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

  async function loadWebsites() {
    if (websitesLoaded) return
    const res  = await fetch('/api/websites')
    const data = await res.json()
    setWebsites(Array.isArray(data) ? data : [])
    setWebsitesLoaded(true)
  }

  async function loadQuickLinks() {
    if (quickLinksLoaded) return
    const res  = await fetch('/api/quick-links')
    const data = await res.json()
    setQuickLinks(Array.isArray(data) ? data : [])
    setQuickLinksLoaded(true)
  }

  async function loadVault() {
    if (vaultLoaded) return
    const res  = await fetch('/api/vault')
    const data = await res.json()
    setVault(Array.isArray(data) ? data : [])
    setVaultLoaded(true)
  }

  // Load quick links on mount (needed for overview page) + restore page data
  useEffect(() => {
    loadQuickLinks()
    loadTeam() // needed for task assignee dropdown
    if (page === 'tasks') loadTasks()
    if (page === 'websites') loadWebsites()
    if (page === 'vault') loadVault()
  }, [])

  // ── TEAM CRUD ──
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
      name: teamForm.name.trim() || undefined,
      email: teamForm.email.trim() || undefined,
      role: teamForm.role || undefined,
      hourly_rate: teamForm.hourly_rate ? Number(teamForm.hourly_rate) : null,
      weekly_hours: teamForm.weekly_hours ? Number(teamForm.weekly_hours) : null,
      pay_schedule: teamForm.pay_schedule || null,
    }
    if (teamForm.password.trim()) body.password = teamForm.password.trim()
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

  async function deleteTeamMember(id: number) {
    await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setTeamMembers(ms => ms.filter(m => m.id !== id))
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

  // ── WEBSITE CRUD ──
  async function saveWebsite() {
    if (!websiteForm.name.trim() || !websiteForm.url.trim()) return
    const method = editingWebsite ? 'PATCH' : 'POST'
    const body: any = { ...websiteForm }
    if (editingWebsite) body.id = editingWebsite.id
    if (!body.description) body.description = null
    const res = await fetch('/api/websites', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const item = await res.json()
      if (editingWebsite) {
        setWebsites(ws => ws.map(w => w.id === item.id ? item : w))
      } else {
        setWebsites(ws => [...ws, item])
      }
      setShowWebsiteModal(false)
      setEditingWebsite(null)
      setWebsiteForm({ name: '', url: '', description: '', icon: '🌐' })
    }
  }

  async function deleteWebsite(id: number) {
    await fetch('/api/websites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setWebsites(ws => ws.filter(w => w.id !== id))
  }

  // ── QUICK LINK CRUD ──
  async function saveQuickLink() {
    if (!qlForm.name.trim() || !qlForm.url.trim()) return
    const method = editingQL ? 'PATCH' : 'POST'
    const body: any = { ...qlForm }
    if (editingQL) body.id = editingQL.id
    const res = await fetch('/api/quick-links', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const item = await res.json()
      if (editingQL) {
        setQuickLinks(qs => qs.map(q => q.id === item.id ? item : q))
      } else {
        setQuickLinks(qs => [...qs, item])
      }
      setShowQLModal(false)
      setEditingQL(null)
      setQLForm({ name: '', url: '', icon: '🔗', category: 'app' })
    }
  }

  async function deleteQuickLink(id: number) {
    await fetch('/api/quick-links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setQuickLinks(qs => qs.filter(q => q.id !== id))
  }

  // ── VAULT CRUD ──
  async function saveVaultEntry() {
    if (!vaultForm.label.trim() || !vaultForm.password.trim()) return
    setVaultMsg(null)
    const method = editingVault ? 'PATCH' : 'POST'
    const body: any = { ...vaultForm }
    if (editingVault) body.id = editingVault.id
    if (!body.username) body.username = null
    if (!body.url) body.url = null
    if (!body.notes) body.notes = null
    if (editingVault && !body.password) delete body.password
    const res = await fetch('/api/vault', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const item = await res.json()
      if (editingVault) {
        setVault(vs => vs.map(v => v.id === item.id ? item : v))
      } else {
        setVault(vs => [...vs, item])
      }
      setShowVaultModal(false)
      setEditingVault(null)
      setVaultForm({ label: '', username: '', password: '', url: '', notes: '' })
      setVaultMsg({ type: 'success', text: editingVault ? 'Entry updated.' : 'Entry saved.' })
    } else {
      const err = await res.json()
      setVaultMsg({ type: 'error', text: err.error ?? 'Something went wrong.' })
    }
  }

  async function deleteVaultEntry(id: number) {
    await fetch('/api/vault', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setVault(vs => vs.filter(v => v.id !== id))
    setRevealedIds(s => { const n = new Set(s); n.delete(id); return n })
  }

  function openEditVault(v: VaultEntry) {
    setEditingVault(v)
    setVaultForm({ label: v.label, username: v.username ?? '', password: v.password, url: v.url ?? '', notes: v.notes ?? '' })
    setVaultMsg(null)
    setShowVaultModal(true)
  }

  // ── NAVIGATION ──
  function goTo(id: string) {
    setPage(id)
    window.location.hash = id
    if (id === 'tasks') loadTasks()
    if (id === 'team') loadTeam()
    if (id === 'websites') loadWebsites()
    if (id === 'vault') loadVault()
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

  // Filter nav items by role
  const filteredNav = NAV.filter(n => isOwner || !n.ownerOnly)

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
        {(['overview','lines','workspace'] as const).map(section => {
          const sectionItems = filteredNav.filter(n => n.section === section)
          if (sectionItems.length === 0) return null
          return (
            <div key={section}>
              <div style={{ fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.2)', padding: '12px 20px 4px' }}>
                {section === 'overview' ? 'Overview' : section === 'lines' ? 'Business Lines' : 'Workspace'}
              </div>
              {sectionItems.map(n => (
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
          )
        })}
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

  // ── QUICK ACCESS PANEL (shared by overview) ──
  const renderQLGrid = (items: QuickLinkItem[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
      {items.map(ql => (
        <div key={ql.id} style={{ position: 'relative' }}>
          <a href={ql.url} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', background: '#f5f4f2', borderRadius: '8px', textDecoration: 'none', transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1C3557')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f5f4f2')}>
            <span style={{ fontSize: '18px' }}>{ql.icon}</span>
            <span style={{ fontSize: '10px', color: '#6b6560', textAlign: 'center' }}>{ql.name}</span>
          </a>
          {isOwner && (
            <div style={{ position: 'absolute', top: '2px', right: '2px', display: 'flex', gap: '2px' }}>
              <button onClick={() => { setEditingQL(ql); setQLForm({ name: ql.name, url: ql.url, icon: ql.icon, category: ql.category ?? 'app' }); setShowQLModal(true) }}
                style={{ background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', padding: '2px 4px', color: '#9e9a93' }}>
                Edit
              </button>
              <button onClick={() => deleteQuickLink(ql.id)}
                style={{ background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', padding: '2px 4px', color: '#dc2626' }}>
                ×
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const qlApps  = quickLinks.filter(ql => ql.category === 'app')
  const qlTools = quickLinks.filter(ql => ql.category === 'tool')

  const quickAccessPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Apps
          {isOwner && <button onClick={() => { setEditingQL(null); setQLForm({ name: '', url: '', icon: '🔗', category: 'app' }); setShowQLModal(true) }} style={{ background: 'none', border: 'none', color: '#b07a8a', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>+ Add</button>}
        </div>
        {qlApps.length > 0 ? renderQLGrid(qlApps) : <div style={{ fontSize: '12px', color: '#9e9a93' }}>No apps yet.</div>}
      </div>
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Custom Tools
          {isOwner && <button onClick={() => { setEditingQL(null); setQLForm({ name: '', url: '', icon: '🔗', category: 'tool' }); setShowQLModal(true) }} style={{ background: 'none', border: 'none', color: '#b07a8a', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>+ Add</button>}
        </div>
        {qlTools.length > 0 ? renderQLGrid(qlTools) : <div style={{ fontSize: '12px', color: '#9e9a93' }}>No custom tools yet.</div>}
      </div>
    </div>
  )

  // ── PAGE CONTENT ──
  const renderPage = () => {
    switch (page) {

      case 'overview': return (
        <div className="animate-fadeUp">
          {/* Revenue stat cards — owner only */}
          {isOwner && (
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
          )}

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

          {isOwner ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {quickAccessPanel}
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
          ) : (
            /* Employee view: just Quick Access full-width */
            quickAccessPanel
          )}
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
        <div className="animate-fadeUp">
          {isOwner && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={() => { setEditingWebsite(null); setWebsiteForm({ name: '', url: '', description: '', icon: '🌐' }); setShowWebsiteModal(true) }}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#b07a8a', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                + Add Website
              </button>
            </div>
          )}

          {!websitesLoaded ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>Loading websites...</div>
          ) : websites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>No websites yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {websites.map(s => (
                <div key={s.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px', transition: 'all .2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1C3557'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8e6e1'; (e.currentTarget as HTMLElement).style.transform = '' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#f5f4f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1C3557' }}>{s.name}</div>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#b07a8a', textDecoration: 'none' }}>{s.url.replace(/^https?:\/\//, '')}</a>
                    {s.description && <div style={{ fontSize: '11px', color: '#9e9a93', marginTop: '2px' }}>{s.description}</div>}
                  </div>
                  {isOwner ? (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => { setEditingWebsite(s); setWebsiteForm({ name: s.name, url: s.url, description: s.description ?? '', icon: s.icon }); setShowWebsiteModal(true) }}
                        style={{ background: 'none', border: 'none', color: '#9e9a93', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                      <button onClick={() => deleteWebsite(s.id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                  ) : (
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#e8e6e1', fontSize: '18px', textDecoration: 'none' }}>→</a>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )

      case 'team': {
        const memberColors = ['#1C3557','#b07a8a','#6366f1','#0e7490','#16a34a','#d97706']
        return (
        <div className="animate-fadeUp">
          {user.role === 'owner' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={() => { setTeamMsg(null); setEditingMember(null); setTeamForm({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '' }); setShowTeamModal(true) }} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#b07a8a', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                + Add Team Member
              </button>
            </div>
          )}

          {teamMsg && (
            <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: teamMsg.type === 'success' ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.08)', color: teamMsg.type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${teamMsg.type === 'success' ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}` }}>
              {teamMsg.text}
            </div>
          )}

          {!teamLoaded ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>Loading team...</div>
          ) : teamMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>No team members found.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '28px' }}>
              {teamMembers.map((m, i) => (
                <div key={m.id} style={{ ...card, textAlign: 'center', position: 'relative' }}>
                  {user.role === 'owner' && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                      <button onClick={() => openEditModal(m)} style={{ background: 'none', border: '1px solid #e8e6e1', borderRadius: '5px', cursor: 'pointer', color: '#6b6560', fontSize: '11px', padding: '2px 7px', fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
                      {m.role !== 'owner' && <button onClick={() => { if (confirm(`Remove ${m.name}?`)) deleteTeamMember(m.id) }} style={{ background: 'none', border: '1px solid rgba(220,38,38,.3)', borderRadius: '5px', cursor: 'pointer', color: '#dc2626', fontSize: '11px', padding: '2px 7px', fontFamily: 'DM Sans, sans-serif' }}>Remove</button>}
                    </div>
                  )}
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: memberColors[i % memberColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600, color: 'white', margin: '0 auto 12px' }}>{m.initials}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '3px' }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: '#9e9a93', textTransform: 'capitalize' }}>{m.role}</div>
                  <div style={{ fontSize: '10px', color: '#d1cec9', marginTop: '4px' }}>{m.email}</div>
                  {user.role === 'owner' && (m.hourly_rate || m.weekly_hours || m.pay_schedule) && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f5f4f2', fontSize: '11px', color: '#6b6560' }}>
                      {m.hourly_rate != null && <div>${Number(m.hourly_rate).toFixed(2)}/hr</div>}
                      {m.weekly_hours != null && <div>{m.weekly_hours} hrs/wk</div>}
                      {m.pay_schedule && <div style={{ color: '#9e9a93', marginTop: '2px' }}>{m.pay_schedule}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      case 'vault': return (
        <div className="animate-fadeUp">
          {isOwner && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={() => { setVaultMsg(null); setEditingVault(null); setVaultForm({ label: '', username: '', password: '', url: '', notes: '' }); setShowVaultModal(true) }} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#b07a8a', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                + Add Entry
              </button>
            </div>
          )}

          {vaultMsg && (
            <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: vaultMsg.type === 'success' ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.08)', color: vaultMsg.type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${vaultMsg.type === 'success' ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}` }}>
              {vaultMsg.text}
            </div>
          )}

          {!vaultLoaded ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>Loading vault...</div>
          ) : vault.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9e9a93', fontSize: '13px' }}>No entries yet. {isOwner ? 'Add your first login above.' : 'Ask an admin to add entries.'}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {vault.map(v => (
                <div key={v.id} style={{ ...card, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '2px' }}>{v.label}</div>
                      {v.url && <div style={{ fontSize: '11px', color: '#b07a8a' }}>{v.url}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '3px' }}>Username</div>
                      <div style={{ fontSize: '12px', color: '#3d3a36', fontFamily: 'monospace' }}>{v.username || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: '#9e9a93', marginBottom: '3px' }}>Password</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#3d3a36', fontFamily: 'monospace', letterSpacing: revealedIds.has(v.id) ? 'normal' : '2px' }}>
                          {revealedIds.has(v.id) ? v.password : '••••••••'}
                        </span>
                        <button onClick={() => setRevealedIds(s => { const n = new Set(s); revealedIds.has(v.id) ? n.delete(v.id) : n.add(v.id); return n })} style={{ background: 'none', border: '1px solid #e8e6e1', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                          {revealedIds.has(v.id) ? 'Hide' : 'View'}
                        </button>
                        {revealedIds.has(v.id) && (
                          <button onClick={() => { navigator.clipboard.writeText(v.password); setVaultMsg({ type: 'success', text: 'Copied!' }); setTimeout(() => setVaultMsg(null), 1500) }} style={{ background: 'none', border: '1px solid #e8e6e1', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOwner && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEditVault(v)} style={{ background: 'none', border: '1px solid #e8e6e1', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
                      <button onClick={() => { if (confirm(`Delete "${v.label}"?`)) deleteVaultEntry(v.id) }} style={{ background: 'none', border: '1px solid rgba(220,38,38,.3)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', color: '#dc2626', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )

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

      {/* Task Modal */}
      {showTaskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(15,31,51,.6)', backdropFilter: 'blur(4px)', overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) setShowTaskModal(false) }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: 'calc(100% - 40px)', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,.2)', margin: '20px auto' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1C3557', marginBottom: '24px' }}>Add Task</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Task</label>
              <input value={newTask.text} onChange={e => setNewTask(n => ({...n, text: e.target.value}))} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="e.g. Send proposal to UrbanCore" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Business Line</label>
                <select value={newTask.tag} onChange={e => setNewTask(n => ({...n, tag: e.target.value}))} style={inputStyle}>
                  <option value="djc">DJC Marketing</option>
                  <option value="notable">Notable</option>
                  <option value="elitewise">Elitewise</option>
                  <option value="fractional">Fractional</option>
                  <option value="community">Business Community</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={newTask.due} onChange={e => setNewTask(n => ({...n, due: e.target.value}))} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Assign To</label>
              <select value={newTask.assignee} onChange={e => setNewTask(n => ({...n, assignee: e.target.value}))} style={inputStyle}>
                {[...teamMembers.map(m => m.name.split(' ')[0]), 'Team'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTaskModal(false)} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
              <button onClick={addTask} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#b07a8a', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>Add Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Website Modal */}
      {showWebsiteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(15,31,51,.6)', backdropFilter: 'blur(4px)', overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) { setShowWebsiteModal(false); setEditingWebsite(null) } }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: 'calc(100% - 40px)', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,.2)', margin: '20px auto' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1C3557', marginBottom: '24px' }}>{editingWebsite ? 'Edit Website' : 'Add Website'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Icon</label>
                <input value={websiteForm.icon} onChange={e => setWebsiteForm(f => ({...f, icon: e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={websiteForm.name} onChange={e => setWebsiteForm(f => ({...f, name: e.target.value}))} placeholder="My Website" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>URL</label>
              <input value={websiteForm.url} onChange={e => setWebsiteForm(f => ({...f, url: e.target.value}))} placeholder="https://example.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Description</label>
              <input value={websiteForm.description} onChange={e => setWebsiteForm(f => ({...f, description: e.target.value}))} placeholder="Short description" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowWebsiteModal(false); setEditingWebsite(null) }} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveWebsite} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#b07a8a', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>{editingWebsite ? 'Save Changes' : 'Add Website'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(15,31,51,.6)', backdropFilter: 'blur(4px)', overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) { setShowTeamModal(false); setEditingMember(null) } }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: 'calc(100% - 40px)', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,.2)', margin: '20px auto' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1C3557', marginBottom: '24px' }}>{editingMember ? `Edit ${editingMember.name}` : 'Add Team Member'}</h2>
            {teamMsg?.type === 'error' && (
              <div style={{ padding: '8px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', background: 'rgba(220,38,38,.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,.2)' }}>{teamMsg.text}</div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Full Name</label>
              <input value={teamForm.name} onChange={e => setTeamForm(f => ({...f, name: e.target.value}))} placeholder="Jane Smith" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" autoComplete="off" value={teamForm.email} onChange={e => setTeamForm(f => ({...f, email: e.target.value}))} placeholder="jane@dakjencreative.com" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>{editingMember ? 'New Password' : 'Password'}</label>
                <input type="password" autoComplete="new-password" value={teamForm.password} onChange={e => setTeamForm(f => ({...f, password: e.target.value}))} placeholder={editingMember ? 'Leave blank to keep' : 'Temporary password'} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select value={teamForm.role} onChange={e => setTeamForm(f => ({...f, role: e.target.value}))} style={inputStyle}>
                  <option value="team">Team</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Hourly Rate ($)</label>
                <input type="number" step="0.01" value={teamForm.hourly_rate} onChange={e => setTeamForm(f => ({...f, hourly_rate: e.target.value}))} placeholder="e.g. 62" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Weekly Hours</label>
                <input type="number" value={teamForm.weekly_hours} onChange={e => setTeamForm(f => ({...f, weekly_hours: e.target.value}))} placeholder="30" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Pay Schedule</label>
              <select value={teamForm.pay_schedule} onChange={e => setTeamForm(f => ({...f, pay_schedule: e.target.value}))} style={inputStyle}>
                <option value="">None</option>
                <option value="15th & 30th">15th & 30th</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
            <div style={{ fontSize: '11px', color: '#9e9a93', marginBottom: '20px' }}>Initials will be auto-generated from the name.</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowTeamModal(false); setEditingMember(null) }} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
              <button onClick={editingMember ? updateTeamMember : addTeamMember} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#b07a8a', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>{editingMember ? 'Save Changes' : 'Add Member'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Vault Modal */}
      {showVaultModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(15,31,51,.6)', backdropFilter: 'blur(4px)', overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) { setShowVaultModal(false); setEditingVault(null) } }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: 'calc(100% - 40px)', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,.2)', margin: '20px auto' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1C3557', marginBottom: '24px' }}>{editingVault ? `Edit ${editingVault.label}` : 'Add Login'}</h2>
            {vaultMsg?.type === 'error' && (
              <div style={{ padding: '8px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', background: 'rgba(220,38,38,.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,.2)' }}>{vaultMsg.text}</div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Label</label>
              <input value={vaultForm.label} onChange={e => setVaultForm(f => ({...f, label: e.target.value}))} placeholder="e.g. Gmail – DJC Main" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Username / Email</label>
              <input value={vaultForm.username} onChange={e => setVaultForm(f => ({...f, username: e.target.value}))} placeholder="hello@dakjencreative.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{editingVault ? 'Password (leave blank to keep)' : 'Password'}</label>
              <input type="text" value={vaultForm.password} onChange={e => setVaultForm(f => ({...f, password: e.target.value}))} placeholder="Enter password" style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>URL (optional)</label>
              <input value={vaultForm.url} onChange={e => setVaultForm(f => ({...f, url: e.target.value}))} placeholder="https://mail.google.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea value={vaultForm.notes} onChange={e => setVaultForm(f => ({...f, notes: e.target.value}))} placeholder="Recovery email, 2FA info, etc." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowVaultModal(false); setEditingVault(null) }} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveVaultEntry} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#b07a8a', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>{editingVault ? 'Save Changes' : 'Save Login'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Link Modal (global since used from overview) */}
      {showQLModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(15,31,51,.6)', backdropFilter: 'blur(4px)', overflowY: 'auto' }} onClick={e => { if (e.target === e.currentTarget) { setShowQLModal(false); setEditingQL(null) } }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: 'calc(100% - 40px)', maxWidth: '420px', boxShadow: '0 24px 60px rgba(0,0,0,.2)', margin: '20px auto' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#1C3557', marginBottom: '24px' }}>
              {editingQL ? 'Edit Quick Link' : 'Add Quick Link'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Icon</label>
                <input value={qlForm.icon} onChange={e => setQLForm(f => ({...f, icon: e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={qlForm.name} onChange={e => setQLForm(f => ({...f, name: e.target.value}))} placeholder="Tool name" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>URL</label>
              <input value={qlForm.url} onChange={e => setQLForm(f => ({...f, url: e.target.value}))} placeholder="https://example.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Category</label>
              <select value={qlForm.category} onChange={e => setQLForm(f => ({...f, category: e.target.value}))} style={inputStyle}>
                <option value="app">Apps</option>
                <option value="tool">Custom Tools</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowQLModal(false); setEditingQL(null) }} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveQuickLink} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#b07a8a', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>
                {editingQL ? 'Save Changes' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
