# project_moida_otpfc.md — 모이다 전체 파일 인벤토리

CLAUDE.md "파일 지도"의 상세판(백과사전). 실제 디스크 기준 55개 파일.
Last Updated: 2026-06-06

---

## 페이지 (HTML)

- index.html — 홈 / 진입
- member.html — 회원용 통합 앱. 아래 tab-* / handlers-* / use-* / modals.js 사용
- attendance.html — 관리자 출석 관리. tab-attend-* / handlers-attend-* / modals-attend.js 사용
- roster.html — 회원/회비 관리 전용 페이지 (roster-*.js 사용 — 확인 권장)
- team-maker.html — 팀 편성 전용 페이지 (team-*.js 사용 — 확인 권장)
- match.html — 매치 관리 전용 페이지 (match/*.js 사용 — 확인 권장)
- admin-data-tool.html — 데이터 관리 도구 (용도 확인 권장)
- add-test-member.html — 테스트 회원 추가 (용도 확인 권장)
- migrate.html — 데이터 마이그레이션 (용도 확인 권장)

---

## 공통 / 설정 (JS)

- firebase-init.js — Firebase 초기화. db, auth, APP_ID, getCol(), STAFF_ROLES
- utils.js — 레벨/팀 색상, 이름 포맷, calculateEndDate, extendEndDate
- sw.js — Service Worker: FCM 백그라운드 수신, 네트워크 우선 캐시
- ※ common.js, firebase-config.js 는 실제로 없음 (firebase-init.js가 대체)

## 공통 부품 (여러 페이지 재사용)

- location-picker.js — Leaflet 지도 + 카카오 검색/핀으로 장소 선택, reverse geocode로 주소 자동 조회
- qr-scanner.js — jsQR 실시간 카메라 QR 스캔 (후면카메라 선호)

---

## 핸들러 (이벤트 로직)

- handlers-kakao.js — 카카오 로그인/회원가입, 테마, 라우팅, 앱 초기화
- handlers-roster.js — 회원 추가/수정/탈퇴, 회비 처리(월납/반년납/1년납/휴식). 운영진 관리도 여기 포함 추정
- handlers-team.js — 팀 생성 알고리즘, 드래그앤드롭, 저장/불러오기/확정/캡처 (member.html이 실제 호출)
- handlers-match.js — 매치 테이블 생성, 저장, 다음 경기 진행, 캡처, 구장 프리셋
- handlers-attend.js — QR/GPS 체크인, 출결 체크/해제, 게스트, 노쇼, 기록 삭제/수정 (member.html 출석탭용)
- handlers-attend-session.js — 모임(세션) 설정(시간/위치/담당자), 테스트모드, 기록 확정/삭제 (attendance.html용)
- handlers-attend-member.js — 가입 신청 승인/거부 (makePendingHandlers, PendingModal)
- handlers-attend-qr.js — QR 코드 생성 (makeQRHandlers, QRModal)

## 훅 (상태 관리)

- use-roster.js — 회원 목록, 월별 상태, 필터/모달/청구 상태
- use-team.js — 팀 편성 드래프트, 제외 목록, 드래그 상태, pastTeammatesMap
- use-attend.js — 출결 기록, QR/장소 모달, 자동 노쇼 로직
- use-match.js — 매치 스케줄, 구장 프리셋, 저장 기록, 매치 통계
- use-fcm.js — FCM 토큰 등록/갱신, 공지 목록, 포그라운드 알림 핸들러

---

## 탭 / 컴포넌트 — member.html

- tab-home.js — 홈탭: iOS PWA 배너, 푸시 배너, 빠른 출석, 내 팀, 공지
- tab-attend.js — 출석탭: GPS/QR 체크인 전체 UI
- tab-roster.js — 회원탭: 디렉토리 + 회비 서브탭(인라인)
- tab-team.js — 팀편성탭: 관리자 편집 + 회원 팀 배정 뷰
- tab-match.js — 매치탭: 관리자 매치 관리 + 회원 매치 뷰
- member-header.js — 상단 헤더: 관리자 토글, 테마, 로그아웃, 모임 정보
- member-helpers.js — calcDistance, 회원권 상태, 카카오 API 키
- member-icons.js — SVG 아이콘. React.createElement 방식(JSX 아님) — 일반 JS로 로드되므로 정상. JSX로 바꾸지 말 것
- modals.js — 회원 화면 모든 모달 중앙 허브

## 탭 / 컴포넌트 — attendance.html

- tab-attend-setup.js — 설정탭: 날짜/시간/장소/GPS반경/QR/선착순/회원선정
- tab-attend-main.js — 메인탭: 실시간 시계, 팀별 카드 그리드, 대기자, 기록확정
- tab-attend-history.js — 기록탭: 세션 목록 + 상세보기(정렬/장소편집/상태변경)
- AttendNavBar.js — 하단 네비: 탭 전환, QR 버튼, 가입신청 배지, 더보기
- modals-attend.js — CheckIn/Notif/Guest/HistoryEdit/Alert 모달 + 핸들러 팩토리

---

## 회원 / 회비 (루트)

- roster-members.js — 회원 목록/추가/수정/탈퇴 컴포넌트
- roster-payment.js — 회비 관리 컴포넌트
- roster-utils.js — 회원권 상태 유틸 (member-helpers.js와 일부 중복)

## 팀 편성 (루트)

- team-balance.js — buildTeams() 알고리즘(6단계) + GeneratorTab (team-maker.html용 추정)
- team-dragdrop.js — makeTeamMoveHandlers() + ResultsTab (드래그앤드롭/탭스왑)
- team-storage.js — 임시저장/불러오기/확정/리셋/재생성 핸들러 + UI
- team-export.js — captureTeams() → html2canvas → JPEG
- team-utils.js — 팀 UI 아이콘

## 매치 (match/ 폴더 — 유일한 실제 하위 폴더)

- match/match-generator.js — generateSchedule() 알고리즘 + SetupTab
- match/match-results.js — ResultsTab(라운드별 진행) + LoadModal
- match/match-score.js — computeStats() + StatsTab(팀별 경기 수, 매치업 횟수)
- match/match-export.js — captureMatchTable() → html2canvas → PNG
- match/match-utils.js — 아이콘, PresetModal, 시간 헬퍼

## 서버 / 배포

- functions/index.js — Cloud Function sendPushNotification: notifications 생성 시 FCM 토큰 전체 조회 → 발송 → 무효 토큰 삭제. targetMemberId로 특정 회원 발송 가능
- sw.js — (위 공통/설정 참고)

---

## 구조적 특이사항 (정리 시 주의)

- 여러 전용 페이지 + member.html 탭 재구현 → 같은 기능이 양쪽에 존재 (중복의 근본 원인)
- 팀 생성 알고리즘: team-balance.js(team-maker.html 추정) + handlers-team.js(member.html 실제 호출) — 한쪽만 고치면 다른 페이지 안 바뀜
- 매치 스케줄 알고리즘: match/match-generator.js + handlers-match.js — 동일 패턴
- 출석: member.html 계열(tab-attend.js/handlers-attend.js)과 attendance.html 계열(tab-attend-*.js)은 별개
- 아이콘 정의 분산: member-icons.js / roster-utils.js / team-utils.js / match/match-utils.js
- JSX 불일치: member-icons.js만 createElement — 일반 JS 로드라 의도된 것. 건드리지 말 것

## 아직 확인 필요

- roster.html / team-maker.html / match.html / 유틸 페이지가 실제로 불러오는 .js 목록 (script 태그 확인)
- 휴식 회원·운영진 관리의 정확한 위치 (전용 파일 없음 → handlers-roster.js 등 내부로 추정)
