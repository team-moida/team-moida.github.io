function PaymentTab({ targetMonth, moveMonth, filterButtons, filterCategory, setFilterCategory, filteredMembers, monthlyStatuses, monthlyReasons, monthlyPaymentDates, handleMemberClick }) {
    return (
        <div>
            {/* 월 선택 */}
            <div className="flex items-center justify-between mb-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <button onClick={()=>moveMonth(-1)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><Icon.ChevronLeft size={18}/></button>
                <p className="font-black text-lg text-slate-800">{targetMonth.replace('-','년 ')}월</p>
                <button onClick={()=>moveMonth(1)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><Icon.ChevronRight size={18}/></button>
            </div>

            {/* 필터 버튼 */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                {filterButtons.map(f=>(
                    <button key={f.key} onClick={()=>setFilterCategory(f.key)}
                        className={`shrink-0 px-3 py-1.5 rounded-xl font-black text-xs transition-all ${filterCategory===f.key?'bg-teal-500 text-white shadow':'bg-white border border-slate-200 text-slate-500'}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* 회원 목록 */}
            <div className="space-y-2">
                {filteredMembers.map(m=>{
                    const statusType=getMemberStatusType(m,monthlyStatuses,monthlyReasons,targetMonth);
                    const cfg=statusConfig[statusType]||statusConfig.unpaid;
                    const info=getMembershipStatus(m,targetMonth);
                    const payDate=monthlyPaymentDates[m.id];
                    return (
                        <button key={m.id} onClick={()=>handleMemberClick(m)}
                            className="w-full flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl text-left hover:border-teal-200 transition-all">
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
    );
}

function PaymentActionModal({ selectedMember, setSelectedMember, actionStep, setActionStep, selectedAction, setSelectedAction, paymentDateInput, setPaymentDateInput, manualEndDate, setManualEndDate, specialRestReason, setSpecialRestReason, processAction, targetMonth }) {
    if (!selectedMember) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50" onClick={()=>setSelectedMember(null)}>
            <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1">
                        <p className="font-black text-lg text-slate-800">{selectedMember.name}</p>
                        <p className="text-xs text-slate-400">{selectedMember.role} · Lv.{selectedMember.level}</p>
                    </div>
                    <button onClick={()=>setSelectedMember(null)} className="text-slate-400 text-2xl leading-none">×</button>
                </div>

                {actionStep==='main' && (
                    <div className="space-y-2">
                        {/* 납부일 */}
                        <div className="bg-slate-50 rounded-2xl p-3 mb-3">
                            <p className="text-[10px] font-black text-slate-400 mb-1">납부일</p>
                            <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black"
                                value={paymentDateInput} onChange={e=>setPaymentDateInput(e.target.value)}/>
                        </div>
                        {!STAFF_ROLES.includes(selectedMember.role)&&[
                            {action:'monthly_paid',label:'월납 납부',color:'bg-emerald-500 text-white'},
                            {action:'start_half',label:'반년납 시작',color:'bg-blue-500 text-white'},
                            {action:'start_full',label:'1년납 시작',color:'bg-indigo-600 text-white'},
                            {action:'rest',label:'휴식 처리',color:'bg-amber-400 text-slate-800'},
                            {action:'cancel_rest',label:'휴식 취소',color:'bg-slate-200 text-slate-600'},
                            {action:'special_rest',label:'특별휴식',color:'bg-orange-400 text-white'},
                            selectedMember.isSpecialRest&&{action:'cancel_special_rest',label:'특별휴식 해제',color:'bg-slate-200 text-slate-600'},
                            {action:'clear',label:'상태 초기화',color:'bg-rose-100 text-rose-600'},
                        ].filter(Boolean).map(item=>(
                            <button key={item.action} onClick={()=>{
                                if(item.action==='start_half'){setManualEndDate(calculateEndDate(targetMonth,6));setActionStep('form');setSelectedAction('start_half');}
                                else if(item.action==='start_full'){setManualEndDate(calculateEndDate(targetMonth,12));setActionStep('form');setSelectedAction('start_full');}
                                else if(item.action==='special_rest'){setActionStep('form');setSelectedAction('special_rest');}
                                else processAction(item.action);
                            }} className={`w-full py-3 rounded-2xl font-black text-sm ${item.color}`}>{item.label}</button>
                        ))}
                    </div>
                )}

                {actionStep==='form' && selectedAction==='start_half' && (
                    <div className="space-y-3">
                        <p className="font-black text-slate-700">반년납 설정</p>
                        <div>
                            <p className="text-xs text-slate-400 mb-1">만료일</p>
                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                value={manualEndDate} onChange={e=>setManualEndDate(e.target.value)}/>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>setActionStep('main')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                            <button onClick={()=>processAction('start_half')} className="flex-1 py-3 bg-blue-500 text-white rounded-2xl font-black text-sm">확정</button>
                        </div>
                    </div>
                )}

                {actionStep==='form' && selectedAction==='start_full' && (
                    <div className="space-y-3">
                        <p className="font-black text-slate-700">1년납 설정</p>
                        <div>
                            <p className="text-xs text-slate-400 mb-1">만료일</p>
                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                value={manualEndDate} onChange={e=>setManualEndDate(e.target.value)}/>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>setActionStep('main')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                            <button onClick={()=>processAction('start_full')} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm">확정</button>
                        </div>
                    </div>
                )}

                {actionStep==='form' && selectedAction==='special_rest' && (
                    <div className="space-y-3">
                        <p className="font-black text-slate-700">특별 휴식 사유</p>
                        <input type="text" placeholder="예: 부상, 해외 출장..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                            value={specialRestReason} onChange={e=>setSpecialRestReason(e.target.value)}/>
                        <div className="flex gap-2">
                            <button onClick={()=>setActionStep('main')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                            <button onClick={()=>processAction('special_rest')} className="flex-1 py-3 bg-orange-400 text-white rounded-2xl font-black text-sm">확정</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
