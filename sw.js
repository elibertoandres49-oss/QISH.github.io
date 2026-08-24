/* QISH PWA Service Worker */
const CACHE = "qish-static-v16";
const PRECACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./common.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./avatar.jpg",
  "./about.html",
  "./chat.html",
  "./album.html",
  "./auth.html",
  "./profile.html",
  "./projects.html",
  "./userlist.html",
  "./anime.html",
  "./rhythm4k.html",
  "./announce.html",
  "./timeline.html",
  "./character.html",
  "./char-25d.png",
  "./char-eye.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // 不缓存 Supabase / 跨域 API，避免登录态异常
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("jsdelivr") ||
    url.pathname.includes("/storage/")
  ) {
    return;
  }

  // 同站静态资源：网络优先，失败用缓存
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && (url.pathname.endsWith(".html") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".png") || url.pathname.endsWith(".jpg"))) {
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
  }
});
