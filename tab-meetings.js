// ── 모임 목록 탭 ──────────────────────────────────────────────────────────────
function MeetingsTab({ meetings = [], activeMeeting, handleSaveMeeting, handleDeleteMeeting, managers = [], showAlert, onSelectMeeting = null, pendingEditMeeting = null, onPendingEditHandled = null }) {
    const { useState } = React;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ date:'', start:'08:00', end:'10:00', location:'', meetingType:'self', opponentName:'', maxMale:12, maxFemale:6, maxLimit:18, managerId:'', managerName:'', isRegistrationEnabled:false, isFirstComeFirstServed:true, regOpenDate:'', regOpenHour:'09', regOpenMinute:'00', regCloseDate:'', regCloseHour:'23', regCloseMinute:'59', sendPush:true, locationLat:null, locationLng:null, locationRadius:100, enableQR:false });
    const [isSaving, setIsSaving] = useState(false);
    const [isLocPickerOpen, setIsLocPickerOpen] = useState(false);

    // ── 정기 모임 설정 ──
    const DOW = ['일','월','화','수','목','금','토'];
    const RECUR_DEFAULT = { enabled:false, weekday:0, start:'08:00', end:'10:00', uploadWeekday:1, uploadHour:20, defaultLocation:'', defaultLat:null, defaultLng:null, defaultRadius:100, defaultEnableQR:false, defaultFCFS:true, defaultMaxLimit:18, managerId:'', managerName:'', autoAnnounce:true };
    const [isRecModalOpen, setIsRecModalOpen] = useState(false);
    const [recCfg, setRecCfg] = useState(null);
    const [isRecSaving, setIsRecSaving] = useState(false);
    const [isRecLocPickerOpen, setIsRecLocPickerOpen] = useState(false);
    // 날짜별 미리 지정
    const [isOvrModalOpen, setIsOvrModalOpen] = useState(false);
    const [ovrMap, setOvrMap] = useState({});
    const [ovrDates, setOvrDates] = useState([]);
    const [ovrSel, setOvrSel] = useState(null);
    const [ovrForm, setOvrForm] = useState(null);
    const [isOvrLocPickerOpen, setIsOvrLocPickerOpen] = useState(false);
    const [isOvrSaving, setIsOvrSaving] = useState(false);

    const openRecurring = async () => {
        const cfg = await loadRecurringConfig();
        setRecCfg({ ...RECUR_DEFAULT, ...(cfg || {}) });
        setIsRecModalOpen(true);
    };

    const handleSaveRecurring = async () => {
        if (!recCfg) return;
        setIsRecSaving(true);
        try {
            await saveRecurringConfig({
                enabled: !!recCfg.enabled,
                weekday: Number(recCfg.weekday),
                start: recCfg.start || '08:00', end: recCfg.end || '10:00',
                uploadWeekday: Number(recCfg.uploadWeekday),
                uploadHour: Number(recCfg.uploadHour),
                defaultLocation: recCfg.defaultLocation || '',
                defaultLat: recCfg.defaultLat ?? null, defaultLng: recCfg.defaultLng ?? null,
                defaultRadius: Number(recCfg.defaultRadius) || 100,
                defaultEnableQR: !!recCfg.defaultEnableQR,
                defaultMeetingType: 'self',
                defaultFCFS: !!recCfg.defaultFCFS,
                defaultMaxLimit: Number(recCfg.defaultMaxLimit) || 18,
                managerId: recCfg.managerId || '', managerName: recCfg.managerName || '',
                autoAnnounce: !!recCfg.autoAnnounce,
            });
            setIsRecModalOpen(false);
            showAlert && showAlert('저장 완료', '정기 모임 설정이 저장되었습니다.');
        } catch(e) {
            showAlert && showAlert('오류', '저장 실패: ' + e.message);
        }
        setIsRecSaving(false);
    };

    const openOverrides = async () => {
        const cfg = recCfg || (await loadRecurringConfig()) || RECUR_DEFAULT;
        const dates = computeUpcomingMeetingDates(cfg.weekday ?? 0, 6);
        const map = await loadRecurringOverrides(dates);
        setOvrDates(dates); setOvrMap(map); setOvrSel(null); setOvrForm(null);
        setIsOvrModalOpen(true);
    };

    const selectOvrDate = (dt) => {
        const o = ovrMap[dt] || {};
        setOvrSel(dt);
        setOvrForm({
            location: o.location || '',
            locationLat: o.locationLat ?? null, locationLng: o.locationLng ?? null,
            locationRadius: o.locationRadius || 100,
            isFirstComeFirstServed: o.isFirstComeFirstServed ?? true,
            maxLimit: o.maxLimit || 18,
        });
    };

    const handleSaveOverride = async () => {
        if (!ovrSel || !ovrForm) return;
        setIsOvrSaving(true);
        try {
            await saveRecurringOverride(ovrSel, {
                location: ovrForm.location || '',
                locationLat: ovrForm.locationLat ?? null, locationLng: ovrForm.locationLng ?? null,
                locationRadius: Number(ovrForm.locationRadius) || 100,
                isFirstComeFirstServed: !!ovrForm.isFirstComeFirstServed,
                maxLimit: Number(ovrForm.maxLimit) || 18,
            });
            const map = await loadRecurringOverrides(ovrDates);
            setOvrMap(map); setOvrSel(null); setOvrForm(null);
            showAlert && showAlert('저장 완료', `${ovrSel} 미리 지정이 저장되었습니다.`);
        } catch(e) {
            showAlert && showAlert('오류', '저장 실패: ' + e.message);
        }
        setIsOvrSaving(false);
    };

    const handleDeleteOverride = async (dt) => {
        try {
            await deleteRecurringOverride(dt);
            const map = await loadRecurringOverrides(ovrDates);
            setOvrMap(map);
            if (ovrSel === dt) { setOvrSel(null); setOvrForm(null); }
        } catch(e) {
            showAlert && showAlert('오류', '삭제 실패: ' + e.message);
        }
    };

    const sortedMeetings = [...meetings].sort((a, b) => a.date.localeCompare(b.date));

    const openAdd = () => {
        setEditingId(null);
        setForm({ date:'', start:'08:00', end:'10:00', location:'', meetingType:'self', opponentName:'', maxMale:12, maxFemale:6, maxLimit:18, managerId:'', managerName:'', isRegistrationEnabled:false, isFirstComeFirstServed:true, regOpenDate:'', regOpenHour:'09', regOpenMinute:'00', regCloseDate:'', regCloseHour:'23', regCloseMinute:'59', sendPush:true, locationLat:null, locationLng:null, locationRadius:100, enableQR:false });
        setIsModalOpen(true);
    };

    const openEdit = (m) => {
        setEditingId(m.id);
        const parseRegDT = (isoStr) => {
            if (!isoStr) return { date: '', hour: '09', minute: '00' };
            const [d, t] = isoStr.split('T');
            const [h, min] = (t || '09:00').split(':');
            return { date: d || '', hour: h || '09', minute: (min || '00').substring(0, 2) };
        };
        const openDT = parseRegDT(m.registrationOpenAt);
        const closeDT = parseRegDT(m.registrationCloseAt);
        setForm({
            date: m.date, start: m.start||'08:00', end: m.end||'10:00',
            location: m.location||'', maxLimit: m.maxLimit||18,
            meetingType: m.meetingType || 'self', opponentName: m.opponentName || '',
            maxMale: m.maxMale ?? 12, maxFemale: m.maxFemale ?? 6,
            managerId: m.managerId||'', managerName: m.managerName||'',
            isRegistrationEnabled: m.isRegistrationEnabled || false,
            isFirstComeFirstServed: m.isFirstComeFirstServed ?? true,
            regOpenDate: openDT.date, regOpenHour: openDT.hour, regOpenMinute: openDT.minute,
            regCloseDate: closeDT.date, regCloseHour: closeDT.hour, regCloseMinute: closeDT.minute,
            sendPush: false,
            locationLat: m.locationLat || null, locationLng: m.locationLng || null,
            locationRadius: m.locationRadius || 100, enableQR: m.enableQR || false,
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const combinedForm = {
            ...form,
            registrationOpenAt: form.isRegistrationEnabled && form.regOpenDate
                ? `${form.regOpenDate}T${form.regOpenHour}:${form.regOpenMinute}` : '',
            registrationCloseAt: form.isRegistrationEnabled && form.regCloseDate
                ? `${form.regCloseDate}T${form.regCloseHour}:${form.regCloseMinute}` : '',
        };
        await handleSaveMeeting(combinedForm, editingId, () => setIsModalOpen(false));
        setIsSaving(false);
    };

    // 외부(모임 정보 보기 화면의 [수정] 버튼)에서 수정 폼 열기 요청
    React.useEffect(() => {
        if (pendingEditMeeting) {
            openEdit(pendingEditMeeting);
            onPendingEditHandled && onPendingEditHandled();
        }
    }, [pendingEditMeeting]);

    return (
        <div className="animate-in space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-black text-xl min-w-0 truncate">모임 목록</h2>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={openRecurring} className="flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm active:scale-95 transition-all">
                        🔁 정기
                    </button>
                    <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 text-white rounded-xl font-black text-sm active:scale-95 transition-all shadow-sm">
                        <Icon.Plus size={14}/> 모임 추가
                    </button>
                </div>
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
                                    <button className="flex-1 min-w-0 text-left" onClick={() => onSelectMeeting && onSelectMeeting(m)}>
                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                            <p className="font-black text-base">{m.date}</p>
                                            {isActive && <span className="text-[10px] font-black bg-teal-500 text-white px-2 py-0.5 rounded-full">현재 모임</span>}
                                            {isDone && <span className="text-[10px] font-black bg-slate-300 text-slate-600 px-2 py-0.5 rounded-full">종료됨</span>}
                                            {m.meetingType === 'match' && <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">매칭{m.opponentName ? ` vs ${m.opponentName}` : ''}</span>}
                                            {m.autoGenerated && m.needsReview && <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">⚠️ 확인 필요</span>}
                                            {m.autoGenerated && !m.needsReview && <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">🔁 자동</span>}
                                        </div>
                                        <p className="text-xs text-slate-400">{m.start} ~ {m.end} · {m.meetingType === 'match' ? `남 ${m.maxMale||0} · 여 ${m.maxFemale||0}` : `최대 ${m.maxLimit||18}명`}</p>
                                        {m.isRegistrationEnabled && <span className="text-[9px] font-black px-1.5 py-0.5 bg-orange-100 text-orange-500 rounded-lg mt-0.5 inline-block">선착순</span>}
                                        {m.location ? <p className="text-xs text-slate-400 mt-0.5 truncate"><Icon.MapPin size={10} className="inline mr-0.5"/>{m.location}</p> : null}
                                        {m.managerName ? <p className="text-xs text-slate-400 mt-0.5">담당: {m.managerName}</p> : null}
                                    </button>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <button onClick={() => openEdit(m)} className="p-2 rounded-xl bg-blue-50 text-blue-500 active:scale-95 transition-all">
                                            <Icon.Edit size={14}/>
                                        </button>
                                        <button onClick={() => handleDeleteMeeting(m)}
                                            className="p-2 rounded-xl active:scale-95 transition-all bg-red-50 text-red-400">
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
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[60]"
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
                                <label className="text-xs font-black text-slate-500 mb-1 block">모임 유형</label>
                                <div className="flex gap-2">
                                    {[['self','자체전'],['match','매칭']].map(([v,l]) => (
                                        <button key={v} type="button" onClick={() => setForm(f => ({...f, meetingType:v}))}
                                            className={`flex-1 min-w-0 py-2.5 rounded-xl text-sm font-black border transition-all active:scale-95 ${form.meetingType===v ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {form.meetingType === 'match' && (
                                <div>
                                    <label className="text-xs font-black text-slate-500 mb-1 block">상대팀명</label>
                                    <input type="text" value={form.opponentName}
                                        onChange={e => setForm(f => ({...f, opponentName: e.target.value}))}
                                        placeholder="예: FC 상대팀"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                </div>
                            )}
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
                                <div className="flex gap-2">
                                    <input type="text" value={form.location}
                                        onChange={e => setForm(f => ({...f, location: e.target.value}))}
                                        placeholder="예: 잠실 풋살파크"
                                        className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                    <button type="button" onClick={() => setIsLocPickerOpen(true)}
                                        className="flex-shrink-0 px-3 py-2.5 rounded-xl bg-teal-50 text-teal-600 font-black text-sm active:scale-95 transition-all flex items-center gap-1">
                                        <Icon.MapPin size={14}/> 지도
                                    </button>
                                </div>
                                {form.locationLat != null && (
                                    <p className="text-[11px] text-teal-500 font-black mt-1">📍 GPS 지정됨 ({form.locationLat.toFixed(4)}, {form.locationLng.toFixed(4)})</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">GPS 인정 반경</label>
                                <div className="flex gap-1.5">
                                    {[30,50,100,150,200].map(r => (
                                        <button key={r} type="button" onClick={() => setForm(f => ({...f, locationRadius:r}))}
                                            className={`flex-1 min-w-0 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${(form.locationRadius||100)===r ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {r}m
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                    <label className="text-xs font-black text-slate-500">출석 방식 · QR 허용</label>
                                    <p className="text-[11px] text-slate-400 mt-0.5">GPS가 기본, QR을 추가로 허용</p>
                                </div>
                                <button type="button" onClick={() => setForm(f => ({...f, enableQR: !f.enableQR}))}
                                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${form.enableQR ? 'bg-violet-500' : 'bg-slate-200'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.enableQR ? 'left-6' : 'left-0.5'}`}/>
                                </button>
                            </div>
                            {form.meetingType === 'match' ? (
                                <div>
                                    <label className="text-xs font-black text-slate-500 mb-1 block">정원 (남 / 여)</label>
                                    <div className="flex gap-3">
                                        <div className="flex-1 min-w-0">
                                            <input type="number" value={form.maxMale} min={0} max={40}
                                                onChange={e => setForm(f => ({...f, maxMale: parseInt(e.target.value)||0}))}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                            <p className="text-[10px] text-slate-400 mt-1 text-center font-black">남자</p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <input type="number" value={form.maxFemale} min={0} max={40}
                                                onChange={e => setForm(f => ({...f, maxFemale: parseInt(e.target.value)||0}))}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                            <p className="text-[10px] text-slate-400 mt-1 text-center font-black">여자</p>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-teal-600 font-black mt-1.5 text-center">총 정원 {(parseInt(form.maxMale)||0)+(parseInt(form.maxFemale)||0)}명</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs font-black text-slate-500 mb-1 block">최대 인원</label>
                                    <input type="number" value={form.maxLimit} min={1} max={40}
                                        onChange={e => setForm(f => ({...f, maxLimit: parseInt(e.target.value)||18}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                </div>
                            )}
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
                            <div className="pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-black text-slate-500">신청 창구</label>
                                    <button onClick={() => setForm(f => ({...f, isRegistrationEnabled: !f.isRegistrationEnabled}))}
                                        className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${form.isRegistrationEnabled ? 'bg-teal-500' : 'bg-slate-200'}`}>
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.isRegistrationEnabled ? 'left-6' : 'left-0.5'}`}/>
                                    </button>
                                </div>
                                {form.isRegistrationEnabled && (
                                    <div className="mt-3 space-y-3">
                                        {form.meetingType === 'match' ? (
                                            <p className="text-xs text-orange-600 font-black bg-orange-50 rounded-xl px-3 py-2 leading-relaxed">매칭은 남/여 정원 기준 선착순이 적용됩니다. 정원이 차면 같은 성별만 대기로 넘어갑니다.</p>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between py-1">
                                                    <label className="text-xs font-black text-slate-500">선착순 제한</label>
                                                    <button onClick={() => setForm(f => ({...f, isFirstComeFirstServed: !f.isFirstComeFirstServed}))}
                                                        className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${form.isFirstComeFirstServed ? 'bg-orange-400' : 'bg-slate-200'}`}>
                                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.isFirstComeFirstServed ? 'left-6' : 'left-0.5'}`}/>
                                                    </button>
                                                </div>
                                                {!form.isFirstComeFirstServed && <p className="text-xs text-slate-400">OFF: 정원 초과해도 모두 확정</p>}
                                            </>
                                        )}
                                        <div>
                                            <label className="text-xs font-black text-slate-500 mb-1 block">신청 시작</label>
                                            <div className="flex gap-2">
                                                <input type="date" value={form.regOpenDate}
                                                    onChange={e => setForm(f => ({...f, regOpenDate: e.target.value}))}
                                                    className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                                <select value={form.regOpenHour}
                                                    onChange={e => setForm(f => ({...f, regOpenHour: e.target.value}))}
                                                    className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400">
                                                    {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h} value={h}>{h}시</option>)}
                                                </select>
                                                <select value={form.regOpenMinute}
                                                    onChange={e => setForm(f => ({...f, regOpenMinute: e.target.value}))}
                                                    className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400">
                                                    {['00','10','20','30','40','50'].map(mn=><option key={mn} value={mn}>{mn}분</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-500 mb-1 block">신청 마감</label>
                                            <div className="flex gap-2">
                                                <input type="date" value={form.regCloseDate}
                                                    onChange={e => setForm(f => ({...f, regCloseDate: e.target.value}))}
                                                    className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                                <select value={form.regCloseHour}
                                                    onChange={e => setForm(f => ({...f, regCloseHour: e.target.value}))}
                                                    className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400">
                                                    {Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h} value={h}>{h}시</option>)}
                                                </select>
                                                <select value={form.regCloseMinute}
                                                    onChange={e => setForm(f => ({...f, regCloseMinute: e.target.value}))}
                                                    className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400">
                                                    {['00','10','20','30','40','50'].map(mn=><option key={mn} value={mn}>{mn}분</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* 등록 시 전체 푸시 알림 (새 모임 기본 ON, 수정 기본 OFF) */}
                        <div className="flex items-center justify-between px-1 py-2 border-t border-slate-100">
                            <div className="min-w-0 pr-2">
                                <label className="text-xs font-black text-slate-600">📢 등록 시 전체 알림 보내기</label>
                                <p className="text-[11px] text-slate-400 mt-0.5">모임 정보·신청기간이 푸시로 전체 발송됩니다</p>
                            </div>
                            <button onClick={() => setForm(f => ({...f, sendPush: !f.sendPush}))}
                                className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${form.sendPush ? 'bg-teal-500' : 'bg-slate-200'}`}>
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.sendPush ? 'left-6' : 'left-0.5'}`}/>
                            </button>
                        </div>
                        <button onClick={handleSave} disabled={isSaving}
                            className="w-full py-3 bg-teal-500 text-white rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50">
                            {isSaving ? '저장 중...' : editingId ? '수정 완료' : '모임 등록'}
                        </button>
                    </div>
                </div>
            )}

            <LocationPickerModal
                isOpen={isLocPickerOpen}
                onClose={() => setIsLocPickerOpen(false)}
                onConfirm={({name, lat, lng}) => {
                    setForm(f => ({...f, location: name, locationLat: lat, locationLng: lng}));
                    setIsLocPickerOpen(false);
                }}
                initialLat={form.locationLat} initialLng={form.locationLng} initialName={form.location}
            />

            {/* 정기 모임 설정 모달 */}
            {isRecModalOpen && recCfg && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[60]"
                    onClick={e => { if(e.target === e.currentTarget) setIsRecModalOpen(false); }}>
                    <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-4"
                        style={{paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))'}}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg">🔁 정기 모임 설정</h3>
                            <button onClick={() => setIsRecModalOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-black">✕ 닫기</button>
                        </div>
                        <div className="flex items-center justify-between bg-indigo-50 rounded-2xl px-4 py-3">
                            <div className="min-w-0 pr-2">
                                <label className="text-sm font-black text-indigo-700">자동 생성 사용</label>
                                <p className="text-[11px] text-indigo-400 mt-0.5">켜두면 정해진 요일·시각에 다음 모임이 자동 생성됩니다</p>
                            </div>
                            <button type="button" onClick={() => setRecCfg(c => ({...c, enabled: !c.enabled}))}
                                className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${recCfg.enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${recCfg.enabled ? 'left-6' : 'left-0.5'}`}/>
                            </button>
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">모임 요일</label>
                                <div className="flex gap-1">
                                    {DOW.map((d, i) => (
                                        <button key={i} type="button" onClick={() => setRecCfg(c => ({...c, weekday: i}))}
                                            className={`flex-1 min-w-0 py-2 rounded-lg text-xs font-black border transition-all ${Number(recCfg.weekday)===i ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{d}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-black text-slate-500 mb-1 block">시작 시간</label>
                                    <input type="time" value={recCfg.start} onChange={e => setRecCfg(c => ({...c, start: e.target.value}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-black text-slate-500 mb-1 block">종료 시간</label>
                                    <input type="time" value={recCfg.end} onChange={e => setRecCfg(c => ({...c, end: e.target.value}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
                                <label className="text-xs font-black text-slate-500 block">자동 생성 시점</label>
                                <div className="flex gap-1">
                                    {DOW.map((d, i) => (
                                        <button key={i} type="button" onClick={() => setRecCfg(c => ({...c, uploadWeekday: i}))}
                                            className={`flex-1 min-w-0 py-2 rounded-lg text-xs font-black border transition-all ${Number(recCfg.uploadWeekday)===i ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200'}`}>{d}</button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <select value={String(recCfg.uploadHour).padStart(2,'0')}
                                        onChange={e => setRecCfg(c => ({...c, uploadHour: parseInt(e.target.value)}))}
                                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                        {Array.from({length:24},(_,i)=>i).map(h => <option key={h} value={String(h).padStart(2,'0')}>{String(h).padStart(2,'0')}시</option>)}
                                    </select>
                                    <span className="text-xs text-slate-400 font-black">에 다음 모임 생성</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">예: 모임 <b>일</b> / 생성 <b>월 20시</b> → 매주 월 20시에 그 주 일요일 모임이 만들어집니다</p>
                            </div>
                            <div className="pt-1 border-t border-slate-100">
                                <button type="button" onClick={openOverrides}
                                    className="w-full mb-3 py-2.5 rounded-xl bg-amber-50 text-amber-600 font-black text-sm active:scale-95 transition-all">
                                    📅 날짜별 구장·선착순 미리 지정
                                </button>
                                <p className="text-[11px] font-black text-slate-400 mb-2">▼ 기본값 (날짜별로 따로 안 정한 경우 사용)</p>
                                <label className="text-xs font-black text-slate-500 mb-1 block">기본 구장</label>
                                <div className="flex gap-2">
                                    <input type="text" value={recCfg.defaultLocation}
                                        onChange={e => setRecCfg(c => ({...c, defaultLocation: e.target.value}))}
                                        placeholder="예: 잠실 풋살파크"
                                        className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                    <button type="button" onClick={() => setIsRecLocPickerOpen(true)}
                                        className="flex-shrink-0 px-3 py-2.5 rounded-xl bg-teal-50 text-teal-600 font-black text-sm active:scale-95 transition-all flex items-center gap-1">
                                        <Icon.MapPin size={14}/> 지도
                                    </button>
                                </div>
                                {recCfg.defaultLat != null && (
                                    <p className="text-[11px] text-teal-500 font-black mt-1">📍 GPS 지정됨</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">기본 GPS 인정 반경</label>
                                <div className="flex gap-1.5">
                                    {[30,50,100,150,200].map(r => (
                                        <button key={r} type="button" onClick={() => setRecCfg(c => ({...c, defaultRadius: r}))}
                                            className={`flex-1 min-w-0 py-2 rounded-xl text-xs font-black border transition-all ${(Number(recCfg.defaultRadius)||100)===r ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{r}m</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                    <label className="text-xs font-black text-slate-500">기본 출석 방식 · QR 허용</label>
                                </div>
                                <button type="button" onClick={() => setRecCfg(c => ({...c, defaultEnableQR: !c.defaultEnableQR}))}
                                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${recCfg.defaultEnableQR ? 'bg-violet-500' : 'bg-slate-200'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${recCfg.defaultEnableQR ? 'left-6' : 'left-0.5'}`}/>
                                </button>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">기본 최대 인원</label>
                                <input type="number" value={recCfg.defaultMaxLimit} min={1} max={40}
                                    onChange={e => setRecCfg(c => ({...c, defaultMaxLimit: parseInt(e.target.value)||18}))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                    <label className="text-xs font-black text-slate-500">기본 선착순 제한</label>
                                    <p className="text-[11px] text-slate-400 mt-0.5">정원 차면 대기로 (OFF: 모두 확정)</p>
                                </div>
                                <button type="button" onClick={() => setRecCfg(c => ({...c, defaultFCFS: !c.defaultFCFS}))}
                                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${recCfg.defaultFCFS ? 'bg-orange-400' : 'bg-slate-200'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${recCfg.defaultFCFS ? 'left-6' : 'left-0.5'}`}/>
                                </button>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">기본 담당자</label>
                                <select value={recCfg.managerId}
                                    onChange={e => { const mgr = managers.find(m => m.id === e.target.value); setRecCfg(c => ({...c, managerId: e.target.value, managerName: mgr?.name || ''})); }}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400">
                                    <option value="">담당자 없음</option>
                                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div className="min-w-0 pr-2">
                                    <label className="text-xs font-black text-slate-600">📢 생성 시 전체 알림</label>
                                    <p className="text-[11px] text-slate-400 mt-0.5">자동 생성과 동시에 전체 회원에게 푸시</p>
                                </div>
                                <button type="button" onClick={() => setRecCfg(c => ({...c, autoAnnounce: !c.autoAnnounce}))}
                                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${recCfg.autoAnnounce ? 'bg-teal-500' : 'bg-slate-200'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${recCfg.autoAnnounce ? 'left-6' : 'left-0.5'}`}/>
                                </button>
                            </div>
                        </div>
                        <button onClick={handleSaveRecurring} disabled={isRecSaving}
                            className="w-full py-3 bg-indigo-500 text-white rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50">
                            {isRecSaving ? '저장 중...' : '설정 저장'}
                        </button>
                    </div>
                </div>
            )}

            {/* 날짜별 미리 지정 모달 */}
            {isOvrModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[70]"
                    onClick={e => { if(e.target === e.currentTarget) setIsOvrModalOpen(false); }}>
                    <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-4"
                        style={{paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))'}}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg">📅 날짜별 미리 지정</h3>
                            <button onClick={() => setIsOvrModalOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-black">✕ 닫기</button>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">날짜를 골라 구장·선착순·인원을 미리 적어두면, 자동 생성 시 그 값이 우선 적용됩니다. 안 적은 날짜는 기본값으로 생성됩니다.</p>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {ovrDates.map(dt => {
                                const has = !!ovrMap[dt];
                                const o = ovrMap[dt] || {};
                                const opened = ovrSel === dt;
                                return (
                                    <div key={dt} className={`rounded-2xl border transition-all ${opened ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
                                        <button onClick={() => { if (opened) { setOvrSel(null); setOvrForm(null); } else { selectOvrDate(dt); } }}
                                            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
                                            <div className="min-w-0">
                                                <p className="font-black text-sm">{dt} ({DOW[new Date(dt+'T00:00:00').getDay()]})</p>
                                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                    {has ? `${o.location || '구장 미정'} · ${o.isFirstComeFirstServed ? '선착순' : '제한없음'} · ${o.maxLimit || 18}명` : '미지정 (기본값으로 생성)'}
                                                </p>
                                            </div>
                                            {has && <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex-shrink-0">지정됨</span>}
                                        </button>
                                        {opened && ovrForm && (
                                            <div className="px-4 pb-4 space-y-3 border-t border-amber-200/50 pt-3">
                                                <div>
                                                    <label className="text-xs font-black text-slate-500 mb-1 block">구장</label>
                                                    <div className="flex gap-2">
                                                        <input type="text" value={ovrForm.location}
                                                            onChange={e => setOvrForm(f => ({...f, location: e.target.value}))}
                                                            placeholder="예: 잠실 풋살파크"
                                                            className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                                                        <button type="button" onClick={() => setIsOvrLocPickerOpen(true)}
                                                            className="flex-shrink-0 px-3 py-2.5 rounded-xl bg-teal-50 text-teal-600 font-black text-sm active:scale-95 transition-all flex items-center gap-1">
                                                            <Icon.MapPin size={14}/> 지도
                                                        </button>
                                                    </div>
                                                    {ovrForm.locationLat != null && <p className="text-[11px] text-teal-500 font-black mt-1">📍 GPS 지정됨</p>}
                                                </div>
                                                <div>
                                                    <label className="text-xs font-black text-slate-500 mb-1 block">GPS 인정 반경</label>
                                                    <div className="flex gap-1.5">
                                                        {[30,50,100,150,200].map(r => (
                                                            <button key={r} type="button" onClick={() => setOvrForm(f => ({...f, locationRadius: r}))}
                                                                className={`flex-1 min-w-0 py-2 rounded-xl text-xs font-black border transition-all ${(Number(ovrForm.locationRadius)||100)===r ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{r}m</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-black text-slate-500">선착순 제한</label>
                                                    <button type="button" onClick={() => setOvrForm(f => ({...f, isFirstComeFirstServed: !f.isFirstComeFirstServed}))}
                                                        className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${ovrForm.isFirstComeFirstServed ? 'bg-orange-400' : 'bg-slate-200'}`}>
                                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${ovrForm.isFirstComeFirstServed ? 'left-6' : 'left-0.5'}`}/>
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-black text-slate-500 mb-1 block">최대 인원</label>
                                                    <input type="number" value={ovrForm.maxLimit} min={1} max={40}
                                                        onChange={e => setOvrForm(f => ({...f, maxLimit: parseInt(e.target.value)||18}))}
                                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button onClick={handleSaveOverride} disabled={isOvrSaving}
                                                        className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-black text-sm active:scale-95 transition-all disabled:opacity-50">
                                                        {isOvrSaving ? '저장 중...' : '이 날짜 저장'}
                                                    </button>
                                                    {has && (
                                                        <button onClick={() => handleDeleteOverride(dt)}
                                                            className="px-4 py-2.5 bg-red-50 text-red-400 rounded-xl font-black text-sm active:scale-95 transition-all">
                                                            지정 해제
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <LocationPickerModal
                isOpen={isRecLocPickerOpen}
                onClose={() => setIsRecLocPickerOpen(false)}
                onConfirm={({name, lat, lng}) => {
                    setRecCfg(c => ({...c, defaultLocation: name, defaultLat: lat, defaultLng: lng}));
                    setIsRecLocPickerOpen(false);
                }}
                initialLat={recCfg?.defaultLat} initialLng={recCfg?.defaultLng} initialName={recCfg?.defaultLocation}
            />
            <LocationPickerModal
                isOpen={isOvrLocPickerOpen}
                onClose={() => setIsOvrLocPickerOpen(false)}
                onConfirm={({name, lat, lng}) => {
                    setOvrForm(f => ({...f, location: name, locationLat: lat, locationLng: lng}));
                    setIsOvrLocPickerOpen(false);
                }}
                initialLat={ovrForm?.locationLat} initialLng={ovrForm?.locationLng} initialName={ovrForm?.location}
            />
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────
