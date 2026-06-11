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
    matchHandleNextMatch, matchHandlePresetSelect, matchToggleSubCourt,
    splitTime, setIsLoadMatchModalOpen, setIsPresetModalOpen,
}) => (
    <div className="animate-in">
        {/* 관리자 패널 토글 버튼 */}
        {isAdminMode && (
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">매치</p>
                <button onClick={() => setIsMatchPanelOpen(v => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl transition-all active:scale-95"
                    style={isMatchPanelOpen ? {background:'linear-gradient(135deg,#14b8a6,#0d9488)',color:'white'} : {background:'rgba(203,213,225,0.7)',color:'#64748b'}}>
                    ⚙️ {isMatchPanelOpen ? '매치 관리 ON' : '매치 관리'}
                </button>
            </div>
        )}

        {/* ── 관리자 매치 패널 ── */}
        {isAdminMode && isMatchPanelOpen ? (
            <div>
                {/* 서브탭 */}
                <div className="flex gap-2 mb-4">
                    {[['setup','설정'],['results','매치표'],['stats','통계']].map(([v,l]) => (
                        <button key={v} onClick={() => setMatchAdminView(v)}
                            className={`px-3 py-2 rounded-xl font-black text-xs transition-all ${matchAdminView===v?'bg-teal-500 text-white shadow':'text-slate-400 bg-slate-100'}`}>{l}</button>
                    ))}
                    <div className="flex-1"/>
                    {localSchedule.list.length > 0 && !matchIsCapturing && (
                        <button onClick={matchSaveSchedule} disabled={matchIsSaving}
                            className="p-2 rounded-xl bg-slate-100 text-slate-400 flex items-center"><Icon.Save size={14}/></button>
                    )}
                    {localSchedule.list.length > 0 && !matchIsCapturing && (
                        <button onClick={matchHandleCapture}
                            className="p-2 rounded-xl bg-slate-100 text-slate-400 flex items-center"><Icon.Camera size={14}/></button>
                    )}
                    <button onClick={() => setIsLoadMatchModalOpen(true)}
                        className="p-2 rounded-xl bg-slate-100 text-slate-400 text-sm flex items-center">📂</button>
                </div>

                {/* 설정 탭 */}
                {matchAdminView === 'setup' && (
                    <div className="space-y-3">
                        <div className="card border-slate-100 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-3">기본 설정</p>
                            <div className="space-y-3">
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
                                                <select className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-2 text-xs font-black" value={splitTime(matchConfig[key]).h} onChange={e => setMatchConfig(p => ({...p,[key]:`${e.target.value}:${splitTime(p[key]).m}`}))}>
                                                    {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h} value={h}>{h}시</option>)}
                                                </select>
                                                <select className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-2 text-xs font-black" value={splitTime(matchConfig[key]).m} onChange={e => setMatchConfig(p => ({...p,[key]:`${splitTime(p[key]).h}:${e.target.value}`}))}>
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
                                    <p className="text-xs font-black text-emerald-600">✓ 확정된 팀 편성: {latest.meetingDate}</p>
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
                                                    onClick={() => setLocalCompletedMatches(prev => { const n=new Set(prev); n.has(session.id)?n.delete(session.id):n.add(session.id); return n; })}
                                                    className={`match-row mb-2 p-3.5 rounded-2xl border shadow-sm transition-all ${isCurrent?'bg-teal-50 border-teal-300':isPast||isDone?'match-completed border-slate-100':'bg-white border-slate-100'}`}
                                                    style={isCurrent?{boxShadow:'0 0 0 2px #2dd4bf40'}:{}}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-black text-[10px] ${isCurrent?'bg-teal-500 border-teal-500 text-white':isDone||isPast?'bg-emerald-500 border-emerald-500 text-white':'border-slate-300 text-slate-400'}`}>
                                                            {isDone||isPast?<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:si+1}
                                                        </div>
                                                        <p className="font-black text-xs text-slate-600">{session.time}</p>
                                                        {isCurrent && <span className="text-[9px] font-black text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full ml-auto">진행 중</span>}
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
                                        <div className="flex items-center gap-3 mt-3 p-4 card border-slate-100 rounded-2xl">
                                            <div className="flex-1">
                                                {localMatchIndex < localSchedule.list.length
                                                    ? <div><p className="text-xs font-black text-slate-500">{localMatchIndex+1} / {localSchedule.list.length} 라운드</p><p className="text-[10px] text-slate-400 mt-0.5">{localSchedule.list[localMatchIndex]?.time}</p></div>
                                                    : <p className="text-sm font-black text-emerald-500">✓ 모든 경기 종료</p>
                                                }
                                            </div>
                                            <button onClick={matchHandleNextMatch} disabled={localMatchIndex >= localSchedule.list.length}
                                                className="py-2.5 px-5 bg-teal-500 text-white rounded-xl font-black text-sm disabled:opacity-30">
                                                {localMatchIndex >= localSchedule.list.length ? '종료' : '다음 매치 →'}
                                            </button>
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
                ? <div className="text-center py-20 text-slate-500">
                    <div className="flex justify-center mb-4 opacity-25"><Icon.Calendar size={56}/></div>
                    <p className="font-black text-lg mb-2">매치 테이블 준비 중</p>
                    <p className="text-sm text-slate-400">팀 편성이 확정되면<br/>경기 일정이 공개됩니다</p>
                  </div>
            : (() => {
                const sessions = scheduleData.schedule?.list || [];
                const cmi = scheduleData.currentMatchIndex ?? 0;
                const currentSession = sessions[cmi];
                const allDone = cmi >= sessions.length;
                const myTeam = myTeamInfo?.teamName;
                const myTeamIdx2 = myTeamInfo?.teamIdx ?? 0;
                return (
                    <div>
                        {/* 날짜 + 뷰 토글 */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-black">{scheduleData.meetingDate}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">총 {sessions.length}라운드</p>
                            </div>
                            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                                <button onClick={()=>setMatchViewMode('my')} className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all ${matchViewMode==='my'?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>내 경기</button>
                                <button onClick={()=>setMatchViewMode('all')} className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all ${matchViewMode==='all'?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>전체 보기</button>
                            </div>
                        </div>

                        {/* ── 내 경기 뷰 ── */}
                        {matchViewMode==='my' && (
                            <div>
                                {allDone ? (
                                    <div className="text-center py-16">
                                        <div className="text-5xl mb-4">🏁</div>
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
                                                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
                                                        <div className="text-5xl mb-3">😴</div>
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
                                                    <div className="bg-teal-50 border border-teal-100 rounded-3xl p-6 text-center">
                                                        <p className="text-xs font-black text-teal-500 mb-4">다음 상대</p>
                                                        <div className="flex items-center justify-center gap-5 mb-5">
                                                            <div className="text-center">
                                                                <div className={`w-16 h-16 rounded-2xl font-black text-2xl flex items-center justify-center text-white mb-1 ${getTeamBadge(myTeamIdx2)}`} style={{boxShadow:'0 0 0 3px #fff, 0 0 0 6px #14b8a6'}}>{myTeam}</div>
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
                                                        <p className="text-xs text-amber-500 font-black">😴 휴식</p>
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

                        {/* ── 전체 보기 뷰 ── */}
                        {matchViewMode==='all' && (
                            <div className="space-y-2">
                                {sessions.map((session,si)=>{
                                    const hasMyTeam = myTeam && session.matches.some(m=>m.match.includes(myTeam));
                                    const isResting = myTeam && session.resting?.includes(myTeam);
                                    const isCurrent = si===cmi;
                                    const isPast = si<cmi;
                                    return (
                                        <div key={si} className={`rounded-2xl p-4 border transition-all ${isCurrent?'border-teal-100 bg-teal-50':isPast?'border-slate-100 bg-slate-50 opacity-50':hasMyTeam?'border-teal-100 card':'card border-slate-100'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 ${isCurrent?'bg-teal-500 text-white':isPast?'bg-slate-300 text-white':'bg-slate-100 text-slate-500'}`}>{isPast?'✓':si+1}</div>
                                                <p className="text-xs font-black text-slate-400">{session.time}</p>
                                                {isCurrent&&<span className="text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">진행 중</span>}
                                                {hasMyTeam&&!isCurrent&&<span className="text-[9px] font-black text-teal-500 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">내 경기</span>}
                                                {isResting&&<span className="text-[9px] font-black text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">휴식</span>}
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
    </div>
);
// ─────────────────────────────────────────────────────────────────────────────
