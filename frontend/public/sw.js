// Vault Service Worker — v2
// Strategy: cache-first for static assets, network-first for navigation + API calls.
// API origin is intentionally NOT hardcoded — cross-origin requests (to any external
// domain) are always handled network-first with no caching, so this works with any
// backend URL (localhost in dev, Railway in production).

const CACHE_VERSION = 'vault-v2'

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/transactions',
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

  // 1. Cross-origin requests (API on different domain) → pure network passthrough.
  //    Do NOT cache API responses; the app handles offline state itself.
  if (url.origin !== self.location.origin) {
    // Just let the browser handle it — no event.respondWith means default behavior.
    return
  }

  // 2. Navigation requests → network-first so deployments propagate cleanly
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
