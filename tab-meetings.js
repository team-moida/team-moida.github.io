// ── 인원 스텝퍼: −/＋ 버튼 + 큰 숫자(위로 끌면↑·아래로 끌면↓ / 탭하면 직접 입력) ──
const CapStepper = ({ value, onChange, min = 1, max = 60 }) => {
    const { useState, useRef } = React;
    const [editing, setEditing] = useState(false);
    const drag = useRef(null);   // { startY, startVal, moved }
    const cur = parseInt(value) || 0;
    const clamp = (n) => Math.max(min, Math.min(max, n));
    const onDown = (e) => {
        if (editing) return;
        drag.current = { startY: e.clientY, startVal: clamp(cur || 18), moved: false };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    };
    const onMove = (e) => {
        const d = drag.current; if (!d) return;
        const dy = d.startY - e.clientY;                 // 위로 끌면 +
        if (Math.abs(dy) > 3) d.moved = true;
        const next = clamp(d.startVal + Math.round(dy / 14));   // 14px당 1명(민감도 절반)
        if (next !== cur) onChange(next);
    };
    const onUp = (e) => {
        const d = drag.current; drag.current = null;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
        if (d && !d.moved) setEditing(true);             // 끌지 않고 탭 → 입력 모드
    };
    return (
        <div className="flex items-center justify-center gap-5 py-3 select-none">
            <button type="button" onClick={() => onChange(clamp((cur || 18) - 1))}
                className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-90 transition-all"><Icon.Minus size={22}/></button>
            <div className="flex flex-col items-center" style={{ minWidth: 96 }}>
                {editing ? (
                    <input type="number" inputMode="numeric" autoFocus value={value}
                        onChange={e => onChange(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                        onBlur={e => { const n = parseInt(e.target.value); onChange(n >= min ? clamp(n) : 18); setEditing(false); }}
                        className="moida-num-bare w-24 text-center text-4xl font-black text-teal-600 bg-transparent border-0 focus:outline-none"/>
                ) : (
                    <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                        className="w-24 text-center text-4xl font-black text-teal-600 cursor-ns-resize touch-none">{cur}</div>
                )}
                <span className="text-xs font-black text-slate-400 -mt-1">명</span>
            </div>
            <button type="button" onClick={() => onChange(clamp((cur || 18) + 1))}
                className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-90 transition-all"><Icon.Plus size={22}/></button>
        </div>
    );
};

// ── 모임 목록 탭 ──────────────────────────────────────────────────────────────
function MeetingsTab({ meetings = [], activeMeeting, handleSaveMeeting, handleDeleteMeeting, managers = [], showAlert, onSelectMeeting = null, pendingEditMeeting = null, onPendingEditHandled = null, embedded = false, pendingAction = null, onPendingActionHandled = null }) {
    const { useState } = React;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ date:'', start:'08:00', end:'10:00', location:'', meetingType:'self', opponentName:'', maxMale:12, maxFemale:6, maxLimit:18, managerId:'', managerName:'', isRegistrationEnabled:false, isFirstComeFirstServed:true, autoRegisterManager:true, regOpenDate:'', regOpenHour:'09', regOpenMinute:'00', regCloseDate:'', regCloseHour:'23', regCloseMinute:'59', sendPush:true, locationLat:null, locationLng:null, locationRadius:100, enableQR:false, editPin:'' });
    const [isSaving, setIsSaving] = useState(false);
    const [isLocPickerOpen, setIsLocPickerOpen] = useState(false);
    // ── 모임 추가 마법사(단계별) — '새 모임'만 단계별. 수정은 기존 단일 폼 그대로 ──
    const [wizStep, setWizStep] = useState(1);
    const [wizLoading, setWizLoading] = useState(false);   // 등록 중 센스 로딩
    const [loadIdx, setLoadIdx] = useState(0);
    const WIZ_STEPS = [
        { t:'어떤 모임인가요?', s:'자체전인지 매칭인지 골라요.' },
        { t:'언제 모이나요?', s:'날짜와 시작·종료 시간을 정해요.' },
        { t:'어디서 하나요?', s:'장소·GPS 반경·QR 출석을 정해요.' },
        { t:'몇 명이 모이나요?', s:'정원/최대 인원을 정해요.' },
        { t:'신청을 받을까요?', s:'선착순·신청 기간을 정해요.' },
        { t:'거의 다 됐어요!', s:'담당자·알림 등 마지막 옵션이에요.' },
    ];
    const WIZ_LOAD = ['구장에 잔디를 까는 중…','골대를 단단히 고정하는 중…','조끼를 색깔별로 개는 중…','공에 바람을 넣는 중…','출석부를 펼치는 중…','호루라기를 부는 중…'];

    // ── 정기 모임 설정 ──
    const DOW = ['일','월','화','수','목','금','토'];
    const RECUR_DEFAULT = { enabled:false, weekday:0, start:'08:00', end:'10:00', uploadWeekday:1, uploadHour:20, regCloseWeekday:null, regCloseHour:null, defaultLocation:'', defaultLat:null, defaultLng:null, defaultRadius:100, defaultEnableQR:false, defaultFCFS:true, defaultMaxLimit:18, managerId:'', managerName:'', autoRegisterManager:true, autoAnnounce:true };
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
    // 뒤로가기로 닫기 (안드로이드) — 모임 수정/추가 전체화면 · 정기설정 · 날짜별지정 (지도 선택은 자체 처리)
    window.useMoidaBack && window.useMoidaBack(isModalOpen, () => {
        if (!editingId && wizStep > 1) setWizStep(s => Math.max(1, s - 1));   // 마법사: 이전 단계로
        else setIsModalOpen(false);
    });
    window.useMoidaBack && window.useMoidaBack(isRecModalOpen, () => setIsRecModalOpen(false));
    window.useMoidaBack && window.useMoidaBack(isOvrModalOpen, () => setIsOvrModalOpen(false));

    const openRecurring = async () => {
        const cfg = await loadRecurringConfig();
        const merged = { ...RECUR_DEFAULT, ...(cfg || {}) };
        // 신청 마감 미설정 시 모임 요일·시작시각으로 기본값 (기존 동작: 모임 시작 시각 마감)
        if (merged.regCloseWeekday == null) merged.regCloseWeekday = Number(merged.weekday) || 0;
        if (merged.regCloseHour == null) merged.regCloseHour = parseInt((merged.start || '08:00').split(':')[0]) || 8;
        setRecCfg(merged);
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
                regCloseWeekday: Number(recCfg.regCloseWeekday),
                regCloseHour: Number(recCfg.regCloseHour),
                defaultLocation: recCfg.defaultLocation || '',
                defaultLat: recCfg.defaultLat ?? null, defaultLng: recCfg.defaultLng ?? null,
                defaultRadius: Number(recCfg.defaultRadius) || 100,
                defaultEnableQR: !!recCfg.defaultEnableQR,
                defaultMeetingType: 'self',
                defaultFCFS: !!recCfg.defaultFCFS,
                defaultMaxLimit: Number(recCfg.defaultMaxLimit) || 18,
                managerId: recCfg.managerId || '', managerName: recCfg.managerName || '',
                autoRegisterManager: recCfg.autoRegisterManager !== false,
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

    // 끝난 모임(정기 done / 매칭=지난 날짜)은 관리 목록에서 제외 → '기록' 탭에만 남김
    const _mtTodayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
    const _mtIsEnded = (m) => !!m && (m.status === 'done' || (!!m.date && m.date < _mtTodayStr));
    const sortedMeetings = [...meetings].filter(m => !_mtIsEnded(m)).sort((a, b) => a.date.localeCompare(b.date));

    const openAdd = () => {
        setEditingId(null);
        setWizStep(1); setWizLoading(false);
        setForm({ date:'', start:'08:00', end:'10:00', location:'', meetingType:'self', opponentName:'', maxMale:12, maxFemale:6, maxLimit:18, managerId:'', managerName:'', isRegistrationEnabled:false, isFirstComeFirstServed:true, autoRegisterManager:true, regOpenDate:'', regOpenHour:'09', regOpenMinute:'00', regCloseDate:'', regCloseHour:'23', regCloseMinute:'59', sendPush:true, locationLat:null, locationLng:null, locationRadius:100, enableQR:false, editPin:'' });
        setIsModalOpen(true);
    };

    const [pinGate, setPinGate] = useState(null); // 모임 수정 PIN 게이트 {meeting, input, error}
    // 현재 로그인 회원 id (members 문서 id). attendance.html·member.html 모두 moida_member_data에 저장.
    const myMemberId = () => { try { return JSON.parse(localStorage.getItem('moida_member_data'))?.memberId || ''; } catch { return ''; } };

    const doOpenEdit = (m) => {
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
            editPin: m.editPin || '',
            isRegistrationEnabled: m.isRegistrationEnabled || false,
            isFirstComeFirstServed: m.isFirstComeFirstServed ?? true,
            autoRegisterManager: m.autoRegisterManager ?? true,
            regOpenDate: openDT.date, regOpenHour: openDT.hour, regOpenMinute: openDT.minute,
            regCloseDate: closeDT.date, regCloseHour: closeDT.hour, regCloseMinute: closeDT.minute,
            sendPush: false,
            locationLat: m.locationLat || null, locationLng: m.locationLng || null,
            locationRadius: m.locationRadius || 100, enableQR: m.enableQR || false,
        });
        setIsModalOpen(true);
    };

    // 모임 수정 게이트: 담당자 본인이면 통과, 아니면 PIN 입력. 둘 다 없으면(잠금 미설정) 자유 수정.
    const openEdit = (m) => {
        const me = myMemberId();
        if (m.managerId && me && me === m.managerId) return doOpenEdit(m);   // 담당자 본인
        if (m.editPin) { setPinGate({ meeting: m, input: '', error: false }); return; } // PIN 입력
        if (m.managerId) { showAlert('수정 잠김', `이 모임은 담당자(${m.managerName || '지정된 분'})만 수정할 수 있어요.`); return; }
        doOpenEdit(m); // 잠금 없음
    };
    const submitPinGate = () => {
        if (!pinGate) return;
        if (pinGate.input && pinGate.input === (pinGate.meeting.editPin || '')) {
            const m = pinGate.meeting; setPinGate(null); doOpenEdit(m);
        } else { setPinGate(g => ({ ...g, error: true })); }
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

    // 등록 중 센스 로딩 문구 회전
    React.useEffect(() => {
        if (!wizLoading) return;
        setLoadIdx(0);
        const iv = setInterval(() => setLoadIdx(i => (i + 1) % WIZ_LOAD.length), 750);
        return () => clearInterval(iv);
    }, [wizLoading]);

    // 마법사 등록 — handleSave와 동일 저장(handleSaveMeeting) 재사용 + 센스 로딩 최소 노출
    const wizSubmit = async () => {
        if (wizLoading) return;
        setWizLoading(true);
        const t0 = Date.now();
        const combinedForm = {
            ...form,
            registrationOpenAt: form.isRegistrationEnabled && form.regOpenDate ? `${form.regOpenDate}T${form.regOpenHour}:${form.regOpenMinute}` : '',
            registrationCloseAt: form.isRegistrationEnabled && form.regCloseDate ? `${form.regCloseDate}T${form.regCloseHour}:${form.regCloseMinute}` : '',
        };
        let ok = false;
        try { await handleSaveMeeting(combinedForm, null, () => { ok = true; }); } catch (e) {}
        const left = 1500 - (Date.now() - t0);
        if (left > 0) await new Promise(r => setTimeout(r, left));
        setWizLoading(false);
        if (ok) setIsModalOpen(false);
    };

    // 외부(모임 정보 보기 화면의 [수정] 버튼)에서 수정 폼 열기 요청
    React.useEffect(() => {
        if (pendingEditMeeting) {
            openEdit(pendingEditMeeting);
            onPendingEditHandled && onPendingEditHandled();
        }
    }, [pendingEditMeeting]);

    // 외부(모임 탭 헤더의 [정기]·[추가] 버튼)에서 모달 바로 열기 요청
    React.useEffect(() => {
        if (pendingAction === 'add') openAdd();
        else if (pendingAction === 'recurring') openRecurring();
        if (pendingAction) onPendingActionHandled && onPendingActionHandled();
    }, [pendingAction]);

    const isWiz = !editingId;                       // 새 모임만 마법사
    const stepShow = (n) => !isWiz || wizStep === n; // 수정모드는 전부 표시
    // 시간 = 시(00~23)·분(10분 단위) 드롭다운(24시간 표기). 날짜는 캘린더로 고르되 칸엔 월·일만 표시.
    const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const MINS = ['00','10','20','30','40','50'];
    const fmtMD = (d) => {
        const [, m, da] = (d || '').split('-');
        if (!m || !da) return '';
        const wd = ['일','월','화','수','목','금','토'][new Date(`${d}T00:00:00`).getDay()];
        return `${Number(m)}월 ${Number(da)}일 (${wd})`;
    };
    const timeSelect = (field, def) => {
        const val = form[field] || def;
        const hh = val.split(':')[0] || def.split(':')[0];
        const mm = (val.split(':')[1] || '00').slice(0, 2);
        const mins = MINS.includes(mm) ? MINS : [mm, ...MINS];   // 기존 비표준 분도 잃지 않게
        const setHM = (h, m) => setForm(f => ({ ...f, [field]: `${h}:${m}` }));
        return (
            <div className="flex gap-2">
                <select value={hh} onChange={e => setHM(e.target.value, mm)} className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400">
                    {HOURS.map(h => <option key={h} value={h}>{h}시</option>)}
                </select>
                <select value={mm} onChange={e => setHM(hh, e.target.value)} className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400">
                    {mins.map(m => <option key={m} value={m}>{m}분</option>)}
                </select>
            </div>
        );
    };
    return (
        <div className="animate-in space-y-4">
            {!embedded && (<>
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-black text-xl min-w-0 truncate">모임 목록</h2>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={openRecurring} className="flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm active:scale-95 transition-all">
                        <Icon.Refresh size={14}/> 정기
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
                                            {m.autoGenerated && m.needsReview && <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Icon.AlertTriangle size={10}/>확인 필요</span>}
                                            {m.autoGenerated && !m.needsReview && <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Icon.Refresh size={10}/>자동</span>}
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
            </>)}

            {pinGate && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/40" onClick={() => setPinGate(null)}>
                    <div className="bg-white rounded-3xl p-5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
                        <p className="font-black text-lg text-slate-800">담당자 확인</p>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{pinGate.meeting.date} 모임은 담당자 전용이에요. 수정하려면 PIN 4자리를 입력하세요.</p>
                        <input type="password" inputMode="numeric" maxLength={4} autoFocus value={pinGate.input}
                            onChange={e => setPinGate(g => ({...g, input: e.target.value.replace(/[^0-9]/g,'').slice(0,4), error:false}))}
                            onKeyDown={e => { if (e.key === 'Enter') submitPinGate(); }}
                            className={`w-full mt-3 p-3 rounded-xl border text-center text-lg tracking-[0.5em] font-black focus:outline-none ${pinGate.error ? 'border-red-400' : 'border-slate-200 focus:border-teal-400'}`}
                            placeholder="••••"/>
                        {pinGate.error && <p className="text-[11px] font-black text-red-500 mt-1.5 text-center">PIN이 맞지 않아요</p>}
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setPinGate(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-black text-sm active:scale-95 transition-all">취소</button>
                            <button onClick={submitPinGate} className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white font-black text-sm active:scale-95 transition-all">확인</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in">
                    <div className="shrink-0 border-b border-slate-100" style={{paddingTop:'env(safe-area-inset-top)'}}>
                        <div className="max-w-lg mx-auto w-full flex items-center justify-between px-5 py-4">
                            <h3 className="font-black text-lg">{editingId ? '모임 수정' : '모임 추가'}</h3>
                            <button onClick={() => setIsModalOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-black"><span className="inline-flex items-center gap-1"><Icon.X size={13}/>닫기</span></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto relative">
                        <div className={`max-w-lg mx-auto w-full px-5 ${isWiz ? 'py-5 min-h-full flex flex-col wiz-lg' : 'py-4 space-y-3'}`}>
                            {isWiz && (
                                <div className="mb-1 shrink-0">
                                    <div className="flex gap-1.5 mb-2.5">
                                        {WIZ_STEPS.map((_, i) => <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i < wizStep ? 'bg-teal-500' : 'bg-slate-200'}`}/>)}
                                    </div>
                                    <p className="text-[11px] font-black text-teal-600 tracking-wide">STEP {wizStep} / {WIZ_STEPS.length}</p>
                                    <p className="text-2xl font-black text-slate-800 mt-0.5">{WIZ_STEPS[wizStep-1].t}</p>
                                    <p className="text-sm font-bold text-slate-400 mt-1">{WIZ_STEPS[wizStep-1].s}</p>
                                </div>
                            )}
                            <div className={isWiz ? 'flex-1 flex flex-col justify-center space-y-4 py-2' : 'space-y-3'}>
                            {stepShow(1) && (<div className="space-y-3">
                            {isWiz ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {[['self','자체전','우리 팀끼리','Soccerball'],['match','매칭','다른 팀과','Swords']].map(([v,nm,ds,ic]) => {
                                        const on = form.meetingType === v;
                                        const lime = v === 'match';   // 매칭=라임 / 자체전=인디고 (홈 모임카드 색과 동일)
                                        const bg = on ? (lime ? '#C2F94A' : '#183FB0') : '#ffffff';
                                        const bd = on ? (lime ? '#C2F94A' : '#183FB0') : '#e2e8f0';
                                        const main = on ? (lime ? 'text-[#15171E]' : 'text-white') : 'text-slate-700';
                                        const subc = on ? (lime ? 'text-[#15171E]/65' : 'text-white/75') : 'text-slate-400';
                                        const iconc = on ? (lime ? 'text-[#15171E]' : 'text-white') : 'text-slate-300';
                                        return (
                                            <button key={v} type="button" onClick={() => setForm(f => ({...f, meetingType:v}))}
                                                className="rounded-2xl border-2 py-10 px-4 text-center transition-all active:scale-95 flex flex-col items-center justify-center"
                                                style={{ background:bg, borderColor:bd, ...(on ? { boxShadow: lime ? '0 12px 26px -10px rgba(194,249,74,.7)' : '0 12px 26px -10px rgba(24,63,176,.55)' } : {}) }}>
                                                <div className={`mb-3 ${iconc}`}>{React.createElement(Icon[ic], {size:46})}</div>
                                                <p className={`font-black text-lg ${main}`}>{nm}</p>
                                                <p className={`text-xs font-bold mt-1 ${subc}`}>{ds}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
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
                            )}
                            {form.meetingType === 'match' && (
                                <div>
                                    <label className="text-xs font-black text-slate-500 mb-1 block">상대팀명</label>
                                    <input type="text" value={form.opponentName}
                                        onChange={e => setForm(f => ({...f, opponentName: e.target.value}))}
                                        placeholder="예: FC 상대팀"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                </div>
                            )}
                            </div>)}
                            {stepShow(2) && (<div className="space-y-3">
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">날짜</label>
                                <div className="relative">
                                    <div className="wiz-box w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium flex items-center gap-2 pointer-events-none">
                                        <Icon.Calendar size={15} className="text-slate-400 flex-shrink-0"/>
                                        <span className={form.date ? 'text-slate-800' : 'text-slate-400'}>{form.date ? fmtMD(form.date) : '캘린더에서 날짜를 골라요'}</span>
                                    </div>
                                    <input type="date" value={form.date}
                                        onChange={e => setForm(f => ({...f, date: e.target.value}))}
                                        onClick={e => { try { e.currentTarget.showPicker && e.currentTarget.showPicker(); } catch (_) {} }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1 min-w-0">
                                    <label className="text-xs font-black text-slate-500 mb-1 block">시작 시간</label>
                                    {timeSelect('start', '08:00')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="text-xs font-black text-slate-500 mb-1 block">종료 시간</label>
                                    {timeSelect('end', '10:00')}
                                </div>
                            </div>
                            </div>)}
                            {stepShow(3) && (<div className="space-y-3">
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
                                    <p className="text-[11px] text-teal-500 font-black mt-1 flex items-center gap-1"><Icon.MapPin size={11} className="flex-shrink-0"/>GPS 지정됨 ({form.locationLat.toFixed(4)}, {form.locationLng.toFixed(4)})</p>
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
                            </div>)}
                            {stepShow(4) && (<div className="space-y-3">
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
                            ) : isWiz ? (
                                <div>
                                    <CapStepper value={form.maxLimit} onChange={(v) => setForm(f => ({...f, maxLimit: v}))} />
                                    <p className="text-[11px] text-slate-400 text-center -mt-1">숫자를 위·아래로 끌거나, 눌러서 직접 입력</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs font-black text-slate-500 mb-1 block">최대 인원</label>
                                    <input type="number" value={form.maxLimit} min={1} max={40}
                                        onChange={e => setForm(f => ({...f, maxLimit: parseInt(e.target.value)||18}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                </div>
                            )}
                            </div>)}
                            {stepShow(6) && (<div className="space-y-3">
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
                            {form.managerId && form.meetingType !== 'match' && (
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 pr-2">
                                        <label className="text-xs font-black text-slate-500">담당자 자동 1번 등록</label>
                                        <p className="text-[11px] text-slate-400 mt-0.5">ON: 담당자를 명단 1번으로 자동 신청 · OFF: 담당자도 직접 신청</p>
                                    </div>
                                    <button type="button" onClick={() => setForm(f => ({...f, autoRegisterManager: !(f.autoRegisterManager !== false)}))}
                                        className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${form.autoRegisterManager !== false ? 'bg-teal-500' : 'bg-slate-200'}`}>
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.autoRegisterManager !== false ? 'left-6' : 'left-0.5'}`}/>
                                    </button>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-black text-slate-500 mb-1 block">수정 잠금 PIN (4자리, 선택)</label>
                                <input type="text" inputMode="numeric" maxLength={4} value={form.editPin}
                                    onChange={e => setForm(f => ({...f, editPin: e.target.value.replace(/[^0-9]/g,'').slice(0,4)}))}
                                    placeholder="비우면 담당자 본인만 수정 가능"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">담당자 본인은 PIN 없이 수정할 수 있어요. PIN을 정하면 담당자가 아니어도 이 PIN으로 수정할 수 있어요.</p>
                            </div>
                            </div>)}
                            {stepShow(5) && (<div className="space-y-3">
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
                            </div>)}
                        {stepShow(6) && (<div className="space-y-3">
                        {/* 등록 시 전체 푸시 알림 (새 모임 기본 ON, 수정 기본 OFF) */}
                        <div className="flex items-center justify-between px-1 py-2 border-t border-slate-100">
                            <div className="min-w-0 pr-2">
                                <label className="text-xs font-black text-slate-600 inline-flex items-center gap-1"><Icon.Megaphone size={13} className="flex-shrink-0"/>등록 시 전체 알림 보내기</label>
                                <p className="text-[11px] text-slate-400 mt-0.5">모임 정보·신청기간이 푸시로 전체 발송됩니다</p>
                            </div>
                            <button onClick={() => setForm(f => ({...f, sendPush: !f.sendPush}))}
                                className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${form.sendPush ? 'bg-teal-500' : 'bg-slate-200'}`}>
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.sendPush ? 'left-6' : 'left-0.5'}`}/>
                            </button>
                        </div>
                        </div>)}
                            </div>
                        </div>
                        {wizLoading && (
                            <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center px-8 text-center">
                                <div className="moida-ball"/>
                                <p className="font-black text-base text-teal-700 mt-6 min-h-[24px]">{WIZ_LOAD[loadIdx]}</p>
                                <p className="text-xs font-bold text-slate-400 mt-1.5">잠시만요</p>
                            </div>
                        )}
                    </div>
                    <div className="shrink-0 border-t border-slate-100"
                        style={{paddingBottom:'max(0.75rem,env(safe-area-inset-bottom))'}}>
                        <div className="max-w-lg mx-auto w-full px-5 pt-3">
                            {isWiz ? (
                                <div className="flex gap-2">
                                    {wizStep > 1 && (
                                        <button onClick={() => setWizStep(s => Math.max(1, s - 1))}
                                            className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black text-sm active:scale-95 transition-all">이전</button>
                                    )}
                                    {wizStep < WIZ_STEPS.length ? (
                                        <button onClick={() => setWizStep(s => Math.min(WIZ_STEPS.length, s + 1))}
                                            className="flex-1 py-3 rounded-2xl bg-teal-500 text-white font-black text-sm active:scale-95 transition-all">다음</button>
                                    ) : (
                                        <button onClick={wizSubmit} disabled={wizLoading}
                                            className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all disabled:opacity-60">{wizLoading ? '등록 중…' : '✨ 등록하기'}</button>
                                    )}
                                </div>
                            ) : (
                                <button onClick={handleSave} disabled={isSaving}
                                    className="w-full py-3 bg-teal-500 text-white rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50">
                                    {isSaving ? '저장 중...' : '수정 완료'}
                                </button>
                            )}
                        </div>
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
                            <h3 className="font-black text-lg flex items-center gap-1.5"><Icon.Refresh size={16}/>정기 모임 설정</h3>
                            <button onClick={() => setIsRecModalOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-black"><span className="inline-flex items-center gap-1"><Icon.X size={13}/>닫기</span></button>
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
                            <div className="bg-rose-50 rounded-2xl p-3 space-y-2">
                                <label className="text-xs font-black text-slate-500 block">신청 마감</label>
                                <div className="flex gap-1">
                                    {DOW.map((d, i) => (
                                        <button key={i} type="button" onClick={() => setRecCfg(c => ({...c, regCloseWeekday: i}))}
                                            className={`flex-1 min-w-0 py-2 rounded-lg text-xs font-black border transition-all ${Number(recCfg.regCloseWeekday)===i ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-500 border-slate-200'}`}>{d}</button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <select value={String(recCfg.regCloseHour).padStart(2,'0')}
                                        onChange={e => setRecCfg(c => ({...c, regCloseHour: parseInt(e.target.value)}))}
                                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-400">
                                        {Array.from({length:24},(_,i)=>i).map(h => <option key={h} value={String(h).padStart(2,'0')}>{String(h).padStart(2,'0')}시</option>)}
                                    </select>
                                    <span className="text-xs text-slate-400 font-black">까지 신청 받기</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">이 시각 이후엔 신청을 받지 않습니다. 모임 요일과 같은 날로 두면 모임 당일 마감, 전날 요일로 두면 전날 마감입니다.</p>
                            </div>
                            <div className="pt-1 border-t border-slate-100">
                                <button type="button" onClick={openOverrides}
                                    className="w-full mb-3 py-2.5 rounded-xl bg-amber-50 text-amber-600 font-black text-sm active:scale-95 transition-all">
                                    <span className="inline-flex items-center gap-1.5"><Icon.Calendar size={14}/>날짜별 구장·선착순 미리 지정</span>
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
                                    <p className="text-[11px] text-teal-500 font-black mt-1 flex items-center gap-1"><Icon.MapPin size={11} className="flex-shrink-0"/>GPS 지정됨</p>
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
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                    <label className="text-xs font-black text-slate-500">담당자 자동 1번 등록</label>
                                    <p className="text-[11px] text-slate-400 mt-0.5">ON: 담당자를 명단 1번으로 자동 신청 · OFF: 담당자도 직접 신청</p>
                                </div>
                                <button type="button" onClick={() => setRecCfg(c => ({...c, autoRegisterManager: !(c.autoRegisterManager !== false)}))}
                                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${recCfg.autoRegisterManager !== false ? 'bg-teal-500' : 'bg-slate-200'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${recCfg.autoRegisterManager !== false ? 'left-6' : 'left-0.5'}`}/>
                                </button>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div className="min-w-0 pr-2">
                                    <label className="text-xs font-black text-slate-600 inline-flex items-center gap-1"><Icon.Megaphone size={13} className="flex-shrink-0"/>생성 시 전체 알림</label>
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
                            <h3 className="font-black text-lg flex items-center gap-1.5"><Icon.Calendar size={16}/>날짜별 미리 지정</h3>
                            <button onClick={() => setIsOvrModalOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-black"><span className="inline-flex items-center gap-1"><Icon.X size={13}/>닫기</span></button>
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
                                                    {ovrForm.locationLat != null && <p className="text-[11px] text-teal-500 font-black mt-1 flex items-center gap-1"><Icon.MapPin size={11} className="flex-shrink-0"/>GPS 지정됨</p>}
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
