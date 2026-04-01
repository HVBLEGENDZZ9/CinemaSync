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

  const canClose = !uploading

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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="ast-scale-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '32px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--ast-base)',
          border: '1px solid var(--ast-border)',
          boxShadow: '0 40px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 500,
              color: 'var(--ast-ivory)',
              letterSpacing: '-0.01em',
            }}>
              Upload Video
            </h3>
            <p style={{
              fontSize: '11px',
              color: 'var(--ast-muted)',
              marginTop: '4px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}>
              Add to your library
            </p>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
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
          )}
        </div>

        {/* Drop zone */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            cursor: uploading ? 'default' : 'pointer',
            border: isDragOver
              ? '1px dashed var(--ast-gold)'
              : '1px dashed rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md)',
            background: isDragOver
              ? 'var(--ast-gold-dim)'
              : 'var(--ast-surface)',
            transition: 'all var(--dur-base) var(--ease-smooth)',
            minHeight: '200px',
            padding: '32px 24px',
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
            style={{ display: 'none' }}
          />

          {!uploading && !file && (
            <>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--ast-gold-dim)',
                border: '1px solid rgba(201, 169, 110, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Upload size={24} strokeWidth={1.5} style={{ color: 'var(--ast-gold)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--ast-ivory)',
                  marginBottom: '6px',
                }}>
                  Drop video file here
                </p>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--ast-muted)',
                  letterSpacing: '0.02em',
                }}>
                  or click to browse files
                </p>
              </div>
            </>
          )}

          {uploading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              width: '100%',
              padding: '0 16px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid rgba(201,169,110,0.12)',
                borderTopColor: 'var(--ast-gold)',
                animation: 'spin 700ms linear infinite',
              }} />
              <span style={{
                fontSize: '13px',
                color: 'var(--ast-silver)',
                fontWeight: 500,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {file?.name}
              </span>
              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '3px',
                borderRadius: '99px',
                background: 'var(--ast-elevated)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: '99px',
                  background: 'linear-gradient(90deg, var(--ast-gold-dark), var(--ast-gold))',
                  transition: 'width 200ms linear',
                }} />
              </div>
              <span style={{
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--ast-gold)',
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
            color: 'var(--ast-crimson)',
            textAlign: 'center',
            fontWeight: 500,
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
