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
        <div className="fixed inset-0 z-50 flex flex-col" style={{background:'#f8fafc',overscrollBehavior:'none'}}>
            <KioskScrollLock />
            {/* 상단 바 */}
            <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'14px 16px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                    <p style={{color:'#1e293b',fontWeight:900,fontSize:'1rem'}}>직접 출석</p>
                    <p style={{color:'#64748b',fontSize:'0.75rem',marginTop:'2px'}}>{meetingSettings?.date} · <span style={{color:'#0d9488',fontWeight:900}}>{attendCheckedInCount}명 출석</span> / {attendActiveList.length}명</p>
                    <p style={{color:'#1e293b',fontSize:'1.5rem',fontWeight:900,marginTop:'4px',letterSpacing:'0.05em'}}><KioskClock /></p>
                </div>
                <button onClick={() => setIsKioskOpen(false)}
                    style={{width:'40px',height:'40px',borderRadius:'12px',background:'#f1f5f9',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',fontSize:'20px',fontWeight:900}}>
                    ✕
                </button>
            </div>
            {/* 출석 진행 바 */}
            {attendActiveList.length > 0 && (
                <div style={{height:'4px',background:'#e2e8f0',flexShrink:0}}>
                    <div style={{height:'100%',background:'#10b981',transition:'width 0.7s',width:`${Math.round(attendCheckedInCount/attendActiveList.length*100)}%`}}/>
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
                            <div className="grid grid-cols-3 gap-2.5">
                                {group.members.map(p => (
                                    <button key={p.id}
                                        onClick={() => p.checkedIn
                                            ? setAttendModal({type:'checkin', data:{...p, teamIdx:group.teamIdx, teamName:group.teamName}})
                                            : setConfirmTarget({...p, teamIdx:group.teamIdx, teamName:group.teamName})
                                        }
                                        style={{minHeight:'100px'}}
                                        className={`relative overflow-hidden rounded-2xl active:scale-95 transition-all text-white ${getTeamBadge(group.teamIdx)} ${p.checkedIn?'opacity-40':''}`}>
                                        {p.checkedIn && (
                                            <div className="absolute inset-0 flex items-center justify-center" style={{background:'rgba(0,0,0,0.2)'}}>
                                                <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                                    <Icon.Check size={20} className="text-white"/>
                                                </div>
                                            </div>
                                        )}
                                        <div style={{position:'absolute',top:'8px',left:'10px',fontSize:'1.9rem',fontWeight:900,lineHeight:1,opacity:0.9,pointerEvents:'none',userSelect:'none'}}>
                                            {p.jerseyNumber}
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
                        </div>
                    ))
                ) : attendActiveList.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-1">미출석</p>
                        {attendActiveList.filter(p=>!p.checkedIn&&p.status!=='노쇼').map(p => (
                            <button key={p.id} onClick={() => setConfirmTarget(p)}
                                style={{minHeight:'64px',width:'100%',borderRadius:'16px',background:'#14b8a6',color:'white',fontWeight:900,fontSize:'1.2rem',display:'flex',alignItems:'center',gap:'12px',padding:'0 20px',border:'none',cursor:'pointer',transition:'transform 0.1s'}}
                                className="active:scale-95">
                                <span style={{fontSize:'1.5rem',fontWeight:900,opacity:0.9,minWidth:'2.5rem',textAlign:'center'}}>{p.jerseyNumber || ''}</span>
                                <span style={{flex:1,textAlign:'left'}}>{p.name}</span>
                                {p.gender==='여성'&&<span style={{fontSize:'11px',background:'#ec4899',padding:'3px 8px',borderRadius:'6px',fontWeight:900}}>W</span>}
                                {p.isGuest&&<span style={{fontSize:'11px',background:'#1e293b',padding:'3px 8px',borderRadius:'6px',fontWeight:900}}>G</span>}
                            </button>
                        ))}
                        {attendActiveList.some(p=>p.checkedIn) && (
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-5 mb-3 px-1">출석 완료</p>
                        )}
                        {attendActiveList.filter(p=>p.checkedIn).map(p => (
                            <button key={p.id} onClick={() => setAttendModal({type:'checkin', data:p})}
                                style={{minHeight:'56px',width:'100%',borderRadius:'16px',background:'rgba(6,78,59,0.4)',border:'1px solid rgba(16,185,129,0.2)',color:'#34d399',fontWeight:900,display:'flex',alignItems:'center',gap:'12px',padding:'0 20px',cursor:'pointer',opacity:0.6,transition:'transform 0.1s'}}
                                className="active:scale-95">
                                <Icon.Check size={18}/>
                                <span style={{flex:1,textAlign:'left'}}>{p.name}</span>
                                <span style={{fontSize:'0.875rem',color:'#64748b'}}>{p.checkInTime}</span>
                            </button>
                        ))}
                        {attendActiveList.filter(p=>p.status==='노쇼').map(p => (
                            <button key={p.id} onClick={() => setAttendModal({type:'checkin', data:p})}
                                style={{minHeight:'52px',width:'100%',borderRadius:'16px',background:'rgba(127,29,29,0.3)',color:'#f87171',fontWeight:900,display:'flex',alignItems:'center',gap:'12px',padding:'0 20px',cursor:'pointer',opacity:0.4,border:'none'}}>
                                <span style={{flex:1,textAlign:'left'}}>{p.name}</span>
                                <span style={{fontSize:'0.875rem'}}>노쇼</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center" style={{paddingTop:'80px',color:'#475569'}}>
                        <p style={{fontSize:'3rem',marginBottom:'16px'}}>📋</p>
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
    memberData, attendNormalMembers, tmSessionData,
    attendToggleParticipant, setIsAttendGuestModalOpen,
    attendHandleTestSelect, attendHandleResetSelection,
    attendGuestEligibleMembers, attendToggleParticipantAsGuest,
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
    meetings, activeMeeting, handleSaveMeeting, handleDeleteMeeting, managers,
    showAlert,
}) => (
    <div className="animate-in space-y-4">

        {/* 관리자 ⚙️ 토글 */}
        {isAdminMode && (
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">출석</p>
                <div className="flex items-center gap-1.5">
                    {isAttendPanelOpen && (
                        <>
                            <button onClick={generateAttendQRCode} className="px-2.5 py-1.5 rounded-xl bg-violet-50 text-violet-600 text-xs font-black flex items-center gap-1">
                                <Icon.QrCode size={13}/> QR
                            </button>
                            <button onClick={() => setAttendSubTab('attend')} className="px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-600 text-xs font-black flex items-center gap-1">
                                <Icon.Check size={13}/> 출석
                            </button>
                            <button onClick={attendToggleTestMode}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 ${testMode?'bg-amber-100 text-amber-600':'bg-slate-100 text-slate-400'}`}>
                                <Icon.Beaker size={13}/> {testMode?'테스트 ON':'테스트'}
                            </button>
                        </>
                    )}
                    <button onClick={() => setIsAttendPanelOpen(p=>!p)}
                        className="flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl transition-all active:scale-95"
                        style={isAttendPanelOpen ? {background:'linear-gradient(135deg,#14b8a6,#0d9488)',color:'white'} : {background:'rgba(203,213,225,0.7)',color:'#64748b'}}>
                        ⚙️ {isAttendPanelOpen ? '출석 관리 ON' : '출석 관리'}
                    </button>
                </div>
            </div>
        )}

        {/* 관리자 패널 */}
        {isAdminMode && isAttendPanelOpen ? (
            <div>
                {/* 서브탭 */}
                <div className="flex gap-2 mb-4">
                    {[['meetings','모임'],['setup','선정'],['history','기록']].map(([v,l]) => (
                        <button key={v} onClick={() => { setAttendSubTab(v); setSelectedHistoryDetail(null); }}
                            className={`px-3 py-2 rounded-xl font-black text-xs transition-all ${attendSubTab===v?'bg-teal-500 text-white shadow':'text-slate-400 bg-slate-100'}`}>{l}</button>
                    ))}
                    {attendSubTab === 'attend' && attendActiveList.length > 0 && (
                        <>
                            <div className="flex-1"/>
                            <button onClick={attendHandleEndMeeting}
                                disabled={attendIsPending || !isMeetingOver || attendHistory.some(h => h.date === meetingSettings?.date)}
                                className={`px-3 py-2 rounded-xl font-black text-xs transition-all disabled:opacity-30 ${attendHistory.some(h => h.date === meetingSettings?.date) ? 'bg-emerald-50 text-emerald-500' : isMeetingOver ? 'bg-rose-500 text-white active:scale-95' : 'bg-slate-100 text-slate-300'}`}>
                                {attendHistory.some(h => h.date === meetingSettings?.date) ? '저장 완료 ✓' : '모임 종료'}
                            </button>
                        </>
                    )}
                </div>

                {/* ── 모임 서브탭 ── */}
                {attendSubTab === 'meetings' && (
                    <MeetingsTab
                        meetings={meetings}
                        activeMeeting={activeMeeting}
                        handleSaveMeeting={handleSaveMeeting}
                        handleDeleteMeeting={handleDeleteMeeting}
                        managers={managers}
                        showAlert={showAlert}
                    />
                )}

                {/* ── 선정 서브탭 ── */}
                {attendSubTab === 'setup' && (
                    <div>
                        {/* sticky 인원 카운터 */}
                        <div style={{position:'sticky',top:0,zIndex:40,marginLeft:'-1rem',marginRight:'-1rem',marginBottom:16,padding:'10px 1rem',background:darkMode?'rgba(15,23,42,0.96)':'rgba(248,250,252,0.96)',backdropFilter:'blur(8px)',borderBottom:`1px solid ${darkMode?'#334155':'#e2e8f0'}`,boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                <span style={{fontSize:10,fontWeight:900,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em'}}>선정 인원</span>
                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <span style={{fontSize:15,fontWeight:900,color:attendActiveParticipants.length>=(meetingSettings?.maxLimit||18)?'#14b8a6':darkMode?'#f1f5f9':'#1e293b'}}>
                                        {attendActiveParticipants.length} / {meetingSettings?.maxLimit||18}명
                                    </span>
                                    {attendActiveParticipants.length>=(meetingSettings?.maxLimit||18)&&<span style={{fontSize:9,fontWeight:900,padding:'2px 8px',background:'#ccfbf1',color:'#0d9488',borderRadius:6}}>마감</span>}
                                </div>
                            </div>
                        </div>

                        {/* 모임 설정 카드 */}
                        <div className="card border-slate-100 rounded-2xl p-4 mb-4">
                            <div className="mb-3">
                                <p className="text-xs font-black text-teal-500 uppercase tracking-widest">모임 설정</p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">날짜</label>
                                    <input type="date" style={{userSelect:'text'}} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                        value={meetingSettings?.date||''} onChange={e=>updateMeetingSettingsAdmin({...meetingSettings, date:e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">시작</label>
                                        <div className="flex gap-1 mt-1">
                                            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black"
                                                value={(meetingSettings?.start||'08:00').split(':')[0]} onChange={e=>updateMeetingSettingsAdmin({...meetingSettings,start:`${e.target.value}:${snapMin((meetingSettings?.start||'08:00').split(':')[1])}`})}>
                                                {attendHourOptions.map(h=><option key={h} value={h}>{h}시</option>)}
                                            </select>
                                            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black"
                                                value={snapMin((meetingSettings?.start||'08:00').split(':')[1])} onChange={e=>updateMeetingSettingsAdmin({...meetingSettings,start:`${(meetingSettings?.start||'08:00').split(':')[0]}:${e.target.value}`})}>
                                                {attendMinuteOptions.map(m=><option key={m} value={m}>{m}분</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-rose-400 uppercase">종료</label>
                                        <div className="flex gap-1 mt-1">
                                            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black"
                                                value={(meetingSettings?.end||'10:00').split(':')[0]} onChange={e=>updateMeetingSettingsAdmin({...meetingSettings,end:`${e.target.value}:${snapMin((meetingSettings?.end||'10:00').split(':')[1])}`})}>
                                                {attendHourOptions.map(h=><option key={h} value={h}>{h}시</option>)}
                                            </select>
                                            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black"
                                                value={snapMin((meetingSettings?.end||'10:00').split(':')[1])} onChange={e=>updateMeetingSettingsAdmin({...meetingSettings,end:`${(meetingSettings?.end||'10:00').split(':')[0]}:${e.target.value}`})}>
                                                {attendMinuteOptions.map(m=><option key={m} value={m}>{m}분</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">장소</label>
                                    <div className="flex gap-2 mt-1">
                                        <input type="text" placeholder="장소명 직접 입력" style={{userSelect:'text'}} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                            value={meetingSettings?.location||''} onChange={e=>updateMeetingSettingsAdmin({...meetingSettings, location:e.target.value})} />
                                        <button onClick={() => setIsLocationPickerOpen(true)}
                                            className={`shrink-0 px-3 py-2.5 rounded-xl text-sm font-black border transition-all ${meetingSettings?.locationLat ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            <Icon.MapPin size={16} />
                                        </button>
                                    </div>
                                    {meetingSettings?.locationLat && (
                                        <div className="flex items-center gap-2 mt-1 px-1">
                                            <span className="text-[10px] text-slate-400 font-mono">{meetingSettings.locationLat.toFixed(5)}, {meetingSettings.locationLng.toFixed(5)}</span>
                                            <a href={`https://map.kakao.com/link/map/${encodeURIComponent(meetingSettings.location||'위치')},${meetingSettings.locationLat},${meetingSettings.locationLng}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 font-black underline">지도 →</a>
                                            <button onClick={()=>updateMeetingSettingsAdmin({...meetingSettings,locationLat:null,locationLng:null})} className="text-[10px] text-slate-300 hover:text-red-400 font-black ml-auto">좌표 삭제</button>
                                        </div>
                                    )}
                                    <div className="mt-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">GPS 인정 반경</label>
                                        <div className="flex gap-1.5 mt-1">
                                            {[30,50,100,150,200].map(r => (
                                                <button key={r} onClick={() => updateMeetingSettingsAdmin({...meetingSettings, locationRadius:r})}
                                                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${(meetingSettings?.locationRadius||100)===r?'bg-teal-500 text-white border-teal-500':'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                    {r}m
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">출석 방식</label>
                                    <div onClick={() => updateMeetingSettingsAdmin({...meetingSettings, enableQR:!meetingSettings?.enableQR})}
                                        className="mt-1.5 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 cursor-pointer active:bg-slate-100" style={{minHeight:52}}>
                                        <div>
                                            <p className="text-sm font-black text-slate-700">QR 출석 허용</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">GPS가 기본, QR을 추가로 허용</p>
                                        </div>
                                        <div className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ml-3 ${meetingSettings?.enableQR?'bg-violet-500':'bg-slate-300'}`}>
                                            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${meetingSettings?.enableQR?'translate-x-6':'translate-x-1'}`}/>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">선착순 인원</label>
                                    <input type="number" style={{userSelect:'text'}} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-center"
                                        value={localMaxLimit !== null ? localMaxLimit : (meetingSettings?.maxLimit||18)}
                                        onChange={e=>setLocalMaxLimit(e.target.value)}
                                        onBlur={e=>{ const v=parseInt(e.target.value); if(v>0) updateMeetingSettingsAdmin({...meetingSettings,maxLimit:v}); setLocalMaxLimit(null); }} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">담당 관리자</label>
                                    <div className="flex gap-2 mt-1">
                                        <input type="text" readOnly className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                                            value={meetingSettings?.managerName||''} placeholder="미지정" />
                                        <button onClick={()=>updateMeetingSettingsAdmin({...meetingSettings, managerId:memberData?.memberId||'', managerName:memberData?.name||''})}
                                            className="px-4 py-2.5 bg-teal-500 text-white rounded-xl text-xs font-black">내가 담당</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 회원 선정 */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">회원 선정</p>
                            <div className="flex gap-1.5">
                                <button onClick={()=>setIsAttendGuestModalOpen(true)} className="px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-black rounded-xl flex items-center gap-1"><Icon.UserPlus size={12}/> 게스트</button>
                                <button onClick={attendHandleTestSelect} className="px-2.5 py-1.5 bg-amber-50 text-amber-600 text-xs font-black rounded-xl flex items-center gap-1"><Icon.Beaker size={12}/> 테스트</button>
                                <button onClick={attendHandleResetSelection} className="px-2.5 py-1.5 bg-red-50 text-red-500 text-xs font-black rounded-xl flex items-center gap-1"><Icon.RotateCcw size={12}/> 초기화</button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            {attendNormalMembers.map(member => {
                                const isSelected = tmSessionData.some(p=>p.memberId===member.id&&p.date===meetingSettings?.date);
                                return (
                                    <button key={member.id} onClick={()=>attendToggleParticipant(member)}
                                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${isSelected?'bg-teal-50 border-teal-300':'card border-slate-100 hover:border-slate-200'}`}>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected?'bg-teal-500 border-teal-500':'border-slate-300'}`}>
                                            {isSelected&&<Icon.Check size={10} className="text-white"/>}
                                        </div>
                                        <span className="font-black text-sm text-slate-800 flex-1">{member.name}</span>
                                        {member.gender==='여성'&&<span className="text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}
                                        {ADMIN_ROLES.includes(member.role)&&<span className={`text-[9px] px-1.5 py-0.5 rounded-lg font-black ${getRoleBadgeClass(member.role)}`}>{member.role}</span>}
                                        <span className="text-[9px] font-black text-slate-400">Lv.{member.level}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {attendGuestEligibleMembers.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2 px-1">게스트 참여 가능</p>
                                <div className="space-y-1.5">
                                    {attendGuestEligibleMembers.map(member => {
                                        const isSelected = tmSessionData.some(p=>p.memberId===member.id&&p.date===meetingSettings?.date);
                                        const msType = getMembershipStatus(member, meetingSettings?.date?.substring(0,7)||'')?.type;
                                        const badge = member.isSpecialRest ? '특별휴식' : (msType==='반년'?'반년납 휴식':'1년납 휴식');
                                        return (
                                            <button key={member.id} onClick={()=>attendToggleParticipantAsGuest(member)}
                                                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${isSelected?'bg-orange-50 border-orange-300':'card border-slate-100 hover:border-slate-200'}`}>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected?'bg-orange-400 border-orange-400':'border-slate-300'}`}>
                                                    {isSelected&&<Icon.Check size={10} className="text-white"/>}
                                                </div>
                                                <span className="font-black text-sm text-slate-800 flex-1">{member.name}</span>
                                                {member.gender==='여성'&&<span className="text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}
                                                <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-lg font-black">{badge}</span>
                                                <span className="text-[9px] font-black text-slate-400">Lv.{member.level}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 출석 서브탭 ── */}
                {attendSubTab === 'attend' && (
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
                                    {meetingSettings?.location&&<p className="text-xs font-black text-slate-600 mt-0.5">📍 {meetingSettings.location}</p>}
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
                                        <div className="h-full rounded-full transition-all duration-700" style={{width:`${Math.round(attendCheckedInCount/attendActiveList.length*100)}%`,background:attendCheckedInCount===0?'#e2e8f0':'linear-gradient(90deg,#14b8a6,#10b981)'}}/>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 팀별 카드 뷰 */}
                        {attendGroupedTeams.length > 0 ? (
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
                                                        {p.status==='노쇼'?<p className="text-[10px] text-red-600 font-black mt-0.5">✗ 노쇼</p>:p.checkedIn?<p className={`text-[10px] font-black mt-0.5 ${p.status==='지각'?'text-yellow-600':'text-emerald-600'}`}>{p.status==='지각'?'⚠️ 지각':'✓ 정상'} · {p.checkInTime}</p>:null}
                                                    </div>
                                                    {p.status==='노쇼'?<span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black">✗</span>:p.checkedIn?<span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0"><Icon.Check size={12} className="text-white"/></span>:<span className="text-xs font-black text-slate-300 flex-shrink-0">체크인 →</span>}
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
                                            {p.status==='노쇼'?<p className="text-[10px] text-red-600 font-black mt-0.5">✗ 노쇼</p>:p.checkedIn?<p className={`text-[10px] font-black mt-0.5 ${p.status==='지각'?'text-yellow-600':'text-emerald-600'}`}>{p.status==='지각'?'⚠️ 지각':'✓ 정상'} · {p.checkInTime}</p>:null}
                                        </div>
                                        {p.status==='노쇼'?<span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black">✗</span>:p.checkedIn?<span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0"><Icon.Check size={12} className="text-white"/></span>:<span className="text-xs font-black text-slate-300 flex-shrink-0">체크인 →</span>}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-300">
                                <p className="text-4xl mb-3">📋</p>
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
                            ? <div className="text-center py-12 text-slate-300"><p className="text-4xl mb-3">📚</p><p className="font-black">기록이 없습니다</p></div>
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
                                    ? <><input style={{userSelect:'text'}} className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1" value={editHistoryLocationValue} onChange={e=>setEditHistoryLocationValue(e.target.value)}/>
                                        <button onClick={handleUpdateHistoryLocation} className="text-xs px-2 py-1 bg-teal-500 text-white rounded-lg">저장</button>
                                        <button onClick={()=>setIsEditingHistoryLocation(false)} className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">취소</button></>
                                    : <><span className="text-xs text-slate-600 flex-1">{selectedHistoryDetail.location}</span>
                                        {selectedHistoryDetail.locationLat && (
                                            <a href={`https://map.kakao.com/link/map/${encodeURIComponent(selectedHistoryDetail.location||'위치')},${selectedHistoryDetail.locationLat},${selectedHistoryDetail.locationLng}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 font-black mr-1 underline">지도</a>
                                        )}
                                        <button onClick={()=>{setEditHistoryLocationValue(selectedHistoryDetail.location||'');setIsEditingHistoryLocation(true);}} className="p-1 text-slate-300 hover:text-slate-500"><Icon.Edit2 size={12}/></button></>
                                }
                            </div>
                        </div>
                        <div className="flex gap-2 mb-3">
                            {[['time','시간순'],['status','상태순']].map(([k,l]) => (
                                <button key={k} onClick={()=>{if(historySortKey===k&&k==='status')setHistorySortOrder(o=>o==='asc'?'desc':'asc');setHistorySortKey(k);}}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${historySortKey===k?'bg-teal-500 text-white':'card border-slate-200 text-slate-500'}`}>
                                    {l}{historySortKey===k&&k==='status'&&(historySortOrder==='asc'?'↑':'↓')}
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

        {/* 현재 출석 상태 (관리자 패널 닫혔을 때만) */}
        {!(isAdminMode && isAttendPanelOpen) && mySession?.checkedIn && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-center">
                <div className="flex justify-center mb-2"><div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center"><Icon.Check size={28} className="text-white"/></div></div>
                <p className="font-black text-xl text-emerald-400">출석 완료!</p>
                <p className="text-slate-400 text-sm mt-1">{mySession.checkInTime} · {mySession.status}</p>
            </div>
        )}

        {/* QR 처리 결과 (관리자 패널 닫혔을 때만) */}
        {!(isAdminMode && isAttendPanelOpen) && qrStatus !== 'idle' && (
            <div className={`rounded-3xl p-5 text-center border ${qrStatus==='success'?'bg-emerald-50 border-emerald-200':qrStatus==='processing'?'card border-slate-100':'bg-red-50 border-red-200'}`}>
                {qrStatus==='processing' && <><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><p className="font-black text-slate-500">QR 확인 중...</p></>}
                {qrStatus==='success' && <><p className="text-3xl mb-2">🎉</p><p className="font-black text-emerald-400 whitespace-pre-line">{qrMessage}</p></>}
                {qrStatus==='error' && (
                    <>
                        <p className="text-3xl mb-2">⚠️</p>
                        <p className="font-black text-red-400 whitespace-pre-line">{qrMessage}</p>
                        <button onClick={()=>{setQrStatus('idle');setIsQRScannerOpen(true);}} className="mt-3 text-xs text-violet-600 font-black px-5 py-2.5 rounded-xl bg-violet-50 border border-violet-200 block mx-auto">
                            📷 다시 스캔하기
                        </button>
                    </>
                )}
            </div>
        )}

        {/* GPS 출석 (관리자 패널 닫혔을 때만) */}
        {!(isAdminMode && isAttendPanelOpen) && !mySession?.checkedIn && (
            <div className="card rounded-3xl p-5">
                <p className="text-xs font-black text-teal-500 uppercase tracking-widest mb-4">GPS 출석</p>

                {gpsStatus==='idle' && (
                    <div className="text-center">
                        <p className="text-slate-400 text-sm mb-4">모임 장소 근처에 있다면<br/>아래 버튼으로 위치를 확인하세요.</p>
                        <button onClick={handleGPSCheckIn} className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black text-base shadow-lg shadow-teal-100 flex items-center justify-center gap-2">
                            <Icon.MapPin size={18} className="text-white"/> 위치 확인하기
                        </button>
                    </div>
                )}

                {gpsStatus==='checking' && (
                    <div className="text-center py-4">
                        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-slate-400 font-black">GPS 확인 중...</p>
                    </div>
                )}

                {gpsStatus==='within' && (
                    <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-4">
                            <div className="absolute inset-0 bg-teal-100 rounded-full pulse-ring"></div>
                            <div className="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center"><Icon.MapPin size={32} className="text-white"/></div>
                        </div>
                        <p className="font-black text-emerald-400 text-lg mb-3">모임 장소 근처!</p>
                        {distance !== null && (
                            <div className="mb-4 px-2">
                                <div className="flex justify-between text-[10px] font-black mb-1.5">
                                    <span className="text-emerald-400">✓ 인정 범위 내</span>
                                    <span className="text-slate-400">{distance}m / {meetingSettings?.locationRadius||100}m</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                                        style={{width:`${Math.max(10, Math.round((1 - distance/(meetingSettings?.locationRadius||100))*100))}%`}}/>
                                </div>
                            </div>
                        )}
                        <button onClick={handleGPSAttend} disabled={isCheckingIn}
                            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-base shadow-lg disabled:opacity-50">
                            {isCheckingIn ? '출석 처리 중...' : '✓ 출석 체크'}
                        </button>
                    </div>
                )}

                {gpsStatus==='outside' && (
                    <div className="text-center">
                        <p className="text-3xl mb-2">🚶</p>
                        <p className="font-black text-yellow-500 text-lg mb-3">아직 멀리 있습니다</p>
                        {distance !== null && (
                            <div className="mb-4 px-2">
                                <div className="flex justify-between text-[10px] font-black mb-1.5">
                                    <span className="text-yellow-500">현재 {distance}m</span>
                                    <span className="text-slate-400">{meetingSettings?.locationRadius||100}m 이내 필요</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-400 rounded-full transition-all duration-700"
                                        style={{width:`${Math.min(90, Math.round(distance/((meetingSettings?.locationRadius||100)*3)*100))}%`}}/>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5">{Math.max(0, distance-(meetingSettings?.locationRadius||100))}m 더 이동하면 출석 가능</p>
                            </div>
                        )}
                        <button onClick={handleGPSCheckIn} className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">
                            🔄 다시 확인
                        </button>
                    </div>
                )}

                {gpsStatus==='no_location' && (
                    <div className="text-center">
                        <p className="text-3xl mb-2">⚙️</p>
                        <p className="font-black text-slate-500 mb-1">장소 미설정</p>
                        <p className="text-slate-500 text-xs">관리자가 모임 장소 GPS를 설정하지 않았습니다.<br/>{meetingSettings?.enableQR ? 'QR 출석을 이용해주세요.' : '관리자에게 문의해주세요.'}</p>
                    </div>
                )}

                {gpsStatus==='error' && (
                    <div className="text-center">
                        <p className="text-3xl mb-2">⚠️</p>
                        <p className="font-black text-red-400 mb-3">위치 확인 실패</p>
                        <button onClick={()=>setGpsStatus('idle')} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-sm">다시 시도</button>
                    </div>
                )}

            </div>
        )}

        {/* QR 출석 버튼 — 관리자가 enableQR 활성화 시에만 표시 (패널 닫혔을 때) */}
        {!(isAdminMode && isAttendPanelOpen) && !mySession?.checkedIn && meetingSettings?.enableQR && (
            <div className="card rounded-3xl p-5">
                <p className="text-xs font-black text-violet-400 uppercase tracking-widest mb-3">QR 출석</p>
                <button onClick={()=>setIsQRScannerOpen(true)}
                    className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 text-white"
                    style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                    <span style={{fontSize:20}}>📷</span> QR 스캔하기
                </button>
                <p className="text-slate-600 text-xs text-center mt-2">관리자가 보여주는 QR코드를 스캔하세요</p>
            </div>
        )}

        {/* 직접 출석 카드 (관리자 ON + 패널 닫힌 상태, 참가자 있을 때만) */}
        {isAdminMode && !isAttendPanelOpen && attendActiveList.length > 0 && (
            <div className="card rounded-3xl p-5">
                <p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-3">직접 출석</p>
                <button onClick={() => setIsKioskOpen(true)}
                    className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 text-white"
                    style={{ background:'linear-gradient(135deg,#f97316,#ea580c)' }}>
                    <span style={{fontSize:20}}>📋</span> 키오스크 모드 열기
                </button>
                <p className="text-slate-500 text-xs text-center mt-2">회원들이 직접 이름을 탭해서 출석 처리합니다</p>
            </div>
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
// ─────────────────────────────────────────────────────────────────────────────
