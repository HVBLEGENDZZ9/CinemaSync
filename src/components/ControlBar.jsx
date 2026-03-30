import { useCallback, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'
import { formatTime } from '../lib/sync'

export default function ControlBar({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  muted,
  onToggleMute,
  onToggleFullscreen,
}) {
  const seekRef = useRef(null)
  const [isSeeking, setIsSeeking] = useState(false)
  const [localSeekValue, setLocalSeekValue] = useState(0)

  const seekValue = isSeeking ? localSeekValue : (currentTime || 0)
  const fillPercent = duration > 0 ? (seekValue / duration) * 100 : 0

  const handleSeekStart = useCallback(() => setIsSeeking(true), [])
  const handleSeekChange = useCallback((e) => setLocalSeekValue(parseFloat(e.target.value)), [])
  const handleSeekEnd = useCallback((e) => {
    const time = parseFloat(e.target.value)
    setIsSeeking(false)
    onSeek(time)
  }, [onSeek])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
        padding: '0 24px 20px',
      }}
    >
      {/* ── Seek Bar ── */}
      <div 
        style={{ 
          height: '24px', 
          display: 'flex', 
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <input
          ref={seekRef}
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={seekValue}
          onMouseDown={handleSeekStart}
          onTouchStart={handleSeekStart}
          onChange={handleSeekChange}
          onMouseUp={handleSeekEnd}
          onTouchEnd={handleSeekEnd}
          aria-label="Seek"
          style={{
            width: '100%',
            height: '100%',
            appearance: 'none',
            background: 'transparent',
            outline: 'none',
            zIndex: 2,
            position: 'absolute',
            inset: 0,
            cursor: 'pointer'
          }}
          className="cs-seek-input"
        />
        {/* Custom Track */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden', pointerEvents: 'none' }}>
           <div style={{ width: `${fillPercent}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px', transition: isSeeking ? 'none' : 'width 100ms linear' }} />
        </div>
        {/* Custom Thumb (handled via CSS class cs-seek-input in index.css for exact positioning) */}
      </div>

      {/* ── Controls Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        
        {/* Left: Play/Pause & Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <CtrlBtn onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'} primary>
            {isPlaying ? <Pause size={22} fill="#0d0f14" color="#0d0f14" /> : <Play size={22} fill="#0d0f14" color="#0d0f14" style={{ marginLeft: '4px' }} />}
          </CtrlBtn>

          <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.5px' }}>
            {formatTime(seekValue)} <span style={{ opacity: 0.5, margin: '0 4px' }}>/</span> {formatTime(duration)}
          </span>
        </div>

        {/* Right: Mute & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CtrlBtn onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </CtrlBtn>
          <CtrlBtn onClick={onToggleFullscreen} aria-label="Full Screen">
            <Maximize size={18} />
          </CtrlBtn>
        </div>

      </div>
    </div>
  )
}

function CtrlBtn({ children, primary, ...props }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      {...props}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: primary ? '48px' : '40px',
        height: primary ? '48px' : '40px',
        borderRadius: '50%',
        border: 'none',
        background: primary 
          ? hovered ? '#fff' : 'var(--text-primary)'
          : hovered ? 'rgba(255,255,255,0.15)' : 'transparent',
        color: primary ? '#000' : '#fff',
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hovered && primary ? 'scale(1.05)' : 'scale(1)',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}
