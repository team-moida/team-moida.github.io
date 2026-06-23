function ResultsTab({schedule, completedMatches, currentMatchIndex, config, onToggleComplete}) {
    return (
        <div id="capture-area">
            <div className="text-center mb-4">
                <p className="text-2xl font-black text-slate-800">{config.meetingDate}</p>
                <p className="text-xs text-slate-400 mt-1">{config.startTime} ~ {config.endTime} · {schedule.list.length}라운드</p>
            </div>

            {schedule.list.length===0
                ? <div className="text-center py-20 text-slate-300"><div className="flex justify-center mb-3 opacity-50"><Icon.Calendar size={48}/></div><p className="font-black">설정 탭에서 매치 테이블을 생성해주세요</p></div>
                : schedule.list.map((session, si)=>{
                    const isDone = completedMatches.has(session.id);
                    const isCurrent = si === currentMatchIndex;
                    const isPast = si < currentMatchIndex;
                    return (
                        <div key={session.id} onClick={()=>onToggleComplete(session.id)}
                            className={`match-row mb-2 p-4 rounded-2xl border shadow-sm transition-all ${isCurrent?'bg-teal-50 border-teal-300':isPast||isDone?'match-completed border-slate-100':'bg-white border-slate-100'}`}
                            style={isCurrent?{boxShadow:'0 0 0 2px #4f6ccb40'}:{}}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-black text-[10px] ${isCurrent?'bg-teal-500 border-teal-500 text-white':isDone||isPast?'bg-emerald-500 border-emerald-500 text-white':'border-slate-300 text-slate-400'}`}>
                                    {isDone||isPast?<Icon.Check size={10} className="text-white"/>:si+1}
                                </div>
                                <p className="font-black text-sm text-slate-600">{session.time}</p>
                                {isCurrent&&<span className="text-[9px] font-black text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full ml-auto">진행 중</span>}
                            </div>
                            <div className="space-y-2 pl-9">
                                {session.matches.map((m,mi)=>{
                                    const [t1,t2] = m.match;
                                    const t1Idx = t1.charCodeAt(0)-65;
                                    const t2Idx = t2.charCodeAt(0)-65;
                                    return (
                                        <div key={mi} className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 w-12 shrink-0">{config.fieldNames[m.fieldIdx]||`${m.fieldIdx+1}구장`}</span>
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className={`px-3 py-1.5 rounded-xl font-black text-xs ${getTeamBadge(t1Idx)} ${isPast||isDone?'opacity-60':''}`}>{t1}</span>
                                                <span className="text-slate-400 font-black text-sm">vs</span>
                                                <span className={`px-3 py-1.5 rounded-xl font-black text-xs ${getTeamBadge(t2Idx)} ${isPast||isDone?'opacity-60':''}`}>{t2}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-300">{config.fieldTypes[m.fieldIdx]||'6vs6'}</span>
                                        </div>
                                    );
                                })}
                                {session.resting.length>0 && (
                                    <p className="text-[10px] text-slate-400">휴식: {session.resting.join(', ')}</p>
                                )}
                            </div>
                        </div>
                    );
                })
            }
        </div>
    );
}

function LoadModal({savedSchedules, onLoad, onDelete, onClose}) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-slate-800 mb-4">과거 기록 불러오기</h2>
                {savedSchedules.length===0
                    ? <p className="text-center text-slate-400 py-8">저장된 기록이 없습니다</p>
                    : savedSchedules.map(s=>(
                        <div key={s.id} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
                            <div className="flex-1">
                                <p className="font-black text-slate-800 text-sm">{s.meetingDate}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{s.schedule?.list?.length||0}라운드 · {s.config?.courtCount||0}구장</p>
                            </div>
                            <button onClick={()=>onLoad(s)} className="px-3 py-2 bg-teal-500 text-white rounded-xl font-black text-xs">불러오기</button>
                            <button onClick={()=>onDelete(s.id)} className="p-2 bg-red-50 text-red-400 rounded-xl"><Icon.Trash size={12}/></button>
                        </div>
                    ))
                }
                <button onClick={onClose} className="w-full py-3 text-slate-400 text-sm mt-2">닫기</button>
            </div>
        </div>
    );
}
