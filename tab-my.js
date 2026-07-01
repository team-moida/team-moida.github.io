// ─── MY 탭 (회원 마이페이지) ──────────────────────────────────────────────────
// 메뉴(항목 목록) → 누르면 상세 화면으로 진입(회비/벌금/출석). 게시판→회칙과 같은 내부 뷰 전환.
// 설정/계정/보기모드는 그 자리에서 토글·표시(이동 없음).
// 모든 동작은 기존 상태/핸들러를 '전달받아 호출'만 한다 — 새 로직·상태 정의 없음.
// (회칙은 게시판 탭에 있으므로 MY에는 두지 않는다.)
// 표시용 시맨틱 버전(vMAJOR.MINOR.PATCH) — index.html 로그인 푸터와 항상 같이 맞춘다.
// 큰 변화=MAJOR / 새 기능=MINOR / 자잘한 수정=PATCH. SW 캐시(moida-vNNN)는 별도 카운터(배포마다 +1, 화면 미표시).
const APP_VERSION = 'v1.20.0';

// 벌금 상세 — 카드는 비면 스스로 null. 둘 다 비면(내 벌금 0건) "없어요" 안내.
// 구독은 이 화면(벌금 상세)이 떠 있을 때만 살아있음(컴포넌트 분리). 관리자 모드는 카드가 전체관리 목록을 보여주므로 빈 안내 제외.
const PenaltyDetail = ({ isAdminMode, memberName, memberInfo, managers }) => {
    const { useState, useEffect } = React;
    const [count, setCount] = useState(null);   // null=로딩(깜빡임 방지), number=내 벌금 문서 수
    const memberId = memberInfo?.id || null;
    useEffect(() => {
        if (!memberId) { setCount(0); return; }
        const unsub = getCol('penalties').where('memberId', '==', memberId).onSnapshot(s => setCount(s.docs.length));
        return () => unsub();
    }, [memberId]);
    const showEmpty = !isAdminMode && count === 0;
    return (
        <div className="space-y-3">
            <PenaltyPayCard mode="full" isAdminMode={isAdminMode} memberName={memberName} memberInfo={memberInfo} managers={managers} />
            <PenaltyHistoryCard memberInfo={memberInfo} />
            {showEmpty && (
                <div className="card rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                    <p className="font-black text-sm text-slate-400">벌금 내역이 없어요</p>
                </div>
            )}
        </div>
    );
};

