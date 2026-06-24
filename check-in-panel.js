// 회원 출석 체크인 UI (GPS / QR) — 출석탭(tab-attend.js)과 홈 카드(tab-home.js)가 공유하는 순수 컴포넌트.
// F-1: tab-attend.js의 회원 체크인 4개 블록(①출석완료 ②QR결과 ③GPS/QR버튼 ④GPS진행/결과)을 그대로 이식.
//  - 마크업·클래스·텍스트·로직 변경 0. 'showCheckin' 게이트는 호출부가 판단(여기선 제거).
//  - compact=false → 출석탭 현행과 픽셀 동일. compact=true → 홈 카드용 축소(③ 버튼 크기만; 이번엔 호출 안 함).
//  - 의존 로직(handleGPSCheckIn/handleGPSAttend/processQRToken·-70분·정상/지각·QR검증)은 호출만, 변경 없음.
function CheckInPanel({
    compact = false,
    mySession, meetingSettings,
    gpsStatus, distance, setGpsStatus,
    handleGPSCheckIn, handleGPSAttend, isCheckingIn,
    qrStatus, qrMessage, setQrStatus, setIsQRScannerOpen,
}) {
    return (
        <>
        {/* ① 현재 출석 상태 */}
        {mySession?.checkedIn && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <div className="flex justify-center mb-2"><div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center"><Icon.Check size={28} className="text-white"/></div></div>
                <p className="font-black text-xl text-emerald-400">출석 완료!</p>
                <p className="text-slate-400 text-sm mt-1">{mySession.checkInTime} · {mySession.status}</p>
            </div>
        )}

        {/* ② QR 처리 결과 */}
        {qrStatus !== 'idle' && (
            <div className={`rounded-2xl p-5 text-center border ${qrStatus==='success'?'bg-emerald-50 border-emerald-200':qrStatus==='processing'?'card border-slate-100':'bg-red-50 border-red-200'}`}>
                {qrStatus==='processing' && <><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><p className="font-black text-slate-500">QR 확인 중...</p></>}
                {qrStatus==='success' && <><div className="flex justify-center mb-2"><Icon.CheckCircle size={36} className="text-emerald-400"/></div><p className="font-black text-emerald-400 whitespace-pre-line">{qrMessage}</p></>}
                {qrStatus==='error' && (
                    <>
                        <div className="flex justify-center mb-2"><Icon.AlertTriangle size={36} className="text-red-400"/></div>
                        <p className="font-black text-red-400 whitespace-pre-line">{qrMessage}</p>
                        <button onClick={()=>{setQrStatus('idle');setIsQRScannerOpen(true);}} className="mt-3 text-xs text-violet-600 font-black px-5 py-2.5 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center gap-1 mx-auto">
                            <Icon.Camera size={13}/>다시 스캔하기
                        </button>
                    </>
                )}
            </div>
        )}

        {/* ③ 회원 출석 버튼: GPS / QR 나란히 (홈 카드 스타일) */}
        {!mySession?.checkedIn && (
          <div className="flex gap-3">
            <button onClick={handleGPSCheckIn}
                className="flex-1 min-w-0 rounded-2xl p-4 text-left text-white active:scale-98 transition-all flex flex-col justify-between"
                style={{ minHeight: compact?'108px':'188px', background:'linear-gradient(135deg,var(--c-accent),var(--c-accent-deep))', boxShadow:'0 10px 28px -8px rgba(18,46,120,0.45)' }}>
                <Icon.MapPin size={compact?44:60} className="text-white"/>
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/80">GPS 출석</p>
                    <p className="font-black text-base leading-tight">위치 확인</p>
                </div>
            </button>
            {meetingSettings?.enableQR && (
                <button onClick={()=>setIsQRScannerOpen(true)}
                    className="flex-1 min-w-0 rounded-2xl p-4 text-left text-white active:scale-98 transition-all flex flex-col justify-between"
                    style={{ minHeight: compact?'108px':'188px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow:'0 10px 28px -8px rgba(124,58,237,0.45)' }}>
                    <Icon.QrCode size={compact?44:60} className="text-white"/>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/80">QR 출석</p>
                        <p className="font-black text-base leading-tight">스캔하기</p>
                    </div>
                </button>
            )}
          </div>
        )}

        {/* ④ GPS 진행/결과 (위치 확인 누른 뒤에만) */}
        {!mySession?.checkedIn && gpsStatus!=='idle' && (
            <div className="card rounded-2xl p-5">
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
                                    <span className="text-emerald-400 inline-flex items-center gap-0.5"><Icon.Check size={11}/>인정 범위 내</span>
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
                            {isCheckingIn ? '출석 처리 중...' : <span className="inline-flex items-center justify-center gap-1"><Icon.Check size={16}/>출석 체크</span>}
                        </button>
                    </div>
                )}

                {gpsStatus==='outside' && (
                    <div className="text-center">
                        <div className="flex justify-center mb-2"><Icon.Walk size={36} className="text-yellow-500"/></div>
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
                        <button onClick={handleGPSCheckIn} className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5">
                            <Icon.Refresh size={14}/>다시 확인
                        </button>
                    </div>
                )}

                {gpsStatus==='no_location' && (
                    <div className="text-center">
                        <div className="flex justify-center mb-2"><Icon.Settings size={36} className="text-slate-400"/></div>
                        <p className="font-black text-slate-500 mb-1">장소 미설정</p>
                        <p className="text-slate-500 text-xs">관리자가 모임 장소 GPS를 설정하지 않았습니다.<br/>{meetingSettings?.enableQR ? 'QR 출석을 이용해주세요.' : '관리자에게 문의해주세요.'}</p>
                    </div>
                )}

                {gpsStatus==='error' && (
                    <div className="text-center">
                        <div className="flex justify-center mb-2"><Icon.AlertTriangle size={36} className="text-red-400"/></div>
                        <p className="font-black text-red-400 mb-3">위치 확인 실패</p>
                        <button onClick={()=>setGpsStatus('idle')} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-sm">다시 시도</button>
                    </div>
                )}

            </div>
        )}
        </>
    );
}

