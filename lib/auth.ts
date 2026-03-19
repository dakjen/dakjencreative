import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const sql = neon(process.env.DATABASE_URL!)
        const rows = await sql`
          SELECT id, name, email, password, role, initials
          FROM users WHERE email = ${credentials.email.toLowerCase()}
        `
        const user = rows[0]
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id:       String(user.id),
          name:     user.name,
          email:    user.email,
          role:     user.role,
          initials: user.initials,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role     = String((user as any).role ?? 'team')
        token.initials = String((user as any).initials ?? '')
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        const s = session.user as any
        const t = token as any
        s.role     = typeof t.role === 'string' ? t.role : 'team'
        s.initials = typeof t.initials === 'string' ? t.initials : ''
        s.id       = t.sub ?? ''
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
