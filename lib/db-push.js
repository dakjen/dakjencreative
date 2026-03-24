// Run once: node lib/db-push.js
// This creates your tables and seeds the initial team accounts

require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')
const bcrypt = require('bcryptjs')

async function main() {
  const sql = neon(process.env.DATABASE_URL)

  console.log('Creating tables...')

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'team',
      initials VARCHAR(4) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      tag VARCHAR(20) NOT NULL DEFAULT 'djc',
      due TEXT,
      assignee TEXT,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  console.log('Tables created. Seeding users...')

  const ownerHash = await bcrypt.hash('DJC2025!', 12)
  const teamHash  = await bcrypt.hash('Team2025!', 12)

  const teamMembers = [
    { name: 'Dakotah Jennifer', email: 'dakotah@dakjencreative.com', password: ownerHash,  role: 'owner', initials: 'DJ' },
    { name: 'Olivia Blumenshine', email: 'olivia@dakjencreative.com', password: teamHash, role: 'team',  initials: 'OB' },
    { name: 'Jarea Fang',         email: 'jarea@dakjencreative.com',  password: teamHash, role: 'team',  initials: 'JF' },
    { name: 'Brittni Hardie',     email: 'brittni@dakjencreative.com',password: teamHash, role: 'team',  initials: 'BH' },
  ]

  for (const u of teamMembers) {
    await sql`
      INSERT INTO users (name, email, password, role, initials)
      VALUES (${u.name}, ${u.email}, ${u.password}, ${u.role}, ${u.initials})
      ON CONFLICT (email) DO NOTHING
    `
    console.log(`  ✓ ${u.name}`)
  }

  // Seed starter tasks (only if table is empty)
  const existingTasks = await sql`SELECT COUNT(*) as count FROM tasks`
  if (Number(existingTasks[0].count) === 0) {
    console.log('Seeding starter tasks...')
    const starterTasks = [
      { text: 'Draft LinkedIn post – 9410 Hough case study',      tag: 'djc',      due: '2026-03-22', assignee: 'Dakotah' },
      { text: 'Send Notable Amplify proposal to IBM contact',      tag: 'notable',  due: '2026-03-25', assignee: 'Dakotah' },
      { text: 'Review NREUV contract for renewal',                 tag: 'nreuv',    due: '2026-03-20', assignee: 'Dakotah' },
      { text: 'Follow up with UrbanCore Development',              tag: 'djc',      due: '2026-03-28', assignee: 'Olivia'  },
      { text: 'Update Elitewise Escapes itinerary template',       tag: 'elitewise',due: '2026-04-01', assignee: 'Jarea'   },
    ]

    for (const t of starterTasks) {
      await sql`
        INSERT INTO tasks (text, tag, due, assignee)
        VALUES (${t.text}, ${t.tag}, ${t.due}, ${t.assignee})
      `
    }
  } else {
    console.log('Tasks already exist, skipping seed.')
  }

  console.log('\n✅ Database ready! You can now run: npm run dev')
}

main().then(() => addContractsTable()).then(() => addUserRateColumns()).then(() => addWebsitesTable()).then(() => addQuickLinksTable()).catch(console.error)

