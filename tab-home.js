// ─── 안드로이드 알림 팝업 안내 카드 ──────────────────────────────────────────────
// 안드로이드 PWA는 알림 채널이 기본 "팝업 표시 꺼짐"으로 생성돼, 회원이 직접
// 켜야 배너가 뜬다. 표시 조건: 안드로이드 + standalone + 권한 granted + 미닫음.
// 닫음 여부는 localStorage에 기억 (Cache API와 별개라 PWA 재실행 후에도 유지).
const ANDROID_NOTIF_GUIDE_KEY = 'moida_androidNotifGuideDismissed';
const AndroidNotifGuide = ({ notifPermission }) => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
    const [dismissed, setDismissed] = React.useState(() => {
        try { return localStorage.getItem(ANDROID_NOTIF_GUIDE_KEY) === '1'; } catch { return false; }
    });
    const [expanded, setExpanded] = React.useState(false);

    // 알림을 이미 허용(granted)한 뒤에만 의미 있음. 미허용 땐 기존 "푸시 알림 받기" 배너가 안내.
    if (!isAndroid || !isStandalone || notifPermission !== 'granted' || dismissed) return null;

    const dismiss = () => {
        try { localStorage.setItem(ANDROID_NOTIF_GUIDE_KEY, '1'); } catch {}
        setDismissed(true);
    };

    // 버튼 동작: 웹/PWA에서 안드로이드 OS의 앱 알림 채널 설정 화면으로 직접 보내는
    // 표준 API는 없다 (chrome://·android-app:// intent는 보안상 JS로 이동 불가).
    // 권한이 granted인 이 카드에서는 시스템 설정을 열 수 없으므로, 버튼을 누르면
    // 카드를 펼쳐 수동 안내 단계를 보여주는 것이 가장 안정적이다.
    return (
        <div className="card rounded-2xl p-4 border-teal-100">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon.Bell size={18} className="text-teal-500"/>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-teal-600">알림이 조용히 올 수 있어요</p>
                    <p className="text-xs text-slate-400 mt-0.5">안드로이드 폰은 한 번만 설정하면 배너로 떠요</p>
                </div>
                <button onClick={()=>setExpanded(v=>!v)} className="flex-shrink-0 flex items-center gap-0.5 text-xs font-black text-teal-500 bg-teal-50 px-3 py-1.5 rounded-xl active:scale-95">
                    설정 안내<Icon.ChevronRight size={13} className={`transition-transform ${expanded?'rotate-90':''}`}/>
                </button>
            </div>
            {expanded && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                    <ol className="space-y-2">
                        <li className="flex gap-2.5 text-xs text-slate-600">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 text-white font-black flex items-center justify-center">1</span>
                            <span className="leading-relaxed pt-0.5">홈 화면 <b className="text-slate-800">'모이다' 아이콘</b>을 길게 누르기</span>
                        </li>
                        <li className="flex gap-2.5 text-xs text-slate-600">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 text-white font-black flex items-center justify-center">2</span>
                            <span className="leading-relaxed pt-0.5"><b className="text-slate-800">앱 정보(ⓘ)</b> 누르기</span>
                        </li>
                        <li className="flex gap-2.5 text-xs text-slate-600">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 text-white font-black flex items-center justify-center">3</span>
                            <span className="leading-relaxed pt-0.5"><b className="text-slate-800">알림</b> → <b className="text-slate-800">"팝업으로 표시"</b> 켜기</span>
                        </li>
                    </ol>
                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">기종마다 메뉴 이름이 조금 다를 수 있어요. 설정하면 다음 알림부터 배너로 떠요.</p>
                </div>
            )}
            <button onClick={dismiss} className="block mt-2 ml-auto text-[11px] font-black text-slate-400 active:scale-95">다음에 안 보기</button>
        </div>
    );
};

