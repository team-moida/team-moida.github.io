const SVG_SUN = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const SVG_MOON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('moida_theme', isDark ? 'dark' : 'light');
    { const _tt = document.getElementById('theme-toggle'); if (_tt) _tt.innerHTML = isDark ? SVG_SUN : SVG_MOON; }
}
(function() {
    const isDark = document.documentElement.classList.contains('dark');
    { const _tt = document.getElementById('theme-toggle'); if (_tt) _tt.innerHTML = isDark ? SVG_SUN : SVG_MOON; }
})();

const KAKAO_JS_KEY = 'ce0f70554512198de18a346beb970a91';
if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);

const LS_KEY = 'moida_member_data';

function getKakaoRedirectUri() {
    return location.origin + location.pathname.replace(/index\.html$/, '');
}

let pendingKakaoId = '';
let pendingNickname = '';
let isKakaoLoading = false;

function getSaved() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch(e) { return null; }
}

function setKakaoLoginLoading(v) {
    isKakaoLoading = v;
    const btn = document.getElementById('kakao-login-btn');
    if (btn) {
        btn.disabled = v;
        btn.style.opacity = v ? '0.6' : '1';
        btn.innerHTML = v ? '연결 중...' :
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="black"><path d="M12 3C6.477 3 2 6.82 2 11.5c0 2.974 1.74 5.602 4.36 7.207L5.24 21 9.5 18.677c.827.162 1.674.246 2.5.246 5.523 0 10-3.82 10-8.5C22 6.82 17.523 3 12 3z"/></svg>카카오로 로그인';
    }
}

function resetKakaoStep() {
    pendingKakaoId = '';
    pendingNickname = '';
    document.getElementById('kakao-idle-step').style.display = 'block';
    document.getElementById('kakao-linking-step').style.display = 'none';
    document.getElementById('kakao-signup-step').style.display = 'none';
}

let isSignupLoading = false;

function setSignupBtnLoading(v) {
    isSignupLoading = v;
    const btn = document.getElementById('signup-btn');
    if (btn) { btn.disabled = v; btn.textContent = v ? '가입 중...' : '가입 완료'; btn.style.opacity = v ? '0.6' : '1'; }
    const btn2 = document.getElementById('kakao-signup-btn');
    if (btn2) { btn2.disabled = v; btn2.style.opacity = v ? '0.6' : '1'; }
}

function handleKakaoSignup() {
    if (isSignupLoading || isKakaoLoading) return;
    if (!window.Kakao) { showToast('카카오 SDK 로드 실패. 새로고침 해주세요.', 'error'); return; }
    if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
    sessionStorage.setItem('kakao_intent', 'signup');
    try {
        Kakao.Auth.authorize({ redirectUri: getKakaoRedirectUri() });
    } catch(e) { showToast('카카오 오류: ' + e.message, 'error'); }
}

