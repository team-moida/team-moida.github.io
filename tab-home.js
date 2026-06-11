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
        <div className="card rounded-2xl p-4 border-teal-100">
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
const AnnounceTicker = ({ announcements, onOpen }) => {
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
        <button onClick={onOpen} className="w-full card rounded-2xl px-4 py-3 text-left active:scale-98 transition-all overflow-hidden">
            <div className="flex items-center gap-2.5">
                <Icon.Bell size={15} className="text-teal-500 flex-shrink-0"/>
                {/* key 변경 → moida-ticker-up 애니메이션 재생 (아래에서 위로 등장) */}
                <div key={safeIdx} className="flex-1 min-w-0 flex items-center justify-between gap-2 moida-ticker-up">
                    <span className="font-black text-sm text-slate-700 truncate">{a.title}</span>
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
const TabHome = ({
    notifPermission, registerFcmToken, onTabChange,
    meetingDayInfo, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, memberData,
    mySession, meetingSettings, darkMode,
    memberName, announcements, onOpenAnnouncements,
}) => (
    <div className="animate-in space-y-3">
        {/* 공지 순환 띠 (맨 위, 항상 표시) */}
        <AnnounceTicker announcements={announcements} onOpen={onOpenAnnouncements} />

        {/* 다음 모임 카드 (항상 표시 · 탭하면 모임 탭으로 이동) — 출석체크·팀편성은 시점이 되면 카드 안에 표시 */}
        <button onClick={()=>onTabChange('attend')} className="w-full card rounded-3xl p-5 text-left active:scale-98 transition-all">
            {meetingSettings?.date && meetingDayInfo ? (
                <>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                        <p className="text-xs font-black text-teal-500 uppercase tracking-widest">다음 모임</p>
                        {meetingDayInfo.type !== 'past' && meetingDayInfo.label && (
                            <span className={`flex-shrink-0 text-xs font-black px-3 py-1 rounded-xl ${
                                meetingDayInfo.type==='started'?'bg-emerald-50 text-emerald-500':
                                meetingDayInfo.urgent?'bg-red-50 text-red-500':
                                meetingDayInfo.type==='today'?'bg-teal-50 text-teal-500':
                                'bg-slate-100 text-slate-500'}`}>{meetingDayInfo.label}</span>
                        )}
                    </div>
                    <p className="font-black text-lg leading-tight">{fmtMeetingDate(meetingSettings.date)} · {meetingSettings.start}~{meetingSettings.end}</p>
                    {meetingSettings.location && (
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1 min-w-0">
                            <Icon.MapPin size={13} className="flex-shrink-0"/><span className="truncate">{meetingSettings.location}</span>
                        </p>
                    )}
                    <div className="mt-4 pt-4 border-t space-y-2.5" style={{borderColor: darkMode?'rgba(255,255,255,0.08)':'#f1f5f9'}}>
                        {/* 출석 상태 — 출석체크 시점(당일/모임중)이 되면 체크 버튼, 완료 시 완료 표시 */}
                        {mySession?.checkedIn ? (
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-sm font-black text-emerald-500 min-w-0">
                                    <Icon.Check size={16} className="flex-shrink-0"/><span className="truncate">출석 완료</span>
                                </span>
                                <span className="text-xs font-black text-slate-400 flex-shrink-0">{mySession.checkInTime}</span>
                            </div>
                        ) : (meetingDayInfo.type==='today' || meetingDayInfo.type==='started') ? (
                            <div className="flex items-center justify-between gap-2 -mx-1.5 px-3 py-2.5 rounded-xl" style={{background: darkMode?'rgba(20,184,166,0.14)':'#f0fdfa'}}>
                                <span className="flex items-center gap-1.5 text-sm font-black text-teal-600 min-w-0">
                                    <Icon.CheckSq size={16} className="flex-shrink-0"/><span className="truncate">지금 출석 체크하기</span>
                                </span>
                                <Icon.ChevronRight size={16} className="text-teal-400 flex-shrink-0"/>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Icon.Clock size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">모임 당일에 출석 체크가 열립니다</span>
                            </div>
                        )}
                        {/* 팀 상태 — 팀편성 공개 시점이 되면 내 팀 표시 */}
                        {teamReady && myTeamInfo ? (
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-sm font-black text-slate-700 min-w-0">
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-[11px] font-black flex-shrink-0 ${getTeamBadge(myTeamIdx)}`}>{myTeamInfo.jerseyNumber}</span>
                                    <span className="truncate">내 팀 · {myTeamInfo.teamName}팀 {myTeamInfo.jerseyNumber}번</span>
                                </span>
                                <span className="text-xs text-slate-400 flex-shrink-0">{getTeamColorName(myTeamIdx)} 조끼</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Icon.Users size={14} className="flex-shrink-0 opacity-60"/><span className="truncate">팀 편성 비공개 중{allowFromDisplay?` · ${allowFromDisplay}부터 공개`:''}</span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center text-slate-400 py-3">
                    <div className="flex justify-center mb-2 opacity-30"><Icon.Calendar size={32}/></div>
                    <p className="font-black text-sm">예정된 모임이 없습니다</p>
                    <p className="text-xs mt-0.5 opacity-80">모임 탭에서 등록할 수 있어요</p>
                </div>
            )}
        </button>

        {/* iOS PWA 설치 안내 */}
        {/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone && (
            <div className="card rounded-2xl p-4 border-orange-100">
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
// ─────────────────────────────────────────────────────────────────────────────
