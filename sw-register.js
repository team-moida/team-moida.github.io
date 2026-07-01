// ── 서비스워커 등록 + 새 버전 자동 반영 (모든 페이지 공용) ──────────────────────────
// 배포로 sw.js의 CACHE_NAME이 바뀌면, 앱이 스스로 감지해 최신 버전으로 새로고침한다.
// 동작: 앱을 다시 보거나(탭 전환·앱 재실행) 창이 포커스될 때마다 업데이트를 확인(reg.update()) →
//       새 서비스워커가 활성화되며 제어권을 넘겨받으면(controllerchange) 딱 한 번 새로고침.
// → 사용자가 캐시를 직접 지우지 않아도 다음번에 앱을 볼 때 자동으로 최신으로 교체된다.
(function () {
    if (!('serviceWorker' in navigator)) return;

    // 새 서비스워커가 제어권을 넘겨받으면(=새 버전 배포됨) 한 번만 새로고침.
    // 최초 방문(아직 제어 중인 SW가 없음)에는 반응하지 않는다 → 첫 등록 시 불필요한 새로고침 방지.
    if (navigator.serviceWorker.controller) {
        var reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (reloading) return;
            reloading = true;
            window.location.reload();
        });
    }

    function start() {
        navigator.serviceWorker.register('sw.js').then(function (reg) {
            // 앱을 다시 보거나 창이 포커스될 때 새 버전 확인 (활성 사용 중엔 강제로 새로고침하지 않음)
            var check = function () {
                if (document.visibilityState === 'visible') {
                    try { reg.update(); } catch (e) {}
                }
            };
            document.addEventListener('visibilitychange', check);
            window.addEventListener('focus', check);
            check(); // 지금 바로 한 번 확인
        }).catch(function () {});
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
