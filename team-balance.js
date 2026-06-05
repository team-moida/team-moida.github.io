function buildTeams({ teamingSettings, activeSelectedList, members, pastTeammatesMap }) {
    const { teamCount, keepCouples, avoidOverlap } = teamingSettings;
    const total = activeSelectedList.length;
    if (total < teamCount) return { error: `선정 인원(${total}명)이 팀 수(${teamCount})보다 적습니다.` };

    const pool = activeSelectedList.map(p => {
        const mi = members.find(mm => mm.id === p.memberId) || {};
        const lvl = parseInt(mi.level || p.level || 4);
        return { ...p, name: mi.name || p.name, level: lvl, tierOrder: mi.tierOrder ?? 99, points: getLevelPoints(lvl), coupleId: mi.coupleId || '', gender: mi.gender || p.gender || '남성', isGuest: p.isGuest || false };
    });

    const baseCapacity = Math.floor(total / teamCount);
    const remainder = total % teamCount;
    const resultTeams = Array.from({ length: teamCount }, (_, i) => ({
        id: i, members: [], scoreSum: 0, capacity: baseCapacity + (i < remainder ? 1 : 0), femaleCount: 0
    }));

    const getPastOverlap = (teamMembers, newMembers) => {
        let count = 0;
        newMembers.forEach(nm => {
            const ps = pastTeammatesMap[nm.memberId || nm.id];
            if (ps) teamMembers.forEach(tm => { if (ps.has(tm.memberId || tm.id)) count++; });
        });
        return count;
    };

    // ── 1단계: 커플 식별 ──
    const usedIds = new Set();
    const coupleUnits = [];
    if (keepCouples) {
        const processed = new Set();
        pool.forEach(p => {
            const pid = p.memberId || p.id;
            if (processed.has(pid) || !p.coupleId) return;
            const partner = pool.find(o => { const oid = o.memberId || o.id; return oid === p.coupleId && !processed.has(oid); });
            if (partner) {
                coupleUnits.push({ members: [p, partner], totalPoints: p.points + partner.points, femaleCount: [p, partner].filter(m => m.gender === '여성').length });
                processed.add(pid); processed.add(partner.memberId || partner.id);
                usedIds.add(pid); usedIds.add(partner.memberId || partner.id);
            }
        });
    }
    const singles = pool.filter(p => !usedIds.has(p.memberId || p.id));
    const singleFemales = shuffleArray(singles.filter(m => m.gender === '여성')).sort((a, b) => a.level - b.level);
    const singleMales = shuffleArray(singles.filter(m => m.gender !== '여성')).sort((a, b) => a.level - b.level || (a.tierOrder || 99) - (b.tierOrder || 99));

    // ── 2단계: 커플 배정 ──
    coupleUnits.sort((a, b) => b.femaleCount - a.femaleCount || b.totalPoints - a.totalPoints);
    coupleUnits.forEach(unit => {
        const required = unit.members.length;
        let cands = resultTeams.filter(t => t.members.length + required <= t.capacity);
        if (!cands.length) cands = [...resultTeams];
        cands.sort((a, b) => {
            if (unit.femaleCount > 0 && a.femaleCount !== b.femaleCount) return a.femaleCount - b.femaleCount;
            if (avoidOverlap) { const oA = getPastOverlap(a.members, unit.members), oB = getPastOverlap(b.members, unit.members); if (oA !== oB && Math.abs(a.scoreSum - b.scoreSum) <= 2.5) return oA - oB; }
            return a.scoreSum - b.scoreSum || Math.random() - 0.5;
        });
        const t = cands[0];
        t.members.push(...unit.members); t.scoreSum += unit.totalPoints; t.femaleCount += unit.femaleCount;
    });

    // ── 3단계: 단독 여성 배정 ──
    singleFemales.forEach(female => {
        let cands = resultTeams.filter(t => t.members.length < t.capacity);
        if (!cands.length) cands = [...resultTeams];
        cands.sort((a, b) => {
            if (a.femaleCount !== b.femaleCount) return a.femaleCount - b.femaleCount;
            if (avoidOverlap) { const oA = getPastOverlap(a.members, [female]), oB = getPastOverlap(b.members, [female]); if (oA !== oB) return oA - oB; }
            return a.scoreSum - b.scoreSum;
        });
        const t = cands[0];
        t.members.push(female); t.scoreSum += female.points; t.femaleCount += 1;
    });

    // ── 4단계: 남성 스네이크 드래프트 ──
    const maleQueue = [...singleMales];
    let draftFwd = true;
    const baseOrder = Array.from({ length: teamCount }, (_, i) => i);
    while (maleQueue.length > 0) {
        const order = draftFwd ? [...baseOrder] : [...baseOrder].reverse();
        let anyAssigned = false;
        for (const tid of order) {
            if (!maleQueue.length) break;
            const t = resultTeams[tid];
            if (t.members.length >= t.capacity) continue;
            let chosenIdx = 0;
            if (avoidOverlap && maleQueue.length > 1) {
                const look = Math.min(maleQueue.length, teamCount);
                let minOvlp = getPastOverlap(t.members, [maleQueue[0]]);
                for (let k = 1; k < look; k++) {
                    if (maleQueue[k].level - maleQueue[0].level > 1) break;
                    const ovlp = getPastOverlap(t.members, [maleQueue[k]]);
                    if (ovlp < minOvlp) { minOvlp = ovlp; chosenIdx = k; }
                }
            }
            const male = maleQueue.splice(chosenIdx, 1)[0];
            t.members.push(male); t.scoreSum += male.points;
            anyAssigned = true;
        }
        if (!anyAssigned) break;
        draftFwd = !draftFwd;
    }
    maleQueue.forEach(m => {
        const t = resultTeams.reduce((min, cur) => cur.members.length < min.members.length ? cur : min, resultTeams[0]);
        t.members.push(m); t.scoreSum += m.points;
    });

    // ── 5단계: 점수 균형 스왑 ──
    let improved = true, iters = 0;
    while (improved && iters < 150) {
        improved = false; iters++;
        resultTeams.sort((a, b) => b.scoreSum - a.scoreSum);
        const strong = resultTeams[0], weak = resultTeams[resultTeams.length - 1];
        let bestSwap = null, bestDiff = strong.scoreSum - weak.scoreSum;
        for (let i = 0; i < strong.members.length; i++) {
            const m1 = strong.members[i];
            if (m1.gender === '여성' || (keepCouples && m1.coupleId)) continue;
            for (let j = 0; j < weak.members.length; j++) {
                const m2 = weak.members[j];
                if (m2.gender === '여성' || (keepCouples && m2.coupleId)) continue;
                const newDiff = Math.abs((strong.scoreSum - m1.points + m2.points) - (weak.scoreSum - m2.points + m1.points));
                if (newDiff < bestDiff) { bestDiff = newDiff; bestSwap = { si: i, wi: j }; }
            }
        }
        if (bestSwap) {
            const m1 = strong.members[bestSwap.si], m2 = weak.members[bestSwap.wi];
            strong.members[bestSwap.si] = m2; weak.members[bestSwap.wi] = m1;
            strong.scoreSum = strong.scoreSum - m1.points + m2.points;
            weak.scoreSum = weak.scoreSum - m2.points + m1.points;
            improved = true;
        }
    }

    // ── 6단계: 포지션 배치 ──
    const arrangeMembers = (teamMembers, capacity) => {
        const females = [...teamMembers.filter(m => m.gender === '여성')];
        const males = teamMembers.filter(m => m.gender !== '여성').sort((a, b) => a.level - b.level || (a.tierOrder || 99) - (b.tierOrder || 99));
        const result = new Array(capacity).fill(null);
        const malePool = [...males];
        const femalePool = [...females];
        if (capacity > 2) {
            if (femalePool.length > 0) result[2] = femalePool.shift();
            else if (malePool.length > 0) result[2] = malePool.pop();
        }
        const slot2 = capacity >= 6 ? 5 : capacity === 5 ? 4 : -1;
        if (slot2 >= 0 && femalePool.length > 0) result[slot2] = femalePool.shift();
        const fill = [...malePool, ...femalePool];
        for (let i = 0; i < capacity; i++) { if (result[i] === null && fill.length) result[i] = fill.shift(); }
        return result.filter(Boolean);
    };

    resultTeams.sort((a, b) => a.id - b.id);
    const finalTeams = resultTeams.map(t => ({ members: arrangeMembers(t.members, t.capacity), scoreSum: t.scoreSum }));
    return { teams: finalTeams };
}

