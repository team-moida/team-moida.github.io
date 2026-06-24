// 워치로 내려줄 간략 라운드 목록 (라운드번호/구장별 대진/전체시간/완료여부)
// 저장·동기화·워치 활성표 갱신(짝1) 공용 — config(매치표 설정)를 인자로 받는다.
const buildWatchRounds = (list, completedSet, config) => (list || []).map((s, i) => ({
    n: i + 1, id: s.id, time: s.time || '',
    matchDuration: (config && config.matchDuration) || 12,
    matchups: (s.matches || []).map(m => {
        const fname = (config && config.fieldNames && config.fieldNames[m.fieldIdx]) || `${m.fieldIdx + 1}구장`;
        return `${fname} ${m.match[0]} vs ${m.match[1]}`;
    }),
    done: completedSet.has(s.id)
}));

function makeMatchHandlers(ctx) {
    const {
        meetingSettings,
        confirmedDrafts, matchConfig, setMatchConfig,
        localSchedule, setLocalSchedule, localCompletedMatches, setLocalCompletedMatches,
        localMatchIndex, setLocalMatchIndex, activeMatchScheduleId, setActiveMatchScheduleId,
        setMatchIsSaving, setMatchIsCapturing, presets, presetToggles, setPresetToggles,
        selectedPresetId, setSelectedPresetId, presetForm, setPresetForm,
        setIsPresetModalOpen, setMatchAdminView, showAlert, lastManualOpRef
    } = ctx;

    const splitTime = (t) => { const p = (t || '08:00').split(':'); return {h: p[0] || '08', m: p[1] || '00'}; };

    const matchGenerateTable = () => {
        // 이 모임(보고 있는 모임)의 확정 편성만 사용 — 다른 날짜 모임의 편성을 가져오지 않는다
        const _mDate = meetingSettings?.date || matchConfig.meetingDate;
        const _mid = meetingSettings ? getMeetingId(meetingSettings) : _mDate;
        const forMeeting = (confirmedDrafts || []).filter(d => d.meetingId ? d.meetingId === _mid : d.meetingDate === _mDate);
        if (!forMeeting.length) return showAlert('알림', '이 모임의 팀 편성을 먼저 확정해주세요.');
        const latest = [...forMeeting].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
        const teams = latest.teams.map((_, i) => getTeamName(i));
        const teamSizes = {}; latest.teams.forEach((t, i) => { teamSizes[getTeamName(i)] = t.members.length; });
        const {courtCount, matchDuration, breakDuration, startTime, endTime} = matchConfig;
        if (courtCount === 0) return showAlert('알림', '구장을 1개 이상 선택해주세요.');
        let currentTime = new Date(`2024-01-01T${startTime}:00`);
        const limitTime = new Date(`2024-01-01T${endTime}:00`);
        const teamStats = {}; teams.forEach(t => teamStats[t] = 0);
        const matchupHistory = {}; teams.forEach(t1 => { matchupHistory[t1] = {}; teams.forEach(t2 => { if (t1 !== t2) matchupHistory[t1][t2] = 0; }); });
        const courtUsage = {}, lastOpponent = {};
        teams.forEach(t => { courtUsage[t] = {}; for (let i = 0; i < courtCount; i++) courtUsage[t][i] = 0; lastOpponent[t] = null; });
        const sessionList = []; let matchIdx = 1;
        while (currentTime < limitTime) {
            let usedInSession = new Set(), sessionMatches = [];
            const sessionCourts = Array.from({length: courtCount}, (_, i) => ({idx: i, type: matchConfig.fieldTypes[i] || '6vs6'}));
            for (const court of sessionCourts) {
                const isSmall = court.type === '5vs5';
                let candidates = teams.filter(t => !usedInSession.has(t));
                if (matchConfig.strictCourtSize && isSmall) candidates = candidates.filter(t => teamSizes[t] <= 5);
                if (candidates.length < 2) continue;
                candidates.sort(() => Math.random() - 0.5);
                let bestPair = null, minScore = Infinity;
                for (let i = 0; i < candidates.length; i++) {
                    for (let j = i + 1; j < candidates.length; j++) {
                        const t1 = candidates[i], t2 = candidates[j];
                        const isB2B = (lastOpponent[t1] === t2 || lastOpponent[t2] === t1);
                        const score = matchupHistory[t1][t2] * 10000 + (teamStats[t1] + teamStats[t2]) * 100 + (courtUsage[t1][court.idx] + courtUsage[t2][court.idx]) * 50 + (isB2B ? 500000 : 0) + Math.random();
                        if (score < minScore) { minScore = score; bestPair = [t1, t2]; }
                    }
                }
                if (bestPair) {
                    const [t1, t2] = bestPair;
                    sessionMatches.push({match: [t1, t2], fieldIdx: court.idx});
                    usedInSession.add(t1); usedInSession.add(t2);
                    matchupHistory[t1][t2]++; matchupHistory[t2][t1]++;
                    teamStats[t1]++; teamStats[t2]++;
                    courtUsage[t1][court.idx]++; courtUsage[t2][court.idx]++;
                    lastOpponent[t1] = t2; lastOpponent[t2] = t1;
                }
            }
            if (sessionMatches.length > 0) {
                const startL = currentTime.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', hour12: false});
                const endC = new Date(currentTime.getTime() + matchDuration * 60000);
                const endL = endC.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', hour12: false});
                sessionList.push({id: matchIdx++, time: `${startL} - ${endL}`, startTime: startL, endTime: endL, matches: sessionMatches.sort((a, b) => a.fieldIdx - b.fieldIdx), resting: teams.filter(t => !usedInSession.has(t))});
                currentTime = new Date(currentTime.getTime() + (matchDuration + breakDuration) * 60000);
                if (new Date(currentTime.getTime() - breakDuration * 60000) >= limitTime) break;
            } else break;
        }
        setLocalSchedule({list: sessionList, stats: teamStats});
        setLocalCompletedMatches(new Set());
        setLocalMatchIndex(0);
        setActiveMatchScheduleId(null);
        setMatchAdminView('results');
    };

    const matchSaveSchedule = async () => {
        if (!localSchedule.list.length) return;
        setMatchIsSaving(true);
        try {
            const docRef = await getCol('match_schedules').add({
                schedule: localSchedule, config: matchConfig,
                completedMatches: Array.from(localCompletedMatches),
                currentMatchIndex: localMatchIndex,
                createdAt: new Date().toISOString(), meetingDate: matchConfig.meetingDate,
                meetingId: matchConfig.meetingDate,
                label: `${matchConfig.meetingDate} 매치 (${localSchedule.list.length}라운드)`
            });
            setActiveMatchScheduleId(docRef.id);
            // 워치 컨트롤 초기화 (라운드 목록/교체시간 기본값 포함)
            getCol('settings').doc('watch_control').set({
                command: null, cmdId: null, currentMatchIndex: 0,
                totalMatches: localSchedule.list.length,
                rounds: buildWatchRounds(localSchedule.list, localCompletedMatches, matchConfig),
                subInterval: matchConfig.subIntervalSec ?? 180,
                activeMatchScheduleId: docRef.id  // 서버(워치 명령 처리)가 갱신할 매치표 지정
            }).catch(() => {});
            showAlert('저장 완료', '매치 테이블이 저장되었습니다.');
        } catch(e) { showAlert('오류', '저장 실패'); } finally { setMatchIsSaving(false); }
    };

    const syncMatchState = (newCompleted, newIndex) => {
        // 짝2: 손 조작 직후 보호창 시작 — 이 시각 기준 4초 동안은 서버 라운드 따라가기를 멈춰
        //      아직 서버에 반영 안 된 옛 값이 로컬을 뒤로 튕기지 않게 한다.
        if (lastManualOpRef) lastManualOpRef.current = Date.now();
        if (activeMatchScheduleId) {
            getCol('match_schedules').doc(activeMatchScheduleId).update({ completedMatches: Array.from(newCompleted), currentMatchIndex: newIndex }).catch(() => {});
        }
        getCol('settings').doc('watch_control').update({
            command: null, currentMatchIndex: newIndex, totalMatches: localSchedule.list.length,
            rounds: buildWatchRounds(localSchedule.list, newCompleted, matchConfig),
            subInterval: matchConfig.subIntervalSec ?? 180,
            ...(activeMatchScheduleId ? { activeMatchScheduleId } : {})
        }).catch(() => {});
    };

    const matchHandleNextMatch = () => {
        if (localMatchIndex >= localSchedule.list.length) return;
        const newIndex = localMatchIndex + 1;
        setLocalMatchIndex(newIndex);
        syncMatchState(localCompletedMatches, newIndex);
    };

    const matchHandlePrevMatch = () => {
        if (localMatchIndex <= 0) return;
        const newIndex = localMatchIndex - 1;
        setLocalMatchIndex(newIndex);
        syncMatchState(localCompletedMatches, newIndex);
    };

    // 종료 = 그 라운드 완료 표시 + 다음 라운드로 한 번에 넘김(C). 규칙:
    //  · 현재 라운드를 '완료'할 때만 넘김 → 완료+인덱스+1을 한 번에 저장(자동진행과 동일한 검증 경로).
    //  · 마지막 라운드면 newIndex=length(=모든 경기 종료)까지만, 그 이상 안 넘어감.
    //  · '종료 취소'(완료 해제)나 현재 라운드가 아닌 토글이면 완료 상태만 바꾸고 라운드 번호는 그대로.
    const matchHandleToggleComplete = (sessionId) => {
        const isCompleting = !localCompletedMatches.has(sessionId);
        const isCurrent = localSchedule.list[localMatchIndex]?.id === sessionId;
        const newCompleted = new Set(localCompletedMatches);
        if (isCompleting && isCurrent && localMatchIndex < localSchedule.list.length) {
            newCompleted.add(sessionId);
            const newIndex = localMatchIndex + 1;
            setLocalCompletedMatches(newCompleted);
            setLocalMatchIndex(newIndex);
            syncMatchState(newCompleted, newIndex);
        } else {
            newCompleted.has(sessionId) ? newCompleted.delete(sessionId) : newCompleted.add(sessionId);
            setLocalCompletedMatches(newCompleted);
            syncMatchState(newCompleted, localMatchIndex);
        }
    };

    // 타이머 종료 시 자동 진행: 현재 라운드 '종료' 표시 + 다음 라운드로 한 번에 처리.
    // (종료/다음 핸들러를 따로 연달아 부르면 두 번째 sync가 stale 상태로 첫 sync를 덮어써 종료표시가 사라짐 → 한 번에 sync)
    const matchHandleAutoAdvance = (sessionId) => {
        if (localMatchIndex >= localSchedule.list.length) return;
        const newCompleted = new Set(localCompletedMatches);
        if (sessionId != null) newCompleted.add(sessionId);
        const newIndex = localMatchIndex + 1;
        setLocalCompletedMatches(newCompleted);
        setLocalMatchIndex(newIndex);
        syncMatchState(newCompleted, newIndex);
    };

    const matchHandleCapture = async () => {
        setMatchIsCapturing(true);
        await new Promise(r => setTimeout(r, 300));
        try {
            const el = document.getElementById('match-capture-area');
            if (!el) return;
            const canvas = await window.html2canvas(el, {scale: 2, backgroundColor: '#f8fafc', useCORS: true, scrollY: 0});
            const link = document.createElement('a');
            link.download = `모이다_매치표_${matchConfig.meetingDate}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch(e) { showAlert('오류', '캡쳐 실패'); } finally { setMatchIsCapturing(false); }
    };

    const matchHandlePresetSelect = (preset) => {
        setSelectedPresetId(preset.id);
        setPresetToggles(new Array(preset.courtCount).fill(false));
        setMatchConfig(p => ({...p, courtCount: 0, fieldNames: [], fieldTypes: []}));
    };

    const matchToggleSubCourt = (idx) => {
        const newToggles = [...presetToggles]; newToggles[idx] = !newToggles[idx]; setPresetToggles(newToggles);
        const p = presets.find(pr => pr.id === selectedPresetId); if (!p) return;
        const names = [], types = [];
        newToggles.forEach((on, i) => { if (on) { names.push(p.fieldNames[i]); types.push(p.fieldTypes[i]); } });
        setMatchConfig(prev => ({...prev, courtCount: names.length, fieldNames: names, fieldTypes: types}));
    };

    const matchSavePreset = async () => {
        if (!presetForm.name.trim()) return showAlert('알림', '프리셋 이름을 입력해주세요.');
        try {
            await getCol('court_presets').add({...presetForm, createdAt: new Date().toISOString()});
            setIsPresetModalOpen(false);
            setPresetForm({name: '', courtCount: 3, fieldNames: ['1구장', '2구장', '3구장'], fieldTypes: ['6vs6', '6vs6', '6vs6']});
            showAlert('완료', '프리셋이 저장되었습니다.');
        } catch(e) { showAlert('오류', '저장 실패'); }
    };

    return {
        splitTime, matchGenerateTable, matchSaveSchedule,
        matchHandleNextMatch, matchHandlePrevMatch, matchHandleToggleComplete, matchHandleAutoAdvance,
        matchHandleCapture, matchHandlePresetSelect, matchToggleSubCourt, matchSavePreset
    };
}
