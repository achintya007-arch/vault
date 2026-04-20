'use client'

import { useEffect } from 'react'

/**
 * Registers /sw.js once the page has loaded.
 * Must be a client component — navigator is not available server-side.
 * Rendered inside the root layout so it runs on every page.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[SW] Registered, scope:', registration.scope)
          }
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err)
        })
    })
  }, [])

  return null
}