function GeneratorTab({ meetingDate, activeSelectedList, entryList, levelStats, members, excludedIds, setExcludedIds, teamingSettings, setTeamingSettings, onGenerate }) {
    return (
        <div>
            <div className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-xs font-black text-teal-500 uppercase tracking-widest">모임 날짜</p>
                        <p className="text-xl font-black text-slate-800 mt-0.5">{meetingDate || '날짜 미설정'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-slate-800">{activeSelectedList.length}명</p>
                        <p className="text-[10px] text-slate-400">편성 대상</p>
                    </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                    {Object.entries(levelStats).map(([lvl, count]) => count > 0 && (
                        <span key={lvl} className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${getLevelColor(lvl)}`}>{lvl}단계:{count}명</span>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 shadow-sm">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">편성 설정</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {[2, 3, 4, 5, 6].slice(0, 5).map(n => (
                        <button key={n} onClick={() => setTeamingSettings(p => ({ ...p, teamCount: n }))}
                            className={`py-3 rounded-2xl font-black text-sm transition-all ${teamingSettings.teamCount === n ? 'bg-teal-500 text-white shadow' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                            {n}팀
                        </button>
                    ))}
                </div>
                <div className="space-y-2">
                    {[
                        { key: 'keepCouples', label: '커플 같은 팀 유지' },
                        { key: 'avoidOverlap', label: '지난 주 팀메이트 중복 회피' },
                    ].map(opt => (
                        <button key={opt.key} onClick={() => setTeamingSettings(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${teamingSettings[opt.key] ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200'}`}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${teamingSettings[opt.key] ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>
                                {teamingSettings[opt.key] && <Icon.Check size={10} className="text-white" />}
                            </div>
                            <span className="text-sm font-black text-slate-700">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {entryList.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 shadow-sm">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">편성 대상 (클릭하여 제외)</p>
                    <div className="flex flex-wrap gap-2">
                        {entryList.map(p => {
                            const mi = members.find(mm => mm.id === p.memberId) || {};
                            const lvl = mi.level || p.level;
                            const isExcluded = excludedIds.includes(p.memberId || p.id);
                            return (
                                <button key={p.id} onClick={() => setExcludedIds(prev => prev.includes(p.memberId || p.id) ? prev.filter(id => id !== p.memberId && id !== p.id) : [...prev, p.memberId || p.id])}
                                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all ${isExcluded ? 'bg-slate-100 border-slate-200 opacity-40 line-through' : 'bg-white border-slate-200 hover:border-teal-300'}`}>
                                    <span>{mi.name || p.name}</span>
                                    {(mi.gender || p.gender) === '여성' && <span className="text-pink-400">W</span>}
                                    {p.isGuest && <span className="text-[9px] px-1 bg-slate-700 text-white rounded">G</span>}
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${getLevelColor(lvl)}`}>{lvl}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <button onClick={onGenerate} disabled={activeSelectedList.length < teamingSettings.teamCount}
                className="w-full py-4 bg-teal-500 text-white rounded-3xl font-black text-lg shadow-xl disabled:opacity-30">
                <Icon.Zap size={18} className="inline-block mr-1.5" /> 팀 자동 편성
            </button>
        </div>
    );
}
