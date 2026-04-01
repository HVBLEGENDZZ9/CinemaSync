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
    <div className="flex items-center gap-3 bg-surface-container/50 px-4 py-2 rounded-full border border-outline-variant/10 transition-opacity duration-300">
      <div 
        className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(233,195,73,0.5)] ${isOnline ? 'bg-primary' : 'bg-on-surface-variant/40'}`} 
      />
      <span className="font-label text-[10px] md:text-xs uppercase tracking-[0.1rem] text-on-surface-variant whitespace-nowrap hidden md:inline">
        {isOnline ? `Online: ${partner.username}` : 'Partner Offline'}
      </span>
    </div>
  )
}
