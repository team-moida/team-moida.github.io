// ─── 키오스크 실시간 시계 ───────────────────────────────────────────────────────────
const KioskClock = () => {
    const fmt = () => { const n = new Date(); return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`; };
    const [time, setTime] = React.useState(fmt);
    React.useEffect(() => { const t = setInterval(() => setTime(fmt()), 1000); return () => clearInterval(t); }, []);
    return <span style={{fontVariantNumeric:'tabular-nums'}}>{time}</span>;
};

// ─── 키오스크 열릴 때 body pull-to-refresh 차단 ──────────────────────────────────
const KioskScrollLock = () => {
    React.useEffect(() => {
        const prev = document.body.style.overscrollBehavior;
        document.body.style.overscrollBehavior = 'none';
        return () => { document.body.style.overscrollBehavior = prev; };
    }, []);
    return null;
};

// ─── 키오스크 모달 ────────────────────────────────────────────────────────────────
const KioskModal = ({
    isKioskOpen, setIsKioskOpen,
    attendGroupedTeams, attendActiveList,
    attendCheckedInCount, meetingSettings,
    attendHandleCheckIn, setAttendModal,
}) => {
    const [confirmTarget, setConfirmTarget] = React.useState(null);
    if (!isKioskOpen) return null;

    const handleConfirm = () => {
        attendHandleCheckIn(confirmTarget);
        setConfirmTarget(null);
    };
    const teamBadgeClass = confirmTarget?.teamIdx != null ? getTeamBadge(confirmTarget.teamIdx) : 'bg-teal-500';
    const teamColorLabel = confirmTarget?.teamIdx != null ? getTeamColorName(confirmTarget.teamIdx) : '';

    return (
        <div className="fixed inset-0 z-50 flex flex-col" style={{background:'#f8fafc',overscrollBehavior:'none',fontFamily:"'Esamanru', sans-serif"}}>
            <KioskScrollLock />
            {/* 상단 바 */}
            <div style={{background:'white',borderBottom:'1px solid #e2e8f0',paddingLeft:'16px',paddingRight:'16px',paddingBottom:'14px',paddingTop:'max(14px, env(safe-area-inset-top))',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                    <p style={{color:'#1e293b',fontWeight:900,fontSize:'1rem'}}>직접 출석</p>
                    <p style={{color:'#64748b',fontSize:'0.75rem',marginTop:'2px'}}>{meetingSettings?.date} · <span style={{color:'var(--c-accent-deep)',fontWeight:900}}>{attendCheckedInCount}명 출석</span> / {attendActiveList.length}명</p>
                    <p style={{color:'#1e293b',fontSize:'1.5rem',fontWeight:900,marginTop:'4px',letterSpacing:'0.05em'}}><KioskClock /></p>
                </div>
                <button onClick={() => setIsKioskOpen(false)}
                    style={{width:'40px',height:'40px',borderRadius:'12px',background:'#f1f5f9',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',fontWeight:900}}>
                    <Icon.X size={20}/>
                </button>
            </div>
            {/* 출석 진행 바 */}
            {attendActiveList.length > 0 && (
                <div style={{height:'4px',background:'#e2e8f0',flexShrink:0}}>
                    <div style={{height:'100%',background:'var(--c-success)',transition:'width 0.7s',width:`${Math.round(attendCheckedInCount/attendActiveList.length*100)}%`}}/>
                </div>
            )}
            {/* 본문 */}
            <div className="overflow-y-auto flex-1" style={{padding:'16px'}}>
                {attendGroupedTeams.length > 0 ? (
                    attendGroupedTeams.map((group) => (
                        <div key={group.teamName} className="mb-6">
                            <div className={`flex items-center gap-2 rounded-2xl p-3 mb-3 border ${getTeamCard(group.teamIdx)}`}>
                                <span className={`w-9 h-9 rounded-xl text-sm font-black flex items-center justify-center text-white ${getTeamBadge(group.teamIdx)}`}>{group.teamName}</span>
                                <div className="flex-1">
                                    <p className="font-black text-slate-700">{group.teamName}팀 · <span className="font-black">{getTeamColorName(group.teamIdx)}</span> 조끼</p>
                                    <p className="text-xs text-slate-400">출석 {group.members.filter(m=>m.checkedIn).length}/{group.members.length}명</p>
                                </div>
                            </div>
                            <div style={{display:'flex',gap:'6px'}}>
                                {group.members.map(p => (
                                    <button key={p.id}
                                        onClick={() => p.checkedIn
                                            ? setAttendModal({type:'checkin', data:{...p, teamIdx:group.teamIdx, teamName:group.teamName}})
                                            : setConfirmTarget({...p, teamIdx:group.teamIdx, teamName:group.teamName})
                                        }
                                        style={{flex:'1 1 0',minWidth:0,aspectRatio:'1',minHeight:'72px'}}
                                        className={`relative overflow-hidden rounded-2xl active:scale-95 transition-all text-white ${getTeamBadge(group.teamIdx)} ${p.checkedIn?'opacity-40':''}`}>
                                        {p.checkedIn && (
                                            <div className="absolute inset-0 flex items-center justify-center" style={{background:'rgba(0,0,0,0.2)'}}>
                                                <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                                    <Icon.Check size={18} className="text-white"/>
                                                </div>
                                            </div>
                                        )}
                                        {/* 번호 — 이름 뒤에 깔리는 연한 워터마크(조끼색보다 연하게). 카드 크기에 비례 */}
                                        <div style={{position:'absolute',inset:0,containerType:'inline-size',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',userSelect:'none'}}>
                                            <span style={{fontSize:(String(p.jerseyNumber ?? '').length >= 2 ? '78cqw' : '110cqw'),fontWeight:900,lineHeight:1,color:'rgba(255,255,255,0.3)',transform:'translateY(0.05em)'}}>{p.jerseyNumber}</span>
                                        </div>
                                        {/* 이름 — 정중앙, 번호 위에 */}
                                        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'3px',padding:'0 4px',pointerEvents:'none',userSelect:'none'}}>
                                            <span style={{fontWeight:900,fontSize:'1.5rem',textAlign:'center',wordBreak:'keep-all',lineHeight:1.1,textShadow:'0 1px 4px rgba(0,0,0,0.35)'}}>{p.name}</span>
                                            <div style={{display:'flex',gap:'3px'}}>
                                                {p.gender==='여성'&&<span style={{fontSize:'9px',fontWeight:900,padding:'1px 5px',borderRadius:4,background:'#ec4899',color:'white'}}>W</span>}
                                                {p.isGuest&&<span style={{fontSize:'9px',fontWeight:900,padding:'1px 5px',borderRadius:4,background:'rgba(0,0,0,0.3)',color:'white'}}>G</span>}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                ) : attendActiveList.length > 0 ? (
                    meetingSettings?.meetingType === 'match' ? (
                        /* 팀 미편성 매칭 → 참여자 평면 그리드로 바로 체크인 */
                        <div className="grid grid-cols-3 gap-2.5">
                            {attendActiveList.map((p, idx) => (
                                <button key={p.id}
                                    onClick={() => p.checkedIn
                                        ? setAttendModal({type:'checkin', data:{...p, jerseyNumber:idx+1}})
                                        : setConfirmTarget({...p, jerseyNumber:idx+1})
                                    }
                                    style={{minHeight:'100px'}}
                                    className={`relative overflow-hidden rounded-2xl active:scale-95 transition-all text-white bg-teal-500 ${p.checkedIn?'opacity-40':''}`}>
                                    {p.checkedIn && (
                                        <div className="absolute inset-0 flex items-center justify-center" style={{background:'rgba(0,0,0,0.2)'}}>
                                            <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                                <Icon.Check size={20} className="text-white"/>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{position:'absolute',top:'8px',left:'10px',fontSize:'1.9rem',fontWeight:900,lineHeight:1,opacity:0.9,pointerEvents:'none',userSelect:'none'}}>
                                        {idx+1}
                                    </div>
                                    <div style={{position:'absolute',bottom:'10px',left:0,right:0,display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',pointerEvents:'none',userSelect:'none'}}>
                                        <span style={{fontWeight:900,fontSize:'1rem',textAlign:'center',wordBreak:'keep-all',lineHeight:1.2,paddingLeft:'4px',paddingRight:'4px'}}>{p.name}</span>
                                        <div style={{display:'flex',gap:'3px'}}>
                                            {p.gender==='여성'&&<span style={{fontSize:'9px',fontWeight:900,padding:'1px 5px',borderRadius:4,background:'#ec4899',color:'white'}}>W</span>}
                                            {p.isGuest&&<span style={{fontSize:'9px',fontWeight:900,padding:'1px 5px',borderRadius:4,background:'rgba(0,0,0,0.3)',color:'white'}}>G</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* 인원은 선정됐지만 팀편성 전 → 안내만 띄우고 출석 체크는 막음 */
                        <div className="text-center" style={{paddingTop:'80px',color:'#475569'}}>
                            <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}><Icon.Users size={48} className="text-slate-400"/></div>
                            <p style={{fontWeight:900,fontSize:'1.1rem',color:'#64748b'}}>팀편성 후 이용할 수 있습니다</p>
                            <p style={{fontSize:'0.875rem',color:'var(--c-sub)',marginTop:'8px'}}>팀을 먼저 편성한 뒤 키오스크 출석을 진행하세요</p>
                        </div>
                    )
                ) : (
                    <div className="text-center" style={{paddingTop:'80px',color:'#475569'}}>
                        <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}><Icon.Clipboard size={48} className="text-slate-400"/></div>
                        <p style={{fontWeight:900,fontSize:'1.1rem',color:'#64748b'}}>선정된 인원이 없습니다</p>
                    </div>
                )}
            </div>
            {/* 확인 팝업 */}
            {confirmTarget && (
                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:10,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}
                    onClick={() => setConfirmTarget(null)}>
                    <div style={{background:'white',borderRadius:'28px',overflow:'hidden',width:'100%',maxWidth:'320px',boxShadow:'0 25px 50px rgba(0,0,0,0.35)'}}
                        onClick={e => e.stopPropagation()}>
                        <div style={{height:'10px'}} className={teamBadgeClass}/>
                        <div style={{padding:'28px 24px 24px',textAlign:'center',userSelect:'none'}}>
                            {confirmTarget.jerseyNumber && (
                                <div style={{fontSize:'5rem',fontWeight:900,lineHeight:1,marginBottom:'8px',color:'#1e293b'}}>
                                    {confirmTarget.jerseyNumber}
                                </div>
                            )}
                            <p style={{fontSize:'2.2rem',fontWeight:900,color:'#0f172a',lineHeight:1.2,marginBottom:'10px',wordBreak:'keep-all'}}>{confirmTarget.name}</p>
                            {confirmTarget.teamName
                                ? <p style={{fontSize:'1rem',color:'#64748b',marginBottom:'24px'}}>{confirmTarget.teamName}팀 · {teamColorLabel} 조끼</p>
                                : <div style={{marginBottom:'24px'}}/>
                            }
                            <div style={{display:'flex',gap:'10px'}}>
                                <button onClick={() => setConfirmTarget(null)}
                                    style={{flex:1,height:'56px',borderRadius:'16px',background:'#f1f5f9',color:'#475569',fontWeight:900,fontSize:'1rem',border:'none',cursor:'pointer'}}
                                    className="active:scale-95 hover:bg-slate-200 transition-all">
                                    취소
                                </button>
                                <button onClick={handleConfirm}
                                    style={{flex:1,height:'56px',borderRadius:'16px',color:'white',fontWeight:900,fontSize:'1rem',border:'none',cursor:'pointer'}}
                                    className={`${teamBadgeClass} active:scale-95 hover:opacity-90 transition-all`}>
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── 선착순 신청 설정 섹션 (관리자 선정 탭용) ─────────────────────────────────────
const RegSettingsSection = ({ meetingSettings, updateMeetingSettingsAdmin }) => {
    const { useState, useEffect } = React;
    const hourOptions = Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
    const minuteOptions = ['00','10','20','30','40','50'];

    const parseRegDT = (isoStr) => {
        if (!isoStr) return { date:'', hour:'09', minute:'00' };
        const [d, t] = isoStr.split('T');
        const [h, mn] = (t||'09:00').split(':');
        return { date:d||'', hour:h||'09', minute:(mn||'00').substring(0,2) };
    };

    const [enabled, setEnabled] = useState(!!meetingSettings?.isRegistrationEnabled);
    const [firstComeFirstServed, setFirstComeFirstServed] = useState(meetingSettings?.isFirstComeFirstServed ?? true);
    const [openDT, setOpenDT] = useState(() => parseRegDT(meetingSettings?.registrationOpenAt));
    const [closeDT, setCloseDT] = useState(() => parseRegDT(meetingSettings?.registrationCloseAt));

    useEffect(() => {
        setEnabled(!!meetingSettings?.isRegistrationEnabled);
        setFirstComeFirstServed(meetingSettings?.isFirstComeFirstServed ?? true);
        setOpenDT(parseRegDT(meetingSettings?.registrationOpenAt));
        setCloseDT(parseRegDT(meetingSettings?.registrationCloseAt));
    }, [meetingSettings?.date]);

    const handleSave = async () => {
        const meetingDate = meetingSettings?.date;
        if (!meetingDate) return;
        const newReg = {
            isRegistrationEnabled: enabled,
            isFirstComeFirstServed: firstComeFirstServed,
            registrationOpenAt: enabled && openDT.date ? `${openDT.date}T${openDT.hour}:${openDT.minute}` : '',
            registrationCloseAt: enabled && closeDT.date ? `${closeDT.date}T${closeDT.hour}:${closeDT.minute}` : '',
        };
        updateMeetingSettingsAdmin({ ...meetingSettings, ...newReg });
        try {
            await getMeetingsCol().doc(meetingDate).update(newReg);
        } catch(e) { console.error('신청 설정 저장 실패:', e); }
    };

    const DTRow = ({ label, dt, setDT }) => (
        <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">{label}</label>
            <div className="flex gap-1">
                <input type="date" value={dt.date} onChange={e=>setDT(d=>({...d,date:e.target.value}))}
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                <select value={dt.hour} onChange={e=>setDT(d=>({...d,hour:e.target.value}))}
                    className="w-14 bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 text-xs font-medium focus:outline-none">
                    {hourOptions.map(h=><option key={h} value={h}>{h}시</option>)}
                </select>
                <select value={dt.minute} onChange={e=>setDT(d=>({...d,minute:e.target.value}))}
                    className="w-14 bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 text-xs font-medium focus:outline-none">
                    {minuteOptions.map(mn=><option key={mn} value={mn}>{mn}분</option>)}
                </select>
            </div>
        </div>
    );

    return (
        <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">신청 창구</label>
                <button onClick={()=>setEnabled(e=>!e)}
                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${enabled?'bg-teal-500':'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${enabled?'left-6':'left-0.5'}`}/>
                </button>
            </div>
            {enabled && (
                <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between py-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">선착순 제한</label>
                        <button onClick={()=>setFirstComeFirstServed(v=>!v)}
                            className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${firstComeFirstServed?'bg-orange-400':'bg-slate-200'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${firstComeFirstServed?'left-6':'left-0.5'}`}/>
                        </button>
                    </div>
                    {!firstComeFirstServed && <p className="text-[10px] text-slate-400 pb-1">OFF: 정원 초과해도 모두 확정</p>}
                    <DTRow label="신청 시작" dt={openDT} setDT={setOpenDT}/>
                    <DTRow label="신청 마감" dt={closeDT} setDT={setCloseDT}/>
                </div>
            )}
            <button onClick={handleSave}
                className={`w-full py-2 rounded-xl font-black text-xs mt-2 ${enabled?'bg-teal-500 text-white':'bg-slate-100 text-slate-500'}`}>
                신청 설정 저장
            </button>
        </div>
    );
};

// ─── 회원용 신청 카드 ─────────────────────────────────────────────────────────────
const RegistrationCard = ({ meetingSettings, myRegistration, regConfirmedCount, myWaitingPosition, handleRegister, handleCancel, handleAbsent, duesUnpaid, duesBlock, penaltyUnpaid = 0, penaltyTotal = 0, isPreview }) => {
    const { useState } = React;
    const [absentConfirm, setAbsentConfirm] = useState(false);
    const [absentReason, setAbsentReason] = useState('');

    if (!meetingSettings?.isRegistrationEnabled) return null;

    const now = new Date();
    const openAt = meetingSettings?.registrationOpenAt ? new Date(meetingSettings.registrationOpenAt) : null;
    const closeAt = meetingSettings?.registrationCloseAt ? new Date(meetingSettings.registrationCloseAt) : null;
    const isBeforeOpen = openAt && now < openAt;
    const isAfterClose = closeAt && now > closeAt;
    const isOpen = !isBeforeOpen && !isAfterClose;
    const maxLimit = meetingSettings?.maxLimit || 18;
    const isFirstComeFirstServed = meetingSettings?.isFirstComeFirstServed ?? true;
    const isMatch = meetingSettings?.meetingType === 'match';
    const maxMale = meetingSettings?.maxMale || 0;
    const maxFemale = meetingSettings?.maxFemale || 0;
    const confMale = meetingSettings?.confirmedMaleCount || 0;
    const confFemale = meetingSettings?.confirmedFemaleCount || 0;

    const fmtDT = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };

    // 불참/노쇼 시간 구간 (신청마감 후 + 참가확정 상태일 때만 계산)
    const absentType = (isAfterClose && myRegistration?.status === 'confirmed' && typeof getAbsentType === 'function') ? getAbsentType(meetingSettings.date, meetingSettings.end) : null;
    const absentFine = absentType === 'noshow_1' ? 10000 : absentType === 'noshow_2' ? 20000 : 0;
    const absentBtnCls = absentFine === 20000 ? 'bg-red-500 text-white' : absentFine === 10000 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600';
    const absentBtnLabel = absentFine > 0 ? `불참 신청 (노쇼 · ${absentFine / 10000}만원 벌금)` : '불참 신청 (벌금 없음)';

    return (
        <div className="card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-orange-500 uppercase tracking-widest">{isMatch ? '매칭 신청' : (isFirstComeFirstServed ? '선착순 신청' : '모임 신청')}</p>
                {isMatch
                    ? <span className="text-xs font-black text-slate-400">남 {confMale}/{maxMale} · 여 {confFemale}/{maxFemale}</span>
                    : (isFirstComeFirstServed && <span className="text-xs font-black text-slate-400">{regConfirmedCount} / {maxLimit}명</span>)}
            </div>
            {isMatch && meetingSettings?.opponentName && (
                <p className="text-[11px] font-black text-indigo-500 mb-3">vs {meetingSettings.opponentName}</p>
            )}

            {isBeforeOpen && (
                <div className="text-center py-3">
                    <p className="text-sm font-black text-slate-400">신청 시작 전</p>
                    <p className="text-xs text-slate-300 mt-1">{fmtDT(meetingSettings.registrationOpenAt)} 부터 신청 가능</p>
                </div>
            )}

            {isOpen && !myRegistration && (
                <>
                    {penaltyUnpaid > 0 && (
                        <div className="mb-2 rounded-2xl px-3 py-2.5 bg-rose-50 border border-rose-200">
                            <p className="text-xs font-black text-rose-600 flex items-center gap-1"><Icon.AlertTriangle size={12} className="flex-shrink-0"/>미납 벌금 {penaltyUnpaid}건 ({penaltyTotal.toLocaleString()}원)</p>
                            <p className="text-[11px] text-rose-400 mt-0.5">회비 탭에서 벌금을 납부해야 신청할 수 있어요</p>
                        </div>
                    )}
                    {duesUnpaid && (
                        <div className="mb-2 rounded-2xl px-3 py-2.5 bg-rose-50 border border-rose-200">
                            <p className="text-xs font-black text-rose-600 flex items-center gap-1"><Icon.AlertTriangle size={12} className="flex-shrink-0"/>회비 미납 상태예요</p>
                            <p className="text-[11px] text-rose-400 mt-0.5">홈 탭에서 회비를 납부해 주세요{duesBlock ? ' · 납부해야 신청할 수 있어요' : ''}</p>
                        </div>
                    )}
                    {penaltyUnpaid > 0 ? (
                        <button disabled className="w-full py-3.5 bg-slate-200 text-slate-400 rounded-2xl font-black text-sm cursor-not-allowed">벌금 미납 — 신청 불가</button>
                    ) : duesBlock && duesUnpaid ? (
                        <button disabled className="w-full py-3.5 bg-slate-200 text-slate-400 rounded-2xl font-black text-sm cursor-not-allowed">회비 미납 — 신청 불가</button>
                    ) : (
                        <button onClick={isPreview ? () => alert('미리보기에서는 실제로 신청되지 않아요.') : handleRegister}
                            className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">
                            신청하기{isPreview ? ' (미리보기)' : ''}
                        </button>
                    )}
                </>
            )}

            {isOpen && myRegistration?.status === 'confirmed' && (
                <div>
                    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3 mb-3 text-center">
                        <p className="font-black text-teal-500 flex items-center justify-center gap-1">참가 확정 <Icon.Check size={15}/></p>
                    </div>
                    <button onClick={handleCancel}
                        className="w-full py-2.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm active:scale-95">
                        신청 취소
                    </button>
                </div>
            )}

            {isOpen && myRegistration?.status === 'waiting' && (isFirstComeFirstServed || isMatch) && (
                <div>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-3 text-center">
                        <p className="font-black text-amber-500">대기 중 {myWaitingPosition}번</p>
                    </div>
                    <button onClick={handleCancel}
                        className="w-full py-2.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm active:scale-95">
                        신청 취소
                    </button>
                </div>
            )}

            {isAfterClose && (
                <div className="space-y-2">
                    <div className="text-center py-1">
                        <p className="text-sm font-black text-slate-400">신청 마감</p>
                        {myRegistration?.status === 'absent' && <p className="text-xs text-slate-500 font-black mt-1">불참 처리됨</p>}
                        {myRegistration?.status === 'noshow' && <p className="text-xs text-red-500 font-black mt-1">노쇼 처리됨 · 벌금 {((myRegistration.noShowFine||0)/10000).toLocaleString()}만원</p>}
                        {(isFirstComeFirstServed || isMatch) && myRegistration?.status === 'waiting' && <p className="text-xs text-amber-500 font-black mt-1">대기 {myWaitingPosition}번</p>}
                        {!myRegistration && <p className="text-xs text-slate-300 mt-1">미신청</p>}
                        {myRegistration?.status === 'confirmed' && !absentType && <p className="text-xs text-teal-500 font-black mt-1 flex items-center justify-center gap-1">참가 확정 <Icon.Check size={12}/></p>}
                    </div>
                    {myRegistration?.status === 'confirmed' && absentType && (
                        absentConfirm ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                                <p className="text-sm font-black text-slate-700 text-center mb-3 whitespace-pre-line">
                                    {absentFine > 0
                                        ? `노쇼로 처리됩니다.\n벌금 ${absentFine / 10000}만원이 부과됩니다.`
                                        : '불참 처리됩니다.\n출석 명단에서 제외됩니다.'}
                                </p>
                                <textarea value={absentReason} onChange={e => setAbsentReason(e.target.value)}
                                    rows={2} maxLength={200}
                                    placeholder={absentFine > 0 ? '노쇼 사유 (선택) — 예: 갑작스런 일정' : '불참 사유 (선택) — 예: 컨디션 난조'}
                                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm mb-3 resize-none bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"/>
                                <div className="flex gap-2">
                                    <button onClick={() => { setAbsentConfirm(false); setAbsentReason(''); }} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm active:scale-95">취소</button>
                                    <button onClick={() => { if (!isPreview) handleAbsent && handleAbsent(absentReason.trim()); setAbsentConfirm(false); setAbsentReason(''); }}
                                        className={`flex-1 py-2.5 rounded-2xl font-black text-sm active:scale-95 ${absentBtnCls}`}>확인</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3 mb-2 text-center">
                                    <p className="font-black text-teal-500 flex items-center justify-center gap-1">참가 확정 <Icon.Check size={15}/></p>
                                </div>
                                <button onClick={() => isPreview ? alert('미리보기에서는 불참 신청이 되지 않아요.') : setAbsentConfirm(true)}
                                    className={`w-full py-2.5 rounded-2xl font-black text-sm active:scale-95 ${absentBtnCls}`}>
                                    {absentBtnLabel}
                                </button>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

// ─── 종료 모임 판정 (정기=done 표시 / 매칭=지난 날짜) ─────────────────────────
// 매칭 모임은 종료 흐름이 없어 'done'이 안 붙으므로 날짜(past)로 종료 간주한다.
const isMeetingEnded = (m) => !!m && (m.status === 'done' || computeMeetingDay(m.date, m.start)?.type === 'past');

// ─── 종료 모임 출석 기록 상세 (저장된 attendHistory 기록을 그대로 표시) ──────────
const RecordDetailModal = ({ detail, onClose, onEdit, onDelete, onFinalizePenalty, darkMode }) => {
    const { meeting: m, hist } = detail;
    window.useMoidaBack && window.useMoidaBack(true, onClose); // 뒤로가기로 기록 상세 닫기

    const kind = (m.meetingType || 'self') === 'match' ? 'match' : 'self';
    const cfg = MEETING_KIND[kind];
    const stColor = (s) => s === '정상' ? 'bg-emerald-100 text-emerald-600'
        : s === '지각' ? 'bg-amber-100 text-amber-600'
        : s === '노쇼' ? 'bg-rose-100 text-rose-500'
        : 'bg-slate-100 text-slate-400';
    const records = (hist?.records || []).slice().sort((a, b) => (a.timestamp || '99:99').localeCompare(b.timestamp || '99:99'));
    const lateCount = records.filter(r => r.status === '지각').length;
    const noShowCount = records.filter(r => r.status === '노쇼').length;
    const penaltyRecords = records.filter(r => r.status === '지각' || r.status === '노쇼');
    // ── 출석 기록 이미지로 저장 (지각·노쇼 포함) ──
    const captureRecord = async () => {
        const el = document.getElementById('record-capture-area');
        if (!el || !window.html2canvas) return;
        try {
            const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: darkMode ? '#1e293b' : '#ffffff', useCORS: true });
            const link = document.createElement('a');
            link.download = `모이다_출석기록_${m.date}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.92);
            link.click();
        } catch (e) { /* 캡쳐 실패는 무시 */ }
    };
    // ── 지각·노쇼만 따로 이미지로 저장 (화면 밖 전용 레이아웃 → 이름 잘림 없음) ──
    const capturePenalty = async () => {
        const el = document.getElementById('penalty-capture-area');
        if (!el || !window.html2canvas) return;
        try {
            const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: darkMode ? '#1e293b' : '#ffffff', useCORS: true });
            const link = document.createElement('a');
            link.download = `모이다_지각노쇼_${m.date}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.92);
            link.click();
        } catch (e) { /* 캡쳐 실패는 무시 */ }
    };
    // ── 벌금 부과 (관리자 전용, 정기 모임만) ──
    const penTargets = records.filter(r => r.type === '정규' && r.memberId && (r.status === '지각' || r.status === '노쇼'));
    const [penOverrides, setPenOverrides] = React.useState({}); // memberId -> 'none'|'late'|'noshow'
    const penFinalized = !!hist?.penaltyFinalizedAt;
    const penResolve = (r) => penOverrides[r.memberId] || (r.status === '지각' ? 'late' : r.status === '노쇼' ? 'noshow' : 'none');
    const penAmt = (r) => {
        const v = penResolve(r);
        if (v === 'none') return 0;
        if (v === 'late') return 5000;
        return r.noShowFine === 10000 ? 10000 : r.noShowFine === 20000 ? 20000 : 30000; // 노쇼: 통보(1만/2만) / 무통보(3만)
    };
    const penType = (r) => {
        const v = penResolve(r);
        if (v === 'none') return null;
        if (v === 'late') return 'late';
        return r.noShowFine === 10000 ? 'noshow_notified_1' : r.noShowFine === 20000 ? 'noshow_notified_2' : 'noshow_no_notice';
    };
    const penTotal = penTargets.reduce((s, r) => s + penAmt(r), 0);
    const doFinalizePenalty = () => {
        const items = penTargets.map(r => ({ r, t: penType(r) })).filter(x => x.t)
            .map(({ r, t }) => ({ memberId: r.memberId, name: r.name, type: t, amount: penAmt(r), reason: r.reason || '' }));
        onFinalizePenalty && onFinalizePenalty(hist, m, items);
        onClose();
    };
    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6" onClick={onClose}>
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto relative" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-xl bg-slate-100 text-slate-500 active:scale-95 font-black flex items-center justify-center"><Icon.X size={16}/></button>
                <div id="record-capture-area">
                <div className="flex items-start justify-between gap-2 mb-3 pr-10">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg text-white shrink-0" style={{ background: cfg.accent }}>{cfg.label}</span>
                            {kind === 'match' && m.opponentName && <span className="text-[11px] font-black text-indigo-500 truncate">vs {m.opponentName}</span>}
                        </div>
                        <p className="font-black text-slate-800 mt-1">{fmtMeetingDate(m.date)} · {m.start}~{m.end}</p>
                        {m.location && <p className="text-[11px] text-slate-400 truncate flex items-center gap-1"><Icon.MapPin size={11} className="flex-shrink-0"/><span className="truncate">{m.location}</span></p>}
                        {m.managerName && <p className="text-[11px] text-slate-400">담당 {m.managerName}</p>}
                    </div>
                </div>
                {hist ? (
                    <>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600">출석 {hist.present ?? '-'} / 전체 {hist.total ?? records.length}명</span>
                            {lateCount > 0 && <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600">지각 {lateCount}</span>}
                            {noShowCount > 0 && <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-rose-50 text-rose-500">노쇼 {noShowCount}</span>}
                        </div>
                        <div className="space-y-1.5">
                            {records.map((r, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 min-w-0">
                                    <div className="flex-1 min-w-0">
                                        <span className="font-black text-sm text-slate-700 break-words block">{r.name}</span>
                                        {r.reason && <span className="text-[10px] text-rose-400 font-black break-words block">사유: {r.reason}</span>}
                                    </div>
                                    {r.team && r.team !== '-' && <span className="text-[10px] font-black text-slate-400 shrink-0">{r.team}</span>}
                                    {r.checkInTime && r.checkInTime !== '미출석' && <span className="text-[10px] font-black text-slate-400 shrink-0">{r.checkInTime}</span>}
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ${stColor(r.status)}`}>{r.status}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-slate-400 py-6">
                        <div className="flex justify-center mb-1"><Icon.Clipboard size={28} className="text-slate-300"/></div>
                        <p className="text-xs font-black">저장된 출석 기록이 없습니다</p>
                        {kind === 'match' && <p className="text-[11px] mt-1">매칭 모임은 출석 기록을 저장하지 않습니다</p>}
                    </div>
                )}
                </div>
                {hist && (
                    <button onClick={captureRecord} className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"><Icon.Camera size={14}/>지각·노쇼 포함 출석 기록 이미지 저장</button>
                )}
                {hist && penaltyRecords.length > 0 && (
                    <button onClick={capturePenalty} className="w-full mt-2 py-2.5 rounded-xl bg-amber-50 text-amber-600 font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"><Icon.Camera size={14}/>지각·노쇼만 이미지 저장</button>
                )}
                {hist && penaltyRecords.length > 0 && (
                    <div id="penalty-capture-area" style={{ position: 'fixed', left: '-9999px', top: 0, width: '380px' }} className={`p-5 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <p className={`font-black text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>지각 · 노쇼 명단</p>
                        <p className="text-[11px] text-slate-400 mb-3">{fmtMeetingDate(m.date)} · {m.start}~{m.end}{m.location ? ` · ${m.location}` : ''}</p>
                        <p className="font-black" style={{ fontSize: '13px', marginBottom: '12px' }}>
                            {lateCount > 0 && <span className="text-amber-600">지각 {lateCount}</span>}
                            {lateCount > 0 && noShowCount > 0 && <span className="text-slate-300">{'   ·   '}</span>}
                            {noShowCount > 0 && <span className="text-rose-500">노쇼 {noShowCount}</span>}
                        </p>
                        <div className="space-y-1.5">
                            {penaltyRecords.map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '12px', background: darkMode ? '#0f172a' : '#f8fafc' }}>
                                    <span className="font-black text-sm text-slate-700" style={{ flex: 1, minWidth: 0, lineHeight: '20px', wordBreak: 'break-all' }}>{r.name}{r.reason ? <span className="font-black text-rose-400" style={{ fontSize: '11px', marginLeft: '6px' }}>· {r.reason}</span> : null}</span>
                                    {r.checkInTime && r.checkInTime !== '미출석' && <span className="font-black text-slate-400" style={{ fontSize: '11px', lineHeight: '20px' }}>{r.checkInTime}</span>}
                                    <span className="font-black" style={{ fontSize: '12px', lineHeight: '20px', whiteSpace: 'nowrap', color: r.status === '지각' ? '#d97706' : '#f43f5e' }}>{r.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {onFinalizePenalty && kind === 'self' && hist && penTargets.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1"><Icon.Banknote size={13}/>벌금 부과 {penFinalized && <span className="text-emerald-500 inline-flex items-center gap-1">· <Icon.CheckCircle size={12}/>발송됨</span>}</p>
                        {penFinalized ? (
                            <p className="text-[11px] text-slate-400">{new Date(hist.penaltyFinalizedAt).toLocaleDateString('ko-KR')} 납부 안내가 발송되었습니다.</p>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    {penTargets.map((r, i) => (
                                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-50 min-w-0">
                                            <span className="flex-1 min-w-0 font-black text-sm text-slate-700 truncate">{r.name}</span>
                                            <span className="text-[11px] font-black text-rose-500 shrink-0 w-16 text-right">{penAmt(r) ? penAmt(r).toLocaleString() + '원' : '-'}</span>
                                            <div className="flex gap-0.5 shrink-0">
                                                {[['none', '없음'], ['late', '지각'], ['noshow', '노쇼']].map(([v, l]) => (
                                                    <button key={v} onClick={() => setPenOverrides(o => ({ ...o, [r.memberId]: v }))}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${penResolve(r) === v ? (v === 'none' ? 'bg-slate-400 text-white' : v === 'late' ? 'bg-amber-400 text-white' : 'bg-rose-500 text-white') : 'bg-white text-slate-400 border border-slate-200'}`}>{l}</button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-2 px-1">
                                    <span className="text-[11px] font-black text-slate-500">합계</span>
                                    <span className="text-sm font-black text-rose-600">{penTotal.toLocaleString()}원</span>
                                </div>
                                <button onClick={doFinalizePenalty} disabled={penTotal === 0}
                                    className="w-full mt-2 py-2.5 rounded-xl bg-rose-500 text-white font-black text-sm active:scale-95 transition-all disabled:opacity-40">
                                    벌금 확정 · 납부 안내 발송
                                </button>
                                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">정상 출석했는데 체크 누락된 회원은 '없음'으로 바꾸세요. 발송하면 대상자에게 푸시가 가고, 회비 탭에서 납부할 수 있습니다.</p>
                            </>
                        )}
                    </div>
                )}
                {(onEdit || onDelete) && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                        {onEdit && <button onClick={() => { onEdit(m); onClose(); }}
                            className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-1"><Icon.Edit size={14}/>수정</button>}
                        {onDelete && <button onClick={() => { onDelete(m, hist); onClose(); }}
                            className="flex-1 py-2.5 rounded-xl bg-rose-50 text-rose-500 font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-1"><Icon.Trash size={14}/>삭제</button>}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── 종료 모임 기록 목록 (모임 탭 '기록' — 정기 / 매칭 분리, 관리자 전용) ──────────
const MeetingRecordsView = ({ meetings, attendHistory, darkMode, onEdit, onDelete, onFinalizePenalty }) => {
    const [kindTab, setKindTab] = React.useState('self');
    const [detail, setDetail] = React.useState(null);
    const histByDate = {};
    (attendHistory || []).forEach(h => { if (h && h.date) histByDate[h.date] = h; });
    const ended = (meetings || [])
        .filter(m => m && m.date && isMeetingEnded(m))
        .filter(m => kindTab === 'match' ? (m.meetingType || 'self') === 'match' : (m.meetingType || 'self') !== 'match')
        .sort((a, b) => b.date.localeCompare(a.date));
    return (
        <div className="space-y-3">
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl">
                {[['self', '정기'], ['match', '매칭']].map(([v, l]) => (
                    <button key={v} onClick={() => setKindTab(v)}
                        className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${kindTab === v ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'}`}>{l}</button>
                ))}
            </div>
            {ended.length === 0 ? (
                <div className="card rounded-2xl p-8 text-center text-slate-400">
                    <div className="flex justify-center mb-3 opacity-30"><Icon.Calendar size={36} /></div>
                    <p className="font-black text-sm">지난 {kindTab === 'match' ? '매칭' : '정기'} 모임 기록이 없습니다</p>
                </div>
            ) : ended.map(m => {
                const kind = (m.meetingType || 'self') === 'match' ? 'match' : 'self';
                const cfg = MEETING_KIND[kind];
                const hist = kind === 'self' ? histByDate[m.date] : null;
                return (
                    <button key={m.id} onClick={() => setDetail({ meeting: m, hist })}
                        className="w-full rounded-2xl p-4 text-left bg-white border border-slate-100 active:scale-98 transition-all"
                        style={darkMode ? { background: '#1e293b', borderColor: '#334155' } : {}}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.accent }} />
                                <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: cfg.accent }}>{cfg.label}</span>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">종료</span>
                            </div>
                            {hist && <span className="text-[11px] font-black text-teal-600 shrink-0">출석 {hist.present ?? '-'}/{hist.total ?? '-'}</span>}
                        </div>
                        <p className="font-black text-slate-800" style={darkMode ? { color: '#f1f5f9' } : {}}>{fmtMeetingDate(m.date)} · {m.start}~{m.end}</p>
                        {kind === 'match' && m.opponentName && <p className="text-xs font-black text-indigo-500 mt-0.5 truncate">vs {m.opponentName}</p>}
                        {m.location && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 min-w-0"><Icon.MapPin size={12} className="shrink-0" /><span className="truncate">{m.location}</span></p>}
                        {(onEdit || onDelete) && (
                            <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2.5 border-t" style={{borderColor: darkMode ? '#334155' : '#f1f5f9'}}>
                                {onEdit && <span role="button" onClick={(e)=>{ e.stopPropagation(); onEdit(m); }}
                                    className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 active:scale-95 cursor-pointer"><Icon.Edit size={12}/> 수정</span>}
                                {onDelete && <span role="button" onClick={(e)=>{ e.stopPropagation(); onDelete(m, hist); }}
                                    className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-rose-50 text-rose-500 active:scale-95 cursor-pointer"><Icon.Trash size={12}/> 삭제</span>}
                            </div>
                        )}
                    </button>
                );
            })}
            {detail && <RecordDetailModal detail={detail} onClose={() => setDetail(null)} onEdit={onEdit} onDelete={onDelete} onFinalizePenalty={onFinalizePenalty} darkMode={darkMode} />}
        </div>
    );
};

// ─── 모임 카드 목록 화면 (모임 탭 첫 화면 — 홈 카드와 같은 단색 카드 디자인) ──────
// MEETING_KIND·computeMeetingDay·fmtMeetingDate는 tab-home.js의 전역 정의를 재사용한다.
const MeetingListScreen = ({
    meetings, isAdminMode, onSelect,
    activeMeeting, handleSaveMeeting, handleDeleteMeeting, managers, showAlert,
    pendingEditMeeting, onPendingEditHandled,
    attendHistory, darkMode, onDeleteRecord, generateAttendQRCode, onFinalizePenalty,
    onCreateTestMeeting, onDeleteTestMeeting,
}) => {
    const [isManageOpen, setIsManageOpen] = React.useState(false);
    const [testOpen, setTestOpen] = React.useState(false);
    const [listView, setListView] = React.useState('upcoming'); // upcoming | ended(기록)
    const [pendingAction, setPendingAction] = React.useState(null); // 'add' | 'recurring' — 카드 화면에서 모달 바로 열기
    const [embeddedEdit, setEmbeddedEdit] = React.useState(null); // 기록 탭에서 [수정] → 카드 위에 수정 폼
    // 홈/상세 카드의 [수정] 버튼으로 넘어온 경우 → 관리 목록을 거치지 않고 수정 폼을 카드 위에 바로 연다
    React.useEffect(() => {
        if (pendingEditMeeting) { setEmbeddedEdit(pendingEditMeeting); onPendingEditHandled && onPendingEditHandled(); }
    }, [pendingEditMeeting]);

    // 예정: 종료 안 됐고(정기 done 아님) + 지난 날짜 아님 → 끝난 모임은 '기록'으로
    const upcoming = (meetings || [])
        .filter(m => m && m.date && !isMeetingEnded(m))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.meetingType||'self').localeCompare(b.meetingType||'self'));

    return (
        <div className="animate-in space-y-3">
            {isAdminMode && (
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest shrink-0">모임</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isManageOpen && (
                            <>
                                <button onClick={() => setPendingAction('recurring')}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] active:scale-95 transition-all"><Icon.Refresh size={13}/> 정기</button>
                                <button onClick={() => setPendingAction('add')}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 text-white rounded-xl font-black text-[11px] active:scale-95 transition-all shadow-sm"><Icon.Plus size={13}/> 추가</button>
                            </>
                        )}
                        <button onClick={() => setIsManageOpen(o => !o)}
                            className="flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl transition-all active:scale-95"
                            style={isManageOpen ? {background:'linear-gradient(135deg,var(--c-accent),var(--c-accent-deep))',color:'white'} : {background:'rgba(203,213,225,0.7)',color:'#64748b'}}>
                            <Icon.Settings size={13}/>{isManageOpen ? '관리 ON' : '관리'}
                        </button>
                        {!isManageOpen && (
                            <button onClick={() => setTestOpen(o => !o)}
                                className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-600 active:scale-95 transition-all"><Icon.Beaker size={14}/></button>
                        )}
                    </div>
                </div>
            )}
            {isAdminMode && !isManageOpen && testOpen && (
                <div className="rounded-2xl p-3 border border-amber-200 bg-amber-50/50">
                    <p className="text-[11px] font-black text-amber-700 mb-1 flex items-center gap-1"><Icon.Beaker size={12}/>테스트 모임</p>
                    <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">버튼 한 번으로 현재 시각 기준 모임 + 나 포함 랜덤 인원으로 팀편성·매치표까지 자동 생성합니다. [테스트 삭제]를 누르면 기록이 남지 않습니다.</p>
                    <div className="flex gap-2">
                        <button onClick={onCreateTestMeeting} className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-black text-xs active:scale-95 transition-all">생성</button>
                        <button onClick={onDeleteTestMeeting} className="flex-1 py-2 rounded-xl bg-rose-50 text-rose-500 font-black text-xs active:scale-95 transition-all border border-rose-200">테스트 삭제(흔적 없이)</button>
                    </div>
                </div>
            )}
            {isAdminMode && isManageOpen ? (
                <MeetingsTab
                    meetings={meetings} activeMeeting={activeMeeting}
                    handleSaveMeeting={handleSaveMeeting} handleDeleteMeeting={handleDeleteMeeting}
                    managers={managers} showAlert={showAlert}
                    onSelectMeeting={onSelect}
                    pendingEditMeeting={pendingEditMeeting} onPendingEditHandled={onPendingEditHandled}
                />
            ) : (
              <>
                {/* 예정 / 기록 전환 (관리자 전용) */}
                {isAdminMode && (
                    <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl">
                        {[['upcoming','예정'],['ended','기록']].map(([v,l]) => (
                            <button key={v} onClick={()=>setListView(v)}
                                className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${listView===v?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>{l}</button>
                        ))}
                    </div>
                )}
                {isAdminMode && listView === 'ended' ? (
                    <MeetingRecordsView meetings={meetings} attendHistory={attendHistory} darkMode={darkMode}
                        onEdit={(m) => setEmbeddedEdit(m)} onDelete={onDeleteRecord} onFinalizePenalty={onFinalizePenalty} />
                ) : upcoming.length === 0 ? (
                <div className="card rounded-2xl p-8 text-center text-slate-400">
                    <div className="flex justify-center mb-3 opacity-30"><Icon.Calendar size={36}/></div>
                    <p className="font-black text-sm">예정된 모임이 없습니다</p>
                    {isAdminMode && <p className="text-xs mt-1">[모임 관리]에서 모임을 등록하세요</p>}
                </div>
            ) : (
                upcoming.map(m => {
                    const kind = (m.meetingType || 'self') === 'match' ? 'match' : 'self';
                    const cfg = MEETING_KIND[kind];
                    const dayInfo = computeMeetingDay(m.date, m.start);
                    const _md = m.date ? new Date(m.date + 'T00:00:00') : null;
                    const _ok = _md && !isNaN(_md.getTime());
                    const dDay = _ok ? _md.getDate() : '';
                    const dMon = _ok ? ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'][_md.getMonth()] : '';
                    const dDow = _ok ? ['일','월','화','수','목','금','토'][_md.getDay()] : '';
                    return (
                        <button key={m.id} onClick={() => onSelect(m)}
                            className="w-full rounded-3xl p-5 text-left text-white active:scale-98 transition-all"
                            style={{ background: cfg.accent, boxShadow: `0 16px 34px -6px ${cfg.accent}66` }}>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-xs font-black uppercase tracking-widest text-white/80">{cfg.label}</p>
                                    {m.isTest && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/30 text-white flex-shrink-0"><Icon.Beaker size={11}/>테스트</span>}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {isAdminMode && kind === 'self' && generateAttendQRCode && (
                                        <span role="button" onClick={(e) => { e.stopPropagation(); generateAttendQRCode(m); }}
                                            className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-white/25 text-white active:scale-95 cursor-pointer">
                                            <Icon.QrCode size={12}/> QR
                                        </span>
                                    )}
                                    {dayInfo && dayInfo.type !== 'past' && dayInfo.label && (
                                        <span className={`text-xs font-black px-3 py-1 ${
                                            dayInfo.type === 'started' ? 'rounded-full bg-live text-[#15171E] moida-pulse-live' :
                                            dayInfo.urgent ? 'rounded-xl bg-white text-rose-500' :
                                            dayInfo.type === 'today' ? 'rounded-xl bg-white text-slate-700' :
                                            'rounded-xl bg-white/25 text-white'}`}>{dayInfo.label}</span>
                                    )}
                                </div>
                            </div>
                            {_ok ? (
                                <div className="flex items-end gap-3">
                                    <span className="font-black text-[84px] leading-[0.78] tracking-tight tabular-nums">{dDay}</span>
                                    <div className="pb-2">
                                        <p className="text-[13px] font-black text-white/60 tracking-wider leading-none">{dMon}</p>
                                        <p className="text-[22px] font-black leading-tight mt-1">{dDow}요일</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="font-black text-[28px] leading-none tracking-tight">{fmtMeetingDate(m.date)}</p>
                            )}
                            <p className="text-sm font-bold text-white/80 mt-2.5">{m.start} ~ {m.end}</p>
                            {kind === 'match' && m.opponentName && (
                                <p className="text-sm font-black text-white/90 mt-1 truncate">vs {m.opponentName}</p>
                            )}
                            {m.location && (
                                <p className="text-sm text-white/75 mt-1 flex items-center gap-1 min-w-0">
                                    <Icon.MapPin size={13} className="flex-shrink-0"/><span className="truncate">{m.location}</span>
                                </p>
                            )}
                            <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2" style={{borderColor:'rgba(255,255,255,0.22)'}}>
                                <span className="flex items-center gap-1.5 text-xs font-black text-white/80 min-w-0">
                                    <Icon.Users size={14} className="flex-shrink-0"/>
                                    <span className="truncate">{kind === 'match' ? `정원 남 ${m.maxMale||0} · 여 ${m.maxFemale||0}` : `최대 ${m.maxLimit||18}명`}</span>
                                </span>
                                {isAdminMode ? (
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span role="button" onClick={(e)=>{ e.stopPropagation(); setEmbeddedEdit(m); }}
                                            className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-white/25 text-white active:scale-95 cursor-pointer"><Icon.Edit size={12}/> 수정</span>
                                        <span role="button" onClick={(e)=>{ e.stopPropagation(); handleDeleteMeeting(m); }}
                                            className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-rose-500/80 text-white active:scale-95 cursor-pointer"><Icon.Trash size={12}/> 삭제</span>
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-0.5 text-xs font-black text-white flex-shrink-0">자세히 <Icon.ChevronRight size={14}/></span>
                                )}
                            </div>
                        </button>
                    );
                })
              )}
                {/* 모달 호스트 — 카드 화면에서 [정기]·[추가]가 모달을 바로 열도록 (관리자) */}
                {isAdminMode && (
                    <MeetingsTab embedded pendingAction={pendingAction} onPendingActionHandled={() => setPendingAction(null)}
                        pendingEditMeeting={embeddedEdit} onPendingEditHandled={() => setEmbeddedEdit(null)}
                        meetings={meetings} activeMeeting={activeMeeting}
                        handleSaveMeeting={handleSaveMeeting} handleDeleteMeeting={handleDeleteMeeting}
                        managers={managers} showAlert={showAlert} onSelectMeeting={onSelect} />
                )}
              </>
            )}
        </div>
    );
};

