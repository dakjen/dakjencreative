# DakJen Creative — Dashboard

Full-stack Next.js business dashboard with Neon Postgres, NextAuth, and Vercel deployment.

---

## ⚡ Setup Guide (do this once)

### Step 1 — Get the code onto your computer
You'll need Node.js installed (https://nodejs.org — download the LTS version).

Then open Terminal (Mac) or Command Prompt (Windows) and run:
```
cd ~/Desktop
```
Place this project folder on your Desktop, then:
```
cd dakjen-dashboard
npm install
```

---

### Step 2 — Create your .env.local file
In the project folder, create a file called `.env.local` (copy from `.env.example`).

Fill in two values:

**DATABASE_URL** — go to your Neon dashboard (console.neon.tech):
1. Open your project
2. Click "Connection Details"
3. Copy the connection string that starts with `postgresql://...`
4. Paste it as: `DATABASE_URL="postgresql://..."`

**NEXTAUTH_SECRET** — run this in Terminal to generate one:
```
openssl rand -base64 32
```
Paste the output as: `NEXTAUTH_SECRET="paste-output-here"`

**NEXTAUTH_URL** — for local dev:
```
NEXTAUTH_URL="http://localhost:3000"
```

---

### Step 3 — Set up your database
Run this once to create tables and seed your team accounts:
```
npm run db:push
```
You should see: ✅ Database ready!

---

### Step 4 — Run it locally (to test)
```
npm run dev
```
Open http://localhost:3000 in your browser.

**Login credentials:**
| Email | Password | Role |
|-------|----------|------|
| dakotah@dakjencreative.com | DJC2025! | Owner |
| olivia@dakjencreative.com | Team2025! | Team |
| jarea@dakjencreative.com | Team2025! | Team |
| brittni@dakjencreative.com | Team2025! | Team |

> ⚠️ Change passwords after first login by updating them in your Neon database console.

---

### Step 5 — Deploy to Vercel
1. Push this folder to a **private** GitHub repo
2. Go to vercel.com → "Add New Project" → import from GitHub
3. In Vercel project settings → "Environment Variables", add:
   - `DATABASE_URL` — your Neon connection string
   - `NEXTAUTH_SECRET` — same secret from Step 2
   - `NEXTAUTH_URL` — `https://dashboard.dakjencreative.com`
4. Click Deploy

---

### Step 6 — Connect your domain
In Vercel project → Settings → Domains:
- Add `dashboard.dakjencreative.com`
- Vercel will show you a DNS record to add
- Log into wherever your domain is managed (GoDaddy, Namecheap, etc.)
- Add the CNAME record Vercel gives you
- Wait 5–10 minutes → your dashboard is live!

---

## Revenue Tracker

The Revenue Tracker (sidebar → "Revenue Tracker") lets you:

- **Add contracts** — one-time value, monthly retainer, start/end dates
- **Pipeline stages** — Pipeline → Proposal → Negotiation → Active/Won → Complete
- **Probability weighting** — pipeline deals are weighted by close probability
- **12-month forecast chart** — confirmed (navy) vs. weighted pipeline (mauve)
- **Business line donut** — see which lines are driving pipeline
- **2-year target progress** — tracks toward $508K (2.5× 2025 baseline of $203K)

The stage dropdown in the pipeline table updates instantly — just click and change.

---

## Adding Team Members Later

As owner, you can add new team members via the API:
```
POST /api/users
{ "name": "New Person", "email": "new@dakjencreative.com", "password": "TempPass!", "role": "team", "initials": "NP" }
```
Or do it directly in your Neon database console.

---

## File Structure
```
dakjen-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   ← login/session
│   │   ├── tasks/route.ts                ← task CRUD
│   │   ├── tasks/[id]/route.ts
│   │   ├── contracts/route.ts            ← contract/revenue CRUD
│   │   ├── contracts/[id]/route.ts
│   │   └── users/route.ts                ← team management
│   ├── dashboard/
│   │   ├── page.tsx                      ← protected dashboard
│   │   └── DashboardClient.tsx           ← full UI
│   ├── login/page.tsx                    ← login screen
│   └── layout.tsx
├── components/
│   ├── RevenueTracker.tsx                ← revenue tracker + charts
│   └── Providers.tsx
├── lib/
│   ├── schema.ts                         ← Neon/Drizzle schema
│   └── db-push.js                        ← one-time DB setup
├── middleware.ts                          ← route protection
└── .env.example                          ← template for your env vars
```
