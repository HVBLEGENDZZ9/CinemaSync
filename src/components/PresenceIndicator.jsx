import { useEffect, useState } from 'react'

export default function PresenceIndicator({ partner }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const isOnline = !!partner

  if (!visible) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '99px',
        background: 'var(--ast-glass)',
        border: '1px solid var(--ast-border-subtle)',
        transition: 'opacity var(--dur-base) ease',
      }}
    >
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: isOnline ? 'var(--ast-gold)' : 'var(--ast-muted)',
          boxShadow: isOnline ? '0 0 8px var(--ast-gold-glow)' : 'none',
          transition: 'all var(--dur-base) ease',
        }}
      />
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: isOnline ? 'var(--ast-silver)' : 'var(--ast-muted)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-body)',
        }}
      >
        {isOnline ? partner.username : ''}
      </span>
    </div>
  )
}
