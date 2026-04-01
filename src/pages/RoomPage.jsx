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
    <div id="cs-room-root" className="bg-background font-body text-on-background selection:bg-primary selection:text-on-primary overflow-hidden min-h-screen">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 py-4 md:py-6 bg-[#131313]/70 backdrop-blur-xl">
        <div className="flex items-center gap-2 pl-12 md:pl-0">
          <span className="text-xl md:text-2xl font-bold tracking-tighter text-[#e5e2e1] font-headline">CinemaSync</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <PresenceIndicator partner={partnerPresence} />
          </div>
          {/* User logout */}
          <button 
            onClick={logout} 
            title={`Logout (${username})`}
            className="w-8 h-8 rounded-full bg-primary-container border border-outline-variant/20 flex items-center justify-center text-primary font-bold text-xs hover:bg-surface-container-highest transition-colors uppercase"
          >
            {username ? username.charAt(0) : '?'}
          </button>
        </div>
      </nav>

      {/* Side Navigation */}
      <aside className="fixed left-0 top-0 h-full flex flex-col p-4 md:p-6 z-40 bg-[#131313] border-r border-[#444748]/15 shadow-[40px_0_60px_rgba(14,14,14,0.04)] w-16 md:w-20 hover:w-64 transition-all duration-500 group overflow-hidden">
        <div className="mb-12 flex items-center gap-4 mt-2 md:mt-0">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
            <Film size={20} className="text-primary" />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h2 className="text-lg md:text-xl font-black text-primary font-headline leading-none">CinemaSync</h2>
            <p className="text-[10px] text-on-surface-variant font-body uppercase tracking-wider mt-1">Private Session</p>
          </div>
        </div>
        <nav className="flex flex-col gap-4 md:gap-8 flex-1">
          <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-4 text-on-surface-variant hover:bg-surface-container hover:text-on-surface p-2 md:p-3 rounded-lg transition-all duration-300 w-full text-left">
            <LibraryIcon size={20} className="shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-body uppercase tracking-[0.1rem] text-xs md:text-sm whitespace-nowrap">Gallery</span>
          </button>
          <button className="flex items-center gap-4 text-primary border-r-2 border-primary bg-surface-container p-2 md:p-3 rounded-lg transition-all duration-300 w-full text-left">
            <PlaySquare size={20} className="shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-body uppercase tracking-[0.1rem] text-xs md:text-sm whitespace-nowrap">Sync</span>
          </button>
        </nav>
        <button onClick={() => setShowUpload(true)} className="mt-auto bg-primary text-on-primary font-bold py-3 md:py-4 rounded-lg flex items-center justify-center gap-2 group-hover:px-6 transition-all shrink-0">
          <Upload size={20} />
          <span className="hidden group-hover:block font-body uppercase tracking-[0.1rem] text-xs whitespace-nowrap">Add Video</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="ml-16 md:ml-20 min-h-screen flex flex-col items-center justify-center p-4 md:p-8 lg:p-20 pt-24 md:pt-20 relative bg-surface-container-lowest">
        
        {/* Video Canvas Section */}
        <div className="relative w-full max-w-7xl aspect-video rounded-xl overflow-hidden shadow-2xl group/player video-container bg-black border border-outline-variant/10">
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
        <div className="mt-8 md:mt-12 w-full max-w-2xl flex flex-col items-center gap-6 md:gap-8 z-10">
          <div className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-transparent rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative bg-surface-container-low border border-outline-variant/10 rounded-lg p-1 flex items-center gap-2 focus-within:bg-surface-container transition-all duration-500">
              <Search className="text-on-surface-variant ml-4 shrink-0" size={18} />
              <input 
                className="w-full bg-transparent border-none text-on-surface placeholder:text-on-tertiary-container focus:outline-none focus:ring-0 font-body text-sm py-3 md:py-4 px-2" 
                placeholder="Paste video URL to sync..." 
                type="text"
                value={urlBarValue}
                onChange={(e) => setUrlBarValue(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                onPaste={handleUrlPaste}
              />
              <button onClick={handleUrlSubmit} className="bg-primary text-on-primary px-4 md:px-6 py-2 md:py-3 rounded-md font-label text-xs uppercase tracking-[0.15rem] font-bold hover:brightness-110 transition-all active:scale-95 shrink-0">
                Load
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center mt-2 md:mt-4">
            <h1 className="text-2xl md:text-3xl font-light font-headline tracking-tight text-on-surface/80">The Midnight Gallery</h1>
            <p className="text-[10px] md:text-xs font-body text-on-tertiary-container uppercase tracking-[0.2rem]">
              Watching with <span className="text-secondary">{partnerPresence ? partnerPresence.username : 'Yourself'}</span>
            </p>
          </div>
        </div>

        {/* Cinematic Scrim */}
        <div className="fixed bottom-0 left-0 w-full h-32 scrim-bottom pointer-events-none z-0"></div>
      </main>

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
          <Library videos={library} activeUrl={activeUrl} onSelect={onSelectUrl} onDelete={onDelete} onRename={onRename} />
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
