// ── QR/GPS 출석 핸들러 ────────────────────────────────────────────────────────
function makeQRGPSHandlers(ctx) {
    const {
        memberData, testMode, meetingSettings, mySession, urlParams,
        setQrMessage, setQrStatus, setTab, setIsQRScannerOpen,
        setGpsStatus, setDistance, setIsCheckingIn, showToast
    } = ctx;

    const processQRToken = async (token, date) => {
        if (!token || !date) return;
        if (!memberData?.memberId) { setQrMessage('로그인 후 이용 가능합니다.'); setQrStatus('error'); return; }
        setQrStatus('processing');
        setTab('attend');
        try {
            const tokenDoc = await getQRCol().doc(date).get();
            if (!tokenDoc.exists) { setQrMessage('유효하지 않은 QR코드입니다.'); setQrStatus('error'); return; }
            const tokenData = tokenDoc.data();
            if (tokenData.token !== token) { setQrMessage('QR 코드가 일치하지 않습니다.'); setQrStatus('error'); return; }

            const now = new Date();
            if (!testMode) {
                if (now < new Date(tokenData.validFrom)) { setQrMessage(`아직 출석 시간이 아닙니다.\n출석 가능: ${new Date(tokenData.validFrom).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})}`); setQrStatus('error'); return; }
                if (now > new Date(tokenData.validUntil)) { setQrMessage('QR 코드 유효 시간이 지났습니다.'); setQrStatus('error'); return; }
            }

            const usedBy = tokenData.usedBy || [];
            if (usedBy.includes(memberData.memberId)) { setQrMessage('이미 QR 출석이 완료되었습니다.'); setQrStatus('success'); return; }

            const sessionSnap = await getSessionCol().where('memberId', '==', memberData.memberId).where('date', '==', date).get();
            if (sessionSnap.empty) { setQrMessage('오늘 선정 명단에 없습니다.\n관리자에게 문의하세요.'); setQrStatus('error'); return; }

            const sessionDoc = sessionSnap.docs[0];
            if (sessionDoc.data().checkedIn) { setQrMessage('이미 출석 처리되었습니다.'); setQrStatus('success'); return; }

            const [sy, sm, sd] = date.split('-');
            const settingsDoc = await getSettingsCol().doc('meeting_schedule_v2').get();
            const startStr = settingsDoc.exists ? (settingsDoc.data().start || '08:00') : '08:00';
            const [shr, smin] = startStr.split(':');
            const meetingStart = new Date(sy, sm - 1, sd, parseInt(shr), parseInt(smin), 0);
            const normalThreshold = new Date(meetingStart.getTime() - 9 * 60 * 1000);
            const status = now <= normalThreshold ? '정상' : '지각';
            const timeStr = now.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});

            const batch = db.batch();
            batch.update(getSessionCol().doc(sessionDoc.id), {checkedIn: true, checkInTime: timeStr, status});
            batch.update(getQRCol().doc(date), {usedBy: firebase.firestore.FieldValue.arrayUnion(memberData.memberId)});
            await batch.commit();

            setQrMessage(`출석 완료! (${status})\n${timeStr}`);
            setQrStatus('success');
        } catch(e) {
            console.error(e);
            setQrMessage('오류가 발생했습니다: ' + e.message);
            setQrStatus('error');
        }
    };

    const handleQRAttendance = async () => {
        if (!urlParams.token || !urlParams.date) return;
        await processQRToken(urlParams.token, urlParams.date);
        window.history.replaceState({}, '', window.location.pathname);
    };

    const handleInAppQRScan = (scannedUrl) => {
        setIsQRScannerOpen(false);
        try {
            const url = new URL(scannedUrl);
            const token = url.searchParams.get('token');
            const date = url.searchParams.get('date');
            if (!token || !date) { setQrMessage('올바른 모이다 QR코드가 아닙니다.'); setQrStatus('error'); setTab('attend'); return; }
            processQRToken(token, date);
        } catch(_) {
            setQrMessage('QR코드를 읽을 수 없습니다.'); setQrStatus('error'); setTab('attend');
        }
    };

    const handleGPSCheckIn = async () => {
        if (!memberData?.memberId) return;
        setGpsStatus('checking');
        if (!navigator.geolocation) { setGpsStatus('error'); showToast('이 기기는 GPS를 지원하지 않습니다.', 'error'); return; }
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const {latitude, longitude} = pos.coords;
            const locationLat = meetingSettings?.locationLat;
            const locationLng = meetingSettings?.locationLng;
            if (!locationLat || !locationLng) { setGpsStatus('no_location'); showToast('관리자가 모임 장소를 아직 설정하지 않았습니다.', 'error'); return; }
            const dist = calcDistance(latitude, longitude, locationLat, locationLng);
            setDistance(Math.round(dist));
            const radius = meetingSettings?.locationRadius || 100;
            if (testMode || dist <= radius) { setGpsStatus('within'); } else { setGpsStatus('outside'); }
        }, (err) => {
            setGpsStatus('error');
            const msg = err.code === 1 ? '위치 권한을 허용해주세요.' : err.code === 2 ? 'GPS 신호를 찾을 수 없습니다.' : '위치 확인 시간이 초과되었습니다.';
            showToast(msg, 'error');
        }, {timeout: 10000, maximumAge: 0, enableHighAccuracy: true});
    };

    const handleGPSAttend = async () => {
        if (!mySession) return showToast('오늘 선정 명단에 없습니다. 관리자에게 문의하세요.', 'error');
        if (mySession.checkedIn) return showToast('이미 출석 처리되었습니다.', 'info');
        setIsCheckingIn(true);
        try {
            const now = new Date();
            const [sy, sm, sd] = meetingSettings.date.split('-');
            const [shr, smin] = meetingSettings.start.split(':');
            const [ehr, emin] = (meetingSettings.end || '10:00').split(':');
            const meetingStart = new Date(sy, sm - 1, sd, parseInt(shr), parseInt(smin), 0);
            const meetingEnd = new Date(sy, sm - 1, sd, parseInt(ehr), parseInt(emin), 0);
            const allowFrom = new Date(meetingStart.getTime() - 70 * 60 * 1000);
            if (!testMode && now < allowFrom) { showToast('아직 출석 가능 시간이 아닙니다.', 'error'); setIsCheckingIn(false); return; }
            if (!testMode && now > meetingEnd) { showToast('모임이 종료되었습니다.\n자동 노쇼 처리되었습니다.', 'error'); setIsCheckingIn(false); return; }
            const normalThreshold = new Date(meetingStart.getTime() - 9 * 60 * 1000);
            const status = now <= normalThreshold ? '정상' : '지각';
            const timeStr = now.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
            await getSessionCol().doc(mySession.id).update({checkedIn: true, checkInTime: timeStr, status});
            showToast(`출석 완료! ${status} (${timeStr})`, 'success');
        } catch(e) { showToast('출석 실패: ' + e.message, 'error'); }
        finally { setIsCheckingIn(false); }
    };

    return { processQRToken, handleQRAttendance, handleInAppQRScan, handleGPSCheckIn, handleGPSAttend };
}

