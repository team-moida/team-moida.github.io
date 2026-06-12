// ── 모임 관리 핸들러 ─────────────────────────────────────────────────────────
const getMeetingsCol = () => getCol('meetings');

function getActiveMeeting(meetings) {
    return [...meetings]
        .filter(m => m.status !== 'done')
        .sort((a, b) => {
            const dc = a.date.localeCompare(b.date);
            if (dc !== 0) return dc;
            return (a.meetingType || 'self').localeCompare(b.meetingType || 'self');
        })[0] || null;
}

// 모임 정보로 푸시 알림 문구 자동 생성 (날짜·시간·장소·신청기간)
function composeMeetingAnnouncement(data) {
    const days = ['일','월','화','수','목','금','토'];
    const fmtD = (ds) => {
        if (!ds) return '';
        const d = new Date(ds + 'T00:00:00');
        return isNaN(d.getTime()) ? ds : `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]})`;
    };
    const fmtDT = (iso) => {
        if (!iso) return '';
        const [dp, tp] = iso.split('T');
        return `${fmtD(dp)} ${tp || ''}`.trim();
    };
    const title = `📅 ${fmtD(data.date)} 모임 안내`;
    const lines = [`${data.start} ~ ${data.end}`];
    if (data.location) lines.push(`📍 ${data.location}`);
    lines.push(`👥 최대 ${data.maxLimit}명`);
    if (data.isRegistrationEnabled && data.registrationOpenAt && data.registrationCloseAt) {
        lines.push(`📝 신청: ${fmtDT(data.registrationOpenAt)} ~ ${fmtDT(data.registrationCloseAt)}`);
    }
    return { title, body: lines.join('\n') };
}

