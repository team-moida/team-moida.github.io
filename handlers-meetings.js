// ── 모임 관리 핸들러 ─────────────────────────────────────────────────────────
const getMeetingsCol = () => getCol('meetings');

function getActiveMeeting(meetings) {
    return [...meetings]
        .filter(m => m.status !== 'done')
        .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

function makeMeetingHandlers({ meetings, showAlert, showConfirm }) {
    const activeMeeting = getActiveMeeting(meetings);

    const syncMirror = async (data) => {
        try {
            await getSettingsCol().doc('meeting_schedule_v2').set({
                date: data.date,
                start: data.start || '08:00',
                end: data.end || '10:00',
                location: data.location || '',
                locationLat: data.locationLat || null,
                locationLng: data.locationLng || null,
                locationRadius: data.locationRadius || 100,
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
            console.error('meeting_schedule_v2 미러 동기화 실패:', e);
        }
    };

    const handleSaveMeeting = async (formData, editingId, onSuccess) => {
        if (!formData.date) { showAlert('입력 오류', '날짜를 입력해주세요.'); return; }
        const docId = formData.date;
        try {
            if (!editingId) {
                const existing = await getMeetingsCol().doc(docId).get();
                if (existing.exists) { showAlert('중복 날짜', `${formData.date}에 이미 등록된 모임이 있습니다.`); return; }
            } else if (editingId !== docId) {
                const existing = await getMeetingsCol().doc(docId).get();
                if (existing.exists) { showAlert('중복 날짜', `${formData.date}에 이미 등록된 모임이 있습니다.`); return; }
            }

            const originalMeeting = editingId ? meetings.find(m => m.id === editingId) : null;
            const data = {
                date: formData.date,
                start: formData.start || '08:00',
                end: formData.end || '10:00',
                location: formData.location || '',
                locationLat: originalMeeting?.locationLat || null,
                locationLng: originalMeeting?.locationLng || null,
                locationRadius: originalMeeting?.locationRadius || 100,
                maxLimit: parseInt(formData.maxLimit) || 18,
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

            // 현재 활성 모임을 수정한 경우 meeting_schedule_v2 미러 동기화
            if (editingId && activeMeeting && editingId === activeMeeting.id) {
                await syncMirror(data);
            }

            if (onSuccess) onSuccess();
        } catch(e) {
            showAlert('오류', '저장 실패: ' + e.message);
        }
    };

    const handleDeleteMeeting = (meeting) => {
        const isCurrentMeeting = activeMeeting?.id === meeting.id;
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
                    const remaining = meetings.filter(m => m.id !== meeting.id);
                    const nextMeeting = getActiveMeeting(remaining);
                    if (nextMeeting) {
                        await syncMirror(nextMeeting);
                    } else {
                        await getSettingsCol().doc('meeting_schedule_v2').set({
                            date: '', start: '', end: '', location: '',
                            locationLat: null, locationLng: null, locationRadius: 100,
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

    return { activeMeeting, handleSaveMeeting, handleDeleteMeeting };
}
