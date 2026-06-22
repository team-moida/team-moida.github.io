function makeTeamMoveHandlers({ teams, setTeams: rawSetTeams, setIsConfirmed, draggedItem, setDraggedItem, dropIndicator, setDropIndicator, isDraggingRef, selectedMember, setSelectedMember, selectedTeam, setSelectedTeam, isPastMeeting }) {
    // 드래그/이동으로 팀을 수정하면 확정 상태를 해제 → '확정하기' 버튼이 다시 활성화됨
    const setTeams = (t) => { rawSetTeams(t); if (typeof setIsConfirmed === 'function') setIsConfirmed(false); };

    const handleDragStart = (e, teamIdx, memberIdx) => {
        isDraggingRef.current = true;
        setSelectedMember(null);
        setDraggedItem({ teamIdx, memberIdx });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setTimeout(() => { isDraggingRef.current = false; }, 50);
        setDraggedItem(null);
        setDropIndicator(null);
    };

    const handleMemberDragOver = (e, teamIdx, memberIdx) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedItem) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const insertIdx = e.clientY < (rect.top + rect.height / 2) ? memberIdx : memberIdx + 1;
        setDropIndicator({ teamIdx, insertIdx });
    };

    const handleTeamAreaDragOver = (e, teamIdx) => {
        e.preventDefault();
        if (!draggedItem) return;
        setDropIndicator({ teamIdx, insertIdx: teams[teamIdx]?.members.length ?? 0 });
    };

    const handleTeamAreaDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDropIndicator(null);
    };

    const handleDrop = (e, teamIdx) => {
        e.preventDefault();
        if (!draggedItem) return;
        const insertIdx = dropIndicator?.teamIdx === teamIdx ? dropIndicator.insertIdx : (teams[teamIdx]?.members.length ?? 0);
        const newTeams = teams.map(t => ({ ...t, members: [...t.members] }));
        const moved = newTeams[draggedItem.teamIdx].members.splice(draggedItem.memberIdx, 1)[0];
        let finalIdx = insertIdx;
        if (draggedItem.teamIdx === teamIdx && draggedItem.memberIdx < insertIdx) finalIdx = insertIdx - 1;
        newTeams[teamIdx].members.splice(Math.max(0, finalIdx), 0, moved);
        newTeams[draggedItem.teamIdx].scoreSum = newTeams[draggedItem.teamIdx].members.reduce((s, m) => s + m.points, 0);
        if (draggedItem.teamIdx !== teamIdx) newTeams[teamIdx].scoreSum = newTeams[teamIdx].members.reduce((s, m) => s + m.points, 0);
        setTeams(newTeams);
        setDraggedItem(null);
        setDropIndicator(null);
    };

    const handleMemberClick = (teamIdx, memberIdx) => {
        if (isDraggingRef.current || isPastMeeting) return;
        setSelectedTeam(null);
        if (!selectedMember) { setSelectedMember({ teamIdx, memberIdx }); return; }
        if (selectedMember.teamIdx === teamIdx && selectedMember.memberIdx === memberIdx) { setSelectedMember(null); return; }
        const newTeams = teams.map(t => ({ ...t, members: [...t.members] }));
        const a = newTeams[selectedMember.teamIdx].members[selectedMember.memberIdx];
        newTeams[selectedMember.teamIdx].members[selectedMember.memberIdx] = newTeams[teamIdx].members[memberIdx];
        newTeams[teamIdx].members[memberIdx] = a;
        newTeams[selectedMember.teamIdx].scoreSum = newTeams[selectedMember.teamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        if (teamIdx !== selectedMember.teamIdx) newTeams[teamIdx].scoreSum = newTeams[teamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        setTeams(newTeams);
        setSelectedMember(null);
    };

    const handleMoveToTeam = (targetTeamIdx) => {
        if (!selectedMember || isPastMeeting) return;
        if (selectedMember.teamIdx === targetTeamIdx) { setSelectedMember(null); return; }
        const newTeams = teams.map(t => ({ ...t, members: [...t.members] }));
        const [moved] = newTeams[selectedMember.teamIdx].members.splice(selectedMember.memberIdx, 1);
        newTeams[targetTeamIdx].members.push(moved);
        newTeams[selectedMember.teamIdx].scoreSum = newTeams[selectedMember.teamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        newTeams[targetTeamIdx].scoreSum = newTeams[targetTeamIdx].members.reduce((s, m) => s + (m.points || 0), 0);
        setTeams(newTeams);
        setSelectedMember(null);
    };

    const handleTeamBadgeClick = (e, teamIdx) => {
        e.stopPropagation();
        if (isPastMeeting) return;
        setSelectedMember(null);
        if (selectedTeam === null) { setSelectedTeam(teamIdx); return; }
        if (selectedTeam === teamIdx) { setSelectedTeam(null); return; }
        const newTeams = teams.map(t => ({ ...t, members: [...t.members] }));
        const tmp = { members: newTeams[selectedTeam].members, scoreSum: newTeams[selectedTeam].scoreSum };
        newTeams[selectedTeam].members = newTeams[teamIdx].members;
        newTeams[selectedTeam].scoreSum = newTeams[teamIdx].scoreSum;
        newTeams[teamIdx].members = tmp.members;
        newTeams[teamIdx].scoreSum = tmp.scoreSum;
        setTeams(newTeams);
        setSelectedTeam(null);
    };

    return { handleDragStart, handleDragEnd, handleMemberDragOver, handleTeamAreaDragOver, handleTeamAreaDragLeave, handleDrop, handleMemberClick, handleMoveToTeam, handleTeamBadgeClick };
}

function ResultsTab({ teams, isConfirmed, displayedMeetingDate, isPastMeeting, selectedMember, setSelectedMember, selectedTeam, setSelectedTeam, unassignedMembers, draggedItem, dropIndicator, setDropIndicator, handlers, onReset, onReGenerate, onSaveDraft, onConfirm, onGoStorage }) {
    const { handleDragStart, handleDragEnd, handleMemberDragOver, handleTeamAreaDragOver, handleTeamAreaDragLeave, handleDrop, handleMemberClick, handleMoveToTeam, handleTeamBadgeClick } = handlers;

    if (teams.length === 0) return (
        <div className="text-center py-20 text-slate-300">
            <div className="flex justify-center mb-3 opacity-50"><Icon.Zap size={48} /></div>
            <p className="font-black">편성 탭에서 팀을 생성해주세요</p>
        </div>
    );

    return (
        <div>
            {displayedMeetingDate && (
                <div className={`rounded-2xl p-3 mb-3 flex items-center justify-between ${isPastMeeting ? 'bg-slate-100 border border-slate-200' : 'bg-blue-50 border border-blue-100'}`}>
                    <div>
                        <p className="font-black text-slate-800 text-sm">{displayedMeetingDate} 팀 편성</p>
                        <p className={`text-[10px] mt-0.5 ${isPastMeeting ? 'text-slate-400' : 'text-blue-500'}`}>
                            {isPastMeeting ? '종료된 모임 · 열람 전용' : '편집 가능'}
                        </p>
                    </div>
                    {isPastMeeting && <span className="text-[10px] font-black px-2 py-1 bg-slate-200 text-slate-500 rounded-lg">열람</span>}
                </div>
            )}

            {isConfirmed && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-4 text-center">
                    <p className="text-emerald-600 font-black text-sm flex items-center justify-center gap-1"><Icon.Check size={13}/>확정됨 · 출결 시스템에 반영되었습니다</p>
                </div>
            )}

            <div id="teams-capture-area" className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {teams.map((team, teamIdx) => (
                    <div key={teamIdx}
                        className={`rounded-3xl border-2 p-4 ${getTeamCard(teamIdx)} transition-all ${selectedMember && selectedMember.teamIdx !== teamIdx && !isPastMeeting ? 'ring-2 ring-teal-300' : ''}`}
                        onDragOver={!isPastMeeting ? e => handleTeamAreaDragOver(e, teamIdx) : undefined}
                        onDragLeave={!isPastMeeting ? handleTeamAreaDragLeave : undefined}
                        onDrop={!isPastMeeting ? e => handleDrop(e, teamIdx) : undefined}>
                        <div className="flex items-center gap-2 mb-3"
                            onDragOver={!isPastMeeting ? e => { e.preventDefault(); e.stopPropagation(); if (draggedItem) setDropIndicator({ teamIdx, insertIdx: 0 }); } : undefined}>
                            <span
                                onClick={!isPastMeeting ? e => handleTeamBadgeClick(e, teamIdx) : undefined}
                                className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center transition-all ${getTeamBadge(teamIdx)} ${!isPastMeeting ? 'cursor-pointer active:scale-90' : ''}
                                    ${selectedTeam === teamIdx ? 'ring-2 ring-offset-1 ring-white scale-110' : selectedTeam !== null && selectedTeam !== teamIdx && !isPastMeeting ? 'ring-2 ring-white/60' : ''}`}>{getTeamName(teamIdx)}</span>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-500">{team.members.length}명</p>
                                <p className="text-[10px] text-slate-400">{team.scoreSum}pt</p>
                            </div>
                            {selectedMember && selectedMember.teamIdx !== teamIdx && !isPastMeeting && (
                                <button onClick={e => { e.stopPropagation(); handleMoveToTeam(teamIdx); }}
                                    className="text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-300 px-1.5 py-0.5 rounded-lg active:scale-95 shrink-0 inline-flex items-center gap-0.5"><Icon.ArrowDown size={10}/>여기로</button>
                            )}
                        </div>
                        {(() => {
                            const els = [];
                            const showInd = (idx) => {
                                if (!draggedItem || !dropIndicator) return false;
                                if (dropIndicator.teamIdx !== teamIdx || dropIndicator.insertIdx !== idx) return false;
                                if (draggedItem.teamIdx === teamIdx && (idx === draggedItem.memberIdx || idx === draggedItem.memberIdx + 1)) return false;
                                return true;
                            };
                            const mkInd = (k) => (
                                <div key={k} className="h-7 mb-1 rounded-xl drop-indicator flex items-center justify-center">
                                    <span className="text-[8px] font-black text-teal-500">여기로 이동</span>
                                </div>
                            );
                            team.members.forEach((m, mi) => {
                                if (showInd(mi)) els.push(mkInd(`ind-${mi}`));
                                const isSelected = selectedMember?.teamIdx === teamIdx && selectedMember?.memberIdx === mi;
                                els.push(
                                    <div key={mi}
                                        draggable={!isPastMeeting}
                                        onDragStart={!isPastMeeting ? e => handleDragStart(e, teamIdx, mi) : undefined}
                                        onDragOver={!isPastMeeting ? e => handleMemberDragOver(e, teamIdx, mi) : undefined}
                                        onDrop={!isPastMeeting ? e => { e.stopPropagation(); handleDrop(e, teamIdx); } : undefined}
                                        onDragEnd={handleDragEnd}
                                        onClick={e => { e.stopPropagation(); handleMemberClick(teamIdx, mi); }}
                                        className={`flex items-center leading-none gap-1.5 p-2 mb-1 rounded-xl border transition-all
                                            ${isSelected ? 'bg-teal-100 border-teal-400 ring-2 ring-teal-400 scale-105' :
                                              selectedMember ? 'bg-white/70 border-transparent hover:border-teal-300 cursor-pointer' :
                                              `bg-white/70 border-transparent hover:border-teal-200 ${!isPastMeeting ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                            ${draggedItem?.teamIdx === teamIdx && draggedItem?.memberIdx === mi ? 'dragging' : ''}`}>
                                        <span className="text-[9px] font-black text-slate-400 w-4 text-right flex-shrink-0">{mi + 1}</span>
                                        <span className="font-black text-xs text-slate-800 flex-1">{m.name}</span>
                                        {m.gender === '여성' && <span className="text-[8px] text-pink-400 font-black">W</span>}
                                        {m.isGuest && <span className="text-[8px] bg-slate-700 text-white px-1 rounded font-black">G</span>}
                                    </div>
                                );
                            });
                            if (showInd(team.members.length)) els.push(mkInd('ind-end'));
                            return els;
                        })()}
                    </div>
                ))}
            </div>

            {selectedMember && !isPastMeeting && (
                <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
                     className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2.5 rounded-full shadow-xl text-xs font-black whitespace-nowrap animate-zoom-in">
                    <span className="inline-flex items-center gap-1"><Icon.Hand size={13}/>{teams[selectedMember.teamIdx]?.members[selectedMember.memberIdx]?.name} 선택됨</span>
                    <span className="text-teal-200">·</span>
                    <span className="text-teal-100 font-medium">교체할 팀원 탭 또는 팀의 ↓여기로 탭</span>
                    <button onClick={() => setSelectedMember(null)} className="ml-1 text-teal-200 hover:text-white text-sm font-black inline-flex items-center"><Icon.X size={13}/></button>
                </div>
            )}
            {selectedTeam !== null && !isPastMeeting && (
                <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
                     className="flex items-center gap-2 bg-violet-500 text-white px-4 py-2.5 rounded-full shadow-xl text-xs font-black whitespace-nowrap animate-zoom-in">
                    <span>{getTeamName(selectedTeam)}팀 선택됨</span>
                    <span className="text-violet-200">·</span>
                    <span className="text-violet-100 font-medium">교체할 팀 이름 탭</span>
                    <button onClick={() => setSelectedTeam(null)} className="ml-1 text-violet-200 hover:text-white text-sm font-black inline-flex items-center"><Icon.X size={13}/></button>
                </div>
            )}

            {unassignedMembers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                    <p className="text-xs font-black text-amber-600 mb-2">미편성 ({unassignedMembers.length}명)</p>
                    <div className="flex flex-wrap gap-2">
                        {unassignedMembers.map(m => (
                            <span key={m.id} className="text-xs font-black px-2 py-1 bg-white rounded-lg border border-amber-200 text-slate-700">{m.name}</span>
                        ))}
                    </div>
                </div>
            )}

            {isPastMeeting ? (
                <button onClick={onGoStorage} className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm inline-flex items-center justify-center gap-1"><Icon.ChevronLeft size={14}/>목록으로</button>
            ) : (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <button onClick={onReset} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">초기화</button>
                        <button onClick={onReGenerate} className="flex-1 py-3 bg-violet-500 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-1.5"><Icon.Refresh size={14} /> 재편성</button>
                        <button onClick={onSaveDraft} className="flex-1 py-3 bg-amber-400 text-slate-800 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-1.5"><Icon.Save size={14} /> 임시저장</button>
                    </div>
                    <button onClick={onConfirm} disabled={isConfirmed}
                        className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-lg ${isConfirmed ? 'bg-emerald-500 text-white opacity-70' : 'bg-teal-500 text-white'}`}>
                        {isConfirmed ? <span className="inline-flex items-center justify-center gap-1"><Icon.Check size={14}/>확정됨</span> : '확정하기'}
                    </button>
                </div>
            )}
            {!isPastMeeting && <p className="text-[10px] text-slate-400 text-center mt-2">팀원 탭 → 선택 후 다른 팀원과 교체 / ↓여기로 탭하면 팀 이동 · PC는 드래그 가능</p>}
        </div>
    );
}
