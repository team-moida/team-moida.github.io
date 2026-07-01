// ── 모임 신청 핸들러 (1단계: 신청/취소, 자동 승급 없음) ─────────────────────────
const getRegistrationsCol = () => getCol('registrations');
const FieldValue = firebase.firestore.FieldValue;

// 불참/노쇼 시간 구간 판별
// absent   : 신청마감 직후 ~ 모임 1일 전 21:59:59
// noshow_1 : 모임 1일 전 22:00:00 ~ 23:59:59  (1만원)
// noshow_2 : 모임 당일 00:00:00 ~ 종료시간    (2만원)
// 디버그: URL에 ?debugTime=YYYY-MM-DDTHH:MM:SS 붙이면 해당 시간으로 테스트
const getDebugNow = () => {
    const t = new URLSearchParams(window.location.search).get('debugTime');
    return t ? new Date(t) : new Date();
};

const getAbsentType = (meetingDate, meetingEnd) => {
    const now = getDebugNow();
    const [y, m, d] = meetingDate.split('-').map(Number);
    const [endH, endM] = (meetingEnd || '10:00').split(':').map(Number);
    const absentEnd    = new Date(y, m-1, d-1, 21, 59, 59, 999);
    const noshow1Start = new Date(y, m-1, d-1, 22,  0,  0,   0);
    const noshow1End   = new Date(y, m-1, d-1, 23, 59, 59, 999);
    const noshow2Start = new Date(y, m-1, d,    0,  0,  0,   0);
    const noshow2End   = new Date(y, m-1, d, endH, endM,  0,   0);
    if (now <= absentEnd)                          return 'absent';
    if (now >= noshow1Start && now <= noshow1End)  return 'noshow_1';
    if (now >= noshow2Start && now <= noshow2End)  return 'noshow_2';
    return null;
};

