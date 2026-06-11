const AttendHistoryTab = ({
    history, selectedHistoryDetail, setSelectedHistoryDetail,
    historySortKey, setHistorySortKey, historySortOrder, setHistorySortOrder,
    sortedHistoryRecords, handleDeleteHistory, setHistoryEditTarget,
    isEditingLocation, setIsEditingLocation, editLocationValue, setEditLocationValue,
    handleUpdateLocation
}) => {
    if (!selectedHistoryDetail) {
        return (
            <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">출결 기록</p>
                {history.length === 0
                    ? <div className="text-center py-16 text-slate-300"><p className="text-4xl mb-3">📚</p><p className="font-black">기록이 없습니다</p></div>
                    : history.map(h => (
                        <button key={h.id} onClick={()=>{setSelectedHistoryDetail(h);setHistorySortKey('time');setHistorySortOrder('asc');}}
                            className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl mb-2 text-left hover:border-teal-200 transition-all">
                            <div>
                                <p className="font-black text-slate-800">{h.date}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{h.meetingTime} · {h.location}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-teal-500">{h.present}명 출석</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">총 {h.total}명</p>
                            </div>
                        </button>
                    ))
                }
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
                <button onClick={()=>setSelectedHistoryDetail(null)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><Icon.ArrowLeft size={18} /></button>
                <div className="flex-1">
                    <p className="font-black text-slate-800">{selectedHistoryDetail.date}</p>
                    <p className="text-xs text-slate-400">{selectedHistoryDetail.meetingTime}</p>
                </div>
                <button onClick={handleDeleteHistory} className="p-2 rounded-xl bg-red-50 text-red-400"><Icon.Trash size={16} /></button>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                    <div><p className="text-xl font-black text-teal-500">{selectedHistoryDetail.present}</p><p className="text-[10px] text-slate-400">출석</p></div>
                    <div><p className="text-xl font-black text-slate-700">{selectedHistoryDetail.total}</p><p className="text-[10px] text-slate-400">전체</p></div>
                    <div><p className="text-xl font-black text-slate-400">{selectedHistoryDetail.total - selectedHistoryDetail.present}</p><p className="text-[10px] text-slate-400">미출석</p></div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <Icon.MapPin size={12} className="text-slate-400" />
                    {isEditingLocation
                        ? <><input className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1" value={editLocationValue} onChange={e=>setEditLocationValue(e.target.value)} />
                            <button onClick={handleUpdateLocation} className="shrink-0 text-xs px-2 py-1 bg-teal-500 text-white rounded-lg">저장</button>
                            <button onClick={()=>setIsEditingLocation(false)} className="shrink-0 text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">취소</button></>
                        : <><span className="text-xs text-slate-600 flex-1 min-w-0 truncate">{selectedHistoryDetail.location}</span>
                            {selectedHistoryDetail.locationLat && (
                                <a href={`https://map.kakao.com/link/map/${encodeURIComponent(selectedHistoryDetail.location||'위치')},${selectedHistoryDetail.locationLat},${selectedHistoryDetail.locationLng}`}
                                   target="_blank" rel="noopener noreferrer"
                                   className="text-[10px] text-blue-500 font-black mr-1 underline">지도</a>
                            )}
                            <button onClick={()=>{setEditLocationValue(selectedHistoryDetail.location||'');setIsEditingLocation(true);}} className="shrink-0 p-1 text-slate-300 hover:text-slate-500"><Icon.Edit2 size={12} /></button></>
                    }
                </div>
            </div>

            <div className="flex gap-2 mb-3">
                {[['time','시간순'],['status','상태순']].map(([k,l]) => (
                    <button key={k} onClick={()=>{if(historySortKey===k&&k==='status')setHistorySortOrder(o=>o==='asc'?'desc':'asc');setHistorySortKey(k);}}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${historySortKey===k?'bg-teal-500 text-white':'bg-white border border-slate-200 text-slate-500'}`}>
                        {l} {historySortKey===k&&k==='status'&&(historySortOrder==='asc'?'↑':'↓')}
                    </button>
                ))}
            </div>

            {sortedHistoryRecords.map((record) => {
                const statusColor = record.status==='정상'?'text-emerald-500':record.status==='지각'?'text-yellow-500':record.status==='노쇼'?'text-red-400':'text-slate-400';
                return (
                    <div key={record.originalIndex} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl mb-1.5">
                        <div className="flex items-center gap-3">
                            <div>
                                <span className="font-black text-sm text-slate-800">{record.name}</span>
                                {record.type==='게스트'&&<span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-lg font-black">G</span>}
                                {record.type==='대기자'&&<span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-lg font-black">대기</span>}
                                {record.checkInTime&&record.checkInTime!=='미출석'&&<p className="text-[10px] text-slate-400 mt-0.5">{record.checkInTime}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black ${statusColor}`}>{record.status}</span>
                            <button onClick={()=>setHistoryEditTarget({docId:selectedHistoryDetail.id,recordIndex:record.originalIndex})} className="p-1 text-slate-300 hover:text-slate-500"><Icon.Edit2 size={12} /></button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
