// ─── 매치판 큰 팀 배지 (조끼색 + 팀글자) ───────────────────────────────────────
// vmin 단위 → 가로/세로 회전에 맞춰 화면 짧은 변 기준으로 자동 축소 (스크롤 방지)
const MatchBoardTeam = ({ name }) => {
    const idx = String(name).charCodeAt(0) - 65;
    return (
        <div style={{textAlign:'center',minWidth:0}}>
            <div className={getTeamBadge(idx)}
                style={{width:'clamp(48px,12vmin,140px)',height:'clamp(48px,12vmin,140px)',borderRadius:'clamp(14px,2.4vmin,26px)',color:'white',fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'clamp(1.8rem,7vmin,4.4rem)',lineHeight:1,boxShadow:'0 6px 16px rgba(0,0,0,0.12)',margin:'0 auto'}}>
                {name}
            </div>
        </div>
    );
};

// ─── 매치판 크게 보기 (패드 풀스크린 · 한 라운드씩 · 스크롤 없음 · 가로 자동 배치) ──
const MatchBoardModal = ({ sessions, fieldNames, startIndex, dateLabel, onClose,
    isAdmin, currentIndex, completedMatches, onPrev, onNext, onToggleComplete, onAutoAdvance }) => {
    const total = sessions.length;
    const clampIdx = (n) => Math.min(Math.max(n, 0), Math.max(total - 1, 0));
    const [browseIdx, setBrowseIdx] = React.useState(() => clampIdx(startIndex || 0));
    const [timerOpen, setTimerOpen] = React.useState(false); // 타이머 막대 펼침(기본 접힘) — 보기/숨기기만, 엔진은 항상 돎
    const tmr = useMatchTimer(); // 타이머 종료 감지용 (자동 진행)
    const autoAdvance = true; // 자동 진행 항상 ON (토글 제거)
    const endedRef = React.useRef(false);
    // 타이머 이중 넘김 가드(C): 타이머가 '도는 중'으로 바뀐 순간의 라운드 번호를 기억해 둔다.
    // 손으로 '종료'를 눌러 이미 다음 라운드로 넘어갔으면(번호가 달라졌으면) 타이머 종료 시 자동 넘김을 건너뛴다.
    // match-timer.js(엔진)는 안 건드리고, 화면 쪽에서 인덱스 비교만 한다.
    const timerStartIdxRef = React.useRef(currentIndex);
    const prevRunningRef = React.useRef(false);
    React.useEffect(() => {
        if (tmr.running && !prevRunningRef.current) timerStartIdxRef.current = currentIndex;
        prevRunningRef.current = tmr.running;
    }, [tmr.running, currentIndex]);
    React.useEffect(() => {
        const prev = document.body.style.overscrollBehavior;
        document.body.style.overscrollBehavior = 'none';
        return () => { document.body.style.overscrollBehavior = prev; };
    }, []);
    // 관리자: 실제 진행 라운드(currentIndex)를 따라가며 이동·종료 제어 / 회원: 자유 탐색(browseIdx)
    const allDone = isAdmin && currentIndex >= total;
    const idx = isAdmin ? clampIdx(currentIndex) : browseIdx;
    const session = sessions[idx] || { matches: [], resting: [] };
    const isCurDone = isAdmin && !allDone && session.id != null && completedMatches?.has(session.id);
    const fieldLabel = (fi) => (fieldNames[fi] || `${fi + 1}구장`);
    const navBtn = {height:'clamp(48px,9vmin,66px)',borderRadius:'16px',border:'none',fontWeight:900,fontSize:'clamp(0.95rem,2.6vmin,1.35rem)'};

    // 자동 진행: 타이머가 끝나는 순간(켜져있고 관리자) 현재 라운드 '종료' + 다음 라운드로 넘기고 타이머 리셋(다음 라운드 대기).
    // 종료→true 상승 에지에서 1회만 실행. onAutoAdvance가 종료표시+인덱스+1을 한 번에 처리.
    React.useEffect(() => {
        if (isAdmin && autoAdvance && tmr.ended && !endedRef.current && !allDone
            && currentIndex === timerStartIdxRef.current) {   // 손 종료로 이미 넘어간 라운드면 자동 넘김 스킵
            const sid = (sessions[clampIdx(currentIndex)] || {}).id;
            if (onAutoAdvance) onAutoAdvance(sid);
            MoidaTimer.reset();
        }
        endedRef.current = tmr.ended;
    }, [tmr.ended, isAdmin, allDone]);

    return (
        <div className="fixed inset-0 z-[60] flex flex-col"
            style={{background:'var(--c-bg)',overscrollBehavior:'none',fontFamily:"'Pretendard Variable', Pretendard, sans-serif",
                paddingLeft:'env(safe-area-inset-left)',paddingRight:'env(safe-area-inset-right)'}}>
            {/* 상단 바 — 라운드 강조 + 날짜/시간 부제 */}
            <div style={{background:'white',borderBottom:'1px solid var(--c-border)',padding:'max(12px, env(safe-area-inset-top)) 16px 12px',flexShrink:0,display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{minWidth:0,flex:1}}>
                    {allDone ? (
                        <p style={{color:'var(--c-success)',fontWeight:900,lineHeight:1,fontSize:'clamp(1.4rem,4vmin,2.4rem)',display:'inline-flex',alignItems:'center',gap:'8px',margin:0}}><Icon.Check size={22}/>모든 경기 종료</p>
                    ) : (
                        <div style={{display:'flex',alignItems:'baseline',gap:'8px',flexWrap:'wrap'}}>
                            <span style={{color:'var(--c-accent-deep)',fontWeight:900,fontSize:'clamp(0.85rem,2vmin,1.1rem)',letterSpacing:'0.03em'}}>라운드</span>
                            <span style={{color:'var(--c-accent-deep)',fontWeight:900,lineHeight:1,fontSize:'clamp(1.8rem,5vmin,3rem)'}}>{idx + 1}</span>
                            <span style={{color:'var(--c-sub)',fontWeight:800,fontSize:'clamp(0.9rem,2.4vmin,1.4rem)'}}>/ {total}</span>
                            {isCurDone && <span style={{background:'#d1fae5',color:'#059669',fontWeight:900,fontSize:'clamp(0.7rem,1.8vmin,1rem)',padding:'2px 10px',borderRadius:'999px',display:'inline-flex',alignItems:'center',gap:'4px'}}><Icon.Check size={13}/>종료됨</span>}
                        </div>
                    )}
                    <p style={{margin:'5px 0 0',color:'var(--c-sub)',fontWeight:700,fontSize:'clamp(0.72rem,1.9vmin,1.05rem)',display:'flex',alignItems:'center',gap:'5px'}}>
                        <Icon.Clock size={14}/>{dateLabel} 매치판{!allDone && session.time ? ` · ${session.time}` : ''}
                    </p>
                </div>
                <button onClick={() => setTimerOpen(v => !v)} aria-label={timerOpen ? '타이머 숨기기' : '타이머 보기'} style={{width:'clamp(40px,7vmin,52px)',height:'clamp(40px,7vmin,52px)',borderRadius:'14px',background:timerOpen?'var(--c-accent-deep)':'#f1f5f9',color:timerOpen?'white':'#64748b',border:'none',fontWeight:900,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon.Clock size={22}/></button>
                <button onClick={onClose} style={{width:'clamp(40px,7vmin,52px)',height:'clamp(40px,7vmin,52px)',borderRadius:'14px',background:'#f1f5f9',color:'#64748b',border:'none',fontWeight:900,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon.X size={22}/></button>
            </div>
            {/* 본문 (스크롤 없음 — 한 화면에 맞춰 배치) */}
            <div style={{flex:'1 1 0%',minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column',padding:'clamp(10px,2vmin,22px)',gap:'clamp(8px,1.5vmin,16px)'}}>
                {/* 타이머 + 코트 — 화면 가운데에 함께 표시 (회원은 타이머 보기 전용) */}
                <div style={{flex:'1 1 0%',minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'clamp(10px,2.5vmin,26px)'}}>
                    {timerOpen && <MatchTimerBar isAdmin={isAdmin} />}
                    <div style={{width:'100%',display:'flex',flexWrap:'wrap',gap:'clamp(10px,2vmin,20px)',alignContent:'center',justifyContent:'center'}}>
                    {allDone ? (
                        <div style={{margin:'auto',textAlign:'center'}}>
                            <div style={{display:'flex',justifyContent:'center'}}><Icon.Flag size={80} className="text-emerald-500"/></div>
                            <p style={{fontWeight:900,fontSize:'clamp(1.2rem,4vmin,2.2rem)',color:'var(--c-ink)'}}>모든 경기가 종료되었습니다</p>
                            <p style={{fontWeight:900,fontSize:'clamp(0.85rem,2.4vmin,1.3rem)',color:'var(--c-sub)',marginTop:'6px'}}>수고하셨습니다!</p>
                        </div>
                    ) : session.matches.length === 0 ? (
                        <div style={{margin:'auto',textAlign:'center',color:'var(--c-sub)'}}>
                            <div style={{display:'flex',justifyContent:'center'}}><Icon.Flag size={44} className="text-slate-400"/></div>
                            <p style={{fontWeight:900,fontSize:'1.2rem'}}>이 라운드에 경기가 없습니다</p>
                        </div>
                    ) : session.matches.map((m, mi) => {
                        const [t1, t2] = m.match;
                        return (
                            <div key={mi} style={{flex:'1 1 clamp(210px,28%,440px)',maxWidth:'560px',background:'white',border:'1px solid var(--c-border)',borderRadius:'clamp(16px,2.4vmin,26px)',padding:'clamp(10px,2vmin,22px)',boxShadow:'0 4px 14px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                                <p style={{textAlign:'center',color:'#64748b',fontWeight:900,fontSize:'clamp(0.85rem,2.2vmin,1.3rem)',marginBottom:'clamp(8px,1.5vmin,16px)'}}>{fieldLabel(m.fieldIdx)}</p>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'clamp(8px,2vmin,24px)'}}>
                                    <MatchBoardTeam name={t1}/>
                                    <span style={{color:'#cbd5e1',fontWeight:900,fontSize:'clamp(1.2rem,3.5vmin,2.2rem)',flexShrink:0}}>VS</span>
                                    <MatchBoardTeam name={t2}/>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                    {/* 휴식 팀 — 코트 아래(가운데 묶음 안), 조끼 이름 없이 배지만 */}
                    {!allDone && session.resting && session.resting.length > 0 && (
                        <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:'10px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'16px',padding:'clamp(6px,1.2vmin,12px) 14px'}}>
                            <span style={{color:'#d97706',fontWeight:900,fontSize:'clamp(0.8rem,2vmin,1.15rem)',display:'inline-flex',alignItems:'center',gap:'6px'}}><Icon.Coffee size={16}/>휴식</span>
                            {session.resting.map((r, ri) => {
                                const ridx = String(r).charCodeAt(0) - 65;
                                return (
                                    <span key={ri} className={getTeamBadge(ridx)} style={{width:'clamp(28px,5vmin,44px)',height:'clamp(28px,5vmin,44px)',borderRadius:'10px',color:'white',fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'clamp(0.95rem,2.4vmin,1.45rem)'}}>{r}</span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {/* 하단 네비 — 항상 보임 */}
            <div style={{flexShrink:0,padding:'10px 16px max(10px, env(safe-area-inset-bottom))',background:'white',borderTop:'1px solid var(--c-border)',display:'flex',gap:'10px',alignItems:'center'}}>
                {isAdmin ? (<>
                    <button onClick={onPrev} disabled={currentIndex <= 0} style={{...navBtn,flex:1,background:currentIndex <= 0 ? '#f1f5f9' : 'var(--c-border)',color:currentIndex <= 0 ? '#cbd5e1' : 'var(--c-text)'}}><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px'}}><Icon.ChevronLeft size={16}/>이전</span></button>
                    {!allDone && (isCurDone
                        ? <button onClick={() => onToggleComplete(session.id)} style={{...navBtn,flex:1,background:'var(--c-border)',color:'var(--c-text)'}}>종료 취소</button>
                        : <button onClick={() => onToggleComplete(session.id)} style={{...navBtn,flex:1,background:'var(--c-success)',color:'white'}}>종료</button>
                    )}
                    <button onClick={onNext} disabled={currentIndex >= total} style={{...navBtn,flex:1,background:currentIndex >= total ? '#f1f5f9' : 'var(--c-accent-deep)',color:currentIndex >= total ? '#cbd5e1' : 'white'}}><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px'}}>다음<Icon.ChevronRight size={16}/></span></button>
                </>) : (<>
                    <button onClick={() => setBrowseIdx(i => clampIdx(i - 1))} disabled={idx <= 0} style={{...navBtn,flex:1,background:idx <= 0 ? '#f1f5f9' : 'var(--c-border)',color:idx <= 0 ? '#cbd5e1' : 'var(--c-text)'}}><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px'}}><Icon.ChevronLeft size={16}/>이전</span></button>
                    <button onClick={() => setBrowseIdx(clampIdx(startIndex || 0))} style={{...navBtn,flexShrink:0,padding:'0 16px',background:'#dbe3f6',color:'var(--c-accent-deep)',fontSize:'clamp(0.8rem,2vmin,1.1rem)'}}>현재</button>
                    <button onClick={() => setBrowseIdx(i => clampIdx(i + 1))} disabled={idx >= total - 1} style={{...navBtn,flex:1,background:idx >= total - 1 ? '#f1f5f9' : 'var(--c-accent-deep)',color:idx >= total - 1 ? '#cbd5e1' : 'white'}}><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px'}}>다음<Icon.ChevronRight size={16}/></span></button>
                </>)}
            </div>
        </div>
    );
};

// ─── 매치 탭 ──────────────────────────────────────────────────────────────────
const TabMatch = ({
    isAdminMode, isMatchPanelOpen, setIsMatchPanelOpen,
    matchAdminView, setMatchAdminView,
    localSchedule, localCompletedMatches, setLocalCompletedMatches, localMatchIndex,
    matchConfig, setMatchConfig, matchIsSaving, matchIsCapturing,
    presets, selectedPresetId, setSelectedPresetId, presetToggles,
    confirmedDrafts, matchStatsData,
    scheduleData, matchViewMode, setMatchViewMode,
    myTeamInfo,
    matchSaveSchedule, matchHandleCapture, matchGenerateTable,
    matchHandleNextMatch, matchHandlePrevMatch, matchHandleToggleComplete, matchHandleAutoAdvance, matchHandlePresetSelect, matchToggleSubCourt,
    splitTime, setIsLoadMatchModalOpen, setIsPresetModalOpen,
    meetings, embedded,
}) => {
    const [boardOpen, setBoardOpen] = React.useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = React.useState('');
    // 모임 선택 시 그 모임의 날짜·시간·장소를 매치 설정에 자동 채움
    const pickMeeting = (mid) => {
        setSelectedMeetingId(mid);
        const mt = (meetings || []).find(m => m.id === mid);
        if (mt) setMatchConfig(p => ({ ...p, meetingDate: mt.date || p.meetingDate, startTime: mt.start || p.startTime, endTime: mt.end || p.endTime, location: mt.location || '' }));
    };
    // 매치표 만들 대상 = 아직 종료 안 된 모임(가까운 날짜 먼저)
    const pickableMeetings = (meetings || []).filter(m => m && m.date && !isMeetingEnded(m)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    window.useMoidaBack?.(boardOpen, () => setBoardOpen(false));
    const boardSessions = isAdminMode
        ? (localSchedule.list || [])
        : ((scheduleData?.schedule?.list?.length ? scheduleData.schedule.list : (localSchedule.list || [])));
    const boardFieldNames = isAdminMode
        ? (matchConfig?.fieldNames || scheduleData?.config?.fieldNames || [])
        : (scheduleData?.config?.fieldNames || matchConfig?.fieldNames || []);
    const boardCurrent = (scheduleData?.currentMatchIndex ?? localMatchIndex ?? 0);
    const boardDate = scheduleData?.meetingDate || matchConfig?.meetingDate || '';
    return (
    <div className="animate-in">
        {/* 관리자 패널 토글 버튼 */}
        {isAdminMode && (
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">매치</p>
                <button onClick={() => setIsMatchPanelOpen(v => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl transition-all active:scale-95"
                    style={isMatchPanelOpen ? {background:'linear-gradient(135deg,var(--c-accent),var(--c-accent-deep))',color:'white'} : {background:'rgba(203,213,225,0.7)',color:'#64748b'}}>
                    <Icon.Settings size={13}/>{isMatchPanelOpen ? '매치 관리 ON' : '매치 관리'}
                </button>
            </div>
        )}

        {/* ── 관리자 매치 패널 ── */}
        {isAdminMode && isMatchPanelOpen ? (
            <div className="reveal">
                {/* 서브탭 */}
                <div className="flex gap-2 mb-4">
                    {[['setup','설정'],['results','매치표'],['stats','통계']].map(([v,l]) => (
                        <button key={v} onClick={() => setMatchAdminView(v)}
                            className={`px-3 py-2 rounded-xl font-black text-xs transition-all ${matchAdminView===v?'bg-teal-500 text-white shadow':'text-slate-400 bg-slate-100'}`}>{l}</button>
                    ))}
                    <button onClick={() => setIsLoadMatchModalOpen(true)}
                        className="px-3 py-2 rounded-xl font-black text-xs transition-all text-slate-400 bg-slate-100 shrink-0">기록</button>
                    <div className="flex-1"/>
                    {localSchedule.list.length > 0 && !matchIsCapturing && (
                        <button onClick={matchSaveSchedule} disabled={matchIsSaving}
                            className="p-2 rounded-xl bg-slate-100 text-slate-400 flex items-center"><Icon.Save size={14}/></button>
                    )}
                    {localSchedule.list.length > 0 && !matchIsCapturing && (
                        <button onClick={matchHandleCapture}
                            className="p-2 rounded-xl bg-slate-100 text-slate-400 flex items-center"><Icon.Camera size={14}/></button>
                    )}
                </div>

                {/* 설정 탭 */}
                {matchAdminView === 'setup' && (
                    <div className="space-y-3">
                        <div className="card border-slate-100 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-3">기본 설정</p>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 mb-1">모임 선택</p>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-black text-sm" value={selectedMeetingId} onChange={e => pickMeeting(e.target.value)}>
                                        <option value="">직접 입력</option>
                                        {pickableMeetings.map(m => (
                                            <option key={m.id} value={m.id}>{fmtMeetingDate(m.date)} {(m.meetingType==='match'?'매칭':'정기')} · {m.location||'장소 미정'}</option>
                                        ))}
                                    </select>
                                    {matchConfig.location && <p className="text-[11px] font-black text-teal-600 mt-1.5 flex items-center gap-1"><Icon.MapPin size={12} className="flex-shrink-0"/>{matchConfig.location}</p>}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 mb-1">모임 날짜</p>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-black text-sm text-center" style={{userSelect:'text'}}
                                        value={matchConfig.meetingDate} onChange={e => setMatchConfig(p => ({...p, meetingDate:e.target.value}))}/>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[['startTime','시작'],['endTime','종료']].map(([key,label]) => (
                                        <div key={key}>
                                            <p className={`text-[10px] font-black mb-1 ${key==='endTime'?'text-rose-400':'text-slate-400'}`}>{label} 시간</p>
                                            <div className="flex gap-1">
                                                <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 text-xs font-black" value={splitTime(matchConfig[key]).h} onChange={e => setMatchConfig(p => ({...p,[key]:`${e.target.value}:${splitTime(p[key]).m}`}))}>
                                                    {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h} value={h}>{h}시</option>)}
                                                </select>
                                                <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 text-xs font-black" value={splitTime(matchConfig[key]).m} onChange={e => setMatchConfig(p => ({...p,[key]:`${splitTime(p[key]).h}:${e.target.value}`}))}>
                                                    {['00','10','20','30','40','50'].map(m=><option key={m} value={m}>{m}분</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[['matchDuration','경기 시간(분)'],['breakDuration','휴식 시간(분)']].map(([key,label]) => (
                                        <div key={key}>
                                            <p className="text-[10px] font-black text-slate-400 mb-1">{label}</p>
                                            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 font-black text-center text-sm" style={{userSelect:'text'}}
                                                value={matchConfig[key]} onChange={e => setMatchConfig(p => ({...p,[key]:parseInt(e.target.value)||matchConfig[key]}))}/>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <p className="text-[10px] font-black text-slate-400 mb-1">교체 시간(분) · 워치 기본값 (30초 단위)</p>
                                    <input type="number" step="0.5" min="0.5" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 font-black text-center text-sm" style={{userSelect:'text'}}
                                        value={(matchConfig.subIntervalSec ?? 180)/60} onChange={e => { const v = parseFloat(e.target.value); if(!v||v<=0) return; setMatchConfig(p => ({...p, subIntervalSec: Math.round(v*60/30)*30})); }}/>
                                </div>
                            </div>
                        </div>

                        <div className="card border-slate-100 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">구장 프리셋</p>
                                <button onClick={() => setIsPresetModalOpen(true)} className="text-xs font-black text-teal-500 bg-teal-50 px-2.5 py-1 rounded-lg">+ 추가</button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
                                <button onClick={() => setSelectedPresetId('manual')} className={`shrink-0 px-3 py-2 rounded-xl font-black text-xs border-2 transition-all ${selectedPresetId==='manual'?'bg-teal-500 text-white border-teal-500':'bg-white text-slate-500 border-slate-200'}`}>직접 입력</button>
                                {presets.map(p => (
                                    <button key={p.id} onClick={() => matchHandlePresetSelect(p)} className={`shrink-0 px-3 py-2 rounded-xl font-black text-xs border-2 transition-all ${selectedPresetId===p.id?'bg-teal-500 text-white border-teal-500':'bg-white text-slate-600 border-slate-200'}`}>{p.name}</button>
                                ))}
                            </div>
                            {selectedPresetId !== 'manual' && (
                                <div className="bg-teal-50 rounded-xl p-3 mb-3">
                                    <p className="text-[10px] font-black text-teal-600 mb-2">세부 구장 선택</p>
                                    <div className="flex flex-wrap gap-2">
                                        {presets.find(p=>p.id===selectedPresetId)?.fieldNames.map((name,i) => (
                                            <button key={i} onClick={() => matchToggleSubCourt(i)}
                                                className={`px-2.5 py-1.5 rounded-lg font-black text-xs border transition-all ${presetToggles[i]?'bg-teal-500 text-white border-teal-500':'bg-white text-slate-500 border-slate-200'}`}>
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedPresetId === 'manual' && (
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-black text-slate-500 flex-1">구장 수: {matchConfig.courtCount}</p>
                                        <button onClick={() => { if(matchConfig.courtCount>1){ const fn=[...matchConfig.fieldNames];fn.pop();const ft=[...matchConfig.fieldTypes];ft.pop();setMatchConfig(p=>({...p,courtCount:p.courtCount-1,fieldNames:fn,fieldTypes:ft})); }}} className="p-2 rounded-lg bg-slate-100 text-slate-600"><Icon.Minus size={13}/></button>
                                        <button onClick={() => { if(matchConfig.courtCount<6){ const fn=[...matchConfig.fieldNames,`${matchConfig.courtCount+1}구장`];const ft=[...matchConfig.fieldTypes,'6vs6'];setMatchConfig(p=>({...p,courtCount:p.courtCount+1,fieldNames:fn,fieldTypes:ft})); }}} className="p-2 rounded-lg bg-slate-100 text-slate-600"><Icon.Plus size={13}/></button>
                                    </div>
                                    {matchConfig.fieldNames.map((name,i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input type="text" className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black" style={{userSelect:'text'}} value={name}
                                                onChange={e => { const fn=[...matchConfig.fieldNames];fn[i]=e.target.value;setMatchConfig(p=>({...p,fieldNames:fn})); }}/>
                                            <select className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-black" value={matchConfig.fieldTypes[i]}
                                                onChange={e => { const ft=[...matchConfig.fieldTypes];ft[i]=e.target.value;setMatchConfig(p=>({...p,fieldTypes:ft})); }}>
                                                <option value="6vs6">6vs6</option><option value="5vs5">5vs5</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => setMatchConfig(p => ({...p, strictCourtSize:!p.strictCourtSize}))}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${matchConfig.strictCourtSize?'bg-teal-50 border-teal-200':'bg-white border-slate-200'}`}>
                                <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${matchConfig.strictCourtSize?'bg-teal-500 border-teal-500':'border-slate-300'}`}>
                                    {matchConfig.strictCourtSize && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span className="text-xs font-black text-slate-700">5vs5 구장에 6명 이상 팀 배정 제외</span>
                            </button>
                        </div>

                        {confirmedDrafts.length > 0 && (() => {
                            const latest = [...confirmedDrafts].sort((a,b) => (b.meetingDate||'').localeCompare(a.meetingDate||''))[0];
                            return latest ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                    <p className="text-xs font-black text-emerald-600 flex items-center gap-1"><Icon.Check size={13} className="flex-shrink-0"/>확정된 팀 편성: {latest.meetingDate}</p>
                                    <p className="text-xs text-emerald-500 mt-0.5">{latest.teams?.length}팀 · {latest.teams?.reduce((s,t)=>s+t.members.length,0)}명</p>
                                </div>
                            ) : null;
                        })()}

                        <button onClick={matchGenerateTable} disabled={matchConfig.courtCount === 0 || !confirmedDrafts.length}
                            className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black text-base shadow-xl disabled:opacity-30 flex items-center justify-center gap-2">
                            <Icon.Calendar size={16}/> 매치 테이블 생성
                        </button>
                    </div>
                )}

                {/* 매치표 탭 */}
                {matchAdminView === 'results' && (
                    <div>
                        {localSchedule.list.length === 0
                            ? <div className="text-center py-16 text-slate-400"><div className="flex justify-center mb-3 opacity-30"><Icon.Calendar size={48}/></div><p className="font-black">설정 탭에서 매치 테이블을 생성해주세요</p></div>
                            : (
                                <div>
                                    <div id="match-capture-area">
                                        <div className="text-center mb-3">
                                            <p className="font-black text-slate-800">{matchConfig.meetingDate}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{matchConfig.startTime} ~ {matchConfig.endTime} · {localSchedule.list.length}라운드</p>
                                        </div>
                                        {localSchedule.list.map((session,si) => {
                                            const isDone = localCompletedMatches.has(session.id);
                                            const isCurrent = si === localMatchIndex;
                                            const isPast = si < localMatchIndex;
                                            return (
                                                <div key={session.id}
                                                    className={`match-row mb-2 p-3.5 rounded-2xl border shadow-sm transition-all ${isCurrent?'bg-teal-50 border-teal-300':isPast||isDone?'match-completed border-slate-100':'bg-white border-slate-100'}`}
                                                    style={isCurrent?{boxShadow:'0 0 0 2px #4f6ccb40'}:{}}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-black text-[10px] ${isCurrent?'bg-teal-500 border-teal-500 text-white':isDone||isPast?'bg-emerald-500 border-emerald-500 text-white':'border-slate-300 text-slate-400'}`}>
                                                            {isDone||isPast?<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:si+1}
                                                        </div>
                                                        <p className="font-black text-xs text-slate-600">{session.time}</p>
                                                        {isCurrent && <span className="text-[9px] font-black text-[#15171E] bg-live px-2 py-0.5 rounded-full ml-auto">진행 중</span>}
                                                    </div>
                                                    <div className="space-y-1.5 pl-8">
                                                        {session.matches.map((m,mi) => {
                                                            const[t1,t2]=m.match;
                                                            return (
                                                                <div key={mi} className="flex items-center gap-2">
                                                                    <span className="text-[9px] font-black text-slate-400 w-10 shrink-0">{matchConfig.fieldNames[m.fieldIdx]||`${m.fieldIdx+1}구장`}</span>
                                                                    <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${getTeamBadge(t1.charCodeAt(0)-65)} ${isPast||isDone?'opacity-60':''}`}>{t1}</span>
                                                                    <span className="text-slate-400 font-black text-xs">vs</span>
                                                                    <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${getTeamBadge(t2.charCodeAt(0)-65)} ${isPast||isDone?'opacity-60':''}`}>{t2}</span>
                                                                    <span className="text-[8px] font-black text-slate-300 ml-auto">{matchConfig.fieldTypes[m.fieldIdx]||'6vs6'}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        {session.resting.length > 0 && <p className="text-[9px] text-slate-400">휴식: {session.resting.join(', ')}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {!matchIsCapturing && (
                                        <div className="mt-3 p-3 card border-slate-100 rounded-2xl">
                                            <p className="text-center text-xs font-black text-slate-500 mb-2">
                                                {localMatchIndex < localSchedule.list.length
                                                    ? `${localMatchIndex+1} / ${localSchedule.list.length} 라운드 · ${localSchedule.list[localMatchIndex]?.time}`
                                                    : <span className="inline-flex items-center justify-center gap-1"><Icon.Check size={13}/>모든 경기 종료</span>}
                                            </p>
                                            <div className="flex gap-2">
                                                <button onClick={matchHandlePrevMatch} disabled={localMatchIndex <= 0}
                                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-xs disabled:opacity-30"><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px'}}><Icon.ChevronLeft size={16}/>이전</span></button>
                                                {localMatchIndex < localSchedule.list.length && (
                                                    localCompletedMatches.has(localSchedule.list[localMatchIndex]?.id)
                                                        ? <button onClick={() => matchHandleToggleComplete(localSchedule.list[localMatchIndex].id)}
                                                            className="flex-1 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-black text-xs">종료 취소</button>
                                                        : <button onClick={() => matchHandleToggleComplete(localSchedule.list[localMatchIndex].id)}
                                                            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-xs">종료</button>
                                                )}
                                                <button onClick={matchHandleNextMatch} disabled={localMatchIndex >= localSchedule.list.length}
                                                    className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white font-black text-xs disabled:opacity-30"><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px'}}>다음<Icon.ChevronRight size={16}/></span></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    </div>
                )}

                {/* 통계 탭 */}
                {matchAdminView === 'stats' && (
                    <div>
                        {!matchStatsData
                            ? <div className="text-center py-16 text-slate-400"><p className="font-black">매치 테이블을 먼저 생성해주세요</p></div>
                            : (
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">팀별 경기 수</p>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {matchStatsData.teams.map((t,i) => (
                                            <div key={t} className="card border-slate-100 rounded-2xl p-3 text-center">
                                                <span className={`inline-flex w-8 h-8 rounded-xl font-black text-sm items-center justify-center mb-2 ${getTeamBadge(i)}`}>{t}</span>
                                                <p className="text-2xl font-black text-slate-800">{matchStatsData.totalMatches[t]}</p>
                                                <p className="text-[10px] text-slate-400">경기</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">매치업 횟수</p>
                                    <div className="card border-slate-100 rounded-2xl p-3 overflow-x-auto">
                                        <table className="w-full text-xs font-black text-center">
                                            <thead><tr>
                                                <th className="p-1.5 text-slate-400">vs</th>
                                                {matchStatsData.teams.map(t=><th key={t} className="p-1.5"><span className={`inline-flex w-6 h-6 rounded-lg text-xs items-center justify-center ${getTeamBadge(matchStatsData.teams.indexOf(t))}`}>{t}</span></th>)}
                                            </tr></thead>
                                            <tbody>
                                                {matchStatsData.teams.map((t1,i) => (
                                                    <tr key={t1}>
                                                        <td className="p-1.5"><span className={`inline-flex w-6 h-6 rounded-lg text-xs items-center justify-center ${getTeamBadge(i)}`}>{t1}</span></td>
                                                        {matchStatsData.teams.map(t2 => (
                                                            <td key={t2} className={`p-1.5 ${t1===t2?'text-slate-200':'text-slate-700'}`}>{t1===t2?'-':matchStatsData.matchupCounts[t1]?.[t2]||0}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        }
                    </div>
                )}
            </div>
        ) : (
            /* ── 일반/회원 뷰 ── */
            !scheduleData
                ? (embedded ? (
                    <div className="mt-2 reveal">
                        <h3 className="font-black text-lg text-slate-900 mb-2 px-1">경기</h3>
                        <div className="card border-slate-100 rounded-2xl p-5 text-center text-slate-400">
                            <p className="text-xs font-black">경기 일정 준비 중</p>
                            <p className="text-[11px] mt-1">팀 편성이 확정되면 경기 순서가 공개됩니다</p>
                        </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-slate-500 reveal">
                        <div className="flex justify-center mb-4 opacity-25"><Icon.Calendar size={56}/></div>
                        <p className="font-black text-lg mb-2">매치 테이블 준비 중</p>
                        <p className="text-sm text-slate-400">팀 편성이 확정되면<br/>경기 일정이 공개됩니다</p>
                    </div>
                  ))
            : (() => {
                const sessions = scheduleData.schedule?.list || [];
                const cmi = scheduleData.currentMatchIndex ?? 0;
                const currentSession = sessions[cmi];
                const allDone = cmi >= sessions.length;
                const myTeam = myTeamInfo?.teamName;
                const myTeamIdx2 = myTeamInfo?.teamIdx ?? 0;
                return (
                    <div className="stagger">
                        {/* 날짜 + 뷰 토글 (회원 한 화면=컴팩트 '경기' 제목 / 단독=인디고 히어로) */}
                        {embedded ? (
                            <div className="flex items-center justify-between gap-2 mt-2 mb-3 px-1">
                                <div className="flex items-baseline gap-2 min-w-0">
                                    <h3 className="font-black text-lg text-slate-900">경기</h3>
                                    <span className="text-xs font-black text-slate-400">총 {sessions.length}라운드</span>
                                </div>
                                <div className="flex bg-slate-100 rounded-xl p-1 gap-1 shrink-0">
                                    <button onClick={()=>setMatchViewMode('my')} className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all ${matchViewMode==='my'?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>내 경기</button>
                                    <button onClick={()=>setMatchViewMode('all')} className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all ${matchViewMode==='all'?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>전체 보기</button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl p-5 mb-4 text-white flex items-center justify-between gap-3" style={{ background:'linear-gradient(135deg,var(--c-accent),var(--c-accent-deep))', boxShadow:'0 10px 28px -8px rgba(18,46,120,0.45)' }}>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white/80">{scheduleData.meetingDate} 매치</p>
                                    <p className="font-black text-2xl leading-tight mt-1">총 {sessions.length}<span className="text-base font-black text-white/80 ml-1">라운드</span></p>
                                </div>
                                <div className="flex bg-white/20 rounded-xl p-1 gap-1 shrink-0">
                                    <button onClick={()=>setMatchViewMode('my')} className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all ${matchViewMode==='my'?'bg-white text-teal-600 shadow-sm':'text-white/80'}`}>내 경기</button>
                                    <button onClick={()=>setMatchViewMode('all')} className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all ${matchViewMode==='all'?'bg-white text-teal-600 shadow-sm':'text-white/80'}`}>전체 보기</button>
                                </div>
                            </div>
                        )}

                        {/* 패드 크게 보기 진입 */}
                        <button onClick={() => setBoardOpen(true)}
                            className="w-full mb-4 py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                            style={{background:'linear-gradient(135deg,#0f2660,var(--c-accent-deep))',boxShadow:'0 8px 20px -6px rgba(18,46,120,0.5)'}}>
                            <Icon.Tv size={18}/>매치판 크게 보기
                        </button>

                        {/* ── 내 경기 뷰 ── */}
                        {matchViewMode==='my' && (
                            <div>
                                {allDone ? (
                                    <div className="text-center py-16">
                                        <div className="flex justify-center mb-4"><Icon.Flag size={48} className="text-emerald-500"/></div>
                                        <p className="font-black text-slate-500 text-lg">모든 경기가 종료되었습니다</p>
                                        <p className="text-sm text-slate-400 mt-1">수고하셨습니다!</p>
                                    </div>
                                ) : !currentSession ? null : (
                                    <div>
                                        {/* 라운드 표시 */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-teal-500 text-white rounded-xl font-black text-sm flex items-center justify-center">{cmi+1}</div>
                                                <span className="text-xs text-slate-400 font-black">/ {sessions.length} 라운드</span>
                                            </div>
                                            <span className="text-xs text-slate-400">{currentSession.time}</span>
                                        </div>

                                        {/* 내 팀 상태 카드 */}
                                        {(() => {
                                            if (!myTeam) {
                                                return (
                                                    <div className="card rounded-2xl border border-slate-100 p-4">
                                                        <p className="text-xs text-slate-400 font-black mb-3">현재 라운드</p>
                                                        {currentSession.matches.map((m,mi)=>{
                                                            const[t1,t2]=m.match;
                                                            return (
                                                                <div key={mi} className="flex items-center gap-2 mb-2 last:mb-0">
                                                                    <span className="text-[9px] text-slate-400 w-10 shrink-0">{scheduleData.config?.fieldNames?.[m.fieldIdx]||`${m.fieldIdx+1}구장`}</span>
                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black text-white ${getTeamBadge(t1.charCodeAt(0)-65)}`}>{t1}</span>
                                                                    <span className="text-slate-400 text-xs">vs</span>
                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black text-white ${getTeamBadge(t2.charCodeAt(0)-65)}`}>{t2}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }
                                            const isResting = currentSession.resting?.includes(myTeam);
                                            const myMatch = currentSession.matches.find(m=>m.match.includes(myTeam));
                                            if (isResting) {
                                                return (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                                                        <div className="flex justify-center mb-3"><Icon.Coffee size={48} className="text-amber-500"/></div>
                                                        <p className="font-black text-amber-500 text-lg">이번 경기는 휴식입니다.</p>
                                                        <p className="text-amber-500 text-sm mt-1">다음 라운드를 기다려주세요</p>
                                                    </div>
                                                );
                                            }
                                            if (myMatch) {
                                                const [t1,t2]=myMatch.match;
                                                const opponent = t1===myTeam?t2:t1;
                                                const oppIdx = opponent.charCodeAt(0)-65;
                                                const fieldName = scheduleData.config?.fieldNames?.[myMatch.fieldIdx]||`${myMatch.fieldIdx+1}구장`;
                                                return (
                                                    <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6 text-center">
                                                        <p className="text-xs font-black text-teal-500 mb-4">다음 상대</p>
                                                        <div className="flex items-center justify-center gap-5 mb-5">
                                                            <div className="text-center">
                                                                <div className={`w-16 h-16 rounded-2xl font-black text-2xl flex items-center justify-center text-white mb-1 ${getTeamBadge(myTeamIdx2)}`} style={{boxShadow:'0 0 0 3px #fff, 0 0 0 6px var(--c-accent)'}}>{myTeam}</div>
                                                                <p className="text-[10px] text-teal-500 font-black">우리 팀</p>
                                                            </div>
                                                            <span className="text-slate-300 font-black text-2xl">vs</span>
                                                            <div className="text-center">
                                                                <div className={`w-16 h-16 rounded-2xl font-black text-2xl flex items-center justify-center text-white mb-1 ${getTeamBadge(oppIdx)}`}>{opponent}</div>
                                                                <p className="text-[10px] text-slate-400">상대 팀</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <Icon.MapPin size={14} className="text-slate-400"/>
                                                            <span className="text-sm font-black text-slate-600">{fieldName}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* 다음 라운드 예고 */}
                                        {myTeam && cmi+1 < sessions.length && (()=>{
                                            const nxt = sessions[cmi+1];
                                            const nxtResting = nxt.resting?.includes(myTeam);
                                            const nxtMatch = nxt.matches.find(m=>m.match.includes(myTeam));
                                            const nxtOpp = nxtMatch?.match.find(t=>t!==myTeam);
                                            return (
                                                <div className="card rounded-2xl border border-slate-100 p-4 mt-3">
                                                    <p className="text-[10px] font-black text-slate-400 mb-2">다음 라운드 ({cmi+2}/{sessions.length})</p>
                                                    {nxtResting ? (
                                                        <p className="text-xs text-amber-500 font-black flex items-center gap-1"><Icon.Coffee size={13}/>휴식</p>
                                                    ) : nxtMatch && nxtOpp ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400">vs</span>
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black text-white ${getTeamBadge(nxtOpp.charCodeAt(0)-65)}`}>{nxtOpp}</span>
                                                            <span className="text-[10px] text-slate-400">{scheduleData.config?.fieldNames?.[nxtMatch.fieldIdx]||`${nxtMatch.fieldIdx+1}구장`}</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 관리자 라운드 컨트롤 ── */}
                        {isAdminMode && (
                            <div className="mt-3 p-3 card border-slate-100 rounded-2xl">
                                <p className="text-center text-xs font-black text-slate-500 mb-2">
                                    {localMatchIndex < localSchedule.list.length
                                        ? `${localMatchIndex+1} / ${localSchedule.list.length} 라운드 · ${localSchedule.list[localMatchIndex]?.time}`
                                        : <span className="inline-flex items-center justify-center gap-1"><Icon.Check size={13}/>모든 경기 종료</span>}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={matchHandlePrevMatch} disabled={localMatchIndex <= 0}
                                        className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-xs disabled:opacity-30"><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px'}}><Icon.ChevronLeft size={16}/>이전</span></button>
                                    {localMatchIndex < localSchedule.list.length && (
                                        localCompletedMatches.has(localSchedule.list[localMatchIndex]?.id)
                                            ? <button onClick={() => matchHandleToggleComplete(localSchedule.list[localMatchIndex].id)}
                                                className="flex-1 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-black text-xs">종료 취소</button>
                                            : <button onClick={() => matchHandleToggleComplete(localSchedule.list[localMatchIndex].id)}
                                                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-xs">종료</button>
                                    )}
                                    <button onClick={matchHandleNextMatch} disabled={localMatchIndex >= localSchedule.list.length}
                                        className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white font-black text-xs disabled:opacity-30"><span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'4px'}}>다음<Icon.ChevronRight size={16}/></span></button>
                                </div>
                            </div>
                        )}

                        {/* ── 전체 보기 뷰 ── */}
                        {matchViewMode==='all' && (
                            <div className="space-y-2">
                                {sessions.map((session,si)=>{
                                    const hasMyTeam = myTeam && session.matches.some(m=>m.match.includes(myTeam));
                                    const isResting = myTeam && session.resting?.includes(myTeam);
                                    const isCurrent = si===localMatchIndex;
                                    const isDone = localCompletedMatches.has(session.id);
                                    const isPast = si<localMatchIndex;
                                    return (
                                        <div key={si} className={`rounded-2xl p-4 border transition-all ${isCurrent?'border-teal-100 bg-teal-50':isDone||isPast?'border-slate-100 bg-slate-50 opacity-40':hasMyTeam?'border-teal-100 card':'card border-slate-100'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 ${isCurrent?'bg-teal-500 text-white':isDone||isPast?'bg-emerald-400 text-white':'bg-slate-100 text-slate-500'}`}>{isDone||isPast?<Icon.Check size={12}/>:si+1}</div>
                                                <p className="text-xs font-black text-slate-400">{session.time}</p>
                                                {isCurrent&&<span className="text-[9px] font-black text-[#15171E] bg-live px-2 py-0.5 rounded-full">진행 중</span>}
                                                {hasMyTeam&&!isCurrent&&!isDone&&<span className="text-[9px] font-black text-teal-500 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">내 경기</span>}
                                                {isResting&&!isDone&&<span className="text-[9px] font-black text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">휴식</span>}
                                            </div>
                                            {session.matches.map((m,mi)=>{
                                                const[t1,t2]=m.match;
                                                const t1Idx=t1.charCodeAt(0)-65;
                                                const t2Idx=t2.charCodeAt(0)-65;
                                                const isMyMatch=myTeam&&(t1===myTeam||t2===myTeam);
                                                return (
                                                    <div key={mi} className="flex items-center gap-2 mb-1.5 last:mb-0 pl-8">
                                                        <span className="text-[9px] text-slate-400 w-10 shrink-0">{scheduleData.config?.fieldNames?.[m.fieldIdx]||`${m.fieldIdx+1}구장`}</span>
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black text-white ${getTeamBadge(t1Idx)} ${isMyMatch&&t1===myTeam?'ring-2 ring-offset-1 ring-teal-400':''}`}>{t1}</span>
                                                        <span className="text-slate-400 text-xs">vs</span>
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black text-white ${getTeamBadge(t2Idx)} ${isMyMatch&&t2===myTeam?'ring-2 ring-offset-1 ring-teal-400':''}`}>{t2}</span>
                                                    </div>
                                                );
                                            })}
                                            {session.resting?.length>0&&<p className="text-[9px] text-slate-400 mt-1.5 pl-8">휴식: {session.resting.join(', ')}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()
        )}
        {boardOpen && boardSessions.length > 0 && (
            <MatchBoardModal sessions={boardSessions} fieldNames={boardFieldNames}
                startIndex={boardCurrent} dateLabel={boardDate} onClose={() => setBoardOpen(false)}
                isAdmin={isAdminMode} currentIndex={localMatchIndex} completedMatches={localCompletedMatches}
                onPrev={matchHandlePrevMatch} onNext={matchHandleNextMatch} onToggleComplete={matchHandleToggleComplete} onAutoAdvance={matchHandleAutoAdvance} />
        )}
    </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────