// ─── 모임 상세 상단 헤더 (뒤로가기 + 모임 요약) ──────────────────────────────────
const MeetingDetailHeader = ({ meeting, onBack }) => {
    const kind = (meeting.meetingType || 'self') === 'match' ? 'match' : 'self';
    const cfg = MEETING_KIND[kind];
    const dayInfo = computeMeetingDay(meeting.date, meeting.start);
    return (
        <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0 active:scale-95 transition-all">
                <Icon.ArrowLeft size={18}/>
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg text-white shrink-0" style={{background:cfg.accent}}>{cfg.label}</span>
                    {kind === 'match' && meeting.opponentName && <span className="text-[10px] font-black text-indigo-500 truncate">vs {meeting.opponentName}</span>}
                    {dayInfo && dayInfo.type !== 'past' && dayInfo.label && <span className="text-[10px] font-black text-slate-400 shrink-0">{dayInfo.label}</span>}
                </div>
                <p className="font-black text-slate-800 truncate mt-0.5">{fmtMeetingDate(meeting.date)} · {meeting.start}~{meeting.end}</p>
                {meeting.location && <p className="text-[11px] text-slate-400 truncate flex items-center gap-1"><Icon.MapPin size={11} className="flex-shrink-0"/><span className="truncate">{meeting.location}</span></p>}
            </div>
        </div>
    );
};

