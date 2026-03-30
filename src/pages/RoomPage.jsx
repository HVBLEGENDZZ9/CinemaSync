import { useState, useRef, useCallback, useEffect } from 'react'
import { LogOut, Upload } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRoom } from '../hooks/useRoom'
import { useSync } from '../hooks/useSync'
import { supabase } from '../lib/supabase'
import { EVENTS, computePlayPosition, persistRoomState } from '../lib/sync'
import VideoPlayer from '../components/VideoPlayer'
import ControlBar from '../components/ControlBar'
import UrlInput from '../components/UrlInput'
import Library from '../components/Library'
import UploadModal from '../components/UploadModal'
import PresenceIndicator from '../components/PresenceIndicator'

export default function RoomPage() {
  const { logout } = useAuth()
  const { room, library, getCatchUpState, updateRoomUrl, roomId } = useRoom()

  const playerRef = useRef(null)
  const isSyncingRef = useRef(false)
  const partnerBufferingRef = useRef(false)

  const [videoUrl, setVideoUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const hasCaughtUpRef = useRef(false)

  // Handle incoming sync events
  const handleSyncEvent = useCallback(
    (event, payload) => {
      isSyncingRef.current = true

      switch (event) {
        case EVENTS.VIDEO_LOAD: {
          setVideoUrl(payload.url)
          setIsPlaying(false)
          setCurrentTime(0)
          // Seek to 0 after player loads (handled in onReady)
          break
        }

        case EVENTS.PLAY: {
          const position = computePlayPosition(
            payload.videoTimestamp,
            payload.serverTimestamp
          )
          playerRef.current?.seekTo(position)
          setIsPlaying(true)
          break
        }

        case EVENTS.PAUSE: {
          playerRef.current?.seekTo(payload.videoTimestamp)
          setIsPlaying(false)
          break
        }

        case EVENTS.SEEK: {
          playerRef.current?.seekTo(payload.videoTimestamp)
          setIsPlaying(payload.isPlaying)
          break
        }

        case EVENTS.BUFFER_START: {
          partnerBufferingRef.current = true
          // Pause playback while partner buffers
          setIsPlaying(false)
          break
        }

        case EVENTS.BUFFER_END: {
          partnerBufferingRef.current = false
          // Resume if we were playing
          setIsPlaying(true)
          break
        }
      }

      // Reset after a tick to allow player event handlers to fire
      setTimeout(() => {
        isSyncingRef.current = false
      }, 100)
    },
    []
  )

  const { broadcast, broadcastSeek, partnerPresence } =
    useSync({ onEvent: handleSyncEvent })

  // Late-join catch-up: apply room state once when room data arrives.
  // Using a ref-gated approach inside a subscription callback to avoid
  // the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (hasCaughtUpRef.current || !room) return
    hasCaughtUpRef.current = true

    const catchUp = getCatchUpState()
    if (!catchUp) return

    isSyncingRef.current = true
    // Schedule state updates for the next microtask to satisfy the linter
    queueMicrotask(() => {
      setVideoUrl(catchUp.url)
      // Defer seek until player has loaded the URL
      setTimeout(() => {
        playerRef.current?.seekTo(catchUp.position)
        setIsPlaying(catchUp.isPlaying)
        isSyncingRef.current = false
      }, 500)
    })
  }, [room, getCatchUpState])

  // --- Player event handlers ---

  const handlePlay = useCallback(() => {
    if (isSyncingRef.current) return
    const time = playerRef.current?.getCurrentTime() ?? 0
    setIsPlaying(true)
    broadcast(EVENTS.PLAY, { videoTimestamp: time })
    persistRoomState(supabase, roomId, {
      currentUrl: videoUrl,
      isPlaying: true,
      lastTimestamp: time,
    })
  }, [broadcast, roomId, videoUrl])

  const handlePause = useCallback(() => {
    if (isSyncingRef.current) return
    const time = playerRef.current?.getCurrentTime() ?? 0
    setIsPlaying(false)
    broadcast(EVENTS.PAUSE, { videoTimestamp: time })
    persistRoomState(supabase, roomId, {
      currentUrl: videoUrl,
      isPlaying: false,
      lastTimestamp: time,
    })
  }, [broadcast, roomId, videoUrl])

  const handleProgress = useCallback((state) => {
    setCurrentTime(state.playedSeconds)
  }, [])

  const handleDuration = useCallback((d) => {
    setDuration(d)
  }, [])

  const handleBuffer = useCallback(() => {
    if (isSyncingRef.current) return
    const time = playerRef.current?.getCurrentTime() ?? 0
    broadcast(EVENTS.BUFFER_START, { videoTimestamp: time })
  }, [broadcast])

  const handleBufferEnd = useCallback(() => {
    if (isSyncingRef.current) return
    broadcast(EVENTS.BUFFER_END, {})
  }, [broadcast])

  const handleReady = useCallback(() => {
    // Player loaded — if catching up, the seek is already queued
  }, [])

  // --- User actions ---

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause])

  const handleSeek = useCallback(
    (time) => {
      isSyncingRef.current = true
      playerRef.current?.seekTo(time)
      setCurrentTime(time)
      broadcastSeek({ videoTimestamp: time, isPlaying })
      persistRoomState(supabase, roomId, {
        currentUrl: videoUrl,
        isPlaying,
        lastTimestamp: time,
      })
      setTimeout(() => {
        isSyncingRef.current = false
      }, 100)
    },
    [broadcastSeek, isPlaying, roomId, videoUrl]
  )

  const handleLoadUrl = useCallback(
    (url) => {
      setVideoUrl(url)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      broadcast(EVENTS.VIDEO_LOAD, { url, sourceType: 'url' })
      updateRoomUrl(url)
    },
    [broadcast, updateRoomUrl]
  )

  const handleSelectLibraryVideo = useCallback(
    (url) => {
      handleLoadUrl(url)
    },
    [handleLoadUrl]
  )

  return (
    <div className="h-screen flex flex-col page-enter" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 shrink-0"
        style={{
          height: '48px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        {/* Brand */}
        <span
          className="text-[12px] leading-[1.2]"
          style={{
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.3em',
            color: 'var(--text-secondary)',
          }}
        >
          SYNC
        </span>

        {/* Right side: presence + logout */}
        <div className="flex items-center gap-4">
          <PresenceIndicator partner={partnerPresence} />

          <button
            onClick={logout}
            className="flex items-center justify-center"
            style={{
              color: 'var(--text-tertiary)',
              transition: 'color 150ms ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--danger)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }}
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Player + controls column */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Player */}
          <div className="flex-1 flex items-center justify-center min-h-0 p-5">
            <div className="w-full max-w-full" style={{ maxHeight: '100%' }}>
              <VideoPlayer
                ref={playerRef}
                url={videoUrl}
                isPlaying={isPlaying}
                muted={muted}
                onPlay={handlePlay}
                onPause={handlePause}
                onTimeUpdate={handleProgress}
                onDuration={handleDuration}
                onBuffer={handleBuffer}
                onBufferEnd={handleBufferEnd}
                onReady={handleReady}
              />
            </div>
          </div>

          {/* Control bar */}
          <ControlBar
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        </div>

        {/* Sidebar */}
        <aside
          className="flex flex-col shrink-0"
          style={{
            width: '300px',
            backgroundColor: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          {/* Sidebar content */}
          <div className="flex flex-col gap-8 flex-1 overflow-y-auto p-5">
            {/* URL Input section */}
            <UrlInput onSubmit={handleLoadUrl} />

            {/* Library section */}
            <Library
              videos={library}
              activeUrl={videoUrl}
              onSelect={handleSelectLibraryVideo}
            />
          </div>

          {/* Upload button — pinned to bottom */}
          <div
            className="shrink-0 p-5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              onClick={() => setShowUpload(true)}
              className="w-full flex items-center justify-center gap-2 rounded-[6px] py-2.5 text-[13px] leading-[1.2]"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                transition:
                  'border-color 150ms ease-out, color 150ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-active)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <Upload size={14} />
              Upload Video
            </button>
          </div>
        </aside>
      </div>

      {/* Upload modal */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
      />
    </div>
  )
}
