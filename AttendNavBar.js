function AttendNavBar({ view, setView, pendingRegistrations, setIsPendingModalOpen, generateQRCode, darkMode, toggleTheme, testMode, toggleTestMode, handleLogout, setIsNotifModalOpen }) {
    const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);
    return (
        <nav className="sticky top-0 bg-white/90 backdrop-blur-md border-b z-50 h-16 flex items-center px-4 shadow-sm">
            <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
                <div className="flex items-center gap-1">
                    {['attendance','setup','history_list'].map(v => (
                        <button key={v} onClick={()=>setView(v)} className={`px-3 py-2 rounded-xl font-black text-xs transition-all ${view===v?'bg-teal-500 text-white shadow-lg':'text-slate-400 hover:text-slate-600'}`}>
                            {v==='attendance'?'출석':v==='setup'?'선정':'기록'}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {pendingRegistrations.length > 0 && (
                        <button onClick={()=>setIsPendingModalOpen(true)} className="relative p-2.5 rounded-xl bg-rose-50 text-rose-500">
                            <Icon.Bell size={18} />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{pendingRegistrations.length}</span>
                        </button>
                    )}
                    <button onClick={generateQRCode} className="p-2.5 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100" title="QR 출석 생성">
                        <Icon.QrCode size={18} />
                    </button>
                    <button onClick={()=>{localStorage.setItem('moida_admin_mode','true');window.location.href='member.html';}}
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all" title="회원 모드">
                        <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0"/>
                        회원
                    </button>
                    <button onClick={()=>window.location.href='index.html'} className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><Icon.Home size={18}/></button>
                    <div className="relative">
                        <button onClick={()=>setIsMoreMenuOpen(v=>!v)} className={`p-2.5 rounded-xl transition-all ${isMoreMenuOpen?'bg-slate-200 text-slate-700':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} title="더보기">
                            <Icon.DotsVertical size={18}/>
                        </button>
                        {isMoreMenuOpen && (
                            <>
                                <div className="fixed inset-0" style={{zIndex:199}} onClick={()=>setIsMoreMenuOpen(false)}/>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl overflow-hidden" style={{zIndex:200,border:'1px solid #e2e8f0',top:'100%'}}>
                                    <button onClick={()=>{setIsNotifModalOpen(true);setIsMoreMenuOpen(false);}} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-teal-600 hover:bg-teal-50 active:bg-teal-100">
                                        <Icon.Bell size={16}/> 공지 발송
                                    </button>
                                    <div style={{height:1,background:'#f1f5f9',margin:'0 16px'}}/>
                                    <button onClick={()=>{window.location.reload();}} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100">
                                        <Icon.Refresh size={16}/> 새로고침
                                    </button>
                                    <button onClick={()=>{toggleTheme();}} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100">
                                        {darkMode ? <Icon.Sun size={16}/> : <Icon.Moon size={16}/>} {darkMode?'라이트 모드':'다크 모드'}
                                    </button>
                                    <button onClick={()=>{toggleTestMode();setIsMoreMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${testMode?'bg-amber-50 text-amber-600 font-bold':'text-slate-700 hover:bg-slate-50 active:bg-slate-100'}`}>
                                        <Icon.Beaker size={16}/> 테스트 모드 {testMode?'ON':'OFF'}
                                    </button>
                                    <div style={{height:1,background:'#f1f5f9',margin:'0 16px'}}/>
                                    <button onClick={()=>{setIsMoreMenuOpen(false);handleLogout();}} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 active:bg-red-100">
                                        <Icon.LogOut size={16}/> 로그아웃
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
