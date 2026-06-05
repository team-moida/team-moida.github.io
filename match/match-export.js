async function captureMatchTable(meetingDate) {
    const el = document.getElementById('capture-area');
    if(!el) return;
    const canvas = await window.html2canvas(el, {scale:2, backgroundColor:'#f8fafc', useCORS:true, scrollY:0});
    const link = document.createElement('a');
    link.download = `모이다_매치표_${meetingDate}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}
