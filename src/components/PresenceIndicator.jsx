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
    <div className="flex items-center gap-2 md:gap-3 bg-surface-container/50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-outline-variant/10 transition-opacity duration-300">
      <div
        className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary shadow-[0_0_8px_rgba(233,195,73,0.5)]' : 'bg-on-surface-variant/40'}`}
      />
      <span className="font-label text-[10px] md:text-xs uppercase tracking-[0.1rem] text-on-surface-variant whitespace-nowrap">
        {isOnline ? (
          <><span className="hidden md:inline">Online: {partner.username}</span><span className="md:hidden">{partner.username}</span></>
        ) : (
          <span className="hidden md:inline">Partner Offline</span>
        )}
      </span>
    </div>
  )
}
