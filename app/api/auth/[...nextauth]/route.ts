import NextAuth, { NextAuthOptions } from 'next-auth'
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
        token.role     = (user as any).role
        token.initials = (user as any).initials
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role     = token.role
        (session.user as any).initials = token.initials
        (session.user as any).id       = token.sub
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

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
