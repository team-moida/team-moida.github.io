importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBYykNZVf20LLQ-YIIeA2TKz9DSBsypRZM",
    authDomain: "moida-otpfc.firebaseapp.com",
    projectId: "moida-otpfc",
    storageBucket: "moida-otpfc.firebasestorage.app",
    messagingSenderId: "407991675090",
    appId: "1:407991675090:web:df9f7d8a7c93a6eb5ae50b"
});

const messaging = firebase.messaging();

// 앱이 백그라운드일 때 푸시 수신
messaging.onBackgroundMessage((payload) => {
    const title = payload.data?.title || '모이다';
    const body  = payload.data?.body  || '';
    self.registration.showNotification(title, {
        body,
        icon:  '/moida/icon.png',
        badge: '/moida/icon.png',
        data:  { url: 'https://nakdo0415-crypto.github.io/moida/' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: 'moida',
        renotify: true,
    });
});

// 알림 클릭 시 앱으로 이동
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || 'https://nakdo0415-crypto.github.io/moida/';
    event.waitUntil(clients.openWindow(url));
});

// ── 기존 캐시 로직 ──────────────────────────────────────
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

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(CACHE_URLS).catch(err => console.warn('캐시 일부 실패 (정상):', err))
        )
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = event.request.url;
    if (
        url.includes('firestore.googleapis.com') ||
        url.includes('firebase') ||
        url.includes('cdn.tailwindcss') ||
        url.includes('cdnjs.cloudflare') ||
        url.includes('unpkg.com') ||
        url.includes('gstatic.com')
    ) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
