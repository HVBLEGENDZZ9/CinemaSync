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

  // Derive displayed seek value: use local value while dragging, otherwise currentTime
  const seekValue = isSeeking ? localSeekValue : (currentTime || 0)

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true)
  }, [])

  const handleSeekChange = useCallback((e) => {
    setLocalSeekValue(parseFloat(e.target.value))
  }, [])

  const handleSeekEnd = useCallback(
    (e) => {
      const time = parseFloat(e.target.value)
      setIsSeeking(false)
      onSeek(time)
    },
    [onSeek]
  )

  // Compute fill percentage for the seek bar background
  const fillPercent =
    duration > 0 ? (seekValue / duration) * 100 : 0

  return (
    <div
      className="flex items-center gap-4 px-5 shrink-0"
      style={{
        height: '48px',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        className="shrink-0 flex items-center justify-center"
        style={{
          color: 'var(--text-primary)',
          transition: 'color 150ms ease-out',
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>

      {/* Timestamp */}
      <span
        className="shrink-0 text-[12px] leading-[1.2] tabular-nums"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: 'var(--text-secondary)',
          minWidth: '90px',
        }}
      >
        {formatTime(seekValue)} / {formatTime(duration)}
      </span>

      {/* Seek bar */}
      <div className="flex-1 flex items-center">
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
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${fillPercent}%, var(--border) ${fillPercent}%, var(--border) 100%)`,
          }}
        />
      </div>

      {/* Volume */}
      <button
        onClick={onToggleMute}
        className="shrink-0 flex items-center justify-center"
        style={{
          color: 'var(--text-secondary)',
          transition: 'color 150ms ease-out',
        }}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Fullscreen */}
      <button
        onClick={onToggleFullscreen}
        className="shrink-0 flex items-center justify-center ml-2"
        style={{
          color: 'var(--text-secondary)',
          transition: 'color 150ms ease-out',
        }}
        aria-label="Full Screen"
      >
        <Maximize size={18} />
      </button>
    </div>
  )
}
