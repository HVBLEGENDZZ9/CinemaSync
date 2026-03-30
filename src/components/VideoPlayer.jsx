import { useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { Plus } from 'lucide-react'

const VideoPlayer = forwardRef(function VideoPlayer(
  {
    url,
    isPlaying,
    onPlay,
    onPause,
    onProgress,
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
      playerRef.current?.seekTo(seconds, 'seconds')
    },
    getCurrentTime: () => {
      return playerRef.current?.getCurrentTime() ?? 0
    },
    getDuration: () => {
      return playerRef.current?.getDuration() ?? 0
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
        url={url}
        playing={isPlaying}
        muted={muted}
        controls={false}
        width="100%"
        height="100%"
        onPlay={onPlay}
        onPause={onPause}
        onProgress={onProgress}
        onDuration={onDuration}
        onBuffer={handleBuffer}
        onBufferEnd={handleBufferEnd}
        onReady={onReady}
        progressInterval={250}
        config={{
          youtube: {
            playerVars: {
              disablekb: 1,
              modestbranding: 1,
              rel: 0,
            },
          },
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
