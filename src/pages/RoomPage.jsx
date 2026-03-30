import { useState, useRef, useCallback, useEffect } from 'react'
import { LogOut, Upload, ChevronDown, ChevronUp } from 'lucide-react'
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
  const { logout, username } = useAuth()
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const hasCaughtUpRef = useRef(false)

  // Handle incoming sync events
  const handleSyncEvent = useCallback(
    (event, payload) => {
      isSyncingRef.current = true

      switch (event) {
        case EVENTS.VIDEO_LOAD:
          setVideoUrl(payload.url)
          setIsPlaying(false)
          setCurrentTime(0)
          break
        case EVENTS.PLAY: {
          const position = computePlayPosition(payload.videoTimestamp, payload.serverTimestamp)
          playerRef.current?.seekTo(position)
          setIsPlaying(true)
          break
        }
        case EVENTS.PAUSE:
          playerRef.current?.seekTo(payload.videoTimestamp)
          setIsPlaying(false)
          break
        case EVENTS.SEEK:
          playerRef.current?.seekTo(payload.videoTimestamp)
          setIsPlaying(payload.isPlaying)
          break
        case EVENTS.BUFFER_START:
          partnerBufferingRef.current = true
          setIsPlaying(false)
          break
        case EVENTS.BUFFER_END:
          partnerBufferingRef.current = false
          setIsPlaying(true)
          break
      }

      setTimeout(() => { isSyncingRef.current = false }, 100)
    },
    []
  )

  const { broadcast, broadcastSeek, partnerPresence } = useSync({ onEvent: handleSyncEvent })

  // Late-join catch-up
  useEffect(() => {
    if (hasCaughtUpRef.current || !room) return
    hasCaughtUpRef.current = true
    const catchUp = getCatchUpState()
    if (!catchUp) return
    isSyncingRef.current = true
    queueMicrotask(() => {
      setVideoUrl(catchUp.url)
      setTimeout(() => {
        playerRef.current?.seekTo(catchUp.position)
        setIsPlaying(catchUp.isPlaying)
        isSyncingRef.current = false
      }, 500)
    })
  }, [room, getCatchUpState])

  // Player handlers
  const handlePlay = useCallback(() => {
    if (isSyncingRef.current) return
    const time = playerRef.current?.getCurrentTime() ?? 0
    setIsPlaying(true)
    broadcast(EVENTS.PLAY, { videoTimestamp: time })
    persistRoomState(supabase, roomId, { currentUrl: videoUrl, isPlaying: true, lastTimestamp: time })
  }, [broadcast, roomId, videoUrl])

  const handlePause = useCallback(() => {
    if (isSyncingRef.current) return
    const time = playerRef.current?.getCurrentTime() ?? 0
    setIsPlaying(false)
    broadcast(EVENTS.PAUSE, { videoTimestamp: time })
    persistRoomState(supabase, roomId, { currentUrl: videoUrl, isPlaying: false, lastTimestamp: time })
  }, [broadcast, roomId, videoUrl])

  const handleProgress = useCallback((state) => setCurrentTime(state.playedSeconds), [])
  const handleDuration = useCallback((d) => setDuration(d), [])

  const handleBuffer = useCallback(() => {
    if (isSyncingRef.current) return
    const time = playerRef.current?.getCurrentTime() ?? 0
    broadcast(EVENTS.BUFFER_START, { videoTimestamp: time })
  }, [broadcast])

  const handleBufferEnd = useCallback(() => {
    if (isSyncingRef.current) return
    broadcast(EVENTS.BUFFER_END, {})
  }, [broadcast])

  const handleReady = useCallback(() => {}, [])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) handlePause()
    else handlePlay()
  }, [isPlaying, handlePlay, handlePause])

  const handleToggleFullscreen = useCallback(() => {
    const el = playerContainerRef.current
    if (!el) return
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      ;(el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el)
    } else {
      ;(document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document)
    }
  }, [])

  const handleSeek = useCallback(
    (time) => {
      isSyncingRef.current = true
      playerRef.current?.seekTo(time)
      setCurrentTime(time)
      broadcastSeek({ videoTimestamp: time, isPlaying })
      persistRoomState(supabase, roomId, { currentUrl: videoUrl, isPlaying, lastTimestamp: time })
      setTimeout(() => { isSyncingRef.current = false }, 100)
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
      setSidebarOpen(false) // close sidebar on mobile after load
    },
    [broadcast, updateRoomUrl]
  )

  const handleSelectLibraryVideo = useCallback(
    (url) => handleLoadUrl(url),
    [handleLoadUrl]
  )

  return (
    <div
      id="cs-room"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-void)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <Header
        username={username}
        partnerPresence={partnerPresence}
        onLogout={logout}
      />

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          /* On wider screens, switch to row */
        }}
        className="cs-body"
      >
        {/* Player column */}
        <div
          ref={playerContainerRef}
          className="player-fullscreen-root cs-player-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            position: 'relative',
            background: '#000',
          }}
        >
          {/* Video area */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
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

          {/* Control bar — pinned to bottom of player col */}
          <div
            className="controls-overlay"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
              padding: '0 0 8px',
            }}
          >
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

        {/* ── Sidebar / Bottom Sheet ── */}
        <aside className="cs-sidebar">
          {/* Mobile drag handle  */}
          <div className="cs-sidebar-handle" aria-hidden>
            <div className="sheet-handle" />
          </div>

          {/* Sidebar inner — scrollable */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <UrlInput onSubmit={handleLoadUrl} />
            <Library
              videos={library}
              activeUrl={videoUrl}
              onSelect={handleSelectLibraryVideo}
            />
          </div>

          {/* Upload CTA */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
              flexShrink: 0,
            }}
          >
            <button
              id="cs-upload-btn"
              onClick={() => setShowUpload(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(232,149,122,0.3)',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 180ms var(--ease-out)',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(232,149,122,0.2)'
                e.currentTarget.style.borderColor = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-dim)'
                e.currentTarget.style.borderColor = 'rgba(232,149,122,0.3)'
              }}
            >
              <Upload size={15} />
              Upload Video
            </button>
          </div>
        </aside>

        {/* Mobile: sidebar toggle FAB */}
        <button
          id="cs-sidebar-fab"
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen((o) => !o)}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            right: '16px',
            zIndex: 40,
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            transition: 'all 200ms var(--ease-out)',
          }}
          className="cs-sidebar-fab"
        >
          {sidebarOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Upload modal */}
      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />

      {/* Layout styles (CSS-in-JS-like via style tag) */}
      <SidebarStyles sidebarOpen={sidebarOpen} />
    </div>
  )
}

