function makeRosterHandlers(ctx) {
    const {
        newMemberForm, setNewMemberForm, setIsAddModalOpen,
        editingMember, setEditingMember,
        resigningMember, setResigningMember, resignForm,
        deletingMember, setDeletingMember,
        billingMember, setBillingMember, targetMonth,
        monthlyReasons, paymentDateInput, specialRestReason,
        manualEndDate, tempRestCount,
        setActionStep, setSelectedAction, setPaymentDateInput,
        setSpecialRestReason, setTempRestCount, setManualEndDate,
        setTargetMonth, setFilterCategory,
        showAlert, showConfirm
    } = ctx;

    const moveMonth = (offset) => {
        const [y, m] = targetMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + offset, 1);
        setTargetMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        setFilterCategory('all');
    };

    const handleAddMember = async () => {
        if (!newMemberForm.name.trim()) return showAlert('알림', '이름을 입력해주세요.');
        try {
            await getMemberCol().add({...newMemberForm, birth: String(newMemberForm.birth).replace(/[^0-9]/g, ''), createdAt: new Date().toISOString()});
            setNewMemberForm({name: '', birth: '', gender: '남성', position: 'all', level: '4', role: '회원', coupleId: '', joinDate: '', address: '', phone: '', duesStartMonth: thisMonthStr(), isFastYear: false});
            setIsAddModalOpen(false);
            showAlert('성공', '회원이 등록되었습니다.');
        } catch(e) { showAlert('오류', '등록 실패'); }
    };

    const handleUpdateMember = async () => {
        try {
            await getMemberCol().doc(editingMember.id).update({...editingMember, birth: String(editingMember.birth || '').replace(/[^0-9]/g, '')});
            setEditingMember(null);
            showAlert('완료', '정보가 수정되었습니다.');
        } catch(e) { showAlert('오류', '수정 실패'); }
    };

    const handleResignConfirm = async () => {
        if (!resignForm.date) return showAlert('알림', '탈퇴 일자를 선택해주세요.');
        try {
            await getMemberCol().doc(resigningMember.id).update({isResigned: true, resignDate: resignForm.date, resignReason: resignForm.reason || '사유 미작성', isForcedResign: resignForm.isForced});
            setResigningMember(null);
            showAlert('성공', `${resigningMember.name}님이 탈퇴 처리되었습니다.`);
        } catch(e) { showAlert('오류', '탈퇴 처리 실패'); }
    };

    const handleRestoreResigned = (m) => {
        showConfirm('탈퇴 철회', `${m.name}님을 활성 회원으로 복구하시겠습니까?`, async () => {
            try {
                await getMemberCol().doc(m.id).update({
                    isResigned: firebase.firestore.FieldValue.delete(),
                    resignDate: firebase.firestore.FieldValue.delete(),
                    resignReason: firebase.firestore.FieldValue.delete(),
                    isForcedResign: firebase.firestore.FieldValue.delete(),
                });
                showAlert('완료', `${m.name}님이 활성 회원으로 복구되었습니다.`);
            } catch(e) { showAlert('오류', '복구 실패'); }
        });
    };

    const handleDeleteMember = async () => {
        if (!deletingMember) return;
        try {
            await getMemberCol().doc(deletingMember.id).delete();
            setDeletingMember(null);
            showAlert('완료', `${deletingMember.name}님의 회원 정보가 삭제되었습니다.`);
        } catch(e) { showAlert('오류', '삭제 실패'); }
    };

    const handleBillingMemberClick = (m) => {
        setBillingMember(m);
        setActionStep('main');
        setSelectedAction(null);
        const today = new Date();
        setPaymentDateInput(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
        setSpecialRestReason(monthlyReasons[m.id] || '');
        setTempRestCount(m.totalRestMonths || 0);
        setManualEndDate(m.membershipEndDate || '');
    };

    const processAction = async (actionType) => {
        if (!billingMember || !targetMonth) return;
        const nm = billingMember.name || '회원';
        const confirmMap = {
            monthly_paid:        ['월납 납부 처리', `${nm}님을 이번 달 '월납 납부'로 처리할까요?`],
            start_half:          ['반년납 시작', `${nm}님을 반년납으로 전환할까요?`],
            start_full:          ['1년납 시작', `${nm}님을 1년납으로 전환할까요?`],
            rest:                ['휴식 처리', `${nm}님을 이번 달 '휴식'으로 처리할까요?`],
            cancel_rest:         ['휴식 취소', `${nm}님의 이번 달 휴식을 취소할까요?`],
            special_rest:        ['특별휴식', `${nm}님을 특별휴식으로 처리할까요?`],
            cancel_special_rest: ['특별휴식 해제', `${nm}님의 특별휴식을 해제할까요?`],
            clear:               ['상태 초기화', `${nm}님의 이번 달 회비 상태를 초기화할까요? 납부·휴식 기록이 지워집니다.`],
        };
        const run = async () => {
        try {
            const batch = db.batch();
            const monthRef = getMonthlyCol().doc(targetMonth);
            const memberRef = getMemberCol().doc(billingMember.id);
            const mid = billingMember.id;
            if (actionType === 'monthly_paid') {
                batch.set(monthRef, {statuses: {[mid]: 'paid'}, paymentDates: {[mid]: paymentDateInput}, updatedAt: new Date().toISOString()}, {merge: true});
                batch.update(monthRef, {[`reasons.${mid}`]: firebase.firestore.FieldValue.delete()});
                batch.update(memberRef, {membershipType: 'monthly', membershipStartDate: '', membershipEndDate: '', totalRestMonths: 0});
            } else if (actionType === 'start_half') {
                const finalEnd = manualEndDate || calculateEndDate(targetMonth, 6);
                batch.update(memberRef, {membershipType: 'half_year', membershipStartDate: `${targetMonth}-01`, membershipEndDate: finalEnd, totalRestMonths: 0});
                batch.set(monthRef, {paymentDates: {[mid]: paymentDateInput}, updatedAt: new Date().toISOString()}, {merge: true});
                batch.update(monthRef, {[`statuses.${mid}`]: firebase.firestore.FieldValue.delete(), [`reasons.${mid}`]: firebase.firestore.FieldValue.delete()});
            } else if (actionType === 'start_full') {
                const finalEnd = manualEndDate || calculateEndDate(targetMonth, 12);
                batch.update(memberRef, {membershipType: 'full_year', membershipStartDate: `${targetMonth}-01`, membershipEndDate: finalEnd, totalRestMonths: 0});
                batch.set(monthRef, {paymentDates: {[mid]: paymentDateInput}, updatedAt: new Date().toISOString()}, {merge: true});
                batch.update(monthRef, {[`statuses.${mid}`]: firebase.firestore.FieldValue.delete(), [`reasons.${mid}`]: firebase.firestore.FieldValue.delete()});
            } else if (actionType === 'rest') {
                const isLong = billingMember.membershipType === 'half_year' || billingMember.membershipType === 'full_year';
                if (billingMember.membershipType === 'half_year' && (billingMember.totalRestMonths || 0) >= 3) return showAlert('알림', '반년납 최대 3회 휴식');
                if (billingMember.membershipType === 'full_year' && (billingMember.totalRestMonths || 0) >= 6) return showAlert('알림', '1년납 최대 6회 휴식');
                batch.set(monthRef, {statuses: {[mid]: 'rest'}, updatedAt: new Date().toISOString()}, {merge: true});
                if (isLong) {
                    batch.update(memberRef, {membershipEndDate: extendEndDate(billingMember.membershipEndDate, 1), totalRestMonths: firebase.firestore.FieldValue.increment(1)});
                    batch.update(monthRef, {[`reasons.${mid}`]: firebase.firestore.FieldValue.delete(), [`paymentDates.${mid}`]: firebase.firestore.FieldValue.delete()});
                } else {
                    batch.set(monthRef, {paymentDates: {[mid]: paymentDateInput}, updatedAt: new Date().toISOString()}, {merge: true});
                    batch.update(monthRef, {[`reasons.${mid}`]: firebase.firestore.FieldValue.delete()});
                }
            } else if (actionType === 'cancel_rest') {
                batch.update(monthRef, {[`statuses.${mid}`]: firebase.firestore.FieldValue.delete(), [`reasons.${mid}`]: firebase.firestore.FieldValue.delete(), [`paymentDates.${mid}`]: firebase.firestore.FieldValue.delete()});
                if (billingMember.membershipType === 'half_year' || billingMember.membershipType === 'full_year') {
                    batch.update(memberRef, {membershipEndDate: extendEndDate(billingMember.membershipEndDate, -1), totalRestMonths: firebase.firestore.FieldValue.increment(-1)});
                }
            } else if (actionType === 'special_rest') {
                batch.update(memberRef, {isSpecialRest: true, specialRestReason: specialRestReason || '특별 휴식', specialRestStartMonth: targetMonth});
                batch.update(monthRef, {[`statuses.${mid}`]: firebase.firestore.FieldValue.delete(), [`reasons.${mid}`]: firebase.firestore.FieldValue.delete(), [`paymentDates.${mid}`]: firebase.firestore.FieldValue.delete()});
            } else if (actionType === 'cancel_special_rest') {
                const sm = billingMember.specialRestStartMonth;
                let ext = 0;
                if (sm) { const [sy, smm] = sm.split('-').map(Number); const [ty, tm] = targetMonth.split('-').map(Number); ext = (ty - sy) * 12 + (tm - smm); }
                const upd = {isSpecialRest: false, specialRestReason: firebase.firestore.FieldValue.delete(), specialRestStartMonth: firebase.firestore.FieldValue.delete()};
                if (ext > 0 && (billingMember.membershipType === 'half_year' || billingMember.membershipType === 'full_year')) upd.membershipEndDate = extendEndDate(billingMember.membershipEndDate, ext);
                batch.update(memberRef, upd);
            } else if (actionType === 'end_membership') {
                batch.update(memberRef, {membershipType: 'monthly', membershipStartDate: '', membershipEndDate: '', totalRestMonths: 0});
                batch.update(monthRef, {[`statuses.${mid}`]: firebase.firestore.FieldValue.delete(), [`reasons.${mid}`]: firebase.firestore.FieldValue.delete()});
            } else if (actionType === 'clear') {
                batch.update(monthRef, {[`statuses.${mid}`]: firebase.firestore.FieldValue.delete(), [`reasons.${mid}`]: firebase.firestore.FieldValue.delete(), [`paymentDates.${mid}`]: firebase.firestore.FieldValue.delete()});
            } else if (actionType === 'update_longterm_info') {
                batch.update(memberRef, {membershipEndDate: manualEndDate, totalRestMonths: tempRestCount});
                batch.set(monthRef, {paymentDates: {[mid]: paymentDateInput}, updatedAt: new Date().toISOString()}, {merge: true});
            }
            await batch.commit();
            // 회원이 올린 납부 신고가 있으면 '확정'으로 마감 (없으면 무시)
            if (['monthly_paid','start_half','start_full','rest'].includes(actionType)) {
                try { await getCol('dues_reports').doc(`${targetMonth}_${mid}`).update({ status:'confirmed', confirmedAt:new Date().toISOString() }); } catch(_) {}
            }
            setBillingMember(null);
            showAlert('성공', '상태가 반영되었습니다.');
        } catch(e) { console.error(e); showAlert('오류', '처리 실패'); }
        };
        const conf = confirmMap[actionType];
        if (conf) showConfirm(conf[0], conf[1], run); else run();
    };

    const confirmDuesReport = async (report) => {
        if (!report || !report.memberId || !report.month) return;
        try {
            const mid = report.memberId, month = report.month;
            const FV = firebase.firestore.FieldValue;
            const monthRef = getMonthlyCol().doc(month);
            const memberRef = getMemberCol().doc(mid);
            const memSnap = await memberRef.get();
            const mem = memSnap.exists ? memSnap.data() : {};
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const batch = db.batch();
            if (report.payType === 'half_year' || report.payType === 'full_year') {
                const months = report.payType === 'half_year' ? 6 : 12;
                batch.update(memberRef, { membershipType: report.payType, membershipStartDate: `${month}-01`, membershipEndDate: calculateEndDate(month, months), totalRestMonths: 0 });
                batch.set(monthRef, { paymentDates: {[mid]: today}, updatedAt: new Date().toISOString() }, { merge: true });
                batch.update(monthRef, { [`statuses.${mid}`]: FV.delete(), [`reasons.${mid}`]: FV.delete() });
            } else if (report.payType === 'rest') {
                // 휴식 확정. 반년/1년납이면 만료일 1개월 연장 + 누적(이월) → 갱신 시점이 그만큼 뒤로 밀림.
                // (회원별 [휴식] 버튼 처리와 동일하게 맞춤. 최대 휴식 횟수 초과 시엔 연장 안 함)
                batch.set(monthRef, { statuses: {[mid]: 'rest'}, paymentDates: {[mid]: today}, updatedAt: new Date().toISOString() }, { merge: true });
                const isLong = mem.membershipType === 'half_year' || mem.membershipType === 'full_year';
                const maxRest = mem.membershipType === 'full_year' ? 6 : 3;
                if (isLong && mem.membershipEndDate && (mem.totalRestMonths || 0) < maxRest) {
                    batch.update(memberRef, { membershipEndDate: extendEndDate(mem.membershipEndDate, 1), totalRestMonths: FV.increment(1) });
                }
            } else {
                batch.set(monthRef, { statuses: {[mid]: 'paid'}, paymentDates: {[mid]: today}, updatedAt: new Date().toISOString() }, { merge: true });
            }
            batch.set(getCol('dues_reports').doc(`${month}_${mid}`), { status: 'confirmed', confirmedAt: new Date().toISOString() }, { merge: true });
            await batch.commit();
            // 확정 푸시: notifications 문서 추가 → 서버(sendPushNotification)가 그 회원에게 전송.
            // type:'dues'+pushOnly → 공지 게시판엔 안 뜨고 푸시만 감.
            try {
                await getCol('notifications').add({
                    title: '회비 납부가 확정되었어요 ✅',
                    body: `${month} 회비 납부가 확정되었습니다. 감사합니다!`,
                    targetMemberIds: [mid], type: 'dues', pushOnly: true,
                    sentAt: new Date().toISOString(),
                });
            } catch(pe) { console.warn('확정 알림 전송 실패:', pe); }
            showAlert('완료', `${report.memberName || '회원'}님 회비가 확정되었습니다.`);
        } catch(e) { console.error(e); showAlert('오류', '확정 실패'); }
    };
    const rejectDuesReport = (report) => {
        if (!report || !report.memberId || !report.month) return;
        showConfirm('신고 삭제', `${report.memberName || '회원'}님의 납부 신고를 삭제할까요?`, async () => {
            try { await getCol('dues_reports').doc(`${report.month}_${report.memberId}`).delete(); }
            catch(e) { showAlert('오류', '삭제 실패'); }
        });
    };

    return { moveMonth, handleAddMember, handleUpdateMember, handleResignConfirm, handleRestoreResigned, handleDeleteMember, handleBillingMemberClick, processAction, confirmDuesReport, rejectDuesReport };
}
