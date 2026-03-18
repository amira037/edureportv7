// ── 수업 리포트 메이커 Service Worker ──
// 버전을 바꾸면 설치된 앱도 자동 업데이트됩니다
var CACHE_NAME = 'rpt-v2';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.allSettled(
        ASSETS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('캐시 실패:', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) {
            console.log('이전 캐시 삭제:', k);
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

// 요청 처리: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', function(e) {
  // POST 요청은 캐시하지 않음
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // 백그라운드에서 최신 버전 업데이트
        fetch(e.request).then(function(res) {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, res);
            });
          }
        }).catch(function() {});
        return cached;
      }
      // 캐시에 없으면 네트워크 요청
      return fetch(e.request).then(function(res) {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return res;
      }).catch(function() {
        // 오프라인이면 메인 페이지 반환
        return caches.match('./index.html');
      });
    })
  );
});
