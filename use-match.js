function useMatch({ isAdminMode, meetingSettings, confirmedDrafts }) {
    const { useState, useEffect, useMemo } = React;

    const [scheduleData, setScheduleData] = useState(null);
    const [matchViewMode, setMatchViewMode] = useState('my');
    const [isMatchPanelOpen, setIsMatchPanelOpen] = useState(false);
    const [matchAdminView, setMatchAdminView] = useState('setup');
    const [matchConfig, setMatchConfig] = useState({
        meetingDate:'', courtCount:3, matchDuration:12, breakDuration:3, subIntervalSec:180,
        startTime:'08:00', endTime:'10:00', location:'',
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
        const altMid = meetingSettings.meetingType === 'match' ? meetingSettings.date : meetingSettings.date + '__match'; // 반대 종류 식별자
        const byNew = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '');
        // orderBy 제거 → createdAt 없는 옛 기록도 누락 없이 받고, 식별자 정확일치 → 없으면 같은 날짜로 보정(둘 다 최신순)
        const unsub = getCol('match_schedules').onSnapshot(snap => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const found = docs.filter(d => d.meetingId === mid).sort(byNew)[0]
                || docs.filter(d => d.meetingDate === meetingSettings.date && d.meetingId !== altMid).sort(byNew)[0]
                || null;
            setScheduleData(found);
        }, () => {});
        return () => unsub();
    }, [meetingSettings?.date, meetingSettings?.meetingType]);

    useEffect(() => {
        if (!isAdminMode) return;
        const u1 = getCol('court_presets').orderBy('createdAt').onSnapshot(snap => setPresets(snap.docs.map(d => ({id:d.id,...d.data()}))));
        const u2 = getCol('match_schedules').onSnapshot(snap => {
            const list = snap.docs.map(d => ({id:d.id,...d.data()}));
            list.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')); // createdAt 없는 옛 기록도 포함(맨 뒤로)
            setSavedMatchSchedules(list);
        }, () => {});
        return () => { u1(); u2(); };
    }, [isAdminMode]);

    // scheduleData(지금 보는 매치표)에 local 상태·활성 포인터를 맞춘다.
    // (B) 보는 모임(문서)이 바뀌면 활성 포인터도 그 문서로 따라가게 한다 → 라운드 넘김 저장 대상을
    //     "지금 보는 매치표"로 통일(읽기=쓰기 같은 문서). 처음 한 번만 고정되던 문제 해소.
    //   · 같은 문서면 재동기화 안 함(관리자가 넘긴 현재 라운드를 서버 에코가 되돌리지 않게).
    //   · 작성 중(새로 만들고 미저장: 활성 포인터 없음 + 로컬에 표 있음)이면 덮어쓰기 금지(미저장 작업 보호).
    useEffect(() => {
        if (!scheduleData) return;
        if (scheduleData.id === activeMatchScheduleId) return;
        if (!activeMatchScheduleId && (localSchedule.list?.length > 0)) return;
        const firstLoad = !activeMatchScheduleId;
        setLocalSchedule(scheduleData.schedule || {list:[], stats:{}});
        setLocalCompletedMatches(new Set(scheduleData.completedMatches || []));
        setLocalMatchIndex(scheduleData.currentMatchIndex ?? 0);
        if (scheduleData.id) setActiveMatchScheduleId(scheduleData.id);
        if (firstLoad) setMatchAdminView('results');
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
        localSchedule.list.forEach(session => { session.matches.forEach(m => { const[t1,t2]=m.match; if(!matchupCounts[t1]||!matchupCounts[t2])return; matchupCounts[t1][t2]++; matchupCounts[t2][t1]++; totalMatches[t1]++; totalMatches[t2]++; }); });
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
