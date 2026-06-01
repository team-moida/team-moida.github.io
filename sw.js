const CACHE_NAME = 'moida-v1';

const CACHE_URLS = [
  '/moida/index.html',
  '/moida/attendance.html',
  '/moida/roster.html',
  '/moida/team-maker.html',
  '/moida/match.html',
  '/moida/member.html',
  '/moida/icon.png',
  '/moida/manifest.json',
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn('캐시 일부 실패 (정상):', err);
      });
    })
  );
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 네트워크 요청 처리: 네트워크 우선, 실패 시 캐시 사용
self.addEventListener('fetch', event => {
  // Firebase, CDN 요청은 캐시하지 않음
  const url = event.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('cdn.tailwindcss') ||
    url.includes('cdnjs.cloudflare') ||
    url.includes('unpkg.com') ||
    url.includes('gstatic.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공 응답은 캐시에도 저장
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 오프라인일 때 캐시에서 가져옴
        return caches.match(event.request);
      })
  );
});
