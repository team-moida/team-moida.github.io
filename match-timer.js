// ─── 경기 타이머 (워치 TimerService 이식) ──────────────────────────────────────
// 워치(D:\LSH\moida-watch)와 동일 규칙을 앱에 재현:
//  - 게임 시간 카운트다운(기본 12분) + 다음 교체까지(기본 3분) 동시 표시
//  - 시작 10초 여유 후 교체 타이머 흐름
//  - 알림 3종: 교체 10초전 예고(삐2+진동) / 교체(삐3+진동) / 게임종료(삐~길게+진동)
//  - 교체 임박(10초 이내)이면 시간 색이 주황으로 변함
// 상태는 모듈 단일 보관 → 매치판을 닫았다 다시 열어도 진행이 유지된다.
// ⚠️ iOS는 진동 API 미지원(소리만). 화면 꺼지면 백그라운드 throttle로 느려질 수 있어 화면 켜둔 채 사용 권장.
//    워치<->앱 실시간 연동은 다음 단계.

const MoidaTimer = (function () {
    const LEAD = 10; // 시작 10초 여유 (이 동안 교체 타이머 정지)

    // ── 오디오(호루라기 비슷한 삐) ─ 파일 없이 WebAudio로 즉석 생성 ──
    let audioCtx = null;
    function ensureAudio() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { audioCtx = null; }
        return audioCtx;
    }
    function beeps(count, durMs, freq) {
        const ctx = ensureAudio();
        if (!ctx) return;
        let t = ctx.currentTime + 0.02;
        const gap = 0.09;
        for (let i = 0; i < count; i++) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'square'; o.frequency.value = freq;
            o.connect(g); g.connect(ctx.destination);
            const start = t, end = start + durMs / 1000;
            g.gain.setValueAtTime(0.0001, start);
            g.gain.exponentialRampToValueAtTime(0.5, start + 0.012);
            g.gain.setValueAtTime(0.5, Math.max(start + 0.013, end - 0.03));
            g.gain.exponentialRampToValueAtTime(0.0001, end);
            o.start(start); o.stop(end + 0.02);
            t = end + gap;
        }
    }
    function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
    function alertPre() { beeps(2, 130, 2600); vibrate([0, 250, 150, 250]); }
    function alertSub() { beeps(3, 180, 2600); vibrate([0, 400, 150, 400, 150, 400]); }
    function alertEnd() { beeps(1, 800, 1750); vibrate([0, 800]); }

    // ── 모듈 단일 상태 ──
    const LS_GAME = 'moida_timer_gameMin', LS_SUB = 'moida_timer_subSec';
    const readInt = (k, d) => { const v = parseInt(localStorage.getItem(k), 10); return isNaN(v) ? d : v; };
    const store = {
        running: false, startedAt: 0, accumMs: 0,
        gameMin: Math.max(1, readInt(LS_GAME, 12)),
        subSec: Math.max(30, readInt(LS_SUB, 180)),
        lastSubMark: 0, lastPreMark: 0, roundEnded: false,
        intervalId: null, listeners: new Set(),
    };
    const gameSec = () => store.gameMin * 60;
    const elapsed = () => Math.floor((store.accumMs + (store.running ? (Date.now() - store.startedAt) : 0)) / 1000);
    const notify = () => store.listeners.forEach(fn => { try { fn(); } catch (e) {} });

    function processAlerts() {
        const el = elapsed();
        const gEnd = gameSec() + LEAD;
        const subEl = el - LEAD;
        if (store.subSec > 0 && subEl >= 0 && el < gEnd) {
            const nextMark = store.lastSubMark + 1;
            const nextAt = nextMark * store.subSec;
            if (store.subSec > 10 && nextMark > store.lastPreMark && subEl >= nextAt - 10 && subEl < nextAt) {
                alertPre(); store.lastPreMark = nextMark;
            }
            if (subEl >= nextAt) {
                alertSub(); store.lastSubMark = Math.floor(subEl / store.subSec);
                if (store.lastPreMark < store.lastSubMark) store.lastPreMark = store.lastSubMark;
            }
        }
        if (gameSec() > 0 && el >= gEnd && !store.roundEnded) { alertEnd(); store.roundEnded = true; }
    }
    function startLoop() {
        if (store.intervalId) return;
        store.intervalId = setInterval(() => { processAlerts(); notify(); }, 500);
    }
    function stopLoop() { if (store.intervalId) { clearInterval(store.intervalId); store.intervalId = null; } }

    function snapshot() {
        const el = elapsed();
        const gEnd = gameSec() + LEAD;
        const subEl = el - LEAD;
        const roundRemaining = Math.max(0, gEnd - el);
        const subRemaining = store.subSec <= 0 ? 0
            : el < LEAD ? store.subSec
            : el >= gEnd ? 0
            : store.subSec - (((subEl % store.subSec) + store.subSec) % store.subSec);
        const subImminent = store.subSec > 10 && subRemaining > 0 && subRemaining <= 10;
        const ended = store.gameMin > 0 && el >= gEnd;
        return { running: store.running, gameMin: store.gameMin, subSec: store.subSec, roundRemaining, subRemaining, subImminent, ended };
    }

    return {
        start() {
            ensureAudio(); // 사용자 동작 시점 → iOS 오디오 잠금 해제
            if (store.running) return;
            store.startedAt = Date.now(); store.running = true;
            startLoop(); notify();
        },
        pause() {
            if (store.running) { store.accumMs += Date.now() - store.startedAt; store.running = false; }
            stopLoop(); notify();
        },
        reset() {
            store.running = false; store.accumMs = 0;
            store.lastSubMark = 0; store.lastPreMark = 0; store.roundEnded = false;
            stopLoop(); notify();
        },
        setGameMin(v) {
            store.gameMin = Math.max(1, v);
            try { localStorage.setItem(LS_GAME, store.gameMin); } catch (e) {}
            if (elapsed() < gameSec() + LEAD) store.roundEnded = false; // 게임시간 늘리면 종료알림 다시
            notify();
        },
        setSubSec(v) {
            store.subSec = Math.max(30, v);
            try { localStorage.setItem(LS_SUB, store.subSec); } catch (e) {}
            const el = elapsed(), subEl = el - LEAD; // 변경 직후 즉시 알림 안 터지게 현재 경과 기준 재설정
            store.lastSubMark = (store.subSec > 0 && subEl > 0) ? Math.floor(subEl / store.subSec) : 0;
            store.lastPreMark = store.lastSubMark;
            notify();
        },
        subscribe(fn) { store.listeners.add(fn); return () => store.listeners.delete(fn); },
        snapshot,
    };
})();