async function handleSignupSubmit() {
    if (isSignupLoading) return;
    const name = (document.getElementById('signup-name').value || '').trim();
    const birth6 = (document.getElementById('signup-birth').value || '').replace(/[^0-9]/g, '').slice(0, 6);
    const phone = (document.getElementById('signup-phone').value || '').trim();

    if (!name) { showToast('이름을 입력해주세요.', 'error'); return; }
    if (birth6.length !== 6) { showToast('생년월일 6자리(YYMMDD)를 입력해주세요.', 'error'); return; }
    if (!phone || phone.replace(/[^0-9]/g, '').length < 10) { showToast('연락처를 올바르게 입력해주세요.', 'error'); return; }

    setSignupBtnLoading(true);
    try {
        const dupSnap = await getCol('members').where('name', '==', name).get();
        let isDup = false;
        dupSnap.forEach(doc => {
            const b = String(doc.data().birth || '');
            if (b.substring(2) === birth6 || b === birth6) isDup = true;
        });
        if (isDup) { showToast('이미 등록된 회원입니다. 관리자에게 문의해주세요.', 'error'); setSignupBtnLoading(false); return; }

        const today = (()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();
        const docRef = await getCol('members').add({
            name, birth: birth6, phone,
            gender: '미설정', position: 'all', level: '4', role: '회원',
            joinDate: today, kakaoId: pendingKakaoId,
            isResigned: false, createdAt: new Date().toISOString()
        });
        const memberData = { memberId: docRef.id, name, role: '회원', kakaoId: pendingKakaoId, isAppAdmin: false };
        localStorage.setItem(LS_KEY, JSON.stringify(memberData));
        showToast('가입이 완료되었습니다! 환영합니다 🎉', 'ok');
        setTimeout(() => routeByRole(memberData), 1200);
    } catch(e) { showToast('가입 실패: ' + e.message, 'error'); setSignupBtnLoading(false); }
}

function handleKakaoLogin() {
    if (isKakaoLoading) return;
    if (!window.Kakao) { showToast('카카오 SDK 로드 실패. 새로고침 해주세요.', 'error'); return; }
    if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
    sessionStorage.setItem('kakao_intent', 'login');
    try {
        Kakao.Auth.authorize({ redirectUri: getKakaoRedirectUri() });
    } catch(e) { showToast('카카오 오류: ' + e.message, 'error'); }
}

async function handleKakaoCallback(code) {
    await auth.signInAnonymously().catch(() => {});
    showView('loading-view');
    window.history.replaceState({}, '', location.pathname);
    const intent = sessionStorage.getItem('kakao_intent') || 'login';
    sessionStorage.removeItem('kakao_intent');
    try {
        const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: KAKAO_JS_KEY,
                redirect_uri: getKakaoRedirectUri(),
                code
            })
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error(tokenData.error_description || tokenData.error || '토큰 발급 실패');
        const accessToken = tokenData.access_token;
        if (Kakao.Auth?.setAccessToken) Kakao.Auth.setAccessToken(accessToken);

        const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const userData = await userRes.json();
        if (!userData.id) throw new Error('카카오 사용자 정보 조회 실패');
        const kakaoId = String(userData.id);
        const nickname = userData.kakao_account?.profile?.nickname || '';

        if (intent === 'signup') {
            await processSignupFlow(kakaoId, nickname);
        } else {
            await processLoginFlow(kakaoId, nickname);
        }
    } catch(e) {
        showToast('카카오 로그인 오류: ' + e.message, 'error');
        showView('login-view');
    }
}

async function processLoginFlow(kakaoId, nickname) {
    pendingKakaoId = kakaoId;
    pendingNickname = nickname;
    try {
        const snap = await getCol('members').where('kakaoId', '==', kakaoId).get();
        if (!snap.empty) {
            const doc = snap.docs[0];
            const data = doc.data();
            if (data.isResigned) { showToast('탈퇴한 회원입니다.', 'error'); showView('login-view'); return; }
            const memberData = { memberId: doc.id, name: data.name, role: data.role || '회원', kakaoId, isAppAdmin: data.isAppAdmin || false };
            localStorage.setItem(LS_KEY, JSON.stringify(memberData));
            routeByRole(memberData);
        } else {
            document.getElementById('link-desc').innerHTML =
                (nickname ? `<b>${nickname}</b>님, ` : '') + '처음 로그인이시네요.<br/>기존 회원 계정과 카카오를 연결해주세요.';
            document.getElementById('kakao-idle-step').style.display = 'none';
            document.getElementById('kakao-linking-step').style.display = 'block';
            showView('login-view');
        }
    } catch(e) { showToast('오류: ' + e.message, 'error'); showView('login-view'); }
}

async function processSignupFlow(kakaoId, nickname) {
    try {
        const snap = await getCol('members').where('kakaoId', '==', kakaoId).get();
        if (!snap.empty) {
            const doc = snap.docs[0];
            const data = doc.data();
            if (data.isResigned) { showToast('탈퇴한 계정입니다.', 'error'); showView('login-view'); return; }
            const memberData = { memberId: doc.id, name: data.name, role: data.role || '회원', kakaoId, isAppAdmin: data.isAppAdmin || false };
            localStorage.setItem(LS_KEY, JSON.stringify(memberData));
            showToast('이미 가입된 계정입니다. 로그인합니다.', 'ok');
            setTimeout(() => routeByRole(memberData), 1000);
        } else {
            pendingKakaoId = kakaoId;
            pendingNickname = nickname;
            document.getElementById('signup-name').value = nickname || '';
            document.getElementById('signup-birth').value = '';
            document.getElementById('signup-phone').value = '';
            document.getElementById('signup-desc').innerHTML =
                (nickname ? `<b>${nickname}</b>님, ` : '') + 'OTP FC 모이다에 오신 것을 환영합니다!<br/>아래 정보를 입력해주세요.';
            document.getElementById('kakao-idle-step').style.display = 'none';
            document.getElementById('kakao-signup-step').style.display = 'block';
            showView('login-view');
        }
    } catch(e) { showToast('오류: ' + e.message, 'error'); showView('login-view'); }
}

