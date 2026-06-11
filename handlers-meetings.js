// ── 모임 관리 핸들러 ─────────────────────────────────────────────────────────
const getMeetingsCol = () => getCol('meetings');

function getActiveMeeting(meetings) {
    return [...meetings]
        .filter(m => m.status !== 'done')
        .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
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
                locationLat: formData.locationLat ?? originalMeeting?.locationLat ?? null,
                locationLng: formData.locationLng ?? originalMeeting?.locationLng ?? null,
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

            // 등록 시 전체 푸시 알림 (토글 ON일 때만) — 실패해도 모임 저장은 유지
            if (formData.sendPush) {
                try {
                    const ann = composeMeetingAnnouncement(data);
                    await getCol('notifications').add({
                        title: ann.title,
                        body: ann.body,
                        sentAt: new Date().toISOString(),
                        sentBy: data.managerName || '모임 안내',
                    });
                } catch(e) {
                    console.warn('모임 알림 발송 실패:', e);
                }
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
