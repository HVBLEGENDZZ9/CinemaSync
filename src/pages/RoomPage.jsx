import { useState, useRef, useCallback, useEffect } from 'react'
import { LogOut, Upload, X, Search, Film, Library as LibraryIcon, Play } from 'lucide-react'
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

  // -- Sync Logic (unchanged) --
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

  // -- Player Handlers (unchanged) --
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
      className="ast-room-root ast-noise"
      style={{
        background: 'var(--ast-void)',
        fontFamily: 'var(--font-body)',
        color: 'var(--ast-ivory)',
        overflow: 'hidden',
        minHeight: '100vh',
        minHeight: '100dvh',
      }}
    >
      {/* ════════════════════════════════════════════
          TOP NAVIGATION BAR
          ════════════════════════════════════════════ */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
          height: '60px',
          background: 'rgba(5, 5, 5, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--ast-border-subtle)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'var(--ast-gold-dim)',
            border: '1px solid rgba(201,169,110,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Film size={14} style={{ color: 'var(--ast-gold)' }} />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--ast-ivory)',
            letterSpacing: '-0.02em',
          }}>
            CinemaSync
          </span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <PresenceIndicator partner={partnerPresence} />

          {/* User avatar / logout */}
          <button
            onClick={logout}
            title={`Logout (${username})`}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--ast-gold-dim)',
              border: '1px solid rgba(201,169,110,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ast-gold)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all var(--dur-fast) ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ast-gold)'
              e.currentTarget.style.color = 'var(--ast-on-gold)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--ast-gold-dim)'
              e.currentTarget.style.color = 'var(--ast-gold)'
            }}
          >
            {username ? username.charAt(0) : '?'}
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          MAIN CONTENT
          ════════════════════════════════════════════ */}
      <main
        style={{
          minHeight: '100vh',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px',
          paddingTop: 'calc(env(safe-area-inset-top) + 76px)',
          background: 'var(--ast-deep)',
          overflowY: 'auto',
        }}
      >
        {/* Video Player */}
        <div
          className="ast-player-wrap"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1200px',
            aspectRatio: '16/9',
            overflow: 'hidden',
            background: '#000',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          }}
          /* border-radius handled via CSS media query class below */
          id="ast-video-player"
        >
          {/* Player */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
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

          {/* Controls overlay */}
          <div
            className="ast-player-controls"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
              paddingTop: '60px',
            }}
          >
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

        {/* Below player section */}
        <div style={{
          width: '100%',
          maxWidth: '720px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          marginTop: '28px',
          padding: '0 4px',
        }}>
          {/* URL Input */}
          <div style={{
            width: '100%',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 4px 4px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--ast-surface)',
              border: '1px solid var(--ast-border)',
              transition: 'border-color var(--dur-base) ease, box-shadow var(--dur-base) ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--ast-border-gold)'
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--ast-gold-dim)'
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                e.currentTarget.style.borderColor = 'var(--ast-border)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
            >
              <Search size={15} style={{ color: 'var(--ast-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Paste video URL to sync..."
                value={urlBarValue}
                onChange={(e) => setUrlBarValue(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                onPaste={handleUrlPaste}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--ast-ivory)',
                  fontSize: '16px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  padding: '12px 0',
                }}
              />
              <button
                onClick={handleUrlSubmit}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--ast-gold)',
                  color: 'var(--ast-on-gold)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '12px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all var(--dur-fast) ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--ast-gold-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--ast-gold)'
                }}
              >
                Load
              </button>
            </div>
          </div>

          {/* Watching info */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--ast-muted)',
              fontFamily: 'var(--font-body)',
            }}>
              Watching with{' '}
              <span style={{ color: 'var(--ast-gold)' }}>
                {partnerPresence ? partnerPresence.username : 'yourself'}
              </span>
            </p>
          </div>

          {/* Action buttons — desktop only */}
          <div className="hidden md:flex" style={{ gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 28px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--ast-border)',
                background: 'var(--ast-surface)',
                color: 'var(--ast-silver)',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                fontSize: '12px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all var(--dur-base) ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ast-elevated)'
                e.currentTarget.style.color = 'var(--ast-ivory)'
                e.currentTarget.style.borderColor = 'var(--ast-border-gold)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--ast-surface)'
                e.currentTarget.style.color = 'var(--ast-silver)'
                e.currentTarget.style.borderColor = 'var(--ast-border)'
              }}
            >
              <LibraryIcon size={16} />
              Gallery
            </button>

            <button
              onClick={() => setShowUpload(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 28px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--ast-gold)',
                color: 'var(--ast-on-gold)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '12px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all var(--dur-base) ease',
                boxShadow: '0 4px 20px rgba(201,169,110,0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ast-gold-light)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--ast-gold)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <Upload size={16} />
              Upload
            </button>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════════════
          MOBILE BOTTOM BAR
          ════════════════════════════════════════════ */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          zIndex: 40,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 24px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
          background: 'rgba(5, 5, 5, 0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--ast-border-subtle)',
        }}
      >
        <MobileNavButton
          icon={<LibraryIcon size={20} />}
          label="Gallery"
          onClick={() => setSidebarOpen(true)}
        />
        <MobileNavButton
          icon={<Play size={20} />}
          label="Sync"
          active
        />
        <MobileNavButton
          icon={<Upload size={20} />}
          label="Upload"
          onClick={() => setShowUpload(true)}
        />
      </nav>

      {/* ════════════════════════════════════════════
          SIDEBAR DRAWER
          ════════════════════════════════════════════ */}
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

      {/* Upload Modal */}
      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}

/* ── Mobile Nav Button ─────────────────────────────── */
function MobileNavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '6px 16px',
        background: 'none',
        border: 'none',
        color: active ? 'var(--ast-gold)' : 'var(--ast-muted)',
        cursor: 'pointer',
        transition: 'color var(--dur-fast) ease',
      }}
    >
      {icon}
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </button>
  )
}

/* ── Sidebar / Library Drawer ──────────────────────── */
function SidebarDrawer({ isOpen, onClose, library, activeUrl, onSelectUrl, onUpload, onDelete, onRename }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 350ms var(--ease-smooth)',
          zIndex: 55,
        }}
      />

      {/* Drawer */}
      <aside
        className="ast-drawer"
        style={{
          transform: `translateX(${isOpen ? '0' : '100%'})`,
        }}
      >
        {/* Header */}
        <div style={{
          padding: 'calc(16px + env(safe-area-inset-top)) 24px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--ast-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Film size={16} style={{ color: 'var(--ast-gold)' }} />
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--ast-ivory)',
            }}>
              Library
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: 'none',
              color: 'var(--ast-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--dur-fast) ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ast-elevated)'
              e.currentTarget.style.color = 'var(--ast-ivory)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--ast-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <Library
            videos={library}
            activeUrl={activeUrl}
            onSelect={onSelectUrl}
            onDelete={onDelete}
            onRename={onRename}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--ast-border)',
        }}>
          <button
            onClick={onUpload}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--ast-gold)',
              color: 'var(--ast-on-gold)',
              fontWeight: 600,
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all var(--dur-base) ease',
              boxShadow: '0 4px 20px rgba(201, 169, 110, 0.12)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ast-gold-light)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--ast-gold)'
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
