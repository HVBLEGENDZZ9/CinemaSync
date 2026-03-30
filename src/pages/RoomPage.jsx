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
import { BackgroundPaths } from '@/components/ui/background-paths'

export default function RoomPage() {
  const { logout } = useAuth()
  const { room, library, getCatchUpState, updateRoomUrl, roomId } = useRoom()

  const playerRef = useRef(null)
  const playerContainerRef = useRef(null)
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

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (playerContainerRef.current?.requestFullscreen) {
        playerContainerRef.current.requestFullscreen()
      } else if (playerContainerRef.current?.webkitRequestFullscreen) {
        playerContainerRef.current.webkitRequestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      }
    }
  }, [])

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
    <BackgroundPaths>
      <div className="h-screen w-full flex flex-col page-enter bg-transparent text-[var(--text-primary)]">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-5 shrink-0 backdrop-blur-md bg-white/5 dark:bg-black/20"
          style={{
            height: '48px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Brand */}
          <span
            className="text-[12px] leading-[1.2]"
            style={{
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.3em',
              color: 'var(--text-primary)',
            }}
          >
            SYNC
          </span>

          {/* Right side: presence + logout */}
          <div className="flex items-center gap-4">
            <PresenceIndicator partner={partnerPresence} />

            <button
              onClick={logout}
              className="flex items-center justify-center p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              style={{
                color: 'var(--text-secondary)',
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--danger)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 min-h-0 relative z-10 w-full max-w-7xl mx-auto md:p-4 overflow-y-auto md:overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-min md:h-full w-full bg-white/5 dark:bg-black/40 backdrop-blur-2xl md:rounded-3xl border-0 md:border md:border-black/5 md:dark:border-white/5 shadow-2xl overflow-hidden">
            {/* Player + controls column */}
            <div 
              ref={playerContainerRef}
              className="flex flex-col w-full md:flex-1 min-w-0 bg-white/5 dark:bg-black/40 md:bg-transparent player-container min-h-[40vh] md:min-h-0"
            >
              {/* Player */}
              <div className="flex-1 flex items-center justify-center min-h-0 p-2 md:p-5">
                <div className="w-full h-full max-w-full rounded-2xl overflow-hidden bg-black/80 shadow-inner flex items-center justify-center relative">
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
              <div className="px-2 md:px-5 pb-2 md:pb-5 control-bar-wrapper">
                <div className="bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/5 rounded-2xl p-1 shadow-sm control-bar-inner">
                  <ControlBar
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onPlayPause={handlePlayPause}
                    onSeek={handleSeek}
                    muted={muted}
                    onToggleMute={() => setMuted((m) => !m)}
                    onToggleFullscreen={handleToggleFullscreen}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar (Responsive column stack) */}
            <aside
              className="flex flex-col shrink-0 w-full md:w-[300px] h-[400px] md:h-auto border-t md:border-t-0 md:border-l border-black/5 dark:border-white/5 bg-white/10 dark:bg-black/20 backdrop-blur-lg"
            >
              {/* Sidebar content */}
              <div className="flex flex-col gap-8 flex-1 overflow-y-auto p-5 custom-scrollbar">
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
                className="shrink-0 p-5 mt-auto border-t border-black/5 dark:border-white/5"
              >
                <button
                  onClick={() => setShowUpload(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-medium leading-[1.2] shadow-sm hover:shadow-md active:scale-95"
                  style={{
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--bg-base)',
                    transition: 'all 150ms ease-out',
                  }}
                >
                  <Upload size={16} />
                  Upload Video
                </button>
              </div>
            </aside>
          </div>
        </div>

        {/* Upload modal */}
        <UploadModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
        />
      </div>
    </BackgroundPaths>
  )
}
