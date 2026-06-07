// ── 모임 신청 핸들러 (1단계: 신청/취소, 자동 승급 없음) ─────────────────────────
const getRegistrationsCol = () => getCol('registrations');
const FieldValue = firebase.firestore.FieldValue;

function makeRegistrationHandlers({ meetingDate, memberData, meetingSettings, showToast, showAlert }) {

    const handleRegister = async () => {
        if (!meetingDate || !memberData?.memberId) return;

        const maxLimit = meetingSettings?.maxLimit || 18;
        const meetingRef = getMeetingsCol().doc(meetingDate);
        const regRef = getRegistrationsCol().doc(`${meetingDate}_${memberData.memberId}`);
        const sessionRef = getCol('weekly_session').doc(`${meetingDate}_${memberData.memberId}`);
        const mirrorRef = getCol('settings').doc('meeting_schedule_v2');

        try {
            await db.runTransaction(async (tx) => {
                const meetingDoc = await tx.get(meetingRef);
                const regDoc = await tx.get(regRef);

                if (regDoc.exists) throw new Error('이미 신청했습니다');
                if (!meetingDoc.exists) throw new Error('모임 정보를 찾을 수 없습니다');

                const meetingData = meetingDoc.data();
                const confirmedCount = meetingData.confirmedCount || 0;
                const waitingCount = meetingData.waitingCount || 0;

                const isFirstComeFirstServed = meetingData.isFirstComeFirstServed ?? true;
                const regData = {
                    meetingDate,
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
                    checkedIn: false,
                    checkInTime: null,
                    status: 'active',
                    isGuest: false,
                    team: null,
                    createdAt: FieldValue.serverTimestamp(),
                };

                if (!isFirstComeFirstServed) {
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

        const meetingRef = getMeetingsCol().doc(meetingDate);
        const regRef = getRegistrationsCol().doc(`${meetingDate}_${memberData.memberId}`);
        const sessionRef = getCol('weekly_session').doc(`${meetingDate}_${memberData.memberId}`);
        const mirrorRef = getCol('settings').doc('meeting_schedule_v2');

        try {
            await db.runTransaction(async (tx) => {
                const regDoc = await tx.get(regRef);

                if (!regDoc.exists) throw new Error('신청 기록이 없습니다');

                const reg = regDoc.data();

                tx.delete(regRef);

                if (reg.status === 'confirmed') {
                    tx.update(meetingRef, { confirmedCount: FieldValue.increment(-1) });
                    tx.update(mirrorRef, { confirmedCount: FieldValue.increment(-1) });
                    tx.delete(sessionRef);
                } else {
                    tx.update(meetingRef, { waitingCount: FieldValue.increment(-1) });
                    tx.update(mirrorRef, { waitingCount: FieldValue.increment(-1) });
                }
            });

            showToast && showToast('신청이 취소되었습니다.', 'info');
        } catch (e) {
            console.error('취소 오류:', e);
            showAlert && showAlert('오류', '취소 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    const adminAddRegistration = async (member, isGuest) => {
        if (!meetingDate || !member?.id) return;

        const maxLimit = meetingSettings?.maxLimit || 18;
        const meetingRef = getMeetingsCol().doc(meetingDate);
        const regRef = getRegistrationsCol().doc(`${meetingDate}_${member.id}`);
        const sessionRef = getCol('weekly_session').doc(`${meetingDate}_${member.id}`);
        const mirrorRef = getCol('settings').doc('meeting_schedule_v2');

        try {
            let isOverLimit = false;
            await db.runTransaction(async (tx) => {
                const meetingDoc = await tx.get(meetingRef);
                const regDoc = await tx.get(regRef);
                const sessionDoc = await tx.get(sessionRef);

                if (regDoc.exists || sessionDoc.exists) throw new Error('이미 추가됨');
                if (!meetingDoc.exists) throw new Error('모임 정보 없음');

                const confirmedCount = meetingDoc.data().confirmedCount || 0;
                if (confirmedCount >= maxLimit) isOverLimit = true;

                const regData = {
                    meetingDate,
                    memberId: member.id,
                    name: member.name || '',
                    gender: member.gender || '',
                    level: member.level || '',
                    status: 'confirmed',
                    waitingNumber: null,
                    addedByAdmin: true,
                    addedBy: memberData?.memberId || '',
                    isGuest: isGuest || false,
                    registeredAt: FieldValue.serverTimestamp(),
                };

                const sessionData = {
                    memberId: member.id,
                    name: member.name || '',
                    gender: member.gender || '',
                    level: member.level || '',
                    date: meetingDate,
                    checkedIn: false,
                    checkInTime: null,
                    status: 'active',
                    isGuest: isGuest || false,
                    team: null,
                    createdAt: FieldValue.serverTimestamp(),
                };

                tx.set(regRef, regData);
                tx.set(sessionRef, sessionData);
                tx.update(meetingRef, { confirmedCount: FieldValue.increment(1) });
                tx.update(mirrorRef, { confirmedCount: FieldValue.increment(1) });
            });

            if (isOverLimit) {
                showAlert && showAlert('정원 초과 추가', `정원(${maxLimit}명)을 초과했지만 강제 확정했습니다.`);
            } else {
                showToast && showToast(`${member.name} 추가 완료 (신규)`, 'success');
            }
        } catch (e) {
            if (e.message === '이미 추가됨') {
                showAlert && showAlert('추가 불가', '이미 선정되어 있는 회원입니다.');
            } else {
                console.error('관리자 추가 오류:', e);
                showAlert && showAlert('오류', '추가 중 오류가 발생했습니다.');
            }
        }
    };

    return { handleRegister, handleCancel, adminAddRegistration };
}
