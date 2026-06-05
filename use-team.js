function useTeam({ isAdminMode, meetingSettings, allMembers }) {
    const { useState, useEffect, useMemo, useRef } = React;

    const [isTeamPanelOpen, setIsTeamPanelOpen] = useState(false);
    const [teamMakerTab, setTeamMakerTab] = useState('generator');
    const [tmSessionData, setTmSessionData] = useState([]);
    const [tmMonthlyStatuses, setTmMonthlyStatuses] = useState({});
    const [excludedIds, setExcludedIds] = useState([]);
    const [teamingSettings, setTeamingSettings] = useState({teamCount:3,keepCouples:true,avoidOverlap:true});
    const [editTeams, setEditTeams] = useState([]);
    const [editIsConfirmed, setEditIsConfirmed] = useState(false);
    const [editMeetingDate, setEditMeetingDate] = useState('');
    const [draggedItem, setDraggedItem] = useState(null);
    const [selectedMemberTM, setSelectedMemberTM] = useState(null);
    const [selectedTeamTM, setSelectedTeamTM] = useState(null);
    const [dropIndicator, setDropIndicator] = useState(null);
    const [confirmedDrafts, setConfirmedDrafts] = useState([]);
    const [savedDrafts, setSavedDrafts] = useState([]);
    const [teamDraftData, setTeamDraftData] = useState(null);
    const [teamStorageSubTab, setTeamStorageSubTab] = useState('confirmed');
    const [previewDraft, setPreviewDraft] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        const unsub = getCol('team_drafts')
            .where('isConfirmed', '==', true)
            .onSnapshot(snap => {
                const list = [];
                snap.forEach(d => list.push(d.data()));
                setConfirmedDrafts(list);
            }, () => {});
        return () => unsub();
    }, []);

    useEffect(() => {
        const date = meetingSettings?.date;
        if (!date || !confirmedDrafts.length) { setTeamDraftData(null); return; }
        const filtered = confirmedDrafts
            .filter(d => d.meetingDate === date)
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setTeamDraftData(filtered[0] || null);
    }, [confirmedDrafts, meetingSettings?.date]);

    useEffect(() => {
        if (!isAdminMode) return;
        const unsub = getCol('weekly_session').onSnapshot(snap => {
            setTmSessionData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [isAdminMode]);

    useEffect(() => {
        if (!isAdminMode || !meetingSettings?.date) return;
        const [y, m] = meetingSettings.date.split('-');
        const docKey = `${y}-${m}`;
        const unsub = getCol('monthly_checks').doc(docKey).onSnapshot(doc => {
            setTmMonthlyStatuses(doc.exists ? (doc.data().statuses || {}) : {});
        });
        return () => unsub();
    }, [isAdminMode, meetingSettings?.date]);

    useEffect(() => {
        if (!isAdminMode) return;
        const unsub = getCol('team_drafts').where('isConfirmed', '==', false).onSnapshot(snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSavedDrafts(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
        }, () => {});
        return () => unsub();
    }, [isAdminMode]);

    useEffect(() => {
        const lim = parseInt(meetingSettings?.maxLimit || 18);
        setTeamingSettings(prev => ({ ...prev, teamCount: Math.max(2, Math.round(lim / 6)) }));
    }, [meetingSettings?.maxLimit]);

    const tmMeetingDate = meetingSettings?.date || '';
    const tmMaxLimit = parseInt(meetingSettings?.maxLimit || 18);

    const pastTeammatesMap = useMemo(() => {
        const map = {};
        const sorted = [...confirmedDrafts].sort((a, b) => (b.meetingDate||'').localeCompare(a.meetingDate||''));
        if (sorted[0]?.teams) {
            sorted[0].teams.forEach(team => {
                const ids = team.members.map(m => m.memberId || m.id);
                ids.forEach(id1 => {
                    if (!map[id1]) map[id1] = new Set();
                    ids.forEach(id2 => { if (id1 !== id2) map[id1].add(id2); });
                });
            });
        }
        return map;
    }, [confirmedDrafts]);

    const tmAllAttendees = useMemo(() => {
        if (!tmMeetingDate) return [];
        const [y, m] = tmMeetingDate.split('-');
        const targetMonthStr = `${y}-${m}`;
        return tmSessionData.filter(s => {
            if (!s.date || s.date.trim() !== tmMeetingDate.trim() || s.status === '노쇼') return false;
            if (s.isGuest) return true;
            const mi = allMembers.find(mm => mm.id === s.memberId);
            if (!mi) return true;
            if (mi.isResigned) return false;
            if (mi.isSpecialRest && targetMonthStr >= (mi.specialRestStartMonth || '0000-00')) return false;
            if (tmMonthlyStatuses[s.memberId] === 'rest') return false;
            return true;
        }).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.name.localeCompare(b.name));
    }, [tmSessionData, tmMeetingDate, allMembers, tmMonthlyStatuses]);

    const tmEntryList = useMemo(() => tmAllAttendees.slice(0, tmMaxLimit), [tmAllAttendees, tmMaxLimit]);
    const tmActiveList = useMemo(() => tmEntryList.filter(p => !excludedIds.includes(p.memberId || p.id)), [tmEntryList, excludedIds]);

    const tmUnassigned = useMemo(() => {
        if (editTeams.length === 0) return [];
        const assignedIds = new Set();
        editTeams.forEach(t => t.members.forEach(m => assignedIds.add(m.memberId || m.id)));
        return tmAllAttendees.filter(a => !assignedIds.has(a.memberId || a.id) && !excludedIds.includes(a.memberId || a.id)).map(p => {
            const mi = allMembers.find(mm => mm.id === p.memberId) || {};
            const lvl = parseInt(mi.level || p.level || 4);
            return { ...p, name: mi.name || p.name, level: lvl, points: getLevelPoints(lvl) };
        });
    }, [tmAllAttendees, editTeams, allMembers, excludedIds]);

    const tmLevelStats = useMemo(() => {
        const s = {1:0,2:0,3:0,4:0,5:0,6:0};
        tmActiveList.forEach(p => { const mi = allMembers.find(mm => mm.id === p.memberId) || {}; const l = parseInt(mi.level || p.level || 0); if (l > 0) { const n = l > 6 ? l - 6 : l; if (s[n] !== undefined) s[n]++; } });
        return s;
    }, [tmActiveList, allMembers]);

    return {
        isTeamPanelOpen, setIsTeamPanelOpen,
        teamMakerTab, setTeamMakerTab,
        tmSessionData, tmMonthlyStatuses,
        excludedIds, setExcludedIds,
        teamingSettings, setTeamingSettings,
        editTeams, setEditTeams,
        editIsConfirmed, setEditIsConfirmed,
        editMeetingDate, setEditMeetingDate,
        draggedItem, setDraggedItem,
        selectedMemberTM, setSelectedMemberTM,
        selectedTeamTM, setSelectedTeamTM,
        dropIndicator, setDropIndicator,
        confirmedDrafts, savedDrafts, teamDraftData,
        teamStorageSubTab, setTeamStorageSubTab,
        previewDraft, setPreviewDraft,
        isCapturing, setIsCapturing,
        isDraggingRef,
        tmMeetingDate, tmMaxLimit,
        pastTeammatesMap, tmAllAttendees, tmEntryList, tmActiveList, tmUnassigned, tmLevelStats,
    };
}
