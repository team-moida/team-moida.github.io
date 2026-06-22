// ========= makeCheckInHandlers =========
const makeCheckInHandlers = ({ testMode, activeParticipants, meetingTimes, showAlert, showConfirm, setModal }) => {
    const handleCheckIn = async (participant) => {
        if (participant.date !== meetingTimes.date) {
            return showAlert('오류', `날짜 불일치 (${participant.date} ≠ ${meetingTimes.date})\n새로고침 후 다시 시도해주세요.`);
        }
        const limit = testMode ? activeParticipants.length : (meetingTimes.maxLimit || 18);
        const rank = activeParticipants.findIndex(p => p.id === participant.id) + 1;
        if (!testMode && rank > limit) return showAlert('대기자 안내',`선착순(${limit}명) 마감되었습니다.`);
        const now = new Date();
        const [sy,sm,sd] = participant.date.split('-');
        const [shr,smin] = (meetingTimes.start||'08:00').split(':');
        const [ehr,emin] = (meetingTimes.end||'10:00').split(':');
        const meetingStart = new Date(sy,sm-1,sd,parseInt(shr),parseInt(smin),0);
        const meetingEnd   = new Date(sy,sm-1,sd,parseInt(ehr),parseInt(emin),0);
        const allowFrom = new Date(meetingStart.getTime() - 70*60*1000);
        if (!testMode && now < allowFrom) {
            const allowFromStr = allowFrom.toLocaleTimeString('ko-KR',{hour12:false,hour:'2-digit',minute:'2-digit'});
            return showAlert('출석 불가',`출석 가능 시간: ${participant.date} ${allowFromStr}~${meetingTimes.end}`);
        }
        if (!testMode && now > meetingEnd) {
            return showAlert('출석 불가','모임이 종료되었습니다.\n자동 노쇼 처리되었습니다.');
        }
        // 정상: start-70분~start-9분(07:51) / 지각: 07:51:01~종료 (+1분 여유)
        const normalThreshold = new Date(meetingStart.getTime() - 9*60*1000);
        const finalStatus = now <= normalThreshold ? '정상' : '지각';
        const timeStr = now.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
        try {
            await getSessionCol().doc(participant.id).update({ checkedIn:true, checkInTime:timeStr, status:finalStatus });
            setModal({type:'checkin', data:{...participant, checkedIn:true, checkInTime:timeStr, status:finalStatus}});
        } catch(e) { showAlert('오류','출석 실패'); }
    };

    const handleUncheckIn = async (participant) => {
        showConfirm('출석 취소', `${participant.name}의 출석을 취소하시겠습니까?`, async () => {
            try {
                await getSessionCol().doc(participant.id).update({ checkedIn:false, checkInTime:null, status:'미출석' });
                setModal({type:null,data:null});
            } catch(e) { showAlert('오류','출석 취소 실패'); }
        });
    };

    return { handleCheckIn, handleUncheckIn };
};

// ========= CheckInModal =========
const CheckInModal = ({ modal, setModal, handleCheckIn, handleUncheckIn }) => {
    if (modal.type !== 'checkin' || !modal.data) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={()=>setModal({type:null,data:null})}>
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-zoom-in" onClick={e=>e.stopPropagation()}>
                <h2 className="text-2xl font-black text-slate-800 text-center mb-2">{modal.data.name}</h2>
                <p className="text-xs text-center text-slate-400 mb-6">{modal.data.gender}</p>
                {modal.data.checkedIn
                    ? <div>
                        <div className="text-center mb-4">
                            <p className="text-emerald-500 font-black text-xl flex items-center justify-center gap-1.5"><Icon.Check size={20}/>출석 완료</p>
                            <p className="text-slate-400 text-sm mt-1">{modal.data.checkInTime} · <span className={`font-black ${modal.data.status==='지각'?'text-orange-400':'text-emerald-500'}`}>{modal.data.status}</span></p>
                        </div>
                        {modal.data.teamIdx !== undefined && modal.data.jerseyNumber && (
                            <div className={`rounded-2xl p-4 flex items-center gap-4 mb-4 ${getTeamBadgeColor(modal.data.teamIdx)}`}>
                                <span className="text-4xl font-black leading-none" style={{minWidth:'2.5rem',textAlign:'center'}}>{modal.data.jerseyNumber}</span>
                                <div>
                                    <p className="font-black text-base leading-tight">{modal.data.teamName}팀 {modal.data.jerseyNumber}번</p>
                                    <p className="text-sm opacity-80 mt-0.5">{getTeamColorName(modal.data.teamIdx)} 조끼</p>
                                </div>
                            </div>
                        )}
                        <button onClick={()=>handleUncheckIn(modal.data)} className="w-full py-3 bg-red-50 text-red-500 border border-red-200 rounded-2xl font-black text-sm">출석 취소</button>
                      </div>
                    : <button onClick={()=>handleCheckIn(modal.data)} className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black text-lg shadow-lg">출석 체크</button>
                }
                <button onClick={()=>setModal({type:null,data:null})} className="w-full py-3 text-slate-400 text-sm mt-3">닫기</button>
            </div>
        </div>
    );
};

