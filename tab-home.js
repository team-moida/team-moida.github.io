// ─── 알림 설정 안내 카드 (안드로이드/iPhone 탭) ──────────────────────────────────
// 안드로이드 PWA는 알림 채널이 기본 "팝업 표시 꺼짐"으로 생성돼 직접 켜야 배너가
// 뜬다. iOS는 보통 추가 설정이 없지만 설치/허용 여부 확인이 필요하다.
// 표시 조건: PWA standalone + 권한 granted + 미닫음 (안드로이드/iOS 둘 다).
// 일반 브라우저·미허용(default)에선 기존 "푸시 알림 받기" 배너가 안내하므로 숨김.
// 닫음 여부는 localStorage에 기억 (Cache API와 별개라 PWA 재실행 후에도 유지).
// ※ 웹/PWA에서 OS 알림 설정 화면으로 직접 보내는 표준 API는 없어(chrome://·
//   android-app:// intent는 JS로 이동 불가) 수동 안내 단계를 보여준다.
const NOTIF_GUIDE_DISMISS_KEY = 'moida_androidNotifGuideDismissed';
// 기기별 알림 설정 안내 본문 — 홈 배너(NotifSetupGuide)와 공지 게시판(TabNotice)에서 공유.
// 안드로이드/iPhone 탭 + 단계 안내만 담는다(테스트/닫기 버튼은 사용하는 쪽에서 붙임).
const NotifGuideBody = () => {
    const [tab, setTab] = React.useState(() => /android/i.test(navigator.userAgent) ? 'android' : 'iphone');

    const Step = ({ n, children }) => (
        <li className="flex gap-2.5 text-xs text-slate-600">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 text-white font-black flex items-center justify-center">{n}</span>
            <span className="leading-relaxed pt-0.5">{children}</span>
        </li>
    );

    return (
        <>
            {/* 기기 탭 */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                {[['android','안드로이드'],['iphone','iPhone']].map(([key,label]) => (
                    <button key={key} onClick={()=>setTab(key)}
                        className={`flex-1 text-xs font-black py-1.5 rounded-lg transition-all ${tab===key?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* 선택 탭 안내 */}
            <div className="mt-3">
                {tab === 'android' ? (
                    <>
                        <p className="text-[11px] font-black text-teal-500 mb-1.5">쉬운 방법</p>
                        <ol className="space-y-2">
                            <Step n="1"><b className="text-slate-800">모이다 알림</b>을 길게 누르기</Step>
                            <Step n="2"><b className="text-slate-800">톱니바퀴(설정)</b> 누르기</Step>
                            <Step n="3"><b className="text-slate-800">"팝업으로 표시"</b>와 <b className="text-slate-800">"진동"</b> 켜기</Step>
                        </ol>
                        <p className="text-[11px] font-black text-slate-400 mt-3 mb-1.5">정식 방법</p>
                        <ol className="space-y-2">
                            <Step n="1">휴대폰 <b className="text-slate-800">설정 → 앱 → 모이다 → 알림</b></Step>
                            <Step n="2"><b className="text-slate-800">"알림 카테고리" → "일반"</b></Step>
                            <Step n="3"><b className="text-slate-800">"팝업으로 표시"</b> 켜기 + <b className="text-slate-800">"진동"</b> 켜기</Step>
                        </ol>
                        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">소리는 보통 이미 켜져 있어요. 기종에 따라 메뉴 이름이 조금 다를 수 있어요.</p>
                    </>
                ) : (
                    <>
                        <ol className="space-y-2">
                            <Step n="1">Safari로 접속해 <b className="text-slate-800">"홈 화면에 추가"</b>로 설치했는지 확인</Step>
                            <Step n="2">앱을 열고 <b className="text-slate-800">"알림 허용"</b>을 눌렀는지 확인</Step>
                        </ol>
                        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">보통 추가 설정 없이 배너로 와요. 혹시 안 오면: <b className="text-slate-600">설정 → 알림 → 모이다</b>에서 <b className="text-slate-600">"알림 허용"</b>이 켜져 있는지 확인하세요.</p>
                    </>
                )}
            </div>
        </>
    );
};

const NotifSetupGuide = ({ notifPermission, memberData }) => {
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const [dismissed, setDismissed] = React.useState(() => {
        try { return localStorage.getItem(NOTIF_GUIDE_DISMISS_KEY) === '1'; } catch { return false; }
    });
    const [expanded, setExpanded] = React.useState(false); // 기본 접힘 — 제목만 보이고 탭하면 펼침
    const [testState, setTestState] = React.useState('idle'); // idle | sending | sent

    if (!isStandalone || notifPermission !== 'granted' || dismissed) return null;

    const dismiss = () => {
        try { localStorage.setItem(NOTIF_GUIDE_DISMISS_KEY, '1'); } catch {}
        setDismissed(true);
    };

    // 본인에게만 가는 테스트 푸시. 기존 공지 발송 흐름 재활용(notifications 문서 생성
    // → Cloud Function sendPushNotification). type:'test'로 공지 목록에서 숨김.
    const sendTest = async () => {
        if (testState === 'sending' || !memberData?.memberId) return;
        setTestState('sending');
        try {
            await getCol('notifications').add({
                title: '🔔 알림 테스트',
                body: '이 알림이 배너로 떴다면 설정 완료예요!',
                targetMemberIds: [memberData.memberId],
                type: 'test',
                sentAt: new Date().toISOString(),
            });
            setTestState('sent');
            setTimeout(() => setTestState('idle'), 5000); // 5초 쿨다운
        } catch (e) {
            console.warn('알림 테스트 발송 실패:', e);
            setTestState('idle');
        }
    };

    return (
        <div className="card rounded-2xl p-4 border-teal-100">
            {/* 헤더 — 항상 보임. 탭하면 펼침/접힘(기본 접힘) */}
            <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-3 text-left active:scale-98 transition-all">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon.Bell size={18} className="text-teal-500"/>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-teal-600">알림이 조용히 오나요?</p>
                    <p className="text-xs text-slate-400 mt-0.5">{expanded ? '내 폰에 맞게 한 번만 설정하면 배너로 떠요' : '탭하면 설정 방법을 알려드려요'}</p>
                </div>
                <Icon.ChevronRight size={18} className={`text-slate-300 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}/>
            </button>

            {expanded && (
                <>
                    <div className="mt-3"><NotifGuideBody /></div>

                    {/* 알림 테스트 + 닫기 */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <button onClick={dismiss} className="text-[11px] font-black text-slate-400 active:scale-95">다음에 안 보기</button>
                        <button onClick={sendTest} disabled={testState!=='idle'}
                            className={`text-xs font-black px-3 py-1.5 rounded-xl active:scale-95 transition-all ${testState==='idle'?'bg-teal-500 text-white':'bg-slate-100 text-slate-400'}`}>
                            {testState==='sending' ? '보내는 중…' : testState==='sent' ? <span className="inline-flex items-center gap-1">보냈어요 <Icon.Check size={13}/></span> : '알림 테스트'}
                        </button>
                    </div>
                    {testState==='sent' && (
                        <p className="text-[11px] font-black text-teal-500 mt-2 text-right">테스트 알림을 보냈어요. 잠시 후 배너를 확인하세요!</p>
                    )}
                </>
            )}
        </div>
    );
};

// 공지 날짜 포맷 "26.09.10" (YY.MM.DD, 0패딩)
const fmtAnnDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear() % 100).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
};

// ─── 공지 순환 띠 ──────────────────────────────────────────────────────────────
// 홈 콘텐츠 맨 위(헤더 아래 첫 카드)에서 최신 공지부터 5초마다 위로 슬라이드업하며 교체.
// 1개면 고정, 0개면 빈 띠 유지(숨기지 않음) — 눌러서 게시판 진입(관리자는 거기서 작성).
// announcements는 use-fcm.js 기준 최신순 + type:'test' 제외됨. 클릭 시 공지 게시판으로 이동.
const AnnounceTicker = ({ announcements, onOpen, onTabChange, meetings }) => {
    const [idx, setIdx] = React.useState(0);
    const list = announcements || [];
    // 모임 연결 공지인데 그 모임이 종료됐으면 '완료' 배지
    const isAnnDone = (a) => {
        if (!a || !a.linkMeetingId || !meetings) return false;
        const mt = meetings.find(m => m.id === a.linkMeetingId);
        return mt ? isMeetingEnded(mt) : false;
    };
    // 공지 여러 개면 5초마다 다음 공지로 — 고정돼 있다가 위로 올라가고 다음 공지가 아래에서 위로 등장
    React.useEffect(() => {
        if (list.length <= 1) return;
        const t = setInterval(() => setIdx(i => (i + 1) % list.length), 5000);
        return () => clearInterval(t);
    }, [list.length]);
    // 공지 0개 — 빈 띠 유지. 눌러도 게시판으로 이동.
    if (list.length === 0) {
        return (
            <button onClick={onOpen} className="w-full text-left active:scale-98 transition-all overflow-hidden">
                <div className="flex items-center gap-2.5">
                    <Icon.Bell size={15} className="text-slate-300 flex-shrink-0"/>
                    <span className="font-black text-sm text-slate-400">등록된 공지가 없습니다</span>
                </div>
            </button>
        );
    }

    const safeIdx = idx % list.length;
    const a = list[safeIdx];
    // 어두운 띠 + 라임 '공지' 칩. 제목은 고정(길면 …), 4초마다 위로 교체(아래→위 등장)
    return (
        <button onClick={onOpen} className="w-full text-left active:scale-98 transition-all">
            <div className="moida-notice-band relative h-9 rounded-xl overflow-hidden">
                {/* key 변경 → 고정돼 있다가 위로 올라가고 다음 공지가 아래에서 위로 등장 */}
                <div key={safeIdx} className="moida-ticker-up absolute inset-y-0 right-3 left-[52px] flex items-center overflow-hidden">
                    {isAnnDone(a) && <span className="mr-1.5 text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20 text-white/90 flex-shrink-0">완료</span>}
                    <span className="font-black text-[13px] text-white truncate">{a.title}</span>
                </div>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 z-[3] bg-live text-[#15171E] text-[10px] font-black px-2.5 py-1 rounded-full">공지</span>
            </div>
        </button>
    );
};

// ─── 홈 탭 ────────────────────────────────────────────────────────────────────
// 모임 날짜 포맷 "6/14(일)" (M/D(요일))
const fmtMeetingDate = (ds) => {
    if (!ds) return '';
    const d = new Date(ds + 'T00:00:00');
    if (isNaN(d.getTime())) return ds;
    const dow = ['일','월','화','수','목','금','토'][d.getDay()];
    return `${d.getMonth()+1}/${d.getDate()}(${dow})`;
};

// ─── 다음 모임 날씨 (Open-Meteo · API 키/서버 불필요) ──────────────────────────
// 모임 좌표(locationLat/Lng)로 그날 날씨를 받아 카드에 직관적 아이콘 + 기온/습도 표시.
//  · 지금 기온·습도 = 실시간(current)  · 최저/최고·강수확률 = 모임 날짜(daily) 기준.
//  · 좌표가 없거나(관리자 GPS 미지정) 조회 실패 시 조용히 숨김 → 카드 깔끔 유지.
// 기상청 PTY(강수형태) → [이모지, 한글]
const PTY_MAP = {
    0: [Icon.Sun, '맑음', '#FDE047', '☀️'],
    1: [Icon.CloudRain, '비', '#7DD3FC', '🌧️'],
    2: [Icon.CloudSnow, '비/눈', '#BAE6FD', '🌨️'],
    3: [Icon.CloudSnow, '눈', '#E0F2FE', '❄️'],
    5: [Icon.CloudDrizzle, '빗방울', '#7DD3FC', '🌦️'],
    6: [Icon.CloudDrizzle, '빗방울·눈날림', '#BAE6FD', '🌨️'],
    7: [Icon.CloudSnow, '눈날림', '#E0F2FE', '🌨️'],
};
// WGS84 위경도 → 기상청 격자 좌표 변환 (LCC 투영)
function latLngToKmaGrid(lat, lng) {
    const RE = 6371.00877, GRID = 5.0, DEGRAD = Math.PI / 180;
    const slat1 = 30 * DEGRAD, slat2 = 60 * DEGRAD, olon = 126 * DEGRAD, olat = 38 * DEGRAD;
    const sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5));
    const sf = Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn) * Math.cos(slat1) / sn;
    const ro = RE / GRID * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);
    const ra = RE / GRID * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5), sn);
    let theta = lng * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2 * Math.PI;
    if (theta < -Math.PI) theta += 2 * Math.PI;
    theta *= sn;
    return { nx: Math.floor(ra * Math.sin(theta) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5) };
}
// 초단기실황 base_date/base_time (매 시각 발표, 45분 이후 현재 시각 자료 안정)
function getKmaBaseDateTime() {
    const now = new Date();
    const d = new Date(now);
    if (now.getMinutes() < 45) d.setHours(d.getHours() - 1);
    return {
        base_date: `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,
        base_time: `${String(d.getHours()).padStart(2,'0')}00`,
    };
}
const KMA_KEY = 'f9c8dbdd1d9d41fbcf71eac3d375f47b1cb34a4b36d4ed1cdafd91442c7653da';
const _wxCache = new Map();
const _addrCache = new Map();
const MeetingWeather = ({ lat, lng, isAdminMode, dark }) => {
    const [wx, setWx] = React.useState(null);
    const [wState, setWState] = React.useState('idle'); // idle|loading|done|error
    const [wErr, setWErr] = React.useState('');
    const [addr, setAddr] = React.useState('');
    // 매칭(라임) 카드 = 어두운 글자 / 정기(인디고) 카드 = 흰 글자
    const wInk   = dark ? 'text-[#15171E]'    : 'text-white';
    const wInk85 = dark ? 'text-[#15171E]/85' : 'text-white/85';
    const wInk70 = dark ? 'text-[#15171E]/70' : 'text-white/70';
    const wInk40 = dark ? 'text-[#15171E]/40' : 'text-white/40';

    // ① 날씨 (기상청 초단기실황) — 주소와 독립. 캐시 즉시 표시 후 백그라운드 갱신.
    React.useEffect(() => {
        if (lat == null || lng == null) { setWState('idle'); setWx(null); return; }
        const key = `${lat},${lng}`;
        let shown = _wxCache.get(key) || null;
        if (!shown) {
            try {
                const s = JSON.parse(localStorage.getItem('moida_wx_' + key) || 'null');
                if (s && s.data) { shown = s; _wxCache.set(key, s); }
            } catch (_) {}
        }
        if (shown) { setWx(shown.data); setWState('done'); }
        if (shown && Date.now() - shown.at < 10*60*1000) return;
        let alive = true;
        if (!shown) setWState('loading');
        const { nx, ny } = latLngToKmaGrid(lat, lng);
        const { base_date, base_time } = getKmaBaseDateTime();
        const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${KMA_KEY}&pageNo=1&numOfRows=10&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
        fetch(url)
            .then(r => r.ok ? r.json() : Promise.reject('HTTP ' + r.status))
            .then(j => {
                if (!alive) return;
                const items = (j?.response?.body?.items?.item) || [];
                const get = (cat) => items.find(i => i.category === cat)?.obsrValue;
                const data = { temp: get('T1H'), humidity: get('REH'), pty: Number(get('PTY') || 0) };
                const entry = { at: Date.now(), data };
                _wxCache.set(key, entry);
                try { localStorage.setItem('moida_wx_' + key, JSON.stringify(entry)); } catch (_) {}
                setWx(data); setWState('done');
            })
            .catch(e => { if (alive && !shown) { setWErr(String((e && e.message) || e)); setWState('error'); } });
        return () => { alive = false; };
    }, [lat, lng]);

    // ② 주소 (카카오 역지오코딩) — 베스트에포트. 실패/지연돼도 날씨엔 영향 없음.
    React.useEffect(() => {
        if (lat == null || lng == null) { setAddr(''); return; }
        if (typeof KAKAO_REST_KEY === 'undefined' || typeof KAKAO_PROXY === 'undefined') return;
        const key = `${lat},${lng}`;
        const c = _addrCache.get(key);
        if (c && Date.now() - c.at < 24*60*60*1000) { setAddr(c.text); return; }
        let alive = true;
        const aUrl = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
        fetch(KAKAO_PROXY + encodeURIComponent(aUrl), { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } })
            .then(r => r.json())
            .then(ja => {
                if (!alive) return;
                const a = ja && ja.documents && ja.documents[0] && ja.documents[0].address;
                const text = a ? [a.region_2depth_name, a.region_3depth_name].filter(Boolean).join(' ') : '';
                if (text) { _addrCache.set(key, { at: Date.now(), text }); setAddr(text); }
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [lat, lng]);

    // 문제 상태는 회원에겐 깔끔히 숨기고, 관리자에게만 이유를 짧게 안내 (평상시엔 안 보임)
    const adminNote = (txt) => isAdminMode ? (
        <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-black ${wInk70} min-w-0`}>
            <Icon.MapPin size={12} className="flex-shrink-0 opacity-60"/><span className="truncate">{txt}</span>
        </div>
    ) : null;

    // 좌표 없음 → 관리자에겐 "지도로 위치 지정" 안내
    if (lat == null || lng == null) {
        return adminNote('지도에서 위치를 지정하면 날씨가 표시돼요');
    }
    // 조회 실패(캐시도 없음) → 관리자에겐 사유 안내
    if (wState === 'error') {
        return adminNote(`날씨를 불러오지 못했어요 (${wErr || '네트워크'})`);
    }
    if (wState !== 'done' || !wx) {
        return (
            <div className={`mt-3 flex items-center gap-2 text-xs font-black ${wInk70}`}>
                <span className="animate-pulse">날씨 불러오는 중…</span>
            </div>
        );
    }
    const [WxIcon, label, wxColor, wxEmoji] = PTY_MAP[wx.pty] || PTY_MAP[0];
    const r = (v) => (v == null || isNaN(Number(v))) ? '–' : Math.round(Number(v));
    return (
        <div className="mt-3 flex items-center gap-2 text-sm font-black min-w-0">
            <span className="flex-shrink-0 text-lg leading-none">{wxEmoji}</span>
            <span className={`${wInk} flex-shrink-0`}>{r(wx.temp)}°</span>
            <span className={`${wInk40} flex-shrink-0`}>·</span>
            <span className={`${wInk85} flex-shrink-0`}>{label}</span>
            <span className={`${wInk40} flex-shrink-0`}>·</span>
            <span className={`${wInk70} truncate`}>습도 {r(wx.humidity)}%</span>
        </div>
    );
};

