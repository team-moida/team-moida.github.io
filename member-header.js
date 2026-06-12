function MemberHeader({
    testMode, memberName, meetingSettings, mySession, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, handleLogout, toggleTheme, darkMode,
    isAdminMode, isMeetingOver, isMeetingEndSaved, onEndMeeting,
    unreadCount = 0, onOpenAnnouncements
}) {
    const showOverlay = isAdminMode && isMeetingOver && !isMeetingEndSaved;
    // 종 클릭 → 전체 공지 모달 (2단계에서 실제 연결). 미연결 시 콘솔 로그만.
    const openAnn = onOpenAnnouncements || (() => console.log('전체 공지 모달 (2단계에서 연결)'));
    return (
        <div className="px-5 pb-4 member-header-bg" style={{paddingTop:'max(3rem, env(safe-area-inset-top))'}}>
            <div className="flex items-center justify-between gap-2 mb-0">
                {/* 엠블럼을 이름 텍스트 왼쪽에 배치 */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <img src="icon.png" alt="OTP FC" className="w-11 h-11 object-contain flex-shrink-0" onError={e=>e.target.style.display='none'}/>
                    <div className="min-w-0">
                        <p className="text-teal-600 text-xs tracking-widest uppercase font-bold">OTP FC</p>
                        <h1 className="text-2xl font-black text-slate-800 mt-0.5 truncate">{memberName} 님</h1>
                    </div>
                </div>
                {/* 아이콘 — 좁은 화면에서 줄바꿈/우측 정렬 (홈·새로고침 버튼 제거: 새로고침은 화면을 당겨서) */}
                <div className="flex flex-wrap items-center justify-end gap-1.5 flex-shrink-0">
                    <button onClick={openAnn} className="relative p-2 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-all text-slate-500" title="공지">
                        <Icon.Bell size={15}/>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>
                    <button onClick={toggleTheme} className="p-2 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-all text-slate-500" title="테마">{darkMode ? <Icon.Sun size={15}/> : <Icon.Moon size={15}/>}</button>
                    <button onClick={handleLogout} className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-all text-red-500" title="로그아웃"><Icon.LogOut size={15}/></button>
                </div>
            </div>
        </div>
    );
}
