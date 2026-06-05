function makeRosterHandlers(ctx) {
    const {
        newMemberForm, setNewMemberForm, setIsAddModalOpen,
        editingMember, setEditingMember,
        resigningMember, setResigningMember, resignForm,
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
            setNewMemberForm({name: '', birth: '', gender: '남성', position: 'all', level: '4', role: '회원', coupleId: '', joinDate: '', address: '', phone: ''});
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
            setBillingMember(null);
            showAlert('성공', '상태가 반영되었습니다.');
        } catch(e) { console.error(e); showAlert('오류', '처리 실패'); }
    };

    return { moveMonth, handleAddMember, handleUpdateMember, handleResignConfirm, handleBillingMemberClick, processAction };
}
