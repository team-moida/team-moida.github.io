// ── 모임 신청 핸들러 (1단계: 신청/취소, 자동 승급 없음) ─────────────────────────
const getRegistrationsCol = () => getCol('registrations');
const FieldValue = firebase.firestore.FieldValue;

// 불참/노쇼 시간 구간 판별
// absent   : 신청마감 직후 ~ 모임 1일 전 21:59:59
// noshow_1 : 모임 1일 전 22:00:00 ~ 23:59:59  (1만원)
// noshow_2 : 모임 당일 00:00:00 ~ 10:00:00    (2만원)
const getAbsentType = (meetingDate) => {
    const now = new Date();
    const [y, m, d] = meetingDate.split('-').map(Number);
    const absentEnd    = new Date(y, m-1, d-1, 21, 59, 59, 999);
    const noshow1Start = new Date(y, m-1, d-1, 22,  0,  0,   0);
    const noshow1End   = new Date(y, m-1, d-1, 23, 59, 59, 999);
    const noshow2Start = new Date(y, m-1, d,    0,  0,  0,   0);
    const noshow2End   = new Date(y, m-1, d,   10,  0,  0,   0);
    if (now <= absentEnd)                          return 'absent';
    if (now >= noshow1Start && now <= noshow1End)  return 'noshow_1';
    if (now >= noshow2Start && now <= noshow2End)  return 'noshow_2';
    return null;
};

