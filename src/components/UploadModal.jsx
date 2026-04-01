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

        if (!token) {
          throw new Error('Not logged in — please sign in before uploading')
        }

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
          const errBody = await response.text()
          console.error('get-upload-url error:', response.status, errBody)
          throw new Error(`Failed to get upload URL (${response.status})`)
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
            user_id: session.user.id,
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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative flex flex-col gap-5 anim-fade-up w-full"
        style={{
          maxWidth: '440px',
          minHeight: '280px',
          backgroundColor: '#201f1f',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(68, 71, 72, 0.15)',
          boxShadow: '0 40px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            color: '#e5e2e1',
            letterSpacing: '-0.02em',
          }}>
            Upload Video
          </h3>
          {canClose && (
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#7e7d7d',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer"
          style={{
            border: isDragOver
              ? '1px dashed #e9c349'
              : '1px dashed rgba(68, 71, 72, 0.3)',
            borderRadius: '10px',
            backgroundColor: isDragOver
              ? 'rgba(233, 195, 73, 0.06)'
              : 'rgba(28, 27, 27, 0.5)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: '180px',
            padding: '24px',
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
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(233, 195, 73, 0.08)',
                border: '1px solid rgba(233, 195, 73, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Upload
                  size={22}
                  strokeWidth={1.5}
                  style={{ color: '#e9c349' }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#e5e2e1',
                  marginBottom: '4px',
                }}>
                  Drop video file here
                </p>
                <p style={{
                  fontSize: '12px',
                  color: '#7e7d7d',
                  letterSpacing: '0.02em',
                }}>
                  or click to browse
                </p>
              </div>
            </>
          )}

          {uploading && (
            <div className="flex flex-col items-center gap-4 w-full px-4">
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid rgba(233,195,73,0.15)',
                borderTopColor: '#e9c349',
                animation: 'spin 600ms linear infinite',
              }} />
              <span
                className="truncate max-w-full"
                style={{
                  fontSize: '13px',
                  color: '#c4c7c7',
                  fontWeight: 500,
                }}
              >
                {file?.name}
              </span>
              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '4px',
                borderRadius: '99px',
                background: '#1c1b1b',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: '99px',
                  background: 'linear-gradient(90deg, #e9c349, #ffdf9e)',
                  transition: 'width 200ms linear',
                }} />
              </div>
              <span style={{
                fontSize: '12px',
                fontFamily: "'DM Mono', monospace",
                color: '#e9c349',
                fontWeight: 500,
              }}>
                {progress}%
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p style={{
            fontSize: '13px',
            color: '#ff4e4e',
            textAlign: 'center',
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
