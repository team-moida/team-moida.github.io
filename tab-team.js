// ─── 팀 탭 ────────────────────────────────────────────────────────────────────
const TabTeam = ({
    isAdminMode, isTeamPanelOpen, setIsTeamPanelOpen,
    teamMakerTab, setTeamMakerTab,
    teamingSettings, setTeamingSettings,
    excludedIds, setExcludedIds,
    editTeams, editMeetingDate, editIsConfirmed,
    selectedMemberTM, setSelectedMemberTM,
    selectedTeamTM, setSelectedTeamTM,
    draggedItem, dropIndicator, setDropIndicator,
    savedDrafts, confirmedDrafts,
    teamStorageSubTab, setTeamStorageSubTab,
    previewDraft, setPreviewDraft,
    isCapturing, teamDraftData, teamReady, allowFromDisplay,
    myTeamIdx, memberData, allMembers,
    tmMeetingDate, tmActiveList, tmEntryList, tmLevelStats, tmUnassigned,
    generateTeams, tmCapture, tmSaveDraft, tmConfirm, tmReset, tmReGenerate,
    tmDragStart, tmDragEnd, tmMemberDragOver, tmTeamDragOver, tmTeamDragLeave,
    tmDrop, tmMemberClick, tmMoveToTeam, tmTeamBadgeClick, showConfirm,
}) => (
    <div className="animate-in">
        {/* 관리자 패널 토글 버튼 */}
        {isAdminMode && (
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">팀 편성</p>
                <button onClick={() => setIsTeamPanelOpen(v => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl transition-all active:scale-95"
                    style={isTeamPanelOpen ? {background:'linear-gradient(135deg,#14b8a6,#0d9488)',color:'white'} : {background:'rgba(203,213,225,0.7)',color:'#64748b'}}>
                    ⚙️ {isTeamPanelOpen ? '편성 모드 ON' : '편성 관리'}
                </button>
            </div>
        )}

        {/* ── 관리자 편성 패널 ── */}
        {isAdminMode && isTeamPanelOpen ? (
            <div>
                {/* 서브탭 */}
                <div className="flex gap-2 mb-4">
                    {[['generator','편성'],['results','결과'],['storage','기록']].map(([v,l]) => (
                        <button key={v} onClick={() => setTeamMakerTab(v)}
                            className={`px-3 py-2 rounded-xl font-black text-xs transition-all ${teamMakerTab===v?'bg-teal-500 text-white shadow':'text-slate-400 bg-slate-100'}`}>{l}</button>
                    ))}
                    <div className="flex-1"/>
                    {editTeams.length > 0 && !isCapturing && (
                        <button onClick={tmCapture} className="p-2 rounded-xl bg-slate-100 text-slate-400"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>
                    )}
                </div>

                {/* 편성 탭 */}
                {teamMakerTab === 'generator' && (
                    <div className="space-y-3">
                        <div className="card border-slate-100 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">모임 날짜</p>
                                    <p className="font-black text-slate-800">{tmMeetingDate || '날짜 미설정'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-slate-800">{tmActiveList.length}명</p>
                                    <p className="text-[10px] text-slate-400">편성 대상</p>
                                </div>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {Object.entries(tmLevelStats).map(([lvl, count]) => count > 0 && (
                                    <span key={lvl} className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${getLevelColor(lvl)}`}>{lvl}단계:{count}명</span>
                                ))}
                            </div>
                        </div>
                        <div className="card border-slate-100 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">팀 수</p>
                            <div className="grid grid-cols-5 gap-2 mb-3">
                                {[2,3,4,5,6].map(n => (
                                    <button key={n} onClick={() => setTeamingSettings(p => ({...p, teamCount: n}))}
                                        className={`py-2.5 rounded-xl font-black text-sm transition-all ${teamingSettings.teamCount===n?'bg-teal-500 text-white shadow':'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                                        {n}팀
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {[{key:'keepCouples',label:'커플 같은 팀 유지'},{key:'avoidOverlap',label:'지난 주 팀메이트 중복 회피'}].map(opt => (
                                    <button key={opt.key} onClick={() => setTeamingSettings(p => ({...p, [opt.key]: !p[opt.key]}))}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${teamingSettings[opt.key]?'bg-teal-50 border-teal-200':'bg-white border-slate-200'}`}>
                                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${teamingSettings[opt.key]?'bg-teal-500 border-teal-500':'border-slate-300'}`}>
                                            {teamingSettings[opt.key] && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                        </div>
                                        <span className="text-xs font-black text-slate-700">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {tmEntryList.length > 0 && (
                            <div className="card border-slate-100 rounded-2xl p-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">편성 대상 (탭하여 제외)</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {tmEntryList.map(p => {
                                        const mi = allMembers.find(mm => mm.id === p.memberId) || {};
                                        const lvl = mi.level || p.level;
                                        const isExcluded = excludedIds.includes(p.memberId || p.id);
                                        return (
                                            <button key={p.id} onClick={() => setExcludedIds(prev => prev.includes(p.memberId||p.id) ? prev.filter(id => id !== (p.memberId||p.id)) : [...prev, p.memberId||p.id])}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 border transition-all ${isExcluded?'bg-slate-100 border-slate-200 opacity-40 line-through':'bg-white border-slate-200'}`}>
                                                <span>{mi.name || p.name}</span>
                                                {(mi.gender||p.gender)==='여성' && <span className="text-pink-400">W</span>}
                                                {p.isGuest && <span className="text-[8px] px-1 bg-slate-700 text-white rounded">G</span>}
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${getLevelColor(lvl)}`}>{lvl}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <button onClick={generateTeams} disabled={tmActiveList.length < teamingSettings.teamCount}
                            className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black text-base shadow-xl disabled:opacity-30 flex items-center justify-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            팀 자동 편성
                        </button>
                    </div>
                )}

                {/* 결과 탭 */}
                {teamMakerTab === 'results' && (
                    <div>
                        {editTeams.length === 0
                            ? <div className="text-center py-16 text-slate-400"><div className="flex justify-center mb-3 opacity-30"><Icon.Users size={48}/></div><p className="font-black">편성 탭에서 팀을 생성해주세요</p></div>
                            : (
                                <div>
                                    {editMeetingDate && (
                                        <div className="rounded-xl p-3 mb-3 bg-blue-50 border border-blue-100 flex items-center justify-between">
                                            <p className="font-black text-slate-800 text-sm">{editMeetingDate} 팀 편성</p>
                                            {editIsConfirmed && <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-lg">✓ 확정됨</span>}
                                        </div>
                                    )}
                                    <div id="tm-capture-area" className="grid grid-cols-2 gap-2 mb-3">
                                        {editTeams.map((team, teamIdx) => (
                                            <div key={teamIdx}
                                                className={`rounded-2xl border-2 p-3 ${getTeamCard(teamIdx)} transition-all ${selectedMemberTM && selectedMemberTM.teamIdx !== teamIdx ? 'ring-2 ring-teal-300' : ''}`}
                                                onDragOver={e => tmTeamDragOver(e, teamIdx)}
                                                onDragLeave={tmTeamDragLeave}
                                                onDrop={e => tmDrop(e, teamIdx)}>
                                                <div className="flex items-center gap-1.5 mb-2"
                                                    onDragOver={e => {e.preventDefault();e.stopPropagation();if(draggedItem)setDropIndicator({teamIdx,insertIdx:0});}}>
                                                    <span onClick={e => tmTeamBadgeClick(e, teamIdx)}
                                                        className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center text-white cursor-pointer active:scale-90 ${getTeamBadge(teamIdx)} ${selectedTeamTM===teamIdx?'ring-2 ring-offset-1 ring-white scale-110':selectedTeamTM!==null&&selectedTeamTM!==teamIdx?'ring-1 ring-white/60':''}`}>
                                                        {getTeamName(teamIdx)}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black text-slate-500">{team.members.length}명</p>
                                                        <p className="text-[9px] text-slate-400">{team.scoreSum}pt</p>
                                                    </div>
                                                    {selectedMemberTM && selectedMemberTM.teamIdx !== teamIdx && (
                                                        <button onClick={e => {e.stopPropagation(); tmMoveToTeam(teamIdx);}}
                                                            className="text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-300 px-1.5 py-0.5 rounded-lg shrink-0">↓여기로</button>
                                                    )}
                                                </div>
                                                {(()=>{
                                                    const els = [];
                                                    const showInd = (idx) => {
                                                        if (!draggedItem || !dropIndicator) return false;
                                                        if (dropIndicator.teamIdx !== teamIdx || dropIndicator.insertIdx !== idx) return false;
                                                        if (draggedItem.teamIdx === teamIdx && (idx === draggedItem.memberIdx || idx === draggedItem.memberIdx + 1)) return false;
                                                        return true;
                                                    };
                                                    const mkInd = (k) => <div key={k} className="h-6 mb-1 rounded-lg tm-drop-indicator flex items-center justify-center"><span className="text-[8px] font-black text-teal-500">여기로</span></div>;
                                                    team.members.forEach((m, mi) => {
                                                        if (showInd(mi)) els.push(mkInd(`ind-${mi}`));
                                                        const isSelected = selectedMemberTM?.teamIdx === teamIdx && selectedMemberTM?.memberIdx === mi;
                                                        els.push(
                                                            <div key={mi}
                                                                draggable
                                                                onDragStart={e => tmDragStart(e, teamIdx, mi)}
                                                                onDragOver={e => tmMemberDragOver(e, teamIdx, mi)}
                                                                onDrop={e => {e.stopPropagation(); tmDrop(e, teamIdx);}}
                                                                onDragEnd={tmDragEnd}
                                                                onClick={e => {e.stopPropagation(); tmMemberClick(teamIdx, mi);}}
                                                                className={`flex items-center gap-1 p-1.5 mb-1 rounded-lg border transition-all cursor-grab active:cursor-grabbing
                                                                    ${isSelected ? 'bg-teal-100 border-teal-400 ring-2 ring-teal-400 scale-105' :
                                                                      selectedMemberTM ? 'bg-white/70 border-transparent hover:border-teal-300 cursor-pointer' :
                                                                      'bg-white/70 border-transparent hover:border-teal-200'}
                                                                    ${draggedItem?.teamIdx===teamIdx&&draggedItem?.memberIdx===mi?'tm-dragging':''}`}>
                                                                <span className="text-[8px] font-black text-slate-400 w-3 text-right flex-shrink-0">{mi+1}</span>
                                                                <span className="font-black text-[11px] text-slate-800 flex-1">{m.name}</span>
                                                                {m.gender==='여성' && <span className="text-[8px] text-pink-400 font-black">W</span>}
                                                                {m.isGuest && <span className="text-[8px] bg-slate-700 text-white px-1 rounded font-black">G</span>}
                                                                <span className={`text-[8px] font-black px-1 py-0.5 rounded ${getLevelColor(m.level)}`}>{m.level}</span>
                                                            </div>
                                                        );
                                                    });
                                                    if (showInd(team.members.length)) els.push(mkInd('ind-end'));
                                                    return els;
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                    {selectedMemberTM && (
                                        <div style={{position:'fixed',bottom:'80px',left:'50%',transform:'translateX(-50%)',zIndex:50}}
                                             className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2.5 rounded-full shadow-xl text-xs font-black whitespace-nowrap">
                                            <span>✋ {editTeams[selectedMemberTM.teamIdx]?.members[selectedMemberTM.memberIdx]?.name} 선택됨</span>
                                            <button onClick={() => setSelectedMemberTM(null)} className="ml-1 text-teal-200 hover:text-white font-black">✕</button>
                                        </div>
                                    )}
                                    {selectedTeamTM !== null && (
                                        <div style={{position:'fixed',bottom:'80px',left:'50%',transform:'translateX(-50%)',zIndex:50}}
                                             className="flex items-center gap-2 bg-violet-500 text-white px-4 py-2.5 rounded-full shadow-xl text-xs font-black whitespace-nowrap">
                                            <span>{getTeamName(selectedTeamTM)}팀 선택 · 교체할 팀 이름 탭</span>
                                            <button onClick={() => setSelectedTeamTM(null)} className="ml-1 text-violet-200 hover:text-white font-black">✕</button>
                                        </div>
                                    )}
                                    {tmUnassigned.length > 0 && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                                            <p className="text-xs font-black text-amber-600 mb-1.5">미편성 ({tmUnassigned.length}명)</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {tmUnassigned.map(m => <span key={m.id} className="text-xs font-black px-2 py-1 bg-white rounded-lg border border-amber-200 text-slate-700">{m.name}</span>)}
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <button onClick={tmReset} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs">초기화</button>
                                            <button onClick={tmReGenerate} className="flex-1 py-3 bg-violet-500 text-white rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-1">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> 재편성
                                            </button>
                                            <button onClick={tmSaveDraft} className="flex-1 py-3 bg-amber-400 text-slate-800 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-1">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 임시저장
                                            </button>
                                        </div>
                                        <button onClick={tmConfirm} disabled={editIsConfirmed}
                                            className={`w-full py-3.5 rounded-xl font-black text-sm shadow-lg ${editIsConfirmed?'bg-emerald-500 text-white opacity-70':'bg-teal-500 text-white'}`}>
                                            {editIsConfirmed ? '✓ 확정됨' : '확정하기'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center mt-2">팀원 탭 → 선택 후 교체 / ↓여기로 탭 · PC는 드래그</p>
                                </div>
                            )
                        }
                    </div>
                )}

                {/* 기록 탭 */}
                {teamMakerTab === 'storage' && (
                    <div>
                        <div className="flex gap-2 mb-3">
                            {[['confirmed','✓ 확정',confirmedDrafts.length],['draft','💾 임시',savedDrafts.length]].map(([v,l,cnt]) => (
                                <button key={v} onClick={() => setTeamStorageSubTab(v)}
                                    className={`flex-1 py-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 ${teamStorageSubTab===v?'bg-teal-500 text-white shadow':'bg-slate-100 text-slate-500'}`}>
                                    {l} <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${teamStorageSubTab===v?'bg-white/20 text-white':'bg-slate-200 text-slate-400'}`}>{cnt}</span>
                                </button>
                            ))}
                        </div>
                        {teamStorageSubTab === 'confirmed' && (
                            confirmedDrafts.length === 0
                                ? <div className="text-center py-16 text-slate-400"><p className="font-black">확정된 기록이 없습니다</p></div>
                                : confirmedDrafts.map(d => (
                                    <div key={d.meetingDate + d.createdAt} className="flex items-center gap-2 p-3 card border-emerald-100 rounded-xl mb-2">
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800 text-sm">{d.meetingDate}</p>
                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded mt-0.5 inline-block">{d.teams?.length||0}팀 확정</span>
                                        </div>
                                        <button onClick={() => setPreviewDraft({...d})} className="px-2.5 py-1.5 bg-teal-50 text-teal-500 rounded-lg font-black text-xs">미리보기</button>
                                    </div>
                                ))
                        )}
                        {teamStorageSubTab === 'draft' && (
                            savedDrafts.length === 0
                                ? <div className="text-center py-16 text-slate-400"><p className="font-black">임시 저장된 기록이 없습니다</p></div>
                                : savedDrafts.map(d => (
                                    <div key={d.id} className="flex items-center gap-2 p-3 card border-slate-100 rounded-xl mb-2">
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800 text-sm">{d.meetingDate}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{d.timeLabel}</p>
                                        </div>
                                        <button onClick={() => setPreviewDraft(d)} className="px-2.5 py-1.5 bg-teal-50 text-teal-500 rounded-lg font-black text-xs">미리보기</button>
                                        <button onClick={() => showConfirm('삭제','이 기록을 삭제하시겠습니까?', async () => { await getCol('team_drafts').doc(d.id).delete(); })}
                                            className="p-2 bg-red-50 text-red-400 rounded-lg">
                                            <Icon.Trash size={13}/>
                                        </button>
                                    </div>
                                ))
                        )}
                    </div>
                )}
            </div>
        ) : (
            /* ── 일반/회원 뷰 ── */
            !teamDraftData
                ? <div className="text-center py-20 text-slate-500">
                    <div className="flex justify-center mb-4 opacity-25"><Icon.Users size={56}/></div>
                    <p className="font-black text-lg mb-2">아직 팀이 편성되지 않았습니다</p>
                    <p className="text-sm text-slate-400">운영진이 팀 편성을 완료하면<br/>여기에 표시됩니다</p>
                  </div>
                : !teamReady
                ? <div className="text-center py-20 text-slate-500">
                    <div className="flex justify-center mb-4 opacity-25"><Icon.Users size={56}/></div>
                    <p className="font-black text-lg mb-2">팀 편성 비공개 중</p>
                    <p className="text-sm text-slate-400">{allowFromDisplay}부터 공개됩니다</p>
                  </div>
                : (
                    <div>
                        <div className="text-center mb-4">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-black">{teamDraftData.meetingDate} 팀 편성</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {teamDraftData.teams.map((team, teamIdx) => (
                                <div key={teamIdx} className={`rounded-2xl p-4 border ${teamIdx===myTeamIdx?'border-teal-500 bg-teal-50':'card border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center text-white ${getTeamBadge(teamIdx)}`}>{getTeamName(teamIdx)}</span>
                                        {teamIdx===myTeamIdx && <span className="text-[9px] font-black text-teal-500 uppercase">내 팀</span>}
                                    </div>
                                    {team.members.map((m, mi) => (
                                        <div key={mi} className={`text-xs py-1 font-black flex items-center gap-1 ${m.memberId===memberData?.memberId?'text-teal-500':'text-slate-400'}`}>
                                            <span className="opacity-50 w-4 text-right flex-shrink-0">{mi+1}.</span>
                                            <span>{m.name}{m.gender==='여성' && ' W'}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )
        )}
    </div>
);
// ─────────────────────────────────────────────────────────────────────────────
