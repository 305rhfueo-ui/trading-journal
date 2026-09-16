// 설치형 앱으로 쓰기 위한 최소 서비스워커.
// 네트워크 우선 — 항상 최신 페이지를 받고, 오프라인일 때만 캐시로 떨어진다.
const CACHE = "tape-v1";

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.add("./"))); self.skipWaiting(); });
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  if(new URL(e.request.url).origin !== location.origin) return;   // GitHub API 는 건드리지 않는다
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./")))
  );
});
