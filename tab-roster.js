// ─── 명단 > 통계 (운영진 전용) — history 집계로 회원별 출석률·지각·노쇼 랭킹 ───────────
// 회비 납부 대상자 기준(휴식·탈퇴 제외). 출석률 = (정상+지각) ÷ 참가확정(정상+지각+노쇼).
// '결석(불참 통보)'은 데이터상 분리가 어려워 노쇼에 포함된다.
const RosterStatsView = ({ activeMembers, attendHistory, attendHistoryTrash = [], monthlyStatuses, showConfirm, showAlert }) => {
    const { useState, useMemo } = React;
    const [sortBy, setSortBy] = useState('rate'); // rate | late | no
    const [view, setView] = useState('member'); // member(회원별) | meeting(모임일별 출석)
    const [openId, setOpenId] = useState(null);
    const data = useMemo(() => {
        const parseT = (t) => { const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t || ''); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0)) : null; };
        const included = (activeMembers || []).filter(m => (monthlyStatuses ? monthlyStatuses[m.id] !== 'rest' : true));
        const agg = {};
        (attendHistory || []).forEach(h => (h.records || []).forEach(r => {
            if (!r.memberId) return;
            const a = agg[r.memberId] || (agg[r.memberId] = { go: 0, late: 0, no: 0, ciSum: 0, ciCount: 0 });
            if (r.status === '정상') a.go++; else if (r.status === '지각') a.late++; else if (r.status === '노쇼') a.no++;
            if (r.status === '정상' || r.status === '지각') { const t = parseT(r.checkInTime); if (t != null) { a.ciSum += t; a.ciCount++; } }
        }));
        const rows = included.map(m => {
            const a = agg[m.id] || { go: 0, late: 0, no: 0, ciSum: 0, ciCount: 0 };
            const conf = a.go + a.late + a.no;
            return { id: m.id, name: m.name, role: m.role, go: a.go, late: a.late, no: a.no, conf,
                rate: conf ? Math.round((a.go + a.late) / conf * 100) : null,
                avgCi: a.ciCount ? a.ciSum / a.ciCount : Infinity };
        });
        const withRec = rows.filter(r => r.conf > 0);
        // 개근왕: 출석률 높은순 → 지각+노쇼 적은순 → 평균 출석시간 빠른순. (≥90%만 후보)
        const kingCand = withRec.filter(r => r.rate >= 90)
            .sort((a, b) => b.rate - a.rate || (a.late + a.no) - (b.late + b.no) || a.avgCi - b.avgCi);
        const kingId = kingCand.length ? kingCand[0].id : null;
        const avg = withRec.length ? Math.round(withRec.reduce((s, r) => s + r.rate, 0) / withRec.length) : 0;
        const totalNo = withRec.reduce((s, r) => s + r.no, 0);
        return { withRec, noRec: rows.length - withRec.length, included: rows.length, avg, totalNo, kingId };
    }, [activeMembers, attendHistory, monthlyStatuses]);

    const sorted = useMemo(() => {
        const arr = [...data.withRec];
        if (sortBy === 'late') arr.sort((a, b) => b.late - a.late || b.rate - a.rate);
        else if (sortBy === 'no') arr.sort((a, b) => b.no - a.no || a.rate - b.rate);
        else arr.sort((a, b) => b.rate - a.rate || b.conf - a.conf);
        return arr;
    }, [data, sortBy]);

    // 모임일별(정기만) — 종료된 모임 1개 = 1행, 최신순. 펼치면 그날 출석/지각/노쇼 명단.
    const meetingRows = useMemo(() => (attendHistory || [])
        .filter(h => h.meetingType !== 'match')
        .map(h => {
            const recs = h.records || [];
            return {
                key: h.id || h.date, id: h.id, date: h.date, time: h.meetingTime || '',
                location: h.location || '장소 미지정', manager: h.managerName || '',
                present: h.present != null ? h.present : recs.filter(r => r.status === '정상' || r.status === '지각').length,
                total: h.total != null ? h.total : recs.length,
                go: recs.filter(r => r.status === '정상').length,
                late: recs.filter(r => r.status === '지각').length,
                no: recs.filter(r => r.status === '노쇼').length,
                records: recs.filter(r => r.status !== '대기').sort((a, b) => (a.timestamp || '99:99:99').localeCompare(b.timestamp || '99:99:99')),
            };
        })
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')), [attendHistory]);
    const fmtMD = (date) => {
        const dt = date ? new Date(date + 'T00:00:00') : null;
        if (!dt || isNaN(dt.getTime())) return { dd: '–', sub: '' };
        return { dd: dt.getDate(), sub: `${dt.getMonth() + 1}월 ${['일','월','화','수','목','금','토'][dt.getDay()]}` };
    };
    const stBadge = (s) => {
        const map = { '정상': ['출석', 'bg-emerald-50 text-emerald-600'], '지각': ['지각', 'bg-amber-50 text-amber-600'], '노쇼': ['노쇼', 'bg-rose-50 text-rose-500'] };
        const [l, c] = map[s] || ['-', 'bg-slate-100 text-slate-400'];
        return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${c}`}>{l}</span>;
    };
    const parseSec = (t) => { const x = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t || ''); return x ? (+x[1]) * 3600 + (+x[2]) * 60 + (+(x[3] || 0)) : null; };
    const ymLabel = (ym) => { const [y, mo] = (ym || '').split('-'); return (y && mo) ? `${y}년 ${+mo}월` : ym; };
    // 월별 모음 + 월별 개근왕: 그 달 정상 출석 많은순 → 지각+노쇼 적은순 → 평균 출석시간 빠른순
    const monthGroups = useMemo(() => {
        const groups = {};
        meetingRows.forEach(m => { const ym = (m.date || '').slice(0, 7); (groups[ym] || (groups[ym] = [])).push(m); });
        return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(ym => {
            const items = groups[ym];
            const agg = {};
            items.forEach(m => (m.records || []).forEach(r => {
                if (!r.memberId) return;
                const a = agg[r.memberId] || (agg[r.memberId] = { name: r.name, go: 0, late: 0, no: 0, ciSum: 0, ciCount: 0 });
                if (r.status === '정상') a.go++; else if (r.status === '지각') a.late++; else if (r.status === '노쇼') a.no++;
                if (r.status === '정상' || r.status === '지각') { const t = parseSec(r.checkInTime); if (t != null) { a.ciSum += t; a.ciCount++; } }
            }));
            const king = Object.keys(agg).map(id => { const a = agg[id]; return { id, name: a.name, go: a.go, late: a.late, no: a.no, avgCi: a.ciCount ? a.ciSum / a.ciCount : Infinity }; })
                .filter(c => c.go >= 1)
                .sort((a, b) => b.go - a.go || (a.late + a.no) - (b.late + b.no) || a.avgCi - b.avgCi)[0] || null;
            return { ym, items, king, count: items.length };
        });
    }, [meetingRows]);

    // 휴지통 — 삭제한 모임의 출석 기록(trashed). 복원/영구삭제 가능.
    const trashRows = useMemo(() => (attendHistoryTrash || []).map(h => {
        const recs = h.records || [];
        return { key: h.id, id: h.id, meetingId: h.meetingId || '', date: h.date || '', isMatch: h.meetingType === 'match', location: h.location || '장소 미지정',
            present: h.present != null ? h.present : recs.filter(r => r.status === '정상' || r.status === '지각').length,
            total: h.total != null ? h.total : recs.length };
    }).sort((a, b) => (b.date || '').localeCompare(a.date || '')), [attendHistoryTrash]);
    const [trashOpen, setTrashOpen] = useState(false);
    const restoreTrash = (row) => {
        getHistoryCol().doc(row.id).update({ trashed: false, trashedAt: null }).catch(() => showAlert && showAlert('오류', '복원 실패'));
        // 출석기록 복원 시 그 모임도 보관함에서 함께 복원(soft-delete 해제)
        if (row.meetingId) getCol('meetings').doc(row.meetingId).update({ deleted: false, deletedAt: null }).catch(() => {});
    };
    const purgeTrash = (m) => {
        const go = () => getHistoryCol().doc(m.id).delete().catch(() => showAlert && showAlert('오류', '삭제 실패'));
        if (showConfirm) showConfirm('영구 삭제', `${m.date} 출석 기록을 완전히 삭제할까요?\n복원할 수 없어요.`, go);
        else go();
    };
    // 모임별 기록을 통계에서 빼서 보관함(휴지통)으로 — 실험용 등 특정 기록 정리용. 복원 가능.
    const trashRecord = (m) => {
        if (!m.id) { showAlert && showAlert('처리 불가', '이 기록은 식별자가 없어 보관할 수 없어요.'); return; }
        const go = () => getHistoryCol().doc(m.id).update({ trashed: true, trashedAt: new Date().toISOString() }).catch(() => showAlert && showAlert('오류', '처리 실패'));
        if (showConfirm) showConfirm('기록 보관', `${m.date} 모임 기록을 통계에서 빼고 보관함으로 보낼까요?\n(아래 휴지통에서 복원할 수 있어요)`, go);
        else go();
    };

    const roleOf = (role) => (typeof ADMIN_ROLES !== 'undefined' && ADMIN_ROLES.includes(role)) ? role : '';

    return (
        <div>
            {/* 보기 전환: 회원별 통계 / 모임일별 출석(정기만) */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-3.5">
                {[['member','회원별'],['meeting','모임별']].map(([v,l]) => (
                    <button key={v} onClick={() => setView(v)} className={`flex-1 text-[12.5px] font-black py-1.5 rounded-lg transition-all ${view===v?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>{l}</button>
                ))}
            </div>
            {view === 'member' ? (<>
            <p className="text-[11.5px] font-bold text-slate-500 bg-teal-50 rounded-2xl px-3 py-2.5 mb-3.5 leading-relaxed">회비 납부 대상자 기준 · 휴식·탈퇴 제외 · 운영진만 보여요</p>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
                <div className="card rounded-2xl py-3.5 text-center"><p className="text-[22px] font-black text-teal-600 leading-none">{data.avg}%</p><p className="text-[10.5px] font-black text-slate-400 mt-1.5">평균 출석률</p></div>
                <div className="card rounded-2xl py-3.5 text-center"><p className="text-[22px] font-black text-teal-600 leading-none">{data.included}<span className="text-sm">명</span></p><p className="text-[10.5px] font-black text-slate-400 mt-1.5">대상 회원</p></div>
                <div className="card rounded-2xl py-3.5 text-center"><p className="text-[22px] font-black text-teal-600 leading-none">{data.totalNo}<span className="text-sm">건</span></p><p className="text-[10.5px] font-black text-slate-400 mt-1.5">노쇼 합계</p></div>
            </div>
            <div className="flex items-center gap-2 mb-2.5">
                <h3 className="font-black text-base text-slate-800 px-1">회원별 통계 <span className="text-teal-600">· {data.withRec.length}명</span></h3>
                <div className="ml-auto flex gap-1 bg-slate-100 rounded-xl p-1">
                    {[['rate','출석률'],['late','지각'],['no','노쇼']].map(([v,l]) => (
                        <button key={v} onClick={() => setSortBy(v)} className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition-all ${sortBy===v?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>{l}</button>
                    ))}
                </div>
            </div>
            {sorted.length === 0 ? (
                <div className="card rounded-2xl p-8 text-center text-slate-400"><p className="font-black text-sm">집계할 출석 기록이 없습니다</p></div>
            ) : (
                <div className="card rounded-2xl overflow-hidden">
                    {sorted.map((r, i) => {
                        const king = r.id === data.kingId;
                        const warn = r.no >= 2;
                        return (
                            <div key={r.id} className={`flex items-center gap-3 px-3.5 py-3 ${i>0?'border-t border-slate-100':''}`}>
                                <span className={`w-5 text-center text-sm font-black flex-shrink-0 ${i<3?'text-teal-600':'text-slate-400'}`}>{i+1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-black text-sm text-slate-800">{r.name}</span>
                                        {roleOf(r.role) && <span className="text-[10px] font-black text-slate-400">{roleOf(r.role)}</span>}
                                        {king && <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-live text-[#15171E]">개근왕</span>}
                                        {warn && <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white">노쇼 주의</span>}
                                    </div>
                                    <div className="h-[7px] rounded-full bg-slate-100 mt-2 overflow-hidden"><div className="h-full rounded-full" style={{width:`${r.rate}%`, background:'linear-gradient(90deg,#122E78,#183FB0)'}}/></div>
                                    <div className="flex gap-3 mt-1.5">
                                        <span className="text-[10.5px] font-black text-emerald-600">출석 {r.go}</span>
                                        <span className="text-[10.5px] font-black text-amber-600">지각 {r.late}</span>
                                        <span className="text-[10.5px] font-black text-rose-500">노쇼 {r.no}</span>
                                    </div>
                                </div>
                                <span className="text-[17px] font-black text-teal-600 flex-shrink-0 w-[46px] text-right">{r.rate}%</span>
                            </div>
                        );
                    })}
                </div>
            )}
            {data.noRec > 0 && <p className="text-[11px] text-slate-400 font-bold mt-2.5 px-1">+ 출석 기록 없는 대상 회원 {data.noRec}명</p>}
            <p className="text-[10.5px] text-slate-400 font-bold mt-2 px-1 leading-relaxed">출석률 = (정상+지각) ÷ 참가확정 모임 · 결석(불참 통보)은 노쇼에 포함</p>
            </>) : (<>
                {meetingRows.length === 0 ? (
                    <div className="card rounded-2xl p-8 text-center text-slate-400"><p className="font-black text-sm">종료된 정기모임 기록이 없습니다</p></div>
                ) : (<>
                    <p className="text-[11.5px] font-bold text-slate-500 bg-teal-50 rounded-2xl px-3 py-2.5 mb-3.5 leading-relaxed">정기모임만 · 월별 모음 · 달마다 개근왕 · 모임을 누르면 출석 명단</p>
                    {monthGroups.map(g => (
                        <div key={g.ym} className="mb-4">
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <h3 className="font-black text-base text-slate-800">{ymLabel(g.ym)}</h3>
                                <span className="text-[11px] font-black text-slate-400">{g.count}회</span>
                                {g.king && <span className="ml-auto text-[10.5px] font-black px-2.5 py-1 rounded-full bg-live text-[#15171E]">👑 개근왕 {g.king.name}</span>}
                            </div>
                            <div className="card rounded-2xl overflow-hidden">
                                {g.items.map((m, i) => {
                                    const open = openId === m.key;
                                    const d = fmtMD(m.date);
                                    return (
                                        <div key={m.key} className={i>0?'border-t border-slate-100':''}>
                                            <button onClick={() => setOpenId(open ? null : m.key)} className="w-full px-3.5 py-3 text-left active:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-11 text-center">
                                                        <p className="text-[19px] font-black text-slate-800 leading-none tabular-nums">{d.dd}</p>
                                                        <p className="text-[10px] font-black text-slate-400 mt-0.5">{d.sub}</p>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-black text-slate-700 truncate">{m.location}</p>
                                                        <p className="text-[11px] font-bold text-slate-400 truncate">{m.time}{m.manager && m.manager!=='미지정' ? ` · ${m.manager}` : ''}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <span className="text-[15px] font-black text-teal-600 tabular-nums">{m.present}<span className="text-[11px] text-slate-400">/{m.total}</span></span>
                                                        <Icon.ChevronRight size={16} className={`text-slate-300 transition-transform ${open?'rotate-90':''}`}/>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1.5 mt-2 ml-14">
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">출석 {m.go}</span>
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">지각 {m.late}</span>
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-500">노쇼 {m.no}</span>
                                                </div>
                                            </button>
                                            {open && (
                                                <div className="px-3.5 pb-3 pt-0.5 ml-14">
                                                    {m.records.length === 0 ? (
                                                        <p className="text-[11.5px] font-bold text-slate-400 py-2">참가 기록이 없습니다</p>
                                                    ) : m.records.map((r, j) => (
                                                        <div key={j} className="flex items-center gap-2 py-1.5 border-t border-slate-50 first:border-t-0">
                                                            <span className="text-[12.5px] font-black text-slate-700 truncate flex-1 min-w-0">{r.name}</span>
                                                            <span className="text-[11px] font-bold text-slate-400 flex-shrink-0 tabular-nums">{r.checkInTime && r.checkInTime!=='미출석' ? r.checkInTime : ''}</span>
                                                            {stBadge(r.status)}
                                                        </div>
                                                    ))}
                                                    <button onClick={() => trashRecord(m)} className="mt-2.5 w-full py-2 rounded-lg bg-rose-50 text-rose-500 font-black text-[11px] active:scale-95 transition-all">이 기록 통계에서 빼기 (보관함으로)</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {g.king && <p className="text-[10.5px] text-slate-400 font-bold mt-1.5 px-1">👑 {g.king.name} · 이 달 정상 출석 {g.king.go}회{(g.king.late + g.king.no) > 0 ? ` · 지각·노쇼 ${g.king.late + g.king.no}` : ' · 지각·노쇼 0'}</p>}
                        </div>
                    ))}
                    <p className="text-[10.5px] text-slate-400 font-bold mt-1 px-1 leading-relaxed">매칭모임은 제외 · 개근왕은 그 달 정상 출석이 가장 많고 지각·노쇼가 적은 회원(동률 시 출석 시간 빠른 순)</p>
                </>)}
                {trashRows.length > 0 && (
                    <div className="mt-5">
                        <button onClick={() => setTrashOpen(o => !o)} className="w-full flex items-center gap-2 px-1 mb-2 text-left">
                            <Icon.Trash size={15} className="text-slate-400 flex-shrink-0"/>
                            <h3 className="font-black text-base text-slate-500">휴지통 <span className="text-slate-400">{trashRows.length}</span></h3>
                            <Icon.ChevronRight size={16} className={`ml-auto text-slate-300 transition-transform ${trashOpen?'rotate-90':''}`}/>
                        </button>
                        {trashOpen && (
                            <div className="card rounded-2xl overflow-hidden">
                                {trashRows.map((m, i) => {
                                    const d = fmtMD(m.date);
                                    return (
                                        <div key={m.key} className={`flex items-center gap-2.5 px-3.5 py-3 ${i>0?'border-t border-slate-100':''}`}>
                                            <div className="flex-shrink-0 w-10 text-center opacity-70">
                                                <p className="text-[16px] font-black text-slate-500 leading-none tabular-nums">{d.dd}</p>
                                                <p className="text-[9.5px] font-black text-slate-400 mt-0.5">{d.sub}</p>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12.5px] font-black text-slate-500 truncate">{m.location}{m.isMatch?' · 매칭':''}</p>
                                                <p className="text-[11px] font-bold text-slate-400 truncate">출석 {m.present}/{m.total}</p>
                                            </div>
                                            <span role="button" onClick={() => restoreTrash(m)} className="text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-600 active:scale-95 cursor-pointer flex-shrink-0">복원</span>
                                            <span role="button" onClick={() => purgeTrash(m)} className="text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-500 active:scale-95 cursor-pointer flex-shrink-0">영구삭제</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <p className="text-[10.5px] text-slate-400 font-bold mt-2 px-1 leading-relaxed">삭제한 모임의 출석 기록 · 복원하면 통계에 다시 포함돼요</p>
                    </div>
                )}
            </>)}
        </div>
    );
};
// ─── 명단 회비 목록 이미지 내보내기 (현재 필터 목록 캡처) ───
// 스마트 분기: 모바일=공유 시트(카톡 바로) → PC=클립보드 복사(붙여넣기) → 실패 시 다운로드.
const ROSTER_FILTER_LABELS = { all:'전체', monthly:'월납', half:'반년납', full:'1년납', rest:'휴식', special:'특별휴식', unpaid:'미납', expiring:'종료예정' };
// 필터별 제목/번호 색 (앱 상태 배지 색과 맞춤). 미납=빨강·반년납=파랑 …
const ROSTER_FILTER_COLORS = { all:'#122E78', monthly:'#059669', half:'#2563EB', full:'#4F46E5', rest:'#D97706', special:'#EA580C', unpaid:'#E11D48', expiring:'#B45309' };
async function exportRosterList(fileLabel, showToast, showAlert) {
    await new Promise(r => setTimeout(r, 60));   // 렌더 안정 대기
    const notify = (msg, type) => { try { showToast ? showToast(msg, type) : (showAlert && showAlert('안내', msg)); } catch(_) {} };
    try {
        const el = document.getElementById('roster-capture-sheet');   // 캡처 전용 심플 리스트(치우침 없음)
        if (!el) return;
        const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        const fileName = `모이다_명단_${fileLabel}`;
        const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)); // iPadOS=Mac+터치
        // 1) 모바일: 공유 시트(파일) → 카톡 등으로 바로 전송
        if (isMobile && navigator.share) {
            const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
            const file = blob && new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
            if (file && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
                try { await navigator.share({ files: [file], title: fileName }); return; }
                catch (e) { if (e && e.name === 'AbortError') return; }   // 사용자가 취소 → 조용히 종료
            }
        }
        // 2) PC: 클립보드 복사(image/png) → 카톡 등에 붙여넣기
        if (navigator.clipboard && window.ClipboardItem) {
            try {
                const blobPng = await new Promise(res => canvas.toBlob(res, 'image/png'));
                await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blobPng })]);
                notify('이미지를 복사했어요 · 붙여넣기(Ctrl+V) 하세요', 'success');
                return;
            } catch (e) { /* 클립보드 실패 → 다운로드 폴백 */ }
        }
        // 3) 폴백: 다운로드
        const link = document.createElement('a');
        link.download = `${fileName}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();
    } catch (e) { notify('이미지 내보내기 실패', 'error'); }
}
// ─── 명단 탭 (관리자 모드 전용) ──────────────────────────────────────────────
const TabRoster = ({
    rosterSubTab, setRosterSubTab,
    setIsAddModalOpen,
    activeMembers, allMembers, resignedMembers, attendHistory, attendHistoryTrash,
    showConfirm, showAlert, showToast,
    setEditingMember,
    setResigningMember, setResignForm,
    handleRestoreResigned, setDeletingMember,
    moveMonth, targetMonth,
    filterCounts, filterCategory, setFilterCategory,
    filteredMembers, expiringMembers = [],
    monthlyStatuses, monthlyReasons,
    monthlyPaymentDates, duesReports = {},
    handleBillingMemberClick, onConfirmDuesReport, onRejectDuesReport,
}) => (
    <div className="animate-in">
        {/* 서브탭 + 회원 추가 버튼 */}
        <div className="flex items-center gap-2 mb-4">
            {[['directory','명단'],['monthly','회비'],['stats','통계']].map(([v,l])=>(
                <button key={v} onClick={()=>setRosterSubTab(v)}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${rosterSubTab===v?'bg-teal-500 text-white shadow-lg':'bg-slate-100 text-slate-400'}`}>
                    {l}
                </button>
            ))}
            <div className="flex-1"/>
            <button onClick={()=>setIsAddModalOpen(true)} className="p-2.5 rounded-xl bg-teal-50 text-teal-500"><Icon.UserPlus size={18}/></button>
        </div>

        {/* ── 명단 서브탭 ── */}
        {rosterSubTab === 'directory' && (
            <div>
                <div className="rounded-2xl p-5 mb-4 text-white" style={{ background:'linear-gradient(135deg,var(--c-accent),var(--c-accent-deep))', boxShadow:'0 10px 28px -8px rgba(18,46,120,0.45)' }}>
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/80">활동 회원</p>
                    <p className="font-black text-3xl leading-tight mt-1">{activeMembers.length}<span className="text-base font-black text-white/80 ml-1">명</span></p>
                    <div className="flex items-center gap-4 mt-2 text-xs font-black text-white/85">
                        <span>남성 {activeMembers.length - activeMembers.filter(m=>m.gender==='여성').length}</span>
                        <span>여성 {activeMembers.filter(m=>m.gender==='여성').length}</span>
                        <span className="text-white/60">탈퇴 {resignedMembers.length}</span>
                    </div>
                </div>
                <div className="space-y-2">
                    {[...activeMembers].sort((a,b)=>a.name.localeCompare(b.name)).map(m=>(
                        <div key={m.id} className="card border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 ${getLevelColor(m.level)}`}>{m.level}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-slate-800">{m.name}</span>
                                    {m.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                    {m.kakaoId&&<span title="카카오 연동" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:22,height:22,background:'#FEE500',borderRadius:6}}><svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M9 1C4.582 1 1 3.896 1 7.444c0 2.292 1.522 4.305 3.824 5.441L3.9 16.1a.3.3 0 0 0 .438.327L8.1 14.04c.296.03.597.046.9.046 4.418 0 8-2.896 8-6.442C17 3.896 13.418 1 9 1z" fill="#3C1E1E"/></svg></span>}
                                    {ADMIN_ROLES.includes(m.role)&&<span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${getRoleBadgeClass(m.role)}`}>{m.role}</span>}
                                    {m.coupleId&&<span className="text-[10px] font-black text-teal-500 flex items-center gap-0.5"><Icon.Heart size={9}/>{allMembers.find(p=>p.id===m.coupleId)?.name||'?'}</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[10px] text-slate-400">{formatBirth(m.birth)}</span>
                                    {m.isFastYear&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-sky-100 text-sky-600 rounded-lg">빠른</span>}
                                    {m.position&&m.position!=='all'&&<span className="text-[10px] text-slate-400">{m.position}</span>}
                                    {m.address&&<span className="text-[10px] text-slate-400">{m.address}</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    {m.phone&&<span className="text-[10px] text-slate-400">{formatPhoneInput(m.phone)}</span>}
                                    {m.isFounder
                                        ? <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-lg">원년</span>
                                        : m.joinDate&&<span className="text-[10px] text-slate-400">가입 {m.joinDate}</span>
                                    }
                                </div>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                                <button onClick={()=>setEditingMember({...m})} className="p-2.5 rounded-xl bg-blue-50 text-blue-500"><Icon.Edit size={14}/></button>
                                <button onClick={()=>{setResigningMember(m);setResignForm({date:'',reason:'',isForced:false});}} className="p-2.5 rounded-xl bg-red-50 text-red-400"><Icon.Trash size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                {resignedMembers.length > 0 && (
                    <div className="mt-6">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">탈퇴 회원 {resignedMembers.length}명</p>
                        {[...resignedMembers].sort((a,b)=>a.name.localeCompare(b.name)).map(m=>(
                            <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-1.5">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-slate-400 text-sm">{m.name}</span>
                                        <span className="text-[10px] text-slate-400">{m.resignDate}</span>
                                        {m.isForcedResign&&<span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-lg font-black">강제탈퇴</span>}
                                    </div>
                                    {m.resignReason&&m.resignReason!=='사유 미작성'&&<p className="text-[10px] text-slate-400 mt-0.5">{m.resignReason}</p>}
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button onClick={()=>handleRestoreResigned(m)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500" title="탈퇴 철회"><Icon.RotateCcw size={13}/></button>
                                    <button onClick={()=>setDeletingMember(m)} className="p-1.5 rounded-lg bg-red-50 text-red-400" title="완전 삭제"><Icon.Trash size={13}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* ── 회비 서브탭 ── */}
        {rosterSubTab === 'monthly' && (
            <div>
                {/* 종료 예정(반년납·1년납 이번 달 만료) 상단 하이라이트 — 운영진 갱신 안내용 */}
                {expiringMembers.length > 0 && (
                    <div className="mb-3 rounded-2xl p-3 bg-amber-50 border border-amber-200">
                        <p className="text-sm font-black text-amber-700 mb-2 flex items-center gap-1.5"><Icon.Clock size={14} className="flex-shrink-0"/>반년납·1년납 종료 예정 {expiringMembers.length}명 · 갱신 안내가 필요해요</p>
                        <div className="space-y-1.5">
                            {expiringMembers.map(m => {
                                const einfo = getMembershipStatus(m, targetMonth);
                                return (
                                    <button key={m.id} onClick={()=>handleBillingMemberClick(m)} className="w-full flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-left active:scale-95 transition-all">
                                        <span className="font-black text-slate-800 text-sm">{m.name}</span>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg inline-flex items-center leading-none ${statusConfig[einfo?.type==='반년'?'half':'full'].color}`}>{einfo?.type}납</span>
                                        <span className="ml-auto text-[11px] font-black text-amber-700 flex-shrink-0">만료 {einfo?.endDateFormatted}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                {(() => {
                    const pend = Object.values(duesReports||{}).filter(r=>r&&r.status==='pending');
                    if (!pend.length) return null;
                    return (
                        <div className="mb-3 rounded-2xl p-3 bg-amber-50 border border-amber-200">
                            <p className="text-sm font-black text-amber-700 mb-2 flex items-center gap-1.5"><Icon.Bell size={14} className="flex-shrink-0"/>회비 납부 신고 {pend.length}건 · 확인하고 확정해 주세요</p>
                            <div className="space-y-1.5">
                                {pend.map(r => (
                                    <div key={r.memberId+'_'+r.month} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-800 truncate">{r.memberName||'회원'}</p>
                                            <p className="text-[11px] text-slate-400">{r.month} · {DUES_LABELS[r.payType]||''} {wonFmt(r.amount)}원</p>
                                        </div>
                                        <button onClick={()=>onConfirmDuesReport && onConfirmDuesReport(r)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-black shrink-0 active:scale-95">확정</button>
                                        <button onClick={()=>onRejectDuesReport && onRejectDuesReport(r)} className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-black shrink-0 active:scale-95">삭제</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
                <div className="flex items-center justify-between mb-4 card rounded-2xl p-4">
                    <button onClick={()=>moveMonth(-1)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><Icon.ChevronLeft size={18}/></button>
                    <p className="font-black text-lg text-slate-800">{targetMonth.replace('-','년 ')}월</p>
                    <button onClick={()=>moveMonth(1)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><Icon.ChevronRight size={18}/></button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                    {[
                        {key:'all',label:`전체 ${filterCounts.all}`},
                        {key:'monthly',label:`월납 ${filterCounts.monthly}`},
                        {key:'half',label:`반년 ${filterCounts.half}`},
                        {key:'full',label:`1년 ${filterCounts.full}`},
                        {key:'rest',label:`휴식 ${filterCounts.rest}`},
                        {key:'special',label:`특별휴식 ${filterCounts.special}`},
                        {key:'unpaid',label:`미납 ${filterCounts.unpaid}`},
                    ].map(f=>(
                        <button key={f.key} onClick={()=>setFilterCategory(f.key)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl font-black text-xs transition-all ${filterCategory===f.key?'bg-teal-500 text-white shadow':'card border-slate-200 text-slate-500'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end mb-2">
                    <button onClick={()=>exportRosterList(`${targetMonth}_${ROSTER_FILTER_LABELS[filterCategory]||''}`, showToast, showAlert)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-black text-xs active:scale-95 transition-all"><Icon.Camera size={14}/>이미지 공유</button>
                </div>
                <div id="roster-capture-area" style={{background:'#f8fafc'}} className="rounded-2xl p-2">
                    <div className="px-1 pt-0.5 pb-2.5">
                        <p className="font-black text-slate-800 text-[15px]">{targetMonth.replace('-','년 ')}월 · {ROSTER_FILTER_LABELS[filterCategory]||'전체'} <span className="text-teal-500">{filteredMembers.length}명</span></p>
                    </div>
                    <div className="space-y-2">
                    {filteredMembers.map(m=>{
                        const statusType = getMemberStatusType(m, monthlyStatuses, monthlyReasons, targetMonth);
                        const cfg = statusConfig[statusType] || statusConfig.unpaid;
                        const info = getMembershipStatus(m, targetMonth);
                        const payDate = monthlyPaymentDates[m.id];
                        return (
                            <button key={m.id} onClick={()=>handleBillingMemberClick(m)}
                                className="w-full flex items-center gap-3 p-4 card border-slate-100 rounded-2xl text-left hover:border-teal-100 transition-all">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-slate-800">{m.name}</span>
                                        {statusType==='rest'&&info?.active
                                            ? <>
                                                <span className={`roster-badge text-[9px] font-black px-1.5 py-0.5 rounded-lg inline-flex items-center leading-none ${statusConfig[info.type==='반년'?'half':'full'].color}`}>{info.type}납</span>
                                                <span className={`roster-badge text-[9px] font-black px-1.5 py-0.5 rounded-lg inline-flex items-center leading-none ${cfg.color}`}>휴식 중</span>
                                              </>
                                            : <span className={`roster-badge text-[9px] font-black px-1.5 py-0.5 rounded-lg inline-flex items-center leading-none ${cfg.color}`}>{cfg.label}</span>
                                        }
                                        {duesReports[m.id]?.status==='pending' && <span className="roster-badge text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-700 inline-flex items-center leading-none gap-1"><Icon.Mail size={10} className="flex-shrink-0"/>{DUES_LABELS[duesReports[m.id].payType]||'신고'} {wonFmt(duesReports[m.id].amount)}</span>}
                                    </div>
                                    {info?.active&&<p className="text-[10px] text-slate-400 mt-0.5">만료: {info.endDateFormatted} · 잔여휴식 {info.remainingRest}회</p>}
                                    {payDate&&<p className="text-[10px] text-slate-400 mt-0.5">납부일: {payDate}</p>}
                                    {m.isSpecialRest&&<p className="text-[10px] text-orange-400 mt-0.5">특별휴식: {m.specialRestReason}</p>}
                                </div>
                                <Icon.ChevronRight size={16} className="text-slate-300 flex-shrink-0"/>
                            </button>
                        );
                    })}
                    </div>
                </div>
                {/* 이미지 캡처 전용 시트 — 화면 밖에 렌더. 카드 대신 심플 블록 리스트라 글씨 치우침 없음 */}
                <div id="roster-capture-sheet" style={{position:'absolute',left:'-99999px',top:0,width:'380px',background:'#ffffff',padding:'26px 24px',fontFamily:"'Pretendard Variable', Pretendard, sans-serif"}}>
                    <div style={{fontWeight:900,fontSize:'12px',color:'#1e293b',letterSpacing:'0.08em',marginBottom:'3px'}}>OTP FC · {targetMonth.replace('-','년 ')}월</div>
                    <div style={{fontWeight:900,fontSize:'22px',marginBottom:'16px'}}><span style={{color: ROSTER_FILTER_COLORS[filterCategory]||'#122E78'}}>{ROSTER_FILTER_LABELS[filterCategory]||'전체'}</span> <span style={{color:'#1e293b',fontSize:'16px'}}>{filteredMembers.length}명</span></div>
                    {filteredMembers.map((m,i)=>{
                        const info = getMembershipStatus(m, targetMonth);
                        return (
                            <div key={m.id} style={{padding:'13px 2px',borderBottom:'1px solid #f4f6fa'}}>
                                <span style={{display:'inline-block',minWidth:'22px',textAlign:'right',fontWeight:900,fontSize:'15px',color:(ROSTER_FILTER_COLORS[filterCategory]||'#122E78')+'66',marginRight:'14px',verticalAlign:'middle'}}>{i+1}</span>
                                <span style={{fontWeight:800,fontSize:'16px',color:'#1e293b',verticalAlign:'middle'}}>{m.name}</span>
                                {filterCategory==='expiring' && info?.active && <span style={{fontWeight:700,fontSize:'12px',color:'#475569',marginLeft:'8px',verticalAlign:'middle'}}>만료 {info.endDateFormatted}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* ── 통계 서브탭 ── */}
        {rosterSubTab === 'stats' && (
            <RosterStatsView activeMembers={activeMembers} attendHistory={attendHistory} attendHistoryTrash={attendHistoryTrash} monthlyStatuses={monthlyStatuses} showConfirm={showConfirm} showAlert={showAlert} />
        )}
    </div>
);
// ─────────────────────────────────────────────────────────────────────────────