// ─── 홈 탭 ────────────────────────────────────────────────────────────────────
const TabHome = ({
    notifPermission, registerFcmToken, onTabChange,
    meetingDayInfo, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, memberData,
    mySession, meetingSettings, darkMode,
    memberName, announcements,
    isAdminMode, onAddAnnouncement, onEditAnnouncement, onDeleteAnnouncement,
}) => (
    <div className="animate-in space-y-3">
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
        {/* 안드로이드 알림 팝업 안내 (PWA standalone + 권한 허용 시) */}
        <AndroidNotifGuide notifPermission={notifPermission} />
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
        {/* 빠른 출석 */}
        <button onClick={()=>onTabChange('attend')} className="w-full card rounded-3xl p-5 text-left active:scale-98 transition-all">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0"><Icon.CheckSq size={26} className="text-white"/></div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-lg">출석 체크</p>
                    <p className="text-slate-400 text-xs mt-0.5">GPS 또는 QR로 출석</p>
                </div>
                {meetingDayInfo && meetingDayInfo.type !== 'past' && (
                    <div className={`flex-shrink-0 text-center px-3 py-1.5 rounded-xl text-xs font-black ${
                        meetingDayInfo.type==='started'?'bg-emerald-50 text-emerald-500':
                        meetingDayInfo.urgent?'bg-red-50 text-red-500':
                        meetingDayInfo.type==='today'?'bg-teal-50 text-teal-500':
                        'bg-slate-100 text-slate-500'}`}>
                        {meetingDayInfo.label}
                    </div>
                )}
            </div>
        </button>

        {/* 내 팀 */}
        {!teamReady ? (
            <div className="card rounded-3xl p-5 text-center text-slate-400">
                <div className="flex justify-center mb-2 opacity-25"><Icon.Users size={36}/></div>
                <p className="font-black text-sm">팀 편성 비공개 중</p>
                {allowFromDisplay && <p className="text-xs mt-1">{allowFromDisplay}부터 공개됩니다</p>}
            </div>
        ) : myTeamInfo ? (
            <div className="card rounded-3xl p-5">
                <p className="text-xs font-black text-teal-500 uppercase tracking-widest mb-3">내 팀</p>
                <div className="flex items-center gap-3 mb-3">
                    <span className={`w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center ${getTeamBadge(myTeamIdx)} text-white flex-shrink-0`}>{myTeamInfo.jerseyNumber}</span>
                    <div>
                        <p className="font-black text-lg leading-tight">{myTeamInfo.teamName}팀 {myTeamInfo.jerseyNumber}번</p>
                        <p className="text-xs text-slate-400">{getTeamColorName(myTeamIdx)} 조끼 · {myTeamInfo.members.length}명</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {myTeamInfo.members.map((m,i)=>(
                        <span key={i} className={`px-3 py-1.5 rounded-xl text-xs font-black ${m.memberId===memberData?.memberId?'bg-teal-500 text-white':'bg-slate-100 text-slate-600'}`}>
                            <span className="opacity-60 mr-0.5">{i+1}.</span>{m.name}{m.gender==='여성'&&<span className="ml-1 opacity-60">W</span>}
                        </span>
                    ))}
                </div>
            </div>
        ) : (
            <div className="card rounded-3xl p-5 text-center text-slate-500">
                <div className="flex justify-center mb-2 opacity-30"><Icon.Users size={36}/></div>
                <p className="font-black text-sm">아직 팀이 편성되지 않았습니다</p>
            </div>
        )}

        {/* 출석 현황 */}
        {mySession && (
            mySession.checkedIn ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0"><Icon.Check size={24} className="text-white"/></div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-xl text-emerald-500">출석 완료</p>
                            <p className="text-emerald-500 text-xs opacity-70">{meetingSettings?.date}</p>
                        </div>
                        <span className={`flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-xl ${mySession.status==='정상'?'bg-emerald-500 text-white':'bg-yellow-400 text-slate-800'}`}>
                            {mySession.status}
                        </span>
                    </div>
                    <div style={{background: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)'}} className="rounded-2xl p-3 flex items-center justify-between">
                        <span className="text-slate-500 text-xs font-black">{memberName}</span>
                        <span className="text-slate-700 font-black text-sm">{mySession.checkInTime}</span>
                    </div>
                </div>
            ) : (
                <div className="card rounded-3xl p-5">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">오늘 출석 현황</p>
                    <div className="flex items-center justify-between">
                        <p className="text-slate-500 font-black text-sm">미출석</p>
                        <button onClick={()=>onTabChange('attend')} className="text-xs font-black px-3 py-2 bg-teal-50 text-teal-500 rounded-xl active:scale-95">
                            출석하기 →
                        </button>
                    </div>
                    {meetingDayInfo?.type === 'today' && (
                        <p className={`text-xs font-black mt-2 ${meetingDayInfo.urgent?'text-red-500':'text-teal-500'}`}>⏰ {meetingDayInfo.label}</p>
                    )}
                    {meetingDayInfo?.type === 'started' && (
                        <p className="text-xs font-black mt-2 text-emerald-500 flex items-center gap-1"><Icon.Activity size={11}/>모임이 진행 중입니다</p>
                    )}
                </div>
            )
        )}
        {/* 공지사항 */}
        {(announcements.length > 0 || isAdminMode) && (
            <div className="card rounded-3xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-black text-teal-500 uppercase tracking-widest">공지사항</p>
                    {isAdminMode && (
                        <button onClick={onAddAnnouncement} className="p-1.5 rounded-xl bg-teal-50 text-teal-500">
                            <Icon.Plus size={14}/>
                        </button>
                    )}
                </div>
                {announcements.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">등록된 공지가 없습니다</p>
                ) : (
                    <div className="space-y-3">
                        {announcements.map(a => (
                            <div key={a.id} className="pb-3 border-b border-slate-100 last:pb-0 last:border-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-black text-sm text-slate-800 flex-1">{a.title}</p>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                            {a.sentAt ? new Date(a.sentAt).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}) : ''}
                                        </span>
                                        {isAdminMode && <>
                                            <button onClick={()=>onEditAnnouncement(a)} className="p-1 rounded-lg text-blue-400"><Icon.Edit size={11}/></button>
                                            <button onClick={()=>onDeleteAnnouncement(a.id)} className="p-1 rounded-lg text-red-400"><Icon.Trash size={11}/></button>
                                        </>}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{a.body}</p>
                                {a.sentBy && <p className="text-[10px] text-slate-400 mt-1.5">{a.sentBy}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </div>
);
// ─────────────────────────────────────────────────────────────────────────────
