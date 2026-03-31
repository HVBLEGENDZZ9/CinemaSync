import { useEffect, useState } from 'react'

export default function PresenceIndicator({ partner }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const isOnline = !!partner

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease-out',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: isOnline ? 'var(--success)' : 'var(--text-tertiary)',
          boxShadow: isOnline ? '0 0 8px var(--success)' : 'none',
          transition: 'background-color 150ms ease-out, box-shadow 150ms ease-out',
        }}
        aria-label={isOnline ? `${partner?.username} is online` : 'Partner offline'}
      />
    </div>
  )
}
