function MemberHeader({
    testMode, memberName, meetingSettings, mySession, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, handleLogout, toggleTheme, darkMode,
    isAdminMode, isMeetingOver, isMeetingEndSaved, onEndMeeting
}) {
    const showOverlay = isAdminMode && isMeetingOver && !isMeetingEndSaved;
    return (
        <div className="px-5 pb-6 member-header-bg" style={{paddingTop:'max(3rem, env(safe-area-inset-top))'}}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-teal-600 text-xs tracking-widest uppercase font-bold">OTP FC</p>
                    <h1 className="text-2xl font-black text-slate-800 mt-0.5">{memberName} 님</h1>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex gap-1.5">
                        <button onClick={()=>window.location.href='index.html'} className="p-2 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-all text-slate-500"><Icon.Home size={15}/></button>
                        <button onClick={()=>window.location.reload()} className="p-2 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-all text-slate-500" title="새로고침"><Icon.Refresh size={15}/></button>
                        <button onClick={handleLogout} className="text-[10px] font-black text-slate-500 px-2.5 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-all">로그아웃</button>
                        <button onClick={toggleTheme} className="p-2 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-all text-slate-500" title="테마">{darkMode ? <Icon.Sun size={15}/> : <Icon.Moon size={15}/>}</button>
                    </div>
                    <img src="icon.png" alt="OTP FC" className="w-10 h-10 object-contain opacity-70" onError={e=>e.target.style.display='none'}/>
                </div>
            </div>
            {meetingSettings && (
                <div className="relative">
                    <div className={`card rounded-2xl p-4 mt-2 transition-all${showOverlay ? ' blur-sm' : ''}`}>
                        <p className="text-[10px] text-teal-500 font-black uppercase tracking-widest mb-2">다음 모임</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-black text-lg">{meetingSettings.date}</p>
                                <p className="text-slate-400 text-xs mt-0.5">{meetingSettings.start} ~ {meetingSettings.end}</p>
                                {meetingSettings.location && <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1"><Icon.MapPin size={11}/>{meetingSettings.location}</p>}
                            </div>
                            {mySession?.checkedIn
                                ? <div className="bg-emerald-500 px-4 py-2 rounded-xl text-sm font-black text-white">✓ 출석</div>
                                : !teamReady
                                    ? <div className="bg-slate-100 px-3 py-2 rounded-xl text-[10px] font-black text-slate-400 text-center leading-tight">
                                        🔒<br/>{allowFromDisplay} 공개
                                      </div>
                                    : myTeamInfo
                                        ? <div className={`${getTeamBadge(myTeamIdx)} px-3 py-2 rounded-xl text-sm font-black text-center`}>
                                            <div>{myTeamInfo.teamName}팀 {myTeamInfo.jerseyNumber}번</div>
                                            <div className="text-[10px] opacity-80">{getTeamColorName(myTeamIdx)} 조끼</div>
                                          </div>
                                        : <div className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-black text-slate-400">미편성</div>
                            }
                        </div>
                    </div>
                    {showOverlay && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-2xl">
                            <button onClick={onEndMeeting} className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg">모임 종료</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
