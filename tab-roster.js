// ─── 명단 > 통계 (운영진 전용) — history 집계로 회원별 출석률·지각·노쇼 랭킹 ───────────
// 회비 납부 대상자 기준(휴식·탈퇴 제외). 출석률 = (정상+지각) ÷ 참가확정(정상+지각+노쇼).
// '결석(불참 통보)'은 데이터상 분리가 어려워 노쇼에 포함된다.
const RosterStatsView = ({ activeMembers, attendHistory, monthlyStatuses }) => {
    const { useState, useMemo } = React;
    const [sortBy, setSortBy] = useState('rate'); // rate | late | no
    const data = useMemo(() => {
        const included = (activeMembers || []).filter(m => (monthlyStatuses ? monthlyStatuses[m.id] !== 'rest' : true));
        const agg = {};
        (attendHistory || []).forEach(h => (h.records || []).forEach(r => {
            if (!r.memberId) return;
            const a = agg[r.memberId] || (agg[r.memberId] = { go: 0, late: 0, no: 0 });
            if (r.status === '정상') a.go++; else if (r.status === '지각') a.late++; else if (r.status === '노쇼') a.no++;
        }));
        const rows = included.map(m => {
            const a = agg[m.id] || { go: 0, late: 0, no: 0 };
            const conf = a.go + a.late + a.no;
            return { id: m.id, name: m.name, role: m.role, go: a.go, late: a.late, no: a.no, conf, rate: conf ? Math.round((a.go + a.late) / conf * 100) : null };
        });
        const withRec = rows.filter(r => r.conf > 0);
        const avg = withRec.length ? Math.round(withRec.reduce((s, r) => s + r.rate, 0) / withRec.length) : 0;
        const totalNo = withRec.reduce((s, r) => s + r.no, 0);
        return { withRec, noRec: rows.length - withRec.length, included: rows.length, avg, totalNo };
    }, [activeMembers, attendHistory, monthlyStatuses]);

    const sorted = useMemo(() => {
        const arr = [...data.withRec];
        if (sortBy === 'late') arr.sort((a, b) => b.late - a.late || b.rate - a.rate);
        else if (sortBy === 'no') arr.sort((a, b) => b.no - a.no || a.rate - b.rate);
        else arr.sort((a, b) => b.rate - a.rate || b.conf - a.conf);
        return arr;
    }, [data, sortBy]);

    const roleOf = (role) => (typeof ADMIN_ROLES !== 'undefined' && ADMIN_ROLES.includes(role)) ? role : '';

    return (
        <div>
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
                        const king = i === 0 && sortBy === 'rate' && r.rate >= 90;
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
        </div>
    );
};
// ─── 명단 탭 (관리자 모드 전용) ──────────────────────────────────────────────
const TabRoster = ({
    rosterSubTab, setRosterSubTab,
    setIsAddModalOpen,
    activeMembers, allMembers, resignedMembers, attendHistory,
    setEditingMember,
    setResigningMember, setResignForm,
    handleRestoreResigned, setDeletingMember,
    moveMonth, targetMonth,
    filterCounts, filterCategory, setFilterCategory,
    filteredMembers,
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
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                    {[
                        {key:'all',label:`전체 ${filterCounts.all}`},
                        {key:'monthly',label:`월납 ${filterCounts.monthly}`},
                        {key:'half',label:`반년 ${filterCounts.half}`},
                        {key:'full',label:`1년 ${filterCounts.full}`},
                        {key:'rest',label:`휴식 ${filterCounts.rest}`},
                        {key:'unpaid',label:`미납 ${filterCounts.unpaid}`},
                    ].map(f=>(
                        <button key={f.key} onClick={()=>setFilterCategory(f.key)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl font-black text-xs transition-all ${filterCategory===f.key?'bg-teal-500 text-white shadow':'card border-slate-200 text-slate-500'}`}>
                            {f.label}
                        </button>
                    ))}
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
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${statusConfig[info.type==='반년'?'half':'full'].color}`}>{info.type}납</span>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${cfg.color}`}>휴식 중</span>
                                              </>
                                            : <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${cfg.color}`}>{cfg.label}</span>
                                        }
                                        {duesReports[m.id]?.status==='pending' && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-700 inline-flex items-center gap-1"><Icon.Mail size={10} className="flex-shrink-0"/>{DUES_LABELS[duesReports[m.id].payType]||'신고'} {wonFmt(duesReports[m.id].amount)}</span>}
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
        )}

        {/* ── 통계 서브탭 ── */}
        {rosterSubTab === 'stats' && (
            <RosterStatsView activeMembers={activeMembers} attendHistory={attendHistory} monthlyStatuses={monthlyStatuses} />
        )}
    </div>
);
// ─────────────────────────────────────────────────────────────────────────────
