function useMatch({ isAdminMode, meetingSettings, confirmedDrafts }) {
    const { useState, useEffect, useMemo } = React;

    const [scheduleData, setScheduleData] = useState(null);
    const [matchViewMode, setMatchViewMode] = useState('my');
    const [isMatchPanelOpen, setIsMatchPanelOpen] = useState(false);
    const [matchAdminView, setMatchAdminView] = useState('setup');
    const [matchConfig, setMatchConfig] = useState({
        meetingDate:'', courtCount:3, matchDuration:12, breakDuration:3, subIntervalSec:180,
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
        if (!meetingSettings?.date) { setScheduleData(null); return; }
        const mid = getMeetingId(meetingSettings);
        const unsub = getCol('match_schedules').orderBy('createdAt', 'desc').onSnapshot(snap => {
            const found = snap.docs.map(d => ({id:d.id,...d.data()}))
                .find(d => d.meetingId ? d.meetingId === mid : d.meetingDate === meetingSettings.date);
            setScheduleData(found || null);
        });
        return () => unsub();
    }, [meetingSettings?.date, meetingSettings?.meetingType]);

    useEffect(() => {
        if (!isAdminMode) return;
        const u1 = getCol('court_presets').orderBy('createdAt').onSnapshot(snap => setPresets(snap.docs.map(d => ({id:d.id,...d.data()}))));
        const u2 = getCol('match_schedules').orderBy('createdAt','desc').onSnapshot(snap => setSavedMatchSchedules(snap.docs.map(d => ({id:d.id,...d.data()}))));
        return () => { u1(); u2(); };
    }, [isAdminMode]);

    // scheduleData가 로드됐고 local 상태가 비어 있으면 자동 동기화
    useEffect(() => {
        if (!scheduleData || activeMatchScheduleId) return;
        setLocalSchedule(scheduleData.schedule || {list:[], stats:{}});
        setLocalCompletedMatches(new Set(scheduleData.completedMatches || []));
        setLocalMatchIndex(scheduleData.currentMatchIndex ?? 0);
        if (scheduleData.id) setActiveMatchScheduleId(scheduleData.id);
        setMatchAdminView('results');
    }, [scheduleData]);

    // 워치 "종료/취소"는 서버(Cloud Function processWatchCommand)가 직접 처리한다.
    // → 관리자 폰이 꺼져 있거나 멀리 있어도 동작. 폰은 더 이상 워치 명령을 중계하지 않는다(이중 처리 방지).
    // 폰 매치탭을 연 상태라면, 서버가 match_schedules 에 반영한 완료 상태를 화면에도 따라오게 한다.
    useEffect(() => {
        if (!scheduleData || !activeMatchScheduleId) return;
        if (scheduleData.id !== activeMatchScheduleId) return;
        setLocalCompletedMatches(new Set(scheduleData.completedMatches || []));
    }, [scheduleData, activeMatchScheduleId]);

    useEffect(() => {
        if (!isAdminMode) return;
        setMatchConfig(p => ({...p, meetingDate: meetingSettings?.date || p.meetingDate}));
    }, [isAdminMode, meetingSettings?.date]);

    const matchStatsData = useMemo(() => {
        if (!localSchedule.list.length || !confirmedDrafts.length) return null;
        // 이 모임의 확정 편성 기준 (없으면 통계 생략)
        const _mDate = meetingSettings?.date || '';
        const _mid = meetingSettings ? getMeetingId(meetingSettings) : _mDate;
        const forMeeting = confirmedDrafts.filter(d => d.meetingId ? d.meetingId === _mid : d.meetingDate === _mDate);
        const latest = [...forMeeting].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''))[0];
        if (!latest?.teams) return null;
        const teams = latest.teams.map((_,i) => getTeamName(i));
        const matchupCounts = {}, totalMatches = {};
        teams.forEach(t => { matchupCounts[t] = {}; teams.forEach(o => { if(t!==o) matchupCounts[t][o]=0; }); totalMatches[t]=0; });
        localSchedule.list.forEach(session => { session.matches.forEach(m => { const[t1,t2]=m.match; matchupCounts[t1][t2]++; matchupCounts[t2][t1]++; totalMatches[t1]++; totalMatches[t2]++; }); });
        return {matchupCounts, totalMatches, teams};
    }, [localSchedule, confirmedDrafts, meetingSettings?.date, meetingSettings?.meetingType]);

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
