import { useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { Play, Link2, Film } from 'lucide-react'

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
          gap: '24px',
          backgroundColor: '#0e0e0e',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient gold glow */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(233,195,73,0.04) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />

        {/* Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(233,195,73,0.06)',
            border: '1px solid rgba(233,195,73,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Film
            size={30}
            strokeWidth={1.5}
            style={{ color: '#e9c349' }}
          />
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <p style={{
            fontSize: '18px',
            fontWeight: 300,
            fontFamily: 'Manrope, sans-serif',
            color: '#e5e2e1',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            Ready to watch
          </p>
          <p style={{
            fontSize: '12px',
            color: '#c4c7c7',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            justifyContent: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            <Link2 size={13} style={{ color: '#e9c349', flexShrink: 0 }} />
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
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid rgba(233,195,73,0.15)',
              borderTopColor: '#e9c349',
              animation: 'spin 600ms linear infinite',
            }}
          />
        </div>
      )}
    </div>
  )
})

export default VideoPlayer
