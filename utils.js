/* ── 레벨/역할 ── */
const getLevelColor = (l) => {
    const n=parseInt(l)>6?parseInt(l)-6:parseInt(l);
    return ['','bg-rose-500 text-white','bg-orange-500 text-white','bg-amber-400 text-slate-800','bg-emerald-500 text-white','bg-blue-500 text-white','bg-violet-500 text-white'][n]||'bg-slate-400 text-white';
};
const getLevelPoints = (level) => { const l=parseInt(level); const n=l>6?l-6:l; return [0,15,11,8,5,3,1][n]||1; };
const getRoleBadgeClass = (role) => {
    switch(role){case '회장':return 'bg-slate-900 text-white';case '매니저':return 'bg-blue-600 text-white';case '총무':return 'bg-green-600 text-white';case '부총무':return 'bg-green-100 text-green-700';default:return 'bg-slate-100 text-slate-400';}
};

/* ── 팀 ── */
const getTeamName = (idx) => String.fromCharCode(65+idx);
const getTeamCard = (idx) => ['bg-jersey-pink-50 border-jersey-pink-200','bg-jersey-sky-50 border-jersey-sky-200','bg-jersey-lime-50 border-jersey-lime-200','bg-jersey-yellow-50 border-jersey-yellow-200','bg-jersey-blue-50 border-jersey-blue-200','bg-jersey-red-50 border-jersey-red-200'][idx]||'bg-slate-50 border-slate-200';
const getTeamColorClass = getTeamCard;
const getTeamBadge = (idx) => ['bg-jersey-pink-500 text-white','bg-jersey-sky-400 text-white','bg-jersey-lime-400 text-slate-800','bg-jersey-yellow-400 text-slate-800','bg-jersey-blue-600 text-white','bg-jersey-red-500 text-white'][idx]||'bg-slate-500 text-white';
const getTeamBadgeColor = getTeamBadge;
const getTeamColorName = (idx) => ['핑크','하늘','연두','노랑','파랑','빨강'][idx]||'';

/* ── 배열 ── */
const shuffleArray = (arr) => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

/* ── 포맷 ── */
const formatBirth = (b) => {
    if(!b)return '생일미입력';
    const c=String(b).replace(/[^0-9]/g,'');
    if(c.length===8)return `${c.substring(0,4)}.${c.substring(4,6)}.${c.substring(6,8)}`;
    if(c.length===6){const yy=parseInt(c.substring(0,2));return `${yy<50?'20':'19'}${c.substring(0,2)}.${c.substring(2,4)}.${c.substring(4,6)}`;}
    return b;
};
const formatBirthInput = (v) => {
    const d=String(v||'').replace(/[^0-9]/g,'');
    if(d.length<=4)return d;
    if(d.length<=6)return `${d.slice(0,4)}.${d.slice(4)}`;
    return `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`;
};
const formatPhoneInput = (v) => {
    const d=String(v||'').replace(/[^0-9]/g,'');
    if(d.length<=3)return d;
    if(d.length<=7)return `${d.slice(0,3)}-${d.slice(3)}`;
    return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7,11)}`;
};

/* ── 포지션/팀 색상 ── */
const getPosColorClass = (pos) => {
    if (!pos) return 'bg-slate-50 text-slate-400 border-slate-100';
    const p = String(pos).toLowerCase();
    if (p.includes('피보')) return 'bg-red-50 text-red-500 border-red-100';
    if (p.includes('아라')) return 'bg-green-50 text-green-600 border-green-100';
    if (p.includes('픽소')) return 'bg-blue-50 text-blue-500 border-blue-100';
    if (p.includes('골레이로')) return 'bg-purple-50 text-purple-600 border-purple-100';
    return 'bg-yellow-50 text-yellow-600 border-yellow-100';
};
const getTeamNumberColor = (index) => ['text-jersey-pink-500','text-jersey-sky-400','text-jersey-lime-500','text-jersey-yellow-400','text-jersey-blue-600','text-jersey-red-500'][index] || 'text-slate-300';

/* ── 회비 날짜 계산 ── */
const calculateEndDate = (startMonthStr, durationMonths) => {
    if(!startMonthStr)return '';
    const[y,m]=startMonthStr.split('-').map(Number);
    const end=new Date(y,m-1+durationMonths+1,0);
    return `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
};
const extendEndDate = (currentEndDateStr,monthsToAdd=1) => {
    if(!currentEndDateStr)return '';
    const[y,m]=currentEndDateStr.split('-').map(Number);
    const end=new Date(y,m+monthsToAdd,0);
    return `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
};

/* ── 모임 식별자 ── */
const getMeetingId = (m) => m.meetingType === 'match' ? m.date + '__match' : m.date;

/* ── 모임 담당자 표시 "이름(직책)" ── 직책은 members 목록에서 managerId로 조회. 직책 없으면 이름만. */
const getManagerLabel = (meeting, members) => {
    const name = meeting?.managerName || '';
    if (!name) return '';
    const m = (members || []).find(x => x.id === meeting.managerId);
    const role = (m && m.role && m.role !== '회원') ? m.role : '';
    return role ? `${name}(${role})` : name;
};
