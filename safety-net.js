/* 모이다 안전망 (공통)
   화면이 끝내 안 뜨거나, 사용 중 어떤 오류로 화면이 통째로 깨지면
   하얀 화면 대신 "화면을 불러오지 못했어요 + 새로고침"을 표시한다.
   - 정상 렌더되면(또는 늦게라도 복구되면) 안내는 자동으로 사라진다 → 느린 기기 오작동 방지
   - 어느 페이지든 동일하게 동작 (root 비어있을 때만 표시)
   - 일반 <script>로 즉시 로드되므로 Babel 변환 실패와 무관하게 항상 떠 있다 */
(function(){
    var lastErr = '';
    function rendered(){ var r = document.getElementById('root'); return !!(r && r.children.length > 0); }
    var scheduled = false;
    function scheduleCheck(){
        if (scheduled) return;
        scheduled = true;
        setTimeout(function(){ scheduled = false; check(); }, 700);
    }
    function cap(m){ if (m) { lastErr = String(m).slice(0, 300); scheduleCheck(); } }
    window.addEventListener('error', function(e){ cap(e && (e.message || (e.error && e.error.message))); }, true);
    window.addEventListener('unhandledrejection', function(e){ cap(e && e.reason && (e.reason.message || e.reason)); });
    function check(){
        if (rendered() || document.getElementById('moida-fallback')) return;
        var d = document.createElement('div');
        d.id = 'moida-fallback';
        d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;color:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;padding:24px;font-family:sans-serif';
        d.innerHTML = '<div style="font-size:42px">⚠️</div>'
            + '<div style="font-weight:900;font-size:18px">화면을 불러오지 못했어요</div>'
            + '<div style="font-size:13px;color:#64748b;max-width:340px;word-break:break-all">' + (lastErr || '네트워크 또는 호환성 문제') + '</div>'
            + '<button onclick="location.reload()" style="margin-top:6px;padding:14px 28px;border:none;border-radius:14px;background:#0d9488;color:#fff;font-weight:900;font-size:15px">새로고침</button>';
        document.body.appendChild(d);
        var iv = setInterval(function(){
            if (rendered()) { var f = document.getElementById('moida-fallback'); if (f) f.remove(); clearInterval(iv); }
        }, 1000);
        setTimeout(function(){ clearInterval(iv); }, 30000);
    }
    window.addEventListener('load', function(){ setTimeout(check, 10000); });
})();
