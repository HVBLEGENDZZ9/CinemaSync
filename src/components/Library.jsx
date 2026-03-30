import { Play } from 'lucide-react'

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
      <div className="flex flex-col gap-2">
        <label
          className="text-[10px] uppercase tracking-[0.1em] leading-[1.2]"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: 'var(--text-secondary)',
          }}
        >
          Library
        </label>
        <p
          className="text-[13px] leading-[1.6]"
          style={{ color: 'var(--text-secondary)' }}
        >
          No videos yet
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        className="text-[10px] uppercase tracking-[0.1em] leading-[1.2]"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: 'var(--text-secondary)',
        }}
      >
        Library
      </label>
      <div
        className="flex flex-col gap-0.5 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 360px)' }}
      >
        {videos.map((video) => {
          const isActive = video.url === activeUrl
          return (
            <button
              key={video.id}
              onClick={() => onSelect(video.url)}
              className="group flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-left w-full"
              style={{
                backgroundColor: isActive
                  ? 'var(--accent-dim)'
                  : 'transparent',
                borderLeft: isActive
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                transition:
                  'background-color 150ms ease-out, border-color 150ms ease-out',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <Play
                size={14}
                className="shrink-0 opacity-0 group-hover:opacity-100"
                style={{
                  color: 'var(--text-secondary)',
                  transition: 'opacity 150ms ease-out',
                }}
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className="text-[13px] leading-[1.2] truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {video.filename}
                </span>
                <span
                  className="text-[11px] leading-[1.2]"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    color: 'var(--text-secondary)',
                  }}
                >
                  {formatFileSize(video.file_size)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
