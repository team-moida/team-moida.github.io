function useFCM({ memberData, showToast }) {
    const { useState, useEffect } = React;

    const [announcements, setAnnouncements] = useState([]);
    useEffect(() => {
        const unsub = getCol('notifications').orderBy('sentAt', 'desc').limit(20).onSnapshot(snap => {
            const list = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            // 알림 테스트용 문서(type:'test')는 공지 목록에 표시하지 않음
            setAnnouncements(list.filter(a => a.type !== 'test'));
        }, () => {});
        return () => unsub();
    }, []);

    // TWA 앱이 nativeToken URL 파라미터로 전달한 네이티브 FCM 토큰을 localStorage에 보관
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
                if (memberData.kakaoId) {
                    const existing = await getCol('fcm_tokens').where('kakaoId', '==', memberData.kakaoId).get();
                    const batch = db.batch();
                    existing.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
                await getCol('fcm_tokens').doc(memberData.memberId).set({
                    token,
                    name: memberData.name || '',
                    kakaoId: memberData.kakaoId || '',
                    updatedAt: new Date().toISOString(),
                });
                showToast('알림이 등록됐어요!', 'success');
            }
        } catch(e) { console.warn('FCM 토큰 등록 실패:', e); }
    };

    useEffect(() => {
        if (!memberData?.memberId || Notification.permission !== 'granted') return;
        (async () => {
            try {
                const swReg = await navigator.serviceWorker.ready;
                const messaging = firebase.messaging();
                const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
                if (token) {
                    if (memberData?.kakaoId) {
                        const existing = await getCol('fcm_tokens').where('kakaoId', '==', memberData.kakaoId).get();
                        const batch = db.batch();
                        existing.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                    await getCol('fcm_tokens').doc(memberData.memberId).set({
                        token, name: memberData.name || '', kakaoId: memberData.kakaoId || '', updatedAt: new Date().toISOString(),
                    });
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
                        icon:  '/moida/icon.png',
                        badge: '/moida/icon.png',
                        data:  { url: 'https://nakdo0415-crypto.github.io/moida/member.html' },
                    });
                });
            } catch(e) { console.warn('FCM onMessage 설정 실패:', e); }
        });
        return () => { if (unsub) unsub(); };
    }, [notifPermission]);

    // 로그인 완료 후 localStorage의 pendingNativeToken을 Firestore에 저장
    useEffect(() => {
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