function makeMeetingHandlers({ meetings, showAlert, showConfirm }) {
    const activeMeeting = getActiveMeeting(meetings);
    const activeSelf = getActiveMeeting((meetings || []).filter(m => (m.meetingType||'self') !== 'match'));
    const activeMatch = getActiveMeeting((meetings || []).filter(m => (m.meetingType||'self') === 'match'));

    const syncMirror = async (data) => {
        const mirrorId = (data.meetingType || 'self') === 'match' ? 'meeting_schedule_match' : 'meeting_schedule_v2';
        try {
            await getSettingsCol().doc(mirrorId).set({
                date: data.date,
                start: data.start || '08:00',
                end: data.end || '10:00',
                location: data.location || '',
                locationLat: data.locationLat || null,
                locationLng: data.locationLng || null,
                locationRadius: data.locationRadius || 100,
                enableQR: data.enableQR || false,
                meetingType: data.meetingType || 'self',
                opponentName: data.opponentName || '',
                maxMale: data.maxMale || 0,
                maxFemale: data.maxFemale || 0,
                confirmedMaleCount: data.confirmedMaleCount || 0,
                confirmedFemaleCount: data.confirmedFemaleCount || 0,
                waitingMaleCount: data.waitingMaleCount || 0,
                waitingFemaleCount: data.waitingFemaleCount || 0,
                maxLimit: data.maxLimit || 18,
                managerId: data.managerId || '',
                managerName: data.managerName || '',
                testMode: false,
                isRegistrationEnabled: data.isRegistrationEnabled || false,
                isFirstComeFirstServed: data.isFirstComeFirstServed ?? true,
                registrationOpenAt: data.registrationOpenAt || '',
                registrationCloseAt: data.registrationCloseAt || '',
                confirmedCount: data.confirmedCount || 0,
                waitingCount: data.waitingCount || 0,
            });
        } catch(e) {
            console.error(`${mirrorId} 미러 동기화 실패:`, e);
        }
    };

    const handleSaveMeeting = async (formData, editingId, onSuccess) => {
        if (!formData.date) { showAlert('입력 오류', '날짜를 입력해주세요.'); return; }
        const docId = getMeetingId(formData);
        const typeLabel = formData.meetingType === 'match' ? '매칭' : '정기';
        try {
            if (!editingId) {
                const existing = await getMeetingsCol().doc(docId).get();
                if (existing.exists) { showAlert('중복 모임', `${formData.date}에 이미 등록된 ${typeLabel} 모임이 있습니다.`); return; }
            } else if (editingId !== docId) {
                const existing = await getMeetingsCol().doc(docId).get();
                if (existing.exists) { showAlert('중복 모임', `${formData.date}에 이미 등록된 ${typeLabel} 모임이 있습니다.`); return; }
            }

            const originalMeeting = editingId ? meetings.find(m => m.id === editingId) : null;
            const meetingType = formData.meetingType === 'match' ? 'match' : 'self';
            const maxMale = meetingType === 'match' ? (parseInt(formData.maxMale) || 0) : 0;
            const maxFemale = meetingType === 'match' ? (parseInt(formData.maxFemale) || 0) : 0;
            const data = {
                date: formData.date,
                meetingId: docId,
                start: formData.start || '08:00',
                end: formData.end || '10:00',
                location: formData.location || '',
                locationLat: formData.locationLat ?? originalMeeting?.locationLat ?? null,
                locationLng: formData.locationLng ?? originalMeeting?.locationLng ?? null,
                locationRadius: parseInt(formData.locationRadius) || originalMeeting?.locationRadius || 100,
                enableQR: formData.enableQR ?? originalMeeting?.enableQR ?? false,
                meetingType,
                opponentName: meetingType === 'match' ? (formData.opponentName || '') : '',
                maxMale,
                maxFemale,
                confirmedMaleCount: originalMeeting?.confirmedMaleCount || 0,
                confirmedFemaleCount: originalMeeting?.confirmedFemaleCount || 0,
                waitingMaleCount: originalMeeting?.waitingMaleCount || 0,
                waitingFemaleCount: originalMeeting?.waitingFemaleCount || 0,
                maxLimit: meetingType === 'match' ? (maxMale + maxFemale) : (parseInt(formData.maxLimit) || 18),
                managerId: formData.managerId || '',
                managerName: formData.managerName || '',
                status: originalMeeting?.status || 'upcoming',
                createdAt: originalMeeting?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isRegistrationEnabled: formData.isRegistrationEnabled || false,
                isFirstComeFirstServed: formData.isFirstComeFirstServed ?? true,
                registrationOpenAt: formData.registrationOpenAt || '',
                registrationCloseAt: formData.registrationCloseAt || '',
                confirmedCount: originalMeeting?.confirmedCount || 0,
                waitingCount: originalMeeting?.waitingCount || 0,
            };

            const batch = db.batch();
            batch.set(getMeetingsCol().doc(docId), data);
            if (editingId && editingId !== docId) {
                batch.delete(getMeetingsCol().doc(editingId));
            }
            await batch.commit();

            const updatedList = [
                ...meetings.filter(m => m.id !== docId && m.id !== editingId),
                { ...data, id: docId },
            ];
            const isMatchType = (data.meetingType || 'self') === 'match';
            const prevTypeActive = isMatchType ? activeMatch : activeSelf;
            const newTypeActive = getActiveMeeting(updatedList.filter(m =>
                isMatchType ? (m.meetingType||'self') === 'match' : (m.meetingType||'self') !== 'match'
            ));
            const activeChanged = (newTypeActive?.id || null) !== (prevTypeActive?.id || null);
            if (newTypeActive && (activeChanged || (editingId && editingId === prevTypeActive?.id))) {
                await syncMirror(newTypeActive.id === docId ? data : newTypeActive);
            }

            // 등록 시 [모임] 공지 자동 게시 — 새 정기모임은 항상, 그 외(수정·매칭)는 푸시 토글 ON일 때.
            // 공지를 누르면 그 모임의 신청 화면으로 이동(linkMeetingId/linkKind). 실패해도 모임 저장은 유지.
            const isNewSelfMeeting = !editingId && meetingType === 'self';
            if (isNewSelfMeeting || formData.sendPush) {
                try {
                    const ann = composeMeetingAnnouncement(data);
                    await getCol('notifications').add({
                        title: ann.title,
                        body: ann.body,
                        category: '모임',
                        linkMeetingId: docId,
                        linkKind: meetingType,
                        sentAt: new Date().toISOString(),
                        sentBy: data.managerName || '모임 안내',
                    });
                } catch(e) {
                    console.warn('모임 공지 게시 실패:', e);
                }
            }

            if (onSuccess) onSuccess();
        } catch(e) {
            showAlert('오류', '저장 실패: ' + e.message);
        }
    };

    const handleDeleteMeeting = (meeting) => {
        const mType = meeting.meetingType || 'self';
        const typeActive = mType === 'match' ? activeMatch : activeSelf;
        const isCurrentMeeting = typeActive?.id === meeting.id;
        const confirmMsg = isCurrentMeeting
            ? `현재 진행 예정 모임입니다. 삭제 시 신청 및 참가자 정보도 모두 사라집니다. 정말 삭제하시겠습니까?`
            : `${meeting.date} 모임을 삭제하시겠습니까?`;
        showConfirm('모임 삭제', confirmMsg, async () => {
            try {
                const [regSnap, sessionSnap] = await Promise.all([
                    getCol('registrations').where('meetingDate', '==', meeting.id).get(),
                    getCol('weekly_session').where('date', '==', meeting.id).get(),
                ]);
                const batch = db.batch();
                batch.delete(getMeetingsCol().doc(meeting.id));
                regSnap.docs.forEach(d => batch.delete(d.ref));
                sessionSnap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                if (isCurrentMeeting) {
                    const mirrorId = mType === 'match' ? 'meeting_schedule_match' : 'meeting_schedule_v2';
                    const remaining = meetings.filter(m => m.id !== meeting.id);
                    const nextMeeting = getActiveMeeting(remaining.filter(m =>
                        mType === 'match' ? (m.meetingType||'self') === 'match' : (m.meetingType||'self') !== 'match'
                    ));
                    if (nextMeeting) {
                        await syncMirror(nextMeeting);
                    } else {
                        await getSettingsCol().doc(mirrorId).set({
                            date: '', start: '', end: '', location: '',
                            locationLat: null, locationLng: null, locationRadius: 100,
                            meetingType: mType, opponentName: '', maxMale: 0, maxFemale: 0,
                            confirmedMaleCount: 0, confirmedFemaleCount: 0, waitingMaleCount: 0, waitingFemaleCount: 0,
                            maxLimit: 18, managerId: '', managerName: '', testMode: false,
                            isRegistrationEnabled: false, registrationOpenAt: '', registrationCloseAt: '',
                            confirmedCount: 0, waitingCount: 0,
                        });
                    }
                }
            } catch(e) {
                showAlert('오류', '삭제 실패: ' + e.message);
            }
        });
    };

    return { activeMeeting, activeSelf, activeMatch, handleSaveMeeting, handleDeleteMeeting };
}