async function handleKakaoLink() {
    const name = (document.getElementById('link-name').value || '').trim();
    const birth6 = (document.getElementById('link-birth').value || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (!name) { showToast('이름을 입력해주세요.', 'error'); return; }
    if (birth6.length !== 6) { showToast('생년월일 6자리(YYMMDD)를 입력해주세요.', 'error'); return; }

    const btn = document.getElementById('link-btn');
    btn.disabled = true;
    btn.textContent = '연결 중...';

    try {
        const snap = await getCol('members').where('name', '==', name).get();
        let found = null;
        snap.forEach(doc => {
            const data = doc.data();
            if (data.isResigned) return;
            const b = String(data.birth || '');
            if (b.substring(2) === birth6 || b === birth6) found = { id: doc.id, ...data };
        });
        if (!found) { showToast('이름 또는 생년월일이 일치하지 않습니다.', 'error'); return; }
        await getCol('members').doc(found.id).update({ kakaoId: pendingKakaoId });
        const memberData = { memberId: found.id, name: found.name, role: found.role || '회원', kakaoId: pendingKakaoId, isAppAdmin: found.isAppAdmin || false };
        localStorage.setItem(LS_KEY, JSON.stringify(memberData));
        showToast('카카오 계정이 연결되었습니다!', 'ok');
        setTimeout(() => routeByRole(memberData), 600);
    } catch(e) {
        showToast('연결 실패: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '계정 연결';
    }
}

function showView(id) {
    ['login-view', 'loading-view', 'kakaotalk-guide'].forEach(v => {
        const el = document.getElementById(v);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (target) target.style.display = id === 'loading-view' ? 'flex' : 'block';
}

function showGuideOS(os) {
    const isAnd = os === 'android';
    document.getElementById('step1-android').style.display = isAnd ? 'block' : 'none';
    document.getElementById('step1-ios').style.display = isAnd ? 'none' : 'block';
    document.getElementById('step2-android').style.display = isAnd ? 'block' : 'none';
    document.getElementById('step2-ios').style.display = isAnd ? 'none' : 'block';
    const tA = document.getElementById('tab-android');
    const tI = document.getElementById('tab-ios');
    tA.style.background = isAnd ? '#183FB0' : 'transparent';
    tA.style.color = isAnd ? 'white' : '#94a3b8';
    tA.style.boxShadow = isAnd ? '0 2px 8px rgba(24,63,176,0.3)' : 'none';
    tI.style.background = isAnd ? 'transparent' : '#183FB0';
    tI.style.color = isAnd ? '#94a3b8' : 'white';
    tI.style.boxShadow = isAnd ? 'none' : '0 2px 8px rgba(24,63,176,0.3)';
}

let toastTimer = null;
function showToast(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.background = type === 'ok' ? '#059669' : '#ef4444';
    el.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function routeByRole(data) {
    if (STAFF_ROLES.includes(data.role)) {
        // 처음 로그인 시(미설정)만 admin mode ON — 이미 값이 있으면 사용자 설정 유지
        if (localStorage.getItem('moida_admin_mode') === null) {
            localStorage.setItem('moida_admin_mode', 'true');
        }
    } else {
        localStorage.removeItem('moida_admin_mode');
    }
    location.href = 'member.html';
}

async function initApp() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    await auth.signInAnonymously().catch(() => {});

    const saved = getSaved();
    if (saved && saved.memberId && saved.kakaoId) {
        if (!saved.role) {
            try {
                const doc = await getCol('members').doc(saved.memberId).get();
                if (doc.exists && !doc.data().isResigned) {
                    saved.role = doc.data().role || '회원';
                    saved.isAppAdmin = doc.data().isAppAdmin || false;
                    localStorage.setItem(LS_KEY, JSON.stringify(saved));
                } else {
                    localStorage.removeItem(LS_KEY);
                    showView('login-view');
                    return;
                }
            } catch(e) {
                showView('login-view');
                return;
            }
        }
        routeByRole(saved);
    } else {
        showView('login-view');
    }
}
