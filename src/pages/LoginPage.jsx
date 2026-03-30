import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'

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
        /* subtle radial glow top-center */
        backgroundImage:
          'radial-gradient(ellipse 60% 34% at 50% 0%, rgba(232,149,122,0.07) 0%, transparent 70%)',
      }}
    >
      {/* Ambient orb */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,149,122,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />

      {/* Card */}
      <div
        className="anim-fade-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '340px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 28px 28px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--border-soft)',
        }}
      >
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {/* Film icon — SVG inline */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(232,149,122,0.2)',
              marginBottom: '16px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.5"/>
              <line x1="7" y1="2" x2="7" y2="22"/>
              <line x1="17" y1="2" x2="17" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <line x1="2" y1="7" x2="7" y2="7"/>
              <line x1="17" y1="7" x2="22" y2="7"/>
              <line x1="17" y1="17" x2="22" y2="17"/>
              <line x1="2" y1="17" x2="7" y2="17"/>
            </svg>
          </div>

          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
              marginBottom: '6px',
            }}
          >
            Cinema Sync
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              marginTop: '6px',
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: submitting || !username.trim() || !password.trim()
                ? 'var(--bg-elevated)'
                : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
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
            marginTop: '20px',
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
        padding: '11px 14px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${focused ? 'rgba(232,149,122,0.5)' : 'var(--border)'}`,
        background: focused ? 'rgba(232,149,122,0.04)' : 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 180ms, background 180ms',
        WebkitAppearance: 'none',
      }}
    />
  )
}
