function generateSchedule(config, confirmedData) {
    const teams = confirmedData.teams.map((_,i) => getTeamName(i));
    const teamSizes = {};
    confirmedData.teams.forEach((t,i) => { teamSizes[getTeamName(i)] = t.members.length; });
    const {courtCount, matchDuration, breakDuration, startTime, endTime} = config;
    let currentTime = new Date(`2024-01-01T${startTime}:00`);
    const limitTime = new Date(`2024-01-01T${endTime}:00`);
    const teamStats = {};
    teams.forEach(t => teamStats[t] = 0);
    const matchupHistory = {};
    teams.forEach(t1 => { matchupHistory[t1] = {}; teams.forEach(t2 => { if(t1!==t2) matchupHistory[t1][t2] = 0; }); });
    const courtUsage = {}, lastOpponent = {};
    teams.forEach(t => { courtUsage[t] = {}; for(let i=0;i<courtCount;i++) courtUsage[t][i] = 0; lastOpponent[t] = null; });
    let sessionList = [], matchIdx = 1;

    while(currentTime < limitTime) {
        let usedInSession = new Set();
        let sessionMatches = [];
        const sessionCourts = Array.from({length:courtCount}, (_,i) => ({idx:i, type:config.fieldTypes[i]||'6vs6'}));
        for(const court of sessionCourts) {
            const isSmall = court.type === '5vs5';
            let candidates = teams.filter(t => !usedInSession.has(t));
            if(config.strictCourtSize && isSmall) candidates = candidates.filter(t => teamSizes[t] <= 5);
            if(candidates.length < 2) continue;
            candidates.sort(() => Math.random() - 0.5);
            let bestPair = null, minScore = Infinity;
            for(let i=0; i<candidates.length; i++) {
                for(let j=i+1; j<candidates.length; j++) {
                    const t1 = candidates[i], t2 = candidates[j];
                    const isB2B = (lastOpponent[t1]===t2 || lastOpponent[t2]===t1);
                    const score = matchupHistory[t1][t2]*10000 + (teamStats[t1]+teamStats[t2])*100 + (courtUsage[t1][court.idx]+courtUsage[t2][court.idx])*50 + (isB2B?500000:0) + Math.random();
                    if(score < minScore) { minScore = score; bestPair = [t1, t2]; }
                }
            }
            if(bestPair) {
                const [t1, t2] = bestPair;
                sessionMatches.push({match:[t1, t2], fieldIdx:court.idx});
                usedInSession.add(t1); usedInSession.add(t2);
                matchupHistory[t1][t2]++; matchupHistory[t2][t1]++;
                teamStats[t1]++; teamStats[t2]++;
                courtUsage[t1][court.idx]++; courtUsage[t2][court.idx]++;
                lastOpponent[t1] = t2; lastOpponent[t2] = t1;
            }
        }
        if(sessionMatches.length > 0) {
            const startL = currentTime.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit', hour12:false});
            const endC = new Date(currentTime.getTime() + matchDuration*60000);
            const endL = endC.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit', hour12:false});
            sessionList.push({id:matchIdx++, time:`${startL} - ${endL}`, startTime:startL, endTime:endL, matches:sessionMatches.sort((a,b)=>a.fieldIdx-b.fieldIdx), resting:teams.filter(t=>!usedInSession.has(t))});
            currentTime = new Date(currentTime.getTime() + (matchDuration+breakDuration)*60000);
            if(new Date(currentTime.getTime()-breakDuration*60000) >= limitTime) break;
        } else break;
    }
    return {list: sessionList, stats: teamStats};
}

