import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { PlaySquare } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, error } = useAuth()

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (!username.trim() || !password.trim()) return
      setSubmitting(true)
      await login(username.trim(), password)
      setSubmitting(false)
    },
    [username, password, login]
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-void)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow - pink */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-15%',
          left: '30%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,45,120,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
          filter: 'blur(60px)',
        }}
      />
      {/* Ambient glow - blue */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(62,166,255,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
          filter: 'blur(60px)',
        }}
      />

      {/* Card */}
      <div
        className="anim-fade-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '360px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--border-soft)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--gradient-pink-blue)',
              marginBottom: '20px',
              boxShadow: '0 8px 24px var(--accent-glow)',
            }}
          >
            <PlaySquare size={26} color="#fff" fill="#fff" />
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              marginBottom: '6px',
            }}
          >
            Cinema<span style={{ color: 'var(--accent)' }}>Sync</span>
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              letterSpacing: '0.01em',
            }}
          >
            your private cinema.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <LoginInput
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoFocus
            id="cs-username"
          />
          <LoginInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            id="cs-password"
          />

          <button
            id="cs-submit"
            type="submit"
            disabled={submitting || !username.trim() || !password.trim()}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '13px',
              borderRadius: '20px',
              border: 'none',
              background: submitting || !username.trim() || !password.trim()
                ? 'var(--bg-elevated)'
                : 'var(--accent)',
              color: submitting || !username.trim() || !password.trim()
                ? 'var(--text-tertiary)'
                : '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: submitting || !username.trim() || !password.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 200ms var(--ease-out)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              letterSpacing: '0.01em',
              boxShadow: submitting || !username.trim() || !password.trim()
                ? 'none'
                : '0 4px 16px var(--accent-glow)',
            }}
          >
            {submitting
              ? <><span className="spinner" style={{ borderTopColor: '#fff' }} /> Signing in…</>
              : 'Enter the cinema'
            }
          </button>

          {error && (
            <p
              style={{
                marginTop: '4px',
                fontSize: '13px',
                color: 'var(--danger)',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
          )}
        </form>

        {/* Divider hint */}
        <p
          style={{
            marginTop: '24px',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        >
          invite-only · just the two of you
        </p>
      </div>
    </div>
  )
}

function LoginInput({ id, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      id={id}
      {...props}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: '12px',
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
        background: focused ? 'rgba(255,45,120,0.04)' : 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 180ms, background 180ms, box-shadow 180ms',
        WebkitAppearance: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(255,45,120,0.08)' : 'none',
      }}
    />
  )
}
