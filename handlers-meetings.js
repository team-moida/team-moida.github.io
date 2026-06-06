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
        if (activeMeeting?.id === meeting.id) {
            showAlert('삭제 불가', '현재 진행 예정인 모임은 삭제할 수 없습니다.');
            return;
        }
        showConfirm('모임 삭제', `${meeting.date} 모임을 삭제하시겠습니까?`, async () => {
            try {
                await getMeetingsCol().doc(meeting.id).delete();
            } catch(e) {
                showAlert('오류', '삭제 실패: ' + e.message);
            }
        });
    };

    return { activeMeeting, handleSaveMeeting, handleDeleteMeeting };
}