const TabMy = ({
    memberInfo, memberName, isAdminMode, onOpenProfile,
    notifPermission, registerFcmToken, darkMode, toggleTheme, handleLogout,
    isDeveloper, viewMode, onChangeViewMode, onLockDeveloper,
    attendHistory, managers,
}) => {
    const { useState } = React;
    const avatarChar = (memberName || '').trim().slice(-1) || '?';
    const profileImage = memberInfo?.profileImage || memberInfo?.kakaoProfileImage;
    const role = memberInfo?.role || '회원';
    const level = memberInfo?.level;
    // 회원권 상태(반년/1년 회원만 객체, 월납·무가입은 null) — 기존 helper 재사용
    const ms = memberInfo ? getMembershipStatus(memberInfo, thisMonthStr()) : null;
    // 회비/벌금 카드용 — 기존 회비 탭 호출부와 동일 계산(새 상태 아님, STAFF_ROLES는 전역)
    const previewAsMember = isDeveloper && viewMode === 'member';
    const duesExempt = !!(memberInfo && STAFF_ROLES.includes(memberInfo.role)) && !previewAsMember;
    const isDevMode = isDeveloper && viewMode === 'dev';   // 개발 전용(DevDuesToggle) 노출
    // [내 출석] 상세 표시 조건 — 이미 받는 attendHistory에서 파생(새 구독 없음). 빈 화면 안내 분기용.
    const _myId = memberInfo?.id;
    const hasAttendance = !!_myId && (attendHistory || []).some(h => (h.records || []).some(r => r.memberId === _myId && r.status && r.status !== '대기'));

    // 메뉴 ↔ 상세 내부 뷰 전환(null=메뉴, 'dues'|'penalty'|'attend'=상세)
    const [myView, setMyView] = useState(null);

    // 알림 권한(보정 3 — 권한 3분기, 가짜 토글 금지). 앱에서 권한 회수 불가 → 끄려면 기기 설정 안내.
    const [reqBusy, setReqBusy] = useState(false);
    const askNotif = async () => {
        if (reqBusy) return;
        setReqBusy(true);
        try { if (registerFcmToken) await registerFcmToken(); } catch (_) {}
        setReqBusy(false);
    };
    const perm = notifPermission;

    // ─── 상세 화면(메뉴 → 진입) ─────────────────────────────────────────────
    if (myView) {
        const titles = { dues: '회비', penalty: '벌금', attend: '내 출석' };
        return (
            <div className="animate-in space-y-3">
                {/* 뒤로 헤더 → 메뉴로 복귀 */}
                <div className="flex items-center gap-1 px-1">
                    <button onClick={() => setMyView(null)} className="flex items-center -ml-1.5 p-1.5 rounded-lg text-slate-500 active:bg-slate-100 transition-colors">
                        <Icon.ChevronLeft size={22}/>
                    </button>
                    <h2 className="font-black text-lg text-slate-800">{titles[myView]}</h2>
                </div>

                {myView === 'dues' && (
                    <div className="space-y-3">
                        <DuesAccountCard mode="full" isAdminMode={isAdminMode} memberName={memberName} memberInfo={memberInfo} previewAsMember={previewAsMember} />
                        <DuesHistoryCard memberInfo={memberInfo} isExempt={duesExempt} embedded />
                    </div>
                )}

                {myView === 'penalty' && (
                    <PenaltyDetail isAdminMode={isAdminMode} memberName={memberName} memberInfo={memberInfo} managers={managers} />
                )}

                {myView === 'attend' && (
                    hasAttendance
                        ? <MyAttendanceCard attendHistory={attendHistory} memberInfo={memberInfo} memberName={memberName} embedded />
                        : <div className="card rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                              <p className="font-black text-sm text-slate-400">아직 출석 기록이 없어요</p>
                          </div>
                )}
            </div>
        );
    }

    // ─── 메뉴(기본) ────────────────────────────────────────────────────────
    // 한 줄 리스트 행: 라벨(좌) + 화살표(우). 누르면 상세로 진입.
    const MenuRow = ({ label, onClick }) => (
        <button onClick={onClick} className="w-full flex items-center px-4 py-3.5 text-left active:bg-slate-50 transition-colors">
            <span className="flex-1 font-black text-sm text-slate-700">{label}</span>
            <Icon.ChevronRight size={18} className="text-slate-300 flex-shrink-0"/>
        </button>
    );

    return (
        <div className="animate-in space-y-3">
            <h2 className="font-black text-lg text-slate-800 px-1">MY</h2>

            {/* 프로필 카드 → 누르면 기존 내 프로필 모달 */}
            <button onClick={onOpenProfile} className="w-full card rounded-2xl p-4 flex items-center gap-3.5 text-left active:scale-98 transition-all">
                <div className="w-14 h-14 rounded-full bg-teal-500 text-white font-black text-lg flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                    {profileImage ? <img src={profileImage} alt="" className="w-full h-full object-cover"/> : avatarChar}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-base text-slate-800 truncate">{memberName} <span className="text-slate-400 text-sm">님</span></p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{role}</span>
                        {/* 레벨(등급)은 운영진이 '다른' 회원을 평가할 때 쓰는 값 — 본인 프로필(MY)에는 운영진이라도 표시하지 않음 */}
                        {ms && (ms.active
                            ? <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{ms.type}납 · ~{ms.endDateFormatted}</span>
                            : <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-500">{ms.type}납 만료</span>)}
                    </div>
                </div>
                <Icon.ChevronRight size={18} className="text-slate-300 flex-shrink-0"/>
            </button>

            {/* 내 활동 요약(홈과 동일한 비율색 도넛 카드, tab-home.js 정의) — 기록 있을 때만. 누르면 '내 출석' 상세로 */}
            {hasAttendance && (
                <MyActivitySummaryCard attendHistory={attendHistory} memberInfo={memberInfo} onTabChange={() => setMyView('attend')} />
            )}

            {/* 내 정보 — 회비/벌금/출석 메뉴 행(누르면 상세 진입) */}
            <div>
                <h3 className="font-black text-base text-slate-800 px-1 mb-2">내 정보</h3>
                <div className="card rounded-2xl divide-y divide-slate-100">
                    <MenuRow label="회비" onClick={() => setMyView('dues')} />
                    <MenuRow label="벌금" onClick={() => setMyView('penalty')} />
                    <MenuRow label="내 출석" onClick={() => setMyView('attend')} />
                </div>
            </div>

            {/* 설정 */}
            <div>
                <h3 className="font-black text-base text-slate-800 px-1 mb-2">설정</h3>
                <div className="card rounded-2xl divide-y divide-slate-100">
                    {/* 알림 (보정 3 — 권한 3분기, 가짜 토글 금지) */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                        <Icon.Bell size={18} className="text-slate-400 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-slate-700">알림</p>
                            <p className="text-[11.5px] text-slate-400 font-bold mt-0.5">
                                {perm === 'granted' ? '알림이 켜져 있어요'
                                 : perm === 'denied' ? '기기/브라우저 설정에서 알림을 켜주세요'
                                 : '공지·모임·회비 알림을 받아보세요'}
                            </p>
                        </div>
                        {perm === 'granted' ? (
                            <span className="text-xs font-black px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">켜짐</span>
                        ) : perm === 'denied' ? (
                            <span className="text-xs font-black px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 shrink-0">기기 설정</span>
                        ) : (
                            <button onClick={askNotif} disabled={reqBusy} className="text-xs font-black px-3 py-1.5 rounded-full bg-teal-500 text-white shrink-0 active:scale-95 transition-all disabled:opacity-50">{reqBusy ? '요청 중…' : '알림 받기'}</button>
                        )}
                    </div>
                    {/* 끄기 안내 — 켜진 상태에서만(앱에서 회수 불가 명시) */}
                    {perm === 'granted' && (
                        <div className="px-4 py-2.5">
                            <p className="text-[11px] text-slate-400 leading-relaxed">알림을 끄려면 기기(휴대폰) 설정 → 모이다 → 알림에서 꺼주세요. 앱에서는 끌 수 없어요.</p>
                        </div>
                    )}
                    {/* 다크모드 */}
                    <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors">
                        {darkMode ? <Icon.Sun size={18} className="text-slate-400 flex-shrink-0"/> : <Icon.Moon size={18} className="text-slate-400 flex-shrink-0"/>}
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-slate-700">{darkMode ? '라이트 모드' : '다크 모드'}</p>
                            <p className="text-[11.5px] text-slate-400 font-bold mt-0.5">{darkMode ? '밝은 화면으로 전환' : '어두운 화면으로 전환'}</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* (개발자) 보기 모드 — 헤더와 동일한 viewMode/onChangeViewMode/onLockDeveloper 공유 (보정 4) */}
            {isDeveloper && (
                <div>
                    <h3 className="font-black text-base text-slate-800 px-1 mb-2">보기 모드</h3>
                    <div className="card rounded-2xl p-4">
                        <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5">
                            {[['dev','개발'],['staff','운영'],['member','회원']].map(([v,l]) => (
                                <button key={v} onClick={() => { if (v !== viewMode && onChangeViewMode) onChangeViewMode(v); }}
                                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-black leading-none transition-all ${viewMode === v ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>{l}</button>
                            ))}
                        </div>
                        <button onClick={() => onLockDeveloper && onLockDeveloper()} className="w-full mt-2.5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-black text-sm active:scale-95 transition-all">
                            <Icon.Wrench size={15}/> 개발자 잠금
                        </button>
                    </div>
                </div>
            )}

            {/* 개발 전용 — 회비/벌금 상태 테스트(정의는 tab-home.js, 호출만) */}
            {isDevMode && <DevDuesToggle memberInfo={memberInfo} />}

            {/* 계정 */}
            <div>
                <h3 className="font-black text-base text-slate-800 px-1 mb-2">계정</h3>
                <div className="card rounded-2xl divide-y divide-slate-100">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors">
                        <Icon.LogOut size={18} className="text-rose-400 flex-shrink-0"/>
                        <span className="flex-1 font-black text-sm text-rose-500">로그아웃</span>
                    </button>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                        <Icon.Smartphone size={18} className="text-slate-300 flex-shrink-0"/>
                        <span className="flex-1 font-black text-sm text-slate-400">앱 버전</span>
                        <span className="text-xs font-black text-slate-400">모이다 {APP_VERSION}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
