// ─── 공지 작성/수정 모달 ─────────────────────────────────────────────────────
function AnnouncementModal({ announcementModal, setAnnouncementModal, handleSaveAnnouncement, activeMembers, monthlyStatuses, monthlyReasons, targetMonth, meetingParticipants }) {
    const { useState, useEffect } = React;
    const [form, setForm] = useState({ title: '', body: '', category: '공지' });
    const [isSaving, setIsSaving] = useState(false);
    const [targetMode, setTargetMode] = useState('all');
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);

    useEffect(() => {
        if (announcementModal?.open) {
            setForm({ title: announcementModal.data?.title || '', body: announcementModal.data?.body || '', category: announcementModal.data?.category || '공지' });
            setTargetMode('all');
            setSelectedMemberIds([]);
        }
    }, [announcementModal?.open]);

    if (!announcementModal?.open) return null;
    const close = () => setAnnouncementModal({ open: false, mode: 'add', data: null });
    const isAdd = announcementModal.mode === 'add';
    const sortedMembers = (activeMembers || []).slice().sort((a,b) => a.name.localeCompare(b.name));
    const allSelected = sortedMembers.length > 0 && selectedMemberIds.length === sortedMembers.length;
    const canSend = form.title.trim() && (form.category === '일반' || targetMode === 'all' || selectedMemberIds.length > 0);
    const autoSelectEligible = () => {
        const eligible = sortedMembers.filter(m =>
            joinedByMonth(m, targetMonth) &&
            ['staff','monthly','half','full'].includes(getMemberStatusType(m, monthlyStatuses || {}, monthlyReasons || {}, targetMonth))
        );
        setSelectedMemberIds(eligible.map(m => m.id));
    };
    const participantIds = (meetingParticipants || []).map(p => p.memberId).filter(id => sortedMembers.some(m => m.id === id));
    const autoSelectParticipants = () => {
        setSelectedMemberIds(participantIds);
    };

    const handleSave = async () => {
        if (!canSend) return;
        setIsSaving(true);
        try {
            await handleSaveAnnouncement({ ...form, id: announcementModal.data?.id, mode: announcementModal.mode, targetMode, selectedMemberIds });
            close();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:60}} onClick={close}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col" style={{maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-slate-800 mb-4">{isAdd ? '공지 작성' : '공지 수정'}</h2>
                <div className="space-y-3 mb-3">
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1">분류</p>
                        <div className="flex gap-2">
                            {[['공지','bg-teal-500'],['일반','bg-slate-500'],['모임','bg-emerald-500'],['중요','bg-red-500']].map(([cat,activeBg]) => (
                                <button key={cat} onClick={()=>setForm(p=>({...p,category:cat}))}
                                    className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${form.category===cat?`${activeBg} text-white`:'bg-slate-100 text-slate-500'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1">제목</p>
                        <input type="text" style={{userSelect:'text'}} placeholder="제목 입력"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                            value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/>
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-500 mb-1">내용</p>
                        <textarea style={{userSelect:'text'}} placeholder="내용 입력"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 leading-relaxed resize-none"
                            rows={4} value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))}/>
                    </div>
                </div>
                {isAdd && form.category !== '일반' && (
                    <div className="mb-3">
                        <p className="text-xs font-black text-slate-500 mb-2">발송 대상</p>
                        <div className="flex gap-2 mb-2">
                            <button onClick={()=>setTargetMode('all')}
                                className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${targetMode==='all'?'bg-teal-500 text-white':'bg-slate-100 text-slate-500'}`}>
                                전체
                            </button>
                            <button onClick={()=>setTargetMode('select')}
                                className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${targetMode==='select'?'bg-teal-500 text-white':'bg-slate-100 text-slate-500'}`}>
                                직접 선택
                            </button>
                        </div>
                        {targetMode === 'all' ? (
                            <p className="text-xs text-teal-600 font-black bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">알림을 허용한 모든 회원에게 발송됩니다</p>
                        ) : (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-xs font-black text-slate-500">{selectedMemberIds.length}명 선택</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={autoSelectEligible}
                                            className="text-xs font-black text-indigo-500">
                                            회비 자격자
                                        </button>
                                        <button onClick={autoSelectParticipants} disabled={participantIds.length === 0}
                                            className={`text-xs font-black ${participantIds.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-orange-500'}`}>
                                            {participantIds.length === 0 ? '참여자 없음' : '모임 참여자'}
                                        </button>
                                        <button onClick={()=>{ if(allSelected) setSelectedMemberIds([]); else setSelectedMemberIds(sortedMembers.map(m=>m.id)); }}
                                            className="text-xs font-black text-teal-500">
                                            {allSelected ? '전체 해제' : '전체 선택'}
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto" style={{maxHeight:'160px'}}>
                                    {sortedMembers.map(m => (
                                        <label key={m.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 last:border-0 cursor-pointer active:bg-slate-50">
                                            <input type="checkbox" className="w-4 h-4 accent-teal-500"
                                                checked={selectedMemberIds.includes(m.id)}
                                                onChange={e=>{ if(e.target.checked) setSelectedMemberIds(p=>[...p,m.id]); else setSelectedMemberIds(p=>p.filter(id=>id!==m.id)); }}/>
                                            <span className="text-sm font-black text-slate-700 flex-1">{m.name}</span>
                                            {m.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {isAdd && form.category === '일반' && (
                    <div className="mb-3">
                        <p className="text-xs font-black text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 leading-relaxed">🔕 일반 글은 알림 없이 게시판에만 올라가요.</p>
                    </div>
                )}
                <div className="flex gap-2 mt-2">
                    <button onClick={close} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                    <button onClick={handleSave} disabled={isSaving || !canSend}
                        className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all ${(isSaving||!canSend)?'bg-teal-200 text-white':'bg-teal-500 text-white'}`}>
                        {isSaving ? '저장 중...' : isAdd ? (form.category === '일반' ? '올리기' : '발송') : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── 회원 완전 삭제 모달 ─────────────────────────────────────────────────────
function DeleteMemberModal({ deletingMember, setDeletingMember, handleDeleteMember }) {
    const { useState } = React;
    const [confirmName, setConfirmName] = useState('');
    if (!deletingMember) return null;
    const isMatch = confirmName === deletingMember.name;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:60}} onClick={()=>{setDeletingMember(null);setConfirmName('');}}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-red-600 mb-1">회원 완전 삭제</h2>
                <p className="text-sm text-slate-500 mb-1">{deletingMember.name}</p>
                <p className="text-xs text-red-500 font-black mb-4 flex items-center gap-1"><Icon.AlertTriangle size={12} className="flex-shrink-0"/>이 작업은 되돌릴 수 없습니다.</p>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
                    <p className="text-xs text-slate-600">Firestore에서 회원 정보가 영구 삭제됩니다.<br/>출석 기록은 그대로 남습니다.</p>
                </div>
                <div>
                    <p className="text-xs font-black text-slate-500 mb-1">확인을 위해 회원 이름을 입력하세요</p>
                    <input type="text" style={{userSelect:'text'}} placeholder={deletingMember.name} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
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

// ─── 내 프로필 모달 ──────────────────────────────────────────────────────────
function ProfileModal({ isOpen, onClose, memberInfo, memberData, showAlert }) {
    const { useState, useEffect } = React;
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [profileImg, setProfileImg] = useState('');
    const [photoSaving, setPhotoSaving] = useState(false);
    const fileRef = React.useRef(null);

    useEffect(() => {
        if (isOpen && memberInfo) {
            setPhone(memberInfo.phone || '');
            setAddress(memberInfo.address || '');
            setProfileImg(memberInfo.profileImage || '');
            setEditing(false);
        }
    }, [isOpen, memberInfo?.id]);

    // 사진을 256x256 정사각으로 줄여 base64로 저장(별도 저장소 없이 회원 문서에 보관)
    const resizeToDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const SIZE = 256;
                const canvas = document.createElement('canvas');
                canvas.width = SIZE; canvas.height = SIZE;
                const s = Math.min(img.width, img.height);
                const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
                canvas.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, SIZE, SIZE);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = reject;
            img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handlePickPhoto = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setPhotoSaving(true);
        try {
            const dataUrl = await resizeToDataUrl(file);
            await getCol('members').doc(memberData.memberId).update({ profileImage: dataUrl });
            setProfileImg(dataUrl);
            showAlert('완료', '프로필 사진이 변경되었습니다.');
        } catch (err) { showAlert('오류', '사진 변경에 실패했습니다.'); }
        finally { setPhotoSaving(false); }
    };

    const handleResetPhoto = async () => {
        setPhotoSaving(true);
        try {
            await getCol('members').doc(memberData.memberId).update({ profileImage: '' });
            setProfileImg('');
        } catch (err) { showAlert('오류', '실패했습니다.'); }
        finally { setPhotoSaving(false); }
    };

    if (!isOpen || !memberInfo) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await getCol('members').doc(memberData.memberId).update({ phone: formatPhoneInput(phone), address });
            showAlert('완료', '프로필이 수정되었습니다.');
            onClose();
        } catch(e) { showAlert('오류', '저장 실패'); }
        finally { setSaving(false); }
    };

    const handleCancelEdit = () => {
        setPhone(memberInfo.phone || '');
        setAddress(memberInfo.address || '');
        setEditing(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:75}} onClick={onClose}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-black text-slate-800">내 프로필</h2>
                    <button onClick={onClose} className="text-slate-400 text-2xl leading-none">×</button>
                </div>
                {/* 프로필 사진 — 업로드(자동 축소 저장) / 기본(글자) */}
                <div className="flex flex-col items-center mb-5">
                    <div className="relative">
                        {(profileImg || memberInfo.kakaoProfileImage)
                            ? <img src={profileImg || memberInfo.kakaoProfileImage} alt="" className="w-20 h-20 rounded-full object-cover border border-slate-200"/>
                            : <div className="w-20 h-20 rounded-full bg-teal-500 text-white flex items-center justify-center font-black text-2xl">{(memberInfo.name||'').trim().slice(-1)||'?'}</div>}
                        <button onClick={()=>fileRef.current && fileRef.current.click()} disabled={photoSaving}
                            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-slate-500"><Icon.Camera size={14}/></button>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto}/>
                    <div className="flex items-center gap-2 mt-3">
                        <button onClick={()=>fileRef.current && fileRef.current.click()} disabled={photoSaving}
                            className="text-xs font-black px-3 py-1.5 rounded-lg bg-teal-50 text-teal-600 disabled:opacity-50">{photoSaving?'저장 중…':'사진 변경'}</button>
                        {profileImg && <button onClick={handleResetPhoto} disabled={photoSaving}
                            className="text-xs font-black px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 disabled:opacity-50">기본으로</button>}
                    </div>
                </div>
                {/* 기본 정보 (항상 읽기 전용) */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-2.5">
                    {[
                        {label:'이름', val:memberInfo.name},
                        memberInfo.role && memberInfo.role !== '회원' && {label:'역할', val:memberInfo.role, badge:true},
                        memberInfo.gender && {label:'성별', val:memberInfo.gender},
                        memberInfo.birth && {label:'생년월일', val:formatBirth(memberInfo.birth)},
                        memberInfo.joinDate && {label:'가입일', val:memberInfo.joinDate},
                        memberInfo.position && memberInfo.position !== 'all' && {label:'포지션', val:memberInfo.position},
                    ].filter(Boolean).map(item=>(
                        <div key={item.label} className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-400">{item.label}</span>
                            {item.badge
                                ? <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${getRoleBadgeClass(item.val)}`}>{item.val}</span>
                                : <span className="text-sm font-black text-slate-700">{item.val}</span>
                            }
                        </div>
                    ))}
                </div>
                {/* 전화번호 · 거주지 — 보기 모드 or 수정 모드 */}
                {!editing ? (
                    <>
                        <div className="space-y-2.5 mb-4 px-1">
                            {[
                                {label:'전화번호', val: phone ? formatPhoneInput(phone) : null},
                                {label:'거주지',   val: address || null},
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-400">{row.label}</span>
                                    <span className={`text-sm font-black ${row.val ? 'text-slate-700' : 'text-slate-300'}`}>
                                        {row.val || '미입력'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setEditing(true)}
                            className="w-full py-3 bg-teal-50 text-teal-600 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                            <Icon.Edit size={15}/> 수정하기
                        </button>
                    </>
                ) : (
                    <>
                        <div className="space-y-3 mb-5">
                            <div>
                                <p className="text-xs font-black text-slate-500 mb-1">전화번호</p>
                                <input type="text" style={{userSelect:'text'}} placeholder="010-0000-0000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                    value={formatPhoneInput(phone)} onChange={e=>setPhone(formatPhoneInput(e.target.value))}/>
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-500 mb-1">거주지</p>
                                <input type="text" style={{userSelect:'text'}} placeholder="예: 화성시 반월동"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                    value={address} onChange={e=>setAddress(e.target.value)}/>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleCancelEdit} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                            <button onClick={handleSave} disabled={saving}
                                className={`flex-1 py-3 rounded-2xl font-black text-sm ${saving?'bg-teal-200 text-white':'bg-teal-500 text-white'}`}>
                                {saving?'저장 중...':'저장'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

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
    monthlyStatuses, monthlyReasons,
    meetingParticipants,
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
    // 완전 삭제 모달
    deletingMember, setDeletingMember,
    handleDeleteMember,
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
    attendIsPending, attendHandleAddGuest, attendEditingGuestId,
    // 기록 상태 편집 모달
    historyEditTarget, setHistoryEditTarget,
    handleHistoryStatusUpdate,
    // QR 코드 생성 모달
    isQRGenModalOpen, setIsQRGenModalOpen,
    meetingSettings,
    // 지도 장소 선택 모달
    isLocationPickerOpen, setIsLocationPickerOpen,
    updateMeetingSettingsAdmin,
    // 공지 작성/수정 모달
    announcementModal, setAnnouncementModal, handleSaveAnnouncement,
    // 내 프로필 모달
    isProfileModalOpen, setIsProfileModalOpen, memberInfo, memberData, showAlert,
}) => (
    <>
        {/* ===== 회비 액션 모달 (바텀시트) ===== */}
        {billingMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center" style={{zIndex:60}} onClick={()=>setBillingMember(null)}>
                <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[85vh]" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1">
                            <p className="font-black text-lg text-slate-800">{billingMember.name}</p>
                            <p className="text-xs text-slate-400">{billingMember.role} · {billingMember.level}</p>
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
                                    onChange={e=>setNewMemberForm(p=>({...p,isFounder:e.target.checked,joinDate:e.target.checked?'':p.joinDate,duesStartMonth:e.target.checked?'':p.duesStartMonth}))}/>
                                <span className="text-xs font-black text-amber-600">원년 멤버 (OTP FC 창단 멤버)</span>
                            </label>
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-500 mb-1">회비 시작 월 <span className="text-slate-300 font-bold">· 이 달부터 회비에 표시</span></p>
                            <input type="month" style={{userSelect:'text'}} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black ${newMemberForm.isFounder?'opacity-30':''}`}
                                disabled={!!newMemberForm.isFounder} value={newMemberForm.duesStartMonth||''} onChange={e=>setNewMemberForm(p=>({...p,duesStartMonth:e.target.value}))}/>
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
                                    onChange={e=>setEditingMember(p=>({...p,isFounder:e.target.checked,joinDate:e.target.checked?'':p.joinDate,duesStartMonth:e.target.checked?'':p.duesStartMonth}))}/>
                                <span className="text-xs font-black text-amber-600">원년 멤버 (OTP FC 창단 멤버)</span>
                            </label>
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-500 mb-1">회비 시작 월 <span className="text-slate-300 font-bold">· 이 달부터 회비에 표시</span></p>
                            <input type="month" style={{userSelect:'text'}} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black ${editingMember.isFounder?'opacity-30':''}`}
                                disabled={!!editingMember.isFounder} value={editingMember.duesStartMonth||''} onChange={e=>setEditingMember(p=>({...p,duesStartMonth:e.target.value}))}/>
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
                            {resignForm.isForced?<span className="inline-flex items-center justify-center gap-1"><Icon.Check size={13}/>강제 탈퇴</span>:'강제 탈퇴'}
                        </button>
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={()=>setResigningMember(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                        <button onClick={handleResignConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black text-sm">탈퇴 처리</button>
                    </div>
                </div>
            </div>
        )}

        {/* ===== 완전 삭제 모달 ===== */}
        <DeleteMemberModal deletingMember={deletingMember} setDeletingMember={setDeletingMember} handleDeleteMember={handleDeleteMember}/>

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
        {alertModal.show && (() => {
            // lab 통일 팝업: 둥근 카드 + 색 아이콘 칩 + 가운데 제목/메시지 + 버튼.
            // 아이콘은 style을 무시하므로 칩 div의 color(currentColor)로 채색.
            const VARIANTS = {
                success: { Ic: Icon.CheckCircle,   color:'#10b981', tint:'rgba(16,185,129,0.13)', btn:'bg-emerald-500' },
                warn:    { Ic: Icon.AlertTriangle, color:'#f59e0b', tint:'rgba(245,158,11,0.13)', btn:'bg-amber-500' },
                danger:  { Ic: Icon.AlertTriangle, color:'#ef4444', tint:'rgba(239,68,68,0.13)',  btn:'bg-rose-500' },
                info:    { Ic: Icon.Info,          color:'#183FB0', tint:'rgba(24,63,176,0.10)',  btn:'bg-teal-500' },
                confirm: { Ic: Icon.Info,          color:'#183FB0', tint:'rgba(24,63,176,0.10)',  btn:'bg-teal-500' },
            };
            const v = VARIANTS[alertModal.variant] || VARIANTS[alertModal.type] || VARIANTS.info;
            const isConfirm = alertModal.type === 'confirm';
            const isLoading = alertModal.type === 'loading';
            const close = () => setAlertModal(p=>({...p,show:false}));
            return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:70}}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl animate-in text-center">
                    {isLoading ? (
                        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3.5" style={{background:v.tint, color:v.color}}>
                            <v.Ic size={30}/>
                        </div>
                    )}
                    <h3 className="font-black text-xl text-slate-800 mb-1.5">{alertModal.title}</h3>
                    {alertModal.content && <p className={`text-sm font-bold text-slate-500 whitespace-pre-line leading-relaxed ${isLoading?'':'mb-5'}`}>{alertModal.content}</p>}
                    {!isLoading && (
                        <div className="flex gap-2.5">
                            {isConfirm && <button onClick={close} className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm active:scale-95 transition-all">취소</button>}
                            <button onClick={()=>{ if(alertModal.onConfirm) alertModal.onConfirm(); close(); }} className={`flex-1 py-3.5 ${v.btn} text-white rounded-2xl font-black text-sm active:scale-95 transition-all`}>
                                {isConfirm?'확인':'닫기'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            );
        })()}

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
                                <p className="text-emerald-500 font-black text-xl flex items-center justify-center gap-1.5"><Icon.Check size={20}/>출석 완료</p>
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
                            <button onClick={()=>setAttendModal({type:null,data:null})} className="w-full py-3.5 bg-teal-500 text-white rounded-2xl font-black text-base shadow-sm active:scale-95 transition-all">확인</button>
                            <button onClick={()=>attendHandleUncheckIn(attendModal.data)} className="w-full py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm mt-2 active:scale-95 transition-all">출석 취소</button>
                          </div>
                        : <div>
                            <button onClick={()=>attendHandleCheckIn(attendModal.data)} className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">출석 체크</button>
                            <button onClick={()=>setAttendModal({type:null,data:null})} className="w-full py-3 text-slate-400 text-sm mt-3 font-black">닫기</button>
                          </div>
                    }
                </div>
            </div>
        )}

        {/* ===== 게스트 추가 모달 (관리자) ===== */}
        {isAttendGuestModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setIsAttendGuestModalOpen(false)}>
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
                    <h2 className="text-xl font-black text-slate-800 mb-4">{attendEditingGuestId ? '게스트 수정' : '게스트 추가'}</h2>
                    <div className="space-y-3">
                        <input type="text" placeholder="이름" style={{userSelect:'text'}} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                            value={attendNewGuest.name} onChange={e=>setAttendNewGuest(p=>({...p,name:e.target.value}))} />
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                            value={attendNewGuest.gender} onChange={e=>setAttendNewGuest(p=>({...p,gender:e.target.value, level:e.target.value==='여성'?'7':'1'}))}>
                            <option value="남성">남성</option><option value="여성">여성</option>
                        </select>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                            value={attendNewGuest.inviterId} onChange={e=>setAttendNewGuest(p=>({...p,inviterId:e.target.value}))}>
                            <option value="">초대자 없음</option>
                            {[...activeMembers].sort((a,b)=>a.name.localeCompare(b.name)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black pr-8"
                            value={attendNewGuest.level} onChange={e=>setAttendNewGuest(p=>({...p,level:e.target.value}))}>
                            {(attendNewGuest.gender==='여성'?[7,8,9,10,11,12]:[1,2,3,4,5,6]).map(l=><option key={l} value={String(l)}>Lv.{l}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={()=>setIsAttendGuestModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">취소</button>
                        <button onClick={attendHandleAddGuest} disabled={attendIsPending} className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black text-sm disabled:opacity-50">{attendEditingGuestId ? '저장' : '추가'}</button>
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

        {/* ===== 공지 작성/수정 모달 ===== */}
        <AnnouncementModal
            announcementModal={announcementModal}
            setAnnouncementModal={setAnnouncementModal}
            handleSaveAnnouncement={handleSaveAnnouncement}
            activeMembers={activeMembers}
            monthlyStatuses={monthlyStatuses}
            monthlyReasons={monthlyReasons}
            targetMonth={targetMonth}
            meetingParticipants={meetingParticipants}
        />

        {/* ===== 내 프로필 모달 ===== */}
        <ProfileModal
            isOpen={!!isProfileModalOpen}
            onClose={()=>setIsProfileModalOpen(false)}
            memberInfo={memberInfo}
            memberData={memberData}
            showAlert={showAlert}
        />
    </>
);
// ─────────────────────────────────────────────────────────────────────────────
