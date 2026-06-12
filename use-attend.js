function useAttend({ isAdminMode, memberData, meetingSettings, tmSessionData, activeMembers, tmMonthlyStatuses, teamDraftData }) {
    const { useState, useEffect, useMemo, useRef } = React;
    const ms = (v) => v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : (typeof v === 'string' ? (Date.parse(v) || 0) : 0));
    const testMode = !!meetingSettings?.testMode;

    const [isAttendPanelOpen, setIsAttendPanelOpen] = useState(false);
    const [attendSubTab, setAttendSubTab] = useState('roster');
    const [attendHistory, setAttendHistory] = useState([]);
    const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null);
    const [historySortKey, setHistorySortKey] = useState('time');
    const [historySortOrder, setHistorySortOrder] = useState('asc');
    const [isEditingHistoryLocation, setIsEditingHistoryLocation] = useState(false);
    const [editHistoryLocationValue, setEditHistoryLocationValue] = useState('');
    const [historyEditTarget, setHistoryEditTarget] = useState(null);
    const [attendModal, setAttendModal] = useState({type:null, data:null});
    const [isAttendGuestModalOpen, setIsAttendGuestModalOpen] = useState(false);
    const [attendNewGuest, setAttendNewGuest] = useState({name:'', gender:'남성', inviterId:'', level:'1'});
    const [attendEditingGuestId, setAttendEditingGuestId] = useState(null);
    const [attendGuestTarget, setAttendGuestTarget] = useState(null);
    const [isQRGenModalOpen, setIsQRGenModalOpen] = useState(false);
    const [currentQRToken, setCurrentQRToken] = useState('');
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [attendIsPending, setAttendIsPending] = useState(false);
    const [isKioskOpen, setIsKioskOpen] = useState(false);
    const [localMaxLimit, setLocalMaxLimit] = useState(null);
    const [testModeBackup, setTestModeBackup] = useState(null);
    const hasAutoNoShowRef = useRef(false);
    const hasAutoFixedRef = useRef(false);
    const [attendCurrentTime, setAttendCurrentTime] = useState(() => new Date());
    const [registrationList, setRegistrationList] = useState([]);

    useEffect(() => {
        if (!isAdminMode) return;
        const unsub = getHistoryCol().onSnapshot(snap => {
            setAttendHistory(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.date.localeCompare(a.date)));
        }, () => {});
        return () => unsub();
    }, [isAdminMode]);

    useEffect(() => {
        if (!isAdminMode) return;
        const t = setInterval(() => setAttendCurrentTime(new Date()), 10000);
        return () => clearInterval(t);
    }, [isAdminMode]);

    useEffect(() => {
        const mDate = meetingSettings?.date;
        if (!mDate) { setRegistrationList([]); return; }
        const mType = meetingSettings?.meetingType || 'self';
        const mid = getMeetingId(meetingSettings);
        const query = mType === 'match'
            ? getRegistrationsCol().where('meetingId', '==', mid)
            : getRegistrationsCol().where('meetingDate', '==', mDate);
        const unsub = query.onSnapshot(snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRegistrationList(mType === 'match' ? list : list.filter(r => r.meetingType !== 'match'));
        }, () => {});
        return () => unsub();
    }, [meetingSettings?.date, meetingSettings?.meetingType]);

    useEffect(() => {
        if (!isQRGenModalOpen || !currentQRToken || !meetingSettings?.date) return;
        setTimeout(() => {
            const container = document.getElementById('attend-qr-canvas');
            if (!container) return;
            container.innerHTML = '';
            const qrUrl = `https://nakdo0415-crypto.github.io/moida/member.html?token=${currentQRToken}&date=${meetingSettings.date}`;
            new QRCode(container, { text:qrUrl, width:220, height:220, colorDark:'#0f172a', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M });
        }, 100);
    }, [isQRGenModalOpen, currentQRToken, meetingSettings?.date]);

    const attendActiveParticipants = useMemo(() => {
        const mDate = meetingSettings?.date || '';
        const mid = meetingSettings ? getMeetingId(meetingSettings) : '';
        return tmSessionData
            .filter(p => {
                if (p.date !== mDate) return false;
                if (p.meetingId) return p.meetingId === mid;
                return !mid.endsWith('__match');
            })
            .sort((a,b) => ms(a.createdAt) - ms(b.createdAt) || a.name.localeCompare(b.name));
    }, [tmSessionData, meetingSettings?.date, meetingSettings?.meetingType]);

    const { attendNormalMembers, attendGuestEligibleMembers } = useMemo(() => {
        const monthStr = meetingSettings?.date?.substring(0,7) || '';
        const normal = [], guestEligible = [];
        activeMembers.sort((a,b)=>a.name.localeCompare(b.name)).forEach(member => {
            if (ADMIN_ROLES.includes(member.role)) { normal.push(member); return; }
            if (member.isSpecialRest) { guestEligible.push(member); return; }
            const isResting = tmMonthlyStatuses[member.id] === 'rest';
            if (isResting) {
                const info = getMembershipStatus(member, monthStr);
                if (info?.active) guestEligible.push(member);
                return;
            }
            const isPaid = tmMonthlyStatuses[member.id] === 'paid';
            const info = getMembershipStatus(member, monthStr);
            if (isPaid || info?.active) normal.push(member);
        });
        return { attendNormalMembers: normal, attendGuestEligibleMembers: guestEligible };
    }, [activeMembers, tmMonthlyStatuses, meetingSettings?.date]);

    const attendGroupedTeams = useMemo(() => {
        if (!teamDraftData?.teams) return [];
        return teamDraftData.teams.map((t, teamIdx) => {
            const members = t.members.map(tm => {
                const p = attendActiveParticipants.find(p => p.memberId === (tm.memberId||tm.id));
                return p || null;
            }).filter(Boolean).map((p, i) => ({...p, jerseyNumber: i+1}));
            return members.length > 0 ? {teamName: getTeamName(teamIdx), teamIdx, members} : null;
        }).filter(Boolean);
    }, [attendActiveParticipants, teamDraftData]);

    const isMeetingOver = useMemo(() => {
        if (!meetingSettings?.date || !meetingSettings?.end) return false;
        const [y,m,d] = meetingSettings.date.split('-');
        const [hr,min] = meetingSettings.end.split(':');
        return attendCurrentTime >= new Date(parseInt(y),parseInt(m)-1,parseInt(d),parseInt(hr),parseInt(min),0);
    }, [meetingSettings?.date, meetingSettings?.end, attendCurrentTime]);

    const myRegistration = useMemo(() =>
        registrationList.find(r => r.memberId === memberData?.memberId) || null,
    [registrationList, memberData?.memberId]);

    const regConfirmedCount = useMemo(() =>
        registrationList.filter(r => r.status === 'confirmed').length,
    [registrationList]);

    const regWaitingList = useMemo(() =>
        registrationList
            .filter(r => r.status === 'waiting')
            .sort((a, b) => (a.registeredAt?.seconds || 0) - (b.registeredAt?.seconds || 0)),
    [registrationList]);

    const myWaitingPosition = useMemo(() => {
        if (myRegistration?.status !== 'waiting') return null;
        return regWaitingList.findIndex(r => r.memberId === memberData?.memberId) + 1;
    }, [myRegistration, regWaitingList, memberData?.memberId]);

    const attendLimit = useMemo(() => testMode ? attendActiveParticipants.length : (meetingSettings?.maxLimit || 18), [testMode, attendActiveParticipants.length, meetingSettings?.maxLimit]);
    const attendActiveList = useMemo(() => attendActiveParticipants.slice(0, attendLimit), [attendActiveParticipants, attendLimit]);
    const attendWaitingList = useMemo(() => attendActiveParticipants.slice(attendLimit), [attendActiveParticipants, attendLimit]);
    const attendCheckedInCount = useMemo(() => attendActiveList.filter(p=>p.checkedIn).length, [attendActiveList]);
    const attendAssignedIds = useMemo(() => new Set(attendGroupedTeams.flatMap(g=>g.members.map(m=>m.id))), [attendGroupedTeams]);
    const attendUnassignedActive = useMemo(() => attendActiveList.filter(p=>!attendAssignedIds.has(p.id)), [attendActiveList, attendAssignedIds]);

    const sortedHistoryRecords = useMemo(() => {
        if (!selectedHistoryDetail?.records) return [];
        const list = selectedHistoryDetail.records.map((r,i) => ({...r, originalIndex:i}));
        if (historySortKey === 'time') return list.sort((a,b)=>(a.timestamp||'99:99').localeCompare(b.timestamp||'99:99'));
        if (historySortKey === 'status') {
            const order = {'정상':1,'지각':2,'노쇼':3,'미출석':4};
            return list.sort((a,b) => {
                let diff = (order[a.status]||9)-(order[b.status]||9);
                if (historySortOrder==='desc') diff=-diff;
                return diff || (a.timestamp||'99:99').localeCompare(b.timestamp||'99:99');
            });
        }
        return list;
    }, [selectedHistoryDetail, historySortKey, historySortOrder]);

    const attendHourOptions = useMemo(() => Array.from({length:24},(_,i)=>String(i).padStart(2,'0')), []);
    const attendMinuteOptions = useMemo(() => Array.from({length:12},(_,i)=>String(i*5).padStart(2,'0')), []);
    const snapMin = (m) => { const n=parseInt(m)||0; const s=Math.round(n/5)*5; return String(s>=60?0:s).padStart(2,'0'); };

    useEffect(() => {
        if (!isAdminMode || !isMeetingOver || hasAutoNoShowRef.current || !meetingSettings?.date) return;
        const _d = new Date();
        const todayStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
        if (meetingSettings.date !== todayStr) return;
        hasAutoNoShowRef.current = true;
        const lim = meetingSettings?.maxLimit || 18;
        const date = meetingSettings.date;
        const _mType = meetingSettings.meetingType || 'self';
        const _mid = getMeetingId(meetingSettings);
        (async () => {
            try {
                const _query = _mType === 'match'
                    ? getSessionCol().where('meetingId', '==', _mid)
                    : getSessionCol().where('date', '==', date);
                const snap = await _query.get();
                const all = snap.docs.map(d=>({id:d.id,...d.data()}));
                const forMeeting = _mType === 'match' ? all : all.filter(s => !s.meetingId || !s.meetingId.endsWith('__match'));
                const sorted = forMeeting.sort((a,b)=>ms(a.createdAt)-ms(b.createdAt)||a.name.localeCompare(b.name));
                const toNoShow = sorted.slice(0,lim).filter(p=>!p.checkedIn&&p.status!=='노쇼');
                if (toNoShow.length===0) return;
                const batch = db.batch();
                toNoShow.forEach(p => batch.update(getSessionCol().doc(p.id),{status:'노쇼'}));
                await batch.commit();
            } catch(e) { console.error('자동 노쇼 처리 실패:',e); }
        })();
    }, [isMeetingOver, isAdminMode]);
    useEffect(() => { hasAutoNoShowRef.current = false; }, [meetingSettings?.date, meetingSettings?.end]);

    return {
        isAttendPanelOpen, setIsAttendPanelOpen,
        attendSubTab, setAttendSubTab,
        attendHistory,
        selectedHistoryDetail, setSelectedHistoryDetail,
        historySortKey, setHistorySortKey,
        historySortOrder, setHistorySortOrder,
        isEditingHistoryLocation, setIsEditingHistoryLocation,
        editHistoryLocationValue, setEditHistoryLocationValue,
        historyEditTarget, setHistoryEditTarget,
        attendModal, setAttendModal,
        isAttendGuestModalOpen, setIsAttendGuestModalOpen,
        attendNewGuest, setAttendNewGuest,
        attendEditingGuestId, setAttendEditingGuestId,
        attendGuestTarget, setAttendGuestTarget,
        isQRGenModalOpen, setIsQRGenModalOpen,
        currentQRToken, setCurrentQRToken,
        isLocationPickerOpen, setIsLocationPickerOpen,
        attendIsPending, setAttendIsPending,
        isKioskOpen, setIsKioskOpen,
        localMaxLimit, setLocalMaxLimit,
        testModeBackup, setTestModeBackup,
        hasAutoNoShowRef, hasAutoFixedRef,
        attendCurrentTime,
        attendActiveParticipants, attendNormalMembers, attendGuestEligibleMembers,
        attendGroupedTeams, isMeetingOver,
        attendLimit, attendActiveList, attendWaitingList,
        attendCheckedInCount, attendAssignedIds, attendUnassignedActive,
        sortedHistoryRecords, attendHourOptions, attendMinuteOptions, snapMin,
        registrationList, myRegistration, regConfirmedCount, regWaitingList, myWaitingPosition,
    };
}
