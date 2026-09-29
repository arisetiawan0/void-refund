// Service worker — prd.md §5.1:
// - App shell (manifest, ikon, font, halaman) boleh distale (stale-while-revalidate).
// - Endpoint API Supabase, Auth, dan Storage HARUS selalu network-only, tidak
//   boleh disajikan dari cache (mencegah submit data basi / HTML API ter-cache).
// - Tidak ada fallback offline untuk submit: kalau offline, request gagal dan
//   user melihat error — bukan data lama yang diam-diam "berhasil".

const CACHE = "void-refund-shell-v3"

// Shell minimum. Fetch cache:"no-store" supaya precache tidak terkena HTTP
// cache browser (pernah bikin manifest lama nyangkut di cache baru).
// Satu saja gagal, install tetap lanjut (catch) supaya SW tidak bolong
// selamanya karena satu asset hilang.
const SHELL = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/icon-180.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          SHELL.map((url) =>
            fetch(url, { cache: "no-store" })
              .then((res) => (res.ok ? cache.put(url, res) : undefined))
              .catch(() => {}),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
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
  // Baca & tulis selalu ke CACHE aktif — caches.match() (lintas cache)
  // bisa menyajikan salinan basi dari cache versi lama yang belum terhapus.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) =>
          cache.match(event.request).then((cached) => {
            const fresh = fetch(event.request)
              .then((res) => {
                if (res.ok) {
                  const copy = res.clone()
                  cache.put(event.request, copy).catch(() => {})
                }
                return res
              })
              .catch(() => cached ?? Response.error())
            return cached ?? fresh
          }),
        ),
    )
  }
})