async function addUserRateColumns() {
  const sql = neon(process.env.DATABASE_URL)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate INTEGER`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_hours INTEGER`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pay_schedule VARCHAR(30)`
  console.log('✓ user rate/hours columns ready')
}

async function addWebsitesTable() {
  const sql = neon(process.env.DATABASE_URL)

  await sql`
    CREATE TABLE IF NOT EXISTS websites (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      icon VARCHAR(10) NOT NULL DEFAULT '🌐',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  console.log('✓ websites table ready')

  // Seed default websites (only if table is empty)
  const existingWebsites = await sql`SELECT COUNT(*) as count FROM websites`
  if (Number(existingWebsites[0].count) === 0) {
    const seeds = [
      { icon: '🎨', name: 'DakJen Creative LLC',     url: 'https://dakjencreative.com',            desc: 'Main brand website' },
      { icon: '✍️', name: 'Notable / Go Be Notable', url: 'https://gobenotable.com',               desc: 'Brand presence platform' },
      { icon: '✈️', name: 'Elitewise Escapes',        url: 'https://elitewiseescapes.com',          desc: 'Luxury travel curation' },
      { icon: '🏢', name: 'DJC Marketing',            url: 'https://dakjencreative.com/marketing',  desc: 'Lease-up marketing' },
    ]

    for (const s of seeds) {
      await sql`
        INSERT INTO websites (icon, name, url, description)
        VALUES (${s.icon}, ${s.name}, ${s.url}, ${s.desc})
      `
    }
    console.log('✓ default websites seeded')
  } else {
    console.log('✓ websites already exist, skipping seed')
  }
}

async function addQuickLinksTable() {
  const sql = neon(process.env.DATABASE_URL)

  await sql`
    CREATE TABLE IF NOT EXISTS quick_links (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon VARCHAR(10) NOT NULL DEFAULT '🔗',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  console.log('✓ quick_links table ready')

  // Seed default quick links (only if table is empty)
  const existingQL = await sql`SELECT COUNT(*) as count FROM quick_links`
  if (Number(existingQL[0].count) === 0) {
    const seeds = [
      { icon: '📁', name: 'Google Drive', url: 'https://drive.google.com' },
      { icon: '📧', name: 'Gmail',        url: 'https://mail.google.com' },
      { icon: '💬', name: 'Slack',        url: 'https://slack.com' },
      { icon: '📦', name: 'Box',          url: 'https://box.com' },
      { icon: '💰', name: 'QuickBooks',   url: 'https://quickbooks.intuit.com' },
      { icon: '🎨', name: 'Canva',        url: 'https://canva.com' },
      { icon: '📋', name: 'Notion',       url: 'https://notion.so' },
      { icon: '🔗', name: 'LinkedIn',     url: 'https://linkedin.com' },
    ]

    for (const s of seeds) {
      await sql`
        INSERT INTO quick_links (icon, name, url)
        VALUES (${s.icon}, ${s.name}, ${s.url})
      `
    }
    console.log('✓ default quick links seeded')
  } else {
    console.log('✓ quick links already exist, skipping seed')
  }
}

async function addContractsTable() {
  const sql = neon(process.env.DATABASE_URL)

  await sql`
    CREATE TABLE IF NOT EXISTS contracts (
      id SERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      business_line VARCHAR(30) NOT NULL,
      stage VARCHAR(20) NOT NULL DEFAULT 'pipeline',
      probability INTEGER NOT NULL DEFAULT 50,
      contract_value INTEGER,
      monthly_retainer INTEGER,
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  console.log('✓ contracts table ready')

  // Seed sample contracts (only if table is empty)
  const existingContracts = await sql`SELECT COUNT(*) as count FROM contracts`
  if (Number(existingContracts[0].count) === 0) {
    const samples = [
      { client: 'NREUV Advisors', line: 'nreuv',      stage: 'active',    prob: 100, cv: null,    mr: 1087500, start: '2025-05-01', end: '2025-10-01' },
      { client: 'UrbanCore Development', line: 'djc',  stage: 'pipeline',  prob: 65,  cv: 8500000, mr: null,    start: '2026-04-01', end: null },
      { client: 'IBM Contact',           line: 'notable', stage: 'proposal', prob: 40, cv: 800000, mr: null,   start: '2026-05-01', end: null },
      { client: 'CDKM Consulting',       line: 'fractional', stage: 'negotiation', prob: 75, cv: null, mr: 350000, start: '2026-04-01', end: '2026-10-01' },
      { client: 'Bessemer Trust Referral', line: 'elitewise', stage: 'pipeline', prob: 30, cv: 500000, mr: null, start: null, end: null },
    ]

    for (const s of samples) {
      await sql`
        INSERT INTO contracts (client_name, business_line, stage, probability, contract_value, monthly_retainer, start_date, end_date)
        VALUES (${s.client}, ${s.line}, ${s.stage}, ${s.prob}, ${s.cv}, ${s.mr}, ${s.start}, ${s.end})
      `
    }
    console.log('✓ sample contracts seeded')
  } else {
    console.log('✓ contracts already exist, skipping seed')
  }
}