/* ── Header ── */
function Header({ username, partnerPresence, onLogout }) {
  return (
    <header
      id="cs-header"
      style={{
        height: '52px',
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        paddingTop: 'env(safe-area-inset-top)',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,10,15,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(232,149,122,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
          }}
        >
          SYNC
        </span>
      </div>

      {/* Right: presence + user + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <PresenceIndicator partner={partnerPresence} />

        {username && (
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {username}
          </span>
        )}

        <button
          id="cs-logout"
          onClick={onLogout}
          aria-label="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'color 150ms, background 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--danger)'
            e.currentTarget.style.background = 'rgba(255,95,95,0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}

/* Inject responsive CSS that can't be done with inline styles */
function SidebarStyles({ sidebarOpen }) {
  return (
    <style>{`
      /* ── Body layout ── */
      .cs-body {
        position: relative;
        overflow: hidden;
      }

      /* ── Player column ── */
      .cs-player-col {
        /* mobile: takes all available height */
        flex: 1;
        min-height: 0;
      }

      /* ── Sidebar ── */
      .cs-sidebar {
        display: flex;
        flex-direction: column;
        background: var(--bg-deep);
        border-top: 1px solid var(--border);
        overflow: hidden;
        flex-shrink: 0;
        transition: height 380ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* ── Sidebar handle (mobile only) ── */
      .cs-sidebar-handle {
        padding: 10px 0 6px;
        display: flex;
        justify-content: center;
        cursor: grab;
      }

      /* ── FAB (mobile only) ── */
      .cs-sidebar-fab {
        display: flex;
      }

      /* ── MOBILE: sidebar is a bottom sheet ── */
      @media (max-width: 767px) {
        .cs-body {
          flex-direction: column;
        }

        .cs-sidebar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          border-radius: 20px 20px 0 0;
          border-top: 1px solid var(--border);
          background: rgba(13, 15, 20, 0.96);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          /* Collapsed: just the handle + URL bar visible */
          height: ${sidebarOpen ? 'min(70vh, 520px)' : '0px'};
          overflow: ${sidebarOpen ? 'hidden' : 'hidden'};
          box-shadow: 0 -20px 60px rgba(0,0,0,0.6);
        }

        .cs-sidebar-fab {
          display: flex;
        }

        /* Give player room for the control bar */
        .cs-player-col {
          padding-bottom: env(safe-area-inset-bottom);
        }
      }

      /* ── TABLET & DESKTOP: sidebar on the right ── */
      @media (min-width: 768px) {
        .cs-body {
          flex-direction: row;
        }

        .cs-sidebar {
          width: 300px;
          height: auto;
          border-top: none;
          border-left: 1px solid var(--border);
          border-radius: 0;
          position: static;
          background: var(--bg-deep);
        }

        .cs-sidebar-handle {
          display: none;
        }

        .cs-sidebar-fab {
          display: none !important;
        }

        .cs-player-col {
          padding-bottom: 0;
        }
      }

      @media (min-width: 1200px) {
        .cs-sidebar {
          width: 340px;
        }
      }
    `}</style>
  )
}