// 구독형 훅 — 진행 중엔 0.5초마다 notify로 자동 갱신
function useMatchTimer() {
    const [, force] = React.useState(0);
    React.useEffect(() => MoidaTimer.subscribe(() => force(n => (n + 1) % 1e9)), []);
    return MoidaTimer.snapshot();
}

const _mtFmt = (s) => { s = s < 0 ? 0 : s; return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const _mtBtn = { width: 'clamp(40px,7vmin,54px)', height: 'clamp(40px,7vmin,54px)', borderRadius: '14px', border: 'none', fontWeight: 900, fontSize: 'clamp(15px,3vmin,22px)', flexShrink: 0 };

// 설정 드롭다운 (게임 시간 ±1분 / 교체 시간 ±30초)
function MatchTimerSettings({ t, onClose }) {
    const adjBtn = { width: 'clamp(36px,6vmin,48px)', height: 'clamp(34px,5.5vmin,46px)', borderRadius: '12px', border: 'none', background: '#e2e8f0', color: '#334155', fontWeight: 900, fontSize: 'clamp(13px,2.4vmin,18px)' };
    const Row = ({ label, value, onMinus, onPlus, color }) => (
        <div style={{ marginBottom: '10px' }}>
            <p style={{ color: '#94a3b8', fontWeight: 900, fontSize: 'clamp(10px,1.8vmin,13px)', marginBottom: '5px' }}>{label}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={onMinus} style={adjBtn}>−</button>
                <span style={{ flex: 1, textAlign: 'center', color: color || '#0f172a', fontWeight: 900, fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(16px,3vmin,22px)' }}>{value}</span>
                <button onClick={onPlus} style={adjBtn}>＋</button>
            </div>
        </div>
    );
    return (
        <div style={{ position: 'absolute', top: '100%', right: '12px', marginTop: '6px', zIndex: 20, background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', padding: '14px', width: 'min(86vw,300px)' }}>
            <Row label="게임 시간" value={`${t.gameMin}분`} color="#0f172a"
                onMinus={() => MoidaTimer.setGameMin(t.gameMin - 1)} onPlus={() => MoidaTimer.setGameMin(t.gameMin + 1)} />
            <Row label="교체 시간" value={_mtFmt(t.subSec)} color="#0d9488"
                onMinus={() => MoidaTimer.setSubSec(t.subSec - 30)} onPlus={() => MoidaTimer.setSubSec(t.subSec + 30)} />
            <button onClick={onClose} style={{ width: '100%', marginTop: '4px', height: '38px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 900, fontSize: '13px' }}>닫기</button>
        </div>
    );
}

// 매치판 크게 보기 상단에 들어가는 컴팩트 타이머 바
function MatchTimerBar() {
    const t = useMatchTimer();
    const [setOpen, setSetOpen] = React.useState(false);
    const timeColor = t.ended ? '#10b981' : (t.subImminent ? '#f59e0b' : '#0f172a');
    return (
        <div style={{ position: 'relative', background: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0, padding: 'clamp(6px,1.2vmin,12px) 16px', display: 'flex', alignItems: 'center', gap: 'clamp(8px,2vmin,18px)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
                <span style={{ color: timeColor, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(1.6rem,5.5vmin,3rem)' }}>{_mtFmt(t.roundRemaining)}</span>
                <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: 'clamp(0.58rem,1.5vmin,0.85rem)' }}>남은 시간</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span style={{ color: t.subImminent ? '#f59e0b' : '#475569', fontWeight: 900, fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(1rem,3.2vmin,1.7rem)' }}>{_mtFmt(t.subRemaining)}</span>
                <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: 'clamp(0.58rem,1.5vmin,0.85rem)' }}>교체까지</span>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => t.running ? MoidaTimer.pause() : MoidaTimer.start()} style={{ ..._mtBtn, background: t.running ? '#f59e0b' : '#10b981', color: 'white' }}>{t.running ? '⏸' : '▶'}</button>
            <button onClick={() => MoidaTimer.reset()} style={{ ..._mtBtn, background: '#e2e8f0', color: '#475569' }}>↻</button>
            <button onClick={() => setSetOpen(v => !v)} style={{ ..._mtBtn, background: '#f1f5f9', color: '#64748b' }}>⚙</button>
            {setOpen && <MatchTimerSettings t={t} onClose={() => setSetOpen(false)} />}
        </div>
    );
}
