import { useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { Plus } from 'lucide-react'

const VideoPlayer = forwardRef(function VideoPlayer(
  {
    url,
    isPlaying,
    onPlay,
    onPause,
    onTimeUpdate,
    onDuration,
    onBuffer,
    onBufferEnd,
    onReady,
    muted,
  },
  ref
) {
  const playerRef = useRef(null)
  const [isBuffering, setIsBuffering] = useState(false)

  // react-player v3: ref gives us the underlying HTMLMediaElement
  // Expose a stable API to parent via useImperativeHandle
  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      if (playerRef.current) {
        playerRef.current.currentTime = seconds
      }
    },
    getCurrentTime: () => {
      return playerRef.current?.currentTime ?? 0
    },
    getDuration: () => {
      return playerRef.current?.duration ?? 0
    },
  }))

  const handleBuffer = useCallback(() => {
    setIsBuffering(true)
    onBuffer?.()
  }, [onBuffer])

  const handleBufferEnd = useCallback(() => {
    setIsBuffering(false)
    onBufferEnd?.()
  }, [onBufferEnd])

  // react-player v3: onTimeUpdate fires native timeupdate events
  const handleTimeUpdate = useCallback(
    (e) => {
      const el = e.target
      if (el && onTimeUpdate) {
        onTimeUpdate({ playedSeconds: el.currentTime })
      }
    },
    [onTimeUpdate]
  )

  // react-player v3: onDurationChange fires when duration is available
  const handleDurationChange = useCallback(
    (e) => {
      const el = e.target
      if (el && onDuration && Number.isFinite(el.duration)) {
        onDuration(el.duration)
      }
    },
    [onDuration]
  )

  if (!url) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center gap-3"
        style={{
          aspectRatio: '16 / 9',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        <Plus
          size={32}
          strokeWidth={1}
          style={{ color: 'var(--text-tertiary)' }}
        />
        <span
          className="text-[13px] leading-[1.6]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Paste a URL or choose from library
        </span>
      </div>
    )
  }

  return (
    <div
      className="relative w-full"
      style={{
        aspectRatio: '16 / 9',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <ReactPlayer
        ref={playerRef}
        src={url}
        playing={isPlaying}
        muted={muted}
        controls={false}
        width="100%"
        height="100%"
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onWaiting={handleBuffer}
        onPlaying={handleBufferEnd}
        onReady={onReady}
        config={{
          youtube: {},
        }}
      />

      {/* Buffering indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-8 h-8 rounded-full"
            style={{
              border: '2px solid var(--accent-dim)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 600ms linear infinite',
            }}
          />
        </div>
      )}
    </div>
  )
})

export default VideoPlayer
