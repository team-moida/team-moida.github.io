// ─── 모달 모음 ────────────────────────────────────────────────────────────────
const AppModals = ({
    // 회비 액션 모달
    billingMember, setBillingMember,
    actionStep, setActionStep,
    paymentDateInput, setPaymentDateInput,
    manualEndDate, setManualEndDate,
    selectedAction, setSelectedAction,
    processAction,
    specialRestReason, setSpecialRestReason,
    targetMonth,
    // 회원 추가 모달
    isAddModalOpen, setIsAddModalOpen,
    newMemberForm, setNewMemberForm,
    activeMembers, handleAddMember,
    // 회원 수정 모달
    editingMember, setEditingMember,
    handleUpdateMember,
    // 탈퇴 모달
    resigningMember, setResigningMember,
    resignForm, setResignForm,
    handleResignConfirm,
    // 팀 편성 미리보기 모달
    previewDraft, setPreviewDraft,
    tmLoadDraft,
    // 매치 기록 불러오기 모달
    isLoadMatchModalOpen, setIsLoadMatchModalOpen,
    savedMatchSchedules,
    setLocalSchedule, setMatchConfig,
    setLocalCompletedMatches, setLocalMatchIndex,
    setActiveMatchScheduleId, setMatchAdminView,
    showConfirm,
    // 구장 프리셋 추가 모달
    isPresetModalOpen, setIsPresetModalOpen,
    presetForm, setPresetForm,
    matchSavePreset,
    // 알림/확인 모달
    alertModal, setAlertModal,
    // QR 스캐너
    isQRScannerOpen, setIsQRScannerOpen,
    handleInAppQRScan,
    // 출석 체크 모달
    attendModal, setAttendModal,
    attendHandleUncheckIn, attendHandleCheckIn,
    // 게스트 추가 모달
    isAttendGuestModalOpen, setIsAttendGuestModalOpen,
    attendNewGuest, setAttendNewGuest,
    attendIsPending, attendHandleAddGuest,
    // 기록 상태 편집 모달
    historyEditTarget, setHistoryEditTarget,
    handleHistoryStatusUpdate,
    // QR 코드 생성 모달
    isQRGenModalOpen, setIsQRGenModalOpen,
    meetingSettings,
    // 지도 장소 선택 모달
    isLocationPickerOpen, setIsLocationPickerOpen,
    updateMeetingSettingsAdmin,
}) => (
    <>
        {/* ===== 회비 액션 모달 (바텀시트) ===== */}
        {billingMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center" style={{zIndex:60}} onClick={()=>setBillingMember(null)}>
                <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[85vh]" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1">
                            <p className="font-black text-lg text-slate-800">{billingMember.name}</p>
                            <p className="text-xs text-slate-400">{billingMember.role} · Lv.{billingMember.level}</p>
                        </div>
                        <button onClick={()=>setBillingMember(null)} className="text-slate-400 text-2xl leading-none">×</button>
                    </div>
                    {actionStep==='main' && (
                        <div className="space-y-2">
                            <div className="bg-slate-50 rounded-2xl p-3 mb-3">
                                <p className="text-[10px] font-black text-slate-400 mb-1">납부일</p>
                                <input type="date" style={{userSelect:'text'}} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black"
                                    value={paymentDateInput} onChange={e=>setPaymentDateInput(e.target.value)}/>
                            </div>
                            {!ADMIN_ROLES.includes(billingMember.role)&&[
                                {action:'monthly_paid',label:'월납 납부',color:'bg-emerald-500 text-white'},
                                {action:'start_half',label:'반년납 시작',color:'bg-blue-500 text-white'},
                                {action:'start_full',label:'1년납 시작',color:'bg-indigo-600 text-white'},
                                {action:'rest',label:'휴식 처리',color:'bg-amber-400 text-slate-800'},
                                {action:'cancel_rest',label:'휴식 취소',color:'bg-slate-200 text-slate-600'},
                                {action:'special_rest',label:'특별휴식',color:'bg-orange-400 text-white'},
                                billingMember.isSpecialRest&&{action:'cancel_special_rest',label:'특별휴식 해제',color:'bg-slate-200 text-slate-600'},
                                {action:'end_membership',label:'장기권 종료',color:'bg-slate-200 text-slate-600'},
                                {action:'clear',label:'상태 초기화',color:'bg-red-50 text-red-500'},
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
                            <div><p className="text-xs text-slate-400 mb-1">만료일</p>
                                <input type="date" style={{userSelect:'text'}} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                    value={manualEndDate} onChange={e=>setManualEndDate(e.target.value)}/></div>
                            <div className="flex gap-2">
                                <button onClick={()=>setActionStep('main')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                                <button onClick={()=>processAction('start_half')} className="flex-1 py-3 bg-blue-500 text-white rounded-2xl font-black text-sm">확정</button>
                            </div>
                        </div>
                    )}
                    {actionStep==='form' && selectedAction==='start_full' && (
                        <div className="space-y-3">
                            <p className="font-black text-slate-700">1년납 설정</p>
                            <div><p className="text-xs text-slate-400 mb-1">만료일</p>
                                <input type="date" style={{userSelect:'text'}} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                    value={manualEndDate} onChange={e=>setManualEndDate(e.target.value)}/></div>
                            <div className="flex gap-2">
                                <button onClick={()=>setActionStep('main')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                                <button onClick={()=>processAction('start_full')} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm">확정</button>
                            </div>
                        </div>
                    )}
                    {actionStep==='form' && selectedAction==='special_rest' && (
                        <div className="space-y-3">
                            <p className="font-black text-slate-700">특별 휴식 사유</p>
                            <input type="text" style={{userSelect:'text'}} placeholder="예: 부상, 해외 출장..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                value={specialRestReason} onChange={e=>setSpecialRestReason(e.target.value)}/>
                            <div className="flex gap-2">
                                <button onClick={()=>setActionStep('main')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                                <button onClick={()=>processAction('special_rest')} className="flex-1 py-3 bg-orange-400 text-white rounded-2xl font-black text-sm">확정</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ===== 회원 추가 모달 ===== */}
        {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:60}} onClick={()=>setIsAddModalOpen(false)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
                    <h2 className="text-xl font-black text-slate-800 mb-4">회원 추가</h2>
                    <div className="space-y-3">
                        {[
                            {label:'이름',key:'name',type:'text',placeholder:'이름 입력'},
                            {label:'생년월일',key:'birth',type:'text',placeholder:'예: 19900101',fmt:formatBirthInput},
                            {label:'전화번호',key:'phone',type:'text',placeholder:'010-0000-0000',fmt:formatPhoneInput},
                            {label:'거주지',key:'address',type:'text',placeholder:'예: 화성시 반월동'},
                        ].map(f=>(
                            <div key={f.key}>
                                <p className="text-xs font-black text-slate-500 mb-1">{f.label}</p>
                                <input type={f.type} style={{userSelect:'text'}} placeholder={f.placeholder||''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                    value={f.fmt?f.fmt(newMemberForm[f.key]||''):newMemberForm[f.key]||''} onChange={e=>setNewMemberForm(p=>({...p,[f.key]:f.fmt?f.fmt(e.target.value):e.target.value}))}/>
                            </div>
                        ))}
                        <div>
                            <p className="text-xs font-black text-slate-500 mb-1">가입일</p>
                            <input type="date" style={{userSelect:'text'}} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black ${newMemberForm.isFounder?'opacity-30':''}`}
                                disabled={!!newMemberForm.isFounder} value={newMemberForm.joinDate||''} onChange={e=>setNewMemberForm(p=>({...p,joinDate:e.target.value}))}/>
                            <label className="flex items-center gap-2 mt-2 cursor-pointer" style={{userSelect:'none'}}>
                                <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={!!newMemberForm.isFounder}
                                    onChange={e=>setNewMemberForm(p=>({...p,isFounder:e.target.checked,joinDate:e.target.checked?'':p.joinDate}))}/>
                                <span className="text-xs font-black text-amber-600">원년 멤버 (OTP FC 창단 멤버)</span>
                            </label>
                        </div>
                        {[
                            {label:'성별',key:'gender',opts:['남성','여성']},
                            {label:'역할',key:'role',opts:['회원',...ADMIN_ROLES]},
                            {label:'레벨',key:'level',opts:['1','2','3','4','5','6','7','8','9','10','11','12']},
                            {label:'포지션',key:'position',opts:['all','피보','아라','픽소','골레이로']},
                        ].map(f=>(
                            <div key={f.key}>
                                <p className="text-xs font-black text-slate-500 mb-1">{f.label}</p>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                                    value={newMemberForm[f.key]} onChange={e=>setNewMemberForm(p=>({...p,[f.key]:e.target.value}))}>
                                    {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        ))}
                        <div>
                            <p className="text-xs font-black text-slate-500 mb-1">커플 연결</p>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                                value={newMemberForm.coupleId} onChange={e=>setNewMemberForm(p=>({...p,coupleId:e.target.value}))}>
                                <option value="">없음</option>
                                {activeMembers.map(m=><option key={m.id} value={m.id}>{m.name}{m.gender==='여성'?' (W)':''}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={()=>setIsAddModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                        <button onClick={handleAddMember} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm">등록</button>
                    </div>
                </div>
            </div>
        )}

        {/* ===== 회원 수정 모달 ===== */}
        {editingMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:60}} onClick={()=>setEditingMember(null)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
                    <h2 className="text-xl font-black text-slate-800 mb-4">회원 정보 수정</h2>
                    <div className="space-y-3">
                        {[
                            {label:'이름',key:'name',type:'text'},
                            {label:'생년월일',key:'birth',type:'text',fmt:formatBirthInput},
                            {label:'전화번호',key:'phone',type:'text',placeholder:'010-0000-0000',fmt:formatPhoneInput},
                            {label:'거주지',key:'address',type:'text',placeholder:'예: 화성시 반월동'},
                        ].map(f=>(
                            <div key={f.key}>
                                <p className="text-xs font-black text-slate-500 mb-1">{f.label}</p>
                                <input type={f.type} style={{userSelect:'text'}} placeholder={f.placeholder||''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                    value={f.fmt?f.fmt(editingMember[f.key]||''):editingMember[f.key]||''} onChange={e=>setEditingMember(p=>({...p,[f.key]:f.fmt?f.fmt(e.target.value):e.target.value}))}/>
                            </div>
                        ))}
                        <div>
                            <p className="text-xs font-black text-slate-500 mb-1">가입일</p>
                            <input type="date" style={{userSelect:'text'}} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black ${editingMember.isFounder?'opacity-30':''}`}
                                disabled={!!editingMember.isFounder} value={editingMember.joinDate||''} onChange={e=>setEditingMember(p=>({...p,joinDate:e.target.value}))}/>
                            <label className="flex items-center gap-2 mt-2 cursor-pointer" style={{userSelect:'none'}}>
                                <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={!!editingMember.isFounder}
                                    onChange={e=>setEditingMember(p=>({...p,isFounder:e.target.checked,joinDate:e.target.checked?'':p.joinDate}))}/>
                                <span className="text-xs font-black text-amber-600">원년 멤버 (OTP FC 창단 멤버)</span>
                            </label>
                        </div>
                        {[
                            {label:'성별',key:'gender',opts:['남성','여성']},
                            {label:'역할',key:'role',opts:['회원',...ADMIN_ROLES]},
                            {label:'레벨',key:'level',opts:['1','2','3','4','5','6','7','8','9','10','11','12']},
                            {label:'포지션',key:'position',opts:['all','피보','아라','픽소','골레이로']},
                        ].map(f=>(
                            <div key={f.key}>
                                <p className="text-xs font-black text-slate-500 mb-1">{f.label}</p>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                                    value={editingMember[f.key]||''} onChange={e=>setEditingMember(p=>({...p,[f.key]:e.target.value}))}>
                                    {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        ))}
                        <div>
                            <p className="text-xs font-black text-slate-500 mb-1">커플 연결</p>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                                value={editingMember.coupleId||''} onChange={e=>setEditingMember(p=>({...p,coupleId:e.target.value}))}>
                                <option value="">없음</option>
                                {activeMembers.filter(m=>m.id!==editingMember.id).map(m=><option key={m.id} value={m.id}>{m.name}{m.gender==='여성'?' (W)':''}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={()=>setEditingMember(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                        <button onClick={handleUpdateMember} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm">저장</button>
                    </div>
                </div>
            </div>
        )}

        {/* ===== 탈퇴 모달 ===== */}
        {resigningMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:60}} onClick={()=>setResigningMember(null)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <h2 className="text-xl font-black text-slate-800 mb-1">탈퇴 처리</h2>
                    <p className="text-sm text-slate-500 mb-4">{resigningMember.name}</p>
                    <div className="space-y-3">
                        <div><p className="text-xs font-black text-slate-500 mb-1">탈퇴 일자</p>
                            <input type="date" style={{userSelect:'text'}} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                value={resignForm.date} onChange={e=>setResignForm(p=>({...p,date:e.target.value}))}/></div>
                        <div><p className="text-xs font-black text-slate-500 mb-1">사유</p>
                            <input type="text" style={{userSelect:'text'}} placeholder="선택 사항" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                value={resignForm.reason} onChange={e=>setResignForm(p=>({...p,reason:e.target.value}))}/></div>
                        <button onClick={()=>setResignForm(p=>({...p,isForced:!p.isForced}))}
                            className={`w-full py-2.5 rounded-xl font-black text-xs border transition-all ${resignForm.isForced?'bg-red-500 text-white border-red-500':'bg-white border-slate-200 text-slate-500'}`}>
                            {resignForm.isForced?'✓ 강제 탈퇴':'강제 탈퇴'}
                        </button>
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={()=>setResigningMember(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                        <button onClick={handleResignConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-sm">탈퇴 처리</button>
                    </div>
                </div>
            </div>
        )}

        {/* ===== 팀 편성 미리보기 모달 ===== */}
        {previewDraft && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center" style={{zIndex:65}} onClick={() => setPreviewDraft(null)}>
                <div className="bg-white rounded-t-3xl p-5 w-full max-w-lg shadow-2xl no-scrollbar overflow-y-auto" style={{maxHeight:'82vh'}} onClick={e => e.stopPropagation()}>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="font-black text-xl text-slate-800">{previewDraft.meetingDate}</p>
                            {previewDraft.meetingTimeRange && <p className="text-xs text-slate-400 mt-0.5">{previewDraft.meetingTimeRange}</p>}
                            <div className="flex items-center gap-2 mt-1.5">
                                {previewDraft.isConfirmed
                                    ? <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-lg">확정됨</span>
                                    : <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-600 rounded-lg">임시저장</span>
                                }
                            </div>
                        </div>
                        <button onClick={() => setPreviewDraft(null)} className="text-slate-400 text-3xl leading-none ml-2">×</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {(previewDraft.teams || []).map((team, teamIdx) => (
                            <div key={teamIdx} className={`rounded-2xl border-2 p-3 ${getTeamCard(teamIdx)}`}>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center text-white ${getTeamBadge(teamIdx)}`}>{getTeamName(teamIdx)}</span>
                                    <span className="text-[10px] font-black text-slate-500">{team.members.length}명</span>
                                </div>
                                {team.members.map((m, mi) => (
                                    <div key={mi} className="flex items-center gap-1 py-0.5">
                                        <span className="text-[9px] text-slate-400 w-3 text-right flex-shrink-0">{mi+1}</span>
                                        <span className="text-[10px] font-black text-slate-700 flex-1">{m.name}</span>
                                        {m.gender==='여성' && <span className="text-[9px] text-pink-400 font-black">W</span>}
                                        <span className={`text-[8px] font-black px-1 rounded ${getLevelColor(m.level)}`}>{m.level}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => tmLoadDraft(previewDraft)}
                        className="w-full py-3.5 bg-teal-500 text-white rounded-2xl font-black text-sm shadow-lg">
                        {previewDraft.isConfirmed ? '불러오기' : '불러오기'}
                    </button>
                </div>
            </div>
        )}

        {/* ===== 매치 기록 불러오기 모달 ===== */}
        {isLoadMatchModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center" style={{zIndex:65}} onClick={() => setIsLoadMatchModalOpen(false)}>
                <div className="bg-white rounded-t-3xl p-5 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
                    <h2 className="text-lg font-black text-slate-800 mb-4">과거 기록 불러오기</h2>
                    {savedMatchSchedules.length === 0
                        ? <p className="text-center text-slate-400 py-8">저장된 기록이 없습니다</p>
                        : savedMatchSchedules.map(s => (
                            <div key={s.id} className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
                                <div className="flex-1">
                                    <p className="font-black text-slate-800 text-sm">{s.meetingDate}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{s.schedule?.list?.length||0}라운드 · {s.config?.courtCount||0}구장</p>
                                </div>
                                <button onClick={() => {
                                    setLocalSchedule(s.schedule || {list:[],stats:{}});
                                    setMatchConfig(p => ({...p, ...(s.config||{})}));
                                    setLocalCompletedMatches(new Set(s.completedMatches||[]));
                                    setLocalMatchIndex(s.currentMatchIndex||0);
                                    setActiveMatchScheduleId(s.id);
                                    setMatchAdminView('results');
                                    setIsLoadMatchModalOpen(false);
                                }} className="px-3 py-2 bg-teal-500 text-white rounded-xl font-black text-xs">불러오기</button>
                                <button onClick={() => showConfirm('삭제','이 기록을 삭제하시겠습니까?', async () => await getCol('match_schedules').doc(s.id).delete())}
                                    className="p-2 bg-red-50 text-red-400 rounded-xl"><Icon.Trash size={12}/></button>
                            </div>
                        ))
                    }
                    <button onClick={() => setIsLoadMatchModalOpen(false)} className="w-full py-3 text-slate-400 text-sm mt-2 font-black">닫기</button>
                </div>
            </div>
        )}

        {/* ===== 구장 프리셋 추가 모달 ===== */}
        {isPresetModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:65}} onClick={() => setIsPresetModalOpen(false)}>
                <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                    <h2 className="text-lg font-black text-slate-800 mb-4">구장 프리셋 추가</h2>
                    <div className="space-y-3 mb-4">
                        <input type="text" placeholder="프리셋 이름 (예: 강남 풋살장)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black" style={{userSelect:'text'}}
                            value={presetForm.name} onChange={e => setPresetForm(p => ({...p, name:e.target.value}))}/>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-600 flex-1">구장 수: {presetForm.courtCount}</p>
                            <button onClick={() => { if(presetForm.courtCount>1){const fn=[...presetForm.fieldNames];fn.pop();const ft=[...presetForm.fieldTypes];ft.pop();setPresetForm(p=>({...p,courtCount:p.courtCount-1,fieldNames:fn,fieldTypes:ft}));} }} className="p-2 rounded-lg bg-slate-100"><Icon.Minus size={13}/></button>
                            <button onClick={() => { if(presetForm.courtCount<6){const fn=[...presetForm.fieldNames,`${presetForm.courtCount+1}구장`];const ft=[...presetForm.fieldTypes,'6vs6'];setPresetForm(p=>({...p,courtCount:p.courtCount+1,fieldNames:fn,fieldTypes:ft}));} }} className="p-2 rounded-lg bg-slate-100"><Icon.Plus size={13}/></button>
                        </div>
                        {presetForm.fieldNames.map((name,i) => (
                            <div key={i} className="flex gap-2">
                                <input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black" style={{userSelect:'text'}} value={name}
                                    onChange={e => { const fn=[...presetForm.fieldNames];fn[i]=e.target.value;setPresetForm(p=>({...p,fieldNames:fn})); }}/>
                                <select className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-black" value={presetForm.fieldTypes[i]}
                                    onChange={e => { const ft=[...presetForm.fieldTypes];ft[i]=e.target.value;setPresetForm(p=>({...p,fieldTypes:ft})); }}>
                                    <option value="6vs6">6vs6</option><option value="5vs5">5vs5</option>
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsPresetModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                        <button onClick={matchSavePreset} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm">저장</button>
                    </div>
                </div>
            </div>
        )}

        {/* ===== 알림/확인 모달 ===== */}
        {alertModal.show && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:70}}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in">
                    <h3 className="font-black text-lg text-slate-800 mb-2">{alertModal.title}</h3>
                    <p className="text-sm text-slate-500 whitespace-pre-line mb-5">{alertModal.content}</p>
                    <div className="flex gap-2">
                        {alertModal.type==='confirm'&&<button onClick={()=>setAlertModal(p=>({...p,show:false}))} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>}
                        <button onClick={()=>{if(alertModal.onConfirm)alertModal.onConfirm();setAlertModal(p=>({...p,show:false}));}} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm">
                            {alertModal.type==='confirm'?'확인':'닫기'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 인앱 QR 스캐너 */}
        <QRScannerModal
            isOpen={isQRScannerOpen}
            onScan={handleInAppQRScan}
            onClose={()=>setIsQRScannerOpen(false)}
        />

        {/* ===== 출석 체크 모달 (관리자) ===== */}
        {attendModal.type==='checkin' && attendModal.data && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={()=>setAttendModal({type:null,data:null})}>
                <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <h2 className="text-2xl font-black text-slate-800 text-center mb-2">{attendModal.data.name}</h2>
                    <p className="text-xs text-center text-slate-400 mb-6">{attendModal.data.gender}</p>
                    {attendModal.data.checkedIn
                        ? <div>
                            <div className="text-center mb-4">
                                <p className="text-emerald-500 font-black text-xl">✓ 출석 완료</p>
                                <p className="text-slate-400 text-sm mt-1">{attendModal.data.checkInTime} · <span className={`font-black ${attendModal.data.status==='지각'?'text-orange-400':'text-emerald-500'}`}>{attendModal.data.status}</span></p>
                            </div>
                            {attendModal.data.teamIdx !== undefined && attendModal.data.jerseyNumber && (
                                <div className={`rounded-2xl p-4 flex items-center gap-4 mb-4 ${getTeamBadge(attendModal.data.teamIdx)} text-white`}>
                                    <span className="text-4xl font-black leading-none" style={{minWidth:'2.5rem',textAlign:'center'}}>{attendModal.data.jerseyNumber}</span>
                                    <div>
                                        <p className="font-black text-base leading-tight">{attendModal.data.teamName}팀 {attendModal.data.jerseyNumber}번</p>
                                        <p className="text-sm opacity-80 mt-0.5">{getTeamColorName(attendModal.data.teamIdx)} 조끼</p>
                                    </div>
                                </div>
                            )}
                            <button onClick={()=>attendHandleUncheckIn(attendModal.data)} className="w-full py-3 bg-red-50 text-red-500 border border-red-200 rounded-2xl font-black text-sm">출석 취소</button>
                          </div>
                        : <button onClick={()=>attendHandleCheckIn(attendModal.data)} className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black text-lg shadow-lg">출석 체크</button>
                    }
                    <button onClick={()=>setAttendModal({type:null,data:null})} className="w-full py-3 text-slate-400 text-sm mt-3">닫기</button>
                </div>
            </div>
        )}

        {/* ===== 게스트 추가 모달 (관리자) ===== */}
        {isAttendGuestModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setIsAttendGuestModalOpen(false)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <h2 className="text-xl font-black text-slate-800 mb-4">게스트 추가</h2>
                    <div className="space-y-3">
                        <input type="text" placeholder="이름" style={{userSelect:'text'}} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                            value={attendNewGuest.name} onChange={e=>setAttendNewGuest(p=>({...p,name:e.target.value}))} />
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                            value={attendNewGuest.gender} onChange={e=>setAttendNewGuest(p=>({...p,gender:e.target.value}))}>
                            <option value="남성">남성</option><option value="여성">여성</option>
                        </select>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                            value={attendNewGuest.inviterId} onChange={e=>setAttendNewGuest(p=>({...p,inviterId:e.target.value}))}>
                            <option value="">초대자 없음</option>
                            {[...activeMembers].sort((a,b)=>a.name.localeCompare(b.name)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                            value={attendNewGuest.level} onChange={e=>setAttendNewGuest(p=>({...p,level:e.target.value}))}>
                            {[1,2,3,4,5,6].map(l=><option key={l} value={String(l)}>Lv.{l}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={()=>setIsAttendGuestModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                        <button onClick={attendHandleAddGuest} disabled={attendIsPending} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm disabled:opacity-50">추가</button>
                    </div>
                </div>
            </div>
        )}

        {/* ===== 기록 상태 편집 모달 ===== */}
        {historyEditTarget && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50" onClick={()=>setHistoryEditTarget(null)}>
                <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <p className="font-black text-slate-800 mb-4 text-center">출석 상태 변경</p>
                    <div className="grid grid-cols-2 gap-2">
                        {['정상','지각','노쇼','대기'].map(status => (
                            <button key={status} onClick={()=>handleHistoryStatusUpdate(status)}
                                className="py-3 rounded-2xl font-black text-sm border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition-all">
                                {status}
                            </button>
                        ))}
                    </div>
                    <button onClick={()=>setHistoryEditTarget(null)} className="w-full py-3 text-slate-400 text-sm mt-3">취소</button>
                </div>
            </div>
        )}

        {/* ===== QR 코드 생성 모달 (관리자) ===== */}
        {isQRGenModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setIsQRGenModalOpen(false)}>
                <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center" onClick={e=>e.stopPropagation()}>
                    <h2 className="text-xl font-black text-slate-800 mb-1">QR 출석 코드</h2>
                    <p className="text-xs text-slate-400 mb-2">{meetingSettings?.date} · {meetingSettings?.start}~{meetingSettings?.end}</p>
                    <p className="text-[10px] text-teal-500 font-black mb-5">모임 시간 내에만 유효합니다</p>
                    <div id="attend-qr-canvas" className="flex justify-center mb-5"></div>
                    <p className="text-xs text-slate-400 mb-4">회원에게 이 화면을 보여주세요.<br/>카메라로 스캔하면 출석됩니다.</p>
                    <button onClick={()=>setIsQRGenModalOpen(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">닫기</button>
                </div>
            </div>
        )}

        {/* ===== 지도 장소 선택 모달 ===== */}
        <LocationPickerModal
            isOpen={isLocationPickerOpen}
            onClose={() => setIsLocationPickerOpen(false)}
            initialLat={meetingSettings?.locationLat}
            initialLng={meetingSettings?.locationLng}
            initialName={meetingSettings?.location}
            onConfirm={({ name, lat, lng }) => {
                updateMeetingSettingsAdmin({...meetingSettings, location:name, locationLat:lat, locationLng:lng});
                setIsLocationPickerOpen(false);
            }}
        />
    </>
);
// ─────────────────────────────────────────────────────────────────────────────
