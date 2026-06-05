// ─── 홈 탭 ────────────────────────────────────────────────────────────────────
const TabHome = ({
    notifPermission, registerFcmToken, onTabChange,
    meetingDayInfo, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, memberData,
    mySession, meetingSettings, darkMode,
    memberName, announcements,
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
        {announcements.length > 0 && (
            <div className="card rounded-3xl p-5">
                <p className="text-xs font-black text-teal-500 uppercase tracking-widest mb-3">공지사항</p>
                <div className="space-y-3">
                    {announcements.map(a => (
                        <div key={a.id} className="pb-3 border-b border-slate-100 last:pb-0 last:border-0">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-black text-sm text-slate-800 flex-1">{a.title}</p>
                                <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                                    {a.sentAt ? new Date(a.sentAt).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}) : ''}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{a.body}</p>
                            {a.sentBy && <p className="text-[10px] text-slate-400 mt-1.5">{a.sentBy}</p>}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);
// ─────────────────────────────────────────────────────────────────────────────
