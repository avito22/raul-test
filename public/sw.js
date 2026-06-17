// Service worker básico: cachea la app para que funcione sin conexión.
const CACHE = 'poker-v1'
const BASE = '/raul-test/'
const ASSETS = [BASE, BASE + 'index.html', BASE + 'manifest.webmanifest', BASE + 'poker-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((res) => {
          // Guarda en caché las respuestas válidas del mismo origen
          if (res.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, copy))
          }
          return res
        })
        .catch(() => caches.match(BASE + 'index.html'))
    }),
  )
})
