function MemberHeader({
    testMode, memberName, meetingSettings, mySession, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, handleLogout, toggleTheme, darkMode,
    isAdminMode, isMeetingOver, isMeetingEndSaved, onEndMeeting,
    unreadCount = 0, onOpenAnnouncements, canPreview, onEnterTestPreview,
    onOpenProfile, isInPreview, onExitTestPreview, children
}) {
    const showOverlay = isAdminMode && isMeetingOver && !isMeetingEndSaved;
    // 종 클릭 → 전체 공지 모달 (2단계에서 실제 연결). 미연결 시 콘솔 로그만.
    const openAnn = onOpenAnnouncements || (() => console.log('전체 공지 모달 (2단계에서 연결)'));
    const [menuOpen, setMenuOpen] = React.useState(false);
    const avatarChar = (memberName || '').trim().slice(-1) || '?';
    return (
        <div className="px-5 pb-4 member-header-bg" style={{paddingTop:'max(2.5rem, calc(env(safe-area-inset-top) + 1rem))'}}>
            <div className="flex items-center justify-between gap-2 mb-0">
                {/* 브랜드: 모이다(크게) + OTP FC·이름(작게) 병기 — 엠블럼은 왼쪽 유지 */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <img src="icon.png" alt="OTP FC" className="w-11 h-11 object-contain flex-shrink-0" onError={e=>e.target.style.display='none'}/>
                    <div className="min-w-0">
                        <h1 className="text-[28px] leading-none font-black text-teal-600 tracking-tight">모이다</h1>
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
                    {(canPreview || isInPreview) && (
                        <button
                            onClick={isInPreview ? onExitTestPreview : onEnterTestPreview}
                            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isInPreview ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600' : 'bg-orange-100 hover:bg-orange-200 text-orange-500'}`}
                            title={isInPreview ? '관리자 모드로 복귀' : '회원 화면으로 전환'}
                        >
                            <Icon.User size={13}/>
                            <span className="text-[9px] font-black leading-none">{isInPreview ? '관리자' : '회원'}</span>
                        </button>
                    )}
                    {/* 프로필 아바타(LAB형) → 내 프로필 · 라이트/다크 · 로그아웃 */}
                    <div className="relative">
                        <button onClick={()=>setMenuOpen(o=>!o)} className="w-9 h-9 rounded-full bg-teal-500 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm" title="프로필">
                            {avatarChar}
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