// ── 출석 관리 핸들러 (관리자) ─────────────────────────────────────────────────
function makeAttendHandlers(ctx) {
    const {
        meetingSettings, testMode, showAlert, showConfirm, setAttendModal,
        tmSessionData, activeMembers, selectedHistoryDetail, setSelectedHistoryDetail,
        setMeetingSettings, historyEditTarget, setHistoryEditTarget, editHistoryLocationValue,
        setIsEditingHistoryLocation, attendIsPending, setAttendIsPending,
        setIsAttendGuestModalOpen, setAttendNewGuest, attendNewGuest,
        attendEditingGuestId, setAttendEditingGuestId, attendGuestTarget, setAttendGuestTarget,
        setCurrentQRToken, setIsQRGenModalOpen, testModeBackup, setTestModeBackup,
        meetings
    } = ctx;
    const ms = (v) => v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : (typeof v === 'string' ? (Date.parse(v) || 0) : 0));

    const updateMeetingSettingsAdmin = async (newData) => {
        try { await getSettingsCol().doc('meeting_schedule_v2').set(newData); }
        catch(e) { showAlert('오류', '설정 저장 실패'); }
    };

    const attendHandleCheckIn = async (participant) => {
        if (participant.date !== meetingSettings?.date) return showAlert('오류', '날짜 불일치\n새로고침 후 다시 시도해주세요.');
        const now = new Date();
        const [sy, sm, sd] = participant.date.split('-');
        const [shr, smin] = (meetingSettings?.start || '08:00').split(':');
        const [ehr, emin] = (meetingSettings?.end || '10:00').split(':');
        const meetingStart = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd), parseInt(shr), parseInt(smin), 0);
        const meetingEnd = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd), parseInt(ehr), parseInt(emin), 0);
        const allowFrom = new Date(meetingStart.getTime() - 70 * 60 * 1000);
        if (!testMode && now < allowFrom) return showAlert('출석 불가', `출석 가능: ${allowFrom.toLocaleTimeString('ko-KR', {hour12: false, hour: '2-digit', minute: '2-digit'})}부터`);
        if (!testMode && now > meetingEnd) return showAlert('출석 불가', '모임이 종료되었습니다.');
        const normalThreshold = new Date(meetingStart.getTime() - 9 * 60 * 1000);
        const finalStatus = now <= normalThreshold ? '정상' : '지각';
        const timeStr = now.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
        try {
            await getSessionCol().doc(participant.id).update({checkedIn: true, checkInTime: timeStr, status: finalStatus});
            setAttendModal({type: 'checkin', data: {...participant, checkedIn: true, checkInTime: timeStr, status: finalStatus}});
        } catch(e) { showAlert('오류', '출석 실패'); }
    };

    const attendHandleUncheckIn = async (participant) => {
        showConfirm('출석 취소', `${participant.name}의 출석을 취소하시겠습니까?`, async () => {
            try { await getSessionCol().doc(participant.id).update({checkedIn: false, checkInTime: null, status: '미출석'}); setAttendModal({type: null, data: null}); }
            catch(e) { showAlert('오류', '출석 취소 실패'); }
        });
    };

    const attendToggleParticipant = async (member, meetingOverride) => {
        const _m = meetingOverride || meetingSettings;
        const _date = _m?.date;
        const _mid = getMeetingId(_m);
        const existing = tmSessionData.find(p => {
            if (p.memberId !== member.id || p.date !== _date) return false;
            return p.meetingId ? p.meetingId === _mid : !_mid.endsWith('__match');
        });
        if (existing) { await getSessionCol().doc(existing.id).delete(); }
        else { await getSessionCol().add({memberId: member.id, name: member.name, gender: member.gender, level: member.level, date: _date, meetingId: _mid, checkedIn: false, checkInTime: null, status: '미출석', isGuest: false, team: '', createdAt: new Date().toISOString()}); }
    };

    const attendToggleParticipantAsGuest = async (member, meetingOverride) => {
        const _m = meetingOverride || meetingSettings;
        const _date = _m?.date;
        const _mid = getMeetingId(_m);
        const existing = tmSessionData.find(p => {
            if (p.memberId !== member.id || p.date !== _date) return false;
            return p.meetingId ? p.meetingId === _mid : !_mid.endsWith('__match');
        });
        if (existing) { await getSessionCol().doc(existing.id).delete(); }
        else { await getSessionCol().add({memberId: member.id, name: member.name, gender: member.gender, level: member.level, date: _date, meetingId: _mid, checkedIn: false, checkInTime: null, status: '미출석', isGuest: true, team: '', createdAt: new Date().toISOString()}); }
    };

    const attendHandleResetSelection = (meetingOverride) => {
        const _m = meetingOverride || meetingSettings;
        const _date = _m?.date;
        const _mid = getMeetingId(_m);
        const targets = tmSessionData.filter(p => {
            if (p.date !== _date) return false;
            return p.meetingId ? p.meetingId === _mid : !_mid.endsWith('__match');
        });
        if (targets.length === 0) return showAlert('알림', '초기화할 명단이 없습니다.');
        showConfirm('명단 초기화', '이번 모임 선정 인원을 전체 해제하시겠습니까?', async () => {
            setAttendIsPending(true);
            try { const batch = db.batch(); targets.forEach(p => batch.delete(getSessionCol().doc(p.id))); await batch.commit(); }
            catch(e) { showAlert('오류', '초기화 실패'); } finally { setAttendIsPending(false); }
        });
    };

    const attendHandleAddGuest = async () => {
        if (!attendNewGuest.name.trim()) return showAlert('알림', '게스트 이름을 입력해주세요.');
        if (attendIsPending) return;
        setAttendIsPending(true);
        const inviter = activeMembers.find(m => m.id === attendNewGuest.inviterId);
        try {
            if (attendEditingGuestId) {
                await getSessionCol().doc(attendEditingGuestId).update({
                    name: attendNewGuest.name, gender: attendNewGuest.gender, level: attendNewGuest.level,
                    inviterId: attendNewGuest.inviterId || '', inviterName: inviter?.name || '없음'
                });
            } else {
                const _gm = attendGuestTarget || meetingSettings;
                await getSessionCol().add({memberId: 'guest_' + Date.now(), name: attendNewGuest.name, inviterName: inviter?.name || '없음', inviterId: attendNewGuest.inviterId || '', gender: attendNewGuest.gender, level: attendNewGuest.level, date: _gm?.date, meetingId: getMeetingId(_gm), checkedIn: false, checkInTime: null, status: '미출석', isGuest: true, createdAt: new Date().toISOString()});
            }
            setIsAttendGuestModalOpen(false);
            setAttendEditingGuestId(null);
            setAttendGuestTarget(null);
            setAttendNewGuest({name: '', gender: '남성', inviterId: '', level: '1'});
        } catch(e) { showAlert('오류', attendEditingGuestId ? '게스트 수정 실패' : '게스트 등록 실패'); } finally { setAttendIsPending(false); }
    };

    const attendOpenAddGuest = (meeting) => {
        setAttendGuestTarget(meeting || null);
        setAttendEditingGuestId(null);
        setAttendNewGuest({name: '', gender: '남성', inviterId: '', level: '1'});
        setIsAttendGuestModalOpen(true);
    };

    const attendOpenEditGuest = (p) => {
        setAttendGuestTarget(null);
        setAttendEditingGuestId(p.id);
        setAttendNewGuest({name: p.name || '', gender: p.gender || '남성', inviterId: p.inviterId || '', level: String(p.level || '1')});
        setIsAttendGuestModalOpen(true);
    };

    const attendDeleteParticipant = (p) => {
        showConfirm('명단에서 삭제', `${p.name}님을 명단에서 삭제할까요?`, async () => {
            try { await getSessionCol().doc(p.id).delete(); } catch(e) { showAlert('오류', '삭제 실패'); }
        });
    };

    const attendHandleTestSelect = async () => {
        if (!meetingSettings) return;
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        await updateMeetingSettingsAdmin({...meetingSettings, date: todayStr});
        const _testMid = getMeetingId({...meetingSettings, date: todayStr});
        const toAdd = activeMembers.filter(m => !m.isResigned && !tmSessionData.some(p => p.memberId === m.id && p.date === todayStr));
        await Promise.all(toAdd.map(m => getSessionCol().add({memberId: m.id, name: m.name, gender: m.gender, level: m.level, date: todayStr, meetingId: _testMid, checkedIn: false, checkInTime: null, status: '미출석', isGuest: false, team: '', createdAt: new Date().toISOString()})));
        showAlert('테스트 선정 완료', `오늘(${todayStr}) 기준 ${toAdd.length}명 선정됨`);
    };

    const attendHandleDeleteHistory = () => {
        if (!selectedHistoryDetail) return;
        showConfirm('기록 삭제', '이 기록을 영구 삭제하시겠습니까?', async () => {
            try { await getHistoryCol().doc(selectedHistoryDetail.id).delete(); setSelectedHistoryDetail(null); }
            catch(e) { showAlert('오류', '삭제 실패'); }
        });
    };

    const handleHistoryStatusUpdate = async (newStatus) => {
        if (!historyEditTarget || !selectedHistoryDetail) return;
        const {docId, recordIndex} = historyEditTarget;
        try {
            const updatedRecords = [...selectedHistoryDetail.records];
            updatedRecords[recordIndex] = {...updatedRecords[recordIndex], status: newStatus};
            await getHistoryCol().doc(docId).update({records: updatedRecords});
            setSelectedHistoryDetail(prev => ({...prev, records: updatedRecords}));
            setHistoryEditTarget(null);
        } catch(e) { showAlert('오류', '수정 실패'); }
    };

    const handleUpdateHistoryLocation = async () => {
        if (!selectedHistoryDetail) return;
        try {
            await getHistoryCol().doc(selectedHistoryDetail.id).update({location: editHistoryLocationValue});
            setSelectedHistoryDetail(prev => ({...prev, location: editHistoryLocationValue}));
            setIsEditingHistoryLocation(false);
        } catch(e) { showAlert('오류', '장소명 수정 실패'); }
    };

    // meetingArg를 넘기면 그 모임으로 QR 생성 (홈/모임 카드에서 호출). 없으면 현재 모임.
    // onClick 이벤트가 인자로 들어와도 안전하도록 .date 유무로 판별.
    const generateAttendQRCode = async (meetingArg) => {
        const ms = (meetingArg && meetingArg.date) ? meetingArg : meetingSettings;
        if (!ms?.date) return;
        try {
            const token = Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).toUpperCase();
            const [sy, sm, sd] = ms.date.split('-');
            const [startH, startM] = (ms.start || '08:00').split(':');
            const [endH, endM] = (ms.end || '10:00').split(':');
            const meetingStartTs = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd), parseInt(startH), parseInt(startM), 0);
            const validFrom = new Date(meetingStartTs.getTime() - 70 * 60 * 1000).toISOString();
            const validUntil = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd), parseInt(endH), parseInt(endM), 0).toISOString();
            await getQRCol().doc(ms.date).set({token, date: ms.date, validFrom, validUntil, createdAt: new Date().toISOString(), usedBy: []});
            setCurrentQRToken(token);
            setIsQRGenModalOpen(true);
        } catch(e) { showAlert('오류', 'QR 생성 실패: ' + e.message); }
    };

    const attendToggleTestMode = async () => {
        const n = !testMode;
        if (n) {
            const d = new Date();
            const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!meetingSettings?.testMode) {
                setTestModeBackup({...meetingSettings});
                localStorage.setItem('moida_testmode_backup', JSON.stringify({...meetingSettings}));
                await getSettingsCol().doc('test_backup').set({originalSettings: {...meetingSettings}, createdAt: new Date().toISOString()});
            }
            const startTime = new Date(d.getTime() + 12 * 60 * 1000);
            const endTime = new Date(startTime.getTime() + 5 * 60 * 1000);
            const h = String(startTime.getHours()).padStart(2, '0'), m = String(startTime.getMinutes()).padStart(2, '0');
            const endH = String(endTime.getHours()).padStart(2, '0'), endM = String(endTime.getMinutes()).padStart(2, '0');
            let testLat = meetingSettings?.locationLat || null, testLng = meetingSettings?.locationLng || null, testLocation = meetingSettings?.location || '';
            let gpsMsg = '';
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {enableHighAccuracy: true, timeout: 8000}));
                    testLat = pos.coords.latitude; testLng = pos.coords.longitude; testLocation = '📍 테스트 현재위치';
                    gpsMsg = `\nGPS: 현재위치 자동 설정됨`;
                } catch(e) { gpsMsg = '\nGPS: 위치 취득 실패 — 기존 장소 유지'; }
            }
            const updatedTimes = {...meetingSettings, date: todayStr, start: `${h}:${m}`, end: `${endH}:${endM}`, location: testLocation, locationLat: testLat, locationLng: testLng, testMode: true};
            await getSettingsCol().doc('meeting_schedule_v2').update({...updatedTimes});
            setTimeout(async () => {
                try {
                    const activeMemberList = activeMembers.filter(m => !m.isResigned);
                    const sessionSnap = await getSessionCol().where('date', '==', todayStr).get();
                    const existingIds = new Set(sessionSnap.docs.map(d => d.data().memberId));
                    const toAdd = activeMemberList.filter(m => !existingIds.has(m.id));
                    if (toAdd.length > 0) await Promise.all(toAdd.map(m => getSessionCol().add({memberId: m.id, name: m.name, gender: m.gender, level: m.level, date: todayStr, checkedIn: false, checkInTime: null, status: '미출석', isGuest: false, team: '', createdAt: new Date().toISOString()})));
                    showAlert('테스트 모드 활성화', `${toAdd.length}명 자동 선정됨\n\n시작: ${h}:${m} (12분 후)\n종료: ${endH}:${endM}\n3분 이내 체크인 → 정상\n3분 이후 → 지각${gpsMsg}`);
                } catch(e) { showAlert('알림', '인원 자동 선정 실패'); }
            }, 500);
        } else {
            showConfirm('테스트 모드 종료', '테스트 데이터를 삭제하고 복원하시겠습니까?', async () => {
                try {
                    const testDate = meetingSettings?.date;
                    let originalSettings = testModeBackup;
                    if (!originalSettings) { try { const lsRaw = localStorage.getItem('moida_testmode_backup'); if (lsRaw) originalSettings = JSON.parse(lsRaw); } catch(e) {} }
                    if (!originalSettings) { const backupDoc = await getSettingsCol().doc('test_backup').get(); if (backupDoc.exists) originalSettings = backupDoc.data().originalSettings; }
                    localStorage.removeItem('moida_testmode_backup');
                    const sessionSnap = await getSessionCol().where('date', '==', testDate).get();
                    const batch = db.batch();
                    sessionSnap.docs.forEach(d => batch.delete(getSessionCol().doc(d.id)));
                    batch.delete(getQRCol().doc(testDate));
                    batch.delete(getSettingsCol().doc('test_backup'));
                    const restoredSettings = originalSettings ? {...originalSettings, testMode: false} : {...meetingSettings, testMode: false, start: '08:00', end: '10:00', date: getNextSundayFromDate(testDate), managerId: '', managerName: ''};
                    batch.set(getSettingsCol().doc('meeting_schedule_v2'), restoredSettings);
                    await batch.commit();
                    setMeetingSettings(restoredSettings);
                    setTestModeBackup(null);
                    showAlert('테스트 모드 종료', originalSettings ? '복원되었습니다.' : '기본값으로 복원됩니다. 시간을 확인해 주세요.');
                } catch(e) { showAlert('오류', '복원 실패: ' + e.message); }
            });
        }
    };

    const attendHandleEndMeeting = async () => {
        const _endMid = getMeetingId(meetingSettings);
        const _endMType = meetingSettings?.meetingType || 'self';
        const current = tmSessionData.filter(p => {
            if (p.date !== meetingSettings?.date) return false;
            return p.meetingId ? p.meetingId === _endMid : !_endMid.endsWith('__match');
        });
        if (current.length === 0) return showAlert('확인', '현재 출석부에 인원이 없습니다.');
        showConfirm('모임 종료', `${meetingSettings.date} 모임 기록을 저장하시겠습니까?`, async () => {
            setAttendIsPending(true);
            try {
                const existingHist = await getHistoryCol().where('date', '==', meetingSettings.date).get();
                if (!existingHist.empty) { showAlert('알림', '이미 저장된 기록이 있습니다.'); return; }
                const limit = meetingSettings?.maxLimit || 18;
                const sorted = [...current].sort((a, b) => ms(a.createdAt) - ms(b.createdAt) || a.name.localeCompare(b.name));
                const records = sorted.map((p, idx) => {
                    const isWaiting = idx + 1 > limit;
                    const finalStatus = isWaiting ? '대기' : p.checkedIn ? (p.status || '정상') : '노쇼';
                    return {name: p.isGuest ? `${p.name} - 초대:${p.inviterName || '없음'}` : p.name, gender: p.gender, status: finalStatus, checkInTime: p.checkedIn ? (p.checkInTime || '-') : '미출석', type: isWaiting ? '대기자' : (p.isGuest ? '게스트' : '정규'), level: p.level || '-', team: p.team || '-', timestamp: p.checkedIn ? p.checkInTime : '99:99:99', reason: p.noShowReason || ''};
                });
                const presentCount = records.filter(r => r.status === '정상' || r.status === '지각').length;
                await getHistoryCol().add({date: meetingSettings.date, meetingTime: `${meetingSettings.start}~${meetingSettings.end}`, location: meetingSettings.location || '장소 미지정', locationLat: meetingSettings.locationLat || null, locationLng: meetingSettings.locationLng || null, managerName: meetingSettings.managerName || '미지정', total: records.length, present: presentCount, records, createdAt: new Date().toISOString()});

                // 현재 모임 done 처리 (meetingId 기준)
                try { await getMeetingsCol().doc(_endMid).update({ status: 'done' }); } catch(_) {}

                // 종료된 모임 참가자 명단 삭제
                try {
                    const delBatch = db.batch();
                    current.forEach(p => delBatch.delete(getSessionCol().doc(p.id)));
                    await delBatch.commit();
                } catch(_) {}

                // 다음 모임 탐색 (같은 종류, status !== 'done', 현재 날짜 이후, 가장 가까운 것)
                const nextMeeting = [...(meetings || [])]
                    .filter(m => m.status !== 'done' && m.date > meetingSettings.date && (m.meetingType || 'self') === _endMType)
                    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;

                const _endMirrorId = _endMType === 'match' ? 'meeting_schedule_match' : 'meeting_schedule_v2';

                if (nextMeeting) {
                    try {
                        await getSettingsCol().doc(_endMirrorId).set({
                            date: nextMeeting.date,
                            start: nextMeeting.start || '08:00',
                            end: nextMeeting.end || '10:00',
                            location: nextMeeting.location || '',
                            locationLat: nextMeeting.locationLat || null,
                            locationLng: nextMeeting.locationLng || null,
                            locationRadius: nextMeeting.locationRadius || 100,
                            maxLimit: nextMeeting.maxLimit || 18,
                            managerId: nextMeeting.managerId || '',
                            managerName: nextMeeting.managerName || '',
                            meetingType: _endMType,
                            testMode: false
                        });
                        setMeetingSettings({ ...nextMeeting, testMode: false });
                        showAlert('모임 종료', `기록이 저장되었습니다.\n출석 ${presentCount}명 / 전체 ${records.length}명\n\n다음 모임 (${nextMeeting.date})으로 전환되었습니다.`);
                    } catch(e) {
                        showAlert('모임 종료', `기록이 저장되었습니다.\n출석 ${presentCount}명 / 전체 ${records.length}명\n\n다음 모임 전환 실패: ${e.message}`);
                    }
                } else {
                    showAlert('모임 종료', `기록이 저장되었습니다.\n출석 ${presentCount}명 / 전체 ${records.length}명\n\n등록된 다음 모임이 없습니다.\n[모임] 탭에서 새 모임을 추가해주세요.`);
                }
            } catch(e) { showAlert('오류', '저장 실패: ' + e.message); } finally { setAttendIsPending(false); }
        });
    };

    return {
        updateMeetingSettingsAdmin, attendHandleCheckIn, attendHandleUncheckIn,
        attendToggleParticipant, attendToggleParticipantAsGuest, attendHandleResetSelection,
        attendHandleAddGuest, attendHandleTestSelect,
        attendOpenAddGuest, attendOpenEditGuest, attendDeleteParticipant,
        attendHandleDeleteHistory, handleHistoryStatusUpdate, handleUpdateHistoryLocation,
        generateAttendQRCode, attendToggleTestMode, attendHandleEndMeeting
    };
}
