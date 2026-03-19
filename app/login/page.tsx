'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setError('Incorrect email or password.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy-deep)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: '20px',
        padding: '52px 44px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontSize: '36px', color: 'white', lineHeight: 1 }}>D</span>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: '36px', color: 'var(--mauve)', lineHeight: 1 }}>J</span>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'white', letterSpacing: '.12em', textTransform: 'uppercase' }}>DakJen Creative</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,.4)', letterSpacing: '.05em' }}>Business Dashboard</div>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 300, color: 'white', marginBottom: '6px' }}>Welcome back.</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', marginBottom: '36px' }}>Sign in to access your workspace</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: '8px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@dakjencreative.com"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: '8px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none',
              }}
            />
          </div>

          {error && <p style={{ fontSize: '12px', color: '#f08080', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(176,122,138,.5)' : 'var(--mauve)',
              border: 'none', borderRadius: '8px',
              color: 'white', fontSize: '14px', fontWeight: 500,
              letterSpacing: '.05em', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
