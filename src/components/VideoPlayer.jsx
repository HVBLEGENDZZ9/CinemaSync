import { useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { Play, Link2 } from 'lucide-react'

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

  const handleTimeUpdate = useCallback(
    (e) => {
      const el = e.target
      if (el && onTimeUpdate) {
        onTimeUpdate({ playedSeconds: el.currentTime })
      }
    },
    [onTimeUpdate]
  )

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
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          backgroundColor: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient background glow */}
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,45,120,0.06) 0%, transparent 70%)',
          top: '50%',
          left: '30%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(62,166,255,0.06) 0%, transparent 70%)',
          top: '50%',
          left: '70%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />

        {/* Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Play
            size={28}
            strokeWidth={1.5}
            style={{ color: 'var(--accent)', marginLeft: '3px' }}
          />
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <p style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '6px',
          }}>
            Ready to watch
          </p>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            justifyContent: 'center',
          }}>
            <Link2 size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
            Paste a URL in the search bar above
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
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
          youtube: {
            playerVars: {
              origin: typeof window !== 'undefined' ? window.location.origin : '',
            },
          },
        }}
      />

      {/* Buffering indicator */}
      {isBuffering && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid rgba(255,45,120,0.15)',
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
