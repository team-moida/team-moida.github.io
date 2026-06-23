// Tailwind Play CDN 팔레트 override — CDN 스크립트 '다음'에 로드해야 함(앞서면 무효).
// teal = 현행 Tailwind 기본값 그대로 → 화면 무변화. 미래 인디고 전환 시 이 값만 교체하면
// 모든 teal 클래스(bg/text/border/ring/from/to-teal-*)가 따라 바뀐다.
// ※ 리테마 시 common.css의 html.dark .text-teal-* / .bg-teal-* / .border-teal-* 다크 보정도 함께 수정(DESIGN.md 10 참고).
// extend 사용(기본 팔레트 병합). replace(theme.colors.teal) 쓰면 다른 teal shade가 사라져 깨짐.
tailwind.config = {
  theme: { extend: { colors: {
    teal: {
      50:'#f0fdfa', 100:'#ccfbf1', 200:'#99f6e4', 300:'#5eead4', 400:'#2dd4bf',
      500:'#14b8a6', 600:'#0d9488', 700:'#0f766e', 800:'#115e59', 900:'#134e4a', 950:'#042f2e'
    },
    emerald: {  // 성공(success). 현행 기본값 그대로 → 무변화 seam.
      50:'#ecfdf5', 100:'#d1fae5', 200:'#a7f3d0', 300:'#6ee7b7', 400:'#34d399',
      500:'#10b981', 600:'#059669', 700:'#047857', 800:'#065f46', 900:'#064e3b', 950:'#022c22'
    },
    amber: {  // 경고(warn). 현행 기본값 그대로 → 무변화 seam.
      50:'#fffbeb', 100:'#fef3c7', 200:'#fde68a', 300:'#fcd34d', 400:'#fbbf24',
      500:'#f59e0b', 600:'#d97706', 700:'#b45309', 800:'#92400e', 900:'#78350f', 950:'#451a03'
    }
  }}}
};
