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

  const btnStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--ast-ivory)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color var(--dur-fast) ease, background var(--dur-fast) ease',
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '0 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {/* Seek bar */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '3px',
        background: 'rgba(255,255,255,0.12)',
        borderRadius: '99px',
        cursor: 'pointer',
      }}>
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
          className="ast-seek-input"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            zIndex: 2,
            minHeight: '28px',
            marginTop: '-12px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            height: '100%',
            background: 'var(--ast-gold)',
            borderRadius: '99px',
            width: `${fillPercent}%`,
            transition: isSeeking ? 'none' : 'width 100ms linear',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Controls row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(10, 10, 10, 0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        {/* Left controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={skipBack}
            style={btnStyle}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ast-gold)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ast-ivory)'}
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={onPlayPause}
            style={{ ...btnStyle, padding: '6px 8px' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ast-gold)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ast-ivory)'}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>

          <button
            onClick={skipForward}
            style={btnStyle}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ast-gold)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ast-ivory)'}
          >
            <SkipForward size={16} />
          </button>

          {/* Volume — desktop only */}
          <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
            <button
              onClick={onToggleMute}
              style={btnStyle}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ast-gold)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ast-ivory)'}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <div style={{
              width: '60px',
              height: '3px',
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '99px',
              position: 'relative',
            }}>
              <div style={{
                height: '100%',
                width: muted ? '0%' : '100%',
                background: 'var(--ast-ivory)',
                borderRadius: '99px',
                transition: 'width var(--dur-fast) ease',
              }} />
            </div>
          </div>

          {/* Time */}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--ast-silver)',
            marginLeft: '12px',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}>
            {formatTime(seekValue)}<span style={{ opacity: 0.4, margin: '0 4px' }}>/</span>{formatTime(duration)}
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Volume — mobile only */}
          <button
            onClick={onToggleMute}
            className="sm:hidden"
            style={{ ...btnStyle, display: 'flex' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ast-gold)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ast-ivory)'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            onClick={onToggleFullscreen}
            style={btnStyle}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ast-gold)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ast-ivory)'}
          >
            <Maximize size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
