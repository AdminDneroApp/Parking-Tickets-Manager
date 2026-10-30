'use client'

import { useEffect, useSyncExternalStore } from 'react'

function subscribeOnlineStatus(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOfflineSnapshot() {
  return !navigator.onLine
}

function getServerOfflineSnapshot() {
  return false
}

/** Reactive online/offline state using the browser's network events. */
export function useIsOffline(): boolean {
  return useSyncExternalStore(subscribeOnlineStatus, getOfflineSnapshot, getServerOfflineSnapshot)
}

/** Registers the app-shell service worker (/sw.js) after mount. */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => {
        // Ignore registration errors in unsupported or restricted environments
      })
  }, [])
}
