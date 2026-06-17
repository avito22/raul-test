// Service worker: "red primero" para que siempre cargue la última versión
// cuando hay conexión, y use la caché solo como respaldo sin internet.
const CACHE = 'poker-v3'
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
  if (new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return res
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match(BASE + 'index.html')),
      ),
  )
})
