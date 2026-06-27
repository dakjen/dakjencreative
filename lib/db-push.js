// Run once: node lib/db-push.js
// Creates all tables — no seed data

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

  console.log('Tables created.')
  console.log('\n✅ Database ready! You can now run: npm run dev')
}

main()
  .then(() => addContractsTable())
  .then(() => addUserRateColumns())
  .then(() => addWebsitesTable())
  .then(() => addToolsTable())
  .then(() => addQuickLinksTable())
  .then(() => addVaultTable())
  .then(() => cleanSeedData())
  .then(() => addBusinessLinesColumn())
  .catch(console.error)

async function addBusinessLinesColumn() {
  const sql = neon(process.env.DATABASE_URL)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS business_lines TEXT NOT NULL DEFAULT 'all'`
  console.log('✓ business_lines column ready')
}

async function cleanSeedData() {
  const sql = neon(process.env.DATABASE_URL)
  const result = await sql`DELETE FROM tasks WHERE created_by IS NULL`
  console.log('✓ removed seeded tasks (created_by IS NULL)')
}

async function addUserRateColumns() {
  const sql = neon(process.env.DATABASE_URL)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2)`
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
}

async function addToolsTable() {
  const sql = neon(process.env.DATABASE_URL)
  await sql`
    CREATE TABLE IF NOT EXISTS tools (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      icon VARCHAR(10) NOT NULL DEFAULT '🛠️',
      category VARCHAR(20) NOT NULL DEFAULT 'tool',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  console.log('✓ tools table ready')
}

async function addQuickLinksTable() {
  const sql = neon(process.env.DATABASE_URL)
  await sql`
    CREATE TABLE IF NOT EXISTS quick_links (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon VARCHAR(10) NOT NULL DEFAULT '🔗',
      category VARCHAR(20) NOT NULL DEFAULT 'app',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE quick_links ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'app'`
  console.log('✓ quick_links table ready')
}

async function addVaultTable() {
  const sql = neon(process.env.DATABASE_URL)
  await sql`
    CREATE TABLE IF NOT EXISTS vault (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      username TEXT,
      password_enc TEXT NOT NULL,
      url TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  console.log('✓ vault table ready')
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
}
