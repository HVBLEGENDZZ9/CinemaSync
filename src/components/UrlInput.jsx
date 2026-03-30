import { useState, useCallback } from 'react'

function isValidUrl(str) {
  return /^https?:\/\/.+/i.test(str)
}

export default function UrlInput({ onSubmit }) {
  const [value, setValue] = useState('')

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && value.trim()) {
        onSubmit(value.trim())
        setValue('')
      }
    },
    [value, onSubmit]
  )

  const handlePaste = useCallback(
    (e) => {
      const pasted = e.clipboardData?.getData('text')?.trim()
      if (pasted && isValidUrl(pasted)) {
        e.preventDefault()
        onSubmit(pasted)
        setValue('')
      }
    },
    [onSubmit]
  )

  return (
    <div className="flex flex-col gap-2">
      <label
        className="text-[10px] uppercase tracking-[0.1em] leading-[1.2]"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: 'var(--text-secondary)',
        }}
      >
        YouTube
      </label>
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="Paste URL or type & press Enter"
        className="w-full rounded-[6px] px-3 py-2 text-[13px] leading-[1.2] outline-none"
        style={{
          backgroundColor: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          transition: 'border-color 150ms ease-out',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border)'
        }}
      />
    </div>
  )
}
