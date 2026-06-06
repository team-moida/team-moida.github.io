// ── 모임 목록 탭 ──────────────────────────────────────────────────────────────
function MeetingsTab({ meetings = [], activeMeeting, handleSaveMeeting, handleDeleteMeeting, managers = [], showAlert }) {
    const { useState } = React;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ date:'', start:'08:00', end:'10:00', location:'', maxLimit:18, managerId:'', managerName:'' });
    const [isSaving, setIsSaving] = useState(false);

    const sortedMeetings = [...meetings].sort((a, b) => a.date.localeCompare(b.date));

    const openAdd = () => {
        setEditingId(null);
        setForm({ date:'', start:'08:00', end:'10:00', location:'', maxLimit:18, managerId:'', managerName:'' });
        setIsModalOpen(true);
    };

    const openEdit = (m) => {
        setEditingId(m.id);
        setForm({
            date: m.date, start: m.start||'08:00', end: m.end||'10:00',
            location: m.location||'', maxLimit: m.maxLimit||18,
            managerId: m.managerId||'', managerName: m.managerName||''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await handleSaveMeeting(form, editingId, () => setIsModalOpen(false));
        setIsSaving(false);
    };

    return (
        <div className="animate-in space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-black text-xl">모임 목록</h2>
                <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 text-white rounded-xl font-black text-sm active:scale-95 transition-all shadow-sm">
                    <Icon.Plus size={14}/> 모임 추가
                </button>
            </div>

            {sortedMeetings.length === 0 ? (
                <div className="card rounded-3xl p-8 text-center text-slate-400">
                    <div className="flex justify-center mb-3 opacity-30"><Icon.Calendar size={36}/></div>
                    <p className="font-black text-sm">등록된 모임이 없습니다</p>
                    <p className="text-xs mt-1">[모임 추가] 버튼으로 모임을 등록하세요</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {sortedMeetings.map(m => {
                        const isActive = activeMeeting?.id === m.id;
                        const isDone = m.status === 'done';
                        return (
                            <div key={m.id} className={`card rounded-2xl p-4 transition-all ${isActive ? 'ring-2 ring-teal-400' : ''} ${isDone ? 'opacity-50' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                            <p className="font-black text-base">{m.date}</p>
                                            {isActive && <span className="text-[10px] font-black bg-teal-500 text-white px-2 py-0.5 rounded-full">현재 모임</span>}
                                            {isDone && <span className="text-[10px] font-black bg-slate-300 text-slate-600 px-2 py-0.5 rounded-full">종료됨</span>}
                                        </div>
                                        <p className="text-xs text-slate-400">{m.start} ~ {m.end} · 최대 {m.maxLimit||18}명</p>
                                        {m.location ? <p className="text-xs text-slate-400 mt-0.5 truncate"><Icon.MapPin size={10} className="inline mr-0.5"/>{m.location}</p> : null}
                                        {m.managerName ? <p className="text-xs text-slate-400 mt-0.5">담당: {m.managerName}</p> : null}
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <button onClick={() => openEdit(m)} className="p-2 rounded-xl bg-blue-50 text-blue-500 active:scale-95 transition-all">
                                            <Icon.Edit size={14}/>
                                        </button>
                                        <button onClick={() => handleDeleteMeeting(m)}
                                            className={`p-2 rounded-xl active:scale-95 transition-all ${isActive ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-red-50 text-red-400'}`}>
                                            <Icon.Trash size={14}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
                    onClick={e => { if(e.target === e.currentTarget) setIsModalOpen(false); }}>
                    <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-4"
                        style={{paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))'}}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg">{editingId ? '모임 수정' : '모임 추가'}</h3>
                            <button onClick={() => setIsModalOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-black">✕ 닫기</button>
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">날짜</label>
                                <input type="date" value={form.date}
                                    onChange={e => setForm(f => ({...f, date: e.target.value}))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-black text-slate-500 mb-1 block">시작 시간</label>
                                    <input type="time" value={form.start}
                                        onChange={e => setForm(f => ({...f, start: e.target.value}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-black text-slate-500 mb-1 block">종료 시간</label>
                                    <input type="time" value={form.end}
                                        onChange={e => setForm(f => ({...f, end: e.target.value}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">장소명</label>
                                <input type="text" value={form.location}
                                    onChange={e => setForm(f => ({...f, location: e.target.value}))}
                                    placeholder="예: 잠실 풋살파크"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">최대 인원</label>
                                <input type="number" value={form.maxLimit} min={1} max={40}
                                    onChange={e => setForm(f => ({...f, maxLimit: parseInt(e.target.value)||18}))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">담당자</label>
                                <select value={form.managerId}
                                    onChange={e => {
                                        const mgr = managers.find(m => m.id === e.target.value);
                                        setForm(f => ({...f, managerId: e.target.value, managerName: mgr?.name || ''}));
                                    }}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400">
                                    <option value="">담당자 없음</option>
                                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={handleSave} disabled={isSaving}
                            className="w-full py-3 bg-teal-500 text-white rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50">
                            {isSaving ? '저장 중...' : editingId ? '수정 완료' : '모임 등록'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────
