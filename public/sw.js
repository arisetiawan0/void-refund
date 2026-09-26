// Service worker — prd.md §5.1:
// - App shell (manifest, ikon, font, halaman) boleh distale (stale-while-revalidate).
// - Endpoint API Supabase, Auth, dan Storage HARUS selalu network-only, tidak
//   boleh disajikan dari cache (mencegah submit data basi / HTML API ter-cache).
// - Tidak ada fallback offline untuk submit: kalau offline, request gagal dan
//   user melihat error — bukan data lama yang diam-diam "berhasil".

const CACHE = "void-refund-shell-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/manifest.json"]).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Selalu lewat jaringan: API, auth, storage, devtools. Jangan intercept.
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api") ||
    url.hostname.includes("supabase") ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1"
  ) {
    return
  }

  // Navigasi halaman: network-first, fallback cache supaya PWA tetap terbuka offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match("/").then((r) => r ?? Response.error()))
    )
    return
  }

  // Aset statis sama-origin: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fresh = fetch(event.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {})
            }
            return res
          })
          .catch(() => cached ?? Response.error())
        return cached ?? fresh
      })
    )
  }
})
