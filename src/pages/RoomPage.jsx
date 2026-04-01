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
  const { room, library, getCatchUpState, updateRoomUrl, deleteVideo, renameVideo, roomId } = useRoom()

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
    <div id="cs-room-root" className="bg-background font-body text-on-background selection:bg-primary/30 selection:text-on-surface overflow-hidden min-h-screen">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-14 md:h-[72px] bg-[#131313]/80 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2 pl-12 md:pl-0">
          <span className="text-lg md:text-2xl font-bold tracking-tighter text-on-surface font-headline">CinemaSync</span>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <PresenceIndicator partner={partnerPresence} />
          {/* User logout */}
          <button
            onClick={logout}
            title={`Logout (${username})`}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary-container border border-outline-variant/15 flex items-center justify-center text-primary font-headline font-bold text-xs hover:bg-surface-container-highest transition-colors duration-300 uppercase"
          >
            {username ? username.charAt(0) : '?'}
          </button>
        </div>
      </nav>

      {/* Side Navigation - hidden on mobile */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full flex-col p-6 z-40 bg-[#131313] border-r border-outline-variant/10 w-20 hover:w-64 transition-all duration-500 group overflow-hidden" style={{ boxShadow: '40px 0 60px rgba(14,14,14,0.04)' }}>
        <div className="mb-12 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
            <Film size={20} className="text-primary" />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h2 className="text-xl font-black text-primary font-headline leading-none">CinemaSync</h2>
            <p className="text-[10px] text-on-surface-variant font-body uppercase tracking-wider mt-1">Private Session</p>
          </div>
        </div>
        <nav className="flex flex-col gap-6 flex-1">
          <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-4 text-on-surface-variant hover:bg-surface-container hover:text-on-surface p-3 rounded-lg transition-all duration-300 w-full text-left">
            <LibraryIcon size={20} className="shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-body uppercase tracking-[0.1rem] text-sm whitespace-nowrap">Gallery</span>
          </button>
          <button className="flex items-center gap-4 text-primary border-r-2 border-primary bg-surface-container p-3 rounded-lg transition-all duration-300 w-full text-left">
            <PlaySquare size={20} className="shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-body uppercase tracking-[0.1rem] text-sm whitespace-nowrap">Sync</span>
          </button>
        </nav>
        <button onClick={() => setShowUpload(true)} className="mt-auto bg-primary text-on-primary font-bold py-4 rounded-lg flex items-center justify-center gap-2 group-hover:px-6 transition-all duration-300 shrink-0">
          <Upload size={20} />
          <span className="hidden group-hover:block font-body uppercase tracking-[0.1rem] text-xs whitespace-nowrap">Add Video</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="md:ml-20 min-h-screen flex flex-col items-center p-4 md:p-8 lg:p-12 xl:p-20 relative bg-surface-container-lowest" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)' }}>

        {/* Video Canvas Section */}
        <div className="relative w-full max-w-7xl aspect-video rounded-none md:rounded-xl overflow-hidden shadow-2xl group/player video-container bg-black border-0 md:border md:border-outline-variant/10">
          <div className="absolute inset-0 z-0">
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

          {/* Control Bar Overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-20 player-hover-show bg-gradient-to-t from-black/80 to-transparent pt-12 pb-4">
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

        {/* URL Input Area */}
        <div className="mt-6 md:mt-10 w-full max-w-2xl flex flex-col items-center gap-5 md:gap-8 z-10 px-0 md:px-0">
          {/* URL Input */}
          <div className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-transparent rounded-lg blur opacity-0 group-hover:opacity-60 transition-opacity duration-1000"></div>
            <div className="relative bg-surface-container-low border border-outline-variant/10 rounded-lg p-1 flex items-center gap-2 focus-within:bg-surface-container transition-all duration-500">
              <Search className="text-on-surface-variant ml-3 md:ml-4 shrink-0" size={16} />
              <input
                className="w-full bg-transparent border-none text-on-surface placeholder:text-on-tertiary-container focus:outline-none focus:ring-0 font-body text-sm py-3 md:py-4 px-1 md:px-2"
                placeholder="Paste video URL to sync..."
                type="text"
                value={urlBarValue}
                onChange={(e) => setUrlBarValue(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                onPaste={handleUrlPaste}
                style={{ fontSize: '16px' }} /* Prevents iOS zoom on focus */
              />
              <button onClick={handleUrlSubmit} className="bg-primary text-on-primary px-5 md:px-6 py-2.5 md:py-3 rounded-md font-label text-xs uppercase tracking-[0.12rem] font-bold hover:bg-secondary transition-all duration-300 active:scale-95 shrink-0">
                Load
              </button>
            </div>
          </div>

          {/* Info section */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl md:text-3xl font-light font-headline tracking-tight text-on-surface/80">The Midnight Gallery</h1>
            <p className="text-[10px] md:text-xs font-label text-on-tertiary-container uppercase tracking-[0.2rem]">
              Watching with <span className="text-secondary">{partnerPresence ? partnerPresence.username : 'Yourself'}</span>
            </p>
          </div>
        </div>

        {/* Cinematic Scrim */}
        <div className="fixed bottom-0 left-0 w-full h-32 scrim-bottom pointer-events-none z-0"></div>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-6 pt-2 bg-[#131313]/80 backdrop-blur-xl border-t border-outline-variant/10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center justify-center py-2 px-3 text-on-surface-variant active:scale-90 transition-transform">
          <LibraryIcon size={20} />
          <span className="font-label text-[10px] uppercase tracking-wide mt-1">Gallery</span>
        </button>
        <button className="flex flex-col items-center justify-center py-2 px-3 text-primary">
          <PlaySquare size={20} />
          <span className="font-label text-[10px] uppercase tracking-wide mt-1">Sync</span>
        </button>
        <button onClick={() => setShowUpload(true)} className="flex flex-col items-center justify-center py-2 px-3 text-on-surface-variant active:scale-90 transition-transform">
          <Upload size={20} />
          <span className="font-label text-[10px] uppercase tracking-wide mt-1">Upload</span>
        </button>
      </nav>

      <SidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        library={library}
        activeUrl={videoUrl}
        onSelectUrl={handleLoadUrl}
        onUpload={() => setShowUpload(true)}
        onDelete={deleteVideo}
        onRename={renameVideo}
      />

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}

/* ── Sidebar / Drawer Component ── */
function SidebarDrawer({ isOpen, onClose, library, activeUrl, onSelectUrl, onUpload, onDelete, onRename }) {
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
          WebkitBackdropFilter: 'blur(6px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 55,
        }}
      />

      {/* Drawer - from right side */}
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
          borderBottom: '1px solid rgba(68, 71, 72, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Film size={18} style={{ color: '#e9c349' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#e5e2e1', fontFamily: 'Manrope, sans-serif' }}>Library</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              color: '#7e7d7d',
              cursor: 'pointer',
              transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2a2a2a'
              e.currentTarget.style.color = '#e5e2e1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#7e7d7d'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <Library videos={library} activeUrl={activeUrl} onSelect={onSelectUrl} onDelete={onDelete} onRename={onRename} />
        </div>

        <div style={{ padding: '16px 20px calc(20px + env(safe-area-inset-bottom))', borderTop: '1px solid rgba(68, 71, 72, 0.15)' }}>
          <button
            onClick={onUpload}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: '#e9c349',
              color: '#3c2f00',
              fontWeight: 700,
              fontSize: '13px',
              fontFamily: 'Manrope, sans-serif',
              cursor: 'pointer',
              transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 20px rgba(233, 195, 73, 0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffdf9e'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#e9c349'
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
