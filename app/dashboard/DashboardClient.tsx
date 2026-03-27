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
interface WebsiteItem { id: number; name: string; url: string; description: string | null; icon: string; business_line: string | null; created_at: string }
interface Contract { id: number; client_name: string; business_line: string; stage: string; probability: number; contract_value: number | null; monthly_retainer: number | null; start_date: string | null; end_date: string | null; notes: string | null }
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
  interface TeamMember { id: number; name: string; email: string; role: string; initials: string; hourly_rate: number | null; weekly_hours: number | null; pay_schedule: string | null; business_lines: string; created_at: string }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamLoaded, setTeamLoaded]   = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [teamForm, setTeamForm] = useState({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '', business_lines: 'all' })
  const [teamMsg, setTeamMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── WEBSITES STATE ──
  const [websites, setWebsites] = useState<WebsiteItem[]>([])
  const [websitesLoaded, setWebsitesLoaded] = useState(false)
  const [showWebsiteModal, setShowWebsiteModal] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState<WebsiteItem | null>(null)
  const [websiteForm, setWebsiteForm] = useState({ name: '', url: '', description: '', icon: '🌐', business_line: '' })

  // ── CONTRACTS STATE ──
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contractsLoaded, setContractsLoaded] = useState(false)

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

  // ── ONBOARDING STATE ──
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null)

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

  async function loadContracts() {
    if (contractsLoaded) return
    const res  = await fetch('/api/contracts')
    const data = await res.json()
    setContracts(Array.isArray(data) ? data : [])
    setContractsLoaded(true)
  }

  // Load quick links on mount (needed for overview page) + restore page data
  useEffect(() => {
    loadQuickLinks()
    loadTeam()
    loadTasks()
    loadContracts()
    loadWebsites()
    if (page === 'vault') loadVault()

    // Show onboarding for team members who haven't completed it
    if (!isOwner) {
      const key = `onboarded_${user.id}`
      if (!localStorage.getItem(key)) {
        setOnboardingStep(0)
      }
    }
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
      setTeamForm({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '', business_lines: 'all' })
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
      business_lines: teamForm.business_lines || 'all',
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
      setTeamForm({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '', business_lines: 'all' })
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
      business_lines: m.business_lines ?? 'all',
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
      setWebsiteForm({ name: '', url: '', description: '', icon: '🌐', business_line: '' })
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

  // Filter nav items by role and business line permissions
  const userLines: string[] = isOwner ? [] : (user.business_lines ?? 'all').split(',').map((s: string) => s.trim())
  const filteredNav = NAV.filter(n => {
    if (!isOwner && n.ownerOnly) return false
    if (!isOwner && n.section === 'lines') {
      if (userLines.includes('all')) return true
      return userLines.includes(n.id)
    }
    return true
  })

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
              <button onClick={() => { setEditingWebsite(null); setWebsiteForm({ name: '', url: '', description: '', icon: '🌐', business_line: '' }); setShowWebsiteModal(true) }}
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
                      <button onClick={() => { setEditingWebsite(s); setWebsiteForm({ name: s.name, url: s.url, description: s.description ?? '', icon: s.icon, business_line: s.business_line ?? '' }); setShowWebsiteModal(true) }}
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
              <button onClick={() => { setTeamMsg(null); setEditingMember(null); setTeamForm({ name: '', email: '', password: '', role: 'team', hourly_rate: '', weekly_hours: '', pay_schedule: '', business_lines: 'all' }); setShowTeamModal(true) }} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#b07a8a', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
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
                  {user.role === 'owner' && m.role !== 'owner' && (
                    <div style={{ marginTop: '8px', fontSize: '10px', color: '#9e9a93', textAlign: 'center' }}>
                      {m.business_lines === 'all' ? 'All lines' : (m.business_lines || 'No access').replace(/,/g, ' · ')}
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

      default: {
        const meta = BIZ_LINES_META[page as keyof typeof BIZ_LINES_META]
        if (!meta) return <div style={{ color: '#9e9a93', padding: '40px' }}>Page not found.</div>

        const lineContracts = contracts.filter(c => c.business_line === page)
        const lineTasks     = tasks.filter(t => t.tag === page)
        const lineLinks     = websites.filter(w => w.business_line === page)

        const activeMRR     = lineContracts.filter(c => c.stage === 'active').reduce((s, c) => s + (c.monthly_retainer ?? 0) / 100, 0)
        const activeValue   = lineContracts.filter(c => c.stage === 'active').reduce((s, c) => s + (c.contract_value ?? 0) / 100, 0)
        const weightedPipe  = lineContracts.filter(c => c.stage !== 'active').reduce((s, c) => s + ((c.contract_value ?? 0) / 100) * (c.probability / 100), 0)
        const openTasks     = lineTasks.filter(t => !t.done).length

        const stageColors: Record<string, string> = { active: '#16a34a', proposal: '#b07a8a', pipeline: '#6366f1', negotiation: '#d97706', closed: '#9e9a93' }

        return (
          <div className="animate-fadeUp" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div style={{ ...card }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#1C3557', marginBottom: '4px' }}>{meta.label}</div>
              <div style={{ fontSize: '13px', color: '#9e9a93' }}>{meta.desc}</div>
            </div>

            {/* Revenue Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
              {[
                { label: 'Active MRR',        value: activeMRR   > 0 ? `$${activeMRR.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—' },
                { label: 'Active Value',       value: activeValue > 0 ? `$${activeValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—' },
                { label: 'Weighted Pipeline',  value: weightedPipe > 0 ? `$${weightedPipe.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—' },
                { label: 'Open Tasks',         value: openTasks.toString() },
              ].map(m => (
                <div key={m.label} style={{ ...card, textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 600, color: '#1C3557', fontFamily: 'Cormorant Garamond, serif' }}>{m.value}</div>
                  <div style={{ fontSize: '11px', color: '#9e9a93', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Contracts / Pipeline */}
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px' }}>Pipeline & Contracts</div>
              {lineContracts.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#9e9a93' }}>No contracts yet for this line.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lineContracts.map(c => (
                    <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 120px', gap: '12px', alignItems: 'center', padding: '12px 16px', background: '#f9f8f6', borderRadius: '8px', fontSize: '13px' }}>
                      <div style={{ fontWeight: 500, color: '#1a1714' }}>{c.client_name}</div>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: `${stageColors[c.stage] ?? '#9e9a93'}18`, color: stageColors[c.stage] ?? '#9e9a93', textTransform: 'capitalize' }}>{c.stage}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b6560' }}>{c.probability}%</div>
                      <div style={{ fontSize: '12px', color: '#1C3557', textAlign: 'right' }}>
                        {c.monthly_retainer ? `$${(c.monthly_retainer / 100).toLocaleString()}/mo` : c.contract_value ? `$${(c.contract_value / 100).toLocaleString()}` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks */}
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px' }}>Tasks</div>
              {lineTasks.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#9e9a93' }}>No tasks for this line.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {lineTasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f9f8f6', borderRadius: '8px' }}>
                      <div onClick={() => toggleTask(t.id, t.done)} style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${t.done ? '#b07a8a' : '#e8e6e1'}`, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.done ? '#b07a8a' : 'transparent', color: 'white', fontSize: '9px' }}>{t.done && '✓'}</div>
                      <div style={{ flex: 1, fontSize: '13px', color: t.done ? '#9e9a93' : '#1a1714', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
                      {t.due && <div style={{ fontSize: '11px', color: '#9e9a93' }}>{new Date(t.due + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                      {t.assignee && <div style={{ fontSize: '11px', background: '#f0ece8', padding: '2px 8px', borderRadius: '4px', color: '#6b6560' }}>{t.assignee}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Key Links */}
            <div style={card}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1C3557', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Key Links
                {isOwner && <button onClick={() => { setEditingWebsite(null); setWebsiteForm({ name: '', url: '', description: '', icon: '🌐', business_line: page }); setShowWebsiteModal(true) }} style={{ background: 'none', border: 'none', color: '#b07a8a', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>+ Add</button>}
              </div>
              {lineLinks.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#9e9a93' }}>No links yet. {isOwner ? 'Add one above.' : ''}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                  {lineLinks.map(w => (
                    <div key={w.id} style={{ position: 'relative' }}>
                      <a href={w.url} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', background: '#f5f4f2', borderRadius: '8px', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1C3557')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#f5f4f2')}>
                        <span style={{ fontSize: '18px' }}>{w.icon}</span>
                        <span style={{ fontSize: '10px', color: '#6b6560', textAlign: 'center' }}>{w.name}</span>
                      </a>
                      {isOwner && (
                        <div style={{ position: 'absolute', top: '2px', right: '2px', display: 'flex', gap: '2px' }}>
                          <button onClick={() => { setEditingWebsite(w); setWebsiteForm({ name: w.name, url: w.url, description: w.description ?? '', icon: w.icon, business_line: w.business_line ?? '' }); setShowWebsiteModal(true) }} style={{ background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', padding: '2px 4px', color: '#9e9a93' }}>Edit</button>
                          <button onClick={() => deleteWebsite(w.id)} style={{ background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', padding: '2px 4px', color: '#dc2626' }}>×</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      }
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
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Description</label>
              <input value={websiteForm.description} onChange={e => setWebsiteForm(f => ({...f, description: e.target.value}))} placeholder="Short description" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Business Line (optional)</label>
              <select value={websiteForm.business_line} onChange={e => setWebsiteForm(f => ({...f, business_line: e.target.value}))} style={inputStyle}>
                <option value="">None (show on Websites tab only)</option>
                <option value="djc">DJC Marketing</option>
                <option value="notable">Notable</option>
                <option value="elitewise">Elitewise Escapes</option>
                <option value="fractional">Fractional Services</option>
                <option value="community">Business Community</option>
              </select>
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
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Business Line Access</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f9f8f6', borderRadius: '8px', border: '1px solid #e8e6e1' }}>
                {/* All-access toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#1a1714' }}>
                  <input type="checkbox" checked={teamForm.business_lines === 'all'} onChange={e => setTeamForm(f => ({ ...f, business_lines: e.target.checked ? 'all' : '' }))} />
                  All Lines (full access)
                </label>
                {teamForm.business_lines !== 'all' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px', borderTop: '1px solid #e8e6e1', marginTop: '4px' }}>
                    {(['djc','notable','elitewise','fractional','community'] as const).map(line => {
                      const selected = teamForm.business_lines.split(',').map(s => s.trim()).filter(Boolean)
                      const checked = selected.includes(line)
                      const labels: Record<string, string> = { djc: 'DJC Marketing', notable: 'Notable', elitewise: 'Elitewise Escapes', fractional: 'Fractional Services', community: 'Business Community' }
                      return (
                        <label key={line} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#6b6560' }}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const cur = teamForm.business_lines.split(',').map(s => s.trim()).filter(Boolean)
                            const next = e.target.checked ? [...cur, line] : cur.filter(x => x !== line)
                            setTeamForm(f => ({ ...f, business_lines: next.join(',') || '' }))
                          }} />
                          {labels[line]}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
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

      {/* Onboarding Modal */}
      {onboardingStep !== null && (() => {
        const steps = [
          {
            icon: '✦',
            title: `Welcome, ${user.name?.split(' ')[0]}.`,
            body: `You're now part of the DakJen Creative Command Center — our internal hub for staying aligned, organized, and moving fast. This quick tour will walk you through everything you need to know.`,
            bullets: null,
          },
          {
            icon: '🏠',
            title: 'Your Dashboard',
            body: 'The Dashboard is your home base. It shows your quick-access apps and tools so you can get to work without hunting for links.',
            bullets: null,
          },
          {
            icon: '✓',
            title: 'Tasks',
            body: 'All active work lives on the Tasks page. Check it daily — tasks are tagged to business lines so nothing falls through the cracks.',
            bullets: ['Check your assigned tasks every morning', 'Mark tasks done as soon as you complete them', 'Add tasks as new work comes up — don\'t hold it in your head'],
          },
          {
            icon: '◈',
            title: 'Business Lines',
            body: 'Each business line has its own page with pipeline status, revenue metrics, tasks, and key links. You\'ll only see the lines relevant to your role.',
            bullets: null,
          },
          {
            icon: '🔒',
            title: 'Password Vault',
            body: 'Shared credentials for team accounts are stored here securely. Click "View" to reveal a password when you need it.',
            bullets: ['Never share vault passwords over email or Slack', 'If you notice a credential is wrong, let Dakotah know', 'Don\'t screenshot or copy passwords to personal devices'],
          },
          {
            icon: '⭐',
            title: 'Best Practices',
            body: 'A few ground rules to keep the team running smoothly:',
            bullets: [
              'Keep tasks updated — stale tasks create confusion',
              'Use the correct business line tag on every task',
              'Go to the vault first before asking for a password',
              'If you need access to a page you can\'t see, ask Dakotah',
              'This portal is internal — don\'t share login info with clients',
            ],
          },
        ]

        const step = steps[onboardingStep]
        const isLast = onboardingStep === steps.length - 1

        function finishOnboarding() {
          localStorage.setItem(`onboarded_${user.id}`, '1')
          setOnboardingStep(null)
        }

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, background: 'rgba(15,31,51,.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 32px 80px rgba(0,0,0,.3)', overflow: 'hidden' }}>
              {/* Progress bar */}
              <div style={{ height: '3px', background: '#f0ede8' }}>
                <div style={{ height: '100%', background: '#b07a8a', width: `${((onboardingStep + 1) / steps.length) * 100}%`, transition: 'width .3s ease' }} />
              </div>

              <div style={{ padding: '40px 40px 32px' }}>
                {/* Icon */}
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(28,53,87,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', marginBottom: '24px' }}>
                  {step.icon}
                </div>

                {/* Step label */}
                <div style={{ fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: '#b07a8a', marginBottom: '8px', fontFamily: 'DM Sans, sans-serif' }}>
                  Step {onboardingStep + 1} of {steps.length}
                </div>

                {/* Title */}
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 600, color: '#1C3557', marginBottom: '14px', lineHeight: 1.2 }}>
                  {step.title}
                </h2>

                {/* Body */}
                <p style={{ fontSize: '14px', color: '#6b6560', lineHeight: 1.7, marginBottom: step.bullets ? '16px' : '0', fontFamily: 'DM Sans, sans-serif' }}>
                  {step.body}
                </p>

                {/* Bullets */}
                {step.bullets && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {step.bullets.map((b, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#4a4540', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                        <span style={{ color: '#b07a8a', flexShrink: 0, marginTop: '2px', fontWeight: 600 }}>–</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '0 40px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Dots */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {steps.map((_, i) => (
                    <div key={i} style={{ width: i === onboardingStep ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === onboardingStep ? '#1C3557' : '#e8e6e1', transition: 'all .2s' }} />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {onboardingStep > 0 && (
                    <button onClick={() => setOnboardingStep(s => (s ?? 1) - 1)} style={{ padding: '10px 20px', border: '1px solid #e8e6e1', borderRadius: '8px', background: 'none', color: '#6b6560', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
                      Back
                    </button>
                  )}
                  {!isLast && (
                    <button onClick={() => setOnboardingStep(s => (s ?? 0) + 1)} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#1C3557', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>
                      Next →
                    </button>
                  )}
                  {isLast && (
                    <button onClick={finishOnboarding} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#b07a8a', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>
                      Let's go ✓
                    </button>
                  )}
                </div>
              </div>

              {/* Skip */}
              <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
                <button onClick={finishOnboarding} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#c5c1bb', fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline' }}>
                  Skip tour
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
