import { Play, Film } from 'lucide-react'

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

export default function Library({ videos, activeUrl, onSelect }) {
  if (videos.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Film size={22} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}>
          No videos uploaded yet
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {videos.map((video) => {
        const isActive = video.file_url === activeUrl
        return (
          <button
            key={video.id}
            onClick={() => onSelect(video.file_url)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderRadius: '8px',
              padding: '10px 12px',
              textAlign: 'left',
              width: '100%',
              backgroundColor: isActive ? 'var(--accent-dim)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {/* Thumbnail placeholder */}
            <div style={{
              width: '48px',
              height: '36px',
              borderRadius: '4px',
              background: isActive
                ? 'var(--gradient-pink-blue)'
                : 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: isActive ? 'none' : '1px solid var(--border)',
            }}>
              <Play
                size={12}
                fill={isActive ? '#fff' : 'var(--text-tertiary)'}
                color={isActive ? '#fff' : 'var(--text-tertiary)'}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span style={{
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {video.filename}
              </span>
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
              }}>
                {formatFileSize(video.file_size_bytes)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
