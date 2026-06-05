async function captureTeams(meetingDate, setIsCapturing, showAlert) {
    setIsCapturing(true);
    await new Promise(r => setTimeout(r, 200));
    try {
        const el = document.getElementById('teams-capture-area');
        if (!el) return;
        const canvas = await window.html2canvas(el, {scale: 2, backgroundColor: '#f8fafc', useCORS: true});
        const link = document.createElement('a');
        link.download = `모이다_팀편성_${meetingDate}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();
    } catch(e) { showAlert('오류', '캡쳐 실패'); }
    finally { setIsCapturing(false); }
}
