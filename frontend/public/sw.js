// Vault Service Worker — v1
// Strategy: cache-first for static assets, network-first for API calls.

const CACHE_VERSION = 'vault-v1'
const API_ORIGIN    = 'http://localhost:8000'

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/transactions',
  '/goals',
  '/manifest.json',
  '/icons/icon.svg',
]

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // Activate immediately
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))   // Remove old caches
        )
      )
      .then(() => self.clients.claim())          // Take control immediately
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. API calls → network-first (fall back to nothing; offline handled in app)
  if (url.origin === API_ORIGIN || url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // 2. Navigation requests → network-first so updates deploy cleanly
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // 3. Everything else (JS, CSS, fonts, images) → cache-first
  event.respondWith(cacheFirst(request))
})

// ── Strategies ────────────────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    // Cache successful GET responses for offline fallback
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? Response.error()
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return Response.error()
  }
}
