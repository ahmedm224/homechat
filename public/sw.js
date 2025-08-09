const CACHE_NAME = 'homechat-v1'
const ASSETS = [
  '/',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // Network-first for API, cache-first for others
  if (req.url.includes('/api/')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    )
  } else {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    )
  }
})

