'use client'

import { useEffect, useState } from 'react'
import { Download, PlusSquare, Share, X } from 'lucide-react'
import { Button } from '@/shared/ui/Button'

const DISMISSED_STORAGE_KEY = 'parking.pwa.dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type InstallMode = 'android' | 'ios' | null

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isIosTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  // Exclude non-Safari/WebKit wrappers that cannot add to home screen on older iOS, though iOS 16.4+ allows Share -> Add to Home Screen in major browsers
  return isIOS && window.matchMedia('(pointer: coarse)').matches
}

/**
 * Dismissible mobile banner that helps collaborators install the PWA on their phone:
 * - Android/Chromium: native `beforeinstallprompt` button.
 * - iOS: concise "Share -> Add to Home Screen" instructions.
 * Hidden automatically once installed, on desktop without mobile prompt, or after dismissal.
 */
export function InstallPrompt() {
  const [mode, setMode] = useState<InstallMode>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandaloneMode()) return
    if (localStorage.getItem(DISMISSED_STORAGE_KEY) === '1') return

    /* eslint-disable react-hooks/set-state-in-effect -- browser UA and matchMedia are only available after mount */
    if (isIosTouchDevice()) {
      setMode('ios')
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    function handleBeforeInstallPrompt(e: Event) {
      // Only show custom install banner on touch/mobile devices
      if (!window.matchMedia('(pointer: coarse)').matches) return
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setMode('android')
    }

    function handleAppInstalled() {
      setDeferredPrompt(null)
      setMode(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_STORAGE_KEY, '1')
    setMode(null)
    setDeferredPrompt(null)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setMode(null)
      setDeferredPrompt(null)
    }
  }

  if (!mode) return null

  return (
    <div
      role="region"
      aria-label="Instalar aplicación"
      className="relative rounded-2xl border border-primary/25 bg-primary/5 p-3.5 pr-9 text-left text-xs text-muted-foreground"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso de instalación"
        className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {mode === 'android' ? (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">Instala Parqueo DNERO</p>
            <p className="mt-0.5 leading-relaxed">
              Agrega la app a tu pantalla de inicio para abrir el formulario al instante.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void install()}
            className="h-8 shrink-0 self-start rounded-lg px-3 text-xs font-semibold sm:self-center"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar app
          </Button>
        </div>
      ) : (
        <div>
          <p className="font-semibold text-foreground">Instala Parqueo DNERO en tu iPhone</p>
          <p className="mt-1 leading-relaxed">
            Toca el botón Compartir{' '}
            <Share className="inline h-3.5 w-3.5 -translate-y-0.5 text-primary" aria-hidden /> y luego{' '}
            <span className="font-medium text-foreground">«Agregar a pantalla de inicio»</span>{' '}
            <PlusSquare className="inline h-3.5 w-3.5 -translate-y-0.5 text-primary" aria-hidden />.
          </p>
        </div>
      )}
    </div>
  )
}
