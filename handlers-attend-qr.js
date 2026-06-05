const makeQRHandlers = ({ meetingTimes, setCurrentQRToken, setIsQRModalOpen, showAlert }) => ({
    generateQRCode: async () => {
        try {
            const token = Math.random().toString(36).substring(2,10).toUpperCase() + Date.now().toString(36).toUpperCase();
            const date = meetingTimes.date;
            const [sy,sm,sd] = date.split('-');
            const [startH,startM] = meetingTimes.start.split(':');
            const [endH,endM] = meetingTimes.end.split(':');
            const meetingStartTs = new Date(sy,sm-1,sd, parseInt(startH), parseInt(startM), 0);
            const validFrom = new Date(meetingStartTs.getTime() - 70*60*1000).toISOString();
            const validUntil = new Date(sy,sm-1,sd, parseInt(endH), parseInt(endM), 0).toISOString();
            await getQRCol().doc(date).set({ token, date, validFrom, validUntil, createdAt:new Date().toISOString(), usedBy:[] });
            setCurrentQRToken(token);
            setIsQRModalOpen(true);
        } catch(e) { showAlert('오류','QR 생성 실패: '+e.message); }
    }
});

const QRModal = ({ isOpen, meetingTimes, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center" onClick={e=>e.stopPropagation()}>
                <h2 className="text-xl font-black text-slate-800 mb-1">QR 출석 코드</h2>
                <p className="text-xs text-slate-400 mb-2">{meetingTimes.date} · {meetingTimes.start}~{meetingTimes.end}</p>
                <p className="text-[10px] text-teal-500 font-black mb-5">모임 시간 내에만 유효합니다</p>
                <div id="qr-canvas-area" className="flex justify-center mb-5"></div>
                <p className="text-xs text-slate-400 mb-4">회원에게 이 화면을 보여주세요.<br/>카메라로 스캔하면 출석됩니다.</p>
                <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">닫기</button>
            </div>
        </div>
    );
};
