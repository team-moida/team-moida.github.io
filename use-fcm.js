function useFCM({ memberData, showToast }) {
    const { useState, useEffect } = React;

    const [announcements, setAnnouncements] = useState([]);
    useEffect(() => {
        const unsub = getCol('notifications').orderBy('sentAt', 'desc').limit(20).onSnapshot(snap => {
            const list = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            // 테스트(type:'test')·푸시전용(pushOnly, 예: 회비 신고 알림)은 공지 목록에 표시하지 않음
            setAnnouncements(list.filter(a => a.type !== 'test' && !a.pushOnly));
        }, () => {});
        return () => unsub();
    }, []);


    const VAPID_KEY = 'BMuOxkIP0Xm912P0lVDUP8KUFR2y2FD-Acxgal5lNYemqWaldDon6kr9c_KrLEqKRFuumPCenIYnwEn0z_1WuXU';

    const [notifPermission, setNotifPermission] = useState(() =>
        ('Notification' in window) ? Notification.permission : 'unsupported'
    );

    const registerFcmToken = async () => {
        try {
            if (!('Notification' in window)) return;
            const permission = await Notification.requestPermission();
            setNotifPermission(permission);
            if (permission !== 'granted') return;
            const swReg = await navigator.serviceWorker.ready;
            const messaging = firebase.messaging();
            const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
            if (token && memberData?.memberId) {
                await getCol('fcm_tokens').doc(memberData.memberId).set({
                    token,
                    name: memberData.name || '',
                    kakaoId: memberData.kakaoId || '',
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
                showToast('알림이 등록됐어요!', 'success');
            }
        } catch(e) { console.warn('FCM 토큰 등록 실패:', e); }
    };

    useEffect(() => {
        if (!memberData?.memberId || !('Notification' in window) || Notification.permission !== 'granted') return;
        (async () => {
            try {
                const swReg = await navigator.serviceWorker.ready;
                const messaging = firebase.messaging();
                const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
                if (token) {
                    await getCol('fcm_tokens').doc(memberData.memberId).set({
                        token, name: memberData.name || '', kakaoId: memberData.kakaoId || '', updatedAt: new Date().toISOString(),
                    }, { merge: true });
                }
            } catch(e) { console.warn('FCM 토큰 갱신 실패:', e); }
        })();
    }, [memberData?.memberId]);

    useEffect(() => {
        if (!('Notification' in window) || notifPermission !== 'granted') return;
        let unsub = null;
        navigator.serviceWorker.ready.then(swReg => {
            try {
                const messaging = firebase.messaging();
                unsub = messaging.onMessage(payload => {
                    const title = payload.data?.title || '모이다';
                    const body  = payload.data?.body  || '';
                    swReg.showNotification(title, {
                        body,
                        icon:  '/icon.png',
                        badge: '/icon.png',
                        data:  { url: 'https://team-moida.github.io/member.html' },
                    });
                });
            } catch(e) { console.warn('FCM onMessage 설정 실패:', e); }
        });
        return () => { if (unsub) unsub(); };
    }, [notifPermission]);

    // TWA nativeToken: URL 파라미터 캡처 + Firestore 저장 통합
    // - memberId 없을 때(로그아웃): URL만 캡처해 localStorage에 보관
    // - memberId 생길 때(로그인/이미 로그인): URL 캡처 후 바로 Firestore 저장
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const nt = params.get('nativeToken');
        if (nt) {
            localStorage.setItem('pendingNativeToken', nt);
            params.delete('nativeToken');
            const newSearch = params.toString();
            const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
            window.history.replaceState(null, '', newUrl);
        }
        if (!memberData?.memberId) return;
        const pendingNativeToken = localStorage.getItem('pendingNativeToken');
        if (!pendingNativeToken) return;
        (async () => {
            try {
                await getCol('fcm_tokens').doc(memberData.memberId).set(
                    { nativeToken: pendingNativeToken, nativeTokenUpdatedAt: new Date().toISOString() },
                    { merge: true }
                );
                localStorage.removeItem('pendingNativeToken');
            } catch(e) { console.warn('네이티브 FCM 토큰 저장 실패:', e); }
        })();
    }, [memberData?.memberId]);

    return { notifPermission, registerFcmToken, announcements };
}
