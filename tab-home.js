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
    const cntRef = React.useRef(0);
    const list = announcements || [];
    // 모임 연결 공지인데 그 모임이 종료됐으면 '완료' 배지
    const isAnnDone = (a) => {
        if (!a || !a.linkMeetingId || !meetings) return false;
        const mt = meetings.find(m => m.id === a.linkMeetingId);
        return mt ? isMeetingEnded(mt) : false;
    };
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
    // 어두운 띠 + 라임 '공지' 칩 뒤로 제목이 가로로 흐름. 한 공지당 2바퀴 후 다음 공지로 교체(아래→위 등장)
    const onIter = () => {
        cntRef.current += 1;
        if (cntRef.current >= 2 && list.length > 1) { cntRef.current = 0; setIdx(i => (i + 1) % list.length); }
    };
    return (
        <button onClick={onOpen} className="w-full text-left active:scale-98 transition-all">
            <div className="moida-notice-band relative h-12 rounded-2xl overflow-hidden">
                {/* key 변경 → 새 공지가 아래에서 위로 등장 */}
                <div key={safeIdx} className="moida-ticker-up absolute inset-y-0 right-0 left-[58px] overflow-hidden">
                    <div className="moida-notice-scroll" onAnimationIteration={onIter}>
                        {isAnnDone(a) && <span className="mr-1.5 align-middle text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20 text-white/90">완료</span>}
                        <span className="align-middle font-black text-[13px] text-white">{a.title}</span>
                    </div>
                </div>
                <span className="moida-notice-chip absolute left-2.5 top-1/2 -translate-y-1/2 z-[3] bg-live text-[#15171E] text-[10px] font-black px-2.5 py-[5px] rounded-full">공지</span>
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
    0: [Icon.Sun, '맑음'],
    1: [Icon.CloudRain, '비'],
    2: [Icon.CloudSnow, '비/눈'],
    3: [Icon.CloudSnow, '눈'],
    5: [Icon.CloudDrizzle, '빗방울'],
    6: [Icon.CloudDrizzle, '빗방울·눈날림'],
    7: [Icon.CloudSnow, '눈날림'],
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
const MeetingWeather = ({ lat, lng, isAdminMode }) => {
    const [wx, setWx] = React.useState(null);
    const [wState, setWState] = React.useState('idle'); // idle|loading|done|error
    const [wErr, setWErr] = React.useState('');
    const [addr, setAddr] = React.useState('');

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
    const [WxIcon, label] = PTY_MAP[wx.pty] || PTY_MAP[0];
    const r = (v) => (v == null || isNaN(Number(v))) ? '–' : Math.round(Number(v));
    return (
        <div className="mt-3">
            {addr && (
                <p className="text-xs font-black text-white/70 mb-1.5 truncate">{addr}</p>
            )}
            <div className="flex items-center gap-3">
            <WxIcon size={34} className="text-white flex-shrink-0"/>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-[10px] font-black text-white/70 flex-shrink-0">지금</span>
                    <span className="text-lg font-black text-white flex-shrink-0">{r(wx.temp)}°</span>
                    <span className="text-xs font-black text-white/80 truncate">{label}</span>
                </div>
                <div className="flex items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] font-black flex-wrap">
                    <span className="text-white/70">습도 {r(wx.humidity)}%</span>
                </div>
            </div>
            </div>
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
const NextMeetingCard = ({
    meeting, kind, isActive, dayInfo, darkMode, isAdminMode, onTabChange,
    mySession, teamReady, myTeamInfo, myTeamIdx, allowFromDisplay, participantCount, scheduleData,
    isMeetingOver, isMeetingEndSaved, onEndMeeting, onGenerateQR, onEditMeeting, onDeleteMeeting,
    onOpenAttendModal,
}) => {
    const cfg = MEETING_KIND[kind] || MEETING_KIND.self;
    const showOverlay = kind !== 'match' && isActive && isAdminMode && isMeetingOver && !isMeetingEndSaved;
    // 히어로 날짜: 큰 일(日) 숫자 + 월·요일 (달력 한 장 느낌)
    const _md = meeting.date ? new Date(meeting.date + 'T00:00:00') : null;
    const _ok = _md && !isNaN(_md.getTime());
    const dDay = _ok ? _md.getDate() : '';
    const dMon = _ok ? ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'][_md.getMonth()] : '';
    const dDow = _ok ? ['일','월','화','수','목','금','토'][_md.getDay()] : '';
    return (
        <div className="relative">
        <button onClick={()=>{
                // 정기 활성·미출석·출석열림(teamReady)·당일이면 풀스크린 출석 모달, 그 외엔 모임 화면으로 이동(F-2a-1a)
                // ↑ 카드의 '출석하기' 행이 보이는 조건과 100% 동일(라벨↔동작 일치)
                if (isActive && kind === 'self' && !mySession?.checkedIn && teamReady
                    && (dayInfo.type==='today' || dayInfo.type==='started') && onOpenAttendModal) {
                    onOpenAttendModal();
                } else {
                    onTabChange('attend', kind, meeting.id || getMeetingId(meeting));
                }
            }}
            className={`w-full rounded-3xl p-5 text-left text-white active:scale-98 transition-all${showOverlay ? ' blur-sm' : ''}`}
            style={{ background: cfg.accent, boxShadow:`0 16px 34px -6px ${cfg.accent}66` }}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-white/80">{cfg.label}</p>
                    {meeting.isTest && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/30 text-white flex-shrink-0"><Icon.Beaker size={11}/>테스트</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isAdminMode && kind === 'self' && onGenerateQR && (
                        <span role="button" onClick={(e)=>{ e.stopPropagation(); onGenerateQR(meeting); }}
                            className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-white/25 text-white active:scale-95 cursor-pointer">
                            <Icon.QrCode size={12}/> QR
                        </span>
                    )}
                    {dayInfo && dayInfo.type !== 'past' && dayInfo.label && (
                        <span className={`text-xs font-black px-3 py-1 ${
                            dayInfo.type==='started'?'rounded-full bg-live text-[#15171E] moida-pulse-live':
                            dayInfo.urgent?'rounded-xl bg-white text-rose-500':
                            dayInfo.type==='today'?'rounded-xl bg-white text-slate-700':
                            'rounded-xl bg-white/25 text-white'}`}>{dayInfo.label}</span>
                    )}
                </div>
            </div>
            {_ok ? (
                <div className="flex items-end gap-3">
                    <span className="font-black text-[68px] leading-[0.8] tracking-tight tabular-nums">{dDay}</span>
                    <div className="pb-2">
                        <p className="text-[13px] font-black text-white/60 tracking-wider leading-none">{dMon}</p>
                        <p className="text-[22px] font-black leading-tight mt-1">{dDow}요일</p>
                    </div>
                </div>
            ) : (
                <p className="font-black text-[28px] leading-none tracking-tight">{fmtMeetingDate(meeting.date)}</p>
            )}
            <p className="text-sm font-bold text-white/80 mt-2.5">{meeting.start} ~ {meeting.end}</p>
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
                <MeetingWeather lat={meeting.locationLat} lng={meeting.locationLng} isAdminMode={isAdminMode} />
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
                        (kind === 'self' && teamReady) ? (
                            <div className="flex items-center justify-between gap-2 -mx-1.5 px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.2)'}}>
                                <span className="flex items-center gap-1.5 text-sm font-black text-white min-w-0">
                                    <Icon.CheckSq size={16} className="flex-shrink-0"/><span className="truncate">출석하기</span>
                                </span>
                                <Icon.ChevronRight size={16} className="text-white/80 flex-shrink-0"/>
                            </div>
                        ) : kind === 'self' ? (
                            <div className="flex items-center gap-1.5 text-xs text-white/70">
                                <Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">{allowFromDisplay ? `${allowFromDisplay}부터 출석 가능` : '곧 출석이 열립니다'}</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-2 -mx-1.5 px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.2)'}}>
                                <span className="flex items-center gap-1.5 text-sm font-black text-white min-w-0">
                                    <Icon.CheckSq size={16} className="flex-shrink-0"/><span className="truncate">지금 출석 체크하기</span>
                                </span>
                                <Icon.ChevronRight size={16} className="text-white/80 flex-shrink-0"/>
                            </div>
                        )
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
                    ) : mySession?.checkedIn ? (
                        /* F-2b 1단계 — 출석 완료(정기) 시 내 조끼·번호 + 현재 라운드 내 경기 (화면만, 매치표·조끼색 읽기만) */
                        !myTeamInfo ? (
                            <div className="flex items-center gap-1.5 text-xs text-white/70">
                                <Icon.Users size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">팀 편성 준비 중</span>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5">
                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black flex-shrink-0 ${getTeamBadge(myTeamIdx)}`}>{myTeamInfo.jerseyNumber}</span>
                                    <div className="min-w-0">
                                        <p className="font-black text-base text-white leading-tight truncate">{myTeamInfo.teamName}팀 · {myTeamInfo.jerseyNumber}번</p>
                                        <p className="text-xs text-white/75 leading-tight">{getTeamColorName(myTeamIdx)} 조끼</p>
                                    </div>
                                </div>
                                {(() => {
                                    const r = getMyCurrentRoundMatch(scheduleData, myTeamInfo.teamName);
                                    if (!r) return (
                                        <div className="flex items-center gap-1.5 text-xs text-white/70 px-3 py-2 rounded-xl" style={{background:'rgba(255,255,255,0.12)'}}>
                                            <Icon.Calendar size={14} className="flex-shrink-0 opacity-70"/><span className="truncate">매치표 준비 중</span>
                                        </div>
                                    );
                                    if (r.allDone) return (
                                        <div className="flex items-center gap-1.5 text-sm font-black text-white px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.18)'}}>
                                            <Icon.Check size={15} className="flex-shrink-0"/><span className="truncate">모든 경기 종료</span>
                                        </div>
                                    );
                                    return (
                                        <div className="px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.18)'}}>
                                            <p className="text-[11px] font-black text-white/80 mb-1">현재 {r.roundNo}라운드 <span className="text-white/55">/ {r.total}</span></p>
                                            {r.resting ? (
                                                <span className="flex items-center gap-1.5 text-sm font-black text-white min-w-0"><Icon.Coffee size={15} className="flex-shrink-0"/><span className="truncate">이번 라운드는 쉼</span></span>
                                            ) : r.opponent ? (
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="flex items-center gap-1 text-sm font-black text-white flex-shrink-0"><Icon.MapPin size={14} className="opacity-80"/>{r.fieldName}</span>
                                                    <span className="text-white/60 text-xs font-black flex-shrink-0">vs</span>
                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${getTeamBadge(r.oppIdx)}`}>{r.opponent}</span>
                                                    <span className="text-xs text-white/70 truncate">{getTeamColorName(r.oppIdx)} 조끼</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-white/70">경기 정보 없음</span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )
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
            {/* 관리자: 카드에서 바로 수정/삭제 */}
            {isAdminMode && (onEditMeeting || onDeleteMeeting) && (
                <div className="mt-3 pt-3 border-t flex items-center justify-end gap-1.5" style={{borderColor:'rgba(255,255,255,0.22)'}}>
                    {onEditMeeting && <span role="button" onClick={(e)=>{ e.stopPropagation(); onEditMeeting(meeting); }}
                        className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-white/25 text-white active:scale-95 cursor-pointer"><Icon.Edit size={12}/> 수정</span>}
                    {onDeleteMeeting && <span role="button" onClick={(e)=>{ e.stopPropagation(); onDeleteMeeting(meeting); }}
                        className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-rose-500/80 text-white active:scale-95 cursor-pointer"><Icon.Trash size={12}/> 삭제</span>}
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
const DuesAccountCard = ({ isAdminMode, memberName, memberInfo, mode = 'full', onGoDues }) => {
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
    const isExempt = memberInfo ? STAFF_ROLES.includes(memberInfo.role) : false;
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
        if (isExempt) {
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
        <div className="rounded-3xl p-5 text-white" style={{ background: showPayPrompt ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,var(--c-success),#059669)', boxShadow: showPayPrompt ? '0 10px 28px -8px rgba(217,119,6,0.45)' : '0 10px 28px -8px rgba(5,150,105,0.45)' }}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Icon.CreditCard size={24} className="text-white flex-shrink-0"/>
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
                <div className="bg-white/10 rounded-2xl p-3 mb-3 space-y-2">
                    {infoRow('계좌번호', acc.accountNo, 'acc', false)}
                    {acc.amountHint && <p className="text-[11px] font-black text-white/75 pt-0.5">{acc.amountHint}</p>}
                </div>
            )}
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
                <h3 className="font-black text-slate-800">지각 · 노쇼 벌금</h3>
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
                        <button onClick={() => copyText(`${acc.bank ? acc.bank + ' ' : ''}${acc.accountNo}\n${depositName}`)}
                            className="w-full mb-2 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-1">
                            {copied ? <><Icon.Check size={13} />복사됨</> : '계좌번호 · 입금자명 복사'}
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
const TabHome = ({
    notifPermission, registerFcmToken, onTabChange,
    meetingDayInfo, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, memberData, memberInfo, meetings, participantCount, scheduleData,
    mySession, meetingSettings, meetingSettingsMatch, darkMode,
    memberName, announcements, onOpenAnnouncements,
    isAdminMode, isMeetingOver, isMeetingEndSaved, onEndMeeting,
    duesReports, onConfirmDuesReport, onRejectDuesReport, onGoDuesTab,
    generateAttendQRCode, onEditMeeting, onDeleteMeeting, onOpenAttendModal,
}) => {
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
    return (
    <div className="stagger space-y-3">
        {/* 회비 납부 신고 (관리자 전용 · 대기 신고가 있을 때만 — 홈에서 한눈에 확정/삭제) */}
        {isAdminMode && <DuesReportsHomeCard duesReports={duesReports} onConfirm={onConfirmDuesReport} onReject={onRejectDuesReport} onGoDuesTab={onGoDuesTab} />}

        {/* 회비 납부 시기 배너 (납부 시기일 때만 표시 · 누르면 회비 탭으로 이동) */}
        <DuesAccountCard mode="banner" isAdminMode={isAdminMode} memberName={memberName} memberInfo={memberInfo} onGoDues={() => onTabChange('dues')} />

        {/* 미납 벌금 배너 (회원 · 미납 있을 때만 · 누르면 회비 탭으로 이동) */}
        <PenaltyPayCard mode="banner" isAdminMode={isAdminMode} memberName={memberName} memberInfo={memberInfo} onGoDues={() => onTabChange('dues')} />

        {/* 다음 모임 — 정기/매칭 종류별로 분리해 색상으로 구분 (탭하면 모임 탭으로 이동) */}
        {meetingCards.length > 0 ? meetingCards.map(c => (
            <NextMeetingCard key={c.kind} meeting={c.meeting} kind={c.kind} isActive={c.isActive}
                dayInfo={c.dayInfo} darkMode={darkMode} isAdminMode={isAdminMode} onTabChange={onTabChange}
                mySession={mySession} teamReady={teamReady} myTeamInfo={myTeamInfo} myTeamIdx={myTeamIdx}
                allowFromDisplay={allowFromDisplay} participantCount={participantCount} scheduleData={scheduleData}
                isMeetingOver={isMeetingOver} isMeetingEndSaved={isMeetingEndSaved} onEndMeeting={onEndMeeting}
                onGenerateQR={generateAttendQRCode} onEditMeeting={onEditMeeting} onDeleteMeeting={onDeleteMeeting}
                onOpenAttendModal={onOpenAttendModal} />
        )) : (
            <button onClick={()=>onTabChange('meeting-list')} className="w-full card rounded-2xl p-5 text-center active:scale-98 transition-all">
                <div className="text-slate-400 py-3">
                    <div className="flex justify-center mb-2 opacity-30"><Icon.Calendar size={32}/></div>
                    <p className="font-black text-sm">예정된 모임이 없습니다</p>
                    <p className="text-xs mt-0.5 opacity-80">모임 탭에서 등록할 수 있어요</p>
                </div>
            </button>
        )}


        {/* iOS PWA 설치 안내 */}
        {/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone && (
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
