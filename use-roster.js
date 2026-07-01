function useRoster({ isAdminMode }) {
    const { useState, useEffect, useMemo } = React;

    const [allMembers, setAllMembers] = useState([]);
    const [rosterSubTab, setRosterSubTab] = useState('directory');
    const [targetMonth, setTargetMonth] = useState(() => {
        // 회원 회비 카드와 동일한 '미리보기 창'(월말 7일 전부터 다음 달) 기준으로 기본 월을 잡는다.
        // 안 그러면 월말에 회원이 신고한 '다음 달' 회비가 관리자(이번 달 기준)에 안 보인다.
        const n = new Date();
        const Y = n.getFullYear(), Mo = n.getMonth(), D = n.getDate();
        const dim = new Date(Y, Mo + 1, 0).getDate();
        const tgt = (D >= dim - 6) ? new Date(Y, Mo + 1, 1) : new Date(Y, Mo, 1);
        return `${tgt.getFullYear()}-${String(tgt.getMonth()+1).padStart(2,'0')}`;
    });
    const [filterCategory, setFilterCategory] = useState('all');
    const [monthlyStatuses, setMonthlyStatuses] = useState({});
    const [monthlyReasons, setMonthlyReasons] = useState({});
    const [monthlyPaymentDates, setMonthlyPaymentDates] = useState({});
    const [duesReports, setDuesReports] = useState({});
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMemberForm, setNewMemberForm] = useState({name:'',birth:'',gender:'남성',position:'all',level:'4',role:'회원',coupleId:'',joinDate:'',address:'',phone:'',duesStartMonth:thisMonthStr(),isFastYear:false});
    const [editingMember, setEditingMember] = useState(null);
    const [resigningMember, setResigningMember] = useState(null);
    const [resignForm, setResignForm] = useState({date:'',reason:'',isForced:false});
    const [deletingMember, setDeletingMember] = useState(null);
    const [billingMember, setBillingMember] = useState(null);
    const [actionStep, setActionStep] = useState('main');
    const [selectedAction, setSelectedAction] = useState(null);
    const [paymentDateInput, setPaymentDateInput] = useState('');
    const [manualEndDate, setManualEndDate] = useState('');
    const [specialRestReason, setSpecialRestReason] = useState('');
    const [tempRestCount, setTempRestCount] = useState(0);

    useEffect(() => {
        if (!isAdminMode) return;
        const unsub = getMemberCol().onSnapshot(snap => {
            setAllMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => !m.isTest));
        });
        return () => unsub();
    }, [isAdminMode]);

    useEffect(() => {
        if (!isAdminMode || !targetMonth) return;
        const unsub = getMonthlyCol().doc(targetMonth).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setMonthlyStatuses(data.statuses || {});
                setMonthlyReasons(data.reasons || {});
                setMonthlyPaymentDates(data.paymentDates || {});
            } else {
                setMonthlyStatuses({});
                setMonthlyReasons({});
                setMonthlyPaymentDates({});
            }
        });
        return () => unsub();
    }, [isAdminMode, targetMonth]);

    // 회원 납부 신고(대기/확정) — 이번 달 기준
    useEffect(() => {
        if (!isAdminMode || !targetMonth) return;
        const unsub = getCol('dues_reports').where('month', '==', targetMonth).onSnapshot(snap => {
            const map = {};
            snap.forEach(d => { const r = d.data(); if (r && r.memberId) map[r.memberId] = r; });
            setDuesReports(map);
        });
        return () => unsub();
    }, [isAdminMode, targetMonth]);

    const activeMembers = useMemo(() => allMembers.filter(m => !m.isResigned), [allMembers]);
    const resignedMembers = useMemo(() => allMembers.filter(m => m.isResigned), [allMembers]);
    const filteredMembers = useMemo(() => {
        // 보는 달이 회원의 '가입월(duesStartMonth)'보다 이전이면 제외 — 그 달엔 회원이 아니므로 미납으로도 안 뜸
        let list = [...activeMembers].filter(m => joinedByMonth(m, targetMonth)).sort((a,b) => a.name.localeCompare(b.name));
        if (filterCategory === 'expiring') {
            // 반년납/1년납 이번 달 종료 예정(남은 1개월) — 갱신 안내용
            list = list.filter(m => { const ms = getMembershipStatus(m, targetMonth); return ms && ms.active && ms.remaining <= 1; });
        } else if (filterCategory !== 'all') {
            list = list.filter(m => getMemberStatusType(m, monthlyStatuses, monthlyReasons, targetMonth) === filterCategory);
        }
        return list;
    }, [activeMembers, filterCategory, monthlyStatuses, monthlyReasons, targetMonth]);
    const filterCounts = useMemo(() => {
        const counts = {all:0, monthly:0, half:0, full:0, rest:0, special:0, unpaid:0, expiring:0};
        activeMembers.forEach(m => {
            if (!joinedByMonth(m, targetMonth)) return;   // 그 달 가입월 이전 회원은 인원수에서도 제외
            counts.all++;
            const type = getMemberStatusType(m, monthlyStatuses, monthlyReasons, targetMonth);
            if (type !== 'staff' && counts[type] !== undefined) counts[type]++;
            if (type !== 'staff') { const ms = getMembershipStatus(m, targetMonth); if (ms && ms.active && ms.remaining <= 1) counts.expiring++; }
        });
        return counts;
    }, [activeMembers, monthlyStatuses, monthlyReasons, targetMonth]);

    return {
        allMembers, activeMembers, resignedMembers, filteredMembers, filterCounts,
        rosterSubTab, setRosterSubTab,
        targetMonth, setTargetMonth,
        filterCategory, setFilterCategory,
        monthlyStatuses, monthlyReasons, monthlyPaymentDates, duesReports,
        isAddModalOpen, setIsAddModalOpen,
        newMemberForm, setNewMemberForm,
        editingMember, setEditingMember,
        resigningMember, setResigningMember,
        resignForm, setResignForm,
        deletingMember, setDeletingMember,
        billingMember, setBillingMember,
        actionStep, setActionStep,
        selectedAction, setSelectedAction,
        paymentDateInput, setPaymentDateInput,
        manualEndDate, setManualEndDate,
        specialRestReason, setSpecialRestReason,
        tempRestCount, setTempRestCount,
    };
}