function makeRegistrationHandlers({ meetingDate, memberData, meetingSettings, showToast, showAlert }) {
    const meetingId = meetingSettings ? getMeetingId(meetingSettings) : meetingDate;
    const mType = meetingSettings?.meetingType || 'self';
    const mirrorDocId = mType === 'match' ? 'meeting_schedule_match' : 'meeting_schedule_v2';

    const handleRegister = async () => {
        if (!meetingDate || !memberData?.memberId) return;

        const maxLimit = meetingSettings?.maxLimit || 18;
        const meetingRef = getMeetingsCol().doc(meetingId);
        const regRef = getRegistrationsCol().doc(`${meetingId}_${memberData.memberId}`);
        const sessionRef = getCol('weekly_session').doc(`${meetingId}_${memberData.memberId}`);
        const mirrorRef = getCol('settings').doc(mirrorDocId);

        try {
            await db.runTransaction(async (tx) => {
                const meetingDoc = await tx.get(meetingRef);
                const regDoc = await tx.get(regRef);

                if (regDoc.exists) throw new Error('이미 신청했습니다');
                if (!meetingDoc.exists) throw new Error('모임 정보를 찾을 수 없습니다');

                const meetingData = meetingDoc.data();
                const confirmedCount = meetingData.confirmedCount || 0;
                const waitingCount = meetingData.waitingCount || 0;

                const isMatch = meetingData.meetingType === 'match';
                const isFemale = (memberData.gender || '') === '여성';
                const isFirstComeFirstServed = meetingData.isFirstComeFirstServed ?? true;
                const regData = {
                    meetingDate,
                    meetingId,
                    meetingType: isMatch ? 'match' : 'self',
                    memberId: memberData.memberId,
                    name: memberData.name || '',
                    gender: memberData.gender || '',
                    level: memberData.level || '',
                    registeredAt: FieldValue.serverTimestamp(),
                };

                const sessionData = {
                    memberId: memberData.memberId,
                    name: memberData.name || '',
                    gender: memberData.gender || '',
                    level: memberData.level || '',
                    date: meetingDate,
                    meetingId,
                    checkedIn: false,
                    checkInTime: null,
                    status: 'active',
                    isGuest: false,
                    team: null,
                    createdAt: FieldValue.serverTimestamp(),
                };

                if (isMatch) {
                    // 매칭: 신청자 성별 정원과 비교 → 차면 그 성별만 대기
                    const maxG = isFemale ? (meetingData.maxFemale || 0) : (meetingData.maxMale || 0);
                    const confirmedG = isFemale ? (meetingData.confirmedFemaleCount || 0) : (meetingData.confirmedMaleCount || 0);
                    const waitingG = isFemale ? (meetingData.waitingFemaleCount || 0) : (meetingData.waitingMaleCount || 0);
                    const confField = isFemale ? 'confirmedFemaleCount' : 'confirmedMaleCount';
                    const waitField = isFemale ? 'waitingFemaleCount' : 'waitingMaleCount';
                    if (confirmedG < maxG) {
                        tx.set(regRef, { ...regData, status: 'confirmed', waitingNumber: null });
                        tx.update(meetingRef, { confirmedCount: FieldValue.increment(1), [confField]: FieldValue.increment(1) });
                        tx.update(mirrorRef, { confirmedCount: FieldValue.increment(1), [confField]: FieldValue.increment(1) });
                        tx.set(sessionRef, sessionData);
                    } else {
                        tx.set(regRef, { ...regData, status: 'waiting', waitingNumber: waitingG + 1 });
                        tx.update(meetingRef, { waitingCount: FieldValue.increment(1), [waitField]: FieldValue.increment(1) });
                        tx.update(mirrorRef, { waitingCount: FieldValue.increment(1), [waitField]: FieldValue.increment(1) });
                    }
                } else if (!isFirstComeFirstServed) {
                    tx.set(regRef, { ...regData, status: 'confirmed', waitingNumber: null });
                    tx.update(meetingRef, { confirmedCount: FieldValue.increment(1) });
                    tx.update(mirrorRef, { confirmedCount: FieldValue.increment(1) });
                    tx.set(sessionRef, sessionData);
                } else if (confirmedCount < maxLimit) {
                    tx.set(regRef, { ...regData, status: 'confirmed', waitingNumber: null });
                    tx.update(meetingRef, { confirmedCount: FieldValue.increment(1) });
                    tx.update(mirrorRef, { confirmedCount: FieldValue.increment(1) });
                    tx.set(sessionRef, sessionData);
                } else {
                    tx.set(regRef, { ...regData, status: 'waiting', waitingNumber: waitingCount + 1 });
                    tx.update(meetingRef, { waitingCount: FieldValue.increment(1) });
                    tx.update(mirrorRef, { waitingCount: FieldValue.increment(1) });
                }
            });

            showToast && showToast('신청 완료!', 'success');
        } catch (e) {
            if (e.message === '이미 신청했습니다') {
                showAlert && showAlert('신청 불가', '이미 신청한 모임입니다.');
            } else {
                console.error('신청 오류:', e);
                showAlert && showAlert('오류', '신청 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        }
    };

    const handleCancel = async () => {
        if (!meetingDate || !memberData?.memberId) return;

        const meetingRef = getMeetingsCol().doc(meetingId);
        const regRef = getRegistrationsCol().doc(`${meetingId}_${memberData.memberId}`);
        const sessionRef = getCol('weekly_session').doc(`${meetingId}_${memberData.memberId}`);
        const mirrorRef = getCol('settings').doc(mirrorDocId);

        try {
            await db.runTransaction(async (tx) => {
                const regDoc = await tx.get(regRef);

                if (!regDoc.exists) throw new Error('신청 기록이 없습니다');

                const reg = regDoc.data();
                const isMatch = reg.meetingType === 'match';
                const isFemale = (reg.gender || '') === '여성';

                tx.delete(regRef);

                if (reg.status === 'confirmed') {
                    const upd = { confirmedCount: FieldValue.increment(-1) };
                    if (isMatch) upd[isFemale ? 'confirmedFemaleCount' : 'confirmedMaleCount'] = FieldValue.increment(-1);
                    tx.update(meetingRef, upd);
                    tx.update(mirrorRef, upd);
                    tx.delete(sessionRef);
                } else {
                    const upd = { waitingCount: FieldValue.increment(-1) };
                    if (isMatch) upd[isFemale ? 'waitingFemaleCount' : 'waitingMaleCount'] = FieldValue.increment(-1);
                    tx.update(meetingRef, upd);
                    tx.update(mirrorRef, upd);
                }
            });

            showToast && showToast('신청이 취소되었습니다.', 'info');
        } catch (e) {
            console.error('취소 오류:', e);
            showAlert && showAlert('오류', '취소 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    const handleAbsent = async () => {
        if (!meetingDate || !memberData?.memberId) return;
        const absentType = getAbsentType(meetingDate);
        if (!absentType) {
            showAlert && showAlert('불참 신청 불가', '지금은 불참 신청 가능 시간이 아닙니다.\n(모임 당일 오전 10시 이후 불가)');
            return;
        }
        const fine = absentType === 'noshow_1' ? 10000 : absentType === 'noshow_2' ? 20000 : 0;

        const meetingRef = getMeetingsCol().doc(meetingId);
        const regRef = getRegistrationsCol().doc(`${meetingId}_${memberData.memberId}`);
        const sessionRef = getCol('weekly_session').doc(`${meetingId}_${memberData.memberId}`);
        const mirrorRef = getCol('settings').doc(mirrorDocId);

        try {
            await db.runTransaction(async (tx) => {
                const regDoc = await tx.get(regRef);
                if (!regDoc.exists) throw new Error('신청 기록이 없습니다');
                const reg = regDoc.data();
                if (reg.status !== 'confirmed') throw new Error('확정 상태가 아닙니다');

                const isMatch = reg.meetingType === 'match';
                const isFemale = (reg.gender || '') === '여성';
                const countUpd = { confirmedCount: FieldValue.increment(-1) };
                if (isMatch) countUpd[isFemale ? 'confirmedFemaleCount' : 'confirmedMaleCount'] = FieldValue.increment(-1);

                const regUpdate = {
                    status: absentType === 'absent' ? 'absent' : 'noshow',
                    absentType,
                    absentAt: FieldValue.serverTimestamp(),
                };
                if (fine > 0) regUpdate.noShowFine = fine;

                tx.update(regRef, regUpdate);
                tx.update(meetingRef, countUpd);
                tx.update(mirrorRef, countUpd);

                if (absentType === 'absent') {
                    tx.delete(sessionRef);
                } else {
                    tx.update(sessionRef, { status: '노쇼', noShowFine: fine });
                }
            });

            showToast && showToast(
                fine > 0 ? `노쇼 처리됨 · 벌금 ${fine / 10000}만원` : '불참 처리됨',
                fine > 0 ? 'warning' : 'info'
            );
        } catch (e) {
            console.error('불참 처리 오류:', e);
            if (e.message === '확정 상태가 아닙니다') {
                showAlert && showAlert('불참 불가', '참가 확정 상태가 아닙니다.');
            } else {
                showAlert && showAlert('오류', '처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        }
    };

    return { handleRegister, handleCancel, handleAbsent };
}
