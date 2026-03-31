import { useState, useRef, useCallback, useEffect } from 'react'
import { LogOut, Upload, Menu, X, PlaySquare, Search, Library as LibraryIcon, Film, Users } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRoom } from '../hooks/useRoom'
import { useSync } from '../hooks/useSync'
import { supabase } from '../lib/supabase'
import { EVENTS, computePlayPosition, persistRoomState } from '../lib/sync'
import VideoPlayer from '../components/VideoPlayer'
import ControlBar from '../components/ControlBar'
import Library from '../components/Library'
import UploadModal from '../components/UploadModal'
import PresenceIndicator from '../components/PresenceIndicator'

export default function RoomPage() {
  const { logout, username } = useAuth()
  const { room, library, getCatchUpState, updateRoomUrl, roomId } = useRoom()

  const playerRef = useRef(null)
  const isSyncingRef = useRef(false)
  const partnerBufferingRef = useRef(false)
  const hasCaughtUpRef = useRef(false)

  const [videoUrl, setVideoUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)

  const [showUpload, setShowUpload] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [urlBarValue, setUrlBarValue] = useState('')

  // -- Sync Logic --
  const handleSyncEvent = useCallback((event, payload) => {
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
      default:
        break
    }

    setTimeout(() => { isSyncingRef.current = false }, 100)
  }, [])

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

  // -- Player Handlers --
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

  const handlePlayPause = useCallback(() => {
    if (isPlaying) handlePause()
    else handlePlay()
  }, [isPlaying, handlePlay, handlePause])

  const handleSeek = useCallback((time) => {
    isSyncingRef.current = true
    playerRef.current?.seekTo(time)
    setCurrentTime(time)
    broadcastSeek({ videoTimestamp: time, isPlaying })
    persistRoomState(supabase, roomId, { currentUrl: videoUrl, isPlaying, lastTimestamp: time })
    setTimeout(() => { isSyncingRef.current = false }, 100)
  }, [broadcastSeek, isPlaying, roomId, videoUrl])

  const handleLoadUrl = useCallback((url) => {
    setVideoUrl(url)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    broadcast(EVENTS.VIDEO_LOAD, { url, sourceType: 'url' })
    updateRoomUrl(url)
    setSidebarOpen(false)
    setUrlBarValue('')
  }, [broadcast, updateRoomUrl])

  const handleToggleFullscreen = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      ;(el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el)
    } else {
      ;(document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document)
    }
  }, [])

  const handleUrlSubmit = useCallback(() => {
    const trimmed = urlBarValue.trim()
    if (trimmed && /^https?:\/\/.+/i.test(trimmed)) {
      handleLoadUrl(trimmed)
    }
  }, [urlBarValue, handleLoadUrl])

  const handleUrlKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleUrlSubmit()
  }, [handleUrlSubmit])

  const handleUrlPaste = useCallback((e) => {
    const pasted = e.clipboardData?.getData('text')?.trim()
    if (pasted && /^https?:\/\/.+/i.test(pasted)) {
      e.preventDefault()
      handleLoadUrl(pasted)
    }
  }, [handleLoadUrl])

  return (
    <div
      id="cs-room-root"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-void)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── 1. YouTube-Style Top Bar ── */}
      <div className="yt-topbar" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--gradient-pink-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px var(--accent-glow)',
            }}
          >
            <PlaySquare size={16} color="#fff" fill="#fff" />
          </div>
          <span
            className="hidden sm:inline"
            style={{
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#fff',
              fontFamily: 'var(--font-body)',
            }}
          >
            Cinema<span style={{ color: 'var(--accent)' }}>Sync</span>
          </span>
        </div>

        {/* URL / Search Bar */}
        <div className="yt-search-wrapper" style={{ margin: '0 auto' }}>
          <input
            type="url"
            className="yt-search-input"
            value={urlBarValue}
            onChange={(e) => setUrlBarValue(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            onPaste={handleUrlPaste}
            placeholder="Paste a video URL or YouTube link..."
            autoComplete="off"
          />
          <button
            className="yt-search-btn"
            onClick={handleUrlSubmit}
            aria-label="Load URL"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <PresenceIndicator partner={partnerPresence} />

          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Library"
            title="Library"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <LibraryIcon size={18} />
          </button>

          {/* User avatar / menu */}
          <button
            onClick={logout}
            aria-label="Logout"
            title={`Logout (${username})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'var(--gradient-pink-blue)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              transition: 'all 200ms',
              boxShadow: '0 0 0 2px var(--bg-deep)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px var(--bg-deep)'}
          >
            {username ? username.charAt(0) : '?'}
          </button>
        </div>
      </div>

      {/* ── 2. Main Content Area ── */}
      <div className="yt-video-area">
        <div className="yt-player-wrapper">
          {/* Video Player - 16:9 */}
          <div className="yt-player-container">
            <div className="yt-player-inner">
              <VideoPlayer
                ref={playerRef}
                url={videoUrl}
                isPlaying={isPlaying}
                muted={muted}
                onPlay={handlePlay}
                onPause={handlePause}
                onTimeUpdate={(state) => setCurrentTime(state.playedSeconds)}
                onDuration={(d) => setDuration(d)}
                onBuffer={() => !isSyncingRef.current && broadcast(EVENTS.BUFFER_START, { videoTimestamp: playerRef.current?.getCurrentTime() ?? 0 })}
                onBufferEnd={() => !isSyncingRef.current && broadcast(EVENTS.BUFFER_END, {})}
                onReady={() => {}}
              />
            </div>
          </div>

          {/* Control Bar */}
          <ControlBar
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            muted={muted}
            onToggleMute={() => setMuted(m => !m)}
            onToggleFullscreen={handleToggleFullscreen}
          />

          {/* Video Info */}
          <div className="yt-info-bar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {partnerPresence && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: 'var(--blue-dim)',
                    border: '1px solid rgba(62, 166, 255, 0.15)',
                  }}>
                    <Users size={14} style={{ color: 'var(--blue)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)' }}>
                      Watching with {partnerPresence.username}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="yt-chip yt-chip-accent"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload size={14} />
                  Upload
                </button>
                <button
                  className="yt-chip yt-chip-default"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Film size={14} />
                  Library
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Sidebar Drawer (Library) ── */}
      <SidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        library={library}
        activeUrl={videoUrl}
        onSelectUrl={handleLoadUrl}
        onUpload={() => setShowUpload(true)}
      />

      {/* ── 4. Upload Modal ── */}
      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}

/* ── Sidebar / Drawer Component ── */
function SidebarDrawer({ isOpen, onClose, library, activeUrl, onSelectUrl, onUpload }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
          zIndex: 55,
        }}
      />

      {/* Drawer - from right side like YouTube */}
      <aside
        className="yt-sidebar"
        style={{
          transform: `translateX(${isOpen ? '0' : '100%'})`,
        }}
      >
        <div style={{
          padding: 'calc(16px + env(safe-area-inset-top)) 20px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Film size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Library</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <Library videos={library} activeUrl={activeUrl} onSelect={onSelectUrl} />
        </div>

        <div style={{ padding: '16px 20px calc(20px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onUpload}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '20px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 200ms',
              boxShadow: '0 4px 15px var(--accent-glow)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <Upload size={16} strokeWidth={2.5} />
            Upload Video
          </button>
        </div>
      </aside>
    </>
  )
}
