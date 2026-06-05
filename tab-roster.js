// ─── 명단 탭 (관리자 모드 전용) ──────────────────────────────────────────────
const TabRoster = ({
    rosterSubTab, setRosterSubTab,
    setIsAddModalOpen,
    activeMembers, allMembers, resignedMembers,
    setEditingMember,
    setResigningMember, setResignForm,
    handleRestoreResigned, setDeletingMember,
    moveMonth, targetMonth,
    filterCounts, filterCategory, setFilterCategory,
    filteredMembers,
    monthlyStatuses, monthlyReasons,
    monthlyPaymentDates,
    handleBillingMemberClick,
}) => (
    <div className="animate-in">
        {/* 서브탭 + 회원 추가 버튼 */}
        <div className="flex items-center gap-2 mb-4">
            {[['directory','명단'],['monthly','회비']].map(([v,l])=>(
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
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">활동 회원 {activeMembers.length}명</p>
                <div className="space-y-2">
                    {[...activeMembers].sort((a,b)=>a.name.localeCompare(b.name)).map(m=>(
                        <div key={m.id} className="card border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-slate-800">{m.name}</span>
                                    {m.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                    {ADMIN_ROLES.includes(m.role)&&<span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${getRoleBadgeClass(m.role)}`}>{m.role}</span>}
                                    {m.coupleId&&<span className="text-[10px] font-black text-teal-500 flex items-center gap-0.5"><Icon.Heart size={9}/>{allMembers.find(p=>p.id===m.coupleId)?.name||'?'}</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${getLevelColor(m.level)}`}>Lv.{m.level}</span>
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
    </div>
);
// ─────────────────────────────────────────────────────────────────────────────
