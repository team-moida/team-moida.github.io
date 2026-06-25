const _setupHourOptions = Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
const _setupMinuteOptions = Array.from({length:12},(_,i)=>String(i*5).padStart(2,'0'));
const _snapMin = (m) => { const n=parseInt(m)||0; const s=Math.round(n/5)*5; return String(s>=60?0:s).padStart(2,'0'); };

const AttendSetupTab = ({
    darkMode, meetingTimes, activeParticipants, updateMeetingTimeSettings,
    localMaxLimit, setLocalMaxLimit, loggedInManager,
    normalMembers, guestEligibleMembers, sessionData,
    toggleParticipant, toggleParticipantAsGuest,
    handleTestSelect, handleResetSelection,
    setIsGuestModalOpen, setIsLocationPickerOpen,
}) => (
    <div>
        {/* sticky 인원 카운터 */}
        <div style={{position:'sticky',top:64,zIndex:40,marginLeft:'-1rem',marginRight:'-1rem',marginBottom:16,padding:'10px 1rem',background:darkMode?'rgba(15,23,42,0.96)':'rgba(248,250,252,0.96)',backdropFilter:'blur(8px)',borderBottom:`1px solid ${darkMode?'#334155':'#e2e8f0'}`,boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:'72rem',margin:'0 auto'}}>
                <span style={{fontSize:10,fontWeight:900,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em'}}>선정 인원</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:15,fontWeight:900,color:activeParticipants.length>=(meetingTimes.maxLimit||18)?'#183FB0':darkMode?'#f1f5f9':'#1e293b'}}>
                        {activeParticipants.length} / {meetingTimes.maxLimit||18}명
                    </span>
                    {activeParticipants.length>=(meetingTimes.maxLimit||18)&&(
                        <span style={{fontSize:9,fontWeight:900,padding:'2px 8px',background:'#dbe3f6',color:'#122E78',borderRadius:6}}>마감</span>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 mb-4">
            <p className="text-xs font-black text-teal-500 uppercase tracking-widest mb-4">모임 설정</p>
            <div className="space-y-3">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">날짜</label>
                    <input type="date" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                        value={meetingTimes.date} onChange={e=>updateMeetingTimeSettings({...meetingTimes,date:e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase">시작</label>
                        <div className="flex gap-1 mt-1">
                            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black"
                                value={meetingTimes.start.split(':')[0]} onChange={e=>updateMeetingTimeSettings({...meetingTimes,start:`${e.target.value}:${_snapMin(meetingTimes.start.split(':')[1])}`})}>
                                {_setupHourOptions.map(h=><option key={h} value={h}>{h}시</option>)}
                            </select>
                            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black"
                                value={_snapMin(meetingTimes.start.split(':')[1])} onChange={e=>updateMeetingTimeSettings({...meetingTimes,start:`${meetingTimes.start.split(':')[0]}:${e.target.value}`})}>
                                {_setupMinuteOptions.map(m=><option key={m} value={m}>{m}분</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-rose-400 uppercase">종료</label>
                        <div className="flex gap-1 mt-1">
                            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black"
                                value={meetingTimes.end.split(':')[0]} onChange={e=>updateMeetingTimeSettings({...meetingTimes,end:`${e.target.value}:${_snapMin(meetingTimes.end.split(':')[1])}`})}>
                                {_setupHourOptions.map(h=><option key={h} value={h}>{h}시</option>)}
                            </select>
                            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-black"
                                value={_snapMin(meetingTimes.end.split(':')[1])} onChange={e=>updateMeetingTimeSettings({...meetingTimes,end:`${meetingTimes.end.split(':')[0]}:${e.target.value}`})}>
                                {_setupMinuteOptions.map(m=><option key={m} value={m}>{m}분</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">장소</label>
                    <div className="flex gap-2 mt-1">
                        <input type="text" placeholder="장소명 직접 입력" className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black"
                            value={meetingTimes.location||''} onChange={e=>updateMeetingTimeSettings({...meetingTimes,location:e.target.value})} />
                        <button
                            onClick={() => setIsLocationPickerOpen(true)}
                            className={`shrink-0 px-3 py-2.5 rounded-xl text-sm font-black border transition-all active:scale-95 ${meetingTimes.locationLat ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                            title="지도에서 장소 선택">
                            <Icon.MapPin size={16} />
                        </button>
                    </div>
                    {meetingTimes.locationLat && (
                        <div className="flex items-center gap-2 mt-1.5 px-1">
                            <span className="text-[10px] text-slate-400 font-mono">
                                {meetingTimes.locationLat.toFixed(5)}, {meetingTimes.locationLng.toFixed(5)}
                            </span>
                            <a href={`https://map.kakao.com/link/map/${encodeURIComponent(meetingTimes.location||'위치')},${meetingTimes.locationLat},${meetingTimes.locationLng}`}
                               target="_blank" rel="noopener noreferrer"
                               className="text-[10px] text-blue-500 font-black underline inline-flex items-center gap-0.5">지도 확인 <Icon.ChevronRight size={10}/></a>
                            <button onClick={() => updateMeetingTimeSettings({...meetingTimes, locationLat:null, locationLng:null})}
                                className="text-[10px] text-slate-300 hover:text-red-400 font-black ml-auto">좌표 삭제</button>
                        </div>
                    )}
                    <div className="mt-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">GPS 인정 반경</label>
                        <div className="flex gap-2 mt-1">
                            {[30,50,100,150,200].map(r => (
                                <button key={r}
                                    onClick={() => updateMeetingTimeSettings({...meetingTimes, locationRadius: r})}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${(meetingTimes.locationRadius||100)===r ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {r}m
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">출석 방식</label>
                    <div
                        onClick={() => updateMeetingTimeSettings({...meetingTimes, enableQR: !meetingTimes.enableQR})}
                        className="mt-1.5 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 cursor-pointer active:bg-slate-100 transition-colors"
                        style={{minHeight:52}}>
                        <div>
                            <p className="text-sm font-black text-slate-700">QR 출석 허용</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">GPS가 기본입니다. QR을 추가로 허용할 수 있습니다.</p>
                        </div>
                        <div className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ml-3 ${meetingTimes.enableQR ? 'bg-violet-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${meetingTimes.enableQR ? 'translate-x-6' : 'translate-x-1'}`}></span>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">선착순 인원</label>
                    <input type="number" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-center"
                        value={localMaxLimit !== null ? localMaxLimit : (meetingTimes.maxLimit||18)}
                        onChange={e=>setLocalMaxLimit(e.target.value)}
                        onBlur={e=>{
                            const v = parseInt(e.target.value);
                            if (v > 0) updateMeetingTimeSettings({...meetingTimes, maxLimit:v});
                            setLocalMaxLimit(null);
                        }} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">담당 관리자</label>
                    <div className="flex gap-2 mt-1">
                        <input type="text" className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black" readOnly
                            value={meetingTimes.managerName||''} placeholder="미지정" />
                        <button onClick={()=>updateMeetingTimeSettings({...meetingTimes,managerId:loggedInManager?.id||'',managerName:loggedInManager?.name||''})}
                            className="shrink-0 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-xs font-black">내가 담당</button>
                    </div>
                </div>
            </div>
        </div>

        {/* 회원 선정 */}
        <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">회원 선정</p>
            <div className="flex gap-2">
                <button onClick={()=>setIsGuestModalOpen(true)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-black rounded-xl flex items-center gap-1">
                    <Icon.UserPlus size={12} /> 게스트
                </button>
                <button onClick={handleTestSelect} className="px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-black rounded-xl flex items-center gap-1">
                    <Icon.Beaker size={12}/> 테스트
                </button>
                <button onClick={handleResetSelection} className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-black rounded-xl flex items-center gap-1">
                    <Icon.RotateCcw size={12} /> 초기화
                </button>
            </div>
        </div>

        <div className="space-y-1.5">
            {normalMembers.map(member => {
                const isSelected = sessionData.some(p=>p.memberId===member.id&&p.date===meetingTimes.date);
                return (
                    <button key={member.id} onClick={()=>toggleParticipant(member)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${isSelected?'bg-teal-50 border-teal-300':'bg-white border-slate-100 hover:border-slate-200'}`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected?'bg-teal-500 border-teal-500':'border-slate-300'}`}>
                            {isSelected&&<Icon.Check size={10} className="text-white" />}
                        </div>
                        <span className="font-black text-sm text-slate-800 flex-1">{member.name}</span>
                        {member.gender==='여성'&&<span className="text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}
                        {STAFF_ROLES.includes(member.role)&&<span className={`text-[9px] px-1.5 py-0.5 rounded-lg font-black ${getRoleBadgeClass(member.role)}`}>{member.role}</span>}
                        <span className="text-[9px] font-black text-slate-400">{member.level}</span>
                    </button>
                );
            })}
        </div>

        {guestEligibleMembers.length > 0 && (
            <div className="mt-4">
                <p className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2 px-1">게스트 참여 가능</p>
                <div className="space-y-1.5">
                    {guestEligibleMembers.map(member => {
                        const isSelected = sessionData.some(p=>p.memberId===member.id&&p.date===meetingTimes.date);
                        const msType = getMembershipStatus(member, meetingTimes.date?.substring(0,7)||'')?.type;
                        const badge = member.isSpecialRest ? '특별휴식' : (msType==='반년'?'반년납 휴식':'1년납 휴식');
                        return (
                            <button key={member.id} onClick={()=>toggleParticipantAsGuest(member)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${isSelected?'bg-orange-50 border-orange-300':'bg-white border-slate-100 hover:border-slate-200'}`}>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected?'bg-orange-400 border-orange-400':'border-slate-300'}`}>
                                    {isSelected&&<Icon.Check size={10} className="text-white" />}
                                </div>
                                <span className="font-black text-sm text-slate-800 flex-1">{member.name}</span>
                                {member.gender==='여성'&&<span className="text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded-lg font-black">W</span>}
                                <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-lg font-black">{badge}</span>
                                <span className="text-[9px] font-black text-slate-400">{member.level}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
);
