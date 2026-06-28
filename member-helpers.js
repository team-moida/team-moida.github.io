/* ── 거리 계산 ── */
const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2-lat1) * Math.PI / 180, Δλ = (lng2-lng1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

/* ── URL 파라미터 ── */
const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return { token: params.get('token'), date: params.get('date') };
};

/* ── 역할 상수 ── */
const ADMIN_ROLES = ['회장', '매니저', '총무', '부총무'];

/* ── 명단/회비 헬퍼 ── */
const getMonthlyCol = () => getCol('monthly_checks');
const getMemberCol  = () => getCol('members');
const getMembershipStatus = (member, targetMonthStr) => {
    if(!member.membershipType||member.membershipType==='monthly'||!member.membershipEndDate)return null;
    const end=new Date(member.membershipEndDate);
    const endMonth=new Date(end.getFullYear(),end.getMonth(),1);
    const[y,m]=targetMonthStr.split('-').map(Number);
    const current=new Date(y,m-1,1);
    if(current>endMonth)return{active:false,msg:'만료됨',type:member.membershipType==='half_year'?'반년':'1년'};
    const monthsRemaining=(endMonth.getFullYear()-current.getFullYear())*12+(endMonth.getMonth()-current.getMonth())+1;
    const maxRest=member.membershipType==='half_year'?3:6;
    const usedRest=member.totalRestMonths||0;
    const endDateFormatted=`${end.getFullYear().toString().slice(2)}.${String(end.getMonth()+1).padStart(2,'0')}.${String(end.getDate()).padStart(2,'0')}`;
    return{active:true,remaining:monthsRemaining,type:member.membershipType==='half_year'?'반년':'1년',endDate:member.membershipEndDate,endDateFormatted,maxRest,usedRest,remainingRest:maxRest-usedRest};
};
// 회원이 '그 달(YYYY-MM)'에 이미 회비 대상 회원으로 시작됐는지.
// 가입월(duesStartMonth) 없거나 원년멤버면 항상 true(하위호환 — 기존 회원 영향 0).
// 보는 달이 가입월보다 이전이면 false → 그 달엔 회원으로 안 침(미납으로도 안 뜸, 목록·통계·대상에서 제외).
const joinedByMonth = (member, targetMonthStr) => {
    if (!member) return false;
    if (member.isFounder) return true;
    const start = member.duesStartMonth;
    if (!start) return true;
    return !targetMonthStr || targetMonthStr >= start;   // 'YYYY-MM' 문자열 비교 OK
};
// 이번 달(로컬) 'YYYY-MM' — 신규 회원 가입월 기본값 등에 사용.
const thisMonthStr = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; };
const STAFF_ROLES_CONST = ['회장','매니저','총무','부총무'];
const getMemberStatusType = (member, statuses, reasons, targetMonthStr) => {
    if(STAFF_ROLES_CONST.includes(member.role))return 'staff';
    if(member.isSpecialRest&&targetMonthStr>=(member.specialRestStartMonth||'0000-00'))return 'special';
    const status=statuses[member.id];
    const membershipInfo=getMembershipStatus(member,targetMonthStr);
    if(membershipInfo&&membershipInfo.active){if(status==='rest')return 'rest';return membershipInfo.type==='반년'?'half':'full';}
    if(status==='paid')return 'monthly';
    if(status==='rest')return reasons[member.id]?'special':'rest';
    return 'unpaid';
};
const statusConfig = {
    staff:{label:'운영진',color:'bg-slate-900 text-white'},
    monthly:{label:'월납',color:'bg-emerald-500 text-white'},
    half:{label:'반년납',color:'bg-blue-500 text-white'},
    full:{label:'1년납',color:'bg-indigo-600 text-white'},
    rest:{label:'휴식',color:'bg-amber-400 text-slate-800'},
    special:{label:'특별휴식',color:'bg-orange-400 text-white'},
    unpaid:{label:'미납',color:'bg-rose-500 text-white'},
};

