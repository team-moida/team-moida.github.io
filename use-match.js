function useMatch({ isAdminMode, meetingSettings, confirmedDrafts }) {
    const { useState, useEffect, useMemo } = React;

    const [scheduleData, setScheduleData] = useState(null);
    const [matchViewMode, setMatchViewMode] = useState('my');
    const [isMatchPanelOpen, setIsMatchPanelOpen] = useState(false);
    const [matchAdminView, setMatchAdminView] = useState('setup');
    const [matchConfig, setMatchConfig] = useState({
        meetingDate:'', courtCount:3, matchDuration:12, breakDuration:3,
        startTime:'08:00', endTime:'10:00',
        fieldNames:['1구장','2구장','3구장'], fieldTypes:['6vs6','6vs6','6vs6'],
        strictCourtSize:false
    });
    const [localSchedule, setLocalSchedule] = useState({list:[],stats:{}});
    const [localCompletedMatches, setLocalCompletedMatches] = useState(new Set());
    const [localMatchIndex, setLocalMatchIndex] = useState(0);
    const [presets, setPresets] = useState([]);
    const [savedMatchSchedules, setSavedMatchSchedules] = useState([]);
    const [selectedPresetId, setSelectedPresetId] = useState('manual');
    const [presetToggles, setPresetToggles] = useState([]);
    const [isLoadMatchModalOpen, setIsLoadMatchModalOpen] = useState(false);
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [presetForm, setPresetForm] = useState({name:'',courtCount:3,fieldNames:['1구장','2구장','3구장'],fieldTypes:['6vs6','6vs6','6vs6']});
    const [matchIsSaving, setMatchIsSaving] = useState(false);
    const [activeMatchScheduleId, setActiveMatchScheduleId] = useState(null);
    const [matchIsCapturing, setMatchIsCapturing] = useState(false);

    useEffect(() => {
        const unsub = getCol('match_schedules').orderBy('createdAt', 'desc').limit(1).onSnapshot(snap => {
            setScheduleData(snap.empty ? null : snap.docs[0].data());
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!isAdminMode) return;
        const u1 = getCol('court_presets').orderBy('createdAt').onSnapshot(snap => setPresets(snap.docs.map(d => ({id:d.id,...d.data()}))));
        const u2 = getCol('match_schedules').orderBy('createdAt','desc').onSnapshot(snap => setSavedMatchSchedules(snap.docs.map(d => ({id:d.id,...d.data()}))));
        return () => { u1(); u2(); };
    }, [isAdminMode]);

    useEffect(() => {
        if (!isAdminMode) return;
        setMatchConfig(p => ({...p, meetingDate: meetingSettings?.date || p.meetingDate}));
    }, [isAdminMode, meetingSettings?.date]);

    const matchStatsData = useMemo(() => {
        if (!localSchedule.list.length || !confirmedDrafts.length) return null;
        const latest = [...confirmedDrafts].sort((a,b) => (b.meetingDate||'').localeCompare(a.meetingDate||''))[0];
        if (!latest?.teams) return null;
        const teams = latest.teams.map((_,i) => getTeamName(i));
        const matchupCounts = {}, totalMatches = {};
        teams.forEach(t => { matchupCounts[t] = {}; teams.forEach(o => { if(t!==o) matchupCounts[t][o]=0; }); totalMatches[t]=0; });
        localSchedule.list.forEach(session => { session.matches.forEach(m => { const[t1,t2]=m.match; matchupCounts[t1][t2]++; matchupCounts[t2][t1]++; totalMatches[t1]++; totalMatches[t2]++; }); });
        return {matchupCounts, totalMatches, teams};
    }, [localSchedule, confirmedDrafts]);

    return {
        isMatchPanelOpen, setIsMatchPanelOpen,
        matchAdminView, setMatchAdminView,
        matchConfig, setMatchConfig,
        localSchedule, setLocalSchedule,
        localCompletedMatches, setLocalCompletedMatches,
        localMatchIndex, setLocalMatchIndex,
        presets, savedMatchSchedules,
        selectedPresetId, setSelectedPresetId,
        presetToggles, setPresetToggles,
        isLoadMatchModalOpen, setIsLoadMatchModalOpen,
        isPresetModalOpen, setIsPresetModalOpen,
        presetForm, setPresetForm,
        matchIsSaving, setMatchIsSaving,
        activeMatchScheduleId, setActiveMatchScheduleId,
        matchIsCapturing, setMatchIsCapturing,
        matchStatsData,
        scheduleData, matchViewMode, setMatchViewMode,
    };
}