// 출석 풀스크린 모달 — 홈 카드에서 CheckInPanel(GPS/QR)을 띄움(F-2a-1a). 매치판 모달과 같은 풀스크린 패턴.
// z-[60] < QR스캐너(9999) → QR이 위에 뜸. 닫기 = X / 빈 본문영역 탭 / 뒤로가기(member.html useMoidaBack).
function AttendModal({
    onClose, meeting,
    mySession, meetingSettings,
    gpsStatus, distance, setGpsStatus,
    handleGPSCheckIn, handleGPSAttend, isCheckingIn,
    qrStatus, qrMessage, setQrStatus, setIsQRScannerOpen,
}) {
    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50"
            style={{paddingTop:'env(safe-area-inset-top)', paddingBottom:'env(safe-area-inset-bottom)'}}>
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-200 bg-white">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-teal-600">출석 체크</p>
                    <p className="font-black text-lg text-slate-800 leading-tight mt-0.5 truncate">{fmtMeetingDate(meeting?.date)} · {meeting?.start}~{meeting?.end}</p>
                    {meeting?.location && (
                        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 min-w-0"><Icon.MapPin size={13} className="flex-shrink-0"/><span className="truncate">{meeting.location}</span></p>
                    )}
                </div>
                <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-500 flex-shrink-0 active:scale-95" title="닫기"><Icon.X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" onClick={(e)=>{ if (e.target === e.currentTarget) onClose(); }}>
                <CheckInPanel
                    compact={false}
                    mySession={mySession} meetingSettings={meetingSettings}
                    gpsStatus={gpsStatus} distance={distance} setGpsStatus={setGpsStatus}
                    handleGPSCheckIn={handleGPSCheckIn} handleGPSAttend={handleGPSAttend} isCheckingIn={isCheckingIn}
                    qrStatus={qrStatus} qrMessage={qrMessage} setQrStatus={setQrStatus} setIsQRScannerOpen={setIsQRScannerOpen}
                />
            </div>
        </div>
    );
}