// ── 정기 모임 자동 생성 설정 (전역 헬퍼: member.html · attendance.html 공유) ──
// 설정 1개: settings/recurring_meeting / 날짜별 지정: recurring_overrides/{날짜}
async function loadRecurringConfig() {
    try {
        const snap = await getCol('settings').doc('recurring_meeting').get();
        return snap.exists ? snap.data() : null;
    } catch(e) { console.error('정기 설정 로드 실패:', e); return null; }
}

async function saveRecurringConfig(data) {
    await getCol('settings').doc('recurring_meeting').set(
        { ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

// 모임 요일(weekday: 0=일) 기준 다가오는 날짜 count개 (YYYY-MM-DD). 오늘이 모임요일이면 오늘부터.
function computeUpcomingMeetingDates(weekday, count = 6, fromDate = new Date()) {
    const out = [];
    const base = new Date(fromDate);
    base.setHours(0, 0, 0, 0);
    const d0 = (Number(weekday) - base.getDay() + 7) % 7;
    for (let i = 0; i < count; i++) {
        const t = new Date(base);
        t.setDate(base.getDate() + d0 + i * 7);
        const y = t.getFullYear(), mo = String(t.getMonth() + 1).padStart(2, '0'), da = String(t.getDate()).padStart(2, '0');
        out.push(`${y}-${mo}-${da}`);
    }
    return out;
}

async function loadRecurringOverrides(dates) {
    const result = {};
    await Promise.all((dates || []).map(async (dt) => {
        try {
            const s = await getCol('recurring_overrides').doc(dt).get();
            if (s.exists) result[dt] = s.data();
        } catch(e) {}
    }));
    return result;
}

async function saveRecurringOverride(date, data) {
    await getCol('recurring_overrides').doc(date).set(
        { ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

async function deleteRecurringOverride(date) {
    await getCol('recurring_overrides').doc(date).delete();
}
