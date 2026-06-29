// ─── 알림 센터(종 드롭다운) 헬퍼 ──────────────────────────────────────────────
// 알림 종류별 아이콘/색 (회비·벌금·모임·중요·게시글)
const NOTIF_META = (item) => {
    const t = item.type, c = item.category;
    if (t === 'dues') return { Cmp: Icon.CreditCard, color: 'text-teal-500', bg: 'bg-teal-50' };
    if (t === 'penalty' || c === '벌금') return { Cmp: Icon.AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' };
    if (t === 'recurring_reminder' || c === '모임' || item.linkMeetingId) return { Cmp: Icon.Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50' };
    if (c === '중요') return { Cmp: Icon.Bell, color: 'text-red-500', bg: 'bg-red-50' };
    return { Cmp: Icon.Clipboard, color: 'text-slate-500', bg: 'bg-slate-100' }; // 게시글(공지/일반)
};
// sentAt(ISO/Timestamp) → "방금/N분 전/N시간 전/N일 전/MM.DD"
const fmtNotifAgo = (v) => {
    const ms = (v && typeof v.toMillis === 'function') ? v.toMillis() : (v ? (Date.parse(v) || 0) : 0);
    if (!ms) return '';
    const min = Math.floor((Date.now() - ms) / 60000);
    if (min < 1) return '방금';
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}일 전`;
    const d = new Date(ms);
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

function MemberHeader({
    testMode, memberName, meetingSettings, mySession, teamReady, allowFromDisplay,
    myTeamInfo, myTeamIdx, handleLogout, toggleTheme, darkMode,
    isAdminMode, isMeetingOver, isMeetingEndSaved, onEndMeeting,
    unreadCount = 0, onOpenAnnouncements,
    notifications = [], onNotifNavigate, onBellOpen,
    isNotifDone, onConfirmNotif, onDismissNotif, onClearDoneNotifs,
    onOpenProfile, profileImage, children,
    isDeveloper, viewMode, onChangeViewMode, onLockDeveloper, onLogoHold,
    hasTopBanner = false
}) {
    const showOverlay = isAdminMode && isMeetingOver && !isMeetingEndSaved;
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [alertOpen, setAlertOpen] = React.useState(false);
    // 로고 길게 누르면(650ms) 개발자 PIN 진입 — 평소엔 보이지 않는 은밀한 트리거
    const holdRef = React.useRef(null);
    const cancelHold = () => { if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; } };
    const startHold = () => { if (!onLogoHold) return; cancelHold(); holdRef.current = setTimeout(() => { holdRef.current = null; onLogoHold(); }, 650); };
    const avatarChar = (memberName || '').trim().slice(-1) || '?';
    return (
        <div className="px-5 pb-4 member-header-bg" style={{paddingTop: hasTopBanner ? '1.5rem' : 'max(2.5rem, calc(env(safe-area-inset-top) + 1rem))'}}>
            <div className="flex items-center justify-between gap-2 mb-0">
                {/* 브랜드: 모이다(크게) + OTP FC·이름(작게) 병기 — 엠블럼은 왼쪽 유지 */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <img src="icon.png" alt="OTP FC" className="w-11 h-11 object-contain flex-shrink-0" onError={e=>e.target.style.display='none'}/>
                    <div className="min-w-0">
                        <h1 onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onContextMenu={e=>e.preventDefault()} className="text-[28px] leading-none font-black text-teal-600" style={{fontFamily:"'Paperlogy', 'Pretendard Variable', Pretendard, -apple-system, sans-serif", WebkitTextStroke:'0.6px currentColor', letterSpacing:'-0.04em'}}>모이다</h1>
                        <p className="text-[13px] font-bold text-slate-500 mt-1.5 truncate">OTP FC · {memberName} 님</p>
                    </div>
                </div>
                {/* 아이콘 — 좁은 화면에서 줄바꿈/우측 정렬 (홈·새로고침 버튼 제거: 새로고침은 화면을 당겨서) */}
                <div className="flex items-center justify-end gap-1.5 flex-shrink-0">
                    {/* 종 → 알림 센터 드롭다운 (게시글·회비·벌금·모임 알림 모아보기) */}
                    <div className="relative">
                        <button onClick={() => { const willOpen = !alertOpen; setAlertOpen(willOpen); if (willOpen && onBellOpen) onBellOpen(); }}
                            className="relative p-2 rounded-lg bg-slate-200/70 hover:bg-slate-200 transition-all text-slate-500" title="알림">
                            <Icon.Bell size={15}/>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                            )}
                        </button>
                        {alertOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setAlertOpen(false)}/>
                                <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden alert-pop">
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <span className="font-black text-sm text-slate-800">알림</span>
                                        <button onClick={() => setAlertOpen(false)} className="p-1 -mr-1 rounded-lg text-slate-400 active:bg-slate-100"><Icon.X size={16}/></button>
                                    </div>
                                    <div className="overflow-y-auto" style={{maxHeight:'60vh'}}>
                                        {(!notifications || notifications.length === 0) ? (
                                            <div className="px-4 py-10 text-center text-slate-400">
                                                <div className="flex justify-center mb-2 opacity-30"><Icon.Bell size={28}/></div>
                                                <p className="font-black text-sm">새 알림이 없어요</p>
                                            </div>
                                        ) : notifications.map((a, i) => {
                                            const meta = NOTIF_META(a);
                                            const done = isNotifDone ? isNotifDone(a) : false;
                                            return (
                                                <div key={a.id || i}
                                                    className={`flex items-start gap-2 px-3 py-3 ${i > 0 ? 'border-t border-slate-100' : ''} ${done ? 'opacity-60' : ''}`}>
                                                    <button onClick={() => { onConfirmNotif && onConfirmNotif(a.id); setAlertOpen(false); onNotifNavigate && onNotifNavigate(a); }}
                                                        className="flex items-start gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                                                            <meta.Cmp size={16} className={meta.color}/>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-[13.5px] text-slate-800 truncate">{a.title || '알림'}</p>
                                                            {a.body && <p className="text-[12px] text-slate-500 mt-0.5" style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{a.body}</p>}
                                                            <p className="text-[10.5px] text-slate-400 mt-1 font-bold">{fmtNotifAgo(a.sentAt)}</p>
                                                        </div>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); onDismissNotif && onDismissNotif(a.id); }}
                                                        title="삭제" className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"><Icon.X size={14}/></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center border-t border-slate-100">
                                        <button onClick={() => { onClearDoneNotifs && onClearDoneNotifs(); }}
                                            className="flex-1 py-2.5 text-center text-xs font-black text-slate-500 active:bg-slate-50">읽은 알림 정리</button>
                                        <div className="w-px h-5 bg-slate-100"/>
                                        <button onClick={() => { setAlertOpen(false); onOpenAnnouncements && onOpenAnnouncements(); }}
                                            className="flex-1 py-2.5 text-center text-xs font-black text-teal-600 active:bg-slate-50">게시판</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    {/* 프로필 아바타(LAB형) → 보기모드(개발자) · 내 프로필 · 라이트/다크 · 로그아웃 */}
                    <div className="relative">
                        <button onClick={()=>setMenuOpen(o=>!o)} className="w-9 h-9 rounded-full bg-teal-500 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden" title="프로필">
                            {profileImage ? <img src={profileImage} alt="" className="w-full h-full object-cover"/> : avatarChar}
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={()=>setMenuOpen(false)}/>
                                <div className="absolute right-0 top-11 z-50 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1">
                                    {isDeveloper && (
                                        <div className="px-3 pt-1.5 pb-2 mb-1 border-b border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 mb-1.5 px-0.5">보기 모드</p>
                                            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                                                {[['dev','개발'],['staff','운영'],['member','회원']].map(([v,l]) => (
                                                    <button key={v} onClick={() => { if (v !== viewMode && onChangeViewMode) onChangeViewMode(v); }}
                                                        className={`flex-1 px-1 py-1.5 rounded-md text-[11px] font-black leading-none transition-all ${viewMode === v ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>{l}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button onClick={()=>{ setMenuOpen(false); onOpenProfile && onOpenProfile(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-slate-700">
                                        <Icon.User size={16}/> 내 프로필
                                    </button>
                                    <button onClick={()=>{ toggleTheme && toggleTheme(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-slate-700">
                                        {darkMode ? <Icon.Sun size={16}/> : <Icon.Moon size={16}/>} {darkMode ? '라이트 모드' : '다크 모드'}
                                    </button>
                                    {isDeveloper && (
                                        <button onClick={()=>{ setMenuOpen(false); onLockDeveloper && onLockDeveloper(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-slate-700">
                                            <Icon.Wrench size={16}/> 개발자 잠금
                                        </button>
                                    )}
                                    <button onClick={()=>{ setMenuOpen(false); handleLogout && handleLogout(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-black text-red-500">
                                        <Icon.LogOut size={16}/> 로그아웃
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {children && <div className="mt-3">{children}</div>}
        </div>
    );
}