/* ── 출석 헬퍼 ── */
const getSessionCol  = () => getCol('weekly_session');
// 세션(선정) 문서가 해당 모임 소속인지 판정. 빈 date(유령) 문서는 무조건 제외(가드).
// 출석현황(use-attend)·명단 탭(tab-attend) 양쪽 공통 사용 — 한 곳만 고치면 양쪽 반영.
const sessionMatchesMeeting = (p, meeting) => {
    const mDate = meeting?.date || '';
    const mid = meeting ? getMeetingId(meeting) : '';
    if (!mDate || !p.date) return false;          // 기준/문서 date가 비면 무조건 제외(빈 date 매칭 차단)
    if (p.date !== mDate) return false;
    if (p.meetingId) return p.meetingId === mid;
    return !mid.endsWith('__match');
};
// 출석 오픈(=팀 공개) 판정 — 모임시작 −70분. member.html teamReady/allowFromDisplay에서 추출(F-2a-0, 로직 0 변경).
// computeMeetingDay(tab-home.js)는 호출 시점(렌더타임)엔 항상 정의됨(전 스크립트 공유 전역 렉시컬).
const ATTEND_OPEN_LEAD_MIN = 70;
const isAttendOpen = (meeting, now, testMode) => {
    if (!meeting?.date || !meeting?.start) return false;
    if (testMode) return true;
    const di = computeMeetingDay(meeting.date, meeting.start);
    if (!di) return false;
    if (di.type === 'past') return true;
    if (di.type === 'future') return false;
    const [y,m,d] = meeting.date.split('-').map(Number);
    const [h,min] = meeting.start.split(':').map(Number);
    const allowFrom = new Date(y, m-1, d, h, min, 0).getTime() - ATTEND_OPEN_LEAD_MIN*60*1000;
    return now.getTime() >= allowFrom;
};
const getAttendOpenTime = (meeting) => {
    if (!meeting?.date || !meeting?.start) return null;
    const [y,m,d] = meeting.date.split('-').map(Number);
    const [h,min] = meeting.start.split(':').map(Number);
    const af = new Date(y, m-1, d, h, min, 0);
    af.setTime(af.getTime() - ATTEND_OPEN_LEAD_MIN*60*1000);
    return `${String(af.getHours()).padStart(2,'0')}:${String(af.getMinutes()).padStart(2,'0')}`;
};
const getHistoryCol  = () => getCol('history');
const getSettingsCol = () => getCol('settings');
const getQRCol       = () => getCol('qr_tokens');
const getPendingCol  = () => getCol('pending_registrations');
const KAKAO_REST_KEY = 'bdebf2ece4ae2d9315448ec55001d7b2';
const KAKAO_PROXY    = 'https://corsproxy.io/?url=';
const getThisSunday = () => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const day = d.getDay();
    const diff = (day === 0) ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const getNextSundayFromDate = (dateStr) => {
    let d = dateStr ? new Date(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1])-1, parseInt(dateStr.split('-')[2]), 12, 0, 0) : new Date();
    const day = d.getDay();
    const diff = (day === 0) ? 7 : 7 - day;
    d.setDate(d.getDate() + diff);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

/* ── 매치: 현재 라운드의 내 경기 뽑기 (홈 카드 F-2b · 매치탭 '내 경기'와 동일 규칙) ──
   매치표(scheduleData) + 내 팀 글자(myTeam: 'A'/'B'…)를 넣으면 현재 라운드의 내 경기 정보를 반환.
   현재 라운드 번호 = 서버 저장값(currentMatchIndex, 없으면 0 → 1라운드). 조끼색·매치표는 읽기만(변경 없음).
   반환: null(매치표/팀 없음) | {allDone,total} | {roundNo,total,resting:true}
        | {roundNo,total,resting:false,opponent,oppIdx,fieldName} | {roundNo,total,resting:false,opponent:null} */
const getMyCurrentRoundMatch = (scheduleData, myTeam) => {
    const sessions = scheduleData?.schedule?.list || [];
    if (!sessions.length || !myTeam) return null;
    const total = sessions.length;
    const cmi = scheduleData.currentMatchIndex ?? 0;
    if (cmi >= total) return { allDone: true, total };
    const session = sessions[cmi];
    if (!session) return { allDone: true, total };
    const roundNo = cmi + 1;
    if (session.resting?.includes(myTeam)) return { roundNo, total, resting: true };
    const myMatch = (session.matches || []).find(m => m.match.includes(myTeam));
    if (!myMatch) return { roundNo, total, resting: false, opponent: null };
    const [t1, t2] = myMatch.match;
    const opponent = t1 === myTeam ? t2 : t1;
    const oppIdx = opponent.charCodeAt(0) - 65;
    const fieldName = scheduleData.config?.fieldNames?.[myMatch.fieldIdx] || `${myMatch.fieldIdx + 1}구장`;
    return { roundNo, total, resting: false, opponent, oppIdx, fieldName };
};
