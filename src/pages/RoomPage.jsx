import { useState, useRef, useCallback, useEffect } from 'react'
import { LogOut, Upload, Menu, X, PlaySquare } from 'lucide-react'
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
  const isSyncingRef = useRef(false)
  const partnerBufferingRef = useRef(false)
  const hasCaughtUpRef = useRef(false)
  const hideTimerRef = useRef(null)

  const [videoUrl, setVideoUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  
  const [showUpload, setShowUpload] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showUI, setShowUI] = useState(true)

  // -- Idle UI Logic --
  const handleUserActivity = useCallback(() => {
    setShowUI(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isPlaying && !sidebarOpen) {
      hideTimerRef.current = setTimeout(() => setShowUI(false), 3500)
    }
  }, [isPlaying, sidebarOpen])

  useEffect(() => {
    if (!isPlaying || sidebarOpen) {
      setShowUI(true)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    } else {
      handleUserActivity()
    }
  }, [isPlaying, sidebarOpen, handleUserActivity])

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown']
    events.forEach(e => window.addEventListener(e, handleUserActivity))
    return () => events.forEach(e => window.removeEventListener(e, handleUserActivity))
  }, [handleUserActivity])


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
    setSidebarOpen(false) // auto-close sidebar
  }, [broadcast, updateRoomUrl])

  const handleToggleFullscreen = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      ;(el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el)
    } else {
      ;(document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document)
    }
  }, [])

  return (
    <div
      id="cs-room-root"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000', // Deep black for cinematic feel
        overflow: 'hidden',
      }}
    >
      {/* ── 1. Absolute Fullscreen Video ── */}
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
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

      {/* ── 2. Floating UI Overlay (Fades out when idle) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none', // crucial: let clicks pass through to video unless they hit UI
          opacity: showUI ? 1 : 0,
          transition: 'opacity 600ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        {/* Top Gradient + Header */}
        <div style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
          paddingBottom: '40px',
          pointerEvents: 'auto', // clicks on header work
        }}>
          <Header
            username={username}
            partnerPresence={partnerPresence}
            onLogout={logout}
            onOpenMenu={() => setSidebarOpen(true)}
          />
        </div>

        {/* Bottom Gradient + Controls */}
        <div style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
          paddingTop: '60px',
          paddingBottom: 'env(safe-area-inset-bottom)',
          pointerEvents: 'auto', // clicks on controls work
        }}>
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
        </div>
      </div>

      {/* ── 3. Unified Overlay Drawer (Sidebar) ── */}
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

/* ── Header Components ── */
function Header({ username, partnerPresence, onLogout, onOpenMenu }) {
  return (
    <header
      style={{
        padding: 'calc(16px + env(safe-area-inset-top)) 24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onOpenMenu}
          aria-label="Menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--bg-glass-md)',
            border: '1px solid var(--border)',
            color: '#fff',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-glass-md)'}
        >
          <Menu size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px var(--accent-glow)'
            }}
          >
            <PlaySquare size={14} color="#fff" fill="#fff" />
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: '#fff',
              fontFamily: 'var(--font-body)',
            }}
          >
            CinemaSync
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <PresenceIndicator partner={partnerPresence} />
        
        {/* Only show username on larger screens */}
        <div className="hidden sm:block">
          {username && (
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              {username}
            </span>
          )}
        </div>

        <button
          onClick={onLogout}
          aria-label="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--danger)';
            e.currentTarget.style.background = 'rgba(255,95,95,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
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
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
          zIndex: 30,
        }}
      />
      
      {/* Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '100%',
          maxWidth: '360px',
          background: 'var(--bg-deep)',
          borderRight: '1px solid var(--border)',
          transform: `translateX(${isOpen ? '0' : '-100%'})`,
          transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '20px 0 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ 
          padding: 'calc(24px + env(safe-area-inset-top)) 24px 20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)' 
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Library</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: 600 }}>Play from URL</h3>
            <UrlInput onSubmit={onSelectUrl} />
          </div>

          <div>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: 600 }}>Your Media</h3>
            <Library videos={library} activeUrl={activeUrl} onSelect={onSelectUrl} />
          </div>
        </div>

        <div style={{ padding: '20px 24px calc(24px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onUpload}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '14px', borderRadius: '12px', border: 'none',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '14px',
              cursor: 'pointer', transition: 'all 200ms', boxShadow: '0 4px 15px var(--accent-glow)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Upload size={16} strokeWidth={2.5} />
            Upload Video
          </button>
        </div>
      </aside>
    </>
  )
}
