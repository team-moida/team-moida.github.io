function useRoster({ isAdminMode }) {
    const { useState, useEffect, useMemo } = React;

    const [allMembers, setAllMembers] = useState([]);
    const [rosterSubTab, setRosterSubTab] = useState('directory');
    const [targetMonth, setTargetMonth] = useState(() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
    });
    const [filterCategory, setFilterCategory] = useState('all');
    const [monthlyStatuses, setMonthlyStatuses] = useState({});
    const [monthlyReasons, setMonthlyReasons] = useState({});
    const [monthlyPaymentDates, setMonthlyPaymentDates] = useState({});
    const [duesReports, setDuesReports] = useState({});
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMemberForm, setNewMemberForm] = useState({name:'',birth:'',gender:'남성',position:'all',level:'4',role:'회원',coupleId:'',joinDate:'',address:'',phone:''});
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
            setAllMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
        let list = [...activeMembers].sort((a,b) => a.name.localeCompare(b.name));
        if (filterCategory !== 'all') {
            list = list.filter(m => getMemberStatusType(m, monthlyStatuses, monthlyReasons, targetMonth) === filterCategory);
        }
        return list;
    }, [activeMembers, filterCategory, monthlyStatuses, monthlyReasons, targetMonth]);
    const filterCounts = useMemo(() => {
        const counts = {all:activeMembers.length, monthly:0, half:0, full:0, rest:0, special:0, unpaid:0};
        activeMembers.forEach(m => {
            const type = getMemberStatusType(m, monthlyStatuses, monthlyReasons, targetMonth);
            if (type !== 'staff' && counts[type] !== undefined) counts[type]++;
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
