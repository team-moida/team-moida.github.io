function makeTeamHandlers(ctx) {
    const {
        meetingSettings, editTeams, setEditTeams, editIsConfirmed, setEditIsConfirmed,
        editMeetingDate, setEditMeetingDate, setTeamMakerTab, teamingSettings,
        tmActiveList, allMembers, tmMeetingDate, confirmedDrafts, pastTeammatesMap,
        excludedIds, draggedItem, setDraggedItem, dropIndicator, setDropIndicator,
        selectedMemberTM, setSelectedMemberTM, selectedTeamTM, setSelectedTeamTM,
        isDraggingRef, setPreviewDraft, setIsCapturing,
        showAlert, showConfirm
    } = ctx;

    const tmSaveDraft = async () => {
        try {
            const now = new Date();
            const _draftMid = getMeetingId(meetingSettings || {date: editMeetingDate || tmMeetingDate, meetingType: 'self'});
            await getCol('team_drafts').add({
                meetingDate: editMeetingDate || tmMeetingDate,
                meetingId: _draftMid,
                meetingTimeRange: `${meetingSettings?.start || ''} ~ ${meetingSettings?.end || ''}`,
                createdAt: now.toISOString(),
                timeLabel: now.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', second: '2-digit'}),
                teams: editTeams, isConfirmed: false
            });
            showAlert('저장완료', '임시 저장되었습니다.');
        } catch(e) { showAlert('오류', '임시 저장 실패'); }
    };

    const tmLoadDraft = (draft) => {
        setEditTeams(draft.teams || []);
        setEditIsConfirmed(draft.isConfirmed || false);
        setEditMeetingDate(draft.meetingDate || '');
        setPreviewDraft(null);
        setTeamMakerTab('results');
    };

    const tmConfirm = async () => {
        setEditIsConfirmed(true);
        try {
            const now = new Date();
            const _confirmMid = getMeetingId(meetingSettings || {date: tmMeetingDate, meetingType: 'self'});
            const draftsRef = getCol('team_drafts');
            const snap = await draftsRef.where('meetingDate', '==', tmMeetingDate).where('isConfirmed', '==', true).get();
            // 같은 날짜라도 다른 모임(meetingId 불일치)의 확정 기록은 건드리지 않는다
            const existingDoc = snap.docs.find(dd => { const d = dd.data(); return d.meetingId ? d.meetingId === _confirmMid : true; });
            if (existingDoc) {
                await draftsRef.doc(existingDoc.id).update({teams: editTeams, updatedAt: now.toISOString()});
                showAlert('업데이트', '기존 확정 기록을 업데이트했습니다.');
            } else {
                await draftsRef.add({
                    meetingDate: tmMeetingDate,
                    meetingId: _confirmMid,
                    meetingTimeRange: `${meetingSettings?.start || ''} ~ ${meetingSettings?.end || ''}`,
                    createdAt: now.toISOString(),
                    timeLabel: now.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', second: '2-digit'}),
                    teams: editTeams, isConfirmed: true
                });
                showAlert('확정 완료', '편성이 확정되어 출결 시스템에 반영됩니다.');
            }
        } catch(e) { showAlert('오류', '서버 저장 실패'); }
    };

    const tmReset = () => {
        showConfirm('편성 초기화', '현재 편성을 초기화하시겠습니까?', () => {
            setEditTeams([]); setEditIsConfirmed(false); setEditMeetingDate('');
            setTeamMakerTab('generator');
        });
    };

    const generateTeams = () => {
        const {teamCount, keepCouples, avoidOverlap} = teamingSettings;
        const total = tmActiveList.length;
        if (total < teamCount) { showAlert('알림', `선정 인원(${total}명)이 팀 수(${teamCount})보다 적습니다.`); return; }
        setEditIsConfirmed(false);

        const pool = tmActiveList.map(p => {
            const mi = allMembers.find(mm => mm.id === p.memberId) || {};
            const lvl = parseInt(mi.level || p.level || 4);
            return {...p, name: mi.name || p.name, level: lvl, tierOrder: mi.tierOrder ?? 99, points: getLevelPoints(lvl), coupleId: mi.coupleId || '', gender: mi.gender || p.gender || '남성', isGuest: p.isGuest || false};
        });

        const baseCapacity = Math.floor(total / teamCount);
        const remainder = total % teamCount;
        const resultTeams = Array.from({length: teamCount}, (_, i) => ({
            id: i, members: [], scoreSum: 0, capacity: baseCapacity + (i < remainder ? 1 : 0), femaleCount: 0
        }));

        const getPastOverlap = (teamMembers, newMembers) => {
            let count = 0;
            newMembers.forEach(nm => {
                const ps = pastTeammatesMap[nm.memberId || nm.id];
                if (ps) teamMembers.forEach(tm => { if (ps.has(tm.memberId || tm.id)) count++; });
            });
            return count;
        };

        const usedIds = new Set();
        const coupleUnits = [];
        if (keepCouples) {
            const processed = new Set();
            pool.forEach(p => {
                const pid = p.memberId || p.id;
                if (processed.has(pid) || !p.coupleId) return;
                const partner = pool.find(o => { const oid = o.memberId || o.id; return oid === p.coupleId && !processed.has(oid); });
                if (partner) {
                    coupleUnits.push({members: [p, partner], totalPoints: p.points + partner.points, femaleCount: [p, partner].filter(m => m.gender === '여성').length});
                    processed.add(pid); processed.add(partner.memberId || partner.id);
                    usedIds.add(pid); usedIds.add(partner.memberId || partner.id);
                }
            });
        }
        const singles = pool.filter(p => !usedIds.has(p.memberId || p.id));
        const singleFemales = shuffleArray(singles.filter(m => m.gender === '여성')).sort((a, b) => a.level - b.level);
        const singleMales = shuffleArray(singles.filter(m => m.gender !== '여성')).sort((a, b) => a.level - b.level || (a.tierOrder || 99) - (b.tierOrder || 99));

        coupleUnits.sort((a, b) => b.femaleCount - a.femaleCount || b.totalPoints - a.totalPoints);
        coupleUnits.forEach(unit => {
            const required = unit.members.length;
            let cands = resultTeams.filter(t => t.members.length + required <= t.capacity);
            if (!cands.length) cands = [...resultTeams];
            cands.sort((a, b) => {
                if (unit.femaleCount > 0 && a.femaleCount !== b.femaleCount) return a.femaleCount - b.femaleCount;
                if (avoidOverlap) { const oA = getPastOverlap(a.members, unit.members), oB = getPastOverlap(b.members, unit.members); if (oA !== oB && Math.abs(a.scoreSum - b.scoreSum) <= 2.5) return oA - oB; }
                return a.scoreSum - b.scoreSum || Math.random() - 0.5;
            });
            const t = cands[0];
            t.members.push(...unit.members); t.scoreSum += unit.totalPoints; t.femaleCount += unit.femaleCount;
        });

        singleFemales.forEach(female => {
            let cands = resultTeams.filter(t => t.members.length < t.capacity);
            if (!cands.length) cands = [...resultTeams];
            cands.sort((a, b) => {
                if (a.femaleCount !== b.femaleCount) return a.femaleCount - b.femaleCount;
                if (avoidOverlap) { const oA = getPastOverlap(a.members, [female]), oB = getPastOverlap(b.members, [female]); if (oA !== oB) return oA - oB; }
                return a.scoreSum - b.scoreSum;
            });
            const t = cands[0]; t.members.push(female); t.scoreSum += female.points; t.femaleCount += 1;
        });

        const maleQueue = [...singleMales]; let draftFwd = true;
        const baseOrder = Array.from({length: teamCount}, (_, i) => i);
        while (maleQueue.length > 0) {
            const order = draftFwd ? [...baseOrder] : [...baseOrder].reverse();
            let anyAssigned = false;
            for (const tid of order) {
                if (!maleQueue.length) break;
                const t = resultTeams[tid];
                if (t.members.length >= t.capacity) continue;
                let chosenIdx = 0;
                if (avoidOverlap && maleQueue.length > 1) {
                    const look = Math.min(maleQueue.length, teamCount);
                    let minOvlp = getPastOverlap(t.members, [maleQueue[0]]);
                    for (let k = 1; k < look; k++) {
                        if (maleQueue[k].level - maleQueue[0].level > 1) break;
                        const ovlp = getPastOverlap(t.members, [maleQueue[k]]);
                        if (ovlp < minOvlp) { minOvlp = ovlp; chosenIdx = k; }
                    }
                }
                const male = maleQueue.splice(chosenIdx, 1)[0];
                t.members.push(male); t.scoreSum += male.points; anyAssigned = true;
            }
            if (!anyAssigned) break;
            draftFwd = !draftFwd;
        }
        maleQueue.forEach(m => {
            const t = resultTeams.reduce((min, cur) => cur.members.length < min.members.length ? cur : min, resultTeams[0]);
            t.members.push(m); t.scoreSum += m.points;
        });

        let improved = true, iters = 0;
        while (improved && iters < 150) {
            improved = false; iters++;
            resultTeams.sort((a, b) => b.scoreSum - a.scoreSum);
            const strong = resultTeams[0], weak = resultTeams[resultTeams.length - 1];
            let bestSwap = null, bestDiff = strong.scoreSum - weak.scoreSum;
            for (let i = 0; i < strong.members.length; i++) {
                const m1 = strong.members[i];
                if (m1.gender === '여성' || (keepCouples && m1.coupleId)) continue;
                for (let j = 0; j < weak.members.length; j++) {
                    const m2 = weak.members[j];
                    if (m2.gender === '여성' || (keepCouples && m2.coupleId)) continue;
                    const newDiff = Math.abs((strong.scoreSum - m1.points + m2.points) - (weak.scoreSum - m2.points + m1.points));
                    if (newDiff < bestDiff) { bestDiff = newDiff; bestSwap = {si: i, wi: j}; }
                }
            }
            if (bestSwap) {
                const m1 = strong.members[bestSwap.si], m2 = weak.members[bestSwap.wi];
                strong.members[bestSwap.si] = m2; weak.members[bestSwap.wi] = m1;
                strong.scoreSum = strong.scoreSum - m1.points + m2.points;
                weak.scoreSum = weak.scoreSum - m2.points + m1.points;
                improved = true;
            }
        }

        const arrangeMembers = (teamMembers, capacity) => {
            const females = [...teamMembers.filter(m => m.gender === '여성')];
            const males = teamMembers.filter(m => m.gender !== '여성').sort((a, b) => a.level - b.level || (a.tierOrder || 99) - (b.tierOrder || 99));
            const result = new Array(capacity).fill(null);
            const malePool = [...males]; const femalePool = [...females];
            if (capacity > 2) {
                if (femalePool.length > 0) result[2] = femalePool.shift();
                else if (malePool.length > 0) result[2] = malePool.pop();
            }
            const slot2 = capacity >= 6 ? 5 : capacity === 5 ? 4 : -1;
            if (slot2 >= 0 && femalePool.length > 0) result[slot2] = femalePool.shift();
            const fill = [...malePool, ...femalePool];
            for (let i = 0; i < capacity; i++) { if (result[i] === null && fill.length) result[i] = fill.shift(); }
            return result.filter(Boolean);
        };

        resultTeams.sort((a, b) => a.id - b.id);
        const finalTeams = resultTeams.map(t => ({members: arrangeMembers(t.members, t.capacity), scoreSum: t.scoreSum}));
        setEditMeetingDate(tmMeetingDate);
        setEditTeams(finalTeams);
        setTeamMakerTab('results');
    };

    const tmReGenerate = () => {
        if (editIsConfirmed) {
            showConfirm('재편성 확인', '이미 확정된 편성입니다.\n재편성하면 확정이 취소됩니다. 계속할까요?', generateTeams);
        } else { generateTeams(); }
    };

    const tmDragStart = (e, teamIdx, memberIdx) => { isDraggingRef.current = true; setSelectedMemberTM(null); setDraggedItem({teamIdx, memberIdx}); e.dataTransfer.effectAllowed = 'move'; };
    const tmDragEnd = () => { setTimeout(() => { isDraggingRef.current = false; }, 50); setDraggedItem(null); setDropIndicator(null); };
    const tmMemberDragOver = (e, teamIdx, memberIdx) => { e.preventDefault(); e.stopPropagation(); if (!draggedItem) return; const rect = e.currentTarget.getBoundingClientRect(); const insertIdx = e.clientY < (rect.top + rect.height / 2) ? memberIdx : memberIdx + 1; setDropIndicator({teamIdx, insertIdx}); };
    const tmTeamDragOver = (e, teamIdx) => { e.preventDefault(); if (!draggedItem) return; setDropIndicator({teamIdx, insertIdx: editTeams[teamIdx]?.members.length ?? 0}); };
    const tmTeamDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropIndicator(null); };

    const tmDrop = (e, teamIdx) => {
        e.preventDefault();
        if (!draggedItem) return;
        const insertIdx = dropIndicator?.teamIdx === teamIdx ? dropIndicator.insertIdx : (editTeams[teamIdx]?.members.length ?? 0);
        const newTeams = editTeams.map(t => ({...t, members: [...t.members]}));
        const moved = newTeams[draggedItem.teamIdx].members.splice(draggedItem.memberIdx, 1)[0];
        let finalIdx = insertIdx;
        if (draggedItem.teamIdx === teamIdx && draggedItem.memberIdx < insertIdx) finalIdx = insertIdx - 1;
        newTeams[teamIdx].members.splice(Math.max(0, finalIdx), 0, moved);
        newTeams[draggedItem.teamIdx].scoreSum = newTeams[draggedItem.teamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        if (draggedItem.teamIdx !== teamIdx) newTeams[teamIdx].scoreSum = newTeams[teamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        setEditTeams(newTeams); setDraggedItem(null); setDropIndicator(null);
    };

    const tmMemberClick = (teamIdx, memberIdx) => {
        if (isDraggingRef.current) return;
        setSelectedTeamTM(null);
        if (!selectedMemberTM) { setSelectedMemberTM({teamIdx, memberIdx}); return; }
        if (selectedMemberTM.teamIdx === teamIdx && selectedMemberTM.memberIdx === memberIdx) { setSelectedMemberTM(null); return; }
        const newTeams = editTeams.map(t => ({...t, members: [...t.members]}));
        const a = newTeams[selectedMemberTM.teamIdx].members[selectedMemberTM.memberIdx];
        newTeams[selectedMemberTM.teamIdx].members[selectedMemberTM.memberIdx] = newTeams[teamIdx].members[memberIdx];
        newTeams[teamIdx].members[memberIdx] = a;
        newTeams[selectedMemberTM.teamIdx].scoreSum = newTeams[selectedMemberTM.teamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        if (teamIdx !== selectedMemberTM.teamIdx) newTeams[teamIdx].scoreSum = newTeams[teamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        setEditTeams(newTeams); setSelectedMemberTM(null);
    };

    const tmMoveToTeam = (targetTeamIdx) => {
        if (!selectedMemberTM) return;
        if (selectedMemberTM.teamIdx === targetTeamIdx) { setSelectedMemberTM(null); return; }
        const newTeams = editTeams.map(t => ({...t, members: [...t.members]}));
        const [moved] = newTeams[selectedMemberTM.teamIdx].members.splice(selectedMemberTM.memberIdx, 1);
        newTeams[targetTeamIdx].members.push(moved);
        newTeams[selectedMemberTM.teamIdx].scoreSum = newTeams[selectedMemberTM.teamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        newTeams[targetTeamIdx].scoreSum = newTeams[targetTeamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        setEditTeams(newTeams); setSelectedMemberTM(null);
    };

    const tmTeamBadgeClick = (e, teamIdx) => {
        e.stopPropagation(); setSelectedMemberTM(null);
        if (selectedTeamTM === null) { setSelectedTeamTM(teamIdx); return; }
        if (selectedTeamTM === teamIdx) { setSelectedTeamTM(null); return; }
        const newTeams = editTeams.map(t => ({...t, members: [...t.members]}));
        const tmp = {members: newTeams[selectedTeamTM].members, scoreSum: newTeams[selectedTeamTM].scoreSum};
        newTeams[selectedTeamTM].members = newTeams[teamIdx].members;
        newTeams[selectedTeamTM].scoreSum = newTeams[teamIdx].scoreSum;
        newTeams[teamIdx].members = tmp.members; newTeams[teamIdx].scoreSum = tmp.scoreSum;
        setEditTeams(newTeams); setSelectedTeamTM(null);
    };

    const tmCapture = async () => {
        setIsCapturing(true);
        await new Promise(r => setTimeout(r, 200));
        try {
            const el = document.getElementById('tm-capture-area');
            if (!el) return;
            const canvas = await window.html2canvas(el, {scale: 2, backgroundColor: '#f8fafc', useCORS: true});
            const link = document.createElement('a');
            link.download = `모이다_팀편성_${tmMeetingDate}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.92);
            link.click();
        } catch(e) { showAlert('오류', '캡쳐 실패'); }
        finally { setIsCapturing(false); }
    };

    const tmDeleteConfirmed = (id) => {
        showConfirm('확정 기록 삭제', '이 확정 기록을 삭제하시겠습니까?\n삭제 시 회원 화면에서 팀이 사라집니다.', async () => {
            try { await getCol('team_drafts').doc(id).delete(); }
            catch(e) { showAlert('오류', '삭제 실패'); }
        });
    };

    const tmDeleteSelectedDrafts = (ids, onSuccess) => {
        if (!ids.length) return;
        showConfirm('임시저장 삭제', `선택한 ${ids.length}개의 기록을 삭제하시겠습니까?`, async () => {
            try {
                const batch = db.batch();
                ids.forEach(id => batch.delete(getCol('team_drafts').doc(id)));
                await batch.commit();
                if (onSuccess) onSuccess();
            } catch(e) { showAlert('오류', '삭제 실패'); }
        });
    };

    return {
        tmSaveDraft, tmLoadDraft, tmConfirm, tmReset, generateTeams, tmReGenerate,
        tmDragStart, tmDragEnd, tmMemberDragOver, tmTeamDragOver, tmTeamDragLeave,
        tmDrop, tmMemberClick, tmMoveToTeam, tmTeamBadgeClick, tmCapture,
        tmDeleteConfirmed, tmDeleteSelectedDrafts
    };
}