// ========= makeNotifHandlers =========
const makeNotifHandlers = ({ loggedInManager, notifTitle, notifBody, editingNotifId, editTitle, editBody,
                              notifTargetMode, selectedNotifMemberIds,
                              showAlert, showConfirm, setNotifSending, setIsNotifModalOpen,
                              setNotifTitle, setNotifBody, setEditingNotifId, setEditTitle, setEditBody,
                              setNotifTargetMode, setSelectedNotifMemberIds }) => {
    const startEditNotif = (n) => { setEditingNotifId(n.id); setEditTitle(n.title || ''); setEditBody(n.body || ''); };
    const cancelEditNotif = () => setEditingNotifId(null);
    const saveEditNotif = async () => {
        if (!editTitle.trim() || !editBody.trim()) return;
        try {
            await getCol('notifications').doc(editingNotifId).update({ title: editTitle.trim(), body: editBody.trim() });
            setEditingNotifId(null);
        } catch(e) { showAlert('오류', '수정 실패'); }
    };
    const deleteNotif = (id) => {
        showConfirm('공지 삭제', '이 공지를 삭제하시겠습니까?', async () => {
            try { await getCol('notifications').doc(id).delete(); } catch(e) {}
        });
    };
    const sendPushNotification = async () => {
        if (!notifTitle.trim() || !notifBody.trim()) return showAlert('입력 오류', '제목과 내용을 모두 입력해주세요.');
        if (notifTargetMode === 'select' && selectedNotifMemberIds.length === 0)
            return showAlert('입력 오류', '대상 회원을 1명 이상 선택해주세요.');
        setNotifSending(true);
        try {
            const notifDoc = {
                title: notifTitle.trim(),
                body: notifBody.trim(),
                sentAt: new Date().toISOString(),
                sentBy: loggedInManager?.name || '관리자',
            };
            if (notifTargetMode === 'select') {
                notifDoc.targetMemberIds = selectedNotifMemberIds;
            }
            await getCol('notifications').add(notifDoc);
            setIsNotifModalOpen(false);
            setNotifTitle('');
            setNotifBody('');
            setNotifTargetMode('all');
            setSelectedNotifMemberIds([]);
            const resultMsg = notifTargetMode === 'select'
                ? `${selectedNotifMemberIds.length}명에게 푸시 알림이 전송되었습니다.`
                : '푸시 알림이 전송되었습니다.';
            showAlert('발송 완료', resultMsg);
        } catch(e) {
            showAlert('오류', '알림 발송 실패: ' + e.message);
        } finally {
            setNotifSending(false);
        }
    };
    return { sendPushNotification, startEditNotif, cancelEditNotif, saveEditNotif, deleteNotif };
};

