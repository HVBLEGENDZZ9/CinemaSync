import { useEffect, useState } from 'react'

export default function PresenceIndicator({ partner }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slight delay for enter animation
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const isOnline = !!partner
  const username = partner?.username ?? 'partner'

  return (
    <div
      className="flex items-center gap-2"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease-out',
      }}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          backgroundColor: isOnline
            ? 'var(--success)'
            : 'var(--text-tertiary)',
          boxShadow: isOnline ? '0 0 6px var(--success)' : 'none',
          transition: 'background-color 150ms ease-out, box-shadow 150ms ease-out',
        }}
        aria-label={isOnline ? `${username} is online` : 'Partner offline'}
      />
      {isOnline && (
        <span
          className="text-[12px] leading-[1.2]"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: 'var(--text-secondary)',
          }}
        >
          {username}
        </span>
      )}
    </div>
  )
}
