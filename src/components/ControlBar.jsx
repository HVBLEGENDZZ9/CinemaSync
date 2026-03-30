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
  const handleSeekEnd = useCallback(
    (e) => {
      const time = parseFloat(e.target.value)
      setIsSeeking(false)
      onSeek(time)
    },
    [onSeek]
  )

  return (
    <div
      id="cs-controlbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '8px 16px 12px',
      }}
    >
      {/* Seek row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Time */}
        <span
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'rgba(240,236,230,0.7)',
            whiteSpace: 'nowrap',
            minWidth: '88px',
            letterSpacing: '0.03em',
          }}
        >
          {formatTime(seekValue)} / {formatTime(duration)}
        </span>

        {/* Seek bar */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            ref={seekRef}
            id="cs-seekbar"
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
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${fillPercent}%, rgba(255,255,255,0.15) ${fillPercent}%, rgba(255,255,255,0.15) 100%)`,
            }}
          />
        </div>
      </div>

      {/* Buttons row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {/* Play / Pause */}
        <CtrlBtn
          id="cs-playpause"
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          primary
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </CtrlBtn>

        <div style={{ flex: 1 }} />

        {/* Mute */}
        <CtrlBtn
          id="cs-mute"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </CtrlBtn>

        {/* Fullscreen */}
        <CtrlBtn
          id="cs-fullscreen"
          onClick={onToggleFullscreen}
          aria-label="Full Screen"
        >
          <Maximize size={17} />
        </CtrlBtn>
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
        width: primary ? '40px' : '36px',
        height: primary ? '40px' : '36px',
        borderRadius: primary ? '50%' : '8px',
        border: 'none',
        background: primary
          ? hovered
            ? 'rgba(232,149,122,0.25)'
            : 'rgba(255,255,255,0.1)'
          : hovered
            ? 'rgba(255,255,255,0.1)'
            : 'transparent',
        color: primary
          ? hovered ? 'var(--accent)' : 'var(--text-primary)'
          : hovered ? 'var(--text-primary)' : 'rgba(240,236,230,0.6)',
        cursor: 'pointer',
        transition: 'all 150ms var(--ease-out)',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}
