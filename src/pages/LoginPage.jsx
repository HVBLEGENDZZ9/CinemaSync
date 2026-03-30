import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { BackgroundPaths } from '@/components/ui/background-paths'

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
      // Navigation is handled by auth state change in App
    },
    [username, password, login]
  )

  return (
    <BackgroundPaths title="Cinema Sync">
      <div className="flex flex-col items-center page-enter" style={{ width: '280px' }}>
        {/* Brand mark */}
        <span
          className="text-[12px] leading-[1.2] mb-2"
          style={{
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.3em',
            color: 'var(--text-secondary)',
          }}
        >
          SYNC
        </span>

        {/* Tagline */}
        <span
          className="text-[13px] leading-[1.6] mb-10"
          style={{ color: 'var(--text-secondary)' }}
        >
          your private cinema.
        </span>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full backdrop-blur-md p-6 rounded-2xl bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 shadow-xl">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoFocus
            className="w-full rounded-[6px] px-3 py-2.5 text-[14px] leading-[1.2] outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              transition: 'border-color 150ms ease-out',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)'
            }}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-[6px] px-3 py-2.5 text-[14px] leading-[1.2] outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              transition: 'border-color 150ms ease-out',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)'
            }}
          />

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password.trim()}
            className="w-full rounded-[6px] py-2.5 text-[14px] leading-[1.2] flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--text-primary)',
              color: 'var(--bg-base)',
              fontWeight: 600,
              opacity:
                submitting || !username.trim() || !password.trim() ? 0.5 : 1,
              cursor:
                submitting || !username.trim() || !password.trim()
                  ? 'not-allowed'
                  : 'pointer',
              transition: 'all 150ms ease-out',
            }}
          >
            {submitting ? <span className="spinner" /> : 'Enter'}
          </button>

          {/* Error */}
          {error && (
            <p
              className="text-[13px] leading-[1.6] text-center mt-2"
              style={{ color: 'var(--danger)' }}
            >
              {error}
            </p>
          )}
        </form>
      </div>
    </BackgroundPaths>
  )
}
