function DirectoryTab({ members, activeMembers, resignedMembers, setEditingMember, setResigningMember, setResignForm, handleRestoreResigned, setDeletingMember }) {
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">활동 회원 {activeMembers.length}명</p>
            </div>
            <div className="space-y-2">
                {activeMembers.sort((a,b)=>a.name.localeCompare(b.name)).map(m=>(
                    <div key={m.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-800">{m.name}</span>
                                {m.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                {m.kakaoId&&<span title="카카오 연동" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,background:'#FEE500',borderRadius:4}}><svg width="10" height="10" viewBox="0 0 18 18" fill="none"><path d="M9 1C4.582 1 1 3.896 1 7.444c0 2.292 1.522 4.305 3.824 5.441L3.9 16.1a.3.3 0 0 0 .438.327L8.1 14.04c.296.03.597.046.9.046 4.418 0 8-2.896 8-6.442C17 3.896 13.418 1 9 1z" fill="#3C1E1E"/></svg></span>}
                                {STAFF_ROLES.includes(m.role)&&<span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${getRoleBadgeClass(m.role)}`}>{m.role}</span>}
                                {m.coupleId&&<span className="text-[10px] font-black text-teal-500 flex items-center gap-0.5"><Icon.Heart size={9}/>{members.find(p=>p.id===m.coupleId)?.name||'?'}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${getLevelColor(m.level)}`}>Lv.{m.level}</span>
                                <span className="text-[10px] text-slate-400">{formatBirth(m.birth)}</span>
                                {m.position&&m.position!=='all'&&<span className="text-[10px] text-slate-400">{m.position}</span>}
                                {m.address&&<span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Icon.MapPin size={10}/>{m.address}</span>}
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
                            <button onClick={()=>setEditingMember({...m})} className="p-2 rounded-xl bg-blue-50 text-blue-500"><Icon.Edit size={14}/></button>
                            <button onClick={()=>{setResigningMember(m);setResignForm({date:'',reason:'',isForced:false});}} className="p-2 rounded-xl bg-red-50 text-red-400"><Icon.Trash size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>
            {resignedMembers.length>0&&(
                <div className="mt-6">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">탈퇴 회원 {resignedMembers.length}명</p>
                    {resignedMembers.sort((a,b)=>a.name.localeCompare(b.name)).map(m=>(
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-1.5">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-slate-400 text-sm">{m.name}</span>
                                    <span className="text-[10px] text-slate-400">{m.resignDate}</span>
                                    {m.isForcedResign&&<span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-500 rounded-lg font-black">강제탈퇴</span>}
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
    );
}

function AddMemberModal({ isOpen, onClose, newMember, setNewMember, activeMembers, handleAddMember }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
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
                            <input type={f.type} placeholder={f.placeholder||''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                value={f.fmt?f.fmt(newMember[f.key]||''):newMember[f.key]||''} onChange={e=>setNewMember(p=>({...p,[f.key]:f.fmt?f.fmt(e.target.value):e.target.value}))}/>
                        </div>
                    ))}
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1">가입일</p>
                        <input type="date" className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black ${newMember.isFounder?'opacity-30':''}`}
                            disabled={!!newMember.isFounder} value={newMember.joinDate||''} onChange={e=>setNewMember(p=>({...p,joinDate:e.target.value}))}/>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer" style={{userSelect:'none'}}>
                            <input type="checkbox" className="w-4 h-4 accent-amber-500"
                                checked={!!newMember.isFounder}
                                onChange={e=>setNewMember(p=>({...p,isFounder:e.target.checked,joinDate:e.target.checked?'':p.joinDate}))}/>
                            <span className="text-xs font-black text-amber-600">원년 멤버 (OTP FC 창단 멤버)</span>
                        </label>
                    </div>
                    {[
                        {label:'성별',key:'gender',opts:['남성','여성']},
                        {label:'역할',key:'role',opts:['회원',...STAFF_ROLES]},
                        {label:'레벨',key:'level',opts:['1','2','3','4','5','6','7','8','9','10','11','12']},
                        {label:'포지션',key:'position',opts:['all','피보','아라','픽소','골레이로']},
                    ].map(f=>(
                        <div key={f.key}>
                            <p className="text-xs font-black text-slate-500 mb-1">{f.label}</p>
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                                value={newMember[f.key]} onChange={e=>setNewMember(p=>({...p,[f.key]:e.target.value}))}>
                                {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    ))}
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1">커플 연결</p>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                            value={newMember.coupleId} onChange={e=>setNewMember(p=>({...p,coupleId:e.target.value}))}>
                            <option value="">없음</option>
                            {activeMembers.map(m=><option key={m.id} value={m.id}>{m.name}{m.gender==='여성'?' (W)':''}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2 mt-5">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    <button onClick={handleAddMember} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm">등록</button>
                </div>
            </div>
        </div>
    );
}

function EditMemberModal({ editingMember, setEditingMember, activeMembers, handleUpdateMember }) {
    if (!editingMember) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setEditingMember(null)}>
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
                            <input type={f.type} placeholder={f.placeholder||''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                value={f.fmt?f.fmt(editingMember[f.key]||''):editingMember[f.key]||''} onChange={e=>setEditingMember(p=>({...p,[f.key]:f.fmt?f.fmt(e.target.value):e.target.value}))}/>
                        </div>
                    ))}
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1">가입일</p>
                        <input type="date" className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black ${editingMember.isFounder?'opacity-30':''}`}
                            disabled={!!editingMember.isFounder} value={editingMember.joinDate||''} onChange={e=>setEditingMember(p=>({...p,joinDate:e.target.value}))}/>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer" style={{userSelect:'none'}}>
                            <input type="checkbox" className="w-4 h-4 accent-amber-500"
                                checked={!!editingMember.isFounder}
                                onChange={e=>setEditingMember(p=>({...p,isFounder:e.target.checked,joinDate:e.target.checked?'':p.joinDate}))}/>
                            <span className="text-xs font-black text-amber-600">원년 멤버 (OTP FC 창단 멤버)</span>
                        </label>
                    </div>
                    {[
                        {label:'성별',key:'gender',opts:['남성','여성']},
                        {label:'역할',key:'role',opts:['회원',...STAFF_ROLES]},
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
    );
}

function DeleteMemberModal({ deletingMember, setDeletingMember, handleDeleteMember }) {
    const { useState } = React;
    const [confirmName, setConfirmName] = useState('');
    if (!deletingMember) return null;
    const isMatch = confirmName === deletingMember.name;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>{setDeletingMember(null);setConfirmName('');}}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-red-600 mb-1">회원 완전 삭제</h2>
                <p className="text-sm text-slate-500 mb-1">{deletingMember.name}</p>
                <p className="text-xs text-red-500 font-black mb-4">⚠ 이 작업은 되돌릴 수 없습니다.</p>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                    <p className="text-xs text-slate-600">Firestore에서 회원 정보가 영구 삭제됩니다.<br/>출석 기록은 그대로 남습니다.</p>
                </div>
                <div>
                    <p className="text-xs font-black text-slate-500 mb-1">확인을 위해 회원 이름을 입력하세요</p>
                    <input type="text" placeholder={deletingMember.name} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                        value={confirmName} onChange={e=>setConfirmName(e.target.value)}/>
                </div>
                <div className="flex gap-2 mt-5">
                    <button onClick={()=>{setDeletingMember(null);setConfirmName('');}} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    <button onClick={()=>{if(isMatch)handleDeleteMember();}} disabled={!isMatch}
                        className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all ${isMatch?'bg-red-500 text-white':'bg-red-100 text-red-300 cursor-not-allowed'}`}>
                        영구 삭제
                    </button>
                </div>
            </div>
        </div>
    );
}

function ResignModal({ resigningMember, setResigningMember, resignForm, setResignForm, handleResignConfirm }) {
    if (!resigningMember) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setResigningMember(null)}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-slate-800 mb-1">탈퇴 처리</h2>
                <p className="text-sm text-slate-500 mb-4">{resigningMember.name}</p>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1">탈퇴 일자</p>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                            value={resignForm.date} onChange={e=>setResignForm(p=>({...p,date:e.target.value}))}/>
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1">사유</p>
                        <input type="text" placeholder="선택 사항" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                            value={resignForm.reason} onChange={e=>setResignForm(p=>({...p,reason:e.target.value}))}/>
                    </div>
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
    );
}
