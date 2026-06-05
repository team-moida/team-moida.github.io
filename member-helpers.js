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
