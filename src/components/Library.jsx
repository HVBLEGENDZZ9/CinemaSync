import { useState, useRef, useEffect } from 'react'
import { Play, Film, Trash2, Pencil, Check, X, HardDrive } from 'lucide-react'

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function VideoThumbnail({ url, isActive }) {
  const [thumbSrc, setThumbSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!url) return
    setFailed(false)
    setThumbSrc(null)

    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.preload = 'metadata'
    video.src = url

    const timeout = setTimeout(() => {
      setFailed(true)
      video.removeAttribute('src')
      video.load()
    }, 8000)

    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(1, video.duration * 0.1)
    })

    video.addEventListener('seeked', () => {
      clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 160
        canvas.height = 90
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        setThumbSrc(canvas.toDataURL('image/jpeg', 0.7))
      } catch {
        setFailed(true)
      }
      video.removeAttribute('src')
      video.load()
    })

    video.addEventListener('error', () => {
      clearTimeout(timeout)
      setFailed(true)
    })

    return () => {
      clearTimeout(timeout)
      video.removeAttribute('src')
      video.load()
    }
  }, [url])

  if (thumbSrc) {
    return (
      <img
        src={thumbSrc}
        alt="Video thumbnail"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 'var(--radius-sm)',
        }}
      />
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-sm)',
      background: isActive
        ? 'linear-gradient(135deg, var(--ast-gold-dark) 0%, var(--ast-gold) 100%)'
        : 'var(--ast-elevated)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: isActive ? 'none' : '1px solid var(--ast-border-subtle)',
    }}>
      <Play
        size={14}
        fill={isActive ? 'var(--ast-on-gold)' : 'var(--ast-muted)'}
        color={isActive ? 'var(--ast-on-gold)' : 'var(--ast-muted)'}
      />
    </div>
  )
}

function StorageBar({ videos, maxStorageBytes }) {
  const usedBytes = videos.reduce((sum, v) => sum + (v.file_size_bytes || 0), 0)
  const pct = maxStorageBytes > 0 ? Math.min((usedBytes / maxStorageBytes) * 100, 100) : 0
  const isWarning = pct > 80
  const isCritical = pct > 95

  return (
    <div className="lib-storage-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <HardDrive size={13} style={{ color: 'var(--ast-muted)', flexShrink: 0 }} />
        <span style={{
          fontSize: '11px',
          color: 'var(--ast-silver)',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Storage
        </span>
        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: isCritical ? 'var(--ast-crimson)' : isWarning ? 'var(--ast-amber)' : 'var(--ast-muted)',
          marginLeft: 'auto',
        }}>
          {formatFileSize(usedBytes)} / {formatFileSize(maxStorageBytes)}
        </span>
      </div>
      <div style={{
        height: '3px',
        borderRadius: '99px',
        background: 'var(--ast-elevated)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: '99px',
          background: isCritical
            ? 'var(--ast-crimson)'
            : isWarning
              ? 'linear-gradient(90deg, var(--ast-amber), var(--ast-crimson))'
              : 'linear-gradient(90deg, var(--ast-gold-dark), var(--ast-gold))',
          transition: 'width 400ms var(--ease-luxury)',
        }} />
      </div>
      <span style={{
        fontSize: '10px',
        color: 'var(--ast-muted)',
        marginTop: '6px',
        display: 'block',
        fontFamily: 'var(--font-mono)',
      }}>
        {formatFileSize(maxStorageBytes - usedBytes)} remaining
      </span>
    </div>
  )
}

function VideoCard({ video, isActive, onSelect, onDelete, onRename }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(video.filename)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      const dotIdx = editName.lastIndexOf('.')
      inputRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : editName.length)
    }
  }, [isEditing])

  const handleRename = async () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== video.filename) {
      await onRename(video.id, trimmed)
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(video.id, video.file_url)
    } catch {
      setIsDeleting(false)
      setShowConfirmDelete(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setEditName(video.filename)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={`lib-video-card ${isActive ? 'lib-video-card--active' : ''} ${isDeleting ? 'lib-video-card--deleting' : ''}`}
    >
      <div
        className="lib-thumb"
        onClick={() => onSelect(video.file_url)}
        style={{ cursor: 'pointer' }}
      >
        <VideoThumbnail url={video.file_url} isActive={isActive} />
        {isActive && (
          <div className="lib-thumb-playing">
            <div className="lib-thumb-eq">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      <div className="lib-info">
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRename}
              className="lib-rename-input"
            />
            <button
              onClick={handleRename}
              className="lib-action-btn lib-action-btn--confirm"
              title="Save"
            >
              <Check size={12} />
            </button>
            <button
              onClick={() => { setEditName(video.filename); setIsEditing(false) }}
              className="lib-action-btn"
              title="Cancel"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span
            className="lib-filename"
            onClick={() => onSelect(video.file_url)}
            style={{ cursor: 'pointer' }}
          >
            {video.filename}
          </span>
        )}

        <div className="lib-meta">
          <span>{formatFileSize(video.file_size_bytes)}</span>
          {video.uploaded_at && (
            <>
              <span className="lib-meta-dot">&middot;</span>
              <span>{formatDateShort(video.uploaded_at)}</span>
            </>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="lib-actions">
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
            className="lib-action-btn"
            title="Rename"
          >
            <Pencil size={12} />
          </button>

          {showConfirmDelete ? (
            <div className="lib-delete-confirm" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleDelete}
                className="lib-action-btn lib-action-btn--danger"
                title="Confirm delete"
                disabled={isDeleting}
              >
                {isDeleting ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: '1.5px' }} /> : <Check size={12} />}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="lib-action-btn"
                title="Cancel"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(true) }}
              className="lib-action-btn lib-action-btn--danger-ghost"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Library({ videos, activeUrl, onSelect, onDelete, onRename, maxStorageBytes = 10 * 1024 * 1024 * 1024 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <StorageBar videos={videos} maxStorageBytes={maxStorageBytes} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '11px',
          color: 'var(--ast-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {videos.length} video{videos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {videos.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          gap: '16px',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--ast-gold-dim)',
            border: '1px solid var(--ast-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Film size={22} style={{ color: 'var(--ast-muted)' }} />
          </div>
          <p style={{
            fontSize: '13px',
            color: 'var(--ast-silver)',
            textAlign: 'center',
            fontWeight: 400,
          }}>
            No videos uploaded yet
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isActive={video.file_url === activeUrl}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  )
}
