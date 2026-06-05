const makePendingHandlers = ({ loggedInManager, showConfirm, showAlert }) => {
    const handleApprovePending = async (pending) => {
        showConfirm('가입 승인', `${pending.name}님을 회원으로 승인하시겠습니까?`, async () => {
            try {
                const newMemberRef = getMemberCol().doc();
                await newMemberRef.set({
                    name: pending.name, birth: pending.birth, phone: pending.phone,
                    area: pending.area, gender: pending.gender || '남성',
                    role: '회원', level: '4', position: 'all',
                    membershipType: 'monthly', isResigned: false,
                    createdAt: new Date().toISOString(), approvedAt: new Date().toISOString(),
                    approvedBy: loggedInManager?.name || '관리자'
                });
                await getPendingCol().doc(pending.id).update({ status: 'approved', approvedMemberId: newMemberRef.id });
                showAlert('승인 완료', `${pending.name}님이 회원으로 등록되었습니다.`);
            } catch(e) { showAlert('오류', '승인 처리 실패'); }
        });
    };

    const handleRejectPending = async (pending) => {
        showConfirm('가입 거절', `${pending.name}님의 가입 신청을 거절하시겠습니까?`, async () => {
            try {
                await getPendingCol().doc(pending.id).update({ status: 'rejected' });
                showAlert('처리 완료', '거절 처리되었습니다.');
            } catch(e) { showAlert('오류', '거절 처리 실패'); }
        });
    };

    return { handleApprovePending, handleRejectPending };
};

const PendingModal = ({ isOpen, onClose, pendingRegistrations, onApprove, onReject }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-slate-800 mb-4">가입 신청 ({pendingRegistrations.length})</h2>
                {pendingRegistrations.length === 0
                    ? <p className="text-center text-slate-400 py-6">신청 내역이 없습니다</p>
                    : pendingRegistrations.map(p => (
                        <div key={p.id} className="bg-slate-50 rounded-2xl p-4 mb-3 border border-slate-100">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="font-black text-slate-800">{p.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{p.birth} · {p.gender}</p>
                                    <p className="text-xs text-slate-400">{p.phone}</p>
                                    <p className="text-xs text-slate-400">{p.area}</p>
                                </div>
                                <p className="text-[10px] text-slate-400">{p.createdAt?.slice(0,10)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={()=>onReject(p)} className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-xl font-black text-xs">거절</button>
                                <button onClick={()=>onApprove(p)} className="flex-1 py-2 bg-teal-500 text-white rounded-xl font-black text-xs">승인</button>
                            </div>
                        </div>
                    ))
                }
                <button onClick={onClose} className="w-full py-3 text-slate-400 text-sm mt-2">닫기</button>
            </div>
        </div>
    );
};
