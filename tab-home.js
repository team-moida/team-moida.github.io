// ─── 알림 설정 안내 카드 (안드로이드/iPhone 탭) ──────────────────────────────────
// 안드로이드 PWA는 알림 채널이 기본 "팝업 표시 꺼짐"으로 생성돼 직접 켜야 배너가
// 뜬다. iOS는 보통 추가 설정이 없지만 설치/허용 여부 확인이 필요하다.
// 표시 조건: PWA standalone + 권한 granted + 미닫음 (안드로이드/iOS 둘 다).
// 일반 브라우저·미허용(default)에선 기존 "푸시 알림 받기" 배너가 안내하므로 숨김.
// 닫음 여부는 localStorage에 기억 (Cache API와 별개라 PWA 재실행 후에도 유지).
// ※ 웹/PWA에서 OS 알림 설정 화면으로 직접 보내는 표준 API는 없어(chrome://·
//   android-app:// intent는 JS로 이동 불가) 수동 안내 단계를 보여준다.
const NOTIF_GUIDE_DISMISS_KEY = 'moida_androidNotifGuideDismissed';
const NotifSetupGuide = ({ notifPermission, memberData }) => {
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const [dismissed, setDismissed] = React.useState(() => {
        try { return localStorage.getItem(NOTIF_GUIDE_DISMISS_KEY) === '1'; } catch { return false; }
    });
    const [tab, setTab] = React.useState(() => /android/i.test(navigator.userAgent) ? 'android' : 'iphone');
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

    const Step = ({ n, children }) => (
        <li className="flex gap-2.5 text-xs text-slate-600">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 text-white font-black flex items-center justify-center">{n}</span>
            <span className="leading-relaxed pt-0.5">{children}</span>
        </li>
    );

    return (
        <div className="card rounded-3xl p-4 border-teal-100">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon.Bell size={18} className="text-teal-500"/>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-teal-600">알림이 조용히 오나요?</p>
                    <p className="text-xs text-slate-400 mt-0.5">아래에서 내 폰에 맞게 한 번만 설정하면 배너로 떠요</p>
                </div>
            </div>

            {/* 기기 탭 */}
            <div className="flex gap-1.5 mt-3 p-1 bg-slate-100 rounded-xl">
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

            {/* 알림 테스트 + 닫기 */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <button onClick={dismiss} className="text-[11px] font-black text-slate-400 active:scale-95">다음에 안 보기</button>
                <button onClick={sendTest} disabled={testState!=='idle'}
                    className={`text-xs font-black px-3 py-1.5 rounded-xl active:scale-95 transition-all ${testState==='idle'?'bg-teal-500 text-white':'bg-slate-100 text-slate-400'}`}>
                    {testState==='sending' ? '보내는 중…' : testState==='sent' ? '보냈어요 ✓' : '알림 테스트'}
                </button>
            </div>
            {testState==='sent' && (
                <p className="text-[11px] font-black text-teal-500 mt-2 text-right">테스트 알림을 보냈어요. 잠시 후 배너를 확인하세요!</p>
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
const AnnounceTicker = ({ announcements, onOpen, onTabChange }) => {
    const [idx, setIdx] = React.useState(0);
    const list = announcements || [];
    React.useEffect(() => {
        if (list.length <= 1) return;
        const t = setInterval(() => setIdx(i => (i + 1) % list.length), 5000);
        return () => clearInterval(t);
    }, [list.length]);

    // 공지 0개 — 빈 띠 유지. 눌러도 게시판으로 이동.
    if (list.length === 0) {
        return (
            <button onClick={onOpen} className="w-full card rounded-2xl px-4 py-3 text-left active:scale-98 transition-all overflow-hidden">
                <div className="flex items-center gap-2.5">
                    <Icon.Bell size={15} className="text-slate-300 flex-shrink-0"/>
                    <span className="font-black text-sm text-slate-400">등록된 공지가 없습니다</span>
                </div>
            </button>
        );
    }

    const safeIdx = idx % list.length;
    const a = list[safeIdx];
    return (
        <button onClick={() => (a.linkMeetingId && onTabChange) ? onTabChange('attend', a.linkKind==='match'?'match':'self', a.linkMeetingId) : onOpen()} className="w-full card rounded-2xl px-4 py-3 text-left active:scale-98 transition-all overflow-hidden">
            <div className="flex items-center gap-2.5">
                <Icon.Bell size={15} className="text-teal-500 flex-shrink-0"/>
                {/* key 변경 → moida-ticker-up 애니메이션 재생 (아래에서 위로 등장) */}
                <div key={safeIdx} className="flex-1 min-w-0 flex items-center justify-between gap-2 moida-ticker-up">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <NoticeBadge category={a.category} />
                        <span className="font-black text-sm text-slate-700 truncate">{a.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">{fmtAnnDate(a.sentAt)}</span>
                </div>
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
// WMO 날씨코드 → [이모지, 한글]  (이모지는 PC·안드로이드·iOS 모두 기본 렌더되어 가장 직관적)
const WMO_WEATHER = {
    0:['☀️','맑음'], 1:['🌤️','대체로 맑음'], 2:['⛅','구름 조금'], 3:['☁️','흐림'],
    45:['🌫️','안개'], 48:['🌫️','짙은 안개'],
    51:['🌦️','약한 이슬비'], 53:['🌦️','이슬비'], 55:['🌦️','강한 이슬비'],
    56:['🌧️','어는 이슬비'], 57:['🌧️','어는 이슬비'],
    61:['🌧️','약한 비'], 63:['🌧️','비'], 65:['🌧️','강한 비'],
    66:['🌧️','어는 비'], 67:['🌧️','어는 비'],
    71:['🌨️','약한 눈'], 73:['🌨️','눈'], 75:['🌨️','많은 눈'], 77:['🌨️','싸락눈'],
    80:['🌦️','소나기'], 81:['🌦️','소나기'], 82:['⛈️','강한 소나기'],
    85:['🌨️','소낙눈'], 86:['🌨️','소낙눈'],
    95:['⛈️','뇌우'], 96:['⛈️','뇌우(우박)'], 99:['⛈️','강한 뇌우(우박)'],
};
const _wxCache = new Map();   // 날씨: `${lat},${lng},${date}` → {at, data} (30분)
const _addrCache = new Map(); // 주소: `${lat},${lng}` → {at, text} (24시간)
const MeetingWeather = ({ lat, lng, date, isAdminMode }) => {
    const [wx, setWx] = React.useState(null);
    const [wState, setWState] = React.useState('idle'); // idle|loading|done|error
    const [wErr, setWErr] = React.useState('');
    const [addr, setAddr] = React.useState('');

    // ① 날씨 (Open-Meteo) — 주소와 독립. 캐시 즉시 표시 후 백그라운드 갱신(stale-while-revalidate).
    React.useEffect(() => {
        if (lat == null || lng == null) { setWState('idle'); setWx(null); return; }
        const key = `${lat},${lng},${date||''}`;
        // 즉시 표시: 메모리 → localStorage 순으로 최근 값 있으면 바로 렌더 (오래됐어도 우선 표시)
        let shown = _wxCache.get(key) || null;
        if (!shown) {
            try {
                const s = JSON.parse(localStorage.getItem('moida_wx_' + key) || 'null');
                if (s && s.data) { shown = s; _wxCache.set(key, s); }
            } catch (_) {}
        }
        if (shown) { setWx(shown.data); setWState('done'); }
        // 충분히 최신(30분 이내)이면 네트워크 생략
        if (shown && Date.now() - shown.at < 30*60*1000) return;
        let alive = true;
        if (!shown) setWState('loading'); // 캐시 있으면 '불러오는 중' 깜빡임 없이 조용히 갱신
        const p = new URLSearchParams({
            latitude: lat, longitude: lng,
            current: 'temperature_2m,relative_humidity_2m,weather_code',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
            timezone: 'Asia/Seoul',
        });
        if (date) { p.set('start_date', date); p.set('end_date', date); }
        fetch(`https://api.open-meteo.com/v1/forecast?${p}`)
            .then(r => r.ok ? r.json() : Promise.reject('HTTP ' + r.status))
            .then(j => {
                if (!alive) return;
                const cur = j.current || {}, d = j.daily || {};
                const data = {
                    code: (d.weather_code && d.weather_code[0] != null) ? d.weather_code[0] : cur.weather_code,
                    cur: cur.temperature_2m, humidity: cur.relative_humidity_2m,
                    min: d.temperature_2m_min && d.temperature_2m_min[0],
                    max: d.temperature_2m_max && d.temperature_2m_max[0],
                    pop: d.precipitation_probability_max && d.precipitation_probability_max[0],
                };
                const entry = { at: Date.now(), data };
                _wxCache.set(key, entry);
                try { localStorage.setItem('moida_wx_' + key, JSON.stringify(entry)); } catch (_) {}
                setWx(data); setWState('done');
            })
            .catch((e) => { if (alive && !shown) { setWErr(String((e && e.message) || e)); setWState('error'); } }); // 캐시 있으면 에러로 안 바꿈
        return () => { alive = false; };
    }, [lat, lng, date]);

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
        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-black text-white/70 min-w-0">
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
            <div className="mt-3 flex items-center gap-2 text-xs font-black text-white/70">
                <span className="animate-pulse">날씨 불러오는 중…</span>
            </div>
        );
    }
    const [icon, label] = WMO_WEATHER[wx.code] || ['🌡️','날씨'];
    const r = (v) => (v == null || isNaN(v)) ? '–' : Math.round(v);
    return (
        <div className="mt-3">
            {addr && (
                <p className="text-xs font-black text-white/70 mb-1.5 truncate">{addr}</p>
            )}
            <div className="flex items-center gap-3">
            <span className="text-3xl leading-none flex-shrink-0">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-[10px] font-black text-white/70 flex-shrink-0">지금</span>
                    <span className="text-lg font-black text-white flex-shrink-0">{r(wx.cur)}°</span>
                    <span className="text-xs font-black text-white/80 truncate">{label}</span>
                </div>
                <div className="flex items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] font-black flex-wrap">
                    <span className="text-white">최저 {r(wx.min)}°</span>
                    <span className="text-white">최고 {r(wx.max)}°</span>
                    <span className="text-white/70">습도 {r(wx.humidity)}%</span>
                    {wx.pop != null && <span className="text-white/70">강수 {r(wx.pop)}%</span>}
                </div>
            </div>
            </div>
        </div>
    );
};

// ─── 다음 모임 카드 (정기/매칭 종류별 색상 구분) ───────────────────────────────
// 종류별 색상·라벨. 정기=teal, 매칭=indigo. (회원이 두 모임 다 참여할 때 한눈에 구분)
const MEETING_KIND = {
    self:  { label: '정기모임', accent: '#14b8a6', text: 'text-teal-500',   tint: '#f0fdfa' },
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
const NextMeetingCard = ({
    meeting, kind, isActive, dayInfo, darkMode, isAdminMode, onTabChange,
    mySession, teamReady, myTeamInfo, myTeamIdx, allowFromDisplay, participantCount,
    isMeetingOver, isMeetingEndSaved, onEndMeeting,
}) => {
    const cfg = MEETING_KIND[kind] || MEETING_KIND.self;
    const showOverlay = kind !== 'match' && isActive && isAdminMode && isMeetingOver && !isMeetingEndSaved;
    return (
        <div className="relative">
        <button onClick={()=>onTabChange('attend', kind, meeting.id || getMeetingId(meeting))}
            className={`w-full rounded-3xl p-5 text-left text-white active:scale-98 transition-all${showOverlay ? ' blur-sm' : ''}`}
            style={{ background: cfg.accent, boxShadow:`0 10px 28px -8px ${cfg.accent}59` }}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <p className="text-xs font-black uppercase tracking-widest text-white/80">{cfg.label}</p>
                {dayInfo && dayInfo.type !== 'past' && dayInfo.label && (
                    <span className={`flex-shrink-0 text-xs font-black px-3 py-1 rounded-xl ${
                        dayInfo.type==='started'?'bg-white text-emerald-600':
                        dayInfo.urgent?'bg-white text-rose-500':
                        dayInfo.type==='today'?'bg-white text-slate-700':
                        'bg-white/25 text-white'}`}>{dayInfo.label}</span>
                )}
            </div>
            <p className="font-black text-lg leading-tight">{fmtMeetingDate(meeting.date)} · {meeting.start}~{meeting.end}</p>
            {kind==='match' && meeting.opponentName && (
                <p className="text-sm font-black text-white/90 mt-1 truncate">vs {meeting.opponentName}</p>
            )}
            {meeting.location && (
                <p className="text-sm text-white/75 mt-1 flex items-center gap-1 min-w-0">
                    <Icon.MapPin size={13} className="flex-shrink-0"/><span className="truncate">{meeting.location}</span>
                </p>
            )}
            {/* 실시간 날씨 (모임 좌표 기준) — 지난 모임에는 표시 안 함 */}
            {dayInfo && dayInfo.type !== 'past' && (
                <MeetingWeather lat={meeting.locationLat} lng={meeting.locationLng} date={meeting.date} isAdminMode={isAdminMode} />
            )}
            {isActive ? (
                <div className="mt-4 pt-4 border-t space-y-2.5" style={{borderColor:'rgba(255,255,255,0.22)'}}>
                    {/* 출석 상태 — 출석체크 시점(당일/모임중)이 되면 체크 버튼, 완료 시 완료 표시 */}
                    {mySession?.checkedIn ? (
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-black text-white min-w-0">
                                <Icon.Check size={16} className="flex-shrink-0"/><span className="truncate">출석 완료</span>
                            </span>
                            <span className="text-xs font-black text-white/70 flex-shrink-0">{mySession.checkInTime}</span>
                        </div>
                    ) : (dayInfo.type==='today' || dayInfo.type==='started') ? (
                        <div className="flex items-center justify-between gap-2 -mx-1.5 px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.2)'}}>
                            <span className="flex items-center gap-1.5 text-sm font-black text-white min-w-0">
                                <Icon.CheckSq size={16} className="flex-shrink-0"/><span className="truncate">지금 출석 체크하기</span>
                            </span>
                            <Icon.ChevronRight size={16} className="text-white/80 flex-shrink-0"/>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-white/70">
                            <Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">모임 당일에 출석 체크가 열립니다</span>
                        </div>
                    )}
                    {/* 팀 상태 — 팀편성 OFF면 참여 명단, 아니면 공개 시점에 내 팀 표시 */}
                    {meeting.meetingType === 'match' ? (
                        <div className="flex items-center gap-1.5 text-sm font-black text-white min-w-0">
                            <Icon.Users size={16} className="flex-shrink-0 text-white/80"/><span className="truncate">참여 명단 {participantCount || 0}명</span>
                        </div>
                    ) : teamReady && myTeamInfo ? (
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-black text-white min-w-0">
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-[11px] font-black flex-shrink-0 ${getTeamBadge(myTeamIdx)}`}>{myTeamInfo.jerseyNumber}</span>
                                <span className="truncate">내 팀 · {myTeamInfo.teamName}팀 {myTeamInfo.jerseyNumber}번</span>
                            </span>
                            <span className="text-xs text-white/70 flex-shrink-0">{getTeamColorName(myTeamIdx)} 조끼</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-white/70">
                            <Icon.Users size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">팀 편성 비공개 중{allowFromDisplay?` · ${allowFromDisplay}부터 공개`:''}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-4 pt-4 border-t" style={{borderColor:'rgba(255,255,255,0.22)'}}>
                    <div className="flex items-center gap-1.5 text-xs text-white/70">
                        <Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">모임이 가까워지면 출석·팀 정보가 표시됩니다</span>
                    </div>
                </div>
            )}
        </button>
        {/* 관리자: 모임 종료 시간이 지나면 카드 위에 '모임 종료' 버튼 (누르면 그날 출석 기록 저장) */}
        {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-3xl">
                <button onClick={onEndMeeting} className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg">모임 종료</button>
            </div>
        )}
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
const DuesAccountCard = ({ isAdminMode, memberName, memberInfo }) => {
    const { useState, useEffect } = React;
    const [acc, setAcc] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ bank:'', accountNo:'', holder:'', tossUrl:'', kakaoUrl:'', amountHint:'', monthlyFee:'', restFee:'', halfYearFee:'', fullYearFee:'' });
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sel, setSel] = useState('monthly');
    const [report, setReport] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [popupOff, setPopupOff] = useState(false);

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

    const fee = (k, def) => { const v = Number(acc?.[k]); return (v && v > 0) ? v : def; };
    const fees = {
        monthly: fee('monthlyFee', DUES_FEE_DEFAULTS.monthlyFee),
        rest: fee('restFee', DUES_FEE_DEFAULTS.restFee),
        half_year: fee('halfYearFee', DUES_FEE_DEFAULTS.halfYearFee),
        full_year: fee('fullYearFee', DUES_FEE_DEFAULTS.fullYearFee),
    };
    const ms = memberInfo ? getMembershipStatus(memberInfo, targetMonth) : null;
    const isExempt = memberInfo ? STAFF_ROLES.includes(memberInfo.role) : false;
    const feeFor = (k) => { if (k === 'rest') { return (ms && ms.active && ms.remainingRest > 0) ? 0 : fees.rest; } return fees[k] || 0; };
    const depositName = `${memberName || ''} ${DUES_LABELS[sel] || ''}`.trim();

    const openEdit = () => {
        setForm({ bank:acc?.bank||'', accountNo:acc?.accountNo||'', holder:acc?.holder||'', tossUrl:acc?.tossUrl||'', kakaoUrl:acc?.kakaoUrl||'', amountHint:acc?.amountHint||'',
            monthlyFee:acc?.monthlyFee||'', restFee:acc?.restFee||'', halfYearFee:acc?.halfYearFee||'', fullYearFee:acc?.fullYearFee||'' });
        setIsEditing(true);
    };
    const handleSave = async () => {
        if (!form.accountNo.trim() && !form.tossUrl.trim() && !form.kakaoUrl.trim()) return;
        setIsSaving(true);
        try {
            await getCol('settings').doc('club_account').set({
                bank:form.bank.trim(), accountNo:form.accountNo.trim(), holder:form.holder.trim(),
                tossUrl:normUrl(form.tossUrl), kakaoUrl:normUrl(form.kakaoUrl), amountHint:form.amountHint.trim(),
                monthlyFee:Number(form.monthlyFee)||0, restFee:Number(form.restFee)||0,
                halfYearFee:Number(form.halfYearFee)||0, fullYearFee:Number(form.fullYearFee)||0,
                updatedAt:new Date().toISOString(), updatedBy:memberName||'관리자',
            }, { merge:true });
            setIsEditing(false);
        } catch(e) { console.warn('계좌 저장 실패:', e); }
        finally { setIsSaving(false); }
    };
    const copyText = async (t) => {
        if (!t) return;
        try { await navigator.clipboard.writeText(t); }
        catch { try { const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch(_){} }
        setCopied(true); setTimeout(()=>setCopied(false), 1600);
    };
    const submitReport = async (payType) => {
        if (!memberId) return;
        setSubmitting(true);
        try {
            await getCol('dues_reports').doc(`${targetMonth}_${memberId}`).set({
                memberId, memberName:memberName||'', month:targetMonth, payType,
                amount:feeFor(payType), depositName:`${memberName||''} ${DUES_LABELS[payType]||''}`.trim(),
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
            <div className="card rounded-3xl p-5">
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
                {field('카카오페이 송금 링크','kakaoUrl','예) qr.kakaopay.com/...', true)}
                {field('추가 안내','amountHint','예) 신입 첫 달 반값', true)}
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">금액을 비우면 기본값(월납 3만·휴식 1만·반년 15만·1년 30만)으로 안내됩니다. 토스·카카오 링크를 넣으면 회원이 누를 때 송금 화면이 바로 열려요.</p>
                <div className="flex gap-2">
                    <button onClick={()=>setIsEditing(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    <button onClick={handleSave} disabled={isSaving} className={`flex-1 py-3 rounded-2xl font-black text-sm ${isSaving?'bg-emerald-300 text-white':'bg-emerald-500 text-white'}`}>{isSaving?'저장 중...':'저장'}</button>
                </div>
            </div>
        );
    }

    // ── 계좌 미등록 ── (회원에겐 숨김, 관리자에겐 등록 안내)
    if (!acc || (!acc.accountNo && !acc.tossUrl && !acc.kakaoUrl)) {
        if (!isAdminMode) return null;
        return (
            <button onClick={openEdit} className="w-full card rounded-3xl p-4 text-left border-emerald-100 active:scale-98 transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">💳</div>
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
        if (isExempt) {
            dues = null;
        } else if (ms && ms.active && ms.remaining > 1) {
            dues = (
                <div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-3">
                    <p className="text-sm font-black text-white">✓ {ms.type}납 회원 · 만료 {ms.endDateFormatted}</p>
                    <p className="text-[11px] text-white/75 mt-0.5">남은 휴식 면제 {ms.remainingRest}회</p>
                    {report && (report.status==='pending'||report.status==='confirmed')
                        ? <p className="text-[11px] text-white/80 mt-1">{report.status==='pending'?'⏳ 휴식 신청 확인 대기 중':'✓ 휴식 처리됨'}</p>
                        : <button onClick={()=>submitReport('rest')} disabled={submitting} className="mt-2 px-3 py-1.5 rounded-lg bg-white/25 text-white font-black text-xs active:scale-95 transition-all">{submitting?'처리 중...':`이번 달 쉬어요 (${feeFor('rest')===0?'면제':wonFmt(feeFor('rest'))+'원'})`}</button>}
                </div>
            );
        } else if (report && report.status==='confirmed') {
            dues = (<div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-3"><p className="text-sm font-black text-white">✓ {targetMonLabel} 회비 완료</p></div>);
        } else if (report && report.status==='pending') {
            dues = (<div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-3"><p className="text-sm font-black text-white">⏳ {targetMonLabel} 회비 확인 대기 중</p><p className="text-[11px] text-white/80 mt-0.5">{DUES_LABELS[report.payType]||''} {wonFmt(report.amount)}원 · 관리자 확인 후 완료돼요</p></div>);
        } else {
            showPayPrompt = true;
            const isRenew = ms && ms.active && ms.remaining <= 1;
            dues = (
                <div className="bg-white/15 rounded-2xl px-3 py-3 mb-3">
                    <p className="text-sm font-black text-white mb-2">{isRenew ? `⚠️ ${ms.type}납 곧 만료 (${ms.endDateFormatted}) · 갱신해 주세요` : `${targetMonLabel} 회비를 납부해 주세요`}</p>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                        {['monthly','rest','half_year','full_year'].map(k => (
                            <button key={k} onClick={()=>setSel(k)} className={`py-2 rounded-xl font-black text-xs transition-all ${sel===k?'bg-white text-emerald-700':'bg-white/20 text-white'}`}>{DUES_LABELS[k]} · {feeFor(k)===0?'면제':wonFmt(feeFor(k))+'원'}</button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between bg-white/15 rounded-xl px-3 py-2 mb-2 gap-2">
                        <div className="min-w-0"><p className="text-[10px] text-white/70 font-black">입금자명은 이렇게</p><p className="text-sm font-black text-white truncate">{depositName}</p></div>
                        <button onClick={()=>copyText(depositName)} className="px-2.5 py-1.5 rounded-lg bg-white/25 text-white text-xs font-black shrink-0 active:scale-95 transition-all">복사</button>
                    </div>
                    <button onClick={()=>submitReport(sel)} disabled={submitting} className="w-full py-2.5 rounded-xl bg-white text-emerald-700 font-black text-sm active:scale-95 transition-all">{submitting?'처리 중...':'송금했어요 (납부 신고)'}</button>
                </div>
            );
        }
    }

    const popupKey = `moida_dues_popup_${targetMonth}`;
    let dismissedToday = false;
    try { dismissedToday = localStorage.getItem(popupKey) === todayKey; } catch(_) {}
    const showPopup = showPayPrompt && inPopupWindow && !popupOff && !dismissedToday;
    const dismissPopup = () => { try { localStorage.setItem(popupKey, todayKey); } catch(_) {} setPopupOff(true); };

    // ── 계좌 표시 + 회비 납부 (회원·관리자 공통) ──
    return (
        <>
        <div className="rounded-3xl p-5 text-white" style={{ background:'linear-gradient(135deg,#10b981,#059669)', boxShadow:'0 10px 28px -8px rgba(5,150,105,0.45)' }}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl leading-none flex-shrink-0">💳</span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/80">회비 납부</p>
                        <p className="font-black text-lg leading-tight truncate">{acc.bank||'모임 계좌'}{acc.holder?` · ${acc.holder}`:''}</p>
                    </div>
                </div>
                {isAdminMode && (
                    <button onClick={openEdit} className="p-2 rounded-xl bg-white/20 text-white shrink-0 active:scale-95 transition-all"><Icon.Edit size={15}/></button>
                )}
            </div>
            {dues}
            {acc.accountNo && (
                <div className="mb-3">
                    <p className="font-black text-xl tracking-wide break-all">{acc.accountNo}</p>
                    {acc.amountHint && <p className="text-xs font-black text-white/80 mt-1">{acc.amountHint}</p>}
                </div>
            )}
            <div className="space-y-2">
                {acc.accountNo && (
                    <button onClick={()=>copyText(acc.accountNo)} className="w-full py-2.5 rounded-xl bg-white/20 text-white font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-1.5">
                        {copied ? <><Icon.Check size={16}/> 복사됐어요</> : '계좌번호 복사'}
                    </button>
                )}
                {(acc.tossUrl || acc.kakaoUrl) && (
                    <div className="flex gap-2">
                        {acc.tossUrl && <button onClick={()=>window.open(acc.tossUrl,'_blank')} className="flex-1 py-2.5 rounded-xl bg-white text-[#3182f6] font-black text-sm active:scale-95 transition-all">토스로 보내기</button>}
                        {acc.kakaoUrl && <button onClick={()=>window.open(acc.kakaoUrl,'_blank')} className="flex-1 py-2.5 rounded-xl font-black text-sm active:scale-95 transition-all" style={{background:'#FEE500',color:'#3c1e1e'}}>카카오페이</button>}
                    </div>
                )}
            </div>
        </div>
        {showPopup && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={dismissPopup}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <div className="text-4xl mb-2">💳</div>
                    <p className="font-black text-lg text-slate-800">{targetMonLabel} 회비 납부</p>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">곧 {targetMonLabel}이 시작돼요.<br/>잊지 말고 회비를 납부해 주세요!</p>
                    <button onClick={dismissPopup} className="mt-4 w-full py-3 rounded-2xl bg-emerald-500 text-white font-black text-sm active:scale-95 transition-all">확인</button>
                </div>
            </div>
        )}
        </>
    );
};
const TabHome = ({
    notifPermission, registerFcmToken, onTabChange,
    meetingDayInfo, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, memberData, memberInfo, meetings, participantCount,
    mySession, meetingSettings, meetingSettingsMatch, darkMode,
    memberName, announcements, onOpenAnnouncements,
    isAdminMode, isMeetingOver, isMeetingEndSaved, onEndMeeting,
}) => {
    // 정기/매칭 다음 모임 분리 (회원이 둘 다 참여할 수 있어 종류별 카드로 표시)
    const upcoming = (meetings || []).filter(m => m && m.status !== 'done' && m.date);
    const byDate = (a, b) => a.date.localeCompare(b.date);
    const nextSelf  = upcoming.filter(m => (m.meetingType || 'self') !== 'match').sort(byDate)[0] || null;
    const nextMatch = upcoming.filter(m => (m.meetingType || 'self') === 'match').sort(byDate)[0] || null;
    const activeSelfDate = meetingSettings?.date || null;
    const activeMatchDate = meetingSettingsMatch?.date || null;
    let meetingCards = [];
    if (nextSelf)  meetingCards.push({ kind: 'self',  meeting: nextSelf });
    if (nextMatch) meetingCards.push({ kind: 'match', meeting: nextMatch });
    // 미러가 로드됐지만 meetings 목록이 아직 비어 있으면 미러로 폴백
    if (meetingCards.length === 0) {
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
    return (
    <div className="animate-in space-y-3">
        {/* 공지 순환 띠 (맨 위, 항상 표시) */}
        <AnnounceTicker announcements={announcements} onOpen={onOpenAnnouncements} onTabChange={onTabChange} />

        {/* 다음 모임 — 정기/매칭 종류별로 분리해 색상으로 구분 (탭하면 모임 탭으로 이동) */}
        {meetingCards.length > 0 ? meetingCards.map(c => (
            <NextMeetingCard key={c.kind} meeting={c.meeting} kind={c.kind} isActive={c.isActive}
                dayInfo={c.dayInfo} darkMode={darkMode} isAdminMode={isAdminMode} onTabChange={onTabChange}
                mySession={mySession} teamReady={teamReady} myTeamInfo={myTeamInfo} myTeamIdx={myTeamIdx}
                allowFromDisplay={allowFromDisplay} participantCount={participantCount}
                isMeetingOver={isMeetingOver} isMeetingEndSaved={isMeetingEndSaved} onEndMeeting={onEndMeeting} />
        )) : (
            <button onClick={()=>onTabChange('meeting-list')} className="w-full card rounded-3xl p-5 text-center active:scale-98 transition-all">
                <div className="text-slate-400 py-3">
                    <div className="flex justify-center mb-2 opacity-30"><Icon.Calendar size={32}/></div>
                    <p className="font-black text-sm">예정된 모임이 없습니다</p>
                    <p className="text-xs mt-0.5 opacity-80">모임 탭에서 등록할 수 있어요</p>
                </div>
            </button>
        )}

        {/* 회비 납부 (모임 계좌 + 송금 바로가기) */}
        <DuesAccountCard isAdminMode={isAdminMode} memberName={memberName} memberInfo={memberInfo} />

        {/* iOS PWA 설치 안내 */}
        {/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone && (
            <div className="card rounded-3xl p-4 border-orange-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">📲</div>
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
            <button onClick={registerFcmToken} className="w-full card rounded-3xl p-4 text-left border-teal-100 active:scale-98 transition-all">
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
