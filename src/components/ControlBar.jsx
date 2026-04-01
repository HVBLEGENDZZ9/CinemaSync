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

  return (
    <div className="absolute bottom-3 md:bottom-6 left-3 md:left-6 right-3 md:right-6 flex flex-col gap-3 md:gap-4">
      {/* Seek Bar */}
      <div className="relative w-full h-1 bg-on-surface-variant/20 rounded-full cursor-pointer group/bar">
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
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ minHeight: '32px', marginTop: '-14px' }}
        />
        <div
          className="absolute h-full bg-primary rounded-full z-0 transition-all pointer-events-none"
          style={{ width: `${fillPercent}%`, transitionTimingFunction: 'linear', transitionDuration: isSeeking ? '0ms' : '100ms' }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-[0_0_15px_rgba(233,195,73,0.5)]"></div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 glass-blur bg-surface/40 rounded-xl border border-outline-variant/10">
        <div className="flex items-center gap-3 md:gap-5">
          <button onClick={skipBack} className="text-on-surface hover:text-primary transition-colors duration-300 focus:outline-none p-1">
            <SkipBack size={18} />
          </button>
          <button onClick={onPlayPause} className="text-on-surface hover:text-primary transition-colors duration-300 focus:outline-none p-1">
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
          <button onClick={skipForward} className="text-on-surface hover:text-primary transition-colors duration-300 focus:outline-none p-1">
            <SkipForward size={18} />
          </button>

          <div className="hidden sm:flex items-center gap-3 ml-2">
            <button onClick={onToggleMute} className="text-on-surface hover:text-primary transition-colors duration-300 focus:outline-none p-1">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="w-16 md:w-20 h-1 bg-on-surface-variant/20 rounded-full cursor-pointer relative group/vol">
              <div
                className="h-full bg-on-surface group-hover/vol:bg-primary transition-colors duration-300 rounded-full"
                style={{ width: muted ? '0%' : '100%' }}
              ></div>
            </div>
          </div>

          <span className="text-[10px] md:text-xs font-label text-on-surface-variant ml-1 md:ml-3 tracking-widest uppercase tabular-nums">
            {formatTime(seekValue)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <button onClick={onToggleMute} className="sm:hidden text-on-surface hover:text-primary transition-colors duration-300 focus:outline-none p-1">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button onClick={onToggleFullscreen} className="text-on-surface hover:text-primary transition-colors duration-300 focus:outline-none p-1">
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
