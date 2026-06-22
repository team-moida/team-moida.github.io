const CurrentTimeClock = () => {
    const [time, setTime] = React.useState(new Date());
    React.useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
    return (
        <div className="flex flex-col items-center justify-center my-6 animate-zoom-in">
            <span className="text-6xl font-black text-slate-800 tabular-nums tracking-tighter drop-shadow-md">
                {time.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}
            </span>
            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-3">모이다 · OTP FC Attendance</span>
        </div>
    );
};

const AttendMainTab = ({
    meetingTimes, testMode, setMeetingTimes, setSessionData,
    activeList, waitingList, checkedInCount, groupedTeams, unassignedActive,
    limit, isPending, setModal, saveAndResetCurrent, showAlert,
}) => (
    <div>
        <CurrentTimeClock />

        {testMode && (
            <div className="flex gap-2 justify-center mb-4 animate-zoom-in">
                <button onClick={async ()=>{
                    const d = new Date();
                    const startTime = new Date(d.getTime() - 2*60*1000);
                    const endTime = new Date(startTime.getTime() + 3*60*1000);
                    const h = String(startTime.getHours()).padStart(2,'0');
                    const m = String(startTime.getMinutes()).padStart(2,'0');
                    const endH = String(endTime.getHours()).padStart(2,'0');
                    const endM = String(endTime.getMinutes()).padStart(2,'0');
                    const updated = {...meetingTimes, start: `${h}:${m}`, end: `${endH}:${endM}`};
                    setMeetingTimes(updated);
                    await getSettingsCol().doc('meeting_schedule_v2').update(updated);
                    showAlert('지각 시간으로 전환', `시작: ${h}:${m}\n지금 출석하면 "지각" ⚠️`);
                }}
                    className="px-4 py-2 rounded-xl font-black text-sm bg-yellow-500 text-white shadow-lg shadow-yellow-500/40">
                    ⏱️ 지각 시간 전환
                </button>
                <button onClick={async ()=>{
                    const noShowList = activeList.filter(p => !p.checkedIn && p.status !== '노쇼');
                    if (noShowList.length === 0) { showAlert('알림', '미출석 인원이 없습니다.'); return; }
                    try {
                        const batch = db.batch();
                        noShowList.forEach(p => batch.update(getSessionCol().doc(p.id), { status: '노쇼' }));
                        await batch.commit();
                        setSessionData(prev => prev.map(p =>
                            noShowList.some(ns => ns.id === p.id) ? {...p, status: '노쇼'} : p
                        ));
                        showAlert('노쇼 처리', `미출석 ${noShowList.length}명이 노쇼로 처리됨 ✗`);
                    } catch(e) { showAlert('오류', '노쇼 처리 실패'); }
                }}
                    className="px-4 py-2 rounded-xl font-black text-sm bg-red-500 text-white shadow-lg shadow-red-500/40">
                    ❌ 노쇼 시간 전환
                </button>
            </div>
        )}

        {/* 모임 정보 카드 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-xs font-black text-teal-500 uppercase tracking-widest">Next Meeting</p>
                    <p className="text-xl font-black text-slate-800 mt-0.5">{meetingTimes.date}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400">{meetingTimes.start} ~ {meetingTimes.end}</p>
                    {meetingTimes.location && <p className="text-xs font-black text-slate-600 mt-0.5">📍 {meetingTimes.location}</p>}
                    {meetingTimes.managerName && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Icon.User size={11}/>{meetingTimes.managerName}</p>}
                </div>
            </div>
            <div className="flex gap-2 text-center">
                <div className="flex-1 bg-teal-50 rounded-2xl p-3">
                    <p className="text-2xl font-black text-teal-500">{activeList.length}</p>
                    <p className="text-[10px] text-teal-400 mt-0.5">선정</p>
                </div>
                <div className="flex-1 bg-emerald-50 rounded-2xl p-3">
                    <p className="text-2xl font-black text-emerald-500">{checkedInCount}</p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">출석</p>
                </div>
                <div className="flex-1 bg-slate-50 rounded-2xl p-3">
                    <p className="text-2xl font-black text-slate-500">{waitingList.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">대기</p>
                </div>
            </div>
            {/* 출석률 진행 바 */}
            {activeList.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-slate-400">출석률</span>
                        <span className="text-[10px] font-black text-emerald-500">{checkedInCount}/{activeList.length} · {Math.round(checkedInCount/activeList.length*100)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                            style={{width:`${Math.round(checkedInCount/activeList.length*100)}%`,background:checkedInCount===0?'#e2e8f0':'linear-gradient(90deg,#14b8a6,#10b981)'}}/>
                    </div>
                </div>
            )}
            {/* 출석 상태 통계 */}
            {activeList.some(p => p.checkedIn) && (
                <div className="flex gap-2 text-center mt-3 pt-3 border-t border-slate-100">
                    <div className="flex-1 bg-emerald-50 rounded-xl p-2">
                        <p className="text-xl font-black text-emerald-600">{activeList.filter(p=>p.checkedIn && p.status==='정상').length}</p>
                        <p className="text-[9px] text-emerald-500 mt-0.5">정상</p>
                    </div>
                    <div className="flex-1 bg-yellow-50 rounded-xl p-2">
                        <p className="text-xl font-black text-yellow-600">{activeList.filter(p=>p.checkedIn && p.status==='지각').length}</p>
                        <p className="text-[9px] text-yellow-500 mt-0.5">지각</p>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-xl p-2">
                        <p className="text-xl font-black text-red-600">{activeList.filter(p=>!p.checkedIn).length}</p>
                        <p className="text-[9px] text-red-500 mt-0.5">노쇼</p>
                    </div>
                </div>
            )}
        </div>

        {/* 팀별 출석 현황 */}
        {groupedTeams.length > 0 ? (
            <div>
                {groupedTeams.map((group) => (
                    <div key={group.teamName} className="mb-5">
                        {/* 팀 헤더 */}
                        <div className={`flex items-center justify-between rounded-2xl p-3 mb-2 border ${getTeamColorClass(group.teamIdx)}`}>
                            <div className="flex items-center gap-2">
                                <span className={`w-8 h-8 rounded-xl text-sm font-black flex items-center justify-center ${getTeamBadgeColor(group.teamIdx)}`}>{group.teamName}</span>
                                <div>
                                    <p className="font-black text-slate-700 text-sm">{group.teamName}팀</p>
                                    <p className="text-[10px] text-slate-400">출석 {group.members.filter(m=>m.checkedIn).length} / {group.members.length}명</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-400">{getTeamColorName(group.teamIdx)} 조끼</span>
                        </div>
                        {/* 회원 카드 그리드 — 팀 인원수만큼 한 줄 정사각형 */}
                        <div className="grid gap-1.5" style={{gridTemplateColumns:`repeat(${group.members.length},1fr)`}}>
                            {group.members.map(p=>(
                                <button key={p.id} onClick={()=>setModal({type:'checkin',data:{...p,teamIdx:group.teamIdx,teamName:group.teamName}})}
                                    className={`relative overflow-hidden rounded-xl aspect-square flex items-center justify-center transition-all ${getTeamBadgeColor(group.teamIdx)} ${p.status==='노쇼'?'opacity-50':p.checkedIn?'opacity-40':''}`}
                                    style={{containerType:'inline-size'}}>
                                    {/* 출석 완료 표시: 우상단 ✓ 배지 (흐릿 처리와 함께 구분) */}
                                    {p.checkedIn&&<div style={{position:'absolute',top:'5%',right:'5%',width:'30cqw',height:'30cqw',maxWidth:'34px',maxHeight:'34px',minWidth:'16px',minHeight:'16px',borderRadius:'50%',background:'rgba(255,255,255,0.92)',color:'#10b981',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,lineHeight:1,fontSize:'clamp(12px,20cqw,22px)',pointerEvents:'none'}}>✓</div>}
                                    {/* 조끼 번호 + W/G 뱃지 (좌상단) */}
                                    <div style={{position:'absolute',top:'4px',left:'6px',display:'flex',alignItems:'center',gap:'3px',pointerEvents:'none',userSelect:'none'}}>
                                        <span style={{fontSize:'clamp(14px,28cqw,66px)',fontWeight:'900',opacity:0.55,lineHeight:1}}>{p.jerseyNumber}</span>
                                        {p.gender==='여성'&&<span style={{fontSize:'clamp(8px,9cqw,15px)',fontWeight:'900',padding:'1px 3px',borderRadius:3,background:'#ec4899',color:'white',lineHeight:1}}>W</span>}
                                        {p.isGuest&&<span style={{fontSize:'clamp(8px,9cqw,15px)',fontWeight:'900',padding:'1px 3px',borderRadius:3,background:'rgba(0,0,0,0.3)',color:'white',lineHeight:1}}>G</span>}
                                    </div>
                                    {/* 이름 (정중앙) — 카드 크기에 비례(cqw), 미지원 브라우저는 17px로 폴백 */}
                                    <p className="relative font-black text-[17px] text-center" style={{fontSize:'clamp(13px,24cqw,54px)',lineHeight:'1.15',wordBreak:'keep-all',maxWidth:'92%'}}>{p.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* 미편성 / 게스트 */}
                {unassignedActive.length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-2">미편성 / 게스트</p>
                        <div className="space-y-1.5">
                            {unassignedActive.map(p => (
                                <button key={p.id} onClick={()=>setModal({type:'checkin',data:p})}
                                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${p.status==='노쇼'?'bg-red-50 border-red-200':p.checkedIn?'bg-emerald-50 border-emerald-200':'bg-white border-slate-100 hover:border-teal-200'}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-black text-sm text-slate-800">{p.name}</span>
                                            {p.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                            {p.isGuest&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-800 text-white rounded-lg">G</span>}
                                        </div>
                                        {p.status === '노쇼' ? (
                                            <p className="text-[10px] text-red-600 font-black mt-0.5">✗ 노쇼{p.noShowFine ? ` · ${p.noShowFine / 10000}만원` : ''}</p>
                                        ) : p.checkedIn ? (
                                            p.status === '정상' ? (
                                                <p className="text-[10px] text-emerald-600 font-black mt-0.5">✓ 정상 · {p.checkInTime}</p>
                                            ) : (
                                                <p className="text-[10px] text-yellow-600 font-black mt-0.5">⚠️ 지각 · {p.checkInTime}</p>
                                            )
                                        ) : null}
                                    </div>
                                    {p.status === '노쇼'
                                        ? <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black">✗</span>
                                        : p.checkedIn
                                            ? <span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0"><Icon.Check size={12} className="text-white"/></span>
                                            : <span className="text-xs font-black text-slate-300 flex-shrink-0">체크인 →</span>
                                    }
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        ) : activeList.length > 0 ? (
            <div className="space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">출석 명단 ({limit}명 선착순)</p>
                {activeList.map((p, idx) => (
                    <button key={p.id} onClick={()=>setModal({type:'checkin',data:p})}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${p.status==='노쇼'?'bg-red-50 border-red-200':p.checkedIn?'bg-emerald-50 border-emerald-200':'bg-white border-slate-100 hover:border-teal-200'}`}>
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center flex-shrink-0">{idx+1}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-sm text-slate-800">{p.name}</span>
                                {p.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                {p.isGuest&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-800 text-white rounded-lg">G</span>}
                            </div>
                            {p.status === '노쇼' ? (
                                <p className="text-[10px] text-red-600 font-black mt-0.5">✗ 노쇼{p.noShowFine ? ` · ${p.noShowFine / 10000}만원` : ''}</p>
                            ) : p.checkedIn ? (
                                p.status === '정상' ? (
                                    <p className="text-[10px] text-emerald-600 font-black mt-0.5">✓ 정상 · {p.checkInTime}</p>
                                ) : (
                                    <p className="text-[10px] text-yellow-600 font-black mt-0.5">⚠️ 지각 · {p.checkInTime}</p>
                                )
                            ) : null}
                        </div>
                        {p.status === '노쇼'
                            ? <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black">✗</span>
                            : p.checkedIn
                                ? <span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0"><Icon.Check size={12} className="text-white" /></span>
                                : <span className="text-xs font-black text-slate-300 flex-shrink-0">체크인 →</span>
                        }
                    </button>
                ))}
            </div>
        ) : (
            <div className="text-center py-16 text-slate-300">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-black">선정된 인원이 없습니다</p>
                <p className="text-xs mt-1">선정 탭에서 인원을 추가하세요</p>
            </div>
        )}

        {waitingList.length > 0 && (
            <div className="mt-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-2">대기자</p>
                {waitingList.map((p,i) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 mb-1.5">
                        <span className="text-xs font-black text-slate-400 w-5">{limit+i+1}</span>
                        <span className="text-sm font-black text-slate-400">{p.name}</span>
                        {p.isGuest&&<span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded-lg font-black">G</span>}
                    </div>
                ))}
            </div>
        )}

        {/* 액션 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t">
            <div className="max-w-5xl mx-auto flex gap-2">
                <button onClick={saveAndResetCurrent} disabled={isPending||activeList.length===0}
                    className="flex-1 py-3.5 bg-teal-500 text-white rounded-2xl font-black text-sm disabled:opacity-30">
                    {isPending?'처리 중...':'기록 확정 →'}
                </button>
            </div>
        </div>
    </div>
);
