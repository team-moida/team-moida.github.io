function makeAttendSessionHandlers(ctx) {
    const {
        testMode, meetingTimes, members, activeMembers, sessionData,
        testModeBackup, newGuest, isPending, passwordForm, loggedInManager,
        selectedHistoryDetail, historyEditTarget, editLocationValue, editManagerValue,
        setMeetingTimes, setTestMode, setTestModeBackup, setSessionData,
        setIsLocationPickerOpen, setNewGuest, setIsPending, setIsGuestModalOpen,
        setIsPasswordChangeModalOpen, setPasswordForm, setLoggedInManager,
        setSelectedHistoryDetail, setHistoryEditTarget, setIsEditingLocation,
        setIsEditingManager,
        showAlert, showConfirm
    } = ctx;
    const ms = (v) => v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : (typeof v === 'string' ? (Date.parse(v) || 0) : 0));

    const updateMeetingTimeSettings = async (newData) => {
        const prev = meetingTimes;
        setMeetingTimes(newData);
        try {
            await getSettingsCol().doc('meeting_schedule_v2').set(newData);
        } catch(e) {
            console.error('설정 저장 실패:', e);
            setMeetingTimes(prev);
            showAlert('오류', '설정 저장에 실패했습니다.\n네트워크를 확인해주세요.');
        }
    };

    const handleTestSelect = async () => {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        await updateMeetingTimeSettings({...meetingTimes, date: todayStr});
        const toAdd = activeMembers.filter(m => !m.isResigned && !sessionData.some(p => p.memberId === m.id && p.date === todayStr));
        await Promise.all(toAdd.map(m => getSessionCol().add({
            memberId:m.id, name:m.name, gender:m.gender, level:m.level,
            date:todayStr, checkedIn:false, checkInTime:null, status:'미출석',
            isGuest:false, team:'', createdAt:new Date().toISOString()
        })));
        showAlert('테스트 선정 완료', `오늘(${todayStr}) 기준 ${toAdd.length}명 선정됨`);
    };

    const toggleParticipant = async (member) => {
        const existing = sessionData.find(p => p.memberId === member.id && p.date === meetingTimes.date);
        if (existing) { await getSessionCol().doc(existing.id).delete(); }
        else {
            await getSessionCol().add({
                memberId:member.id, name:member.name, gender:member.gender, level:member.level,
                date:meetingTimes.date, checkedIn:false, checkInTime:null, status:'미출석',
                isGuest:false, team:'', createdAt:new Date().toISOString()
            });
        }
    };

    const toggleParticipantAsGuest = async (member) => {
        const existing = sessionData.find(p => p.memberId === member.id && p.date === meetingTimes.date);
        if (existing) { await getSessionCol().doc(existing.id).delete(); }
        else {
            await getSessionCol().add({
                memberId:member.id, name:member.name, gender:member.gender, level:member.level,
                date:meetingTimes.date, checkedIn:false, checkInTime:null, status:'미출석',
                isGuest:true, team:'', createdAt:new Date().toISOString()
            });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('moida_member_data');
        location.href = 'index.html';
    };

    const toggleTestMode = async () => {
        const n = !testMode;
        if (n) {
            const d = new Date();
            const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

            if (!meetingTimes.testMode) {
                setTestModeBackup({ meetingTimes: {...meetingTimes} });
                localStorage.setItem('moida_testmode_backup', JSON.stringify({...meetingTimes}));
                await getSettingsCol().doc('test_backup').set({
                    originalSettings: {...meetingTimes},
                    createdAt: new Date().toISOString()
                });
            } else {
                const existingBackup = await getSettingsCol().doc('test_backup').get();
                if (existingBackup.exists) {
                    const orig = existingBackup.data().originalSettings;
                    setTestModeBackup({ meetingTimes: orig });
                    localStorage.setItem('moida_testmode_backup', JSON.stringify(orig));
                }
            }

            const startTime = new Date(d.getTime() + 12*60*1000);
            const endTime = new Date(startTime.getTime() + 5*60*1000);
            const h = String(startTime.getHours()).padStart(2,'0');
            const m = String(startTime.getMinutes()).padStart(2,'0');
            const endH = String(endTime.getHours()).padStart(2,'0');
            const endM = String(endTime.getMinutes()).padStart(2,'0');

            let testLat = meetingTimes.locationLat || null;
            let testLng = meetingTimes.locationLng || null;
            let testLocation = meetingTimes.location || '';
            let gpsMsg = '';
            let gpsOk = false;
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) =>
                        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
                    );
                    testLat = pos.coords.latitude;
                    testLng = pos.coords.longitude;
                    testLocation = '📍 테스트 현재위치';
                    gpsMsg = `\nGPS: 현재위치 자동 설정됨 (${testLat.toFixed(5)}, ${testLng.toFixed(5)})`;
                    gpsOk = true;
                } catch(e) {
                    gpsMsg = '\nGPS: 위치 취득 실패 — 기존 장소 유지';
                }
            } else {
                gpsMsg = '\nGPS: 미지원 브라우저 — 기존 장소 유지';
            }

            const updatedTimes = {...meetingTimes, date: todayStr, start: `${h}:${m}`, end: `${endH}:${endM}`,
                location: testLocation, locationLat: testLat, locationLng: testLng, testMode: true};
            setMeetingTimes(updatedTimes);
            await getSettingsCol().doc('meeting_schedule_v2').update({...updatedTimes});
            setTestMode(true);
            if (gpsOk) setIsLocationPickerOpen(true);

            setTimeout(async () => {
                try {
                    const activeMemberList = members.filter(m => !m.isResigned);
                    const sessionSnap = await getSessionCol().where('date', '==', todayStr).get();
                    const existingIds = new Set(sessionSnap.docs.map(d => d.data().memberId));
                    const toAdd = activeMemberList.filter(m => !existingIds.has(m.id));
                    if (toAdd.length > 0) {
                        await Promise.all(toAdd.map(m => getSessionCol().add({
                            memberId:m.id, name:m.name, gender:m.gender, level:m.level,
                            date:todayStr, checkedIn:false, checkInTime:null, status:'미출석',
                            isGuest:false, team:'', createdAt:new Date().toISOString()
                        })));
                    }
                    showAlert('테스트 모드 활성화', `${toAdd.length}명 자동 선정됨\n\n모임 시작: ${h}:${m} (지금부터 12분 후)\n모임 종료: ${endH}:${endM}\n\n지금부터 3분 이내 체크인 → 정상 ✓\n3분 이후 또는 [지각 전환] → 지각 ⚠️\n[노쇼 전환] → 미출석자 노쇼 처리 ✗${gpsMsg}`);
                } catch(e) {
                    console.error('테스트 인원 선정 실패:', e);
                    showAlert('알림', '인원 자동 선정 실패');
                }
            }, 500);
        } else {
            showConfirm('테스트 모드 종료', '테스트 데이터를 삭제하고 복원하시겠습니까?', async () => {
                try {
                    const testDate = meetingTimes.date;

                    let originalSettings = testModeBackup?.meetingTimes || null;
                    if (!originalSettings) {
                        try {
                            const lsRaw = localStorage.getItem('moida_testmode_backup');
                            if (lsRaw) originalSettings = JSON.parse(lsRaw);
                        } catch(e) {}
                    }
                    if (!originalSettings) {
                        const backupDoc = await getSettingsCol().doc('test_backup').get();
                        if (backupDoc.exists) originalSettings = backupDoc.data().originalSettings;
                    }
                    localStorage.removeItem('moida_testmode_backup');

                    const sessionSnap = await getSessionCol().where('date', '==', testDate).get();
                    const batch = db.batch();
                    sessionSnap.docs.forEach(d => batch.delete(getSessionCol().doc(d.id)));
                    batch.delete(getQRCol().doc(testDate));
                    batch.delete(getSettingsCol().doc('test_backup'));
                    const restoredSettings = originalSettings
                        ? {...originalSettings, testMode: false}
                        : {...meetingTimes, testMode: false, start:'08:00', end:'10:00', date: getNextSundayFromDate(testDate), managerId:'', managerName:''};
                    batch.set(getSettingsCol().doc('meeting_schedule_v2'), restoredSettings);

                    await batch.commit();

                    setSessionData(prev => prev.filter(p => p.date !== testDate));
                    setMeetingTimes(restoredSettings);
                    setTestModeBackup(null);
                    setTestMode(false);
                    const restoreMsg = originalSettings
                        ? '테스트 데이터가 모두 삭제되고 복원되었습니다.'
                        : '테스트 데이터가 삭제되었습니다.\n원본 설정을 찾지 못해 08:00~10:00 기본값으로 복원됩니다.\n선정 탭에서 시간을 확인해 주세요.';
                    showAlert('테스트 모드 종료', restoreMsg);
                } catch(e) {
                    console.error(e);
                    showAlert('오류', '데이터 복원 실패: ' + e.message);
                }
            });
        }
    };

    const handlePasswordChange = async () => {
        const { current, next, confirm } = passwordForm;
        const defaultPw = loggedInManager.birth ? loggedInManager.birth.substring(2,8) : '000000';
        if (current !== (loggedInManager.password || defaultPw)) return showAlert('오류','현재 비밀번호가 틀립니다.');
        if (next.length < 4) return showAlert('알림','비밀번호는 4자리 이상이어야 합니다.');
        if (next !== confirm) return showAlert('오류','새 비밀번호가 일치하지 않습니다.');
        try {
            await getMemberCol().doc(loggedInManager.memberId).update({ password:next });
            const updated = {...loggedInManager, password:next};
            localStorage.setItem('moida_member_data', JSON.stringify(updated));
            setLoggedInManager(updated);
            setIsPasswordChangeModalOpen(false);
            setPasswordForm({current:'',next:'',confirm:''});
            showAlert('성공','비밀번호가 변경되었습니다.');
        } catch(e) { showAlert('오류','변경 실패'); }
    };

    const handleResetSelection = () => {
        const targets = sessionData.filter(p => p.date === meetingTimes.date);
        if (targets.length === 0) return showAlert('알림','초기화할 명단이 없습니다.');
        showConfirm('명단 초기화','이번 모임 선정 인원을 전체 해제하시겠습니까?', async () => {
            setIsPending(true);
            try {
                const batch = db.batch();
                targets.forEach(p => batch.delete(getSessionCol().doc(p.id)));
                await batch.commit();
                showAlert('성공','선정 명단이 초기화되었습니다.');
            } catch(e) { showAlert('오류','초기화 실패'); } finally { setIsPending(false); }
        });
    };

    const handleAddGuest = async () => {
        if (!newGuest.name.trim()) return showAlert('알림','게스트 이름을 입력해주세요.');
        if (isPending) return;
        setIsPending(true);
        const inviter = members.find(m => m.id === newGuest.inviterId);
        try {
            await getSessionCol().add({
                memberId:'guest_'+Date.now(), name:newGuest.name, inviterName:inviter?.name||'없음',
                inviterId:newGuest.inviterId||'', gender:newGuest.gender, level:newGuest.level,
                date:meetingTimes.date, checkedIn:false, checkInTime:null, status:'미출석',
                isGuest:true, createdAt:new Date().toISOString()
            });
            setIsGuestModalOpen(false);
            setNewGuest({name:'',gender:'남성',inviterId:'',level:'1'});
            showAlert('성공','게스트가 추가되었습니다.');
        } catch(e) { showAlert('오류','게스트 등록 실패'); }
        finally { setIsPending(false); }
    };

    const saveAndResetCurrent = async () => {
        const current = sessionData.filter(p => p.date === meetingTimes.date);
        if (current.length === 0) return showAlert('확인','현재 출석부에 인원이 없습니다.');
        showConfirm('기록 확정','기록을 저장하고 다음 주로 날짜를 넘기시겠습니까?', async () => {
            setIsPending(true);
            try {
                const limit = meetingTimes.maxLimit || 18;
                const sorted = [...current].sort((a,b)=>ms(a.createdAt)-ms(b.createdAt)||a.name.localeCompare(b.name));
                const records = sorted.map((p,idx) => {
                    const isWaiting = idx+1 > limit;
                    let finalStatus = isWaiting ? '대기' : p.checkedIn ? (p.status||'정상') : '노쇼';
                    return {
                        name: p.isGuest ? `${p.name} - 초대:${p.inviterName}` : p.name,
                        gender:p.gender, status:finalStatus,
                        checkInTime: p.checkedIn ? (p.checkInTime||'-') : '미출석',
                        type: isWaiting ? '대기자' : (p.isGuest ? '게스트' : '정규'),
                        level:p.level||'-', team:p.team||'-',
                        timestamp: p.checkedIn ? p.checkInTime : '99:99:99'
                    };
                });
                const presentCount = records.filter(r=>r.status==='정상'||r.status==='지각').length;
                await getHistoryCol().add({
                    date:meetingTimes.date, meetingTime:`${meetingTimes.start} ~ ${meetingTimes.end}`,
                    location:meetingTimes.location||'장소 미지정',
                    locationLat: meetingTimes.locationLat || null,
                    locationLng: meetingTimes.locationLng || null,
                    managerName:meetingTimes.managerName||'미지정',
                    total:records.length, present:presentCount, records, createdAt:new Date().toISOString()
                });
                const batch = db.batch();
                current.forEach(p => batch.delete(getSessionCol().doc(p.id)));
                const nextSun = getNextSundayFromDate(meetingTimes.date);
                const nextSettings = {...meetingTimes, date:nextSun, managerId:'', managerName:''};
                batch.set(getSettingsCol().doc('meeting_schedule_v2'), nextSettings);
                await batch.commit();
                setMeetingTimes(nextSettings);
                showAlert('기록 완료',`저장되었습니다.\n다음 모임: ${nextSun}`);
            } catch(e) { showAlert('오류','저장 실패'); } finally { setIsPending(false); }
        });
    };

    const handleDeleteHistory = () => {
        if (!selectedHistoryDetail) return;
        showConfirm('기록 삭제','이 기록을 영구 삭제하시겠습니까?', async () => {
            try {
                await getHistoryCol().doc(selectedHistoryDetail.id).delete();
                setSelectedHistoryDetail(null);
                showAlert('삭제 완료','기록이 삭제되었습니다.');
            } catch(e) { showAlert('오류','삭제 실패'); }
        });
    };

    const handleHistoryStatusUpdate = async (newStatus) => {
        if (!historyEditTarget || !selectedHistoryDetail) return;
        const { docId, recordIndex } = historyEditTarget;
        try {
            const updatedRecords = [...selectedHistoryDetail.records];
            updatedRecords[recordIndex] = {...updatedRecords[recordIndex], status:newStatus};
            await getHistoryCol().doc(docId).update({ records:updatedRecords });
            setSelectedHistoryDetail(prev => ({...prev, records:updatedRecords}));
            setHistoryEditTarget(null);
            showAlert('수정 완료','출석 상태가 변경되었습니다.');
        } catch(e) { showAlert('오류','수정 실패'); }
    };

    const handleUpdateLocation = async () => {
        if (!selectedHistoryDetail) return;
        try {
            await getHistoryCol().doc(selectedHistoryDetail.id).update({ location:editLocationValue });
            setSelectedHistoryDetail(prev => ({...prev, location:editLocationValue}));
            setIsEditingLocation(false);
            showAlert('수정 완료','장소명이 변경되었습니다.');
        } catch(e) { showAlert('오류','장소명 수정 실패'); }
    };

    const handleUpdateManager = async () => {
        if (!selectedHistoryDetail) return;
        try {
            await getHistoryCol().doc(selectedHistoryDetail.id).update({ managerName:editManagerValue });
            setSelectedHistoryDetail(prev => ({...prev, managerName:editManagerValue}));
            setIsEditingManager(false);
            showAlert('수정 완료','관리자가 변경되었습니다.');
        } catch(e) { showAlert('오류','수정 실패'); }
    };

    return {
        updateMeetingTimeSettings,
        handleTestSelect,
        toggleParticipant,
        toggleParticipantAsGuest,
        handleLogout,
        toggleTestMode,
        handlePasswordChange,
        handleResetSelection,
        handleAddGuest,
        saveAndResetCurrent,
        handleDeleteHistory,
        handleHistoryStatusUpdate,
        handleUpdateLocation,
        handleUpdateManager,
    };
}
