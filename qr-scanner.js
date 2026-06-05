// ─── 인앱 QR 스캐너 모달 ──────────────────────────────────────────────────────
const QRScannerModal = ({ isOpen, onScan, onClose }) => {
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const streamRef = React.useRef(null);
    const rafRef = React.useRef(null);
    const [camError, setCamError] = React.useState('');

    React.useEffect(() => {
        if (!isOpen) return;
        setCamError('');
        let active = true;

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        }).then(stream => {
            if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream;
            const video = videoRef.current;
            if (!video) return;
            video.srcObject = stream;
            video.play().then(() => {
                const scan = () => {
                    if (!active || !videoRef.current || !canvasRef.current) return;
                    const v = videoRef.current;
                    if (v.readyState === v.HAVE_ENOUGH_DATA) {
                        const c = canvasRef.current;
                        c.width = v.videoWidth; c.height = v.videoHeight;
                        const ctx = c.getContext('2d');
                        ctx.drawImage(v, 0, 0);
                        const img = ctx.getImageData(0, 0, c.width, c.height);
                        try {
                            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
                            if (code?.data) { onScan(code.data); return; }
                        } catch(_) {}
                    }
                    rafRef.current = requestAnimationFrame(scan);
                };
                rafRef.current = requestAnimationFrame(scan);
            }).catch(() => setCamError('카메라를 시작할 수 없습니다.'));
        }).catch(err => {
            if (!active) return;
            setCamError(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
                ? '카메라 권한을 허용해주세요.\n설정 › 브라우저 › 카메라'
                : '카메라를 사용할 수 없습니다.');
        });

        return () => {
            active = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#000', display:'flex', flexDirection:'column' }}>
            {camError ? (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, textAlign:'center' }}>
                    <p style={{ fontSize:52, marginBottom:16 }}>📷</p>
                    <p style={{ color:'#f87171', fontWeight:900, fontSize:15, marginBottom:8, whiteSpace:'pre-line' }}>{camError}</p>
                    <button onClick={onClose} style={{ marginTop:24, padding:'12px 32px', background:'#334155', color:'white', border:'none', borderRadius:20, fontWeight:900, fontSize:14 }}>닫기</button>
                </div>
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline muted
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                    <canvas ref={canvasRef} style={{ display:'none' }} />

                    {/* 반투명 오버레이 */}
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                        {/* 스캔 가이드 박스 */}
                        <div style={{ position:'relative', width:240, height:240 }}>
                            {/* 네 모서리 */}
                            {[{top:0,left:0,borderTop:'3px solid #ec4899',borderLeft:'3px solid #ec4899',borderRadius:'6px 0 0 0'},
                              {top:0,right:0,borderTop:'3px solid #ec4899',borderRight:'3px solid #ec4899',borderRadius:'0 6px 0 0'},
                              {bottom:0,left:0,borderBottom:'3px solid #ec4899',borderLeft:'3px solid #ec4899',borderRadius:'0 0 0 6px'},
                              {bottom:0,right:0,borderBottom:'3px solid #ec4899',borderRight:'3px solid #ec4899',borderRadius:'0 0 6px 0'}
                            ].map((s,i) => <div key={i} style={{ position:'absolute', width:30, height:30, ...s }} />)}
                            {/* 스캔 라인 */}
                            <div className="qr-scan-line" style={{ position:'absolute', left:6, right:6, height:2, background:'linear-gradient(90deg,transparent,#ec4899,transparent)', borderRadius:1 }} />
                        </div>
                        <p style={{ color:'white', fontWeight:900, fontSize:14, marginTop:20, textShadow:'0 1px 4px rgba(0,0,0,0.9)' }}>
                            QR코드를 네모 안에 맞춰주세요
                        </p>
                    </div>

                    {/* 닫기 버튼 */}
                    <button onClick={onClose} style={{ position:'absolute', top:20, left:16, zIndex:10, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.2)', color:'white', padding:'8px 18px', borderRadius:20, fontWeight:900, fontSize:13, backdropFilter:'blur(8px)' }}>
                        ← 닫기
                    </button>
                </>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────
