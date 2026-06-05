function makeMatchHandlers(ctx) {
    const {
        confirmedDrafts, matchConfig, setMatchConfig,
        localSchedule, setLocalSchedule, localCompletedMatches, setLocalCompletedMatches,
        localMatchIndex, setLocalMatchIndex, activeMatchScheduleId, setActiveMatchScheduleId,
        setMatchIsSaving, setMatchIsCapturing, presets, presetToggles, setPresetToggles,
        selectedPresetId, setSelectedPresetId, presetForm, setPresetForm,
        setIsPresetModalOpen, setMatchAdminView, showAlert
    } = ctx;

    const splitTime = (t) => { const p = (t || '08:00').split(':'); return {h: p[0] || '08', m: p[1] || '00'}; };

    const matchGenerateTable = () => {
        if (!confirmedDrafts.length) return showAlert('알림', '팀 편성을 먼저 확정해주세요.');
        const latest = [...confirmedDrafts].sort((a, b) => (b.meetingDate || '').localeCompare(a.meetingDate || ''))[0];
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
                label: `${matchConfig.meetingDate} 매치 (${localSchedule.list.length}라운드)`
            });
            setActiveMatchScheduleId(docRef.id);
            showAlert('저장 완료', '매치 테이블이 저장되었습니다.');
        } catch(e) { showAlert('오류', '저장 실패'); } finally { setMatchIsSaving(false); }
    };

    const matchHandleNextMatch = async () => {
        if (!localSchedule.list.length || localMatchIndex >= localSchedule.list.length) return;
        const newCompleted = new Set(localCompletedMatches);
        newCompleted.add(localSchedule.list[localMatchIndex].id);
        setLocalCompletedMatches(newCompleted);
        const newIndex = localMatchIndex + 1;
        setLocalMatchIndex(newIndex);
        if (activeMatchScheduleId) {
            try { await getCol('match_schedules').doc(activeMatchScheduleId).update({completedMatches: Array.from(newCompleted), currentMatchIndex: newIndex}); } catch(e) {}
        }
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
        splitTime, matchGenerateTable, matchSaveSchedule, matchHandleNextMatch,
        matchHandleCapture, matchHandlePresetSelect, matchToggleSubCourt, matchSavePreset
    };
}
