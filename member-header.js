function MemberHeader({
    testMode, memberName, meetingSettings, mySession, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, handleLogout, toggleTheme, darkMode,
    isAdminMode, isMeetingOver, isMeetingEndSaved, onEndMeeting,
    unreadCount = 0, onOpenAnnouncements,
    onOpenProfile, profileImage, children,
    isDeveloper, viewMode, onChangeViewMode, onLockDeveloper, onLogoHold
}) {
    const showOverlay = isAdminMode && isMeetingOver && !isMeetingEndSaved;
    // 종 클릭 → 전체 공지 모달 (2단계에서 실제 연결). 미연결 시 콘솔 로그만.
    const openAnn = onOpenAnnouncements || (() => console.log('전체 공지 모달 (2단계에서 연결)'));
    const [menuOpen, setMenuOpen] = React.useState(false);
    // 로고 길게 누르면(650ms) 개발자 PIN 진입 — 평소엔 보이지 않는 은밀한 트리거
    const holdRef = React.useRef(null);
    const cancelHold = () => { if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; } };
    const startHold = () => { if (!onLogoHold) return; cancelHold(); holdRef.current = setTimeout(() => { holdRef.current = null; onLogoHold(); }, 650); };
    const avatarChar = (memberName || '').trim().slice(-1) || '?';
    return (
        <div className="px-5 pb-4 member-header-bg" style={{paddingTop:'max(2.5rem, calc(env(safe-area-inset-top) + 1rem))'}}>
            <div className="flex items-center justify-between gap-2 mb-0">
                {/* 브랜드: 모이다(크게) + OTP FC·이름(작게) 병기 — 엠블럼은 왼쪽 유지 */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <img src="icon.png" alt="OTP FC" className="w-11 h-11 object-contain flex-shrink-0" onError={e=>e.target.style.display='none'}/>
                    <div className="min-w-0">
                        <h1 onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onContextMenu={e=>e.preventDefault()} className="text-[28px] leading-none font-black text-teal-600" style={{fontFamily:"'Paperlogy', 'Pretendard Variable', Pretendard, -apple-system, sans-serif", WebkitTextStroke:'0.6px currentColor', letterSpacing:'-0.04em'}}>모이다</h1>
                        <p className="text-[13px] font-bold text-slate-500 mt-1.5 truncate">OTP FC · {memberName} 님</p>
                    </div>
                </div>
                {/* 아이콘 — 좁은 화면에서 줄바꿈/우측 정렬 (홈·새로고침 버튼 제거: 새로고침은 화면을 당겨서) */}
                <div className="flex items-center justify-end gap-1.5 flex-shrink-0">
                    <button onClick={openAnn} className="relative p-2 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-all text-slate-500" title="공지">
                        <Icon.Bell size={15}/>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>
                    {isDeveloper && (
                        <div className="flex items-center gap-0.5 bg-slate-200/70 rounded-lg p-0.5" title="개발자 전용 — 보기 모드 전환">
                            {[['dev','개발'],['staff','운영'],['member','회원']].map(([v,l]) => (
                                <button key={v} onClick={() => v !== viewMode && onChangeViewMode && onChangeViewMode(v)}
                                    className={`px-1.5 py-1 rounded-md text-[10px] font-black leading-none transition-all ${viewMode === v ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>{l}</button>
                            ))}
                        </div>
                    )}
                    {/* 프로필 아바타(LAB형) → 내 프로필 · 라이트/다크 · 로그아웃 */}
                    <div className="relative">
                        <button onClick={()=>setMenuOpen(o=>!o)} className="w-9 h-9 rounded-full bg-teal-500 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden" title="프로필">
                            {profileImage ? <img src={profileImage} alt="" className="w-full h-full object-cover"/> : avatarChar}
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={()=>setMenuOpen(false)}/>
                                <div className="absolute right-0 top-11 z-50 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1">
                                    <button onClick={()=>{ setMenuOpen(false); onOpenProfile && onOpenProfile(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-slate-700">
                                        <Icon.User size={16}/> 내 프로필
                                    </button>
                                    <button onClick={()=>{ toggleTheme && toggleTheme(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-slate-700">
                                        {darkMode ? <Icon.Sun size={16}/> : <Icon.Moon size={16}/>} {darkMode ? '라이트 모드' : '다크 모드'}
                                    </button>
                                    {isDeveloper && (
                                        <button onClick={()=>{ setMenuOpen(false); onLockDeveloper && onLockDeveloper(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-slate-700">
                                            <Icon.Wrench size={16}/> 개발자 잠금
                                        </button>
                                    )}
                                    <button onClick={()=>{ setMenuOpen(false); handleLogout && handleLogout(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-red-500">
                                        <Icon.LogOut size={16}/> 로그아웃
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {children && <div className="mt-3">{children}</div>}
        </div>
    );
}
