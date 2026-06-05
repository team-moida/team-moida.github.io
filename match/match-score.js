function computeStats(schedule, confirmedData) {
    if(!schedule.list.length || !confirmedData) return null;
    const teams = confirmedData.teams.map((_,i) => getTeamName(i));
    const matchupCounts = {}, totalMatches = {};
    teams.forEach(t => { matchupCounts[t] = {}; teams.forEach(o => { if(t!==o) matchupCounts[t][o] = 0; }); totalMatches[t] = 0; });
    schedule.list.forEach(session => {
        session.matches.forEach(m => {
            const [t1, t2] = m.match;
            matchupCounts[t1][t2]++;
            matchupCounts[t2][t1]++;
            totalMatches[t1]++;
            totalMatches[t2]++;
        });
    });
    return {matchupCounts, totalMatches, teams};
}

function StatsTab({statsData}) {
    if(!statsData) return (
        <div className="text-center py-20 text-slate-300">
            <div className="flex justify-center mb-3 opacity-50"><Icon.Chart size={48}/></div>
            <p className="font-black">매치 테이블을 먼저 생성해주세요</p>
        </div>
    );
    return (
        <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">팀별 경기 수</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
                {statsData.teams.map((t,i)=>(
                    <div key={t} className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-sm">
                        <span className={`inline-flex w-8 h-8 rounded-xl font-black text-sm items-center justify-center mb-2 ${getTeamBadge(i)}`}>{t}</span>
                        <p className="text-2xl font-black text-slate-800">{statsData.totalMatches[t]}</p>
                        <p className="text-[10px] text-slate-400">경기</p>
                    </div>
                ))}
            </div>

            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">매치업 횟수</p>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-black text-center">
                        <thead>
                            <tr>
                                <th className="p-2 text-slate-400">vs</th>
                                {statsData.teams.map(t=><th key={t} className="p-2"><span className={`inline-flex w-7 h-7 rounded-lg text-xs items-center justify-center ${getTeamBadge(statsData.teams.indexOf(t))}`}>{t}</span></th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {statsData.teams.map((t1,i)=>(
                                <tr key={t1}>
                                    <td className="p-2"><span className={`inline-flex w-7 h-7 rounded-lg text-xs items-center justify-center ${getTeamBadge(i)}`}>{t1}</span></td>
                                    {statsData.teams.map(t2=>(
                                        <td key={t2} className={`p-2 ${t1===t2?'text-slate-200':'text-slate-700'}`}>
                                            {t1===t2?'-':statsData.matchupCounts[t1]?.[t2]||0}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
