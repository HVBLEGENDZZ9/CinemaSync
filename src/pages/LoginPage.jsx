import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ArrowRight } from 'lucide-react'

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
      className="ast-noise"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ast-void)',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Background ambient glow */}
      <div style={{
        position: 'fixed',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,169,110,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-200px',
        right: '-100px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,169,110,0.025) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main content */}
      <main
        className="ast-fade-up"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Decorative star */}
        <div
          className="ast-fade-in"
          style={{
            width: '1px',
            height: '40px',
            background: 'linear-gradient(to bottom, transparent, var(--ast-gold-dark))',
            marginBottom: '32px',
          }}
        />

        {/* Branding */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 8vw, 44px)',
            fontWeight: 400,
            color: 'var(--ast-ivory)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          Room uru8
        </h1>

        {/* Gold separator line */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '12px',
        }}>
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, transparent, var(--ast-gold-dark))' }} />
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--ast-gold)', opacity: 0.6 }} />
          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to left, transparent, var(--ast-gold-dark))' }} />
        </div>

        <p
          className="ast-fade-in ast-delay-1"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'var(--ast-muted)',
            marginBottom: '48px',
          }}
        >
          Private Screening Room
        </p>

        {/* Form card */}
        <div
          className="ast-fade-up ast-delay-2"
          style={{
            width: '100%',
            padding: '36px 32px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(21, 21, 21, 0.6)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid var(--ast-border)',
            boxShadow: '0 40px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
          }}
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} onSubmit={handleSubmit}>
            {/* Identity field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                htmlFor="email"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--ast-silver)',
                  paddingLeft: '2px',
                }}
              >
                Identity
              </label>
              <input
                id="email"
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--ast-border)',
                  background: 'var(--ast-surface)',
                  color: 'var(--ast-ivory)',
                  fontSize: '16px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  outline: 'none',
                  transition: 'border-color var(--dur-base) ease, background var(--dur-base) ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--ast-border-gold)'
                  e.target.style.background = 'var(--ast-elevated)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--ast-border)'
                  e.target.style.background = 'var(--ast-surface)'
                }}
              />
            </div>

            {/* Password field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                htmlFor="password"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--ast-silver)',
                  paddingLeft: '2px',
                }}
              >
                Access Key
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--ast-border)',
                  background: 'var(--ast-surface)',
                  color: 'var(--ast-ivory)',
                  fontSize: '16px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  outline: 'none',
                  transition: 'border-color var(--dur-base) ease, background var(--dur-base) ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--ast-border-gold)'
                  e.target.style.background = 'var(--ast-elevated)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--ast-border)'
                  e.target.style.background = 'var(--ast-surface)'
                }}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || !username.trim() || !password.trim()}
              style={{
                width: '100%',
                padding: '16px',
                marginTop: '8px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--ast-gold)',
                color: 'var(--ast-on-gold)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '13px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all var(--dur-base) ease',
                boxShadow: '0 4px 24px rgba(201, 169, 110, 0.15)',
                opacity: (submitting || !username.trim() || !password.trim()) ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.currentTarget.style.background = 'var(--ast-gold-light)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(201, 169, 110, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--ast-gold)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(201, 169, 110, 0.15)'
              }}
            >
              {submitting ? 'Authenticating...' : 'Enter Session'}
              {!submitting && <ArrowRight size={16} strokeWidth={2} />}
            </button>

            {error && (
              <p style={{
                fontSize: '13px',
                color: 'var(--ast-crimson)',
                textAlign: 'center',
                fontWeight: 500,
              }}>
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Footer quote */}
        <p
          className="ast-fade-in ast-delay-4"
          style={{
            marginTop: '48px',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontStyle: 'italic',
            color: 'var(--ast-muted)',
            textAlign: 'center',
            lineHeight: 1.7,
            maxWidth: '260px',
            fontWeight: 400,
          }}
        >
          "The screening room is private.
          <br />
          For two, and two alone."
        </p>

        {/* Bottom decorative element */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: 0.3,
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--ast-gold)',
            animation: 'ast-glow-pulse 3s ease-in-out infinite',
          }} />
        </div>
      </main>
    </div>
  )
}