// ─── 출석 탭 ────────────────────────────────────────────────────────────────────
const TabAttend = ({
    isAdminMode,
    isAttendPanelOpen, setIsAttendPanelOpen,
    generateAttendQRCode, attendToggleTestMode, testMode,
    attendSubTab, setAttendSubTab,
    selectedHistoryDetail, setSelectedHistoryDetail,
    attendActiveList, attendIsPending,
    darkMode, meetingSettings, updateMeetingSettingsAdmin,
    attendActiveParticipants, snapMin, attendHourOptions, attendMinuteOptions,
    setIsLocationPickerOpen, localMaxLimit, setLocalMaxLimit,
    memberData, memberInfo, inTestPreview, attendNormalMembers, tmSessionData, activeMembers,
    attendToggleParticipant, setIsAttendGuestModalOpen,
    attendHandleTestSelect, attendHandleResetSelection,
    attendGuestEligibleMembers, attendToggleParticipantAsGuest,
    attendOpenAddGuest, attendOpenEditGuest, attendDeleteParticipant,
    attendCheckedInCount, attendWaitingList, attendGroupedTeams,
    setAttendModal, attendUnassignedActive, attendLimit, attendHistory,
    setHistorySortKey, setHistorySortOrder, historySortKey, historySortOrder,
    isEditingHistoryLocation, setIsEditingHistoryLocation,
    editHistoryLocationValue, setEditHistoryLocationValue,
    handleUpdateHistoryLocation, sortedHistoryRecords, setHistoryEditTarget,
    attendHandleDeleteHistory, mySession,
    qrStatus, qrMessage, setQrStatus, setIsQRScannerOpen,
    gpsStatus, distance, handleGPSCheckIn, handleGPSAttend,
    isCheckingIn, setGpsStatus,
    isKioskOpen, setIsKioskOpen, attendHandleCheckIn,
    isMeetingOver, attendHandleEndMeeting,
    viewMeeting, isViewActive, onEditMeeting,
    myRegistration, regConfirmedCount, myWaitingPosition, handleRegister, handleCancel, handleAbsent,
}) => {
    // 보고 있는 모임은 상위(member.html)에서 내려옴 — 모임 탭 카드에서 이미 선택된 모임
    const selectedMeeting = viewMeeting;
    const [isSelecting, setIsSelecting] = React.useState(false);
    const [selMonthlyStatuses, setSelMonthlyStatuses] = React.useState({});

    // 선택한 모임의 '그 달' 회비 상태(monthly_checks) 로드
    React.useEffect(() => {
        const d = selectedMeeting?.date;
        if (!d) { setSelMonthlyStatuses({}); return; }
        const [y, m] = d.split('-');
        const unsub = getCol('monthly_checks').doc(`${y}-${m}`).onSnapshot(doc => {
            setSelMonthlyStatuses(doc.exists ? (doc.data().statuses || {}) : {});
        }, () => {});
        return () => unsub();
    }, [selectedMeeting?.date]);
    // 내 회비 미납 여부 (이 모임 달 기준) + 관리자 차단 스위치
    const [duesBlock, setDuesBlock] = React.useState(false);
    React.useEffect(() => {
        const unsub = getCol('settings').doc('club_account').onSnapshot(d => setDuesBlock(d.exists ? !!d.data().blockUnpaid : false), () => {});
        return () => unsub();
    }, []);
    // 내 미납 벌금(지각/노쇼) — 완전 차단 (스위치 없음)
    const [penaltyUnpaid, setPenaltyUnpaid] = React.useState(0);
    const [penaltyTotal, setPenaltyTotal] = React.useState(0);
    React.useEffect(() => {
        const meId = memberInfo?.id;
        if (!meId) { setPenaltyUnpaid(0); setPenaltyTotal(0); return; }
        const unsub = getCol('penalties').where('memberId', '==', meId).onSnapshot(s => {
            const list = s.docs.map(d => d.data()).filter(p => p.status !== 'paid');
            setPenaltyUnpaid(list.length);
            setPenaltyTotal(list.reduce((a, p) => a + (p.amount || 0), 0));
        }, () => {});
        return () => unsub();
    }, [memberInfo?.id]);
    const myDuesUnpaid = React.useMemo(() => {
        const me = memberInfo;
        if (!me) return false;
        if (ADMIN_ROLES.includes(me.role) || STAFF_ROLES.includes(me.role)) return false;
        if (me.isSpecialRest) return false;
        const monthStr = selectedMeeting?.date?.substring(0,7) || '';
        const st = selMonthlyStatuses[me.id];
        if (st === 'paid' || st === 'rest') return false;
        const info = getMembershipStatus(me, monthStr);
        if (info?.active) return false;
        return true;
    }, [memberInfo, selMonthlyStatuses, selectedMeeting?.date]);
    // 다른 모임으로 바꾸면 선정 편집 모드 해제
    React.useEffect(() => { setIsSelecting(false); }, [selectedMeeting?.id]);

    // 선택한 모임 '그 달' 기준 회비 회원 / 특별휴식·휴식 회원 분류
    const { selEligibleNormal, selEligibleRest } = React.useMemo(() => {
        const monthStr = selectedMeeting?.date?.substring(0,7) || '';
        const normal = [], rest = [];
        (activeMembers || []).slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).forEach(member => {
            if (ADMIN_ROLES.includes(member.role)) { normal.push(member); return; }
            if (member.isSpecialRest) { rest.push(member); return; }
            const isResting = selMonthlyStatuses[member.id] === 'rest';
            if (isResting) { const info = getMembershipStatus(member, monthStr); if (info?.active) rest.push(member); return; }
            const isPaid = selMonthlyStatuses[member.id] === 'paid';
            const info = getMembershipStatus(member, monthStr);
            if (isPaid || info?.active) normal.push(member);
        });
        return { selEligibleNormal: normal, selEligibleRest: rest };
    }, [activeMembers, selMonthlyStatuses, selectedMeeting?.date]);

    // 선택한 모임에 선정된 회원 명단(weekly_session)
    const selSessionList = React.useMemo(() => {
        return (tmSessionData || [])
            .filter(p => sessionMatchesMeeting(p, selectedMeeting))
            .sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    }, [tmSessionData, selectedMeeting?.date, selectedMeeting?.meetingType]);

    // 모임 당일(출석 시작) + 현재 모임이면 관리자는 들어왔을 때 출석 현황(명단)을 바로 표시.
    // 활성 모임이 아니면 '출석 현황' 탭이 없으므로, 그 탭이 선택돼 있으면 명단으로 되돌린다.
    React.useEffect(() => {
        const di = computeMeetingDay(meetingSettings?.date, meetingSettings?.start);
        if (isAdminMode && isViewActive && (di?.type === 'today' || di?.type === 'started')) {
            setAttendSubTab('attend');
        } else if (!isViewActive) {
            setAttendSubTab(prev => prev === 'attend' ? 'roster' : prev);
        }
    }, [isViewActive, meetingSettings?.date]);

    // 현재 모임이면 회원은 항상, 관리자는 '출석체크' 서브탭일 때 체크인 UI 표시
    const showCheckin = isViewActive && (!isAdminMode || attendSubTab === 'checkin');

    return (
    <div className="animate-in space-y-4">

        {/* 관리자 패널 — 항상 표시 (출석 관리 토글 제거, 서브탭으로 직접 이동) */}
        {isAdminMode ? (
            <div>
                {/* 서브탭 */}
                <div className="flex gap-2 mb-4">
                    {[['roster','명단 관리'], ...(isViewActive ? [['attend','출석 현황'],['checkin','출석체크']] : []), ['history','기록']].map(([v,l]) => (
                        <button key={v} onClick={() => { setAttendSubTab(v); setSelectedHistoryDetail(null); }}
                            className={`px-3 py-2 rounded-xl font-black text-xs transition-all ${attendSubTab===v?'bg-teal-500 text-white shadow':'text-slate-400 bg-slate-100'}`}>{l}</button>
                    ))}
                    {attendSubTab === 'attend' && attendActiveList.length > 0 && (
                        <>
                            <div className="flex-1"/>
                            <button onClick={attendHandleEndMeeting}
                                disabled={attendIsPending || !isMeetingOver || attendHistory.some(h => h.date === meetingSettings?.date)}
                                className={`px-3 py-2 rounded-xl font-black text-xs transition-all disabled:opacity-30 ${attendHistory.some(h => h.date === meetingSettings?.date) ? 'bg-emerald-50 text-emerald-500' : isMeetingOver ? 'bg-rose-500 text-white active:scale-95' : 'bg-slate-100 text-slate-300'}`}>
                                {attendHistory.some(h => h.date === meetingSettings?.date) ? <span className="inline-flex items-center justify-center gap-1">저장 완료 <Icon.Check size={12}/></span> : '모임 종료'}
                            </button>
                        </>
                    )}
                </div>

                {/* ── 명단 관리 서브탭 — 지금 보고 있는 모임의 명단 작성 ── */}
                {attendSubTab === 'roster' && selectedMeeting && (
                    <div className="min-w-0">
                            <div>
                                {/* 헤더: 모임 정보 + 모임 종료 */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-black text-slate-800">{selectedMeeting.date}</p>
                                            {isViewActive && <span className="text-[10px] font-black bg-teal-500 text-white px-1.5 py-0.5 rounded-full">현재 모임</span>}
                                        </div>
                                        <p className="text-xs text-slate-400">{selectedMeeting.start} ~ {selectedMeeting.end}</p>
                                    </div>
                                    {isViewActive && (
                                        <button onClick={attendHandleEndMeeting}
                                            disabled={attendIsPending || !isMeetingOver || attendHistory.some(h => h.date === meetingSettings?.date)}
                                            className={`px-3 py-2 rounded-xl font-black text-xs transition-all disabled:opacity-30 ${attendHistory.some(h => h.date === meetingSettings?.date) ? 'bg-emerald-50 text-emerald-500' : isMeetingOver ? 'bg-rose-500 text-white active:scale-95' : 'bg-slate-100 text-slate-300'}`}>
                                            {attendHistory.some(h => h.date === meetingSettings?.date) ? <span className="inline-flex items-center justify-center gap-1">저장 완료 <Icon.Check size={12}/></span> : '모임 종료'}
                                        </button>
                                    )}
                                </div>

                                {/* sticky 인원 카운터 */}
                                <div style={{position:'sticky',top:0,zIndex:40,marginLeft:'-1rem',marginRight:'-1rem',marginBottom:16,padding:'10px 1rem',background:darkMode?'rgba(15,23,42,0.96)':'rgba(248,250,252,0.96)',backdropFilter:'blur(8px)',borderBottom:`1px solid ${darkMode?'#334155':'#e2e8f0'}`,boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
                                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                        <span style={{fontSize:10,fontWeight:900,color:'var(--c-sub)',textTransform:'uppercase',letterSpacing:'0.1em'}}>선정 인원</span>
                                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                                            <span style={{fontSize:15,fontWeight:900,color:selSessionList.length>=(selectedMeeting?.maxLimit||18)?'var(--c-accent)':darkMode?'#f1f5f9':'#1e293b'}}>
                                                {selSessionList.length} / {selectedMeeting?.maxLimit||18}명
                                            </span>
                                            {selSessionList.length>=(selectedMeeting?.maxLimit||18)&&<span style={{fontSize:9,fontWeight:900,padding:'2px 8px',background:'#dbe3f6',color:'var(--c-accent-deep)',borderRadius:6}}>마감</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* 모임 정보 (읽기 전용) — 수정은 [수정] 버튼 → 모임 수정 폼 */}
                                <div className="card border-slate-100 rounded-2xl p-4 mb-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-black text-teal-500 uppercase tracking-widest">모임 정보</p>
                                        <button onClick={() => onEditMeeting(selectedMeeting)}
                                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-500 text-xs font-black active:scale-95 transition-all">
                                            <Icon.Edit size={13}/> 수정
                                        </button>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-400 w-16 shrink-0">날짜</span>
                                            <span className="text-sm font-black text-slate-800 min-w-0 truncate">{selectedMeeting.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-400 w-16 shrink-0">유형</span>
                                            <span className="text-sm font-black text-slate-700 min-w-0 truncate">
                                                {selectedMeeting.meetingType === 'match'
                                                    ? <span>매칭{selectedMeeting.opponentName ? <span className="text-indigo-600"> vs {selectedMeeting.opponentName}</span> : ''}</span>
                                                    : '자체전'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-400 w-16 shrink-0">시간</span>
                                            <span className="text-sm font-black text-slate-700 min-w-0 truncate">{selectedMeeting.start} ~ {selectedMeeting.end}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-[11px] font-black text-slate-400 w-16 shrink-0 mt-0.5">장소</span>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-sm font-black text-slate-700">{selectedMeeting.location || '미지정'}</span>
                                                {selectedMeeting.locationLat && (
                                                    <a href={`https://map.kakao.com/link/map/${encodeURIComponent(selectedMeeting.location||'위치')},${selectedMeeting.locationLat},${selectedMeeting.locationLng}`}
                                                       target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-500 font-black underline ml-2 whitespace-nowrap inline-flex items-center gap-0.5">지도 <Icon.ChevronRight size={11}/></a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-400 w-16 shrink-0">GPS 반경</span>
                                            <span className="text-sm font-black text-slate-700 min-w-0 truncate">{selectedMeeting.locationRadius || 100}m</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-400 w-16 shrink-0">출석 방식</span>
                                            <span className="text-sm font-black text-slate-700 min-w-0 truncate">GPS{selectedMeeting.enableQR ? ' + QR' : ''}</span>
                                        </div>
                                        {selectedMeeting.meetingType === 'match' ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-slate-400 w-16 shrink-0">정원</span>
                                                <span className="text-sm font-black text-slate-700 min-w-0 truncate">남 {selectedMeeting.maxMale||0} · 여 {selectedMeeting.maxFemale||0} <span className="text-slate-400 font-medium">(총 {selectedMeeting.maxLimit||0}명)</span></span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-slate-400 w-16 shrink-0">{(selectedMeeting.isFirstComeFirstServed ?? true) ? '선착순 인원' : '최대 인원'}</span>
                                                <span className="text-sm font-black text-slate-700 min-w-0 truncate">{selectedMeeting.maxLimit || 18}명</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-400 w-16 shrink-0">담당</span>
                                            <span className="text-sm font-black text-slate-700 min-w-0 truncate">{selectedMeeting.managerName || '미지정'}</span>
                                        </div>
                                        {selectedMeeting.isRegistrationEnabled && (
                                            <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                                                <span className="text-[11px] font-black text-orange-400 w-16 shrink-0 mt-0.5">신청</span>
                                                <span className="text-xs font-black text-slate-600 min-w-0 flex-1">
                                                    {(selectedMeeting.isFirstComeFirstServed ?? true) ? '선착순 제한' : '전원 확정'}
                                                    {selectedMeeting.registrationOpenAt && <span className="text-slate-400 font-medium">{` · ${selectedMeeting.registrationOpenAt.replace('T',' ')} ~ ${(selectedMeeting.registrationCloseAt||'').replace('T',' ')}`}</span>}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 선정된 회원 명단(보기) ↔ 회원 선정(편집) */}
                                {!isSelecting ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-3 px-1">
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">선정된 회원 {selSessionList.length > 0 && <span className="text-teal-500">{selSessionList.length}명</span>}</p>
                                            <button onClick={()=>setIsSelecting(true)} className="shrink-0 px-3 py-1.5 bg-teal-50 text-teal-600 text-xs font-black rounded-xl flex items-center gap-1 active:scale-95 transition-all"><Icon.UserPlus size={12}/> 회원 선정</button>
                                        </div>
                                        {selSessionList.length === 0 ? (
                                            <div className="card border-slate-100 rounded-2xl p-5 text-center text-slate-400">
                                                <p className="text-xs font-black">아직 선정된 회원이 없습니다</p>
                                                <p className="text-[11px] mt-1">[회원 선정] 버튼으로 추가하세요</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selSessionList.filter(p=>!p.isGuest).map(p => (
                                                        <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-xs font-black text-slate-700">
                                                            {p.name}
                                                            {p.gender==='여성'&&<span className="text-[8px] px-1 py-0.5 bg-pink-100 text-pink-600 rounded">W</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                                {selSessionList.some(p=>p.isGuest) && (
                                                    <div>
                                                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5 px-1">특별휴식 · 게스트</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {selSessionList.filter(p=>p.isGuest).map(p => (
                                                                <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-xs font-black text-slate-700">
                                                                    {p.name}
                                                                    {p.gender==='여성'&&<span className="text-[8px] px-1 py-0.5 bg-pink-100 text-pink-600 rounded">W</span>}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {selectedMeeting.isRegistrationEnabled && (
                                            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl mb-3 text-xs font-black text-amber-600">
                                                <Icon.AlertTriangle size={14} className="flex-shrink-0"/>선착순 신청 진행 중 — 수동 편집 시 신청 카운터와 어긋날 수 있습니다
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-3 px-1 gap-2">
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest shrink-0">회원 선정</p>
                                            <div className="flex gap-1.5 flex-wrap justify-end min-w-0">
                                                {isViewActive && (
                                                    <>
                                                        <button onClick={()=>attendOpenAddGuest(selectedMeeting)} className="shrink-0 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-black rounded-xl flex items-center gap-1"><Icon.UserPlus size={12}/> 게스트</button>
                                                    </>
                                                )}
                                                <button onClick={()=>attendHandleResetSelection(selectedMeeting)} className="shrink-0 px-2.5 py-1.5 bg-red-50 text-red-500 text-xs font-black rounded-xl flex items-center gap-1"><Icon.RotateCcw size={12}/> 초기화</button>
                                                <button onClick={()=>setIsSelecting(false)} className="shrink-0 px-3 py-1.5 bg-teal-500 text-white text-xs font-black rounded-xl flex items-center gap-1 active:scale-95"><Icon.Check size={12}/> 완료</button>
                                            </div>
                                        </div>
                                        {selSessionList.some(p=>p.isGuest) && (
                                            <div className="card border-orange-100 rounded-2xl p-3 mb-3">
                                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 px-1">추가된 게스트 ({selSessionList.filter(p=>p.isGuest).length})</p>
                                                <div className="space-y-1.5">
                                                    {selSessionList.filter(p=>p.isGuest).map(p => (
                                                        <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200">
                                                            <span className="font-black text-sm text-slate-800 flex-1 min-w-0 truncate">{p.name}{p.gender==='여성'&&<span className="ml-1 text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}</span>
                                                            <span className="shrink-0 text-[9px] font-black text-slate-400">Lv.{p.level}</span>
                                                            {String(p.memberId||'').startsWith('guest_') && (
                                                                <button onClick={()=>attendOpenEditGuest(p)} className="shrink-0 px-2 py-1 bg-blue-50 text-blue-500 text-[11px] font-black rounded-lg flex items-center gap-1"><Icon.Edit size={11}/> 수정</button>
                                                            )}
                                                            <button onClick={()=>attendDeleteParticipant(p)} className="shrink-0 px-2 py-1 bg-red-50 text-red-500 text-[11px] font-black rounded-lg flex items-center gap-1"><Icon.Trash size={11}/> 삭제</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            {selEligibleNormal.map(member => {
                                                const isSelected = selSessionList.some(p=>p.memberId===member.id);
                                                return (
                                                    <button key={member.id} onClick={()=>attendToggleParticipant(member, selectedMeeting)}
                                                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${isSelected?'bg-teal-50 border-teal-300':'card border-slate-100 hover:border-slate-200'}`}>
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected?'bg-teal-500 border-teal-500':'border-slate-300'}`}>
                                                            {isSelected&&<Icon.Check size={10} className="text-white"/>}
                                                        </div>
                                                        <span className="font-black text-sm text-slate-800 flex-1 min-w-0 truncate">{member.name}</span>
                                                        {member.gender==='여성'&&<span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}
                                                        {ADMIN_ROLES.includes(member.role)&&<span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-lg font-black ${getRoleBadgeClass(member.role)}`}>{member.role}</span>}
                                                        <span className="shrink-0 text-[9px] font-black text-slate-400">Lv.{member.level}</span>
                                                    </button>
                                                );
                                            })}
                                            {selEligibleNormal.length === 0 && (
                                                <div className="card border-slate-100 rounded-2xl p-4 text-center text-slate-400 text-xs font-black">이 달 회비 납부 회원이 없습니다</div>
                                            )}
                                        </div>
                                        {selEligibleRest.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2 px-1">특별휴식 · 휴식 회원 (게스트 참여)</p>
                                                <div className="space-y-1.5">
                                                    {selEligibleRest.map(member => {
                                                        const isSelected = selSessionList.some(p=>p.memberId===member.id);
                                                        const _monthStr = selectedMeeting?.date?.substring(0,7)||'';
                                                        const msType = getMembershipStatus(member, _monthStr)?.type;
                                                        const badge = member.isSpecialRest ? '특별휴식' : (msType==='반년'?'반년납 휴식':'1년납 휴식');
                                                        const guestUsed = !member.isSpecialRest && tmSessionData.some(p=>p.memberId===member.id&&p.isGuest&&p.date&&p.date.substring(0,7)===_monthStr&&p.date!==selectedMeeting.date);
                                                        return (
                                                            <button key={member.id} onClick={()=>attendToggleParticipantAsGuest(member, selectedMeeting)}
                                                                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${isSelected?'bg-orange-50 border-orange-300':'card border-slate-100 hover:border-slate-200'}`}>
                                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected?'bg-orange-400 border-orange-400':'border-slate-300'}`}>
                                                                    {isSelected&&<Icon.Check size={10} className="text-white"/>}
                                                                </div>
                                                                <span className="font-black text-sm text-slate-800 flex-1 min-w-0 truncate">{member.name}</span>
                                                                {member.gender==='여성'&&<span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}
                                                                {guestUsed && <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-lg font-black">게스트 소진</span>}
                                                                <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-lg font-black">{badge}</span>
                                                                <span className="shrink-0 text-[9px] font-black text-slate-400">Lv.{member.level}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 출석 현황 요약 (현재 모임일 때만) */}
                                {isViewActive && (
                                    <div className="mt-6 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">출석 현황</p>
                                            {attendActiveList.length > 0 && (
                                                <button onClick={() => setIsKioskOpen(true)}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-black text-white flex items-center gap-1"
                                                    style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                                                    <Icon.Clipboard size={13}/> 키오스크
                                                </button>
                                            )}
                                        </div>
                                        <div className="card rounded-2xl p-4">
                                            <div className="flex gap-2 text-center">
                                                <div className="flex-1 bg-teal-50 rounded-xl p-2.5"><p className="text-xl font-black text-teal-500">{attendActiveList.length}</p><p className="text-[9px] text-teal-400">선정</p></div>
                                                <div className="flex-1 bg-emerald-50 rounded-xl p-2.5"><p className="text-xl font-black text-emerald-500">{attendCheckedInCount}</p><p className="text-[9px] text-emerald-400">출석</p></div>
                                                <div className="flex-1 bg-slate-50 rounded-xl p-2.5"><p className="text-xl font-black text-slate-500">{attendWaitingList.length}</p><p className="text-[9px] text-slate-400">대기</p></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                    </div>
                )}

                {/* ── 출석 서브탭 ── */}
                {attendSubTab === 'attend' && isViewActive && (
                    <div>
                        {/* 모임 정보 카드 */}
                        <div className="card rounded-2xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-xs font-black text-teal-500 uppercase tracking-widest">모임</p>
                                    <p className="text-lg font-black text-slate-800 mt-0.5">{meetingSettings?.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">{meetingSettings?.start}~{meetingSettings?.end}</p>
                                    {meetingSettings?.location&&<p className="text-xs font-black text-slate-600 mt-0.5 flex items-center justify-end gap-1"><Icon.MapPin size={12} className="flex-shrink-0"/><span className="truncate">{meetingSettings.location}</span></p>}
                                </div>
                            </div>
                            <div className="flex gap-2 text-center">
                                <div className="flex-1 bg-teal-50 rounded-xl p-2.5"><p className="text-xl font-black text-teal-500">{attendActiveList.length}</p><p className="text-[9px] text-teal-400">선정</p></div>
                                <div className="flex-1 bg-emerald-50 rounded-xl p-2.5"><p className="text-xl font-black text-emerald-500">{attendCheckedInCount}</p><p className="text-[9px] text-emerald-400">출석</p></div>
                                <div className="flex-1 bg-slate-50 rounded-xl p-2.5"><p className="text-xl font-black text-slate-500">{attendWaitingList.length}</p><p className="text-[9px] text-slate-400">대기</p></div>
                            </div>
                            {attendActiveList.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black text-slate-400">출석률</span>
                                        <span className="text-[10px] font-black text-emerald-500">{attendCheckedInCount}/{attendActiveList.length} · {Math.round(attendCheckedInCount/attendActiveList.length*100)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{width:`${Math.round(attendCheckedInCount/attendActiveList.length*100)}%`,background:attendCheckedInCount===0?'#e2e8f0':'linear-gradient(90deg,var(--c-accent),var(--c-success))'}}/>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 출석 현황 = 평범한 명단 (팀별 카드는 키오스크와 중복되어 비활성화 → 되돌리려면 아래 false 를 attendGroupedTeams.length > 0 로) */}
                        {false ? (
                            <div>
                                {attendGroupedTeams.map((group) => (
                                    <div key={group.teamName} className="mb-4">
                                        <div className={`flex items-center justify-between rounded-2xl p-3 mb-2 border ${getTeamCard(group.teamIdx)}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-8 h-8 rounded-xl text-sm font-black flex items-center justify-center ${getTeamBadge(group.teamIdx)} text-white`}>{group.teamName}</span>
                                                <div>
                                                    <p className="font-black text-slate-700 text-sm">{group.teamName}팀</p>
                                                    <p className="text-[10px] text-slate-400">출석 {group.members.filter(m=>m.checkedIn).length}/{group.members.length}명</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">{getTeamColorName(group.teamIdx)} 조끼</span>
                                        </div>
                                        <div className="grid gap-1.5" style={{gridTemplateColumns:`repeat(${group.members.length},1fr)`}}>
                                            {group.members.map(p => (
                                                <button key={p.id} onClick={() => setAttendModal({type:'checkin', data:{...p, teamIdx:group.teamIdx, teamName:group.teamName}})}
                                                    className={`relative overflow-hidden rounded-xl aspect-square flex items-center justify-center ${getTeamBadge(group.teamIdx)} text-white ${p.status==='노쇼'?'opacity-50':''}`}>
                                                    {p.checkedIn&&<div style={{position:'absolute',top:0,left:0,right:0,height:'4px',background:'rgba(255,255,255,0.55)'}}/>}
                                                    <div style={{position:'absolute',top:'4px',left:'6px',display:'flex',alignItems:'center',gap:'3px',pointerEvents:'none',userSelect:'none'}}>
                                                        <span style={{fontSize:'1.6em',fontWeight:'900',opacity:0.55,lineHeight:1}}>{p.jerseyNumber}</span>
                                                        {p.gender==='여성'&&<span style={{fontSize:'8px',fontWeight:'900',padding:'1px 3px',borderRadius:3,background:'#ec4899',color:'white',lineHeight:1}}>W</span>}
                                                        {p.isGuest&&<span style={{fontSize:'8px',fontWeight:'900',padding:'1px 3px',borderRadius:3,background:'rgba(0,0,0,0.3)',color:'white',lineHeight:1}}>G</span>}
                                                    </div>
                                                    <p className="relative font-black text-[17px] text-center" style={{lineHeight:'1.2',wordBreak:'keep-all',maxWidth:'90%'}}>{p.name}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {attendUnassignedActive.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-2">미편성 / 게스트</p>
                                        <div className="space-y-1.5">
                                            {attendUnassignedActive.map(p => (
                                                <button key={p.id} onClick={() => setAttendModal({type:'checkin', data:p})}
                                                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${p.status==='노쇼'?'bg-red-50 border-red-200':p.checkedIn?'bg-emerald-50 border-emerald-200':'card border-slate-100'}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-black text-sm text-slate-800">{p.name}</span>
                                                            {p.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                                            {p.isGuest&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-800 text-white rounded-lg">G</span>}
                                                        </div>
                                                        {p.status==='노쇼'?<p className="text-[10px] text-red-600 font-black mt-0.5 flex items-center gap-1"><Icon.X size={11} className="flex-shrink-0"/>노쇼{p.noShowReason ? (' · ' + p.noShowReason) : ''}</p>:p.checkedIn?<p className={`text-[10px] font-black mt-0.5 flex items-center gap-1 ${p.status==='지각'?'text-yellow-600':'text-emerald-600'}`}>{p.status==='지각'?<><Icon.AlertTriangle size={11} className="flex-shrink-0"/>지각</>:<><Icon.Check size={11} className="flex-shrink-0"/>정상</>} · {p.checkInTime}</p>:null}
                                                    </div>
                                                    {p.status==='노쇼'?<span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white"><Icon.X size={13}/></span>:p.checkedIn?<span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0"><Icon.Check size={12} className="text-white"/></span>:<span className="text-xs font-black text-slate-300 flex-shrink-0 inline-flex items-center gap-0.5">체크인 <Icon.ChevronRight size={12}/></span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : attendActiveList.length > 0 ? (
                            <div className="space-y-1.5">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-2">출석 명단 ({attendLimit}명 선착순)</p>
                                {attendActiveList.map((p, idx) => (
                                    <button key={p.id} onClick={() => setAttendModal({type:'checkin', data:p})}
                                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${p.status==='노쇼'?'bg-red-50 border-red-200':p.checkedIn?'bg-emerald-50 border-emerald-200':'card border-slate-100'}`}>
                                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center flex-shrink-0">{idx+1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black text-sm text-slate-800">{p.name}</span>
                                                {p.gender==='여성'&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg">W</span>}
                                                {p.isGuest&&<span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-800 text-white rounded-lg">G</span>}
                                            </div>
                                            {p.status==='노쇼'?<p className="text-[10px] text-red-600 font-black mt-0.5 flex items-center gap-1"><Icon.X size={11} className="flex-shrink-0"/>노쇼{p.noShowReason ? (' · ' + p.noShowReason) : ''}</p>:p.checkedIn?<p className={`text-[10px] font-black mt-0.5 flex items-center gap-1 ${p.status==='지각'?'text-yellow-600':'text-emerald-600'}`}>{p.status==='지각'?<><Icon.AlertTriangle size={11} className="flex-shrink-0"/>지각</>:<><Icon.Check size={11} className="flex-shrink-0"/>정상</>} · {p.checkInTime}</p>:null}
                                        </div>
                                        {p.status==='노쇼'?<span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white"><Icon.X size={13}/></span>:p.checkedIn?<span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0"><Icon.Check size={12} className="text-white"/></span>:<span className="text-xs font-black text-slate-300 flex-shrink-0 inline-flex items-center gap-0.5">체크인 <Icon.ChevronRight size={12}/></span>}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-300">
                                <div className="flex justify-center mb-3"><Icon.Clipboard size={40} className="text-slate-300"/></div>
                                <p className="font-black">선정된 인원이 없습니다</p>
                                <p className="text-xs mt-1">선정 탭에서 인원을 추가하세요</p>
                            </div>
                        )}
                        {attendWaitingList.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-2">대기자</p>
                                {attendWaitingList.map((p,i) => (
                                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 mb-1.5">
                                        <span className="text-xs font-black text-slate-400 w-5">{attendLimit+i+1}</span>
                                        <span className="text-sm font-black text-slate-400">{p.name}</span>
                                        {p.isGuest&&<span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded-lg font-black">G</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── 기록 서브탭 ── */}
                {attendSubTab === 'history' && !selectedHistoryDetail && (
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">출결 기록</p>
                        {attendHistory.length === 0
                            ? <div className="text-center py-12 text-slate-300"><div className="flex justify-center mb-3"><Icon.Book size={40} className="text-slate-300"/></div><p className="font-black">기록이 없습니다</p></div>
                            : attendHistory.map(h => (
                                <button key={h.id} onClick={()=>{setSelectedHistoryDetail(h);setHistorySortKey('time');setHistorySortOrder('asc');}}
                                    className="w-full flex items-center justify-between p-4 card border-slate-100 rounded-2xl mb-2 text-left hover:border-teal-200 transition-all">
                                    <div>
                                        <p className="font-black text-slate-800">{h.date}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{h.meetingTime} · {h.location}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-teal-500">{h.present}명 출석</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">총 {h.total}명</p>
                                    </div>
                                </button>
                            ))
                        }
                    </div>
                )}
                {attendSubTab === 'history' && selectedHistoryDetail && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={()=>setSelectedHistoryDetail(null)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><Icon.ArrowLeft size={18}/></button>
                            <div className="flex-1">
                                <p className="font-black text-slate-800">{selectedHistoryDetail.date}</p>
                                <p className="text-xs text-slate-400">{selectedHistoryDetail.meetingTime}</p>
                            </div>
                            <button onClick={attendHandleDeleteHistory} className="p-2 rounded-xl bg-red-50 text-red-400"><Icon.Trash size={16}/></button>
                        </div>
                        <div className="card border-slate-100 rounded-2xl p-4 mb-4">
                            <div className="grid grid-cols-3 gap-3 text-center mb-4">
                                <div><p className="text-xl font-black text-teal-500">{selectedHistoryDetail.present}</p><p className="text-[10px] text-slate-400">출석</p></div>
                                <div><p className="text-xl font-black text-slate-700">{selectedHistoryDetail.total}</p><p className="text-[10px] text-slate-400">전체</p></div>
                                <div><p className="text-xl font-black text-slate-400">{selectedHistoryDetail.total-selectedHistoryDetail.present}</p><p className="text-[10px] text-slate-400">미출석</p></div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <Icon.MapPin size={12} className="text-slate-400"/>
                                {isEditingHistoryLocation
                                    ? <><input style={{userSelect:'text'}} className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-1" value={editHistoryLocationValue} onChange={e=>setEditHistoryLocationValue(e.target.value)}/>
                                        <button onClick={handleUpdateHistoryLocation} className="shrink-0 text-xs px-2 py-1 bg-teal-500 text-white rounded-lg">저장</button>
                                        <button onClick={()=>setIsEditingHistoryLocation(false)} className="shrink-0 text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">취소</button></>
                                    : <><span className="text-xs text-slate-600 flex-1 min-w-0 truncate">{selectedHistoryDetail.location}</span>
                                        {selectedHistoryDetail.locationLat && (
                                            <a href={`https://map.kakao.com/link/map/${encodeURIComponent(selectedHistoryDetail.location||'위치')},${selectedHistoryDetail.locationLat},${selectedHistoryDetail.locationLng}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 font-black mr-1 underline">지도</a>
                                        )}
                                        <button onClick={()=>{setEditHistoryLocationValue(selectedHistoryDetail.location||'');setIsEditingHistoryLocation(true);}} className="shrink-0 p-1 text-slate-300 hover:text-slate-500"><Icon.Edit2 size={12}/></button></>
                                }
                            </div>
                        </div>
                        <div className="flex gap-2 mb-3">
                            {[['time','시간순'],['status','상태순']].map(([k,l]) => (
                                <button key={k} onClick={()=>{if(historySortKey===k&&k==='status')setHistorySortOrder(o=>o==='asc'?'desc':'asc');setHistorySortKey(k);}}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${historySortKey===k?'bg-teal-500 text-white':'card border-slate-200 text-slate-500'}`}>
                                    <span className="inline-flex items-center gap-0.5">{l}{historySortKey===k&&k==='status'&&(historySortOrder==='asc'?<Icon.ArrowUp size={11}/>:<Icon.ArrowDown size={11}/>)}</span>
                                </button>
                            ))}
                        </div>
                        {sortedHistoryRecords.map((record) => {
                            const sc = record.status==='정상'?'text-emerald-500':record.status==='지각'?'text-yellow-500':record.status==='노쇼'?'text-red-400':'text-slate-400';
                            return (
                                <div key={record.originalIndex} className="flex items-center justify-between p-3.5 card border-slate-100 rounded-2xl mb-1.5">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="font-black text-sm text-slate-800">{record.name}</span>
                                            {record.type==='게스트'&&<span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-lg font-black">G</span>}
                                            {record.type==='대기자'&&<span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-lg font-black">대기</span>}
                                            {record.checkInTime&&record.checkInTime!=='미출석'&&<p className="text-[10px] text-slate-400 mt-0.5">{record.checkInTime}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black ${sc}`}>{record.status}</span>
                                        <button onClick={()=>setHistoryEditTarget({docId:selectedHistoryDetail.id,recordIndex:record.originalIndex})} className="p-1 text-slate-300 hover:text-slate-500"><Icon.Edit2 size={12}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        ) : null}

        {/* 아직 차례가 오지 않은(다음다음) 모임 → 안내만 표시 */}
        {!isAdminMode && !isViewActive && (
            <div className="card rounded-2xl p-6 text-center text-slate-400">
                <p className="text-3xl mb-2">⏳</p>
                <p className="font-black text-sm text-slate-500">아직 차례가 오지 않은 모임입니다</p>
                <p className="text-xs mt-1">이 모임이 가장 가까운 모임이 되면<br/>신청·출석 기능이 여기에 열립니다</p>
            </div>
        )}

        {/* 선착순 신청 카드 (관리자 패널 닫혔을 때만) */}
        {showCheckin && (
            <RegistrationCard
                meetingSettings={meetingSettings}
                myRegistration={myRegistration}
                regConfirmedCount={regConfirmedCount}
                myWaitingPosition={myWaitingPosition}
                handleRegister={handleRegister}
                handleCancel={handleCancel}
                handleAbsent={handleAbsent}
                duesUnpaid={myDuesUnpaid}
                duesBlock={duesBlock}
                penaltyUnpaid={penaltyUnpaid}
                penaltyTotal={penaltyTotal}
                isPreview={inTestPreview}
            />
        )}

        {/* 회원 출석 체크인 UI (①출석완료 ②QR결과 ③GPS·QR버튼 ④GPS결과) — CheckInPanel 공유 컴포넌트(F-1) */}
        {showCheckin && (
            <CheckInPanel
                compact={false}
                mySession={mySession} meetingSettings={meetingSettings}
                gpsStatus={gpsStatus} distance={distance} setGpsStatus={setGpsStatus}
                handleGPSCheckIn={handleGPSCheckIn} handleGPSAttend={handleGPSAttend} isCheckingIn={isCheckingIn}
                qrStatus={qrStatus} qrMessage={qrMessage} setQrStatus={setQrStatus} setIsQRScannerOpen={setIsQRScannerOpen}
            />
        )}

        {/* 직접 출석(키오스크) — 관리자 전용, 현재 모임 + 선정 인원 있을 때 */}
        {isAdminMode && isViewActive && attendActiveList.length > 0 && (
            <button onClick={() => setIsKioskOpen(true)}
                className="w-full rounded-2xl p-4 text-white active:scale-98 transition-all flex items-center gap-3"
                style={{ minHeight:'96px', background:'linear-gradient(135deg,#f97316,#ea580c)', boxShadow:'0 10px 28px -8px rgba(234,88,12,0.45)' }}>
                <Icon.CheckSq size={34} className="text-white shrink-0"/>
                <div className="min-w-0 text-left flex-1">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/80">관리자 · 직접 출석</p>
                    <p className="font-black text-base leading-tight">키오스크 모드 열기</p>
                    <p className="text-xs text-white/75 mt-0.5 truncate">회원이 직접 이름을 탭해 출석 처리</p>
                </div>
                <Icon.ChevronRight size={20} className="text-white/80 shrink-0"/>
            </button>
        )}

        <KioskModal
            isKioskOpen={isKioskOpen}
            setIsKioskOpen={setIsKioskOpen}
            attendGroupedTeams={attendGroupedTeams}
            attendActiveList={attendActiveList}
            attendCheckedInCount={attendCheckedInCount}
            meetingSettings={meetingSettings}
            attendHandleCheckIn={attendHandleCheckIn}
            setAttendModal={setAttendModal}
        />
    </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────