// ─── 다음 모임 카드 (정기/매칭 종류별 색상 구분) ───────────────────────────────
// 종류별 색상·라벨. 정기=teal, 매칭=indigo. (회원이 두 모임 다 참여할 때 한눈에 구분)
const MEETING_KIND = {
    self:  { label: '정기모임', accent: '#183FB0', text: 'text-teal-500',   tint: '#eef2fb' },
    match: { label: '매칭모임', accent: '#6366f1', text: 'text-indigo-500', tint: '#eef2ff' },
};
// 미러가 아닌(더 나중) 모임의 D-day 라벨 — member.html meetingDayInfo와 동일 규칙.
const computeMeetingDay = (date, start) => {
    if (!date || !start) return null;
    const [my,mm,md] = date.split('-').map(Number);
    const [sh,sm] = start.split(':').map(Number);
    const now = new Date();
    const meetingStart = new Date(my,mm-1,md,sh,sm,0);
    const today0 = new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0);
    const meetDay0 = new Date(my,mm-1,md,0,0,0);
    const dDays = Math.round((meetDay0-today0)/(1000*60*60*24));
    if (dDays < 0) return { type:'past' };
    if (dDays > 0) return { type:'future', label:`D-${dDays}` };
    const minsUntil = Math.round((meetingStart-now)/60000);
    if (minsUntil > 60) return { type:'today', label:`${Math.floor(minsUntil/60)}시간 ${minsUntil%60}분 후` };
    if (minsUntil > 0) return { type:'today', label:`${minsUntil}분 후 시작`, urgent: minsUntil <= 30 };
    return { type:'started', label:'모임 중' };
};
// 신청창 시작/마감 ISO → "M/D HH:MM"
const fmtRegDT = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const NextMeetingCard = ({
    meeting, kind, isActive, dayInfo, darkMode, isAdminMode, onTabChange, members,
    memberData, showToast, showAlert, showConfirm, regDuesUnpaid, regDuesBlock, regPenaltyUnpaid, regPenaltyTotal,
    mySession, teamReady, myTeamInfo, myTeamIdx, allowFromDisplay, participantCount, scheduleData,
    matchLocalIndex, matchCompleted, onMatchPrev, onMatchNext, onMatchToggleComplete, onMatchAutoAdvance,
    isMeetingOver, isMeetingEndSaved, onEndMeeting, onGenerateQR, onEditMeeting, onDeleteMeeting,
    onOpenAttendModal, onInlineGPS, onInlineQR, enableQR, onOpenKiosk, fill, fitFill, homeRich,
    managers = [], onChangeManager,
}) => {
    const [boardOpen, setBoardOpen] = React.useState(false);
    window.useMoidaBack?.(boardOpen, () => setBoardOpen(false));
    // 이 카드(정기 모임)에 확정된 매치표가 있으면 '매치판 크게 보기' 진입 가능
    const hasBoard = kind === 'self' && (scheduleData?.schedule?.list?.length > 0);
    const cfg = MEETING_KIND[kind] || MEETING_KIND.self;
    // ── 팀 발표(공개) 시 카드를 내 조끼색으로 ─────────────────────────────────────
    // 정기(self) 모임에서 팀이 확정·공개(teamReady)되고 내 팀이 정해지면(출석 전) 카드 배경=내 조끼색.
    const VEST_HEX = ['#ec4899','#38bdf8','#a3e635','#facc15','#2563eb','#ef4444']; // 핑크·하늘·연두·노랑·파랑·빨강 (getTeamBadge 순서)
    const vestLightText = (myTeamIdx === 2 || myTeamIdx === 3); // 연두·노랑 = 밝은 조끼 → 어두운 글자
    const teamReveal = kind === 'self' && teamReady && !!myTeamInfo && myTeamIdx >= 0; // 출석 후에도 조끼색 유지(내 팀 카드)
    const vestNumColor = vestLightText ? '#1e293b' : (VEST_HEX[myTeamIdx] || '#1e293b'); // 흰 번호패치 안 숫자색
    // 매칭=라임(밝은)→어두운 글자 / 정기=인디고→흰 글자 / 팀공개=조끼색(밝으면 어두운 글자)
    const dark = teamReveal ? vestLightText : (kind === 'match');
    const cardBg = teamReveal ? (VEST_HEX[myTeamIdx] || cfg.accent) : (kind === 'match' ? '#C2F94A' : cfg.accent);
    const cardShadow = homeRich ? '0 6px 18px -8px rgba(15,23,42,0.22)'   // 홈 카드: 컬러 글로우(하늘색 띠) 대신 은은한 중립 그림자
        : teamReveal ? `0 16px 34px -6px ${(VEST_HEX[myTeamIdx] || '#000000')}66`
        : (kind === 'match' ? '0 16px 34px -6px rgba(163,224,53,0.5)' : `0 16px 34px -6px ${cfg.accent}66`);
    const ink   = dark ? 'text-[#15171E]'    : 'text-white';
    const ink90 = dark ? 'text-[#15171E]/90' : 'text-white/90';
    const ink85 = dark ? 'text-[#15171E]/85' : 'text-white/85';
    const ink80 = dark ? 'text-[#15171E]/80' : 'text-white/80';
    const ink70 = dark ? 'text-[#15171E]/70' : 'text-white/70';
    const ink60 = dark ? 'text-[#15171E]/60' : 'text-white/60';
    const chip  = dark ? 'bg-black/10 text-[#15171E]' : 'bg-white/25 text-white';
    const softBorder = dark ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.22)';
    const showOverlay = kind !== 'match' && isActive && isAdminMode && isMeetingOver && !isMeetingEndSaved;
    // 출석 인라인 GPS/QR 버튼이 보이는 상태 — 이때는 카드 자체 누름 스케일을 끈다(버튼만 애니메이션)
    const showInlineAttend = isActive && kind === 'self' && !mySession?.checkedIn && teamReady && (dayInfo?.type === 'today' || dayInfo?.type === 'started');
    // 히어로 날짜: 큰 일(日) 숫자 + 월·요일 (달력 한 장 느낌)
    const _md = meeting.date ? new Date(meeting.date + 'T00:00:00') : null;
    const _ok = _md && !isNaN(_md.getTime());
    const dDay = _ok ? _md.getDate() : '';
    const dMon = _ok ? ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'][_md.getMonth()] : '';
    const dDow = _ok ? ['일','월','화','수','목','금','토'][_md.getDay()] : '';
    // 현재 인원 — 이 카드의 모임(날짜+종류) 기준 weekly_session(선정명단) 직접 집계.
    // 관리자가 직접 지정한 인원도 포함(선착순 신청 전이라도). 노쇼는 제외.
    const [liveCount, setLiveCount] = React.useState(null);
    React.useEffect(() => {
        if (!meeting?.date) { setLiveCount(null); return; }
        const _mid = (typeof getMeetingId === 'function') ? getMeetingId(meeting) : meeting.date;
        const unsub = getCol('weekly_session')
            .where('date', '==', meeting.date)
            .onSnapshot(snap => {
                const n = snap.docs.map(d => d.data())
                    .filter(p => p.status !== '노쇼' && (p.meetingId ? p.meetingId === _mid : !String(_mid).endsWith('__match')))
                    .length;
                setLiveCount(n);
            }, () => setLiveCount(null));
        return () => unsub();
    }, [meeting?.date, meeting?.meetingType]);
    const curCount = (liveCount != null) ? liveCount : (participantCount || 0);

    // ── 카드 안 모임 신청 (정기/매칭 공통) ──────────────────────────────────────
    // 신청 받는 모임(isRegistrationEnabled)일 때만. 담당자도 표시한다 —
    // 자동 등록됐으면 '신청 완료/취소', 안 됐으면 '신청하기'로 myReg(등록상태)가 알아서 분기.
    const _meId = memberData?.memberId;
    const regEnabled = !!meeting?.isRegistrationEnabled;
    const showRegBlock = regEnabled && !!_meId;
    const [myReg, setMyReg] = React.useState(null);
    const [donePopup, setDonePopup] = React.useState(null);   // 신청 완료 팝업 {type:'confirmed'|'waiting', pos}
    const [cancelAsk, setCancelAsk] = React.useState(false);  // 신청 취소 확인 팝업
    const [absentAsk, setAbsentAsk] = React.useState(false);  // 불참/노쇼 신청 사유 입력 팝업
    const [mgrPickOpen, setMgrPickOpen] = React.useState(false);  // 담당자 본인 불참/노쇼 확정 시 담당자 교체 팝업
    const [absentReason, setAbsentReason] = React.useState('');
    const [justApplied, setJustApplied] = React.useState(false);
    const prevRegStatus = React.useRef(null);
    React.useEffect(() => {
        if (!showRegBlock || !meeting?.date) { setMyReg(null); return; }
        const mid = (typeof getMeetingId === 'function') ? getMeetingId(meeting) : meeting.date;
        const unsub = getCol('registrations').doc(`${mid}_${_meId}`)
            .onSnapshot(d => setMyReg(d.exists ? (d.data() || null) : null), () => setMyReg(null));
        return () => unsub();
    }, [showRegBlock, _meId, meeting?.date, meeting?.meetingType]);
    const regHandlers = React.useMemo(() => (showRegBlock && typeof makeRegistrationHandlers === 'function')
        ? makeRegistrationHandlers({ meetingDate: meeting.date, memberData, meetingSettings: meeting, showToast, showAlert, showConfirm })
        : null, [showRegBlock, _meId, meeting?.date, meeting?.meetingType]);
    // 신청 직후 확정/대기로 잡히면 완료 팝업(+순번) 표시
    React.useEffect(() => {
        const cur = myReg?.status || null;
        if (justApplied && !prevRegStatus.current && (cur === 'confirmed' || cur === 'waiting')) {
            setDonePopup(cur === 'waiting'
                ? { type: 'waiting', pos: (myReg && (myReg.waitingNumber || '')) }
                : { type: 'confirmed', pos: curCount });
            setJustApplied(false);
        }
        prevRegStatus.current = cur;
    }, [myReg && myReg.status, curCount, justApplied]);
    const onHomeApply = (e) => { e.stopPropagation(); if (!regHandlers) return; setJustApplied(true); regHandlers.handleRegister(); };
    const onHomeDecline = (e) => { e.stopPropagation(); if (!regHandlers) return; (typeof showConfirm === 'function' ? showConfirm('미참', '이번 모임에 미참으로 표시할까요?\n신청 버튼이 사라져요.', regHandlers.handleDecline) : regHandlers.handleDecline()); };
    const onHomeUndoDecline = (e) => { e.stopPropagation(); if (!regHandlers) return; regHandlers.handleUndoDecline(); };
    // 운영진 인원 파악: 이 모임의 신청(확정+대기)·미참 집계 (관리자만 구독)
    const [regAgg, setRegAgg] = React.useState({ applied: 0, declined: 0 });
    React.useEffect(() => {
        if (!isAdminMode || !showRegBlock || !meeting?.date) { setRegAgg({ applied: 0, declined: 0 }); return; }
        const mid = (typeof getMeetingId === 'function') ? getMeetingId(meeting) : meeting.date;
        const unsub = getCol('registrations').where('meetingId', '==', mid).onSnapshot(snap => {
            let applied = 0, declined = 0;
            snap.forEach(d => { const s = (d.data() || {}).status; if (s === 'confirmed' || s === 'waiting') applied++; else if (s === 'declined') declined++; });
            setRegAgg({ applied, declined });
        }, () => setRegAgg({ applied: 0, declined: 0 }));
        return () => unsub();
    }, [isAdminMode, showRegBlock, meeting?.date, meeting?.meetingType]);
    // 미응답 분모 = 그 '모임 달'의 활동회원(운영진 포함) 중 휴식·특별휴식 제외(게스트처럼 미응답에서 뺌).
    const [monthStatuses, setMonthStatuses] = React.useState({});
    React.useEffect(() => {
        if (!isAdminMode || !showRegBlock || !meeting?.date) { setMonthStatuses({}); return; }
        const mm = String(meeting.date).substring(0, 7);
        const unsub = getCol('monthly_checks').doc(mm).onSnapshot(d => setMonthStatuses((d.exists && d.data().statuses) || {}), () => setMonthStatuses({}));
        return () => unsub();
    }, [isAdminMode, showRegBlock, meeting?.date]);
    const eligibleCount = React.useMemo(() => {
        if (!isAdminMode || !meeting?.date) return 0;
        const mm = String(meeting.date).substring(0, 7);
        return (members || []).filter(m => {
            if (m.isResigned) return false;
            if (typeof joinedByMonth === 'function' && !joinedByMonth(m, mm)) return false;
            const resting = monthStatuses[m.id] === 'rest' || (m.isSpecialRest && mm >= (m.specialRestStartMonth || '0000-00'));
            return !resting;   // 휴식·특별휴식 제외 (운영진·미납은 포함)
        }).length;
    }, [isAdminMode, members, monthStatuses, meeting?.date]);
    const undecidedCount = Math.max(0, eligibleCount - regAgg.applied - regAgg.declined);
    const _now = Date.now();
    const _regOpenMs = meeting?.registrationOpenAt ? new Date(meeting.registrationOpenAt).getTime() : null;
    const _regCloseMs = meeting?.registrationCloseAt ? new Date(meeting.registrationCloseAt).getTime() : null;
    const regBeforeOpen = _regOpenMs && _now < _regOpenMs;
    const regAfterClose = _regCloseMs && _now > _regCloseMs;
    const regWindowOpen = !regBeforeOpen && !regAfterClose;
    const regFCFS = meeting?.isFirstComeFirstServed ?? true;
    // 불참/노쇼 — 신청 마감 후 + 확정 상태일 때 시간 구간(absent / noshow_1 / noshow_2) 판정
    const absentType = (regAfterClose && myReg?.status === 'confirmed' && typeof getAbsentType === 'function')
        ? getAbsentType(meeting.date, meeting.end) : null;
    const absentFine = absentType === 'noshow_1' ? 10000 : absentType === 'noshow_2' ? 20000 : 0;
    const isNoshowStage = absentType === 'noshow_1' || absentType === 'noshow_2';
    const absentColor = absentFine === 20000 ? '#EF4444' : absentFine === 10000 ? '#EA580C' : '#F59E0B'; // 당일=빨강/전날=진주황/불참=노랑
    const absentFineLabel = absentType === 'noshow_2' ? '당일 노쇼 벌금 2만원' : absentType === 'noshow_1' ? '노쇼 벌금 1만원' : '미리 알리면 벌금 없음';
    const undoAbsentOk = (myReg?.status === 'absent' || myReg?.status === 'noshow') && typeof getAbsentType === 'function' && !!getAbsentType(meeting.date, meeting.end);
    // 담당자 본인이 불참/노쇼를 확정하면 → 담당자 교체 팝업을 띄워 다른 운영진에게 넘기도록 유도
    const isMeetingManager = isAdminMode && !!_meId && !!meeting?.managerId && _meId === meeting.managerId;
    const onAbsentConfirm = () => { if (regHandlers) regHandlers.handleAbsent(absentReason.trim()); setAbsentAsk(false); setAbsentReason(''); if (isMeetingManager) setMgrPickOpen(true); };
    const onUndoAbsent = (e) => { if (e) e.stopPropagation(); if (regHandlers) regHandlers.handleUndoAbsent(); };

    // (fill) 모임 카드가 1개일 때만 — 카드를 하단탭 근처까지 세로로 채운다. 실제 위치를 측정해 minHeight 지정.
    const fillRef = React.useRef(null);
    const [fillH, setFillH] = React.useState(null);
    React.useEffect(() => {
        if (!fill || fitFill) { setFillH(null); return; }   // fitFill=부모(flex) 높이를 100%로 채움 → 측정 불필요
        const calc = () => {
            const el = fillRef.current; if (!el) return;
            const top = el.getBoundingClientRect().top;
            // 카드 아래 형제(설치 안내·알림 배너 등) 높이 합 + space-y-3 간격(12px) — 같이 화면에 들어오게
            let below = 0;
            for (let sib = el.nextElementSibling; sib; sib = sib.nextElementSibling) {
                below += sib.offsetHeight + 12;
            }
            // 스크롤 영역(.content-pb)의 하단 패딩(탭바+세이프영역 포함)을 그대로 빼야 넘침(스크롤)이 안 생김
            const pbEl = el.closest('.content-pb');
            const bottom = pbEl
                ? (parseFloat(getComputedStyle(pbEl).paddingBottom) || 0)
                : ((document.querySelector('.tab-bar')?.offsetHeight || 76) + 12);
            const h = Math.round(window.innerHeight - top - below - bottom);
            setFillH(h > 320 ? h : null);   // 너무 작으면(키보드 등) 자연 높이로
        };
        calc();
        const tid = setTimeout(calc, 80);    // 폰트/배너 레이아웃 안정 후 보정
        const tid2 = setTimeout(calc, 280);   // 공지 띠/이미지 등 늦은 레이아웃 한 번 더 보정
        window.addEventListener('resize', calc);
        return () => { clearTimeout(tid); clearTimeout(tid2); window.removeEventListener('resize', calc); };
    }, [fill, meeting?.date, kind]);
    // fillOn = 큰(원형 신청버튼) 레이아웃. homeRich면 높이 안 늘려도 큰 레이아웃 유지.
    const fillOn = homeRich || fitFill || (fill && !!fillH);

    return (
        <div className={`relative ${fitFill ? 'h-full' : ''}`} ref={fillRef}>
        <button onClick={()=> onTabChange('attend', kind, meeting.id || getMeetingId(meeting))}
            className={`w-full rounded-3xl p-5 text-left ${ink} transition-all${showInlineAttend ? '' : ' active:scale-98'}${showOverlay ? ' blur-sm' : ''}${fillOn ? ' flex flex-col' : ''}`}
            style={{ background: cardBg, boxShadow: cardShadow, ...(fitFill ? { height: '100%' } : (fillOn && fillH) ? { minHeight: fillH + 'px' } : {}) }}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`text-xs font-black uppercase tracking-widest ${ink80}`}>{cfg.label}</p>
                    {meeting.isTest && <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg ${chip} flex-shrink-0`}><Icon.Beaker size={11}/>테스트</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isAdminMode && isActive && kind === 'self' && onOpenKiosk && (
                        <span role="button" onClick={(e)=>{ e.stopPropagation(); onOpenKiosk(); }}
                            className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-white/25 text-white active:scale-95 cursor-pointer">
                            <Icon.Clipboard size={12}/> 키오스크
                        </span>
                    )}
                    {isAdminMode && kind === 'self' && onGenerateQR && (
                        <span role="button" onClick={(e)=>{ e.stopPropagation(); onGenerateQR(meeting); }}
                            className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-white/25 text-white active:scale-95 cursor-pointer">
                            <Icon.QrCode size={12}/> QR
                        </span>
                    )}
                    {/* 매치판 크게 보기 — 확정 매치표가 있으면 작은 칩으로 진입(팝업 안에서 내 경기/전체 경기 전환) */}
                    {hasBoard && (
                        <span role="button" onClick={(e)=>{ e.stopPropagation(); setBoardOpen(true); }}
                            className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-white/25 text-white active:scale-95 cursor-pointer">
                            <Icon.Tv size={12}/> 매치판
                        </span>
                    )}
                    {dayInfo && dayInfo.type !== 'past' && dayInfo.label && (
                        dayInfo.type==='started' ? (
                            <span className={`text-xs font-black px-3 py-1 rounded-full moida-pulse-live ${dark?'bg-[#15171E] text-live':'bg-live text-[#15171E]'}`}>{dayInfo.label}</span>
                        ) : (
                            // 남은 시간(카운트다운/D-day) — '지금 출석 체크하기' 박스와 같은 반투명 박스 색
                            <span className={`text-xs font-black px-3 py-1 rounded-xl ${ink}`} style={{background: dark?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.2)'}}>{dayInfo.label}</span>
                        )
                    )}
                </div>
            </div>
            {_ok ? (
                <div className="flex items-end gap-3">
                    <span className="font-black text-[84px] leading-[0.78] tracking-tight tabular-nums">{dDay}</span>
                    <div className="pb-2">
                        <p className={`text-[13px] font-black ${ink60} tracking-wider leading-none`}>{dMon}</p>
                        <p className="text-[22px] font-black leading-tight mt-1">{dDow}요일</p>
                    </div>
                </div>
            ) : (
                <p className="font-black text-[28px] leading-none tracking-tight">{fmtMeetingDate(meeting.date)}</p>
            )}
            {kind==='match' && meeting.opponentName && (
                <p className={`text-sm font-black ${ink90} mt-2 truncate`}>vs {meeting.opponentName}</p>
            )}
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-sm font-bold ${ink85}`}>
                <span className="flex items-center gap-1"><span className="text-[15px] leading-none flex-shrink-0">⏰</span>{meeting.start} ~ {meeting.end}</span>
                {meeting.location && <span className="flex items-center gap-1 min-w-0"><span className="text-[15px] leading-none flex-shrink-0">📍</span><span className="truncate">{meeting.location}</span></span>}
                <span className="flex items-center gap-1"><span className="text-[15px] leading-none flex-shrink-0">👥</span>{kind==='match' ? `현재 ${curCount}명 · 남 ${meeting.maxMale||0}·여 ${meeting.maxFemale||0}` : `현재 ${curCount} · 정원 ${meeting.maxLimit||18}명`}</span>
                {getManagerLabel(meeting, members) && <span className="flex items-center gap-1"><span className="text-[15px] leading-none flex-shrink-0">🧑‍💼</span>{getManagerLabel(meeting, members)}</span>}
            </div>
            {/* 실시간 날씨 (모임 좌표 기준) — 지난 모임에는 표시 안 함 */}
            {dayInfo && dayInfo.type !== 'past' && (
                <MeetingWeather lat={meeting.locationLat} lng={meeting.locationLng} isAdminMode={isAdminMode} dark={dark} />
            )}
            {/* 모임 신청 — 카드 안에서 바로 신청/취소 (신청 받는 모임일 때만). fill: 영역을 늘려 안을 채움 */}
            {showRegBlock && (
                <div className={`mt-3 pt-3 border-t ${fillOn ? 'flex-1 flex flex-col justify-center' : ''}`} style={{borderColor: softBorder}}>
                    {regBeforeOpen ? (
                        <div className={`flex items-center gap-1.5 text-xs font-black ${ink70}`}>
                            <Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">신청 시작 전 · {fmtRegDT(meeting.registrationOpenAt)}부터</span>
                        </div>
                    ) : myReg?.status === 'declined' ? (
                        <div className="flex items-center justify-between gap-2">
                            <span className={`flex items-center gap-1.5 text-sm font-black ${ink} min-w-0`}><Icon.X size={16} className="flex-shrink-0"/><span className="truncate">이번 모임 미참</span></span>
                            <span role="button" onClick={onHomeUndoDecline} className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${chip} active:scale-95 cursor-pointer flex-shrink-0`}>되돌리기</span>
                        </div>
                    ) : (myReg?.status === 'confirmed' && absentType) ? (
                        /* 신청 마감 후 — 못 오면 불참/노쇼 신청 (시간 단계별 라벨·색) */
                        (fillOn && !(teamReady && myTeamInfo)) ? (
                            <div className="w-full flex-1 flex items-center justify-center gap-6 py-1">
                                <span role="button" onClick={(e)=>{ e.stopPropagation(); setAbsentAsk(true); }}
                                    className="flex-shrink-0 flex flex-col items-center justify-center rounded-full text-white active:scale-95 transition-all cursor-pointer text-center px-3"
                                    style={{ width:180, height:180, background: absentColor, boxShadow:`0 0 0 8px ${absentColor}1f, 0 18px 34px -14px ${absentColor}a6` }}>
                                    <Icon.AlertTriangle size={34}/>
                                    <span className="font-black text-[19px] mt-1.5 leading-tight">{absentType==='noshow_2' ? '당일 노쇼' : isNoshowStage ? '노쇼' : '불참'} 신청</span>
                                </span>
                                <div className="flex flex-col gap-2.5 min-w-0">
                                    <span className={`flex items-center gap-1 text-sm font-black ${ink80}`}><Icon.Check size={15} className="flex-shrink-0"/>참가 확정</span>
                                    <div>
                                        <p className={`text-[11px] font-black ${ink70} mb-0.5`}>못 가게 됐다면</p>
                                        <p className={`text-[15px] font-black ${ink} leading-snug`}>{absentFineLabel}</p>
                                    </div>
                                    <p className={`text-[11px] font-black ${ink70} leading-relaxed`}>탭하면 사유를 적고<br/>{isNoshowStage?'노쇼':'불참'}을 알려요</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`flex items-center gap-1 text-sm font-black ${ink}`}><Icon.Check size={14} className="flex-shrink-0"/>참가 확정</span>
                                    <span className={`text-[11px] font-black ${ink70}`}>{absentFineLabel}</span>
                                </div>
                                <span role="button" onClick={(e)=>{ e.stopPropagation(); setAbsentAsk(true); }}
                                    className="w-full flex items-center justify-center gap-2 rounded-2xl font-black cursor-pointer py-3 text-sm text-white active:scale-95"
                                    style={{ background: absentColor, boxShadow:`0 10px 22px -10px ${absentColor}80` }}>
                                    <Icon.AlertTriangle size={15}/> {absentType==='noshow_2'?'당일 노쇼':isNoshowStage?'노쇼':'불참'} 신청
                                </span>
                            </div>
                        )
                    ) : (myReg?.status === 'confirmed' && regAfterClose) ? (
                        <div className={`flex items-center gap-1.5 text-sm font-black ${ink}`}><Icon.Check size={15} className="flex-shrink-0"/><span className="truncate">참가 확정</span></div>
                    ) : myReg?.status === 'confirmed' ? (
                        (fillOn && !(teamReady && myTeamInfo)) ? (
                            /* 신청하기 원과 같은 자리·같은 크기 토글 — 원이 '신청 취소'로 바뀜 + 우측 정보 */
                            <div className="w-full flex-1 flex items-center justify-center gap-6 py-1">
                                <span role="button" onClick={(e)=>{ e.stopPropagation(); setCancelAsk(true); }}
                                    className={`flex-shrink-0 flex flex-col items-center justify-center rounded-full active:scale-95 transition-all cursor-pointer ${ink}`}
                                    style={{ width:180, height:180, background: dark?'rgba(0,0,0,0.10)':'rgba(255,255,255,0.16)', border: `2px solid ${dark?'rgba(0,0,0,0.16)':'rgba(255,255,255,0.40)'}` }}>
                                    <Icon.Check size={40}/>
                                    <span className="font-black text-[22px] mt-1.5">신청 취소</span>
                                </span>
                                <div className="flex flex-col gap-3 min-w-0">
                                    <span className={`flex items-center gap-1 text-sm font-black ${ink80}`}><Icon.Check size={15} className="flex-shrink-0"/>신청 완료</span>
                                    <div>
                                        <p className={`text-[11px] font-black ${ink70} mb-0.5`}>현재 인원</p>
                                        <p className={`text-[26px] font-black ${ink} leading-none`}>{curCount}<span className="text-base font-black ml-0.5">명</span></p>
                                    </div>
                                    <div>
                                        <p className={`text-[11px] font-black ${ink70} mb-0.5`}>정원</p>
                                        <p className={`text-[26px] font-black ${ink} leading-none`}>{kind==='match' ? <span className="text-[19px]">남 {meeting.maxMale||0} · 여 {meeting.maxFemale||0}</span> : <>{meeting.maxLimit||18}<span className="text-base font-black ml-0.5">명</span></>}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-2">
                                <span className={`flex items-center gap-1.5 text-sm font-black ${ink} min-w-0`}><Icon.Check size={16} className="flex-shrink-0"/><span className="truncate">신청 완료</span></span>
                                <span role="button" onClick={(e)=>{ e.stopPropagation(); setCancelAsk(true); }} className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${chip} active:scale-95 cursor-pointer flex-shrink-0`}>신청 취소</span>
                            </div>
                        )
                    ) : myReg?.status === 'waiting' ? (
                        (fillOn && !(teamReady && myTeamInfo)) ? (
                            <div className="w-full flex-1 flex items-center justify-center gap-6 py-1">
                                <span role="button" onClick={(e)=>{ e.stopPropagation(); setCancelAsk(true); }}
                                    className={`flex-shrink-0 flex flex-col items-center justify-center rounded-full active:scale-95 transition-all cursor-pointer ${ink}`}
                                    style={{ width:180, height:180, background: dark?'rgba(0,0,0,0.10)':'rgba(255,255,255,0.16)', border: `2px solid ${dark?'rgba(0,0,0,0.16)':'rgba(255,255,255,0.40)'}` }}>
                                    <Icon.Clock size={38}/>
                                    <span className="font-black text-[22px] mt-1.5">신청 취소</span>
                                </span>
                                <div className="flex flex-col gap-3 min-w-0">
                                    <span className={`flex items-center gap-1 text-sm font-black ${ink80}`}><Icon.Clock size={15} className="flex-shrink-0"/>대기 중</span>
                                    <div>
                                        <p className={`text-[11px] font-black ${ink70} mb-0.5`}>내 대기 순번</p>
                                        <p className={`text-[26px] font-black ${ink} leading-none`}>{myReg.waitingNumber || '-'}<span className="text-base font-black ml-0.5">번</span></p>
                                    </div>
                                    <div>
                                        <p className={`text-[11px] font-black ${ink70} mb-0.5`}>현재 인원</p>
                                        <p className={`text-[26px] font-black ${ink} leading-none`}>{curCount}<span className="text-base font-black ml-0.5">명</span></p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-2">
                                <span className={`flex items-center gap-1.5 text-sm font-black ${ink} min-w-0`}><Icon.Clock size={16} className="flex-shrink-0"/><span className="truncate">대기 {myReg.waitingNumber || ''}번</span></span>
                                <span role="button" onClick={(e)=>{ e.stopPropagation(); setCancelAsk(true); }} className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${chip} active:scale-95 cursor-pointer flex-shrink-0`}>신청 취소</span>
                            </div>
                        )
                    ) : (myReg?.status === 'absent' || myReg?.status === 'noshow') ? (
                        <div className="flex items-center justify-between gap-2">
                            <span className={`flex items-center gap-1.5 text-sm font-black ${ink} min-w-0`}>
                                <Icon.AlertTriangle size={15} className="flex-shrink-0"/>
                                <span className="truncate">{myReg.status === 'noshow' ? `노쇼 신청됨${myReg.noShowFine ? ` · 벌금 ${myReg.noShowFine/10000}만원` : ''}` : '불참 신청됨'}</span>
                            </span>
                            {undoAbsentOk && (
                                <span role="button" onClick={onUndoAbsent} className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${chip} active:scale-95 cursor-pointer flex-shrink-0`}>{myReg.status === 'noshow' ? '노쇼' : '불참'} 취소</span>
                            )}
                        </div>
                    ) : regAfterClose ? (
                        <div className={`flex items-center gap-1.5 text-xs font-black ${ink70}`}><Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">신청 마감</span></div>
                    ) : (regPenaltyUnpaid > 0) ? (
                        <div className={`text-xs font-black ${ink70} text-center py-1`}>미납 벌금이 있어 신청할 수 없어요</div>
                    ) : (regDuesBlock && regDuesUnpaid) ? (
                        <div className={`text-xs font-black ${ink70} text-center py-1`}>회비 미납 — 신청할 수 없어요</div>
                    ) : (
                        <div className={fillOn ? 'w-full' : ''}>
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-sm font-black ${ink80}`}>{kind==='match' ? '매칭 신청' : (regFCFS ? '선착순 신청' : '모임 신청')}</span>
                                <span className={`text-xs font-black ${ink70}`}>{kind==='match' ? `현재 ${curCount} · 남${meeting.maxMale||0}·여${meeting.maxFemale||0}` : `현재 ${curCount} / ${meeting.maxLimit||18}명`}</span>
                            </div>
                            <span role="button" onClick={onHomeApply}
                                className="w-full flex items-center justify-center gap-2 rounded-2xl font-black cursor-pointer active:scale-95"
                                style={{ background:'#C2F94A', color:'#15171E', padding: fillOn ? '17px' : '14px', fontSize: fillOn ? '17px' : '15px', boxShadow:'0 12px 24px -12px rgba(194,249,74,.95)' }}>
                                <Icon.CheckSq size={fillOn ? 20 : 16}/> 신청하기
                            </span>
                            <span role="button" onClick={onHomeDecline}
                                className={`w-full flex items-center justify-center gap-2 rounded-2xl font-black cursor-pointer active:scale-95 mt-2.5 ${ink}`}
                                style={{ padding:'13px', fontSize:'14px', background: dark?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.12)', border:`1.5px solid ${dark?'rgba(0,0,0,0.18)':'rgba(255,255,255,0.32)'}` }}>
                                <Icon.X size={15}/> 이번엔 미참할게요
                            </span>
                        </div>
                    )}
                </div>
            )}
            {isAdminMode && showRegBlock && !regBeforeOpen && (
                <div className={`mt-2 flex items-center justify-center gap-1.5 text-[11px] font-black ${ink70}`}>
                    <Icon.Users size={12} className="flex-shrink-0 opacity-70"/>
                    <span>신청 {regAgg.applied} · 미참 {regAgg.declined} · 미응답 {undecidedCount}</span>
                </div>
            )}
            {isActive ? (
                <div className={`mt-4 pt-4 border-t space-y-2.5 ${fillOn ? 'flex-1 flex flex-col justify-center' : ''}`} style={{borderColor: softBorder}}>
                    {/* 출석 상태 — 출석체크 시점(당일/모임중)이 되면 체크 버튼, 완료 시 완료 표시 */}
                    {mySession?.checkedIn ? (
                        <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1.5 text-sm font-black ${dark?'text-emerald-700':'text-live'} min-w-0`}>
                                <Icon.Check size={16} className="flex-shrink-0"/><span className="truncate">출석 완료</span>
                            </span>
                            <span className={`ml-auto text-xs font-black ${ink70} flex-shrink-0`}>{mySession.checkInTime}</span>
                        </div>
                    ) : (dayInfo.type==='today' || dayInfo.type==='started') ? (
                        (kind === 'self' && teamReady) ? (
                            <div>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-live moida-pulse-live flex-shrink-0"></span>
                                    <span className={`text-[13px] font-black ${ink}`}>지금 출석 체크하세요</span>
                                </div>
                                <div className="flex gap-2.5">
                                    <span role="button" onClick={(e)=>{ e.stopPropagation(); onInlineGPS && onInlineGPS(); }}
                                        className="flex-1 min-w-0 rounded-2xl p-4 bg-white active:scale-95 transition-all flex flex-col justify-between cursor-pointer" style={{minHeight:'104px'}}>
                                        <Icon.MapPin size={32} className="text-teal-600"/>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">GPS 출석</p>
                                            <p className="font-black text-[15px] leading-tight text-teal-700">위치 확인</p>
                                        </div>
                                    </span>
                                    {enableQR && (
                                        <span role="button" onClick={(e)=>{ e.stopPropagation(); onInlineQR && onInlineQR(); }}
                                            className={`flex-1 min-w-0 rounded-2xl p-4 ${ink} active:scale-95 transition-all flex flex-col justify-between cursor-pointer`} style={{minHeight:'104px', background: dark?'rgba(0,0,0,0.10)':'rgba(255,255,255,0.14)'}}>
                                            <Icon.QrCode size={32} className={ink}/>
                                            <div className="min-w-0">
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${ink70}`}>QR 출석</p>
                                                <p className={`font-black text-[15px] leading-tight ${ink}`}>스캔하기</p>
                                            </div>
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : kind === 'self' ? (
                            <div className="flex items-center gap-1.5 text-xs text-white/70">
                                <Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">{allowFromDisplay ? `${allowFromDisplay}부터 출석 가능` : '곧 출석이 열립니다'}</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-2 -mx-1.5 px-3 py-2.5 rounded-xl" style={{background: dark?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.2)'}}>
                                <span className={`flex items-center gap-1.5 text-sm font-black ${ink} min-w-0`}>
                                    <Icon.CheckSq size={16} className="flex-shrink-0"/><span className="truncate">지금 출석 체크하기</span>
                                </span>
                                <Icon.ChevronRight size={16} className={`${ink80} flex-shrink-0`}/>
                            </div>
                        )
                    ) : (
                        <div className={`flex items-center gap-1.5 text-xs ${ink70}`}>
                            <Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">모임 당일에 출석 체크가 열립니다</span>
                        </div>
                    )}
                    {/* 팀 상태 — 팀편성 OFF면 참여 명단, 아니면 공개 시점에 내 팀 표시 */}
                    {meeting.meetingType === 'match' ? (
                        <div className={`flex items-center gap-1.5 text-sm font-black ${ink} min-w-0`}>
                            <Icon.Users size={16} className={`flex-shrink-0 ${ink80}`}/><span className="truncate">참여 명단 {curCount}명</span>
                        </div>
                    ) : myTeamInfo && (teamReady || mySession?.checkedIn) ? (
                        fillOn ? (
                            <div className="py-1">
                                {/* 내 유니폼 번호 — 조끼색 배지 + 흰 링(카드와 같은 색이어도 떠 보이게) */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{width:56, height:56, background: VEST_HEX[myTeamIdx], boxShadow:`0 0 0 3px ${vestLightText?'rgba(21,23,30,0.28)':'rgba(255,255,255,0.85)'}, 0 5px 14px rgba(0,0,0,0.2)`}}>
                                        <span className="font-black leading-none" style={{fontSize:28, color: vestLightText?'#15171E':'#ffffff'}}>{myTeamInfo.jerseyNumber}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-xs font-black ${ink85} leading-snug`}>오늘 {memberData?.name || '회원'}님은</p>
                                        <p className={`text-[17px] font-black ${ink} leading-snug mt-0.5`}>{getTeamColorName(myTeamIdx)}색 {myTeamInfo.jerseyNumber}번<span className="text-sm">이에요!</span></p>
                                    </div>
                                </div>
                                {/* 이번 경기 상대 — 확정 매치표 있을 때만, 조끼 발표와 같은 문장 스타일. 상대 배지만 상대 조끼색 */}
                                {(() => {
                                    const r = getMyCurrentRoundMatch(scheduleData, myTeamInfo.teamName);
                                    if (!r) return null;
                                    if (r.allDone) return (
                                        <div className="mt-2.5 pt-2.5 flex items-center gap-3" style={{borderTop:`1px solid ${softBorder}`}}>
                                            <div className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{width:56, height:56, background: dark?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.22)'}}>
                                                <Icon.Check size={28} className={ink}/>
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-black ${ink85} leading-snug`}>오늘 경기는</p>
                                                <p className={`text-[17px] font-black ${ink} leading-snug mt-0.5`}>모두 끝났어요!</p>
                                                <p className={`text-[11px] font-black ${ink70} mt-1`}>수고하셨어요 👏</p>
                                            </div>
                                        </div>
                                    );
                                    const oppLight = (r.oppIdx === 2 || r.oppIdx === 3); // 연두·노랑 = 밝은 조끼 → 배지 글자 어둡게
                                    return (
                                        <div className="mt-2.5 pt-2.5 flex items-center gap-3" style={{borderTop:`1px solid ${softBorder}`}}>
                                            {r.resting ? (<>
                                                <div className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{width:56, height:56, background: dark?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.22)'}}>
                                                    <Icon.Coffee size={26} className={ink}/>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-black ${ink85} leading-snug`}>이번 라운드는</p>
                                                    <p className={`text-[17px] font-black ${ink} leading-snug mt-0.5`}>쉬어가요</p>
                                                </div>
                                            </>) : r.opponent ? (<>
                                                <div className={`flex items-center justify-center rounded-2xl flex-shrink-0 ${getTeamBadge(r.oppIdx)}`} style={{width:56, height:56, boxShadow:'0 5px 14px rgba(0,0,0,0.18)'}}>
                                                    <span className="font-black leading-none" style={{fontSize:28, color: oppLight?'#15171E':'#ffffff'}}>{r.opponent}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-black ${ink85} leading-snug`}>이번 경기 상대는</p>
                                                    <p className={`text-[17px] font-black ${ink} leading-snug mt-0.5`}>{getTeamColorName(r.oppIdx)}팀<span className="text-sm">이에요!</span></p>
                                                    <p className={`text-[11px] font-black ${ink70} mt-1 flex items-center gap-1`}><Icon.MapPin size={12} className="flex-shrink-0"/>{r.fieldName}에서 만나요</p>
                                                </div>
                                            </>) : null}
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <span className="w-9 h-9 rounded-xl flex items-center justify-center font-black flex-shrink-0" style={{background: VEST_HEX[myTeamIdx], color: vestLightText?'#15171E':'#ffffff', fontSize:17, boxShadow:`0 0 0 2px ${vestLightText?'rgba(21,23,30,0.25)':'rgba(255,255,255,0.8)'}, 0 2px 6px rgba(0,0,0,0.15)`}}>{myTeamInfo.jerseyNumber}</span>
                                <span className={`text-sm font-black ${ink} min-w-0 truncate`}>오늘 {memberData?.name || '회원'}님은 {getTeamColorName(myTeamIdx)}색 {myTeamInfo.jerseyNumber}번!</span>
                            </div>
                        )
                    ) : mySession?.checkedIn ? (
                        <div className={`flex items-center gap-1.5 text-xs ${ink70}`}>
                            <Icon.Users size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">팀 편성 준비 중</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-white/70">
                            <Icon.Users size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">팀 편성 비공개 중{allowFromDisplay?` · ${allowFromDisplay}부터 공개`:''}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-4 pt-4 border-t" style={{borderColor: softBorder}}>
                    <div className={`flex items-center gap-1.5 text-xs ${ink70}`}>
                        <Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">모임이 가까워지면 출석·팀 정보가 표시됩니다</span>
                    </div>
                </div>
            )}
            {/* 관리자: 카드에서 바로 수정/삭제 */}
            {isAdminMode && (onEditMeeting || onDeleteMeeting) && (
                <div className="mt-3 pt-3 border-t flex items-center justify-end gap-1.5" style={{borderColor: softBorder}}>
                    {onEditMeeting && <span role="button" onClick={(e)=>{ e.stopPropagation(); onEditMeeting(meeting); }}
                        className={`flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg ${chip} active:scale-95 cursor-pointer`}><Icon.Edit size={12}/> 수정</span>}
                    {onDeleteMeeting && <span role="button" onClick={(e)=>{ e.stopPropagation(); onDeleteMeeting(meeting); }}
                        className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-rose-500/80 text-white active:scale-95 cursor-pointer"><Icon.Trash size={12}/> 삭제</span>}
                </div>
            )}
        </button>
        {/* 매치판 크게 보기 모달 (정의는 tab-match.js, 홈에서 재사용) */}
        {boardOpen && hasBoard && (
            <MatchBoardModal
                sessions={scheduleData.schedule.list}
                fieldNames={scheduleData.config?.fieldNames || []}
                startIndex={(matchLocalIndex ?? scheduleData.currentMatchIndex) ?? 0}
                dateLabel={scheduleData.meetingDate || meeting.date}
                onClose={() => setBoardOpen(false)}
                isAdmin={isAdminMode}
                mode={isAdminMode ? 'all' : 'mine'}
                myTeamInfo={myTeamInfo}
                currentIndex={(matchLocalIndex ?? scheduleData.currentMatchIndex) ?? 0}
                completedMatches={matchCompleted || new Set(scheduleData.completedMatches || [])}
                onPrev={onMatchPrev} onNext={onMatchNext}
                onToggleComplete={onMatchToggleComplete} onAutoAdvance={onMatchAutoAdvance} />
        )}
        {/* 관리자: 모임 종료 시간이 지나면 카드 위에 '모임 종료' 버튼 (누르면 그날 출석 기록 저장) */}
        {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-3xl">
                <button onClick={onEndMeeting} className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg">모임 종료</button>
            </div>
        )}

        {/* 신청 완료 팝업 (+내 순번) */}
        {donePopup && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 animate-in"
                style={{ background:'rgba(15,23,42,.46)', backdropFilter:'blur(2px)' }}
                onClick={() => setDonePopup(null)}>
                <div className="bg-white rounded-3xl p-7 pt-8 max-w-[320px] w-full text-center"
                    style={{ boxShadow:'0 30px 70px -22px rgba(0,0,0,.45)' }}
                    onClick={e => e.stopPropagation()}>
                    <div className="w-[66px] h-[66px] rounded-full mx-auto mb-4 flex items-center justify-center text-white"
                        style={{ background: donePopup.type === 'waiting' ? '#F59E0B' : '#183FB0' }}>
                        {donePopup.type === 'waiting' ? <Icon.Clock size={32}/> : <Icon.Check size={34}/>}
                    </div>
                    <p className="text-[13px] font-black text-slate-400">{donePopup.type === 'waiting' ? '대기 신청 완료' : '신청 완료'}</p>
                    <p className="text-[32px] font-black text-slate-900 mt-1 mb-0.5">
                        {donePopup.type === 'waiting'
                            ? <>대기 <span style={{color:'#F59E0B'}}>{donePopup.pos}</span>번</>
                            : <>참가 <span style={{color:'#f97316'}}>{donePopup.pos}</span>번째</>}
                    </p>
                    <p className="text-[12.5px] font-bold text-slate-400 mt-1 leading-relaxed whitespace-pre-line">
                        {donePopup.type === 'waiting'
                            ? '정원이 차서 대기로 등록됐어요.\n자리가 나면 자동으로 확정돼요.'
                            : `선착순 ${donePopup.pos} / ${meeting.maxLimit||18}명으로 신청됐어요.`}
                    </p>
                    <button onClick={() => setDonePopup(null)}
                        className="mt-5 w-full py-3.5 rounded-2xl text-white font-black text-[15px] active:scale-95"
                        style={{ background:'#f97316' }}>확인</button>
                </div>
            </div>
        )}

        {/* 신청 취소 확인 팝업 (재신청 시 순번 밀림 안내) */}
        {cancelAsk && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 animate-in"
                style={{ background:'rgba(15,23,42,.46)', backdropFilter:'blur(2px)' }}
                onClick={() => setCancelAsk(false)}>
                <div className="bg-white rounded-3xl p-7 pt-8 max-w-[320px] w-full text-center"
                    style={{ boxShadow:'0 30px 70px -22px rgba(0,0,0,.45)' }}
                    onClick={e => e.stopPropagation()}>
                    <div className="w-[66px] h-[66px] rounded-full mx-auto mb-4 flex items-center justify-center text-white"
                        style={{ background:'#F59E0B' }}>
                        <span className="text-[34px] font-black leading-none">!</span>
                    </div>
                    <p className="text-[18px] font-black text-slate-900">신청을 취소할까요?</p>
                    <div className="mt-3.5 text-left text-[12px] font-bold leading-relaxed rounded-2xl px-3.5 py-3"
                        style={{ background:'#fff7ed', border:'1px solid #fed7aa', color:'#9a3412' }}>
                        지금 취소하면 다시 신청할 때 <b className="whitespace-nowrap">순번이 맨 뒤로 밀려요.</b> 정원이 찼다면 대기로 넘어갈 수 있어요.
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={() => setCancelAsk(false)}
                            className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-black text-[14.5px] active:scale-95">그대로 둘게요</button>
                        <button onClick={() => { setCancelAsk(false); regHandlers && regHandlers.handleCancel(); }}
                            className="flex-1 py-3.5 rounded-2xl text-white font-black text-[14.5px] active:scale-95"
                            style={{ background:'#EF4444' }}>신청 취소</button>
                    </div>
                </div>
            </div>
        )}

        {/* 불참/노쇼 신청 — 사유 입력 팝업 */}
        {absentAsk && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 animate-in"
                style={{ background:'rgba(15,23,42,.46)', backdropFilter:'blur(2px)' }}
                onClick={() => { setAbsentAsk(false); setAbsentReason(''); }}>
                <div className="bg-white rounded-3xl p-7 pt-8 max-w-[330px] w-full"
                    style={{ boxShadow:'0 30px 70px -22px rgba(0,0,0,.45)' }}
                    onClick={e => e.stopPropagation()}>
                    <div className="w-[66px] h-[66px] rounded-full mx-auto mb-4 flex items-center justify-center text-white"
                        style={{ background: absentColor }}>
                        <Icon.AlertTriangle size={30}/>
                    </div>
                    <p className="text-[18px] font-black text-slate-900 text-center">{absentType==='noshow_2' ? '당일 노쇼 신청' : isNoshowStage ? '노쇼 신청' : '불참 신청'}</p>
                    <p className="text-[12.5px] font-bold text-slate-400 text-center mt-1.5 leading-relaxed">{absentType==='noshow_2' ? '당일 노쇼로 기록되고 벌금 2만원이 부과돼요.' : absentFine>0 ? '노쇼로 기록되고 벌금 1만원이 부과돼요.' : '미리 알려주셔서 벌금 없이 처리돼요.'}</p>
                    <textarea value={absentReason} onChange={e => setAbsentReason(e.target.value)} rows={2} maxLength={200}
                        placeholder={isNoshowStage ? '노쇼 사유 (선택) — 예: 갑작스런 일정' : '불참 사유 (선택) — 예: 컨디션 난조'}
                        className="w-full mt-4 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"/>
                    <div className="text-left text-[11.5px] font-bold leading-relaxed rounded-2xl px-3.5 py-2.5 mt-2"
                        style={{ background:'#fff7ed', border:'1px solid #fed7aa', color:'#9a3412' }}>
                        담당 운영진에게 알림이 가요. 다시 참석하려면 취소할 수 있지만 <b className="whitespace-nowrap">순번은 맨 뒤로</b> 밀려요.
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => { setAbsentAsk(false); setAbsentReason(''); }}
                            className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-black text-[14.5px] active:scale-95">그대로 둘게요</button>
                        <button onClick={onAbsentConfirm}
                            className="flex-1 py-3.5 rounded-2xl text-white font-black text-[14.5px] active:scale-95"
                            style={{ background: absentColor }}>{absentType==='noshow_2' ? '당일 노쇼' : isNoshowStage ? '노쇼' : '불참'} 신청</button>
                    </div>
                </div>
            </div>
        )}

        {/* 담당자 본인 불참/노쇼 확정 시 담당자 교체 팝업 (공용 — modals.js ManagerPickModal) */}
        <ManagerPickModal open={mgrPickOpen} meeting={meeting} managers={managers} onPick={onChangeManager} onClose={() => setMgrPickOpen(false)} />
        </div>
    );
};
// ─── 회비 납부 (모임 계좌 + 송금 바로가기) ──────────────────────────────────────
// 홈 탭 카드. 회원: 계좌 보기·복사 + 토스/카카오페이로 바로 송금. 관리자: 계좌 정보 등록/수정.
// 저장: settings/club_account { bank, accountNo, holder, tossUrl, kakaoUrl, amountHint, updatedAt, updatedBy }
// ※ 입금 "자동 확인"은 은행 자격이 필요해 불가 → 누르면 송금 화면이 열리는 데까지 지원.
const normUrl = (u) => { const s = (u||'').trim(); return s ? (/^https?:\/\//i.test(s) ? s : 'https://'+s) : ''; };
const DUES_FEE_DEFAULTS = { monthlyFee:30000, restFee:10000, halfYearFee:150000, fullYearFee:300000 };
const DUES_LABELS = { monthly:'월납', rest:'휴식', half_year:'반년납', full_year:'1년납' };
const wonFmt = (n) => (Number(n)||0).toLocaleString('ko-KR');
const DuesAccountCard = ({ isAdminMode, memberName, memberInfo, mode = 'full', onGoDues, previewAsMember = false }) => {
    const { useState, useEffect } = React;
    const [acc, setAcc] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ bank:'', accountNo:'', holder:'', tossUrl:'', kakaoUrl:'', kakaoMonthly:'', kakaoRest:'', kakaoHalf:'', kakaoFull:'', amountHint:'', monthlyFee:'', restFee:'', halfYearFee:'', fullYearFee:'', blockUnpaid:false });
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState('');
    const [sel, setSel] = useState('monthly');
    const [report, setReport] = useState(null);
    const [monthStatus, setMonthStatus] = useState(null);   // 관리자가 회원관리에서 직접 처리한 이번 달 회비 상태(paid/rest)
    const [submitting, setSubmitting] = useState(false);
    const [popupOff, setPopupOff] = useState(false);
    const [confirmType, setConfirmType] = useState(null);   // 토스/카카오 송금 후 복귀 시 '신고할까요?' 확인
    const paySentTypeRef = React.useRef(null);
    // 뒤로가기로 회비 설정 편집 화면 닫기 (안드로이드)
    window.useMoidaBack && window.useMoidaBack(isEditing, () => setIsEditing(false));

    const memberId = memberInfo?.id || null;

    useEffect(() => {
        const unsub = getCol('settings').doc('club_account').onSnapshot(d => setAcc(d.exists ? d.data() : null));
        return () => unsub();
    }, []);

    // ── 대상 월 / 표시 시점 (매월 1일 7일 전부터 다음 달 회비 노출, 3일 전부터 팝업) ──
    const now = new Date();
    const Y = now.getFullYear(), Mo = now.getMonth(), D = now.getDate();
    const dim = new Date(Y, Mo + 1, 0).getDate();
    const inPreWindow = D >= dim - 6;    // 다음 달 1일 7일 전부터
    const inPopupWindow = D >= dim - 2;  // 다음 달 1일 3일 전부터
    const tgt = inPreWindow ? new Date(Y, Mo + 1, 1) : new Date(Y, Mo, 1);
    const targetMonth = `${tgt.getFullYear()}-${String(tgt.getMonth() + 1).padStart(2, '0')}`;
    const targetMonLabel = `${tgt.getMonth() + 1}월`;
    const todayKey = `${Y}-${Mo + 1}-${D}`;

    useEffect(() => {
        if (!memberId) { setReport(null); return; }
        const unsub = getCol('dues_reports').doc(`${targetMonth}_${memberId}`).onSnapshot(d => setReport(d.exists ? d.data() : null));
        return () => unsub();
    }, [memberId, targetMonth]);

    // 관리자가 회원관리에서 직접 처리한 회비/휴식도 반영(회원 신고 기록이 없어도 중복 신고 방지):
    // monthly_checks 의 이번 달 문서에서 본인 상태(paid/rest)를 읽어온다.
    useEffect(() => {
        if (!memberId) { setMonthStatus(null); return; }
        const unsub = getMonthlyCol().doc(targetMonth).onSnapshot(d => {
            const st = (d.exists && d.data().statuses) || {};
            setMonthStatus(st[memberId] || null);
        });
        return () => unsub();
    }, [memberId, targetMonth]);

    // 송금 버튼으로 토스/카카오를 열고 앱으로 돌아오면 '송금 마치셨어요?'를 한 번 물어보고 신고.
    // (앱이 입금 자체를 자동 감지할 수는 없어, 복귀 시 본인 확인 한 번으로 처리 — 안 보냈으면 신고 안 됨)
    useEffect(() => {
        const onVis = () => {
            if (document.visibilityState === 'visible' && paySentTypeRef.current) {
                setConfirmType(paySentTypeRef.current);
                paySentTypeRef.current = null;
            }
        };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    const fee = (k, def) => { const v = Number(acc?.[k]); return (v && v > 0) ? v : def; };
    const fees = {
        monthly: fee('monthlyFee', DUES_FEE_DEFAULTS.monthlyFee),
        rest: fee('restFee', DUES_FEE_DEFAULTS.restFee),
        half_year: fee('halfYearFee', DUES_FEE_DEFAULTS.halfYearFee),
        full_year: fee('fullYearFee', DUES_FEE_DEFAULTS.fullYearFee),
    };
    const ms = memberInfo ? getMembershipStatus(memberInfo, targetMonth) : null;
    // 개발자가 [회원] 모드로 미리볼 땐 운영진 면제를 풀어 일반 회원처럼 회비 화면(미납/납부)을 표시
    const isExempt = (memberInfo ? STAFF_ROLES.includes(memberInfo.role) : false) && !previewAsMember;
    const feeFor = (k) => { if (k === 'rest') { return (ms && ms.active && ms.remainingRest > 0) ? 0 : fees.rest; } return fees[k] || 0; };
    // 입금자명: 회원명 (O월 회비 / O월 휴식비 / 반년납 / 1년납)
    const cleanMemberName = (memberName || '').replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B50}-\u{2BFF}\u{FE00}-\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
    const depositNameFor = (k) => {
        const suffix = k === 'monthly' ? `${targetMonLabel} 회비`
            : k === 'rest' ? `${targetMonLabel} 휴식비`
            : k === 'half_year' ? '반년납'
            : k === 'full_year' ? '1년납' : '';
        return `${cleanMemberName} (${suffix})`.trim();
    };
    const depositName = depositNameFor(sel);

    const openEdit = () => {
        setForm({ bank:acc?.bank||'', accountNo:acc?.accountNo||'', holder:acc?.holder||'', tossUrl:acc?.tossUrl||'', kakaoUrl:acc?.kakaoUrl||'',
            kakaoMonthly:acc?.kakaoMonthly||'', kakaoRest:acc?.kakaoRest||'', kakaoHalf:acc?.kakaoHalf||'', kakaoFull:acc?.kakaoFull||'', amountHint:acc?.amountHint||'',
            monthlyFee:acc?.monthlyFee||'', restFee:acc?.restFee||'', halfYearFee:acc?.halfYearFee||'', fullYearFee:acc?.fullYearFee||'', blockUnpaid:!!acc?.blockUnpaid });
        setIsEditing(true);
    };
    const handleSave = async () => {
        if (!form.accountNo.trim() && !form.tossUrl.trim() && !form.kakaoUrl.trim() && !form.kakaoMonthly.trim() && !form.kakaoRest.trim() && !form.kakaoHalf.trim() && !form.kakaoFull.trim()) return;
        setIsSaving(true);
        try {
            await getCol('settings').doc('club_account').set({
                bank:form.bank.trim(), accountNo:form.accountNo.trim(), holder:form.holder.trim(),
                tossUrl:normUrl(form.tossUrl), kakaoUrl:normUrl(form.kakaoUrl),
                kakaoMonthly:normUrl(form.kakaoMonthly), kakaoRest:normUrl(form.kakaoRest), kakaoHalf:normUrl(form.kakaoHalf), kakaoFull:normUrl(form.kakaoFull),
                amountHint:form.amountHint.trim(),
                monthlyFee:Number(form.monthlyFee)||0, restFee:Number(form.restFee)||0,
                halfYearFee:Number(form.halfYearFee)||0, fullYearFee:Number(form.fullYearFee)||0,
                blockUnpaid:!!form.blockUnpaid,
                updatedAt:new Date().toISOString(), updatedBy:memberName||'관리자',
            }, { merge:true });
            setIsEditing(false);
        } catch(e) { console.warn('계좌 저장 실패:', e); }
        finally { setIsSaving(false); }
    };
    const copyText = async (t, key) => {
        if (!t) return;
        try { await navigator.clipboard.writeText(t); }
        catch { try { const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch(_){} }
        setCopied(key || 'x'); setTimeout(()=>setCopied(''), 1600);
    };
    const infoRow = (label, value, key, withBorder) => (
        <div className={`flex items-center justify-between gap-2 ${withBorder?'border-t border-white/15 pt-2':''}`}>
            <div className="min-w-0">
                <p className="text-[10px] text-white/70 font-black">{label}</p>
                <p className="text-base font-black text-white leading-tight break-all">{value}</p>
            </div>
            <button onClick={()=>copyText(value, key)} className="px-2.5 py-1.5 rounded-lg bg-white/25 text-white text-xs font-black shrink-0 active:scale-95 transition-all flex items-center gap-1">
                {copied===key ? <><Icon.Check size={13}/>복사됨</> : '복사'}
            </button>
        </div>
    );
    const submitReport = async (payType) => {
        if (!memberId) return;
        setSubmitting(true);
        try {
            await getCol('dues_reports').doc(`${targetMonth}_${memberId}`).set({
                memberId, memberName:memberName||'', month:targetMonth, payType,
                amount:feeFor(payType), depositName:depositNameFor(payType),
                reportedAt:new Date().toISOString(), status:'pending',
            });
        } catch(e) { console.warn('납부 신고 실패:', e); }
        finally { setSubmitting(false); }
    };
    const field = (label, k, ph, optional, numeric) => (
        <div className="mb-2.5">
            <label className="block text-[11px] font-black text-slate-500 mb-1">{label}{optional && <span className="text-slate-300 font-bold"> (선택)</span>}</label>
            <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} inputMode={numeric?'numeric':'text'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700"/>
        </div>
    );

    // ── 편집 화면 (관리자) ──
    if (isEditing) {
        return (
            <div className="card rounded-2xl p-5">
                <p className="font-black text-base text-slate-800 mb-3">모임 계좌 · 회비 설정</p>
                {field('은행','bank','예) 카카오뱅크')}
                {field('계좌번호','accountNo','예) 3333-01-1234567')}
                {field('예금주','holder','예) 홍길동')}
                <p className="text-[11px] font-black text-slate-500 mb-1 mt-1">회비 금액 (원)</p>
                <div className="grid grid-cols-2 gap-x-2">
                    {field('월납','monthlyFee','30000', true, true)}
                    {field('휴식비','restFee','10000', true, true)}
                    {field('반년납','halfYearFee','150000', true, true)}
                    {field('1년납','fullYearFee','300000', true, true)}
                </div>
                {field('토스 송금 링크','tossUrl','예) toss.me/otpfc', true)}
                {field('카카오페이 송금 링크 (공통)','kakaoUrl','예) qr.kakaopay.com/...', true)}
                <p className="text-[11px] font-black text-slate-500 mb-1 mt-1">카카오페이 유형별 링크 (금액 고정 · 선택)</p>
                <div className="grid grid-cols-2 gap-x-2">
                    {field('월납 링크','kakaoMonthly','금액 고정 링크', true)}
                    {field('휴식 링크','kakaoRest','금액 고정 링크', true)}
                    {field('반년납 링크','kakaoHalf','금액 고정 링크', true)}
                    {field('1년납 링크','kakaoFull','금액 고정 링크', true)}
                </div>
                {field('추가 안내','amountHint','예) 신입 첫 달 반값', true)}
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3"><b className="text-[#3182f6]">토스</b>는 위 <b>은행·계좌번호</b>만 채우면 회원이 고른 유형의 <b>금액까지 자동으로 채워진</b> 송금화면이 열려요(폰에 토스 앱 설치 시). 토스 송금 링크 칸은 비워도 됩니다. 금액을 비우면 기본값(월납 3만·휴식 1만·반년 15만·1년 30만)으로 안내됩니다. 카카오페이는 유형별 칸에 <b>금액을 정해 만든 링크</b>를 넣으면 그 유형 선택 시 금액이 적힌 송금화면이 열려요(비우면 공통 링크).</p>
                <label className="flex items-center justify-between gap-3 mb-3 bg-slate-50 rounded-xl px-3 py-2.5">
                    <span className="min-w-0">
                        <span className="block text-[13px] font-black text-slate-700">미납자 모임 신청 차단</span>
                        <span className="block text-[11px] text-slate-400">끄면 경고만 / 켜면 미납 시 신청 버튼이 막힘</span>
                    </span>
                    <input type="checkbox" checked={!!form.blockUnpaid} onChange={e=>setForm(f=>({...f,blockUnpaid:e.target.checked}))} className="w-5 h-5 shrink-0 accent-emerald-500"/>
                </label>
                <div className="flex gap-2">
                    <button onClick={()=>setIsEditing(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    <button onClick={handleSave} disabled={isSaving} className={`flex-1 py-3 rounded-2xl font-black text-sm ${isSaving?'bg-emerald-300 text-white':'bg-emerald-500 text-white'}`}>{isSaving?'저장 중...':'저장'}</button>
                </div>
            </div>
        );
    }

    // ── 계좌 미등록 ── (회원에겐 숨김, 관리자에겐 등록 안내)
    if (!acc || (!acc.accountNo && !acc.tossUrl && !acc.kakaoUrl && !acc.kakaoMonthly && !acc.kakaoRest && !acc.kakaoHalf && !acc.kakaoFull)) {
        if (mode === 'banner') return null;
        if (!isAdminMode) return null;
        return (
            <button onClick={openEdit} className="w-full card rounded-2xl p-4 text-left border-emerald-100 active:scale-98 transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0"><Icon.CreditCard size={20} className="text-emerald-500"/></div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-emerald-600">회비 계좌 등록하기</p>
                        <p className="text-xs text-slate-400 mt-0.5">계좌·송금 링크를 등록하면 회원이 홈에서 바로 회비를 보낼 수 있어요</p>
                    </div>
                    <Icon.ChevronRight size={16} className="text-emerald-300 flex-shrink-0"/>
                </div>
            </button>
        );
    }

    // ── 회비 납부 상태 영역 계산 ──
    let dues = null, showPayPrompt = false;
    if (memberInfo) {
        if (!joinedByMonth(memberInfo, targetMonth)) {
            dues = null;   // 가입월(duesStartMonth) 이전 — 아직 회비 대상 아님(미납/납부유도 안 뜸)
        } else if (isExempt) {
            dues = null;
        } else if (ms && ms.active && ms.remaining > 1) {
            dues = (
                <div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-3">
                    <p className="text-sm font-black text-white flex items-center gap-1.5"><Icon.Check size={15} className="flex-shrink-0"/>{ms.type}납 회원 · 만료 {ms.endDateFormatted}</p>
                    <p className="text-[11px] text-white/75 mt-0.5">남은 휴식 면제 {ms.remainingRest}회</p>
                    {monthStatus==='rest' || (report && (report.status==='pending'||report.status==='confirmed'))
                        ? <p className="text-[11px] text-white/80 mt-1 flex items-center gap-1">{(report && report.status==='pending')?<><Icon.Hourglass size={12} className="flex-shrink-0"/>휴식 신청 확인 대기 중</>:<><Icon.Check size={12} className="flex-shrink-0"/>휴식 처리됨</>}</p>
                        : <button onClick={()=>submitReport('rest')} disabled={submitting} className="mt-2 px-3 py-1.5 rounded-lg bg-white/25 text-white font-black text-xs active:scale-95 transition-all">{submitting?'처리 중...':`이번 달 쉬어요 (${feeFor('rest')===0?'면제':wonFmt(feeFor('rest'))+'원'})`}</button>}
                </div>
            );
        } else if (monthStatus === 'paid') {
            // 관리자가 회원관리에서 직접 납부 처리 → 신고 기록이 없어도 완료로 표시(중복 신고 차단)
            dues = (<div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-3"><p className="text-sm font-black text-white flex items-center gap-1.5"><Icon.Check size={15} className="flex-shrink-0"/>{targetMonLabel} 회비 완료</p></div>);
        } else if (monthStatus === 'rest') {
            dues = (<div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-3"><p className="text-sm font-black text-white flex items-center gap-1.5"><Icon.Check size={15} className="flex-shrink-0"/>{targetMonLabel} 휴식 처리됨</p></div>);
        } else if (report && report.status==='confirmed') {
            dues = (<div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-3"><p className="text-sm font-black text-white flex items-center gap-1.5"><Icon.Check size={15} className="flex-shrink-0"/>{targetMonLabel} 회비 완료</p></div>);
        } else if (report && report.status==='pending') {
            dues = (<div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-3"><p className="text-sm font-black text-white flex items-center gap-1.5"><Icon.Hourglass size={14} className="flex-shrink-0"/>{targetMonLabel} 회비 확인 대기 중</p><p className="text-[11px] text-white/80 mt-0.5">{DUES_LABELS[report.payType]||''} {wonFmt(report.amount)}원 · 관리자 확인 후 완료돼요</p></div>);
        } else {
            showPayPrompt = true;
            const isRenew = ms && ms.active && ms.remaining <= 1;
            dues = (
                <div className="bg-white/15 rounded-2xl px-3 py-3 mb-3">
                    <p className="text-sm font-black text-white mb-2 flex items-center gap-1.5">{isRenew ? <><Icon.AlertTriangle size={15} className="flex-shrink-0"/>{ms.type}납 곧 만료 ({ms.endDateFormatted}) · 갱신해 주세요</> : <span>{targetMonLabel} 회비를 납부해 주세요</span>}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {['monthly','rest','half_year','full_year'].map(k => (
                            <button key={k} onClick={()=>setSel(k)} className={`py-2 rounded-xl font-black text-xs transition-all ${sel===k?'bg-white text-emerald-700':'bg-white/20 text-white'}`}>{DUES_LABELS[k]} · {feeFor(k)===0?'면제':wonFmt(feeFor(k))+'원'}</button>
                        ))}
                    </div>
                </div>
            );
        }
    }

    const popupKey = `moida_dues_popup_${targetMonth}`;
    let dismissedToday = false;
    try { dismissedToday = localStorage.getItem(popupKey) === todayKey; } catch(_) {}
    const showPopup = showPayPrompt && inPopupWindow && !popupOff && !dismissedToday;
    const dismissPopup = () => { try { localStorage.setItem(popupKey, todayKey); } catch(_) {} setPopupOff(true); };

    // ── 홈(배너 모드): 납부 시기일 때만 슬림 배너 + 팝업. 평소엔 숨겨 홈을 깔끔하게. ──
    if (mode === 'banner') {
        if (!showPayPrompt) return null;
        const isRenew = ms && ms.active && ms.remaining <= 1;
        return (
            <>
            <button onClick={onGoDues} className="w-full rounded-2xl px-4 py-3 text-left text-white active:scale-98 transition-all flex items-center gap-3" style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow:'0 8px 22px -8px rgba(217,119,6,0.5)' }}>
                <Icon.CreditCard size={24} className="text-white flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm leading-tight truncate">{isRenew ? `${ms.type}납 갱신 시기예요` : `${targetMonLabel} 회비 납부 시기예요`}</p>
                    <p className="text-[11px] text-white/80 mt-0.5 truncate">눌러서 회비 탭에서 납부하기</p>
                </div>
                <span className="text-xs font-black bg-white/25 px-3 py-1.5 rounded-xl flex-shrink-0">납부하기</span>
            </button>
            {showPopup && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={dismissPopup}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl" onClick={e=>e.stopPropagation()}>
                        <div className="flex justify-center mb-2"><Icon.CreditCard size={36} className="text-amber-500"/></div>
                        <p className="font-black text-lg text-slate-800">{targetMonLabel} 회비 납부</p>
                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">곧 {targetMonLabel}이 시작돼요.<br/>잊지 말고 회비를 납부해 주세요!</p>
                        <button onClick={()=>{ dismissPopup(); onGoDues && onGoDues(); }} className="mt-4 w-full py-3 rounded-2xl bg-amber-500 text-white font-black text-sm active:scale-95 transition-all">납부하러 가기</button>
                    </div>
                </div>
            )}
            </>
        );
    }

    // 카카오페이 송금 링크: 회원이 회비 유형을 고르는 중이면 그 유형의 '금액 고정 링크'를,
    // 없거나 그 외 상황이면 공통 링크를 사용. (면제(0원)일 땐 유형별 링크 대신 공통 사용)
    const kakaoPerType = { monthly: acc.kakaoMonthly, rest: acc.kakaoRest, half_year: acc.kakaoHalf, full_year: acc.kakaoFull };
    const kakaoHref = (showPayPrompt && feeFor(sel) > 0 && kakaoPerType[sel]) ? kakaoPerType[sel] : (acc.kakaoUrl || '');

    // 토스 송금: 은행+계좌번호만 있으면 회원이 고른 유형의 금액이 채워진 토스 딥링크를 자동 생성.
    // (supertoss://send — 폰에 토스 앱 설치 시 은행·계좌·금액까지 채워진 송금화면이 열림. toss.me 링크는 fallback)
    const tossAuto = (acc.bank && acc.accountNo)
        ? `supertoss://send?bank=${encodeURIComponent((acc.bank||'').trim())}&accountNo=${(acc.accountNo||'').replace(/[^0-9]/g,'')}&amount=${feeFor(sel)}&origin=app`
        : '';
    const tossHref = (showPayPrompt && feeFor(sel) > 0 && tossAuto) ? tossAuto : (acc.tossUrl || '');
    // 앱 스킴(supertoss://)은 새 탭이 아니라 현재 창에서 열어야 토스 앱이 호출됨. http(s)는 새 탭.
    const openSend = (url) => { if (!url) return; if (/^https?:\/\//i.test(url)) window.open(url, '_blank'); else window.location.href = url; };
    // 송금 버튼: 토스/카카오를 열면서, 회원이 유형을 고른 상태면 복귀 시 신고 확인을 띄우도록 표시.
    const handlePaySend = (url) => { openSend(url); if (showPayPrompt && feeFor(sel) > 0) paySentTypeRef.current = sel; };

    // ── 계좌 표시 + 회비 납부 (회원·관리자 공통) ──
    return (
        <>
        <div className="rounded-2xl p-4 text-white" style={{ background: showPayPrompt ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,var(--c-success),#059669)', boxShadow: showPayPrompt ? '0 10px 28px -8px rgba(217,119,6,0.45)' : '0 10px 28px -8px rgba(5,150,105,0.45)' }}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <Icon.CreditCard size={22} className="text-white flex-shrink-0 mt-0.5"/>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/80">회비 납부</p>
                        {/* 예금주 옆에 계좌번호 + 작은 복사 (좁으면 줄바꿈) */}
                        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mt-0.5">
                            <span className="font-black text-[15px] leading-tight">{acc.bank||'모임 계좌'}{acc.holder?` · ${acc.holder}`:''}</span>
                            {acc.accountNo && <span className="font-black text-[15px] leading-tight break-all">{acc.accountNo}</span>}
                            {acc.accountNo && (
                                <button onClick={()=>copyText(acc.accountNo,'acc')} className="px-2 py-0.5 rounded-md bg-white/25 text-white text-[11px] font-black shrink-0 active:scale-95 transition-all inline-flex items-center gap-0.5">
                                    {copied==='acc' ? <><Icon.Check size={11}/>복사됨</> : '복사'}
                                </button>
                            )}
                        </div>
                        {acc.amountHint && <p className="text-[11px] font-black text-white/70 mt-1">{acc.amountHint}</p>}
                    </div>
                </div>
                {isAdminMode && (
                    <button onClick={openEdit} className="p-2 rounded-xl bg-white/20 text-white shrink-0 active:scale-95 transition-all"><Icon.Edit size={15}/></button>
                )}
            </div>
            {dues}
            {/* 계좌번호·복사·금액안내는 상단 헤더(예금주 옆)로 이동 → 카드 축소 */}
            <div className="space-y-2">
                {(tossHref || kakaoHref) && (
                    <div className="flex gap-2">
                        {tossHref && <button onClick={()=>handlePaySend(tossHref)} className="flex-1 py-2.5 rounded-xl bg-white text-[#3182f6] font-black text-sm active:scale-95 transition-all">토스로 보내기</button>}
                        {kakaoHref && <button onClick={()=>handlePaySend(kakaoHref)} className="flex-1 py-2.5 rounded-xl font-black text-sm active:scale-95 transition-all" style={{background:'#FEE500',color:'#3c1e1e'}}>카카오페이로 보내기</button>}
                    </div>
                )}
                {showPayPrompt && (
                    <button onClick={()=>submitReport(sel)} disabled={submitting} className="w-full py-3 rounded-xl bg-white text-amber-700 font-black text-sm active:scale-95 transition-all">{submitting?'처리 중...':'송금했어요 (납부 신고)'}</button>
                )}
            </div>
        </div>
        {confirmType && (!report || report.status !== 'confirmed') && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={()=>setConfirmType(null)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <div className="flex justify-center mb-2"><Icon.Banknote size={36} className="text-rose-500"/></div>
                    <p className="font-black text-lg text-slate-800">송금 마치셨어요?</p>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{DUES_LABELS[confirmType]||''} {wonFmt(feeFor(confirmType))}원 납부로 신고할게요.<br/>아직 안 보냈으면 '아직요'를 누르세요.</p>
                    <div className="flex gap-2 mt-4">
                        <button onClick={()=>setConfirmType(null)} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black text-sm active:scale-95 transition-all">아직요</button>
                        <button onClick={async()=>{ await submitReport(confirmType); setConfirmType(null); }} disabled={submitting} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-black text-sm active:scale-95 transition-all">{submitting?'처리 중...':'네, 신고할게요'}</button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};
// ─── 지각 / 노쇼 벌금 납부 카드 ────────────────────────────────────────────────
// penalties/{meetingId}_{memberId} { memberId, memberName, meetingId, meetingDate, type, amount, status('unpaid'|'reported'|'paid'), reason }
// mode 'full'(회비 탭)=회원 납부 + 관리자 확정/삭제, mode 'banner'(홈)=회원 미납 슬림 배너. 회비 토스 송금 로직 재사용.
const PENALTY_TYPE_LABEL = { late: '지각', noshow_notified_1: '노쇼(전날 통보)', noshow_notified_2: '노쇼(당일 통보)', noshow_no_notice: '노쇼(무통보)' };
const PenaltyPayCard = ({ isAdminMode, memberName, memberInfo, managers = [], mode = 'full', onGoDues }) => {
    const { useState, useEffect } = React;
    const [acc, setAcc] = useState(null);
    const [myList, setMyList] = useState([]);
    const [allList, setAllList] = useState([]);
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const memberId = memberInfo?.id || null;

    useEffect(() => {
        const unsub = getCol('settings').doc('club_account').onSnapshot(d => setAcc(d.exists ? d.data() : null));
        return () => unsub();
    }, []);
    useEffect(() => {
        if (!memberId) { setMyList([]); return; }
        const unsub = getCol('penalties').where('memberId', '==', memberId).onSnapshot(s => {
            setMyList(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.status !== 'paid')
                .sort((a, b) => (a.meetingDate || '').localeCompare(b.meetingDate || '')));
        });
        return () => unsub();
    }, [memberId]);
    useEffect(() => {
        if (!isAdminMode || mode !== 'full') { setAllList([]); return; }
        const unsub = getCol('penalties').onSnapshot(s => {
            setAllList(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.status !== 'paid')
                .sort((a, b) => (b.meetingDate || '').localeCompare(a.meetingDate || '')));
        });
        return () => unsub();
    }, [isAdminMode, mode]);

    const fmtWon = (n) => (n || 0).toLocaleString() + '원';
    const copyText = (t) => { try { navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_) {} };
    const cleanName = (memberName || '').replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B50}-\u{2BFF}\u{FE00}-\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
    const myUnpaid = myList.filter(p => p.status === 'unpaid');
    const myReported = myList.filter(p => p.status === 'reported');
    const payTotal = myUnpaid.reduce((s, p) => s + (p.amount || 0), 0);
    const myTotal = myList.reduce((s, p) => s + (p.amount || 0), 0);
    const depositName = `${cleanName} (벌금)`;
    const tossAuto = (acc?.bank && acc?.accountNo && payTotal > 0)
        ? `supertoss://send?bank=${encodeURIComponent((acc.bank || '').trim())}&accountNo=${(acc.accountNo || '').replace(/[^0-9]/g, '')}&amount=${payTotal}&origin=app`
        : '';
    const openSend = (url) => { if (!url) return; if (/^https?:\/\//i.test(url)) window.open(url, '_blank'); else window.location.href = url; };

    const reportPaid = async () => {
        if (myUnpaid.length === 0 || busy) return;
        setBusy(true);
        try {
            const now = new Date().toISOString();
            await Promise.all(myUnpaid.map(p => getCol('penalties').doc(p.id).update({ status: 'reported', reportedAt: now })));
            const staffIds = (managers || []).map(m => m.id).filter(Boolean);
            if (staffIds.length > 0) {
                await getCol('notifications').add({
                    title: '벌금 납부 신고', body: `${cleanName}님이 벌금 ${fmtWon(payTotal)}을 납부했다고 신고했어요. 확인 후 확정해주세요.`,
                    category: '벌금', type: 'penalty', pushOnly: true, targetMemberIds: staffIds,
                    sentAt: now, sentBy: cleanName,
                });
            }
        } catch (_) {}
        setBusy(false);
    };
    const confirmPaid = async (p) => { try { await getCol('penalties').doc(p.id).update({ status: 'paid', paidAt: new Date().toISOString() }); } catch (_) {} };
    const deletePenalty = async (p) => { try { await getCol('penalties').doc(p.id).delete(); } catch (_) {} };

    // 홈 슬림 배너 (회원 · 미납 있을 때만)
    if (mode === 'banner') {
        if (isAdminMode || myList.length === 0) return null;
        return (
            <button onClick={onGoDues} className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-white active:scale-98 transition-all" style={{ background:'linear-gradient(135deg,#f43f5e,#e11d48)', boxShadow:'0 8px 22px -8px rgba(244,63,94,0.5)' }}>
                <Icon.Banknote size={16} className="text-white flex-shrink-0"/>
                <span className="flex-1 text-left font-black text-sm truncate">미납 벌금 {myList.length}건 · {fmtWon(myTotal)}</span>
                <span className="text-xs font-black shrink-0 inline-flex items-center gap-0.5">납부하기 <Icon.ChevronRight size={13}/></span>
            </button>
        );
    }

    const showMember = !isAdminMode && myList.length > 0;
    const showAdmin = isAdminMode && allList.length > 0;
    if (!showMember && !showAdmin) return null;

    return (
        <div className="card rounded-2xl p-5 border-2 border-rose-100">
            <div className="flex items-center gap-2 mb-3">
                <Icon.Banknote size={18} className="text-rose-500 flex-shrink-0"/>
                <h3 className="font-black text-base text-slate-800">지각 · 노쇼 벌금</h3>
            </div>
            {showMember && (
                <>
                    <div className="space-y-1.5 mb-3">
                        {myList.map(p => (
                            <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 min-w-0">
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm text-slate-700 truncate">{p.meetingDate} · {PENALTY_TYPE_LABEL[p.type] || '벌금'}</p>
                                    {p.reason && <p className="text-[10px] text-slate-400 truncate">사유: {p.reason}</p>}
                                </div>
                                <span className="text-sm font-black text-rose-600 shrink-0">{fmtWon(p.amount)}</span>
                                {p.status === 'reported' && <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-lg shrink-0">확인중</span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between px-1 mb-3">
                        <span className="text-xs font-black text-slate-500">납부할 금액</span>
                        <span className="text-lg font-black text-rose-600">{fmtWon(payTotal)}</span>
                    </div>
                    {acc?.accountNo && (
                        <button onClick={() => copyText(`${acc.bank ? acc.bank + ' ' : ''}${acc.accountNo}`)}
                            className="w-full mb-2 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-1">
                            {copied ? <><Icon.Check size={13} />복사됨</> : '계좌번호 복사'}
                        </button>
                    )}
                    {payTotal > 0 ? (
                        <div className="flex gap-2">
                            {tossAuto && <button onClick={() => openSend(tossAuto)} className="flex-1 py-2.5 rounded-xl bg-white border border-[#3182f6] text-[#3182f6] font-black text-sm active:scale-95 transition-all">토스로 보내기</button>}
                            <button onClick={reportPaid} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-black text-sm active:scale-95 transition-all disabled:opacity-50">{busy ? '처리 중...' : '보냈어요'}</button>
                        </div>
                    ) : myReported.length > 0 ? (
                        <p className="text-[11px] text-slate-400 text-center">관리자 확인을 기다리는 중입니다.</p>
                    ) : null}
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">미납 벌금이 있으면 다음 모임 신청이 제한됩니다. '보냈어요'는 송금 후 눌러주세요(관리자 확인 뒤 해제).</p>
                </>
            )}
            {showAdmin && (
                <div className="space-y-1.5">
                    {allList.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 min-w-0">
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-sm text-slate-700 truncate">{p.memberName} <span className="text-slate-400 font-medium">· {p.meetingDate}</span></p>
                                <p className="text-[10px] text-slate-400 truncate">{PENALTY_TYPE_LABEL[p.type] || '벌금'} {fmtWon(p.amount)}{p.reason ? ' · ' + p.reason : ''}</p>
                            </div>
                            {p.status === 'reported'
                                ? <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-lg shrink-0">보냈대요</span>
                                : <span className="text-[10px] font-black bg-rose-100 text-rose-500 px-2 py-0.5 rounded-lg shrink-0">미납</span>}
                            <button onClick={() => confirmPaid(p)} className="text-[10px] font-black bg-emerald-500 text-white px-2 py-1 rounded-lg shrink-0 active:scale-95">확정</button>
                            <button onClick={() => deletePenalty(p)} className="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-1 rounded-lg shrink-0 active:scale-95">삭제</button>
                        </div>
                    ))}
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">'확정'을 누르면 납부 완료 처리되고 그 회원의 모임 신청 제한이 풀립니다.</p>
                </div>
            )}
        </div>
    );
};
// ─── 회비 탭: 회비 납부 내역 (최근 6개월) ─────────────────────────────────────
// monthly_checks/{월}.statuses[회원ID] = 'paid'(정상)/'rest'(휴식). 저장된 값을 읽기만 함(쓰기 0).
const DuesHistoryCard = ({ memberInfo, isExempt = false, embedded = false }) => {
    const { useState, useEffect } = React;
    const [rows, setRows] = useState(null); // null=불러오는 중, []=없음
    const memberId = memberInfo?.id || null;
    useEffect(() => {
        if (!memberId || isExempt) { setRows([]); return; }   // 운영진(면제)이면 조회 안 함
        const now = new Date();
        const months = [];
        for (let i = 1; i <= 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${d.getMonth() + 1}월` });
        }
        let alive = true;
        Promise.all(months.map(m => getMonthlyCol().doc(m.key).get()
            .then(s => ({ ...m, status: (s.exists && s.data().statuses) ? s.data().statuses[memberId] : null }))
            .catch(() => ({ ...m, status: null }))))
            .then(res => { if (alive) setRows(res.filter(r => (r.status === 'paid' || r.status === 'rest') && joinedByMonth(memberInfo, r.key))); });
        return () => { alive = false; };
    }, [memberId, isExempt]);
    return (
        <div>
            {!embedded && <h3 className="font-black text-base text-slate-800 px-1 mb-2">회비 납부 내역</h3>}
            <div className="card rounded-2xl px-4 divide-y divide-slate-100">
                {isExempt ? (
                    <div className="flex items-center justify-center gap-1.5 py-4">
                        <Icon.Check size={15} className="text-emerald-500 flex-shrink-0"/>
                        <span className="text-sm font-black text-slate-500">운영진은 회비 면제 대상이에요</span>
                    </div>
                ) : rows === null ? (
                    <p className="text-sm text-slate-400 font-bold py-4 text-center">불러오는 중…</p>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold py-4 text-center">최근 납부 내역이 없습니다</p>
                ) : rows.map(r => (
                    <div key={r.key} className="flex items-center justify-between py-3.5">
                        <span className="font-black text-sm text-slate-700">{r.label} 회비</span>
                        {r.status === 'rest'
                            ? <span className="text-xs font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">휴식</span>
                            : <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">정상</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};
// ─── 개발 모드 전용: 내 회비 상태 빠른 토글 (확인용 — 내 계정·최근 7개월만 실제로 씀) ──
//   운영진은 회비 면제라 monthly_checks에 기록이 없다 → 회원 모드에서 회비 화면을 확인하려면 임시로 채운다.
//   [납부완료]=최근7개월 paid / [이번달 휴식]=이번달 rest / [전부 미납]=내 statuses 삭제(면제 원상복구).
const DevDuesToggle = ({ memberInfo }) => {
    const { useState } = React;
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const id = memberInfo?.id || null;
    const monthKeys = () => {
        const now = new Date(); const arr = [];
        for (let i = 0; i <= 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
        return arr;
    };
    const apply = async (mode) => {
        if (!id || busy) return;
        setBusy(true); setMsg('');
        try {
            const FV = firebase.firestore.FieldValue;
            const batch = db.batch();
            monthKeys().forEach((k, idx) => {
                const ref = getMonthlyCol().doc(k);
                if (mode === 'clear') batch.set(ref, { statuses: { [id]: FV.delete() }, updatedAt: new Date().toISOString() }, { merge: true });
                else if (mode === 'paid') batch.set(ref, { statuses: { [id]: 'paid' }, updatedAt: new Date().toISOString() }, { merge: true });
                else if (mode === 'rest_this' && idx === 0) batch.set(ref, { statuses: { [id]: 'rest' }, updatedAt: new Date().toISOString() }, { merge: true });
            });
            await batch.commit();
            setMsg(mode === 'clear' ? '전부 미납(면제)으로 되돌렸어요' : mode === 'paid' ? '최근 7개월 납부완료로 채웠어요 — 회원 모드에서 확인' : '이번 달 휴식으로 표시했어요');
        } catch (e) { setMsg('실패: ' + (e?.message || e)); }
        setBusy(false);
    };
    // 벌금(노쇼비) 부여 — penalties 문서를 미납(unpaid)으로 생성. devtest 표식으로 안전 삭제.
    const PEN = [['late', '지각', 5000], ['noshow_notified_1', '노쇼·전날통보', 10000], ['noshow_notified_2', '노쇼·당일통보', 20000], ['noshow_no_notice', '노쇼·무통보', 30000]];
    const givePenalty = async (type, amount) => {
        if (!id || busy) return;
        setBusy(true); setMsg('');
        try {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            await getCol('penalties').doc(`devtest-${type}_${id}`).set({
                memberId: id, memberName: memberInfo?.name || '',
                meetingId: 'devtest', meetingDate: today,
                type, amount, status: 'unpaid', reason: '개발 테스트',
                createdAt: now.toISOString(), notifiedAt: now.toISOString(), isTest: true,
            });
            setMsg('벌금 부여됨(미납) — [회원] 모드 회비 탭에서 확인');
        } catch (e) { setMsg('실패: ' + (e?.message || e)); }
        setBusy(false);
    };
    const clearPenalties = async () => {
        if (!id || busy) return;
        setBusy(true); setMsg('');
        try {
            const snap = await getCol('penalties').where('memberId', '==', id).get();
            const batch = db.batch(); let n = 0;
            snap.docs.forEach(d => { if (d.data().isTest || String(d.id).startsWith('devtest-')) { batch.delete(d.ref); n++; } });
            if (n > 0) await batch.commit();
            setMsg(`테스트 벌금 ${n}건 삭제됨`);
        } catch (e) { setMsg('실패: ' + (e?.message || e)); }
        setBusy(false);
    };
    return (
        <div className="rounded-2xl p-3 border border-amber-200 bg-amber-50/60">
            <p className="text-[11px] font-black text-amber-700 mb-1 flex items-center gap-1"><Icon.Wrench size={12} />회비·벌금 상태 테스트 (개발 모드 · 내 계정만)</p>
            <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">회비·벌금 상황을 부여해 [회원] 모드에서 어떻게 보이는지 확인하세요. 끝나면 [전부 미납]·[벌금 전부 삭제]로 원상복구됩니다.</p>
            <p className="text-[10px] font-black text-slate-400 mb-1">회비</p>
            <div className="flex gap-2 mb-2.5">
                <button disabled={busy} onClick={() => apply('paid')} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white font-black text-xs active:scale-95 transition-all disabled:opacity-50">납부완료</button>
                <button disabled={busy} onClick={() => apply('rest_this')} className="flex-1 py-2 rounded-xl bg-sky-500 text-white font-black text-xs active:scale-95 transition-all disabled:opacity-50">이번 달 휴식</button>
                <button disabled={busy} onClick={() => apply('clear')} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-black text-xs active:scale-95 transition-all border border-slate-200 disabled:opacity-50">전부 미납</button>
            </div>
            <p className="text-[10px] font-black text-slate-400 mb-1">벌금 부여(미납)</p>
            <div className="grid grid-cols-2 gap-2">
                {PEN.map(([t, l, a]) => (
                    <button key={t} disabled={busy} onClick={() => givePenalty(t, a)} className="py-2 rounded-xl bg-rose-500 text-white font-black text-[11px] active:scale-95 transition-all disabled:opacity-50">{l} {a.toLocaleString()}</button>
                ))}
            </div>
            <button disabled={busy} onClick={clearPenalties} className="w-full mt-2 py-2 rounded-xl bg-slate-100 text-slate-500 font-black text-xs active:scale-95 transition-all border border-slate-200 disabled:opacity-50">벌금 전부 삭제</button>
            {msg && <p className="text-[10px] font-bold text-slate-500 mt-2">{msg}</p>}
        </div>
    );
};
// ─── 회비 탭: 벌금 내역 (납부완료된 지난 벌금) ─────────────────────────────────
// penalties에서 내 status='paid'만 모음. 미납은 위 PenaltyPayCard가 처리. 읽기만 함(쓰기 0).
const PenaltyHistoryCard = ({ memberInfo }) => {
    const { useState, useEffect } = React;
    const [list, setList] = useState([]);
    const memberId = memberInfo?.id || null;
    useEffect(() => {
        if (!memberId) { setList([]); return; }
        const unsub = getCol('penalties').where('memberId', '==', memberId).onSnapshot(s => {
            setList(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.status === 'paid')
                .sort((a, b) => (b.paidAt || b.meetingDate || '').localeCompare(a.paidAt || a.meetingDate || '')));
        });
        return () => unsub();
    }, [memberId]);
    if (list.length === 0) return null;
    const fmtWon = (n) => (n || 0).toLocaleString() + '원';
    return (
        <div>
            <h3 className="font-black text-base text-slate-800 px-1 mb-2">벌금 내역</h3>
            <div className="card rounded-2xl px-4 divide-y divide-slate-100">
                {list.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 py-3.5 min-w-0">
                        <div className="min-w-0">
                            <p className="font-black text-sm text-slate-700 truncate">{p.meetingDate} · {PENALTY_TYPE_LABEL[p.type] || '벌금'}</p>
                            <p className="text-[11px] font-black text-emerald-500 mt-0.5">납부완료</p>
                        </div>
                        <span className="text-sm font-black text-slate-400 shrink-0">{fmtWon(p.amount)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
// ─── 홈: 회비 납부 신고 알림 (관리자 전용) ──────────────────────────────────────
// 회비 탭 깊숙이 있던 신고 목록을 홈 상단에서 한눈에 보고 바로 확정/삭제할 수 있게.
// 대기 신고가 없으면 표시 안 함(홈을 깔끔하게 유지). duesReports는 회비 탭과 동일 소스.
const DuesReportsHomeCard = ({ duesReports, onConfirm, onReject, onGoDuesTab }) => {
    const pend = Object.values(duesReports || {}).filter(r => r && r.status === 'pending');
    if (!pend.length) return null;
    return (
        <div className="rounded-2xl p-4 border-2 border-amber-300 bg-amber-50">
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <p className="font-black text-sm text-amber-700 flex items-center gap-1.5">
                    <Icon.Bell size={16} className="text-amber-600 flex-shrink-0"/> 회비 납부 신고 {pend.length}건
                </p>
                {onGoDuesTab && (
                    <button onClick={onGoDuesTab} className="text-[11px] font-black text-amber-600 bg-amber-100 px-2.5 py-1 rounded-lg active:scale-95 transition-all shrink-0">회비 탭에서 보기</button>
                )}
            </div>
            <div className="space-y-1.5">
                {pend.map(r => (
                    <div key={r.memberId+'_'+r.month} className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 border border-amber-100">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{r.memberName||'회원'}</p>
                            <p className="text-[11px] text-slate-400">{r.month} · {DUES_LABELS[r.payType]||''} {wonFmt(r.amount)}원</p>
                        </div>
                        <button onClick={()=>onConfirm && onConfirm(r)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-black shrink-0 active:scale-95 transition-all">확정</button>
                        <button onClick={()=>onReject && onReject(r)} className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-black shrink-0 active:scale-95 transition-all">삭제</button>
                    </div>
                ))}
            </div>
        </div>
    );
};
// ─── 홈: 내 출석 현황 카드 (history 집계 · 모든 회원이 자기 것만) ─────────────────
// history.records[].status = 정상/지각/노쇼/대기. 내 memberId 기록만 모아 집계.
// 출석률 = (정상+지각) ÷ 참가확정(정상+지각+노쇼). '대기' 제외. 기록 없으면 카드 숨김.
const MyAttendanceCard = ({ attendHistory, memberInfo, memberName, embedded = false }) => {
    const myId = memberInfo?.id;
    const mine = React.useMemo(() => {
        if (!myId) return [];
        const out = [];
        (attendHistory || []).forEach(h => {
            const rec = (h.records || []).find(r => r.memberId === myId);
            if (rec && rec.status && rec.status !== '대기') out.push({ date: h.date || '', status: rec.status });
        });
        return out.sort((a, b) => (b.date || '').localeCompare(a.date || '')); // 최신순
    }, [attendHistory, myId]);

    if (!myId || mine.length === 0) return null;

    const go = mine.filter(m => m.status === '정상').length;
    const late = mine.filter(m => m.status === '지각').length;
    const no = mine.filter(m => m.status === '노쇼').length;
    const confirmed = go + late + no;
    const rate = confirmed ? Math.round((go + late) / confirmed * 100) : 0;
    let streak = 0;
    for (const m of mine) { if (m.status === '정상' || m.status === '지각') streak++; else break; }
    const recent = mine.slice(0, 10).reverse(); // 오래된→최근
    const dotCls = (s) => s === '정상' ? 'bg-emerald-500' : s === '지각' ? 'bg-amber-500' : 'bg-rose-500';
    const dotTxt = (s) => s === '정상' ? '출' : s === '지각' ? '지' : '노';

    return (
        <div>
            {!embedded && <h3 className="font-black text-base text-slate-800 px-1 mb-2">내 출석 현황</h3>}
            <div className="card rounded-2xl p-5">
                <div className="flex items-center gap-4">
                    <div className="w-[116px] h-[116px] rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: `conic-gradient(#183FB0 0% ${rate}%, #e6ebf5 ${rate}% 100%)` }}>
                        <div className="w-[88px] h-[88px] rounded-full bg-white flex flex-col items-center justify-center">
                            <span className="text-[27px] font-black text-teal-600 leading-none">{rate}%</span>
                            <span className="text-[10px] font-black text-slate-400 mt-0.5">출석률</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date().getFullYear()} 시즌</p>
                        <p className="text-lg font-black text-slate-800 leading-tight truncate">{memberName || ''} 님</p>
                        <p className="text-[11.5px] font-bold text-slate-400 mt-0.5">참가확정 {confirmed}회 중 {go + late}회 출석</p>
                        {streak >= 2 && <span className="inline-flex items-center gap-1 mt-2.5 text-[11.5px] font-black px-2.5 py-1 rounded-full bg-live text-[#15171E]">🔥 {streak}회 연속 출석 중</span>}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-xl py-2.5 text-center bg-emerald-50"><p className="text-xl font-black text-emerald-600 leading-none">{go}</p><p className="text-[10.5px] font-black text-emerald-600 mt-1">출석</p></div>
                    <div className="rounded-xl py-2.5 text-center bg-amber-50"><p className="text-xl font-black text-amber-600 leading-none">{late}</p><p className="text-[10.5px] font-black text-amber-600 mt-1">지각</p></div>
                    <div className="rounded-xl py-2.5 text-center bg-rose-50"><p className="text-xl font-black text-rose-500 leading-none">{no}</p><p className="text-[10.5px] font-black text-rose-500 mt-1">노쇼</p></div>
                </div>
                {recent.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[11px] font-black text-slate-400 mb-2">최근 모임</p>
                        <div className="flex gap-1.5 flex-wrap">
                            {recent.map((m, i) => (
                                <span key={i} className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[11px] font-black text-white ${dotCls(m.status)}`}>{dotTxt(m.status)}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
// ─── 홈 '다음 정기모임 미리보기' / '예정 모임 없음(작게)' ───────────────────────
// 예정 모임 문서가 없을 때(=홈 빈자리) 정기모임 설정이 켜져 있으면 다음 회차 정보를 미리 보여준다.
// computeUpcomingMeetingDates(handlers-meetings.js)는 member.html에 없을 수 있어 의존하지 않고 직접 계산.
const _WD_KR = ['일','월','화','수','목','금','토'];
const _nextWeekdayDate = (weekday) => {   // 오늘이 그 요일이면 오늘부터
    const base = new Date(); base.setHours(0, 0, 0, 0);
    const d0 = (Number(weekday) - base.getDay() + 7) % 7;
    const t = new Date(base); t.setDate(base.getDate() + d0);
    const mo = String(t.getMonth() + 1).padStart(2, '0'), da = String(t.getDate()).padStart(2, '0');
    return `${t.getFullYear()}-${mo}-${da}`;
};
const RecurringPreviewCard = ({ onTabChange }) => {
    const { useState, useEffect } = React;
    const [cfg, setCfg] = useState(undefined);   // undefined=로딩, null=없음/꺼짐, object=설정됨
    const [ovr, setOvr] = useState(null);        // 다음 회차 날짜별 지정(구장 우선용)
    useEffect(() => {
        const unsub = getCol('settings').doc('recurring_meeting').onSnapshot(d => {
            const data = d.exists ? d.data() : null;
            setCfg(data && data.enabled ? data : null);
        }, () => setCfg(null));
        return () => unsub();
    }, []);
    const nextDate = cfg ? _nextWeekdayDate(cfg.weekday ?? 0) : null;
    useEffect(() => {
        if (!nextDate) { setOvr(null); return; }
        let alive = true;
        getCol('recurring_overrides').doc(nextDate).get()
            .then(s => { if (alive) setOvr(s.exists ? s.data() : null); }).catch(() => {});
        return () => { alive = false; };
    }, [nextDate]);

    if (cfg === undefined) return null;   // 로딩 중엔 아무 것도(깜빡임 방지)

    // 정기모임 미설정/꺼짐 → 작은 '예정 모임 없음' 한 줄 카드
    if (!cfg) {
        return (
            <button onClick={() => onTabChange('meeting-list')} className="w-full card rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left active:scale-98 transition-all">
                <Icon.Calendar size={18} className="text-slate-300 flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-500">예정된 모임이 없어요</p>
                    <p className="text-[11.5px] text-slate-400 font-bold mt-0.5">모임 탭에서 등록할 수 있어요</p>
                </div>
                <Icon.ChevronRight size={18} className="text-slate-300 flex-shrink-0"/>
            </button>
        );
    }

    // 정기모임 설정됨 → 다음 회차를 '옅은 정보 카드'로 표시(신청 전이라 차분하게, 진짜 신청 버튼과 위계 구분)
    const _md = nextDate ? new Date(nextDate + 'T00:00:00') : null;
    const ok = _md && !isNaN(_md.getTime());
    const dDay = ok ? _md.getDate() : '';
    const dMon = ok ? ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'][_md.getMonth()] : '';
    const dDow = ok ? _WD_KR[_md.getDay()] : '';
    const loc = (ovr && ovr.location) || cfg.defaultLocation || '';
    // 신청 오픈 시각 = uploadWeekday/uploadHour 기준(해당 회차 주). 서버 생성=신청오픈과 일치.
    let openLabel = '', openPassed = false, hasOpen = false;
    if (ok && cfg.uploadWeekday != null && cfg.uploadHour != null) {
        const backDays = (Number(cfg.weekday) - Number(cfg.uploadWeekday) + 7) % 7;
        const openD = new Date(_md); openD.setDate(_md.getDate() - backDays); openD.setHours(Number(cfg.uploadHour), 0, 0, 0);
        hasOpen = true;
        openPassed = Date.now() >= openD.getTime();
        openLabel = `${openD.getMonth() + 1}/${openD.getDate()} ${String(Number(cfg.uploadHour)).padStart(2, '0')}:00`;
    }
    return (
        <button onClick={() => onTabChange('meeting-list')}
            className="w-full card rounded-3xl p-5 text-left active:scale-98 transition-all">
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <p className="text-xs font-black uppercase tracking-widest text-teal-600">정기모임</p>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-teal-50 text-teal-600 flex-shrink-0">신청 전</span>
            </div>
            <div className="flex items-end gap-3 mb-3">
                <span className="text-[44px] font-black leading-none text-teal-600">{dDay}</span>
                <div className="pb-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{dMon}</p>
                    <p className="text-sm font-black text-slate-500">{dDow}요일</p>
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-sm font-black text-slate-600 flex items-center gap-1.5"><Icon.Clock size={14} className="text-slate-400 flex-shrink-0"/>{cfg.start} ~ {cfg.end}</p>
                {loc && <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5 min-w-0"><Icon.MapPin size={14} className="text-slate-400 flex-shrink-0"/><span className="truncate">{loc}</span></p>}
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100 text-center">
                {openPassed ? (
                    <p className="text-sm font-black text-teal-600">곧 신청이 열려요</p>
                ) : (
                    <>
                        <p className="text-sm font-black text-slate-500">신청 시작 전</p>
                        <p className="text-xs text-slate-400 mt-0.5">{hasOpen ? `${openLabel} 부터 신청 가능` : '모임 날짜가 되면 자동으로 열려요'}</p>
                    </>
                )}
            </div>
        </button>
    );
};

// ─── 홈 '내 활동' 간략 카드 ──────────────────────────────────────────────────
// 예정 모임이 없을 때 홈이 휑하지 않도록 채우는 요약 카드(자세히는 MY 탭).
// 계산은 MyAttendanceCard와 동일(attendHistory에서 내 기록만). 기록 없으면 첫 참여 유도.
// 진입 시 0→1 로 올라가는 진행도(easeOutCubic). 마운트 시 1회 실행(데이터 준비 후 본문 마운트 기준).
const actEaseOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const useActCountUp = (duration) => {
    const [t, setT] = React.useState(0);
    React.useEffect(() => {
        let raf; const start = performance.now();
        const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            setT(actEaseOutCubic(p));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);
    return t;
};
// 출석률(0~100) → 빨강(0)·주황(50)·초록(100) 보간 (노쇼#EF4444·지각#F59E0B·출석#059669 팔레트)
const actRateColor = (rate) => {
    const r = Math.max(0, Math.min(100, rate)) / 100;
    const red = [239, 68, 68], amber = [245, 158, 11], green = [5, 150, 105];
    let a, b, tt;
    if (r < 0.5) { a = red; b = amber; tt = r / 0.5; }
    else { a = amber; b = green; tt = (r - 0.5) / 0.5; }
    const m = a.map((v, i) => Math.round(v + (b[i] - v) * tt));
    return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
};
// 슬롯머신 숫자: 0~9 릴이 여러 바퀴 빠르게 돌다가 ease-out으로 최종 숫자에 서서히 멈춤
const ACT_SLOT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const ActSlotDigit = ({ d, delay, duration }) => {
    const LOOPS = 5;
    const cells = [];
    for (let l = 0; l < LOOPS; l++) for (let n = 0; n < 10; n++) cells.push(n);
    for (let n = 0; n <= d; n++) cells.push(n);
    const finalIndex = LOOPS * 10 + d;
    const [y, setY] = React.useState(0);
    React.useEffect(() => {
        let r1, r2;
        r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setY(finalIndex)); });
        return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }, []);
    return (
        <span style={{ display: 'inline-block', height: '1em', lineHeight: '1em', overflow: 'hidden', verticalAlign: 'bottom' }}>
            <span style={{ display: 'flex', flexDirection: 'column', transform: `translateY(-${y}em)`, transition: `transform ${duration}ms ${ACT_SLOT_EASE} ${delay}ms` }}>
                {cells.map((n, i) => <span key={i} style={{ height: '1em', textAlign: 'center' }}>{n}</span>)}
            </span>
        </span>
    );
};
const ActSlotNumber = ({ value, baseDelay = 0, baseDuration = 1100 }) => {
    const digits = String(Math.max(0, Math.round(value || 0))).split('');
    return (
        <span style={{ fontVariantNumeric: 'tabular-nums', display: 'inline-flex' }}>
            {digits.map((ch, i) => <ActSlotDigit key={i} d={parseInt(ch, 10)} delay={baseDelay + i * 90} duration={baseDuration + i * 160} />)}
        </span>
    );
};

// 내 활동 본문(데이터 준비 후 마운트 → 진입 애니메이션). 도넛=출석/지각/노쇼 비율 세그먼트(초록·노랑·빨강),
// 가운데 %=출석률(값에 따라 빨강→노랑→초록 색변화 카운트업), 출석/지각/노쇼 숫자=슬롯머신.
const MyActivityBody = ({ go, late, no, confirmed, rate, streak, onTabChange }) => {
    const t = useActCountUp(1100);
    const dRate = Math.round(rate * t);
    const segGo = confirmed ? go / confirmed * 100 : 0;
    const segLate = confirmed ? (go + late) / confirmed * 100 : 0;
    const sweep = 100 * t, g = Math.min(segGo, sweep), y = Math.min(segLate, sweep);
    const ringBg = `conic-gradient(#059669 0 ${g}%, #F59E0B ${g}% ${y}%, #EF4444 ${y}% ${sweep}%, #eef2f7 ${sweep}% 100%)`;
    const numCol = actRateColor(dRate);
    return (
        <button onClick={() => onTabChange && onTabChange('my')} className="w-full card rounded-2xl p-5 text-left active:scale-98 transition-all">
            <div className="flex items-center justify-between mb-4">
                <p className="font-black text-base text-slate-800">내 활동</p>
                <span className="inline-flex items-center gap-0.5 text-xs font-black text-slate-400">자세히 <Icon.ChevronRight size={14}/></span>
            </div>
            <div className="relative flex flex-col items-center">
                {streak >= 2 && (
                    <span className="absolute top-0 right-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-live text-[#15171E] text-xs font-black">🔥 {streak}연속</span>
                )}
                <div className="relative rounded-full flex items-center justify-center" style={{ width: 168, height: 168, background: ringBg }}>
                    <div className="absolute rounded-full bg-white flex items-center justify-center" style={{ width: 122, height: 122 }}>
                        <span className="font-black leading-none" style={{ color: numCol, fontSize: 46 }}>{dRate}<span style={{ fontSize: 26 }}>%</span></span>
                    </div>
                </div>
            </div>
            <div className="mt-5 flex items-center justify-around">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#059669' }}/><span className="text-xs font-black text-slate-500">출석</span><span className="text-sm font-black text-slate-800"><ActSlotNumber value={go} baseDelay={0}/></span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }}/><span className="text-xs font-black text-slate-500">지각</span><span className="text-sm font-black text-slate-800"><ActSlotNumber value={late} baseDelay={140}/></span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }}/><span className="text-xs font-black text-slate-500">노쇼</span><span className="text-sm font-black text-slate-800"><ActSlotNumber value={no} baseDelay={280}/></span></div>
            </div>
        </button>
    );
};

const MyActivitySummaryCard = ({ attendHistory, memberInfo, onTabChange }) => {
    const myId = memberInfo?.id;
    const mine = React.useMemo(() => {
        if (!myId) return [];
        const out = [];
        (attendHistory || []).forEach(h => {
            const rec = (h.records || []).find(r => r.memberId === myId);
            if (rec && rec.status && rec.status !== '대기') out.push({ date: h.date || '', status: rec.status });
        });
        return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [attendHistory, myId]);

    // 활동 기록 없음 → 가벼운 첫 참여 유도(빈 화면 방지)
    if (!myId || mine.length === 0) {
        return (
            <div className="card rounded-2xl p-5 text-center">
                <p className="font-black text-sm text-slate-700">아직 활동 기록이 없어요</p>
                <p className="text-xs text-slate-400 mt-1">첫 모임에 참여하면 여기에 내 출석이 쌓여요</p>
            </div>
        );
    }

    const go = mine.filter(m => m.status === '정상').length;
    const late = mine.filter(m => m.status === '지각').length;
    const no = mine.filter(m => m.status === '노쇼').length;
    const confirmed = go + late + no;
    const rate = confirmed ? Math.round((go + late) / confirmed * 100) : 0;
    let streak = 0;
    for (const m of mine) { if (m.status === '정상' || m.status === '지각') streak++; else break; }

    // 본문은 데이터 준비된 지금 마운트 → 진입 애니메이션(도넛 채움·% 카운트·슬롯) 실행
    return <MyActivityBody go={go} late={late} no={no} confirmed={confirmed} rate={rate} streak={streak} onTabChange={onTabChange} />;
};

const TabHome = ({
    notifPermission, registerFcmToken, onTabChange,
    meetingDayInfo, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, memberData, memberInfo, meetings, members, participantCount, scheduleData, attendHistory,
    matchLocalIndex, matchCompleted, onMatchPrev, onMatchNext, onMatchToggleComplete, onMatchAutoAdvance,
    mySession, meetingSettings, meetingSettingsMatch, darkMode,
    memberName, announcements, onOpenAnnouncements,
    isAdminMode, isMeetingOver, isMeetingEndSaved, onEndMeeting,
    duesReports, onConfirmDuesReport, onRejectDuesReport, onGoDuesTab,
    generateAttendQRCode, onEditMeeting, onDeleteMeeting, onOpenAttendModal,
    onInlineGPS, onInlineQR, onOpenKiosk,
    showToast, showAlert, showConfirm,
    regDuesUnpaid, regDuesBlock, regPenaltyUnpaid, regPenaltyTotal, fit,
    managers = [], onChangeManager,
}) => {
    const [activeCard, setActiveCard] = React.useState(0);   // 카드 2개일 때 가로 스와이프 인디케이터
    // 정기/매칭 다음 모임 분리 (회원이 둘 다 참여할 수 있어 종류별 카드로 표시)
    // 종료(done) + 지난 날짜 모임은 홈 '다음 모임'에서 제외 (끝난 모임은 기록 탭에서만)
    const upcoming = (meetings || []).filter(m => m && m.status !== 'done' && m.date && computeMeetingDay(m.date, m.start)?.type !== 'past');
    const byDate = (a, b) => a.date.localeCompare(b.date);
    const nextSelf  = upcoming.filter(m => (m.meetingType || 'self') !== 'match').sort(byDate)[0] || null;
    const nextMatch = upcoming.filter(m => (m.meetingType || 'self') === 'match').sort(byDate)[0] || null;
    const activeSelfDate = meetingSettings?.date || null;
    const activeMatchDate = meetingSettingsMatch?.date || null;
    let meetingCards = [];
    if (nextSelf)  meetingCards.push({ kind: 'self',  meeting: nextSelf });
    if (nextMatch) meetingCards.push({ kind: 'match', meeting: nextMatch });
    // 미러는 meetings 목록이 아직 로드 전(빈 배열)일 때만 폴백으로 쓴다.
    // 모임을 모두 종료한 경우 done 모임이 목록에 남아 length>0 이므로 폴백 안 함 → 끝난 모임이 홈에 다시 뜨지 않음.
    if (meetingCards.length === 0 && (!meetings || meetings.length === 0)) {
        if (meetingSettings?.date && meetingDayInfo) {
            meetingCards.push({ kind: (meetingSettings.meetingType === 'match' ? 'match' : 'self'), meeting: meetingSettings });
        }
        if (meetingSettingsMatch?.date) {
            meetingCards.push({ kind: 'match', meeting: meetingSettingsMatch });
        }
    }
    meetingCards = meetingCards
        .sort((a, b) => a.meeting.date.localeCompare(b.meeting.date))
        .map(c => {
            const isActive = c.kind === 'match'
                ? !!activeMatchDate && c.meeting.date === activeMatchDate
                : !!activeSelfDate && c.meeting.date === activeSelfDate;
            const dayInfo = isActive
                ? (c.kind === 'match'
                    ? computeMeetingDay(meetingSettingsMatch.date, meetingSettingsMatch.start)
                    : meetingDayInfo)
                : computeMeetingDay(c.meeting.date, c.meeting.start);
            return { ...c, isActive, dayInfo };
        });
    // 모임 카드 하나 렌더. 자연 크기(내용만큼) — 늘리지 않음(빈 카드 여백 방지). homeRich=원형 신청버튼 유지.
    const renderCard = (c) => (
        <NextMeetingCard key={c.kind} homeRich={!!fit} meeting={c.meeting} kind={c.kind} isActive={c.isActive}
            dayInfo={c.dayInfo} darkMode={darkMode} isAdminMode={isAdminMode} onTabChange={onTabChange} members={members}
            mySession={mySession} teamReady={teamReady} myTeamInfo={myTeamInfo} myTeamIdx={myTeamIdx}
            allowFromDisplay={allowFromDisplay} participantCount={participantCount} scheduleData={scheduleData}
            matchLocalIndex={matchLocalIndex} matchCompleted={matchCompleted}
            onMatchPrev={onMatchPrev} onMatchNext={onMatchNext} onMatchToggleComplete={onMatchToggleComplete} onMatchAutoAdvance={onMatchAutoAdvance}
            isMeetingOver={isMeetingOver} isMeetingEndSaved={isMeetingEndSaved} onEndMeeting={onEndMeeting}
            onGenerateQR={generateAttendQRCode} onEditMeeting={onEditMeeting} onDeleteMeeting={onDeleteMeeting}
            onOpenAttendModal={onOpenAttendModal} onInlineGPS={onInlineGPS} onInlineQR={onInlineQR}
            enableQR={meetingSettings?.enableQR} onOpenKiosk={onOpenKiosk}
            memberData={memberData} showToast={showToast} showAlert={showAlert} showConfirm={showConfirm}
            managers={managers} onChangeManager={onChangeManager}
            regDuesUnpaid={regDuesUnpaid} regDuesBlock={regDuesBlock} regPenaltyUnpaid={regPenaltyUnpaid} regPenaltyTotal={regPenaltyTotal} />
    );
    const onCarouselScroll = (e) => { const el = e.currentTarget; const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (i !== activeCard) setActiveCard(i); };

    return (
    <div className={fit ? 'flex-1 min-h-0 flex flex-col gap-3' : 'stagger space-y-3'}>
        {/* 회비 납부 신고 (관리자 전용 · 대기 신고가 있을 때만 — 홈에서 한눈에 확정/삭제) */}
        {isAdminMode && <div className="shrink-0"><DuesReportsHomeCard duesReports={duesReports} onConfirm={onConfirmDuesReport} onReject={onRejectDuesReport} onGoDuesTab={onGoDuesTab} /></div>}

        {/* 회비 납부 시기 배너 (납부 시기일 때만 표시 · 누르면 회비 탭으로 이동) */}
        <div className="shrink-0"><DuesAccountCard mode="banner" isAdminMode={isAdminMode} memberName={memberName} memberInfo={memberInfo} onGoDues={() => onTabChange('my')} /></div>

        {/* 미납 벌금 배너 (회원 · 미납 있을 때만 · 누르면 회비 탭으로 이동) */}
        <div className="shrink-0"><PenaltyPayCard mode="banner" isAdminMode={isAdminMode} memberName={memberName} memberInfo={memberInfo} onGoDues={() => onTabChange('my')} /></div>

        {/* 다음 모임 — fit: 1개는 화면 채움, 2개는 가로 스와이프 / 비-fit: 세로 나열 */}
        {meetingCards.length > 0 ? (
            fit ? (
                <div className="flex-1 min-h-0 flex flex-col">
                    {meetingCards.length === 1 ? (
                        <div className="flex-1 min-h-0 overflow-hidden">{renderCard(meetingCards[0])}</div>
                    ) : (
                        <>
                            <div className="flex-1 min-h-0 flex items-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-3 -mx-4 px-4 no-sb" onScroll={onCarouselScroll}>
                                {meetingCards.map(c => (
                                    <div key={c.kind} className="snap-center shrink-0 w-full overflow-hidden">{renderCard(c)}</div>
                                ))}
                            </div>
                            <div className="shrink-0 flex justify-center items-center gap-1.5 pt-2">
                                {meetingCards.map((c, i) => (
                                    <span key={i} className={`h-1.5 rounded-full transition-all ${i === activeCard ? 'w-5 bg-teal-500' : 'w-1.5 bg-slate-300'}`}/>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                meetingCards.map(c => renderCard(c))
            )
        ) : (
            <div className={fit ? 'flex-1 min-h-0 overflow-hidden space-y-3' : ''}>
                {/* 정기모임 켜져 있으면 다음 회차 미리보기, 아니면 작은 '없음' 카드 */}
                <RecurringPreviewCard onTabChange={onTabChange} />
                {/* 휑한 홈 채우기 — 예정 모임 없을 때만 내 활동 요약(자세히는 MY 탭) */}
                <MyActivitySummaryCard attendHistory={attendHistory} memberInfo={memberInfo} onTabChange={onTabChange} />
            </div>
        )}

        {/* 내 출석 현황 카드는 MY 탭으로 이동(정의는 위 MyAttendanceCard, 호출은 tab-my.js) */}

        {/* iOS PWA 설치 안내 (fit=무스크롤 홈에선 숨김 — 공간 확보) */}
        {!fit && /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone && (
            <div className="card rounded-2xl p-4 border-orange-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0"><Icon.Smartphone size={20} className="text-orange-500"/></div>
                    <div className="flex-1">
                        <p className="font-black text-sm text-orange-500">iPhone 알림 받으려면</p>
                        <p className="text-xs text-slate-400 mt-0.5">Safari → 공유 버튼 → "홈 화면에 추가" 후 앱에서 실행하세요</p>
                    </div>
                </div>
            </div>
        )}
        {/* 알림 설정 안내 (PWA standalone + 권한 허용 시, 안드로이드/iPhone 탭) */}
        <NotifSetupGuide notifPermission={notifPermission} memberData={memberData} />
        {/* 알림 허용 배너 */}
        {notifPermission === 'default' && (
            <button onClick={registerFcmToken} className="w-full card rounded-2xl p-4 text-left border-teal-100 active:scale-98 transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon.Bell size={18} className="text-teal-500"/>
                    </div>
                    <div className="flex-1">
                        <p className="font-black text-sm text-teal-600">푸시 알림 받기</p>
                        <p className="text-xs text-slate-400 mt-0.5">팀 편성, 모임 알림을 받아보세요</p>
                    </div>
                    <span className="text-xs font-black text-teal-500 bg-teal-50 px-3 py-1 rounded-xl">허용</span>
                </div>
            </button>
        )}
    </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────
