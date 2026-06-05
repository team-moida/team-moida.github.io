const getMembershipStatus = (member, targetMonthStr) => {
    if(!member.membershipType||member.membershipType==='monthly'||!member.membershipEndDate)return null;
    const end=new Date(member.membershipEndDate);
    const endMonth=new Date(end.getFullYear(),end.getMonth(),1);
    const[y,m]=targetMonthStr.split('-').map(Number);
    const current=new Date(y,m-1,1);
    if(current>endMonth)return{active:false,msg:'만료됨',type:member.membershipType==='half_year'?'반년':'1년'};
    let monthsRemaining=(endMonth.getFullYear()-current.getFullYear())*12+(endMonth.getMonth()-current.getMonth())+1;
    const maxRest=member.membershipType==='half_year'?3:6;
    const usedRest=member.totalRestMonths||0;
    const endDateFormatted=`${end.getFullYear().toString().slice(2)}.${String(end.getMonth()+1).padStart(2,'0')}.${String(end.getDate()).padStart(2,'0')}`;
    return{active:true,remaining:monthsRemaining,type:member.membershipType==='half_year'?'반년':'1년',endDate:member.membershipEndDate,endDateFormatted,maxRest,usedRest,remainingRest:maxRest-usedRest};
};
const getMemberStatusType = (member, statuses, reasons, targetMonthStr) => {
    if(STAFF_ROLES.includes(member.role))return 'staff';
    if(member.isSpecialRest&&targetMonthStr>=(member.specialRestStartMonth||'0000-00'))return 'special';
    const status=statuses[member.id];
    const membershipInfo=getMembershipStatus(member,targetMonthStr);
    if(membershipInfo&&membershipInfo.active){if(status==='rest')return 'rest';return membershipInfo.type==='반년'?'half':'full';}
    if(status==='paid')return 'monthly';
    if(status==='rest')return reasons[member.id]?'special':'rest';
    return 'unpaid';
};
const Icon = {
    Home:({size=18,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    UserPlus:({size=18,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
    Edit:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    Trash:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    ChevronLeft:({size=20,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="15 18 9 12 15 6"/></svg>,
    ChevronRight:({size=20,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"/></svg>,
    Check:({size=14,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>,
    Refresh:({size=16,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg>,
    Coffee:({size=14,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    Heart:({size=12,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
    Sun:({size=18,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    Moon:({size=18,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    MapPin:({size=12,className=""})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
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