// ========= NotifModal =========
const NotifModal = ({ isOpen, onClose, fcmTokenCount, notifTitle, setNotifTitle, notifBody, setNotifBody,
                      notifSending, onSend, notifHistory, editingNotifId,
                      editTitle, setEditTitle, editBody, setEditBody,
                      onStartEdit, onCancelEdit, onSaveEdit, onDeleteNotif,
                      notifTargetMode, setNotifTargetMode, selectedNotifMemberIds, setSelectedNotifMemberIds, activeMembers }) => {
    if (!isOpen) return null;
    const sortedMembers = (activeMembers || []).slice().sort((a,b)=>a.name.localeCompare(b.name));
    const allSelected = sortedMembers.length > 0 && selectedNotifMemberIds.length === sortedMembers.length;
    const canSend = notifTargetMode === 'all'
        ? (notifTitle.trim() && notifBody.trim())
        : (notifTitle.trim() && notifBody.trim() && selectedNotifMemberIds.length > 0);
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col" style={{maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-black text-slate-800">공지 발송</h2>
                    {fcmTokenCount !== null && (
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${fcmTokenCount>0?'bg-emerald-50 text-emerald-500':'bg-slate-100 text-slate-400'}`}>
                            <Icon.Smartphone size={12}/>{fcmTokenCount}기기 등록
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-400 mb-4">
                    {notifTargetMode === 'all' ? '알림을 허용한 모든 회원에게 전송됩니다' : `${selectedNotifMemberIds.length}명 선택됨`}
                </p>
                <div className="space-y-3 mb-4">
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1 ml-1">제목</p>
                        <input type="text" value={notifTitle} onChange={e=>setNotifTitle(e.target.value)}
                            placeholder="예: 팀 편성 완료!" maxLength={50} style={{userSelect:'text'}}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:border-teal-400 outline-none" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1 ml-1">내용</p>
                        <textarea value={notifBody} onChange={e=>setNotifBody(e.target.value)}
                            placeholder="예: 이번 주 팀 편성이 완료됐어요. 회원 앱에서 확인하세요!"
                            maxLength={200} rows={3} style={{userSelect:'text', resize:'none'}}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 focus:border-teal-400 outline-none" />
                    </div>
                </div>
                {/* 발송 대상 선택 */}
                <div className="mb-4">
                    <p className="text-xs font-black text-slate-500 mb-2 ml-1">발송 대상</p>
                    <div className="flex gap-2 mb-3">
                        <button onClick={()=>setNotifTargetMode('all')}
                            className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${notifTargetMode==='all'?'bg-teal-500 text-white':'bg-slate-100 text-slate-500'}`}>
                            전체
                        </button>
                        <button onClick={()=>setNotifTargetMode('select')}
                            className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${notifTargetMode==='select'?'bg-teal-500 text-white':'bg-slate-100 text-slate-500'}`}>
                            직접 선택
                        </button>
                    </div>
                    {notifTargetMode === 'select' && (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                <span className="text-xs font-black text-slate-500">{selectedNotifMemberIds.length}명 선택</span>
                                <button onClick={()=>{ if(allSelected) setSelectedNotifMemberIds([]); else setSelectedNotifMemberIds(sortedMembers.map(m=>m.id)); }}
                                    className="text-xs font-black text-teal-500">
                                    {allSelected ? '전체 해제' : '전체 선택'}
                                </button>
                            </div>
                            <div className="overflow-y-auto" style={{maxHeight:'160px'}}>
                                {sortedMembers.map(m => (
                                    <label key={m.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 last:border-0 cursor-pointer active:bg-slate-50">
                                        <input type="checkbox" className="w-4 h-4 accent-teal-500"
                                            checked={selectedNotifMemberIds.includes(m.id)}
                                            onChange={e=>{ if(e.target.checked) setSelectedNotifMemberIds(p=>[...p,m.id]); else setSelectedNotifMemberIds(p=>p.filter(id=>id!==m.id)); }}/>
                                        <span className="text-sm font-black text-slate-700 flex-1">{m.name}</span>
                                        {m.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 mb-5">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    <button onClick={onSend} disabled={notifSending || !canSend}
                        className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm disabled:opacity-50">
                        {notifSending ? '발송 중...' : '발송'}
                    </button>
                </div>
                {notifHistory.length > 0 && (
                    <div className="border-t border-slate-100 pt-4 overflow-y-auto flex-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">발송 기록</p>
                        <div className="space-y-3">
                            {notifHistory.map(n => (
                                <div key={n.id} className="pb-3 border-b border-slate-50 last:pb-0 last:border-0">
                                    {editingNotifId === n.id ? (
                                        <div className="space-y-2">
                                            <input type="text" value={editTitle} onChange={e=>setEditTitle(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black"
                                                style={{userSelect:'text'}}/>
                                            <textarea value={editBody} onChange={e=>setEditBody(e.target.value)} rows={3}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none leading-relaxed"
                                                style={{userSelect:'text'}}/>
                                            <div className="flex gap-2">
                                                <button onClick={onCancelEdit} className="flex-1 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-xs">취소</button>
                                                <button onClick={onSaveEdit} disabled={!editTitle.trim()||!editBody.trim()} className="flex-1 py-2 bg-teal-500 text-white rounded-xl font-black text-xs disabled:opacity-40">저장</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start gap-2 mb-0.5">
                                                <span className="font-black text-sm text-slate-700 flex-1">{n.title}</span>
                                                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                                    <span className="text-[10px] text-slate-400">
                                                        {n.sentAt ? new Date(n.sentAt).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}) : ''}
                                                    </span>
                                                    <button onClick={()=>onStartEdit(n)} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 active:bg-slate-200">
                                                        <Icon.Edit2 size={11}/>
                                                    </button>
                                                    <button onClick={()=>onDeleteNotif(n.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400 active:bg-red-100">
                                                        <Icon.Trash size={11}/>
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{n.body}</p>
                                            {n.sentBy && <p className="text-[10px] text-slate-400 mt-1">{n.sentBy}</p>}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ========= GuestModal =========
const GuestModal = ({ isOpen, onClose, newGuest, setNewGuest, onAdd, activeMembers, isPending }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-slate-800 mb-4">게스트 추가</h2>
                <div className="space-y-3">
                    <input type="text" placeholder="이름" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                        value={newGuest.name} onChange={e=>setNewGuest(p=>({...p,name:e.target.value}))} />
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                        value={newGuest.gender} onChange={e=>setNewGuest(p=>({...p,gender:e.target.value}))}>
                        <option value="남성">남성</option><option value="여성">여성</option>
                    </select>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                        value={newGuest.inviterId} onChange={e=>setNewGuest(p=>({...p,inviterId:e.target.value}))}>
                        <option value="">초대자 없음</option>
                        {activeMembers.sort((a,b)=>a.name.localeCompare(b.name)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                        value={newGuest.level} onChange={e=>setNewGuest(p=>({...p,level:e.target.value}))}>
                        {[1,2,3,4,5,6].map(l=><option key={l} value={String(l)}>Lv.{l}</option>)}
                    </select>
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    <button onClick={onAdd} disabled={isPending} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm">추가</button>
                </div>
            </div>
        </div>
    );
};

// ========= HistoryEditModal =========
const HistoryEditModal = ({ target, onClose, onUpdate }) => {
    if (!target) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                <p className="font-black text-slate-800 mb-4 text-center">출석 상태 변경</p>
                <div className="grid grid-cols-2 gap-2">
                    {['정상','지각','노쇼','대기'].map(status => (
                        <button key={status} onClick={()=>onUpdate(status)}
                            className="py-3 rounded-2xl font-black text-sm border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition-all">
                            {status}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="w-full py-3 text-slate-400 text-sm mt-3">취소</button>
            </div>
        </div>
    );
};

// ========= AlertModal =========
const AlertModal = ({ alertModal, setAlertModal }) => {
    if (!alertModal.show) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-zoom-in">
                <h3 className="font-black text-lg text-slate-800 mb-2">{alertModal.title}</h3>
                <p className="text-sm text-slate-500 whitespace-pre-line mb-5">{alertModal.content}</p>
                <div className="flex gap-2">
                    {alertModal.type==='confirm' && (
                        <button onClick={()=>setAlertModal(p=>({...p,show:false}))} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    )}
                    <button onClick={()=>{ if(alertModal.onConfirm)alertModal.onConfirm(); setAlertModal(p=>({...p,show:false})); }}
                        className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm">
                        {alertModal.type==='confirm'?'확인':'닫기'}
                    </button>
                </div>
            </div>
        </div>
    );
};
