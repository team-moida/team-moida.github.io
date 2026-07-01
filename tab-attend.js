// ─── 키오스크 실시간 시계 (지각 시간=시작 9분 전 지나면 주황색) ──────────────────────
const KioskClock = ({ meetingSettings }) => {
    // 정상 마감 시각 = 모임 시작 - 9분 (handlers-attend.js attendHandleCheckIn 기준과 동일). 이후는 '지각'.
    const lateAt = React.useMemo(() => {
        const dt = meetingSettings?.date, st = meetingSettings?.start;
        if (!dt || !st) return null;
        const [y, m, d] = dt.split('-'); const [hh, mm] = st.split(':');
        const start = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh) || 0, parseInt(mm) || 0, 0);
        return start.getTime() - 9 * 60 * 1000;
    }, [meetingSettings?.date, meetingSettings?.start]);
    const calc = () => {
        const n = new Date(); const pad = (x) => String(x).padStart(2, '0');
        return { t: `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`, late: lateAt != null && n.getTime() > lateAt };
    };
    const [st, setSt] = React.useState(calc);
    React.useEffect(() => { const id = setInterval(() => setSt(calc()), 1000); return () => clearInterval(id); }, [lateAt]);
    return <span style={{fontVariantNumeric:'tabular-nums', color: st.late ? '#f59e0b' : '#0f172a', transition:'color .4s'}}>{st.t}</span>;
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
    attendHandleCheckIn, attendHandleUncheckIn, setAttendModal,
}) => {
    const [confirmTarget, setConfirmTarget] = React.useState(null);
    const [flash, setFlash] = React.useState(null);   // 출석 완료 휘발성 표시(잠깐 떴다 자동으로 사라짐)
    const [flashClosing, setFlashClosing] = React.useState(false);   // 사라질 때 페이드아웃용
    const flashRef = React.useRef(null);   // 최신 flash 대상(연속 체크인 경합 판별)
    if (!isKioskOpen) return null;

    const closePopup = () => setConfirmTarget(null);
    const handleConfirm = async () => {
        const who = confirmTarget;
        closePopup();
        const ok = await attendHandleCheckIn(who, {silent:true});   // 키오스크는 자체 팝업으로 끝 — '출석 완료' 모달 중복 방지
        if (!ok) return;   // 출석 불가(시간 아님·종료 등)면 '출석 완료' 표시 안 함
        flashRef.current = who;
        setFlashClosing(false);
        setFlash(who);
        setTimeout(() => { if (flashRef.current === who) setFlashClosing(true); }, 1600);   // 1.6초 뒤 페이드 시작(이후 다른 체크인이면 유지)
        setTimeout(() => { if (flashRef.current === who) { flashRef.current = null; setFlash(null); setFlashClosing(false); } }, 1900);   // 페이드(0.28초) 뒤 실제 제거
    };
    const teamBadgeClass = confirmTarget?.teamIdx != null ? getTeamBadge(confirmTarget.teamIdx) : 'bg-teal-500';
    const teamColorLabel = confirmTarget?.teamIdx != null ? getTeamColorName(confirmTarget.teamIdx) : '';

    return (
        <div className="fixed inset-0 z-50 flex flex-col" style={{background:'#f8fafc',overscrollBehavior:'none',fontFamily:"'Pretendard Variable', Pretendard, sans-serif"}}>
            <KioskScrollLock />
            {/* 상단 바 */}
            <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'max(14px, env(safe-area-inset-top)) 16px 16px',flexShrink:0,position:'relative'}}>
                {/* 상단: 라벨 + 닫기 */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <p style={{color:'#94a3b8',fontWeight:900,fontSize:'0.8rem',letterSpacing:'0.06em'}}>직접 출석</p>
                    <button onClick={() => setIsKioskOpen(false)}
                        style={{width:'40px',height:'40px',borderRadius:'12px',background:'#f1f5f9',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',fontWeight:900,flexShrink:0}}>
                        <Icon.X size={20}/>
                    </button>
                </div>
                {/* 가운데: 날짜 + 큰 시계(지각 시간이면 주황) + 출석 수 */}
                <div style={{textAlign:'center',marginTop:'2px'}}>
                    <p style={{color:'#475569',fontWeight:900,fontSize:'1.05rem'}}>{meetingSettings?.date}</p>
                    <p style={{fontSize:'clamp(3rem,14vw,6rem)',fontWeight:900,marginTop:'2px',lineHeight:1,letterSpacing:'0.01em'}}><KioskClock meetingSettings={meetingSettings} /></p>
                    <p style={{color:'#64748b',fontSize:'0.9rem',marginTop:'10px',fontWeight:700}}><span style={{color:'var(--c-accent-deep)',fontWeight:900}}>{attendCheckedInCount}명 출석</span> / {attendActiveList.length}명</p>
                </div>
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
                                        onClick={() => setConfirmTarget({...p, teamIdx:group.teamIdx, teamName:group.teamName})}
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
                                            <span style={{fontSize:(String(p.jerseyNumber ?? '').length >= 2 ? '78cqw' : '110cqw'),fontWeight:900,lineHeight:1,color:'rgba(255,255,255,0.3)'}}>{p.jerseyNumber}</span>
                                        </div>
                                        {/* 이름 — 정중앙, 번호 위에 (게스트 배지는 우상단으로 분리 → 이름 중앙정렬 유지) */}
                                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',pointerEvents:'none',userSelect:'none'}}>
                                            <span style={{fontWeight:900,fontSize:'clamp(1.5rem, 5.2vw, 3rem)',textAlign:'center',wordBreak:'keep-all',lineHeight:1.1,textShadow:'0 1px 4px rgba(0,0,0,0.35)'}}>{p.name}</span>
                                        </div>
                                        {p.isGuest && <span style={{position:'absolute',top:'5px',right:'8px',fontSize:'clamp(0.95rem, 2.7vw, 1.8rem)',fontWeight:900,lineHeight:1,color:/text-slate/.test(getTeamBadge(group.teamIdx))?'#1e293b':'#ffffff',pointerEvents:'none',userSelect:'none'}}>G</span>}
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
                                    onClick={() => setConfirmTarget({...p, jerseyNumber:idx+1})}
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
                                    <div style={{position:'absolute',bottom:'10px',left:0,right:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',userSelect:'none'}}>
                                        <span style={{fontWeight:900,fontSize:'clamp(1rem, 4.5vw, 2.2rem)',textAlign:'center',wordBreak:'keep-all',lineHeight:1.2,paddingLeft:'4px',paddingRight:'4px'}}>{p.name}</span>
                                    </div>
                                    {p.isGuest && <span style={{position:'absolute',top:'7px',right:'11px',fontSize:'clamp(0.9rem, 2.4vw, 1.6rem)',fontWeight:900,lineHeight:1,color:'#ffffff',pointerEvents:'none',userSelect:'none'}}>G</span>}
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
            {/* 확인 팝업 — 박스 전체가 조끼색. 밝은 조끼(연두·노랑)는 글자색 자동 보정. 출석한 회원은 출석취소 분기 */}
            {confirmTarget && (() => {
                const lightTeam = /text-slate/.test(teamBadgeClass);   // getTeamBadge가 밝은 조끼엔 text-slate-800을 줌
                const txt = lightTeam ? '#1e293b' : '#ffffff';
                const txtSoft = lightTeam ? 'rgba(30,41,59,0.72)' : 'rgba(255,255,255,0.9)';
                const okBg = lightTeam ? '#1e293b' : '#ffffff';
                const okFg = lightTeam ? '#ffffff' : '#15171E';
                const subBg = lightTeam ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)';
                const isIn = !!confirmTarget.checkedIn;
                const shadow = lightTeam ? 'none' : '0 2px 12px rgba(0,0,0,0.25)';
                return (
                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:10,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}
                    onClick={closePopup}>
                    <div className={teamBadgeClass} style={{borderRadius:'28px',overflow:'hidden',width:'100%',maxWidth:'340px',boxShadow:'0 25px 50px rgba(0,0,0,0.4)'}}
                        onClick={e => e.stopPropagation()}>
                        <div style={{padding:'30px 24px 24px',textAlign:'center',userSelect:'none'}}>
                            <p style={{fontSize:'0.82rem',fontWeight:900,color:txtSoft,marginBottom:'16px'}}>
                                {isIn ? '이미 출석 완료된 회원이에요' : (confirmTarget.teamName ? '조끼 색상·번호 확인 후 착용해 주세요' : '출석 처리할까요?')}
                            </p>
                            {confirmTarget.jerseyNumber && (
                                <div style={{fontSize:'5.5rem',fontWeight:900,lineHeight:1,marginBottom:'6px',color:txt,textShadow:shadow}}>
                                    {confirmTarget.jerseyNumber}
                                </div>
                            )}
                            <p style={{fontSize:'2.2rem',fontWeight:900,color:txt,lineHeight:1.2,marginBottom:'8px',wordBreak:'keep-all',textShadow:shadow}}>{confirmTarget.name}</p>
                            {confirmTarget.teamName
                                ? <p style={{fontSize:'1.05rem',fontWeight:900,color:txtSoft,marginBottom: isIn?'6px':'24px'}}>{confirmTarget.teamName}팀 · {teamColorLabel} 조끼</p>
                                : <div style={{marginBottom: isIn?'6px':'24px'}}/>
                            }
                            {isIn && (
                                <p style={{fontSize:'0.95rem',fontWeight:900,color:txtSoft,marginBottom:'24px'}}>출석 완료{confirmTarget.checkInTime?` · ${confirmTarget.checkInTime}`:''}</p>
                            )}
                            {isIn ? (
                                <div>
                                    <button onClick={closePopup}
                                        style={{width:'100%',height:'56px',borderRadius:'16px',background:okBg,color:okFg,fontWeight:900,fontSize:'1rem',border:'none',cursor:'pointer'}}
                                        className="active:scale-95 transition-all">확인</button>
                                    <button onClick={() => { attendHandleUncheckIn && attendHandleUncheckIn(confirmTarget); closePopup(); }}
                                        style={{marginTop:'14px',background:'none',border:'none',cursor:'pointer',color:txtSoft,fontWeight:800,fontSize:'0.8rem',textDecoration:'underline',width:'100%'}}
                                        className="active:scale-95 transition-all">출석 취소</button>
                                </div>
                            ) : (
                                <div style={{display:'flex',gap:'10px'}}>
                                    <button onClick={closePopup}
                                        style={{flex:1,height:'56px',borderRadius:'16px',background:subBg,color:txt,fontWeight:900,fontSize:'1rem',border:'none',cursor:'pointer'}}
                                        className="active:scale-95 transition-all">취소</button>
                                    <button onClick={handleConfirm}
                                        style={{flex:1,height:'56px',borderRadius:'16px',background:okBg,color:okFg,fontWeight:900,fontSize:'1rem',border:'none',cursor:'pointer'}}
                                        className="active:scale-95 transition-all">확인</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                );
            })()}
            {/* 출석 완료 휘발성 표시 — 확인 직후 잠깐 떴다 자동으로 사라짐(닫기 버튼 없음) */}
            {flash && (() => {
                const fBadge = flash.teamIdx != null ? getTeamBadge(flash.teamIdx) : 'bg-teal-500';
                const fLight = /text-slate/.test(fBadge);
                const fTxt = fLight ? '#1e293b' : '#ffffff';
                const fSoft = fLight ? 'rgba(30,41,59,0.78)' : 'rgba(255,255,255,0.92)';
                const fColor = flash.teamIdx != null ? getTeamColorName(flash.teamIdx) : '';
                return (
                    <div style={{position:'absolute',inset:0,zIndex:9,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',pointerEvents:'none'}}
                        className={flashClosing ? 'pop-out' : 'animate-fade-in'}>
                        <div className={`${fBadge}${flashClosing ? ' pop-card-out' : ''}`} style={{borderRadius:'28px',width:'100%',maxWidth:'320px',padding:'36px 24px',textAlign:'center',boxShadow:'0 25px 50px rgba(0,0,0,0.4)'}}>
                            <div style={{width:'76px',height:'76px',borderRadius:'50%',background:fLight?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                                <Icon.Check size={46} style={{color:fTxt}}/>
                            </div>
                            <p style={{fontSize:'2rem',fontWeight:900,color:fTxt,lineHeight:1.2,marginBottom:'6px',wordBreak:'keep-all'}}>{flash.name}</p>
                            {flash.teamName
                                ? <p style={{fontSize:'1.05rem',fontWeight:900,color:fSoft}}>{flash.teamName}팀 · {fColor} 조끼{flash.jerseyNumber?` · ${flash.jerseyNumber}번`:''}</p>
                                : (flash.jerseyNumber ? <p style={{fontSize:'1.05rem',fontWeight:900,color:fSoft}}>{flash.jerseyNumber}번</p> : null)}
                            <p style={{fontSize:'1.15rem',fontWeight:900,color:fTxt,marginTop:'10px'}}>출석 완료!</p>
                        </div>
                    </div>
                );
            })()}
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
const RegistrationCard = ({ meetingSettings, myRegistration, regConfirmedCount, myWaitingPosition, handleRegister, handleCancel, handleAbsent, handleUndoAbsent, duesUnpaid, duesBlock, penaltyUnpaid = 0, penaltyTotal = 0, isPreview }) => {
    const { useState, useRef, useEffect } = React;
    const [absentConfirm, setAbsentConfirm] = useState(false);
    const [absentReason, setAbsentReason] = useState('');
    const [donePopup, setDonePopup] = useState(null);   // 신청 완료 팝업 {type:'confirmed'|'waiting', pos}
    const [doneClosing, setDoneClosing] = useState(false);  // 신청 완료 팝업 닫힘(페이드아웃) 상태
    const [cancelAsk, setCancelAsk] = useState(false);  // 신청 취소 확인 팝업
    const [justApplied, setJustApplied] = useState(false);
    const prevStatus = useRef(myRegistration?.status || null);
    // 신청 직후 myRegistration이 확정/대기로 잡히면 완료 팝업(+순번) 표시
    useEffect(() => {
        const cur = myRegistration?.status || null;
        if (justApplied && !prevStatus.current && (cur === 'confirmed' || cur === 'waiting')) {
            setDonePopup(cur === 'waiting'
                ? { type: 'waiting', pos: myWaitingPosition }
                : { type: 'confirmed', pos: regConfirmedCount });
            setJustApplied(false);
        }
        prevStatus.current = cur;
    }, [myRegistration && myRegistration.status, regConfirmedCount, myWaitingPosition, justApplied]);
    // 신청 완료 팝업 스르륵 닫기 — 페이드아웃 애니메이션(.28s) 후 언마운트
    const closeDone = () => { setDoneClosing(true); setTimeout(() => { setDonePopup(null); setDoneClosing(false); }, 300); };
    const onApplyClick = () => {
        if (isPreview) { setDonePopup({ type: 'confirmed', pos: (regConfirmedCount || 0) + 1 }); return; }
        setJustApplied(true);
        handleRegister && handleRegister();
    };

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
    // 홈 탭/LAB와 동일: 단계별 라벨·색 (불참=amber / 노쇼=진주황 / 당일노쇼=빨강)
    const absentBtnCls = absentFine === 20000 ? 'bg-red-500 text-white' : absentFine === 10000 ? 'bg-orange-600 text-white' : 'bg-amber-500 text-white';
    const absentBtnLabel = absentType === 'noshow_2' ? '당일 노쇼 신청' : absentFine > 0 ? '노쇼 신청' : '불참 신청';
    const absentFineLabel = absentType === 'noshow_2' ? '당일 노쇼 · 벌금 2만원' : absentFine > 0 ? '노쇼 · 벌금 1만원' : '미리 알리면 벌금 없음';
    // 불참/노쇼 취소(다시 신청) 가능 여부 — 불참·노쇼 상태이고, 아직 모임 시간 구간 안일 때
    const undoAbsentOk = (myRegistration?.status === 'absent' || myRegistration?.status === 'noshow') && typeof getAbsentType === 'function' && !!getAbsentType(meetingSettings.date, meetingSettings.end);

    return (
        <>
        <div className="card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-black text-orange-500 uppercase tracking-widest shrink-0">{isMatch ? '매칭 신청' : (isFirstComeFirstServed ? '선착순 신청' : '모임 신청')}</p>
                {isMatch ? (
                    <span className="inline-flex items-center gap-1.5 font-black rounded-full px-3 py-1.5 leading-none text-[12.5px]" style={{background:'#e7edfa', color:'#122E78'}}>
                        <Icon.Users size={13} className="opacity-80 flex-shrink-0"/>남 <b className="text-[15px]">{confMale}</b>/{maxMale} · 여 <b className="text-[15px]">{confFemale}</b>/{maxFemale}
                    </span>
                ) : isFirstComeFirstServed ? (
                    myRegistration?.status === 'waiting' ? (
                        <span className="inline-flex items-center gap-1.5 font-black rounded-full px-3 py-1.5 leading-none text-[13px]" style={{background:'#fef0c7', color:'#92400e'}}>
                            <Icon.Clock size={13} className="opacity-80 flex-shrink-0"/>대기 <b className="text-[15px]">{myWaitingPosition}</b>번
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 font-black rounded-full px-3 py-1.5 leading-none text-[13px]" style={{background:'#e7edfa', color:'#122E78'}}>
                            <Icon.Users size={13} className="opacity-80 flex-shrink-0"/><b className="text-[15px]">{regConfirmedCount}</b> / {maxLimit}명
                        </span>
                    )
                ) : null}
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
                        <button onClick={onApplyClick}
                            className="w-full py-3.5 rounded-2xl font-black text-[15px] text-white active:scale-95 transition-transform"
                            style={{ background:'#f97316', boxShadow:'0 10px 22px -10px rgba(249,115,22,.5)' }}>
                            신청하기{isPreview ? ' (미리보기)' : ''}
                        </button>
                    )}
                </>
            )}

            {isOpen && (myRegistration?.status === 'confirmed' || (myRegistration?.status === 'waiting' && (isFirstComeFirstServed || isMatch))) && (
                <button onClick={() => setCancelAsk(true)}
                    className="w-full py-2.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm active:scale-95">
                    신청 취소
                </button>
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
                                    {absentType === 'noshow_2'
                                        ? '당일 노쇼로 처리됩니다.\n벌금 2만원이 부과됩니다.'
                                        : absentFine > 0
                                        ? '노쇼로 처리됩니다.\n벌금 1만원이 부과됩니다.'
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
                                <p className="text-[11px] text-slate-400 text-center mt-1.5">못 가게 됐다면 · {absentFineLabel}</p>
                            </div>
                        )
                    )}
                    {undoAbsentOk && (
                        <>
                            <button onClick={() => isPreview ? alert('미리보기에서는 취소가 되지 않아요.') : (handleUndoAbsent && handleUndoAbsent())}
                                className="w-full py-2.5 rounded-2xl font-black text-sm active:scale-95 bg-teal-500 text-white">
                                {myRegistration?.status === 'noshow' ? '노쇼 취소 (다시 신청)' : '불참 취소 (다시 신청)'}
                            </button>
                            <p className="text-[11px] text-slate-400 text-center">취소하면 대기 여부와 상관없이 맨 뒤로 다시 신청돼요</p>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* 신청 완료 팝업 (+내 순번) */}
        {donePopup && (
            <div className={`fixed inset-0 z-[70] flex items-center justify-center p-6 ${doneClosing ? 'pop-out' : 'animate-in'}`}
                style={{ background:'rgba(15,23,42,.46)', backdropFilter:'blur(2px)' }}
                onClick={closeDone}>
                <div className={`bg-white rounded-3xl p-7 pt-8 max-w-[320px] w-full text-center ${doneClosing ? 'pop-card-out' : ''}`}
                    style={{ boxShadow:'0 30px 70px -22px rgba(0,0,0,.45)' }}
                    onClick={e => e.stopPropagation()}>
                    <div className="w-[66px] h-[66px] rounded-full mx-auto mb-4 flex items-center justify-center text-white"
                        style={{ background: donePopup.type === 'waiting' ? '#F59E0B' : '#183FB0' }}>
                        {donePopup.type === 'waiting' ? <Icon.Clock size={32}/> : <Icon.Check size={34}/>}
                    </div>
                    <p className="text-[13px] font-black text-slate-400">{donePopup.type === 'waiting' ? '대기 신청 완료' : '신청 완료'}</p>
                    <p className="text-[32px] font-black text-slate-900 mt-1 mb-0.5">
                        {donePopup.type === 'waiting'
                            ? <>대기 <span style={{color:'#F59E0B'}}>{donePopup.pos}</span>번</>
                            : <>참가 <span style={{color:'#f97316'}}>{donePopup.pos}</span>번째</>}
                    </p>
                    <p className="text-[12.5px] font-bold text-slate-400 mt-1 leading-relaxed whitespace-pre-line">
                        {donePopup.type === 'waiting'
                            ? '정원이 차서 대기로 등록됐어요.\n자리가 나면 자동으로 확정돼요.'
                            : `선착순 ${donePopup.pos} / ${maxLimit}명으로 신청됐어요.`}
                    </p>
                    <button onClick={closeDone}
                        className="mt-5 w-full py-3.5 rounded-2xl text-white font-black text-[15px] active:scale-95"
                        style={{ background:'#f97316' }}>확인</button>
                </div>
            </div>
        )}

        {/* 신청 취소 확인 팝업 (재신청 시 순번 밀림 안내) */}
        {cancelAsk && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 animate-in"
                style={{ background:'rgba(15,23,42,.46)', backdropFilter:'blur(2px)' }}
                onClick={() => setCancelAsk(false)}>
                <div className="bg-white rounded-3xl p-7 pt-8 max-w-[320px] w-full text-center"
                    style={{ boxShadow:'0 30px 70px -22px rgba(0,0,0,.45)' }}
                    onClick={e => e.stopPropagation()}>
                    <div className="w-[66px] h-[66px] rounded-full mx-auto mb-4 flex items-center justify-center text-white"
                        style={{ background:'#F59E0B' }}>
                        <span className="text-[34px] font-black leading-none">!</span>
                    </div>
                    <p className="text-[18px] font-black text-slate-900">신청을 취소할까요?</p>
                    <div className="mt-3.5 text-left text-[12px] font-bold leading-relaxed rounded-2xl px-3.5 py-3"
                        style={{ background:'#fff7ed', border:'1px solid #fed7aa', color:'#9a3412' }}>
                        지금 취소하면 다시 신청할 때 <b className="whitespace-nowrap">순번이 맨 뒤로 밀려요.</b> 정원이 찼다면 대기로 넘어갈 수 있어요.
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={() => setCancelAsk(false)}
                            className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-black text-[14.5px] active:scale-95">그대로 둘게요</button>
                        <button onClick={() => { setCancelAsk(false); handleCancel && handleCancel(); }}
                            className="flex-1 py-3.5 rounded-2xl text-white font-black text-[14.5px] active:scale-95"
                            style={{ background:'#EF4444' }}>신청 취소</button>
                    </div>
                </div>
            </div>
        )}
        </>
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
                const hist = kind === 'self' ? histByDate[m.date] : null;
                const _md = m.date ? new Date(m.date + 'T00:00:00') : null;
                const _ok = _md && !isNaN(_md.getTime());
                const dDay = _ok ? _md.getDate() : '';
                const dMon = _ok ? ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'][_md.getMonth()] : '';
                const dDow = _ok ? ['일','월','화','수','목','금','토'][_md.getDay()] : '';
                const isMatch = kind === 'match';
                const dMonShort = dMon ? dMon.slice(0, 3) : '';
                const chipBg = isMatch ? '#C2F94A' : '#183FB0';
                const chipFg = isMatch ? '#15171E' : '#ffffff';
                const meta = `${dDow} ${m.start}~${m.end}${m.location ? ` · ${m.location}` : ''}${isMatch && m.opponentName ? ` · vs ${m.opponentName}` : ''}`;
                return (
                    <div key={m.id} className="card rounded-2xl overflow-hidden">
                        <button onClick={() => setDetail({ meeting: m, hist })} className="w-full flex items-center gap-3 p-3 text-left active:scale-98 transition-all">
                            {/* 날짜 칩 (정기=인디고 / 매칭=라임) */}
                            <div className="flex-shrink-0 w-[58px] h-[58px] rounded-2xl flex flex-col items-center justify-center" style={{ background: chipBg, color: chipFg }}>
                                {_ok ? (
                                    <><span className="text-[22px] font-black leading-none tabular-nums">{dDay}</span>
                                    <span className="text-[10px] font-black mt-0.5 tracking-wider" style={{ opacity: .9 }}>{dMonShort}</span></>
                                ) : <Icon.Calendar size={22}/>}
                            </div>
                            {/* 제목 + 종료 배지 + 메타 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-[15px] text-slate-800">{isMatch ? '매칭' : '정기모임'}</span>
                                    {m.isTest && <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-600"><Icon.Beaker size={9}/>테스트</span>}
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">종료</span>
                                </div>
                                <p className="text-[12.5px] font-bold text-slate-500 mt-1 truncate">{meta}</p>
                            </div>
                            {/* 출석 인원 (정기만) */}
                            {hist && (
                                <div className="flex-shrink-0 text-center pl-1">
                                    <p className="text-[20px] font-black leading-none tabular-nums text-teal-600">{hist.present ?? '-'}</p>
                                    <p className="text-[10px] font-black text-slate-400 mt-0.5">출석</p>
                                </div>
                            )}
                        </button>
                        {(onEdit || onDelete) && (
                            <div className="flex items-center justify-end gap-1.5 px-3 pb-2.5">
                                {onEdit && <span role="button" onClick={(e)=>{ e.stopPropagation(); onEdit(m); }}
                                    className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-500 active:scale-95 cursor-pointer"><Icon.Edit size={12}/> 수정</span>}
                                {onDelete && <span role="button" onClick={(e)=>{ e.stopPropagation(); onDelete(m, hist); }}
                                    className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-rose-50 text-rose-500 active:scale-95 cursor-pointer"><Icon.Trash size={12}/> 삭제</span>}
                            </div>
                        )}
                    </div>
                );
            })}
            {detail && <RecordDetailModal detail={detail} onClose={() => setDetail(null)} onEdit={onEdit} onDelete={onDelete} onFinalizePenalty={onFinalizePenalty} darkMode={darkMode} />}
        </div>
    );
};

// ─── 모임 카드 목록 화면 (모임 탭 첫 화면 — 홈 카드와 같은 단색 카드 디자인) ──────
// 삭제한 모임 보관함 — soft-deleted 모임 목록(복원/영구삭제). 예정·종료 가리지 않고 삭제된 모임 전부.
const MeetingArchiveView = ({ rows, onRestore, onPurge }) => {
    if (!rows || rows.length === 0) return (
        <div className="card rounded-2xl p-8 text-center text-slate-400">
            <div className="flex justify-center mb-3 opacity-30"><Icon.Trash size={34}/></div>
            <p className="font-black text-sm">보관함이 비어 있어요</p>
            <p className="text-xs mt-1">삭제한 모임이 여기 모여요</p>
        </div>
    );
    return (
        <div className="space-y-2">
            <p className="text-[11px] font-black text-slate-400 px-1">삭제한 모임 {rows.length}개 · 복원하면 모임 목록에 다시 나타나요</p>
            <div className="card rounded-2xl overflow-hidden">
                {rows.map((m, i) => {
                    const isMatch = (m.meetingType || 'self') === 'match';
                    const _md = m.date ? new Date(m.date + 'T00:00:00') : null;
                    const _ok = _md && !isNaN(_md.getTime());
                    const dd = _ok ? _md.getDate() : '–';
                    const sub = _ok ? `${_md.getMonth() + 1}월 ${['일','월','화','수','목','금','토'][_md.getDay()]}` : '';
                    const meta = `${m.start || ''}${m.location ? ` · ${m.location}` : ''}${isMatch && m.opponentName ? ` · vs ${m.opponentName}` : ''}`;
                    return (
                        <div key={m.id} className={`flex items-center gap-2.5 px-3.5 py-3 ${i>0?'border-t border-slate-100':''}`}>
                            <div className="flex-shrink-0 w-10 text-center opacity-70">
                                <p className="text-[16px] font-black text-slate-500 leading-none tabular-nums">{dd}</p>
                                <p className="text-[9.5px] font-black text-slate-400 mt-0.5">{sub}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-black text-slate-600 truncate">{isMatch ? '매칭' : '정기모임'}{m.isTest ? ' · 테스트' : ''}</p>
                                <p className="text-[11px] font-bold text-slate-400 truncate">{meta || '시간 미정'}</p>
                            </div>
                            <span role="button" onClick={() => onRestore(m)} className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-600 active:scale-95 cursor-pointer flex-shrink-0"><Icon.Refresh size={12}/>복원</span>
                            <span role="button" onClick={() => onPurge(m)} className="text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-500 active:scale-95 cursor-pointer flex-shrink-0">영구삭제</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
// MEETING_KIND·computeMeetingDay·fmtMeetingDate는 tab-home.js의 전역 정의를 재사용한다.
const MeetingListScreen = ({
    meetings, isAdminMode, onSelect,
    activeMeeting, handleSaveMeeting, handleDeleteMeeting, managers, members, showAlert,
    pendingEditMeeting, onPendingEditHandled,
    attendHistory, darkMode, onDeleteRecord, generateAttendQRCode, onFinalizePenalty,
    onCreateTestMeeting, onDeleteTestMeeting, onDeleteOneTest,
    deletedMeetings, onRestoreMeeting, onPurgeMeeting,
}) => {
    const [listView, setListView] = React.useState('upcoming'); // upcoming | ended(기록) | archive(보관함)
    // 삭제한 모임 보관함 — soft-deleted 모임(예정·종료 무관), 최신순
    const archivedRows = React.useMemo(() => (deletedMeetings || []).slice()
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')), [deletedMeetings]);
    // 테스트 모임 = 개발자 모드 전용 (운영진 모드에선 숨김). localStorage 직접 판정 — 모드 전환 시 reload되므로 항상 최신.
    const isDevMode = (() => { try { return localStorage.getItem('moida_dev') === '1' && (localStorage.getItem('moida_view_mode') || 'dev') === 'dev'; } catch(e) { return false; } })();
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
                        <button onClick={() => setPendingAction('recurring')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] active:scale-95 transition-all"><Icon.Refresh size={13}/> 정기</button>
                        <button onClick={() => setPendingAction('add')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 text-white rounded-xl font-black text-[11px] active:scale-95 transition-all shadow-sm"><Icon.Plus size={13}/> 추가</button>
                        {isDevMode && (
                            <button onClick={onCreateTestMeeting}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-xl font-black text-[11px] active:scale-95 transition-all shadow-sm"><Icon.Beaker size={13}/> 테스트</button>
                        )}
                    </div>
                </div>
            )}
            {isDevMode && (meetings || []).some(m => m.isTest) && (
                <button onClick={onDeleteTestMeeting}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 text-rose-500 font-black text-[11px] border border-rose-200 active:scale-95 transition-all">
                    <Icon.Trash size={12}/> 테스트 모임 모두 삭제 ({(meetings || []).filter(m => m.isTest).length}개)
                </button>
            )}
            <>
                {/* 예정 / 기록 전환 (관리자 전용) */}
                {isAdminMode && (
                    <>
                    <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl">
                        {[['upcoming','예정'],['ended','기록'],['archive', archivedRows.length>0 ? `보관함 ${archivedRows.length}` : '보관함']].map(([v,l]) => (
                            <button key={v} onClick={()=>setListView(v)}
                                className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${listView===v?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>{l}</button>
                        ))}
                    </div>
                    {listView==='upcoming' && <p className="text-[11px] font-black text-slate-400 px-1">· '기록'은 운영진(회장·매니저·총무·부총무)만 보여요</p>}
                    {listView==='archive' && <p className="text-[11px] font-black text-slate-400 px-1">· 삭제한 모임이 모여요. 복원하면 통계·기록에 다시 포함돼요</p>}
                    </>
                )}
                {isAdminMode && listView === 'ended' ? (
                    <MeetingRecordsView meetings={meetings} attendHistory={attendHistory} darkMode={darkMode}
                        onEdit={(m) => setEmbeddedEdit(m)} onDelete={onDeleteRecord} onFinalizePenalty={onFinalizePenalty} />
                ) : isAdminMode && listView === 'archive' ? (
                    <MeetingArchiveView rows={archivedRows} onRestore={onRestoreMeeting} onPurge={onPurgeMeeting} />
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
                    const isMatch = kind === 'match';
                    const dMonShort = dMon ? dMon.slice(0, 3) : '';
                    const chipBg = isMatch ? '#C2F94A' : '#183FB0';
                    const chipFg = isMatch ? '#15171E' : '#ffffff';
                    const meta = `${dDow} ${m.start}${m.location ? ` · ${m.location}` : ''}${isMatch && m.opponentName ? ` · vs ${m.opponentName}` : ''}`;
                    const countNum = isMatch ? ((m.maxMale || 0) + (m.maxFemale || 0)) : (m.maxLimit || 18);
                    const mgrLabel = getManagerLabel(m, members);
                    return (
                        <div key={m.id} className="card rounded-2xl overflow-hidden">
                            <button onClick={() => onSelect(m)} className="w-full flex items-center gap-3 p-3 text-left active:scale-98 transition-all">
                                {/* 날짜 칩 (정기=인디고 / 매칭=라임) */}
                                <div className="flex-shrink-0 w-[58px] h-[58px] rounded-2xl flex flex-col items-center justify-center" style={{ background: chipBg, color: chipFg }}>
                                    {_ok ? (
                                        <><span className="text-[22px] font-black leading-none tabular-nums">{dDay}</span>
                                        <span className="text-[10px] font-black mt-0.5 tracking-wider" style={{ opacity: .9 }}>{dMonShort}</span></>
                                    ) : <Icon.Calendar size={22}/>}
                                </div>
                                {/* 제목 + 상태 + 메타 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-black text-[15px] text-slate-800">{isMatch ? '매칭' : '정기모임'}</span>
                                        {m.isTest && <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-600"><Icon.Beaker size={9}/>테스트</span>}
                                        {dayInfo && dayInfo.type === 'started'
                                            ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">LIVE</span>
                                            : (dayInfo && dayInfo.label && dayInfo.type !== 'past') && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${dayInfo.urgent ? 'bg-rose-50 text-rose-500' : dayInfo.type === 'today' ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>{dayInfo.label}</span>}
                                    </div>
                                    <p className="text-[12.5px] font-bold text-slate-500 mt-1 truncate">{meta}</p>
                                    {mgrLabel && <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">담당 {mgrLabel}</p>}
                                </div>
                                {/* 정원 */}
                                <div className="flex-shrink-0 text-center pl-1">
                                    <p className="text-[20px] font-black leading-none tabular-nums text-teal-600">{countNum}</p>
                                    <p className="text-[10px] font-black text-slate-400 mt-0.5">정원</p>
                                </div>
                            </button>
                            {isAdminMode && (
                                <div className="flex items-center justify-end gap-1.5 px-3 pb-2.5">
                                    {kind === 'self' && generateAttendQRCode && (
                                        <span role="button" onClick={(e) => { e.stopPropagation(); generateAttendQRCode(m); }}
                                            className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-500 active:scale-95 cursor-pointer"><Icon.QrCode size={12}/> QR</span>
                                    )}
                                    <span role="button" onClick={(e) => { e.stopPropagation(); setEmbeddedEdit(m); }}
                                        className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-slate-100 text-slate-500 active:scale-95 cursor-pointer"><Icon.Edit size={12}/> 수정</span>
                                    <span role="button" onClick={(e) => { e.stopPropagation(); (m.isTest && onDeleteOneTest) ? onDeleteOneTest(m) : handleDeleteMeeting(m); }}
                                        className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-rose-50 text-rose-500 active:scale-95 cursor-pointer"><Icon.Trash size={12}/> 삭제</span>
                                </div>
                            )}
                        </div>
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
        </div>
    );
};

// ─── 회원용 모임 카드 (목록에서 탭하면 그 자리 펼침 — 간단정보 + 신청/취소) ──────────
// 운영진 상세(출석/팀/매치 섹션)와 별개. 회원은 일정 보고 신청까지만, 진행 정보는 홈이 담당.
const MemberMeetingCard = ({ meeting, memberData, open, onToggle, onGoHome, showToast, showAlert, showConfirm }) => {
    const kind = (meeting.meetingType || 'self') === 'match' ? 'match' : 'self';
    const isMatch = kind === 'match';
    const dayInfo = computeMeetingDay(meeting.date, meeting.start);
    const isLive = !!(dayInfo && dayInfo.type === 'started');
    const isLiveOrToday = !!(dayInfo && (dayInfo.type === 'started' || dayInfo.type === 'today'));
    // 날짜 칩 (정기=인디고 / 매칭=라임 — 종류 기준 고정)
    const _md = meeting.date ? new Date(meeting.date + 'T00:00:00') : null;
    const _ok = _md && !isNaN(_md.getTime());
    const dDay = _ok ? _md.getDate() : '';
    const dMon = _ok ? ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'][_md.getMonth()] : '';
    const dDow = _ok ? ['일','월','화','수','목','금','토'][_md.getDay()] : '';
    const dMonShort = dMon ? dMon.slice(0, 3) : '';
    const chipBg = isMatch ? '#C2F94A' : '#183FB0';
    const chipFg = isMatch ? '#15171E' : '#ffffff';
    const meta = `${dDow} ${meeting.start || ''}${meeting.location ? ` · ${meeting.location}` : ''}`;

    // 내 신청 상태 구독
    const _meId = memberData?.memberId;
    const regEnabled = !!meeting?.isRegistrationEnabled;
    const showRegBlock = regEnabled && !!_meId;
    const [myReg, setMyReg] = React.useState(null);
    React.useEffect(() => {
        if (!showRegBlock || !meeting?.date) { setMyReg(null); return; }
        const mid = (typeof getMeetingId === 'function') ? getMeetingId(meeting) : meeting.date;
        const unsub = getCol('registrations').doc(`${mid}_${_meId}`)
            .onSnapshot(d => setMyReg(d.exists ? (d.data() || null) : null), () => setMyReg(null));
        return () => unsub();
    }, [showRegBlock, _meId, meeting?.date, meeting?.meetingType]);

    // 현재 인원 (weekly_session 직접 집계 · 노쇼 제외)
    const [liveCount, setLiveCount] = React.useState(null);
    React.useEffect(() => {
        if (!meeting?.date || !open) { setLiveCount(null); return; }   // 펼쳤을 때만 구독(목록 부하↓)
        const _mid = (typeof getMeetingId === 'function') ? getMeetingId(meeting) : meeting.date;
        const unsub = getCol('weekly_session').where('date', '==', meeting.date)
            .onSnapshot(snap => {
                const n = snap.docs.map(d => d.data())
                    .filter(p => p.status !== '노쇼' && (p.meetingId ? p.meetingId === _mid : !String(_mid).endsWith('__match'))).length;
                setLiveCount(n);
            }, () => setLiveCount(null));
        return () => unsub();
    }, [meeting?.date, meeting?.meetingType, open]);
    const maxLimit = isMatch ? ((meeting.maxMale || 0) + (meeting.maxFemale || 0)) : (meeting.maxLimit || 18);
    const curCount = (liveCount != null) ? liveCount : 0;

    const regHandlers = React.useMemo(() => (showRegBlock && typeof makeRegistrationHandlers === 'function')
        ? makeRegistrationHandlers({ meetingDate: meeting.date, memberData, meetingSettings: meeting, showToast, showAlert, showConfirm })
        : null, [showRegBlock, _meId, meeting?.date, meeting?.meetingType]);

    // 신청 창(열림/마감)
    const _now = Date.now();
    const _regOpenMs = meeting?.registrationOpenAt ? new Date(meeting.registrationOpenAt).getTime() : null;
    const _regCloseMs = meeting?.registrationCloseAt ? new Date(meeting.registrationCloseAt).getTime() : null;
    const regBeforeOpen = _regOpenMs && _now < _regOpenMs;
    const regAfterClose = _regCloseMs && _now > _regCloseMs;

    // 불참/노쇼 (마감 후 + 확정 상태일 때 시간 구간 판정)
    const absentType = (regAfterClose && myReg?.status === 'confirmed' && typeof getAbsentType === 'function')
        ? getAbsentType(meeting.date, meeting.end) : null;
    const absentFine = absentType === 'noshow_1' ? 10000 : absentType === 'noshow_2' ? 20000 : 0;
    const isNoshowStage = absentType === 'noshow_1' || absentType === 'noshow_2';
    const absentColor = absentFine === 20000 ? '#EF4444' : absentFine === 10000 ? '#EA580C' : '#F59E0B';
    const undoAbsentOk = (myReg?.status === 'absent' || myReg?.status === 'noshow') && typeof getAbsentType === 'function' && !!getAbsentType(meeting.date, meeting.end);

    const [cancelAsk, setCancelAsk] = React.useState(false);
    const [absentAsk, setAbsentAsk] = React.useState(false);
    const [absentReason, setAbsentReason] = React.useState('');
    const onAbsentConfirm = () => { if (regHandlers) regHandlers.handleAbsent(absentReason.trim()); setAbsentAsk(false); setAbsentReason(''); };

    // 헤더 상태 칩
    const hChip = isLive ? { t: '진행 중', style: { background: '#C2F94A', color: '#15171E' } }
        : myReg?.status === 'confirmed' ? { t: '신청 완료', style: { background: '#dcfce7', color: '#15803d' } }
        : myReg?.status === 'waiting' ? { t: `대기 ${myReg.waitingNumber || ''}`, style: { background: '#fef3c7', color: '#b45309' } }
        : myReg?.status === 'noshow' ? { t: '노쇼', style: { background: '#fee2e2', color: '#b91c1c' } }
        : myReg?.status === 'absent' ? { t: '불참', style: { background: '#f1f5f9', color: '#64748b' } }
        : regAfterClose ? { t: '마감', style: { background: '#f1f5f9', color: '#94a3b8' } }
        : regBeforeOpen ? { t: '신청 예정', style: { background: '#eef2fb', color: '#122E78' } }
        : { t: (dayInfo && dayInfo.label) || '접수중', style: { background: '#eef2fb', color: '#122E78' } };

    // 내 상태 박스
    const st = myReg?.status === 'noshow' ? { c: '#ef4444', icon: <Icon.AlertTriangle size={16}/>, t: '노쇼 신청됨', s: myReg.noShowFine ? `벌금 ${myReg.noShowFine / 10000}만원` : '벌금이 부과돼요' }
        : myReg?.status === 'absent' ? { c: '#64748b', icon: <Icon.X size={16}/>, t: '불참 신청됨', s: '벌금 없이 처리됐어요' }
        : myReg?.status === 'confirmed' ? { c: '#16a34a', icon: <Icon.Check size={16}/>, t: absentType ? '참가 확정' : '신청 완료', s: (dayInfo && dayInfo.label) ? `${dayInfo.label} · ${curCount}/${maxLimit}명` : `${curCount}/${maxLimit}명` }
        : myReg?.status === 'waiting' ? { c: '#f59e0b', icon: <Icon.Clock size={16}/>, t: `대기 ${myReg.waitingNumber || ''}번`, s: '정원이 차면 자동으로 확정돼요' }
        : regBeforeOpen ? { c: '#94a3b8', icon: <Icon.Clock size={16}/>, t: '신청 예정', s: '아직 신청 전이에요' }
        : regAfterClose ? { c: '#94a3b8', icon: <Icon.X size={16}/>, t: '신청 마감', s: '신청이 마감됐어요' }
        : { c: '#16357f', icon: <Icon.Plus size={16}/>, t: '아직 신청 안 함', s: (dayInfo && dayInfo.label) ? `${dayInfo.label} · ${curCount}/${maxLimit}명` : `${curCount}/${maxLimit}명` };

    const irow = "flex items-center gap-2.5 py-2 text-[13px] font-bold text-slate-600";
    return (
        <div className={`card rounded-2xl overflow-hidden ${isLive ? 'ring-2 ring-[#C2F94A]' : ''}`}>
            <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left active:bg-slate-50 transition-colors">
                <div className="flex-shrink-0 w-[54px] h-[56px] rounded-2xl flex flex-col items-center justify-center" style={{ background: chipBg, color: chipFg }}>
                    {_ok ? (<><span className="text-[21px] font-black leading-none tabular-nums">{dDay}</span>
                        <span className="text-[10px] font-black mt-0.5 tracking-wider" style={{ opacity: .9 }}>{dMonShort}</span></>) : <Icon.Calendar size={20}/>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-[15px] text-slate-800 truncate">{isMatch ? '매칭' : '정기모임'}</span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={hChip.style}>{hChip.t}</span>
                    </div>
                    <p className="text-[12px] font-bold text-slate-400 mt-1 truncate">{meta}</p>
                </div>
                <Icon.ChevronRight size={18} className={`text-slate-300 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}/>
            </button>
            <div className={`acc-wrap ${open ? 'open' : ''}`}><div className="acc-inner"><div className="px-3 pb-3.5">
                {/* 간단 정보 */}
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                    <div className={irow}><Icon.Clock size={15} className="text-slate-400 flex-shrink-0"/><span>{meeting.start || ''}{meeting.end ? `~${meeting.end}` : ''}</span></div>
                    {meeting.location && <div className={irow}><Icon.MapPin size={15} className="text-slate-400 flex-shrink-0"/><span className="truncate">{meeting.location}</span></div>}
                    <div className={irow}><Icon.Users size={15} className="text-slate-400 flex-shrink-0"/><span><b className="text-slate-800">{curCount}</b> / {maxLimit}명{isMatch && meeting.opponentName ? ` · vs ${meeting.opponentName}` : ''}</span></div>
                </div>
                {/* 내 상태 */}
                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 mt-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: st.c }}>{st.icon}</div>
                    <div className="min-w-0"><p className="text-[13px] font-black text-slate-800 truncate">{st.t}</p><p className="text-[11px] font-bold text-slate-400 truncate">{st.s}</p></div>
                </div>
                {/* 신청/취소 */}
                <div className="mt-2.5 space-y-2">
                    {(myReg?.status === 'absent' || myReg?.status === 'noshow') ? (
                        undoAbsentOk
                            ? <button onClick={() => regHandlers && regHandlers.handleUndoAbsent()} className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-black text-sm active:scale-95 transition-all">{myReg.status === 'noshow' ? '노쇼' : '불참'} 취소 (다시 신청)</button>
                            : <p className="text-center text-[12px] font-bold text-slate-400 py-2">모임 시간이 지났어요</p>
                    ) : myReg?.status === 'confirmed' ? (
                        <>
                            {isLiveOrToday && <button onClick={onGoHome} className="w-full py-3 rounded-xl font-black text-sm active:scale-95 transition-all" style={{ background: '#eef2fb', color: '#122E78' }}>홈에서 출석·팀 보기 ›</button>}
                            {absentType ? (
                                <button onClick={() => setAbsentAsk(true)} className="w-full py-3 rounded-xl text-white font-black text-sm active:scale-95 transition-all" style={{ background: absentColor }}>{absentType === 'noshow_2' ? '당일 노쇼 신청' : absentFine > 0 ? '노쇼 신청' : '불참 신청'}</button>
                            ) : !regAfterClose ? (
                                <button onClick={() => setCancelAsk(true)} className="w-full py-3 rounded-xl bg-slate-100 text-slate-500 font-black text-sm active:scale-95 transition-all">신청 취소</button>
                            ) : null}
                        </>
                    ) : myReg?.status === 'waiting' ? (
                        <button onClick={() => setCancelAsk(true)} className="w-full py-3 rounded-xl bg-slate-100 text-slate-500 font-black text-sm active:scale-95 transition-all">대기 취소</button>
                    ) : !regEnabled ? (
                        <p className="text-center text-[12px] font-bold text-slate-400 py-2">아직 신청을 받지 않아요</p>
                    ) : regBeforeOpen ? (
                        <p className="text-center text-[12px] font-bold text-slate-400 py-2">곧 신청이 열려요</p>
                    ) : regAfterClose ? (
                        <p className="text-center text-[12px] font-bold text-slate-400 py-2">신청이 마감됐어요</p>
                    ) : (
                        <button onClick={() => regHandlers && regHandlers.handleRegister()} className="w-full py-3 rounded-xl text-white font-black text-sm active:scale-95 transition-all" style={{ background: '#f97316', boxShadow: '0 10px 22px -12px rgba(249,115,22,.55)' }}>신청하기</button>
                    )}
                    {isLiveOrToday && myReg?.status !== 'confirmed' && (myReg?.status === 'waiting' || (!myReg && regAfterClose)) && (
                        <button onClick={onGoHome} className="w-full py-2.5 rounded-xl font-black text-[13px] active:scale-95 transition-all" style={{ background: '#eef2fb', color: '#122E78' }}>홈에서 보기 ›</button>
                    )}
                </div>
            </div></div></div>

            {/* 신청 취소 확인 팝업 */}
            {cancelAsk && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 animate-in" style={{ background: 'rgba(15,23,42,.46)', backdropFilter: 'blur(2px)' }} onClick={() => setCancelAsk(false)}>
                    <div className="bg-white rounded-3xl p-7 pt-8 max-w-[320px] w-full text-center" style={{ boxShadow: '0 30px 70px -22px rgba(0,0,0,.45)' }} onClick={e => e.stopPropagation()}>
                        <div className="w-[66px] h-[66px] rounded-full mx-auto mb-4 flex items-center justify-center text-white" style={{ background: '#F59E0B' }}><span className="text-[34px] font-black leading-none">!</span></div>
                        <p className="text-[18px] font-black text-slate-900">신청을 취소할까요?</p>
                        <div className="mt-3.5 text-left text-[12px] font-bold leading-relaxed rounded-2xl px-3.5 py-3" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412' }}>
                            지금 취소하면 다시 신청할 때 <b className="whitespace-nowrap">순번이 맨 뒤로 밀려요.</b> 정원이 찼다면 대기로 넘어갈 수 있어요.
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setCancelAsk(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-black text-[14.5px] active:scale-95">그대로 둘게요</button>
                            <button onClick={() => { setCancelAsk(false); regHandlers && regHandlers.handleCancel(); }} className="flex-1 py-3.5 rounded-2xl text-white font-black text-[14.5px] active:scale-95" style={{ background: '#EF4444' }}>신청 취소</button>
                        </div>
                    </div>
                </div>
            )}
            {/* 불참/노쇼 신청 — 사유 입력 팝업 */}
            {absentAsk && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 animate-in" style={{ background: 'rgba(15,23,42,.46)', backdropFilter: 'blur(2px)' }} onClick={() => { setAbsentAsk(false); setAbsentReason(''); }}>
                    <div className="bg-white rounded-3xl p-7 pt-8 max-w-[330px] w-full" style={{ boxShadow: '0 30px 70px -22px rgba(0,0,0,.45)' }} onClick={e => e.stopPropagation()}>
                        <div className="w-[66px] h-[66px] rounded-full mx-auto mb-4 flex items-center justify-center text-white" style={{ background: absentColor }}><Icon.AlertTriangle size={30}/></div>
                        <p className="text-[18px] font-black text-slate-900 text-center">{absentType === 'noshow_2' ? '당일 노쇼 신청' : isNoshowStage ? '노쇼 신청' : '불참 신청'}</p>
                        <p className="text-[12.5px] font-bold text-slate-400 text-center mt-1.5 leading-relaxed">{absentType === 'noshow_2' ? '당일 노쇼로 기록되고 벌금 2만원이 부과돼요.' : absentFine > 0 ? '노쇼로 기록되고 벌금 1만원이 부과돼요.' : '미리 알려주셔서 벌금 없이 처리돼요.'}</p>
                        <textarea value={absentReason} onChange={e => setAbsentReason(e.target.value)} rows={2} maxLength={200} placeholder={isNoshowStage ? '노쇼 사유 (선택) — 예: 갑작스런 일정' : '불참 사유 (선택) — 예: 컨디션 난조'} className="w-full mt-4 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"/>
                        <div className="text-left text-[11.5px] font-bold leading-relaxed rounded-2xl px-3.5 py-2.5 mt-2" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412' }}>
                            담당 운영진에게 알림이 가요. 다시 참석하려면 취소할 수 있지만 <b className="whitespace-nowrap">순번은 맨 뒤로</b> 밀려요.
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => { setAbsentAsk(false); setAbsentReason(''); }} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-black text-[14.5px] active:scale-95">그대로 둘게요</button>
                            <button onClick={onAbsentConfirm} className="flex-1 py-3.5 rounded-2xl text-white font-black text-[14.5px] active:scale-95" style={{ background: absentColor }}>{absentType === 'noshow_2' ? '당일 노쇼' : isNoshowStage ? '노쇼' : '불참'} 신청</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── 회원용 모임 목록 (예정 모임 카드 + 단일오픈 아코디언) ──────────────────────────
const MemberMeetingList = ({ meetings, memberData, expandId, onGoHome, showToast, showAlert, showConfirm }) => {
    const upcoming = (meetings || [])
        .filter(m => m && m.date && !isMeetingEnded(m))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.meetingType || 'self').localeCompare(b.meetingType || 'self'));
    const [openId, setOpenId] = React.useState(expandId || null);
    React.useEffect(() => { if (expandId) setOpenId(expandId); }, [expandId]);
    const toggle = (id) => setOpenId(prev => prev === id ? null : id);
    // 정기모임 안내 행
    const [recur, setRecur] = React.useState(undefined);
    React.useEffect(() => {
        const unsub = getCol('settings').doc('recurring_meeting').onSnapshot(
            d => { const data = d.exists ? d.data() : null; setRecur(data && data.enabled ? data : null); }, () => setRecur(null));
        return () => unsub();
    }, []);
    const WD = ['일','월','화','수','목','금','토'];
    return (
        <div className="animate-in space-y-3">
            {recur && (
                <div className="flex items-center gap-2.5 card rounded-2xl px-3.5 py-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eef2fb', color: '#122E78' }}><Icon.Refresh size={17}/></div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-800 truncate">정기모임 · 매주 {WD[recur.weekday ?? 0]}요일</p>
                        {recur.defaultLocation && <p className="text-[11.5px] font-bold text-slate-400 truncate">{recur.defaultLocation}</p>}
                    </div>
                </div>
            )}
            <p className="text-[11px] font-black text-slate-400 px-1">예정 모임 · 눌러서 신청</p>
            {upcoming.length === 0 ? (
                <div className="card rounded-2xl p-8 text-center text-slate-400">
                    <div className="flex justify-center mb-3 opacity-30"><Icon.Calendar size={36}/></div>
                    <p className="font-black text-sm">예정된 모임이 없어요</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {upcoming.map(m => (
                        <MemberMeetingCard key={m.id} meeting={m} memberData={memberData}
                            open={openId === m.id} onToggle={() => toggle(m.id)} onGoHome={onGoHome}
                            showToast={showToast} showAlert={showAlert} showConfirm={showConfirm} />
                    ))}
                </div>
            )}
            <p className="text-[12px] font-bold text-slate-400 leading-relaxed card rounded-2xl px-4 py-3.5 mt-1">
                모임 탭은 <b className="text-slate-600">일정 보고 신청</b>까지만이에요. 내 팀·번호·출석체크·매치표 같은 자세한 진행은 모임이 임박했을 때 <b className="text-slate-600">홈 탭</b>에서 볼 수 있어요.
            </p>
        </div>
    );
};

// ─── 모임 상세 상단 헤더 (뒤로가기 + 모임 요약) ──────────────────────────────────
const MeetingDetailHeader = ({ meeting, onBack, isAdminMode, onOpenAdminHub }) => {
    const kind = (meeting.meetingType || 'self') === 'match' ? 'match' : 'self';
    const cfg = MEETING_KIND[kind];
    const dayInfo = computeMeetingDay(meeting.date, meeting.start);
    return (
        <div className="flex items-center gap-2.5 mb-3">
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
            {isAdminMode && onOpenAdminHub && (
                <button onClick={onOpenAdminHub} className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-white font-black text-[12.5px] active:scale-95 transition-all" style={{background:'#183FB0'}}>
                    <Icon.Settings size={14}/> 운영
                </button>
            )}
        </div>
    );
};

// ─── 운영 허브 (운영진 전용 편집 진입 — 모임정보·팀·매치 3카드) ──────────────────
// 회원 화면(섹션)은 그대로 두고, 운영진이 '운영' 버튼으로 들어와 편집할 3가지만 본다.
const MeetingAdminHub = ({ meeting, teamStatus, matchStatus, isMatchKind, onClose, onEditInfo, onTeam, onMatch }) => {
    const card = (icon, tone, name, desc, status, onAct, actLabel) => (
        <button onClick={onAct} className="w-full text-left card rounded-2xl p-4 mb-3 flex items-center gap-3.5 active:scale-[0.99] transition-transform">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{background:tone.bg, color:tone.fg}}>{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-[15.5px] text-slate-800">{name}</p>
                <p className="text-[12px] font-bold text-slate-400 mt-0.5 truncate">{desc}</p>
                <span className={`inline-block text-[10.5px] font-black px-2 py-0.5 rounded-full mt-1.5 ${status.done ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{status.label}</span>
            </div>
            <span className="shrink-0 flex items-center gap-0.5 text-[12.5px] font-black text-teal-600">{actLabel}<Icon.ChevronRight size={15}/></span>
        </button>
    );
    return (
        <div className="animate-in">
            <div className="flex items-center gap-2 mb-3">
                <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0 active:scale-95 transition-all"><Icon.ArrowLeft size={18}/></button>
                <div className="flex items-center gap-1.5"><Icon.Settings size={17} className="text-teal-700"/><h2 className="font-black text-lg text-slate-800">운영 · 편집</h2></div>
            </div>
            <p className="text-[12px] font-bold text-slate-400 mb-3 px-1">편집할 항목만 고르세요. 회원 화면은 그대로예요.</p>
            {card(<Icon.Clock size={22}/>, {bg:'#eef2fb',fg:'#122E78'}, '모임 정보', `${meeting.start||''}~${meeting.end||''} · ${meeting.location||'장소 미정'}`, {label:`정원 ${meeting.maxLimit||18}명`, done:true}, onEditInfo, '수정')}
            {card(<Icon.Users size={22}/>, {bg:'#dcfce7',fg:'#15803d'}, '팀 편성', '팀 나누기 · 조끼색 · 확정', teamStatus, onTeam, teamStatus.done?'수정':'편성')}
            {!isMatchKind && card(<Icon.Swords size={20}/>, {bg:'#fee2e2',fg:'#b91c1c'}, '매치표', '대진 · 라운드 · 코트', matchStatus, onMatch, matchStatus.done?'수정':'생성')}
        </div>
    );
};

// ─── 운영진 모임 상세 = 관리 카드 1개(모임정보·팀·매치 3줄, 각 줄 [수정/편성/생성]로 진입) ──
// 들어가면 긴 섹션 대신 이 카드만. 줄을 누르면 해당 편집 화면으로. (출석 현황은 홈/모임정보 줄 안에서)
const MeetingManageCard = ({ meeting, viewKind, teamStatus, matchStatus, onEditInfo, onTeam, onMatch, onQR, onDelete }) => {
    const isMatch = viewKind === 'match';
    const cap = isMatch ? ((meeting.maxMale || 0) + (meeting.maxFemale || 0)) : (meeting.maxLimit || 18);
    const row = (icon, tone, name, desc, status, onAct, actLabel, ghost) => (
        <button onClick={onAct} className="w-full flex items-center gap-3 px-4 py-4 text-left border-t border-slate-100 first:border-t-0 active:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: tone.bg, color: tone.fg }}>{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-[15.5px] text-slate-800">{name}</p>
                <p className="text-[11.5px] font-bold text-slate-400 mt-0.5 truncate">{desc}</p>
                <span className={`inline-block text-[10.5px] font-black px-2 py-0.5 rounded-full mt-1.5 ${status.done ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{status.label}</span>
            </div>
            <span className="shrink-0 flex items-center gap-0.5 text-[13px] font-black px-3.5 py-2 rounded-xl" style={ghost ? { background: '#eef2fb', color: '#122E78' } : { background: '#183FB0', color: '#fff' }}>{actLabel}<Icon.ChevronRight size={14}/></span>
        </button>
    );
    return (
        <div className="animate-in">
            <p className="text-[11px] font-black text-slate-400 px-1 mb-2 uppercase tracking-widest">이 모임 관리</p>
            <div className="card rounded-2xl overflow-hidden">
                {row(<Icon.Clock size={22}/>, { bg: '#eef2fb', fg: '#122E78' }, '모임 정보', '시간·장소·정원 · 참가자·출석', { label: `${meeting.start || ''}~${meeting.end || ''} · 정원 ${cap}명`, done: true }, onEditInfo, '관리', false)}
                {row(<Icon.Users size={22}/>, { bg: '#dcfce7', fg: '#15803d' }, isMatch ? '명단' : '명단/팀', isMatch ? '참가 명단 확인' : '명단 선정 · 팀 나누기 · 조끼색', teamStatus, onTeam, teamStatus.done ? '수정' : '편성', !teamStatus.done)}
                {!isMatch && row(<Icon.Swords size={20}/>, { bg: '#fee2e2', fg: '#b91c1c' }, '매치표', '대진 · 라운드 · 코트', matchStatus, onMatch, matchStatus.done ? '수정' : '생성', !matchStatus.done)}
            </div>
            <div className="flex gap-2 mt-3">
                {!isMatch && onQR && <button onClick={onQR} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-100 text-slate-500 font-black text-[12.5px] active:scale-95 transition-all"><Icon.QrCode size={15}/> QR 코드</button>}
                {onDelete && <button onClick={onDelete} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-50 text-rose-500 font-black text-[12.5px] active:scale-95 transition-all"><Icon.Trash size={15}/> 모임 삭제</button>}
            </div>
        </div>
    );
};

// ─── 모임 상세 접이식 섹션 (출석/팀/매치를 세로로 — 제목 누르면 펼침/접힘) ──────────
const MeetingSection = ({ title, summary, icon, open, onToggle, children }) => (
    <div className="card rounded-2xl overflow-hidden mb-3">
        <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors">
            {icon && <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background:icon.bg, color:icon.fg}}>{icon.el}</div>}
            <div className="flex-1 min-w-0">
                <span className="font-black text-[15px] text-slate-800">{title}</span>
                {summary && <p className="text-[12px] font-bold text-slate-400 mt-0.5 truncate">{summary}</p>}
            </div>
            <Icon.ChevronRight size={18} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        {open && <div className="px-2 pb-2">{children}</div>}
    </div>
);

// ─── 출석 탭 ────────────────────────────────────────────────────────────────────
const TabAttend = ({
    isAdminMode,
    isAttendPanelOpen, setIsAttendPanelOpen,
    generateAttendQRCode, attendToggleTestMode, testMode,
    attendSubTab, setAttendSubTab, rosterOnly = false,
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
    isKioskOpen, setIsKioskOpen, attendHandleCheckIn, attendHandleUncheckIn,
    isMeetingOver, attendHandleEndMeeting,
    viewMeeting, isViewActive, onEditMeeting,
    managers = [], onChangeManager,
    myRegistration, regConfirmedCount, myWaitingPosition, handleRegister, handleCancel, handleAbsent, handleUndoAbsent,
    onOpenAttendModal,
}) => {
    // 보고 있는 모임은 상위(member.html)에서 내려옴 — 모임 탭 카드에서 이미 선택된 모임
    const selectedMeeting = viewMeeting;
    const [isSelecting, setIsSelecting] = React.useState(false);
    const [selMonthlyStatuses, setSelMonthlyStatuses] = React.useState({});
    // 담당자 변경 팝업
    const [mgrPickOpen, setMgrPickOpen] = React.useState(false);
    // 이 모임의 불참·노쇼 신청 목록 (운영진 확인용) — registrations에서 직접 구독. 불참은 명단에서 사라지므로 여기서만 보임.
    const [absentRegs, setAbsentRegs] = React.useState([]);
    React.useEffect(() => {
        if (!isAdminMode || !selectedMeeting?.date) { setAbsentRegs([]); return; }
        const mid = (typeof getMeetingId === 'function') ? getMeetingId(selectedMeeting) : selectedMeeting.date;
        const _ms = (v) => v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : (typeof v === 'string' ? (Date.parse(v) || 0) : 0));
        const unsub = getCol('registrations').where('meetingId', '==', mid).onSnapshot(snap => {
            const list = snap.docs.map(d => d.data())
                .filter(r => r.status === 'absent' || r.status === 'noshow')
                .sort((a, b) => _ms(b.absentAt) - _ms(a.absentAt));   // 최근 신청 먼저
            setAbsentRegs(list);
        }, () => setAbsentRegs([]));
        return () => unsub();
    }, [isAdminMode, selectedMeeting?.date, selectedMeeting?.meetingType]);
    const _fmtAbsAt = (v) => {
        const t = v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : (typeof v === 'string' ? (Date.parse(v) || 0) : 0));
        if (!t) return '';
        const d = new Date(t);
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

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
            if (!joinedByMonth(member, monthStr)) return;   // 그 달 가입월(duesStartMonth) 이전 회원은 선정 대상에서 제외
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
        // 선택(누른) 순서 = createdAt 오름차순. 같은 시각이면 이름순.
        // createdAt는 문자열(ISO) 또는 Firestore Timestamp 둘 다 올 수 있어 ms()로 안전 비교(빈값은 맨 뒤).
        const ms = (v) => v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : (typeof v === 'string' ? (Date.parse(v) || 0) : 0));
        return (tmSessionData || [])
            .filter(p => sessionMatchesMeeting(p, selectedMeeting))
            .sort((a,b)=>(ms(a.createdAt) - ms(b.createdAt)) || (a.name||'').localeCompare(b.name||''));
    }, [tmSessionData, selectedMeeting?.date, selectedMeeting?.meetingType]);
    // 누른 순서대로 번호(1,2,3…) — memberId 기준. 제거 시 자동으로 당겨짐(rank 재계산).
    const pickOrder = React.useMemo(() => {
        const map = {};
        selSessionList.forEach((p, i) => { map[p.memberId] = i + 1; });
        return map;
    }, [selSessionList]);

    // 모임 당일(출석 시작) + 현재 모임이면 관리자는 들어왔을 때 출석 현황(명단)을 바로 표시.
    // 활성 모임이 아니면 '출석 현황' 탭이 없으므로, 그 탭이 선택돼 있으면 명단으로 되돌린다.
    React.useEffect(() => {
        if (rosterOnly) return;                                 // 명단 전용 모드 — 서브탭 자동전환 안 함
        const di = computeMeetingDay(meetingSettings?.date, meetingSettings?.start);
        if (!isViewActive) {
            setAttendSubTab('roster');                          // 예정 모임 = 명단 작성
        } else if (isAdminMode && (di?.type === 'today' || di?.type === 'started')) {
            setAttendSubTab('attend');                          // 당일/진행중 = 출석 현황
        } else {
            setAttendSubTab(prev => (prev === 'attend' || prev === 'roster') ? prev : 'attend');
        }
    }, [isViewActive, meetingSettings?.date]);

    // 현재 모임이면 회원은 항상, 관리자는 '출석체크' 서브탭일 때 체크인 UI 표시
    const showCheckin = isViewActive && (!isAdminMode || attendSubTab === 'checkin');
    // 운영진/관리자도 회원과 동등하게 신청 가능. 담당자 자동등록 여부는 RegistrationCard가
    // myRegistration으로 처리(등록됐으면 참가확정/취소, 안 됐으면 신청하기).
    const showRegister = showCheckin || (isViewActive && isAdminMode);

    // 담당자 본인이 불참/노쇼를 신청하면 → 담당자 교체 팝업을 띄워 다른 운영진에게 넘기도록 유도
    const isMeetingManager = isAdminMode && !!memberInfo?.id && !!selectedMeeting?.managerId && memberInfo.id === selectedMeeting.managerId;
    const handleAbsentAsManager = (reason) => {
        if (handleAbsent) handleAbsent(reason);
        if (isMeetingManager) setMgrPickOpen(true);
    };

    return (
    <div className="animate-in space-y-4">

        {/* 담당자 변경 팝업 (공용 컴포넌트 — modals.js ManagerPickModal) */}
        <ManagerPickModal open={mgrPickOpen} meeting={selectedMeeting} managers={managers} onPick={onChangeManager} onClose={() => setMgrPickOpen(false)} />

        {/* 관리자 패널 — 항상 표시 (출석 관리 토글 제거, 서브탭으로 직접 이동) */}
        {isAdminMode ? (
            <div>
                {/* 출석 상단 — 현황↔명단 전환 + 출석체크/QR + 모임 종료. 명단 전용 모드(팀 편성 안)에선 숨김 */}
                {!rosterOnly && (
                <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                        {isViewActive ? (
                            <div className="flex-1 flex gap-1.5 p-1 bg-slate-100 rounded-2xl">
                                {[['attend','출석 현황'],['roster','명단 편집']].map(([v,l]) => (
                                    <button key={v} onClick={() => { setAttendSubTab(v); setSelectedHistoryDetail(null); }}
                                        className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${attendSubTab===v?'bg-white text-teal-600 shadow-sm':'text-slate-400'}`}>{l}</button>
                                ))}
                            </div>
                        ) : (
                            <p className="flex-1 text-sm font-black text-slate-600 px-1 py-2">명단 작성</p>
                        )}
                        {isViewActive && attendActiveList.length > 0 && (
                            <button onClick={attendHandleEndMeeting}
                                disabled={attendIsPending || !isMeetingOver || attendHistory.some(h => h.date === meetingSettings?.date)}
                                className={`px-3 py-2 rounded-xl font-black text-xs transition-all disabled:opacity-30 flex-shrink-0 ${attendHistory.some(h => h.date === meetingSettings?.date) ? 'bg-emerald-50 text-emerald-500' : isMeetingOver ? 'bg-rose-500 text-white active:scale-95' : 'bg-slate-100 text-slate-300'}`}>
                                {attendHistory.some(h => h.date === meetingSettings?.date) ? <span className="inline-flex items-center justify-center gap-1">저장 완료 <Icon.Check size={12}/></span> : '모임 종료'}
                            </button>
                        )}
                    </div>
                    {isViewActive && (
                        <div className="flex gap-2">
                            <button onClick={() => setIsKioskOpen(true)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                style={{background:'linear-gradient(135deg,var(--c-accent),var(--c-accent-deep))'}}>
                                <Icon.Clipboard size={15}/> 출석 체크 열기
                            </button>
                            {generateAttendQRCode && (selectedMeeting?.meetingType || 'self') !== 'match' && (
                                <button onClick={() => generateAttendQRCode(selectedMeeting)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-black bg-slate-100 text-slate-600 flex items-center gap-1.5 active:scale-95 transition-all">
                                    <Icon.QrCode size={15}/> QR
                                </button>
                            )}
                        </div>
                    )}
                </div>
                )}

                {/* ── 명단 관리 서브탭 — 지금 보고 있는 모임의 명단 작성 ── */}
                {(rosterOnly || attendSubTab === 'roster') && selectedMeeting && (
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
                                    {!rosterOnly && isViewActive && (
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

                                {/* 담당자 (운영진 전용 · 변경 가능) — 담당자가 못 올 때 다른 운영진으로 교체 */}
                                {isAdminMode && rosterOnly && (
                                    <div className="card border-slate-100 rounded-2xl p-4 mb-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[11px] font-black text-slate-400 shrink-0">담당</span>
                                                <span className="text-sm font-black text-slate-800 truncate">{selectedMeeting.managerName || '미지정'}</span>
                                            </div>
                                            <button onClick={() => setMgrPickOpen(true)} className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-500 text-xs font-black active:scale-95 transition-all"><Icon.Users size={13}/> 변경</button>
                                        </div>
                                    </div>
                                )}
                                {/* 불참·노쇼 신청 (운영진 전용) — 푸시 알림을 놓쳐도 여기서 확인 */}
                                {isAdminMode && absentRegs.length > 0 && (
                                    <div className="card border-slate-100 rounded-2xl p-4 mb-4">
                                        <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Icon.AlertTriangle size={13} className="text-amber-500"/>불참 · 노쇼 신청 <span className="text-amber-500">{absentRegs.length}명</span></p>
                                        <div className="space-y-2">
                                            {absentRegs.map((r, i) => {
                                                const no = r.status === 'noshow';
                                                return (
                                                    <div key={(r.memberId || '') + i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50">
                                                        <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg ${no ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'}`}>{no ? '노쇼' : '불참'}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-sm font-black text-slate-800">{r.name || '회원'}</span>
                                                                {no && (r.noShowFine || 0) > 0 && <span className="text-[11px] font-black text-rose-500">벌금 {(r.noShowFine / 10000)}만원</span>}
                                                            </div>
                                                            <p className={`text-[12px] font-bold mt-0.5 break-words ${r.absentReason ? 'text-slate-500' : 'text-slate-400'}`}>{r.absentReason ? `사유: ${r.absentReason}` : '사유 없음'}</p>
                                                        </div>
                                                        <span className="shrink-0 text-[10px] font-black text-slate-400">{_fmtAbsAt(r.absentAt)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {/* 모임 정보 (읽기 전용) — 명단 전용 모드에선 숨김(모임 정보 카드 줄에서 따로 봄) */}
                                {!rosterOnly && (
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
                                )}

                                {/* 선정된 회원 명단(보기) ↔ 회원 선정(편집). 명단 전용 모드는 항상 선택 목록 */}
                                {(!rosterOnly && !isSelecting) ? (
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
                                                {!rosterOnly && <button onClick={()=>setIsSelecting(false)} className="shrink-0 px-3 py-1.5 bg-teal-500 text-white text-xs font-black rounded-xl flex items-center gap-1 active:scale-95"><Icon.Check size={12}/> 완료</button>}
                                            </div>
                                        </div>
                                        {selSessionList.some(p=>p.isGuest) && (
                                            <div className="card border-orange-100 rounded-2xl p-3 mb-3">
                                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 px-1">추가된 게스트 ({selSessionList.filter(p=>p.isGuest).length})</p>
                                                <div className="space-y-1.5">
                                                    {selSessionList.filter(p=>p.isGuest).map(p => (
                                                        <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200">
                                                            <span className="font-black text-sm text-slate-800 flex-1 min-w-0 truncate">{p.name}{p.gender==='여성'&&<span className="ml-1 text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}</span>
                                                            <span className="shrink-0 text-[9px] font-black text-slate-400">{p.level}</span>
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
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-black transition-all ${isSelected?'bg-teal-500 text-white':'border-2 border-slate-300 text-slate-300'}`}>
                                                            {isSelected ? (pickOrder[member.id] || <Icon.Check size={12} className="text-white"/>) : ''}
                                                        </div>
                                                        <span className="font-black text-sm text-slate-800 flex-1 min-w-0 truncate">{member.name}</span>
                                                        {member.gender==='여성'&&<span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}
                                                        {ADMIN_ROLES.includes(member.role)&&<span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-lg font-black ${getRoleBadgeClass(member.role)}`}>{member.role}</span>}
                                                        <span className="shrink-0 text-[9px] font-black text-slate-400">{member.level}</span>
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
                                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-black transition-all ${isSelected?'bg-orange-400 text-white':'border-2 border-slate-300 text-slate-300'}`}>
                                                                    {isSelected ? (pickOrder[member.id] || <Icon.Check size={12} className="text-white"/>) : ''}
                                                                </div>
                                                                <span className="font-black text-sm text-slate-800 flex-1 min-w-0 truncate">{member.name}</span>
                                                                {member.gender==='여성'&&<span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}
                                                                {guestUsed && <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-lg font-black">게스트 소진</span>}
                                                                <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-lg font-black">{badge}</span>
                                                                <span className="shrink-0 text-[9px] font-black text-slate-400">{member.level}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 출석 현황 요약 (현재 모임일 때만) — 명단 전용 모드에선 숨김(출석은 홈) */}
                                {!rosterOnly && isViewActive && (
                                    <div className="mt-6 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">출석 현황</p>
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
                {!rosterOnly && attendSubTab === 'attend' && isViewActive && (
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
                {!rosterOnly && attendSubTab === 'history' && !selectedHistoryDetail && (
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
                {!rosterOnly && attendSubTab === 'history' && selectedHistoryDetail && (
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

        {/* 선착순 신청 카드 — 회원 + 운영진도 동등하게 신청(담당자는 자동등록 시 확정/취소 표시) */}
        {showRegister && (
            <RegistrationCard
                meetingSettings={meetingSettings}
                myRegistration={myRegistration}
                regConfirmedCount={regConfirmedCount}
                myWaitingPosition={myWaitingPosition}
                handleRegister={handleRegister}
                handleCancel={handleCancel}
                handleAbsent={handleAbsentAsManager}
                handleUndoAbsent={handleUndoAbsent}
                duesUnpaid={myDuesUnpaid}
                duesBlock={duesBlock}
                penaltyUnpaid={penaltyUnpaid}
                penaltyTotal={penaltyTotal}
                isPreview={inTestPreview}
            />
        )}

        {/* 회원 출석 체크인 UI (①출석완료 ②QR결과 ③GPS·QR버튼 ④GPS결과 팝업) — CheckInPanel 공유 컴포넌트(F-1) */}
        {showCheckin && (
            <CheckInPanel
                compact={false}
                mySession={mySession} meetingSettings={meetingSettings}
                gpsStatus={gpsStatus} distance={distance} setGpsStatus={setGpsStatus}
                handleGPSCheckIn={handleGPSCheckIn} handleGPSAttend={handleGPSAttend} isCheckingIn={isCheckingIn}
                qrStatus={qrStatus} qrMessage={qrMessage} setQrStatus={setQrStatus} setIsQRScannerOpen={setIsQRScannerOpen}
            />
        )}

        {/* 키오스크(직접 출석) 모달은 member.html 최상위(전역)에서 렌더 — 어느 화면에서든 뜨도록 이동.
            (홈 '키오스크' 버튼 진입, isKioskOpen 기준) 여기서는 중복 렌더 방지를 위해 두지 않는다. */}
    </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────
