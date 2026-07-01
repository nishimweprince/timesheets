import * as React from 'react'
import { CameraIcon, RefreshCwIcon } from 'lucide-react'
import Modal from './Modal'
import { Button } from '@/components/ui/button'
import { uploadMediaAsset } from '@/lib/api/media.api'
import { showApiErrorToast } from '@/lib/api/errors'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (mediaAssetId: string) => void
  heading?: string
}

type Phase = 'streaming' | 'preview' | 'uploading'

export function CameraModal({ isOpen, onClose, onCapture, heading = 'Take a photo' }: CameraModalProps) {
  if (!isOpen) return null

  return (
    <CameraModalContent
      onClose={onClose}
      onCapture={onCapture}
      heading={heading}
    />
  )
}

function CameraModalContent({ onClose, onCapture, heading }: Omit<CameraModalProps, 'isOpen'>) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [phase, setPhase] = React.useState<Phase>('streaming')
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = React.useState<Blob | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const stopStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startStream = React.useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setPhase('streaming')
    } catch {
      setError('Camera access denied. Please allow camera permission and try again.')
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setPhase('streaming')
      })
      .catch(() => {
        if (!cancelled) {
          setError('Camera access denied. Please allow camera permission and try again.')
        }
      })

    return () => {
      cancelled = true
      stopStream()
    }
  }, [stopStream])

  React.useEffect(() => {
    if (!previewUrl) return

    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      stopStream()
      const url = URL.createObjectURL(blob)
      setCapturedBlob(blob)
      setPreviewUrl(url)
      setPhase('preview')
    }, 'image/jpeg', 0.9)
  }

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setCapturedBlob(null)
    startStream()
  }

  const handleConfirm = async () => {
    if (!capturedBlob) return
    setPhase('uploading')
    try {
      const mediaAssetId = await uploadMediaAsset(capturedBlob, `clock-evidence-${Date.now()}.jpg`)
      onCapture(mediaAssetId)
    } catch (err) {
      showApiErrorToast(err)
      setPhase('preview')
    }
  }

  const handleClose = () => {
    stopStream()
    onClose()
  }

  return (
    <Modal
      isOpen
      onClose={handleClose}
      heading={heading}
      description="Position yourself in frame and take a photo to continue."
      className="sm:min-w-0 sm:max-w-md"
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p className="text-[13px] leading-5 text-destructive">{error}</p>
        )}

        <div className="relative overflow-hidden rounded-none bg-muted aspect-video w-full">
          {phase === 'streaming' && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
          {(phase === 'preview' || phase === 'uploading') && previewUrl && (
            <img
              src={previewUrl}
              alt="Captured photo"
              className="h-full w-full object-cover"
            />
          )}
          {phase === 'uploading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-[13px] text-muted-foreground">
              Uploading…
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-none text-[13px]"
            onClick={handleClose}
            disabled={phase === 'uploading'}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {phase === 'preview' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-none text-[13px]"
                onClick={handleRetake}
              >
                <RefreshCwIcon className="size-3.5" />
                Retake
              </Button>
            )}

            {phase === 'streaming' && (
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-none text-[13px]"
                onClick={handleCapture}
                disabled={!!error}
              >
                <CameraIcon className="size-3.5" />
                Capture
              </Button>
            )}

            {(phase === 'preview' || phase === 'uploading') && (
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-none text-[13px]"
                onClick={handleConfirm}
                disabled={phase === 'uploading'}
              >
                {phase === 'uploading' ? 'Uploading…' : 'Confirm'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
