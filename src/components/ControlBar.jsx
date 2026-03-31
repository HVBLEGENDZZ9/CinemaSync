import { useCallback, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, SkipBack } from 'lucide-react'
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
  const [hoverProgress, setHoverProgress] = useState(false)

  const seekValue = isSeeking ? localSeekValue : (currentTime || 0)
  const fillPercent = duration > 0 ? (seekValue / duration) * 100 : 0

  const handleSeekStart = useCallback(() => setIsSeeking(true), [])
  const handleSeekChange = useCallback((e) => setLocalSeekValue(parseFloat(e.target.value)), [])
  const handleSeekEnd = useCallback((e) => {
    const time = parseFloat(e.target.value)
    setIsSeeking(false)
    onSeek(time)
  }, [onSeek])

  const skipForward = useCallback(() => {
    const newTime = Math.min((currentTime || 0) + 10, duration || 0)
    onSeek(newTime)
  }, [currentTime, duration, onSeek])

  const skipBack = useCallback(() => {
    const newTime = Math.max((currentTime || 0) - 10, 0)
    onSeek(newTime)
  }, [currentTime, onSeek])

  return (
    <div
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── YouTube-style Progress Bar ── */}
      <div
        style={{
          height: hoverProgress ? '6px' : '3px',
          display: 'flex',
          alignItems: 'flex-end',
          cursor: 'pointer',
          position: 'relative',
          borderRadius: '2px',
          transition: 'height 150ms ease',
          marginTop: '-1px',
        }}
        onMouseEnter={() => setHoverProgress(true)}
        onMouseLeave={() => setHoverProgress(false)}
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
            cursor: 'pointer',
          }}
          className="cs-seek-input"
        />
        {/* Track background */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '2px',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          {/* Fill */}
          <div style={{
            width: `${fillPercent}%`,
            height: '100%',
            background: 'var(--accent)',
            borderRadius: '2px',
            transition: isSeeking ? 'none' : 'width 100ms linear',
          }} />
        </div>
      </div>

      {/* ── Controls Row ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0 12px',
      }}>

        {/* Left: Play/Pause, Skip, Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CtrlBtn onClick={skipBack} aria-label="Back 10s" title="Back 10s">
            <SkipBack size={18} />
          </CtrlBtn>

          <CtrlBtn onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'} size="lg">
            {isPlaying
              ? <Pause size={22} fill="#fff" color="#fff" />
              : <Play size={22} fill="#fff" color="#fff" style={{ marginLeft: '2px' }} />
            }
          </CtrlBtn>

          <CtrlBtn onClick={skipForward} aria-label="Forward 10s" title="Forward 10s">
            <SkipForward size={18} />
          </CtrlBtn>

          <span style={{
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '0.3px',
            marginLeft: '8px',
            whiteSpace: 'nowrap',
          }}>
            {formatTime(seekValue)}
            <span style={{ opacity: 0.4, margin: '0 4px' }}>/</span>
            {formatTime(duration)}
          </span>
        </div>

        {/* Right: Mute & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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

function CtrlBtn({ children, size: btnSize, ...props }) {
  const [hovered, setHovered] = useState(false)
  const isLg = btnSize === 'lg'
  return (
    <button
      {...props}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: isLg ? '42px' : '36px',
        height: isLg ? '42px' : '36px',
        borderRadius: '50%',
        border: 'none',
        background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}
