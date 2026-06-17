function makeTeamStorageHandlers({ teams, displayedMeetingDate, meetingDate, meetingTime, syncManagerName, setTeams, setIsConfirmed, setDisplayedMeetingDate, setActiveTab, setPreviewDraft, showAlert, showConfirm, generateTeams, isConfirmed }) {

    const saveDraft = async () => {
        try {
            const now = new Date();
            await getCol('team_drafts').add({
                meetingDate: displayedMeetingDate || meetingDate,
                meetingTimeRange: `${meetingTime.start} ~ ${meetingTime.end}`,
                createdAt: now.toISOString(),
                timeLabel: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                teams, managerName: syncManagerName, isConfirmed: false
            });
            showAlert('저장완료', '임시 저장되었습니다.');
        } catch(e) { showAlert('오류', '임시 저장 실패'); }
    };

    const loadDraft = (draft) => {
        setTeams(draft.teams || []);
        setIsConfirmed(draft.isConfirmed || false);
        setDisplayedMeetingDate(draft.meetingDate || '');
        setPreviewDraft(null);
        setActiveTab('results');
    };

    const confirmTeams = async () => {
        setIsConfirmed(true);
        // 덮어쓰기 기준 날짜 = 현재 보고 있는 편성의 날짜(displayedMeetingDate).
        // 기록에서 불러오면 displayedMeetingDate만 그 날짜로 바뀌고 meetingDate(현재 설정값)는
        // 안 바뀌므로, meetingDate로 찾으면 불러온 기록을 못 찾아 새 기록이 생겼었음 → 통일.
        const targetDate = displayedMeetingDate || meetingDate;
        localStorage.setItem('moida_confirmed_teams', JSON.stringify({ teams, meetingDate: targetDate, updatedAt: new Date().toISOString() }));
        try {
            const now = new Date();
            const draftsRef = getCol('team_drafts');
            const snap = await draftsRef.where('meetingDate', '==', targetDate).where('isConfirmed', '==', true).get();
            if (!snap.empty) {
                await draftsRef.doc(snap.docs[0].id).update({ teams, updatedAt: now.toISOString(), managerName: syncManagerName });
                showAlert('업데이트', '기존 확정 기록을 덮어썼습니다.');
            } else {
                await draftsRef.add({
                    meetingDate: targetDate, meetingTimeRange: `${meetingTime.start} ~ ${meetingTime.end}`,
                    createdAt: now.toISOString(), timeLabel: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    teams, managerName: syncManagerName, isConfirmed: true
                });
                showAlert('확정 완료', '편성이 확정되어 출결 시스템에 반영됩니다.');
            }
        } catch(e) { showAlert('오류', '서버 저장 실패 (로컬에는 저장됨)'); }
    };

    const resetTeams = () => {
        showConfirm('편성 초기화', '현재 편성을 초기화하시겠습니까?', () => {
            setTeams([]); setIsConfirmed(false);
            localStorage.removeItem('moida_confirmed_teams');
            setDisplayedMeetingDate('');
            setActiveTab('generator');
        });
    };

    const reGenerateTeams = () => {
        if (isConfirmed) {
            showConfirm('재편성 확인', '이미 확정된 편성입니다.\n재편성하면 확정이 취소됩니다. 계속할까요?', generateTeams);
        } else {
            generateTeams();
        }
    };

    const deleteConfirmed = (id) => {
        showConfirm('확정 기록 삭제', '이 확정 기록을 삭제하시겠습니까?\n삭제 시 회원 화면에서 팀이 사라집니다.', async () => {
            try { await getCol('team_drafts').doc(id).delete(); }
            catch(e) { showAlert('오류', '삭제 실패'); }
        });
    };

    const deleteSelectedDrafts = (ids, onSuccess) => {
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

    return { saveDraft, loadDraft, confirmTeams, resetTeams, reGenerateTeams, deleteConfirmed, deleteSelectedDrafts };
}

function StorageTab({ confirmedHistory, savedDrafts, storageSubTab, setStorageSubTab, setPreviewDraft, showConfirm, deleteSelectedDrafts }) {
    const { useState } = React;
    const [draftSelectMode, setDraftSelectMode] = useState(false);
    const [selectedDraftIds, setSelectedDraftIds] = useState([]);
    return (
        <div>
            <div className="flex gap-2 mb-4">
                {[['confirmed', '확정 기록', confirmedHistory.length], ['draft', '임시 저장', savedDrafts.length]].map(([v, l, cnt]) => (
                    <button key={v} onClick={() => { setStorageSubTab(v); setDraftSelectMode(false); setSelectedDraftIds([]); }}
                        className={`flex-1 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${storageSubTab === v ? 'bg-teal-500 text-white shadow' : 'bg-white border border-slate-200 text-slate-500'}`}>
                        {l}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-lg font-black ${storageSubTab === v ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{cnt}</span>
                    </button>
                ))}
            </div>

            {storageSubTab === 'confirmed' && (
                confirmedHistory.length === 0
                    ? <div className="text-center py-20 text-slate-300"><div className="flex justify-center mb-3 opacity-50"><Icon.List size={48} /></div><p className="font-black">확정된 기록이 없습니다</p></div>
                    : confirmedHistory.map(d => (
                        <div key={d.id} className="flex items-center gap-2 p-4 bg-white border border-emerald-100 rounded-2xl mb-2">
                            <div className="flex-1">
                                <p className="font-black text-slate-800 text-sm">{d.meetingDate}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{d.meetingTimeRange}</p>
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-lg mt-1 inline-block">{d.teams?.length || 0}팀 확정</span>
                            </div>
                            <button onClick={() => setPreviewDraft(d)} className="px-3 py-1.5 bg-teal-50 text-teal-500 rounded-xl font-black text-xs">미리보기</button>
                            <button onClick={() => showConfirm('확정 기록 삭제', '이 확정 기록을 삭제하시겠습니까?\n삭제 시 회원 화면에서 팀이 사라집니다.', async () => { await getCol('team_drafts').doc(d.id).delete(); })} className="p-2 bg-red-50 text-red-400 rounded-xl"><Icon.Trash size={14}/></button>
                        </div>
                    ))
            )}

            {storageSubTab === 'draft' && (
                savedDrafts.length === 0
                    ? <div className="text-center py-20 text-slate-300"><div className="flex justify-center mb-3 opacity-50"><Icon.Save size={48} /></div><p className="font-black">임시 저장된 기록이 없습니다</p></div>
                    : (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                {draftSelectMode ? (
                                    <>
                                        <button onClick={() => {
                                            if (selectedDraftIds.length === savedDrafts.length) setSelectedDraftIds([]);
                                            else setSelectedDraftIds(savedDrafts.map(d => d.id));
                                        }} className="text-xs font-black text-teal-600">
                                            {selectedDraftIds.length === savedDrafts.length ? '전체 해제' : `전체 선택 (${savedDrafts.length})`}
                                        </button>
                                        <div className="flex items-center gap-2">
                                            {selectedDraftIds.length > 0 && (
                                                <button onClick={() => deleteSelectedDrafts(selectedDraftIds, () => { setSelectedDraftIds([]); setDraftSelectMode(false); })}
                                                    className="px-3 py-1.5 bg-red-500 text-white rounded-xl font-black text-xs">
                                                    {selectedDraftIds.length}개 삭제
                                                </button>
                                            )}
                                            <button onClick={() => { setDraftSelectMode(false); setSelectedDraftIds([]); }}
                                                className="text-xs font-black text-slate-400 px-2 py-1 bg-slate-100 rounded-xl">취소</button>
                                        </div>
                                    </>
                                ) : (
                                    <button onClick={() => setDraftSelectMode(true)}
                                        className="ml-auto text-xs font-black text-slate-400 px-2 py-1 bg-slate-100 rounded-xl">선택</button>
                                )}
                            </div>
                            {savedDrafts.map(d => (
                                <div key={d.id} className="flex items-center gap-2 p-4 bg-white border border-slate-100 rounded-2xl mb-2">
                                    {draftSelectMode && (
                                        <button onClick={() => setSelectedDraftIds(prev =>
                                            prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id]
                                        )} className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedDraftIds.includes(d.id) ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>
                                                {selectedDraftIds.includes(d.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                            </div>
                                        </button>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-black text-slate-800 text-sm">{d.meetingDate}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{d.timeLabel}</p>
                                    </div>
                                    {!draftSelectMode && (
                                        <>
                                            <button onClick={() => setPreviewDraft(d)} className="px-3 py-1.5 bg-teal-50 text-teal-500 rounded-xl font-black text-xs">미리보기</button>
                                            <button onClick={() => showConfirm('삭제', '이 기록을 삭제하시겠습니까?', async () => { await getCol('team_drafts').doc(d.id).delete(); })} className="p-2 bg-red-50 text-red-400 rounded-xl"><Icon.Trash size={14} /></button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
            )}
        </div>
    );
}

function PreviewModal({ previewDraft, setPreviewDraft, loadDraft, today }) {
    if (!previewDraft) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50" onClick={() => setPreviewDraft(null)}>
            <div className="bg-white rounded-t-3xl p-5 w-full max-w-lg shadow-2xl no-scrollbar overflow-y-auto" style={{ maxHeight: '82vh' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="font-black text-xl text-slate-800">{previewDraft.meetingDate}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{previewDraft.meetingTimeRange}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                            {previewDraft.isConfirmed
                                ? <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-lg">확정됨</span>
                                : <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-600 rounded-lg">임시저장</span>
                            }
                            {previewDraft.meetingDate < today && <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg">종료된 모임</span>}
                        </div>
                    </div>
                    <button onClick={() => setPreviewDraft(null)} className="text-slate-400 text-3xl leading-none ml-2">×</button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    {(previewDraft.teams || []).map((team, teamIdx) => (
                        <div key={teamIdx} className={`rounded-2xl border-2 p-3 ${getTeamCard(teamIdx)}`}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${getTeamBadge(teamIdx)}`}>{getTeamName(teamIdx)}</span>
                                <span className="text-[10px] font-black text-slate-500">{team.members.length}명 · {team.scoreSum}pt</span>
                            </div>
                            {team.members.map((m, mi) => (
                                <div key={mi} className="flex items-center gap-1 py-0.5">
                                    <span className="text-[9px] text-slate-400 w-3 text-right flex-shrink-0">{mi + 1}</span>
                                    <span className="text-[10px] font-black text-slate-700 flex-1">{m.name}</span>
                                    {m.gender === '여성' && <span className="text-[9px] text-pink-400 font-black">W</span>}
                                    <span className={`text-[8px] font-black px-1 rounded ${getLevelColor(m.level)}`}>{m.level}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <button onClick={() => loadDraft(previewDraft)}
                    className="w-full py-3.5 bg-teal-500 text-white rounded-2xl font-black text-sm shadow-lg">
                    {previewDraft.meetingDate < today ? '열람하기' : '불러오기'}
                </button>
            </div>
        </div>
    );
}
