import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Film, ArrowRight } from 'lucide-react'

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
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col items-center justify-between cinematic-glow overflow-hidden" style={{ minHeight: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Top Navigation Anchor */}
      <header className="w-full flex justify-center pt-12 md:pt-16 anim-fade-in relative z-10">
        <div className="flex items-center gap-3">
          <Film className="text-primary" size={28} strokeWidth={1.5} />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-on-surface">CinemaSync</h1>
        </div>
      </header>

      {/* Main Login Canvas */}
      <main className="w-full max-w-sm md:max-w-md px-6 flex flex-col items-center relative z-10">
        {/* The Glassmorphic Form Container */}
        <div className="glass-panel w-full p-8 md:p-10 rounded-xl border border-outline-variant/10 shadow-[0_40px_60px_rgba(0,0,0,0.5)]" style={{ outline: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="mb-8 md:mb-10">
            <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-on-surface mb-1.5">Welcome Back</h2>
            <p className="text-on-surface-variant font-label text-xs uppercase tracking-[0.15em] opacity-70">Private Session Access</p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Identity Input Group */}
            <div className="space-y-1.5">
              <label className="font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant ml-1" htmlFor="email">
                Identity
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-low border-none rounded-lg py-4 px-5 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-0 focus:bg-surface-container-highest transition-colors duration-300 font-body font-light"
                  id="email"
                  placeholder="Email Address"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
            {/* Access Key Input Group */}
            <div className="space-y-1.5">
              <label className="font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant ml-1" htmlFor="password">
                Access Key
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-low border-none rounded-lg py-4 px-5 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-0 focus:bg-surface-container-highest transition-colors duration-300 font-body font-light"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
            {/* Primary Action */}
            <div className="pt-2 md:pt-4">
              <button
                className="w-full bg-primary hover:bg-secondary text-on-primary font-headline font-bold py-4 rounded-lg shadow-[0_4px_20px_rgba(233,195,73,0.1)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={submitting || !username.trim() || !password.trim()}
              >
                {submitting ? 'Authenticating...' : 'Enter Room'}
                {!submitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />}
              </button>
            </div>
            {error && (
              <p className="mt-4 text-sm text-error text-center">{error}</p>
            )}
          </form>
          {/* Decorative corner element */}
          <div className="absolute -top-4 -right-4 w-12 h-12 border-t-2 border-r-2 border-primary/20 rounded-tr-xl hidden md:block"></div>
        </div>
        {/* Decorative Cinematic Scrim Element */}
        <div className="mt-10 md:mt-12 flex items-center gap-4 opacity-20">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-on-surface-variant"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant"></div>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-on-surface-variant"></div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full flex flex-col items-center pb-8 md:pb-12 px-6 relative z-10">
        <p className="font-body text-on-surface-variant/40 text-[12px] md:text-[13px] tracking-[0.05rem] italic text-center leading-relaxed max-w-[200px]">
          "The screening room is private. For two only."
        </p>
        {/* Subtle Ambient Indicator */}
        <div className="mt-6 flex gap-3 opacity-20">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary/30"></div>
        </div>
      </footer>

      {/* Background Cinematic Scrim/Grain Texture Simulation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDS_J5AB3lhnmbGq8xEwjDD1LP_ZaGt5nwM_jT860bQ0iotcqp37j_596LDX2zsWziccC16naKoOusdk90X__s5grPhIc799l1tWxjuGnEipSbghqjlGaxkKs-EIU9OwYgJ-KdnFYL5G-ibhR-LDG0T672rTh-Vtzn7-KXzOnXsfFtkwqzCYmqn0bzbwku2T5BzhZP4mgMiTlbvbadIQv9XJ0k-3XiV5MwtLyDyfKhStgZQw98hwlDU54kY4_3WP4ehMQUiDdpHZQ')" }}></div>
      {/* Background warm glow */}
      <div className="fixed -bottom-40 -left-40 w-96 h-96 bg-primary/[0.06] blur-[120px] rounded-full pointer-events-none z-0"></div>
      {/* Background Image Fragment */}
      <div className="fixed bottom-0 right-0 w-1/3 h-1/2 opacity-15 blur-3xl z-[0] pointer-events-none">
        <img alt="" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXmi_JtyGcfQbwWSwdaApDPUNFPJnWLn2bVS_50tNFgMKunUcQw_sHAgv7Z1S-9059Fx34x-AxkdeUwqyQNUkoSUEoMwbmRm2FzGqWraMPgwsrOKbs30J_-lW5K-3iN07gtYoszvaxSkunVvTGkJm82FKQLZDQsnSOgNOOH7-u3yWiez2lVi11ivUyDfRYJmfx1uTRRfYOGPL6XqSebUHJV74ZGRyhPOHEdeJqC8Ko7dWNSpp9NWYsfGhIctMwnHBvnCcsCIMUNw" />
      </div>
    </div>
  )
}
