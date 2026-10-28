'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ImageUp, Loader2, X } from 'lucide-react'
import { Button } from '@/shared/ui/Button'

/**
 * How "Tomar foto" works on this device:
 * - 'native': touch devices — `<input capture>` opens the phone camera app.
 * - 'webcam': desktop with a camera — live preview through getUserMedia.
 * - 'none':   no camera detected — the button is hidden.
 */
export type CameraMode = 'native' | 'webcam' | 'none'

/** Null until detected after mount (the page is prerendered). */
export function useCameraMode() {
  const [mode, setMode] = useState<CameraMode | null>(null)

  useEffect(() => {
    const media = navigator.mediaDevices
    /* eslint-disable react-hooks/set-state-in-effect -- matchMedia and mediaDevices exist only after mount */
    if (matchMedia('(pointer: coarse)').matches) return setMode('native')
    // No mediaDevices: old browser or insecure context (plain http on a LAN IP)
    if (!media?.enumerateDevices) return setMode('none')
    /* eslint-enable react-hooks/set-state-in-effect */

    // Device kinds are listed even before camera permission is granted
    let cancelled = false
    const detect = () =>
      media
        .enumerateDevices()
        .then((devices) => {
          if (!cancelled) setMode(devices.some((d) => d.kind === 'videoinput') ? 'webcam' : 'none')
        })
        .catch(() => !cancelled && setMode('none'))
    detect()
    // Webcam plugged in or removed while the form is open
    media.addEventListener('devicechange', detect)
    return () => {
      cancelled = true
      media.removeEventListener('devicechange', detect)
    }
  }, [])

  const markMissing = useCallback(() => setMode('none'), [])
  return { mode, markMissing }
}

type Status = 'starting' | 'ready' | 'denied' | 'missing'

interface WebcamDialogProps {
  onCapture: (file: File) => void
  onClose: () => void
  /** The camera was listed but couldn't be opened — hide the button from now on. */
  onMissing: () => void
  /** Fallback to the file picker (needs this click as the user gesture). */
  onUpload: () => void
}

/** Modal webcam preview. Mount it only while open: unmounting stops the stream. */
export function WebcamDialog({ onCapture, onClose, onMissing, onUpload }: WebcamDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('starting')

  useEffect(() => {
    dialogRef.current?.showModal()
    let stream: MediaStream | null = null
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        setStatus('ready')
      })
      .catch((err: DOMException) => {
        if (cancelled) return
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          setStatus('denied')
        } else {
          setStatus('missing')
          onMissing()
        }
      })

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onMissing])

  function capture() {
    const video = videoRef.current
    if (!video?.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => blob && onCapture(new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' })),
      'image/jpeg',
      0.92,
    )
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-border bg-background p-0 text-foreground backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Tomar foto del ticket</h2>
        <Button type="button" variant="ghost" size="icon" title="Cerrar" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 p-4">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
          {status === 'starting' && <Loader2 className="absolute h-6 w-6 animate-spin text-muted-foreground" />}
          {(status === 'denied' || status === 'missing') && (
            <p className="absolute px-6 text-center text-sm text-muted-foreground">
              {status === 'denied'
                ? 'No se permitió el acceso a la cámara. Habilítalo en el navegador o sube una imagen.'
                : 'No se encontró una cámara disponible. Sube una imagen en su lugar.'}
            </p>
          )}
        </div>

        {status === 'denied' || status === 'missing' ? (
          <Button
            type="button"
            onClick={() => {
              // The page behind a modal dialog is inert — close it before opening the picker
              dialogRef.current?.close()
              onUpload()
            }}
            className="h-11 w-full rounded-xl"
          >
            <ImageUp className="h-4 w-4" />
            Subir imagen
          </Button>
        ) : (
          <Button type="button" onClick={capture} disabled={status !== 'ready'} className="h-11 w-full rounded-xl">
            <Camera className="h-4 w-4" />
            Capturar
          </Button>
        )}
      </div>
    </dialog>
  )
}
