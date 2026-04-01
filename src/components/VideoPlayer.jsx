import { useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { Film, Link2 } from 'lucide-react'

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
          gap: '28px',
          backgroundColor: 'var(--ast-void)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient gold radial glow */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.03) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />

        {/* Icon container */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--ast-gold-dim)',
            border: '1px solid rgba(201,169,110,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Film
            size={28}
            strokeWidth={1.5}
            style={{ color: 'var(--ast-gold)' }}
          />
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <p style={{
            fontSize: '20px',
            fontWeight: 300,
            fontFamily: 'var(--font-display)',
            color: 'var(--ast-ivory)',
            marginBottom: '10px',
            letterSpacing: '-0.01em',
          }}>
            Ready to Watch
          </p>
          <p style={{
            fontSize: '11px',
            color: 'var(--ast-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
          }}>
            <Link2 size={12} style={{ color: 'var(--ast-gold-dark)', flexShrink: 0 }} />
            Paste a URL below to begin
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
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '2px solid rgba(201,169,110,0.12)',
              borderTopColor: 'var(--ast-gold)',
              animation: 'spin 700ms linear infinite',
            }}
          />
        </div>
      )}
    </div>
  )
})

export default VideoPlayer