function SetupTab({config, setConfig, confirmedData, presets, selectedPresetId, presetToggles, onGenerate, onLoadOpen, onPresetModalOpen, onPresetSelect, onToggleSubCourt}) {
    return (
        <div>
            <button onClick={onLoadOpen} className="w-full py-4 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center justify-center gap-2 mb-5 active:scale-95 transition-all">
                <Icon.Folder size={20} className="text-slate-500"/>
                <p className="font-black text-slate-700">과거 기록 불러오기</p>
            </button>

            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm mb-4">
                <p className="text-xs font-black text-teal-500 uppercase tracking-widest mb-4">기본 설정</p>
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 mb-1">모임 날짜</p>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-black text-sm text-center"
                            value={config.meetingDate} onChange={e=>setConfig(p=>({...p,meetingDate:e.target.value}))}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 mb-1">시작 시간</p>
                            <div className="flex gap-1">
                                <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black" value={splitTime(config.startTime).h} onChange={e=>setConfig(p=>({...p,startTime:`${e.target.value}:${splitTime(p.startTime).m}`}))}>
                                    {hoursList.map(h=><option key={h} value={h}>{h}시</option>)}
                                </select>
                                <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black" value={splitTime(config.startTime).m} onChange={e=>setConfig(p=>({...p,startTime:`${splitTime(p.startTime).h}:${e.target.value}`}))}>
                                    {minutesList.map(m=><option key={m} value={m}>{m}분</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-rose-400 mb-1">종료 시간</p>
                            <div className="flex gap-1">
                                <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black" value={splitTime(config.endTime).h} onChange={e=>setConfig(p=>({...p,endTime:`${e.target.value}:${splitTime(p.endTime).m}`}))}>
                                    {hoursList.map(h=><option key={h} value={h}>{h}시</option>)}
                                </select>
                                <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black" value={splitTime(config.endTime).m} onChange={e=>setConfig(p=>({...p,endTime:`${splitTime(p.endTime).h}:${e.target.value}`}))}>
                                    {minutesList.map(m=><option key={m} value={m}>{m}분</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 mb-1">경기 시간(분)</p>
                            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 font-black text-center text-sm"
                                value={config.matchDuration} onChange={e=>setConfig(p=>({...p,matchDuration:parseInt(e.target.value)||12}))}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 mb-1">휴식 시간(분)</p>
                            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 font-black text-center text-sm"
                                value={config.breakDuration} onChange={e=>setConfig(p=>({...p,breakDuration:parseInt(e.target.value)||3}))}/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-black text-teal-500 uppercase tracking-widest">구장 프리셋</p>
                    <button onClick={onPresetModalOpen} className="px-3 py-1.5 bg-teal-50 text-teal-500 rounded-xl text-xs font-black">+ 추가</button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
                    <button onClick={()=>onPresetSelect(null)} className={`shrink-0 px-4 py-2.5 rounded-2xl font-black text-xs border-2 transition-all ${selectedPresetId==='manual'?'bg-teal-500 text-white border-teal-500':'bg-white text-slate-500 border-slate-200'}`}>직접 입력</button>
                    {presets.map(p=>(
                        <button key={p.id} onClick={()=>onPresetSelect(p)} className={`shrink-0 px-4 py-2.5 rounded-2xl font-black text-xs border-2 transition-all ${selectedPresetId===p.id?'bg-teal-500 text-white border-teal-500':'bg-white text-slate-600 border-slate-200'}`}>{p.name}</button>
                    ))}
                </div>

                {selectedPresetId!=='manual' && (
                    <div className="bg-teal-50 rounded-2xl p-4 mb-3">
                        <p className="text-xs font-black text-teal-600 mb-2">세부 구장 선택</p>
                        <div className="flex flex-wrap gap-2">
                            {presets.find(p=>p.id===selectedPresetId)?.fieldNames.map((name,i)=>(
                                <button key={i} onClick={()=>onToggleSubCourt(i)}
                                    className={`px-3 py-2 rounded-xl font-black text-xs border transition-all ${presetToggles[i]?'bg-teal-500 text-white border-teal-500':'bg-white text-slate-500 border-slate-200'}`}>
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedPresetId==='manual' && (
                    <div className="space-y-2 mb-3">
                        <p className="text-[10px] font-black text-slate-400">구장 수: {config.courtCount}</p>
                        <div className="flex gap-2">
                            <button onClick={()=>{if(config.courtCount>1){const fn=[...config.fieldNames];fn.pop();const ft=[...config.fieldTypes];ft.pop();setConfig(p=>({...p,courtCount:p.courtCount-1,fieldNames:fn,fieldTypes:ft}));}}} className="p-2.5 rounded-xl bg-slate-100 text-slate-600"><Icon.Minus size={14}/></button>
                            <button onClick={()=>{if(config.courtCount<6){const fn=[...config.fieldNames,`${config.courtCount+1}구장`];const ft=[...config.fieldTypes,'6vs6'];setConfig(p=>({...p,courtCount:p.courtCount+1,fieldNames:fn,fieldTypes:ft}));}}} className="p-2.5 rounded-xl bg-slate-100 text-slate-600"><Icon.Plus size={14}/></button>
                        </div>
                        {config.fieldNames.map((name,i)=>(
                            <div key={i} className="flex gap-2 items-center">
                                <input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black" value={name}
                                    onChange={e=>{const fn=[...config.fieldNames];fn[i]=e.target.value;setConfig(p=>({...p,fieldNames:fn}));}}/>
                                <select className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-black"
                                    value={config.fieldTypes[i]} onChange={e=>{const ft=[...config.fieldTypes];ft[i]=e.target.value;setConfig(p=>({...p,fieldTypes:ft}));}}>
                                    <option value="6vs6">6vs6</option><option value="5vs5">5vs5</option>
                                </select>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 cursor-pointer" onClick={()=>setConfig(p=>({...p,strictCourtSize:!p.strictCourtSize}))}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${config.strictCourtSize?'bg-teal-500 border-teal-500':'border-slate-300'}`}>
                        {config.strictCourtSize&&<Icon.Check size={10} className="text-white"/>}
                    </div>
                    <p className="text-xs font-black text-slate-700">5vs5 구장에 6명 이상 팀 배정 제외</p>
                </div>
            </div>

            {confirmedData && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
                    <p className="text-xs font-black text-emerald-600 flex items-center gap-1"><Icon.Check size={13} className="flex-shrink-0"/>확정된 팀 편성: {confirmedData.meetingDate}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">{confirmedData.teams?.length}팀 · {confirmedData.teams?.reduce((s,t)=>s+t.members.length,0)}명</p>
                </div>
            )}

            <button onClick={onGenerate} disabled={config.courtCount===0}
                className="w-full py-4 bg-teal-500 text-white rounded-3xl font-black text-lg shadow-xl disabled:opacity-30">
                <Icon.Calendar size={18} className="inline-block mr-1.5"/> 매치 테이블 생성
            </button>
        </div>
    );
}
