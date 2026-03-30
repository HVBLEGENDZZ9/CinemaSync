import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function UploadModal({ isOpen, onClose }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const overlayRef = useRef(null)

  // Prevent closing during upload
  const canClose = !uploading

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e) {
      if (e.key === 'Escape' && canClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, canClose, onClose])

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current && canClose) {
        onClose()
      }
    },
    [canClose, onClose]
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const startUpload = useCallback(
    async (uploadFile) => {
      setUploading(true)
      setProgress(0)
      setError(null)

      try {
        // Step 1: Get presigned upload URL from edge function
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-upload-url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              filename: uploadFile.name,
              contentType: uploadFile.type,
              fileSizeBytes: uploadFile.size,
            }),
          }
        )

        if (!response.ok) {
          throw new Error('Failed to get upload URL')
        }

        const { uploadUrl, publicUrl } = await response.json()

        // Step 2: Upload to R2 via XHR for progress tracking
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100))
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', () => reject(new Error('Upload failed')))

          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', uploadFile.type)
          xhr.send(uploadFile)
        })

        // Step 3: Record in video_library table
        const { error: insertError } = await supabase
          .from('video_library')
          .insert({
            filename: uploadFile.name,
            file_url: publicUrl,
            file_size_bytes: uploadFile.size,
          })

        if (insertError) {
          throw insertError
        }

        // Auto-close on success
        setProgress(100)
        setTimeout(() => {
          setFile(null)
          setProgress(0)
          setUploading(false)
          onClose()
        }, 500)
      } catch (uploadErr) {
        setError(uploadErr.message || 'Upload failed')
        setUploading(false)
      }
    },
    [onClose]
  )

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile)
      startUpload(droppedFile)
    } else {
      setError('Please drop a video file')
    }
  }, [startUpload])

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      startUpload(selectedFile)
    }
  }, [startUpload])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(8, 10, 15, 0.85)' }}
    >
      <div
        className="relative flex flex-col gap-5 page-enter"
        style={{
          width: '480px',
          minHeight: '300px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        {/* Close button */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close"
          >
            <X
              size={16}
              style={{ transition: 'color 150ms ease-out' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)'
              }}
            />
          </button>
        )}

        {/* Drop zone */}
        <div
          className="flex-1 flex flex-col items-center justify-center gap-3 rounded-[8px] cursor-pointer"
          style={{
            border: isDragOver
              ? '1px dashed var(--accent)'
              : '1px dashed var(--border)',
            backgroundColor: isDragOver
              ? 'var(--accent-dim)'
              : 'transparent',
            transition:
              'border-color 150ms ease-out, background-color 150ms ease-out',
            minHeight: '200px',
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!uploading && !file && (
            <>
              <Upload
                size={24}
                strokeWidth={1.5}
                style={{ color: 'var(--text-tertiary)' }}
              />
              <span
                className="text-[13px] leading-[1.6]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Drop video file here
              </span>
              <span
                className="text-[12px] leading-[1.6]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                or click to browse
              </span>
            </>
          )}

          {uploading && (
            <div className="flex flex-col items-center gap-3 w-full px-8">
              <span
                className="text-[13px] leading-[1.2] truncate max-w-full"
                style={{ color: 'var(--text-secondary)' }}
              >
                {file?.name}
              </span>
              <div className="progress-track w-full">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span
                className="text-[12px] leading-[1.2]"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: 'var(--text-secondary)',
                }}
              >
                {progress}%
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            className="text-[13px] leading-[1.6]"
            style={{ color: 'var(--danger)' }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