function makeRegistrationHandlers({ meetingDate, memberData, meetingSettings, showToast, showAlert, showConfirm }) {
    const meetingId = meetingSettings ? getMeetingId(meetingSettings) : meetingDate;
    const mType = meetingSettings?.meetingType || 'self';
    const mirrorDocId = mType === 'match' ? 'meeting_schedule_match' : 'meeting_schedule_v2';

    const _doRegister = async () => {
        if (!meetingDate || !memberData?.memberId) return;

        // 미납 벌금(지각/노쇼)이 있으면 신청 완전 차단
        try {
            const penSnap = await getCol('penalties').where('memberId', '==', memberData.memberId).get();
            const unpaid = penSnap.docs.map(d => d.data()).filter(p => p.status !== 'paid');
            if (unpaid.length > 0) {
                const total = unpaid.reduce((s, p) => s + (p.amount || 0), 0);
                showAlert && showAlert('신청 불가', `미납 벌금이 ${unpaid.length}건(${total.toLocaleString()}원) 있습니다.\n회비 탭에서 납부 후 신청해주세요.`);
                return;
            }
        } catch (_) {}

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
                    createdAt: new Date().toISOString(),
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

            // 운영진이 '회원 선정'으로 따로 넣어둔 세션(자동 ID)이 있으면 정리 → 중복 입장 방지.
            // 방금 만든 고정 ID 세션(${meetingId}_${memberId})은 보존하고, 그 외 같은 회원 세션만 제거.
            try {
                const detId = `${meetingId}_${memberData.memberId}`;
                const sSnap = await getCol('weekly_session').where('meetingId', '==', meetingId).get();
                const strays = sSnap.docs.filter(d => (d.data() || {}).memberId === memberData.memberId && d.id !== detId);
                if (strays.length) { const b = db.batch(); strays.forEach(d => b.delete(d.ref)); await b.commit(); }
            } catch (_) {}

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

    // 신청 시 확인 팝업을 한 번 더 띄운다 (홈/모임 탭 공통). showConfirm 없으면 바로 신청.
    const handleRegister = () => {
        if (!meetingDate || !memberData?.memberId) return;
        if (typeof showConfirm === 'function') {
            const label = mType === 'match' ? '매칭 모임' : '모임';
            showConfirm('모임 신청', `${meetingDate} ${label}에 신청할까요?`, _doRegister);
        } else {
            _doRegister();
        }
    };

    const _doCancel = async () => {
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

    // 신청 취소 — 홈/모임 탭에서 각자 확인 팝업(순번 밀림 안내, cancelAsk)을 먼저 띄운 뒤 호출하므로
    // 여기서 또 showConfirm을 띄우면 확인창이 2번 뜬다 → 바로 취소 실행.
    const handleCancel = () => {
        if (!meetingDate || !memberData?.memberId) return;
        _doCancel();
    };

    const handleAbsent = async (reason) => {
        if (!meetingDate || !memberData?.memberId) return;
        const absentReason = (reason || '').slice(0, 200);
        const absentType = getAbsentType(meetingDate, meetingSettings?.end);
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
                    absentReason,
                    absentAt: FieldValue.serverTimestamp(),
                };
                if (fine > 0) regUpdate.noShowFine = fine;

                tx.update(regRef, regUpdate);
                tx.update(meetingRef, countUpd);
                tx.update(mirrorRef, countUpd);

                // 담당자 본인이 불참/노쇼면 '되돌릴 담당자'로 표시(meetings 문서에만) → 나중에 취소하면 이 사람으로 담당 복귀
                if (meetingSettings?.managerId && meetingSettings.managerId === memberData.memberId) {
                    tx.set(meetingRef, { managerAbsentId: memberData.memberId }, { merge: true });
                }

                if (absentType === 'absent') {
                    tx.delete(sessionRef);
                } else {
                    tx.update(sessionRef, { status: '노쇼', noShowFine: fine, noShowReason: absentReason });
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

    // 불참/노쇼 취소(다시 신청) — 모임 시간 구간 안이면 가능. 대기 유무와 무관하게 선착순 '맨 뒤'로
    // 다시 신청(registeredAt를 새로 찍어 뒤로). 자리 있으면 확정, 정원이 찼으면 대기 맨 뒤.
    const handleUndoAbsent = async () => {
        if (!meetingDate || !memberData?.memberId) return;

        // 불참·노쇼 모두 취소(다시 신청) 가능 — 단 모임 시간 구간이 지난(종료) 뒤엔 불가
        if (!getAbsentType(meetingDate, meetingSettings?.end)) {
            showAlert && showAlert('취소 불가', '지금은 취소할 수 없어요.\n(모임 시간이 지났어요)');
            return;
        }

        // 미납 벌금(지각/노쇼)이 있으면 재신청 차단 (신청과 동일 게이트)
        try {
            const penSnap = await getCol('penalties').where('memberId', '==', memberData.memberId).get();
            const unpaid = penSnap.docs.map(d => d.data()).filter(p => p.status !== 'paid');
            if (unpaid.length > 0) {
                const total = unpaid.reduce((s, p) => s + (p.amount || 0), 0);
                showAlert && showAlert('불참 취소 불가', `미납 벌금이 ${unpaid.length}건(${total.toLocaleString()}원) 있어요.\n회비 탭에서 납부 후 다시 신청해주세요.`);
                return;
            }
        } catch (_) {}

        const maxLimit = meetingSettings?.maxLimit || 18;
        const meetingRef = getMeetingsCol().doc(meetingId);
        const regRef = getRegistrationsCol().doc(`${meetingId}_${memberData.memberId}`);
        const sessionRef = getCol('weekly_session').doc(`${meetingId}_${memberData.memberId}`);
        const mirrorRef = getCol('settings').doc(mirrorDocId);

        // 운영진이 '회원 선정'으로 따로 넣어둔 세션(자동 ID)이 남아 있으면 먼저 제거 → 중복 입장 방지.
        // (회원 신청은 고정 ID `${meetingId}_${memberId}`, 운영진 선정은 자동 ID라 서로 못 알아봐 중복됨)
        try {
            const sSnap = await getCol('weekly_session').where('meetingId', '==', meetingId).get();
            const dups = sSnap.docs.filter(d => (d.data() || {}).memberId === memberData.memberId);
            if (dups.length) { const b = db.batch(); dups.forEach(d => b.delete(d.ref)); await b.commit(); }
        } catch (_) {}

        try {
            let resultStatus = 'confirmed';
            let managerRestored = false;
            await db.runTransaction(async (tx) => {
                const meetingDoc = await tx.get(meetingRef);
                const regDoc = await tx.get(regRef);
                if (!regDoc.exists) throw new Error('신청 기록이 없습니다');
                const reg = regDoc.data();
                if (reg.status !== 'absent' && reg.status !== 'noshow') throw new Error('불참 상태가 아닙니다');
                if (!meetingDoc.exists) throw new Error('모임 정보를 찾을 수 없습니다');

                const meetingData = meetingDoc.data();
                const confirmedCount = meetingData.confirmedCount || 0;
                const waitingCount = meetingData.waitingCount || 0;
                const isMatch = meetingData.meetingType === 'match';
                const isFemale = (reg.gender || memberData.gender || '') === '여성';
                const isFirstComeFirstServed = meetingData.isFirstComeFirstServed ?? true;

                // 선착순 맨 뒤 = registeredAt 새로 + absent 흔적 제거(깨끗한 신청 문서로 재작성)
                const regData = {
                    meetingDate,
                    meetingId,
                    meetingType: isMatch ? 'match' : 'self',
                    memberId: memberData.memberId,
                    name: reg.name || memberData.name || '',
                    gender: reg.gender || memberData.gender || '',
                    level: reg.level || memberData.level || '',
                    registeredAt: FieldValue.serverTimestamp(),
                };
                const sessionData = {
                    memberId: memberData.memberId,
                    name: reg.name || memberData.name || '',
                    gender: reg.gender || memberData.gender || '',
                    level: reg.level || memberData.level || '',
                    date: meetingDate,
                    meetingId,
                    checkedIn: false,
                    checkInTime: null,
                    status: 'active',
                    isGuest: false,
                    team: null,
                    createdAt: new Date().toISOString(),
                };

                if (isMatch) {
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
                        resultStatus = 'confirmed';
                    } else {
                        tx.set(regRef, { ...regData, status: 'waiting', waitingNumber: waitingG + 1 });
                        tx.update(meetingRef, { waitingCount: FieldValue.increment(1), [waitField]: FieldValue.increment(1) });
                        tx.update(mirrorRef, { waitingCount: FieldValue.increment(1), [waitField]: FieldValue.increment(1) });
                        resultStatus = 'waiting';
                    }
                } else if (!isFirstComeFirstServed) {
                    tx.set(regRef, { ...regData, status: 'confirmed', waitingNumber: null });
                    tx.update(meetingRef, { confirmedCount: FieldValue.increment(1) });
                    tx.update(mirrorRef, { confirmedCount: FieldValue.increment(1) });
                    tx.set(sessionRef, sessionData);
                    resultStatus = 'confirmed';
                } else if (confirmedCount < maxLimit) {
                    tx.set(regRef, { ...regData, status: 'confirmed', waitingNumber: null });
                    tx.update(meetingRef, { confirmedCount: FieldValue.increment(1) });
                    tx.update(mirrorRef, { confirmedCount: FieldValue.increment(1) });
                    tx.set(sessionRef, sessionData);
                    resultStatus = 'confirmed';
                } else {
                    tx.set(regRef, { ...regData, status: 'waiting', waitingNumber: waitingCount + 1 });
                    tx.update(meetingRef, { waitingCount: FieldValue.increment(1) });
                    tx.update(mirrorRef, { waitingCount: FieldValue.increment(1) });
                    resultStatus = 'waiting';
                }

                // 담당자 본인이 불참/노쇼로 넘겼던 담당자 자리를, 취소하면서 이 사람으로 원상복구
                if (meetingData.managerAbsentId && meetingData.managerAbsentId === memberData.memberId) {
                    const revertName = reg.name || memberData.name || '';
                    tx.update(meetingRef, { managerId: memberData.memberId, managerName: revertName, managerAbsentId: FieldValue.delete() });
                    tx.update(mirrorRef, { managerId: memberData.memberId, managerName: revertName });
                    managerRestored = true;
                }
            });

            showToast && showToast(
                (resultStatus === 'waiting' ? '불참을 취소했어요. 정원이 차서 대기 맨 뒤로 신청됐어요.' : '불참을 취소했어요. 선착순 맨 뒤로 다시 신청됐어요.')
                + (managerRestored ? '\n담당자로 다시 지정됐어요.' : ''),
                'success'
            );
        } catch (e) {
            console.error('불참 취소 오류:', e);
            if (e.message === '불참 상태가 아닙니다') showAlert && showAlert('불참 취소 불가', '불참 상태가 아니에요.');
            else showAlert && showAlert('오류', '불참 취소 중 오류가 발생했어요. 다시 시도해주세요.');
        }
    };

    // 미참(declined) — 신청 안 한 사람이 "이번 모임 안 옴"을 미리 표시. 인원 카운트(confirmed/waiting)엔 영향 없음.
    // registrations 문서 status:'declined' + 모임/미러의 declinedCount만 증가(운영진 파악용).
    const handleDecline = async () => {
        if (!meetingDate || !memberData?.memberId) return;
        const regRef = getRegistrationsCol().doc(`${meetingId}_${memberData.memberId}`);
        const meetingRef = getMeetingsCol().doc(meetingId);
        const mirrorRef = getCol('settings').doc(mirrorDocId);
        try {
            await db.runTransaction(async (tx) => {
                const regDoc = await tx.get(regRef);
                if (regDoc.exists) throw new Error('이미 응답했습니다');   // 신청/미참 기록 있으면 막기
                tx.set(regRef, {
                    meetingDate, meetingId,
                    meetingType: mType === 'match' ? 'match' : 'self',
                    memberId: memberData.memberId,
                    name: memberData.name || '', gender: memberData.gender || '', level: memberData.level || '',
                    status: 'declined',
                    registeredAt: FieldValue.serverTimestamp(),
                });
                tx.set(meetingRef, { declinedCount: FieldValue.increment(1) }, { merge: true });
                tx.set(mirrorRef, { declinedCount: FieldValue.increment(1) }, { merge: true });
            });
            showToast && showToast('이번 모임 미참으로 표시했어요.', 'info');
        } catch (e) {
            if (e.message === '이미 응답했습니다') showAlert && showAlert('알림', '이미 신청 또는 미참한 모임이에요.');
            else { console.error('미참 오류:', e); showAlert && showAlert('오류', '처리 중 오류가 발생했어요. 다시 시도해주세요.'); }
        }
    };

    const handleUndoDecline = async () => {
        if (!meetingDate || !memberData?.memberId) return;
        const regRef = getRegistrationsCol().doc(`${meetingId}_${memberData.memberId}`);
        const meetingRef = getMeetingsCol().doc(meetingId);
        const mirrorRef = getCol('settings').doc(mirrorDocId);
        try {
            await db.runTransaction(async (tx) => {
                const regDoc = await tx.get(regRef);
                if (!regDoc.exists || regDoc.data().status !== 'declined') throw new Error('미참 상태가 아닙니다');
                tx.delete(regRef);
                tx.set(meetingRef, { declinedCount: FieldValue.increment(-1) }, { merge: true });
                tx.set(mirrorRef, { declinedCount: FieldValue.increment(-1) }, { merge: true });
            });
            showToast && showToast('미참을 되돌렸어요.', 'success');
        } catch (e) {
            if (e.message === '미참 상태가 아닙니다') showAlert && showAlert('알림', '미참 상태가 아니에요.');
            else { console.error('미참 취소 오류:', e); showAlert && showAlert('오류', '처리 중 오류가 발생했어요. 다시 시도해주세요.'); }
        }
    };

    return { handleRegister, handleCancel, handleAbsent, handleUndoAbsent, handleDecline, handleUndoDecline };
}
