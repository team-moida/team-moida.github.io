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
