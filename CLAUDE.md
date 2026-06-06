CLAUDE.md — OTP FC 모이다 프로젝트
Version: 3.4
Last Updated: 2026-06-06

프로젝트 개요
아마추어 혼성 풋살팀 OTP FC 운영 관리 웹앱 "모이다"
기술 스택: React 18 · Firebase Firestore · 익명/카카오 로그인 · Tailwind CSS · Leaflet · 카카오맵 · PWA · Cloud Functions(FCM) · GitHub Pages

Firebase Project ID: moida-otpfc
기본 컬렉션 경로: artifacts/moida-otpfc/public/data/

이 앱은 여러 개의 독립 HTML 페이지로 구성된다. 작업 전 어느 페이지 작업인지 먼저 확인한다.

관리자 페이지: index.html · attendance.html · roster.html · team-maker.html · match.html
회원 페이지: member.html (회원용 통합 화면 — 회원/회비/팀/매치/출석을 탭으로 다시 구현)
유틸 페이지: admin-data-tool.html · add-test-member.html · migrate.html

※ 같은 기능이 "전용 페이지"와 "member.html 탭" 양쪽에 존재할 수 있다 → "중복 주의" 참고.
각 파일의 상세 역할은 project_moida_otpfc.md 참고. 이 파일에는 지도와 규칙만 둔다.

파일 지도 (가장 중요)
작업 전 이 지도부터 본다. 요청 기능에 해당하는 파일만 읽는다.
지도에 없거나 무관한 파일은 읽지 않는다. (모든 .js는 루트에 있음. 단 match/ 만 폴더)
공통 부품 (여러 페이지 재사용)

장소 선택 (지도/GPS/카카오 검색/핀) → location-picker.js
QR 카메라 스캔 → qr-scanner.js
Firebase 초기화 (db, auth, getCol, APP_ID, STAFF_ROLES) → firebase-init.js
공통 유틸 (레벨/팀 색상, 이름 포맷, 날짜 계산) → utils.js
회원권 상태 / 거리계산 / 카카오 API 키 → member-helpers.js
아이콘 → member-icons.js  (※ "중복 주의" 참고)

회원 / 회비  (roster.html · member.html 회원탭)

회원 목록/추가/수정/탈퇴/운영진 → roster-members.js, handlers-roster.js, use-roster.js
회비 (월납/반년납/1년납) + 휴식 회원 처리 → roster-payment.js, handlers-roster.js
회원권 상태 유틸 → roster-utils.js
(member.html) 회원탭 UI → tab-roster.js

팀 편성  (team-maker.html · member.html 팀탭)

팀 생성 알고리즘 → team-balance.js  /  handlers-team.js  (※ 중복 주의)
드래그앤드롭 / 결과 화면 → team-dragdrop.js
임시저장/불러오기/확정/재생성 → team-storage.js
팀 이미지 저장 → team-export.js
팀 아이콘 → team-utils.js
(member.html) 팀탭 → tab-team.js, handlers-team.js, use-team.js

매치  (match.html · member.html 매치탭)

매치 스케줄 생성 → match/match-generator.js  /  handlers-match.js  (※ 중복 주의)
경기 진행 / 결과 → match/match-results.js
통계 → match/match-score.js
매치 이미지 저장 → match/match-export.js
매치 아이콘 / 구장 프리셋 → match/match-utils.js
(member.html) 매치탭 → tab-match.js, handlers-match.js, use-match.js

회칙  (member.html 회칙탭)

회칙 조회(전체) / 작성·수정(관리자) → tab-rules.js
Firestore: settings/club_rules { content, updatedAt, updatedBy }

홈 / 로그인 / 알림  (member.html)

로그인 / 회원가입 / 홈 / 라우팅 → handlers-kakao.js, tab-home.js
상단 헤더 → member-header.js
알림(FCM) 토큰/공지 → use-fcm.js
회원 화면 모달 전체 → modals.js
회원용 출석 / 체크인 → tab-attend.js, handlers-attend.js, use-attend.js

출석 관리  (attendance.html)

모임 설정 (날짜/시간/장소/GPS반경/QR/선착순/담당자) → tab-attend-setup.js, handlers-attend-session.js
출석 현황 (실시간 시계/팀 카드/대기자/기록 확정) → tab-attend-main.js
출결 기록 (목록/상세/정렬/장소편집/상태변경/삭제) → tab-attend-history.js
가입 신청 승인/거부 → handlers-attend-member.js
QR 코드 생성 → handlers-attend-qr.js
하단 네비게이션 → AttendNavBar.js
출석 화면 모달 → modals-attend.js

서버 / 배포 / 유틸 페이지

백그라운드 알림 수신 + 캐시 → sw.js
푸시 알림 발송 (Cloud Function) → functions/index.js
데이터 관리 도구 → admin-data-tool.html
테스트 회원 추가 → add-test-member.html
데이터 마이그레이션 → migrate.html


중복 주의 (수정 시 반드시 양쪽 확인)
같은 로직/정의가 두 곳 이상에 존재한다. 한쪽만 고치면 다른 페이지에서 버그가 난다.
하나를 수정하면 짝 파일도 영향 없는지 먼저 확인하고 보고한다.

팀 생성 알고리즘 → team-balance.js(team-maker.html 추정) + handlers-team.js(member.html 호출)
매치 스케줄 알고리즘 → match/match-generator.js + handlers-match.js
출석 기능 → member.html 계열(tab-attend.js / handlers-attend.js)과 attendance.html 계열(tab-attend-*.js)은 별개
아이콘 정의 → member-icons.js / roster-utils.js / team-utils.js / match/match-utils.js 에 흩어짐
※ JSX 주의: member-icons.js는 일반 JS로 로드되어 React.createElement 사용이 "정상"이다. JSX로 바꾸지 말 것 (바꾸면 깨짐).


읽기 규칙 (토큰 절약 핵심)
매우 중요

작업 시작 전, 어떤 파일을 읽을지 먼저 말한다. 승인 후 읽는다.
파일 지도에서 요청 기능에 해당하는 파일만 읽는다.
지도에 없거나 요청과 무관한 파일은 읽지 않는다.
전체 프로젝트 탐색(glob, grep 전수 검색)은 사용자가 명시적으로 요청한 경우에만 한다.
한 번 읽은 파일은 같은 세션에서 다시 읽지 않는다.
의존 관계가 꼭 필요할 때만, 그 파일 하나만 최소 범위로 추가로 읽는다.


최우선 원칙

기존 기능을 깨지 않는다. 새 기능보다 기존 기능 안정성을 우선한다.
추측으로 구현하지 않는다. 파일/구조는 실제 디스크 기준으로 확인한다.
기능 변경 가능성이 있으면 먼저 설명한다.


크로스 플랫폼 호환 (PC · Android · iOS)
모든 UI 변경은 PC·Android·iOS 세 환경에서 정상 동작하도록 한다.

iOS: 세이프 에어리어(노치/홈 인디케이터) → env(safe-area-inset-*) 적용
iOS Safari: overscroll-behavior 미지원 → 필요시 JS로 보완
PC: 마우스·큰 화면 / 모바일: 터치·작은 화면 — 둘 다 고려
플랫폼마다 동작이 다르면 각 환경에 맞는 처리를 따로 넣고, 무엇을 했는지 보고한다
변경 후 세 환경에서 점검할 항목을 알려준다
새 아이콘 사용 전 member-icons.js에 해당 아이콘이 있는지 먼저 확인한다. 없으면 텍스트 또는 기존 아이콘으로 대체.


비개발자 대응 원칙
사용자는 코드를 작성하지 않는다.
설명은 함수·변수·훅·컴포넌트가 아니라 기능 기준으로 한다.
(예: "함수 수정" 대신 "회비 기능 수정", "출석 기능 수정")

사용법 안내 (작업 완료 시 필수)
기능을 새로 추가하거나 수정하면, 함수·파일명만 알려주지 말고
"어떻게 쓰는지"를 자연어로 설명한다.

어느 탭/화면에서 (예: 홈 탭, 출석 탭)
어떤 버튼을 누르거나 어떤 동작을 하면
무슨 일이 일어나는지
누가 쓸 수 있는지 (관리자 / 일반 회원)

예: "홈 탭 '다음 모임' 카드에서, 모임 종료 시간이 지나면 '모임 종료'
버튼이 빨갛게 활성화됩니다. 관리자가 누르면 그날 출석 기록이 저장됩니다."

작업 전 절차
수정 전에 반드시 아래를 설명한다.

이해한 요청
읽을 파일 (파일 지도 기준)
수정될 기능
영향 받는 페이지 (어느 HTML인지)
위험 요소 (중복 파일 포함)

설명 후 작업한다.

답변 방식
기본 응답은 짧고 명확하게.
수정 기능:
수정 파일:
결과:
상세 설명은 요청한 경우에만 제공한다.

토큰 절약 규칙

변경된 부분만 설명. 전체 파일 재출력 금지.
긴 보고서 금지.
요청되지 않은 개선·리팩토링·성능 최적화 제안 금지.
사용자가 이미 설명한 내용을 다시 반복하지 않는다.


대규모 작업 / 파일 분리 규칙
대규모 작업·파일 분리·중복 정리는 아래 순서로만 진행한다.

분석
계획 제시 (어떤 파일을, 어떤 순서로, 위험은 무엇인지)
사용자 승인
작업
검증 (정리 전후 결과가 동일한지 확인)

승인 없이 대규모 구조 변경이나 파일 분리를 진행하지 않는다.

새 기능 추가 규칙
새 기능은 먼저 파일 지도에서 담당 파일을 정한다.

담당 파일이 있으면 그 파일에만 추가한다.
담당 파일이 없으면 어디에 넣을지 먼저 제안하고 승인받는다.
기존처럼 하나의 HTML에 전부 몰아넣지 않는다.
기능 추가 후 파일 지도를 갱신한다.


공통 모듈 원칙
중복 코드는 공통 모듈 사용을 우선 고려한다.
(Firebase → firebase-init.js, 공통 유틸 → utils.js / member-helpers.js, 아이콘 통합 등)
기능 변경 없이 안전한 경우에만 적용한다. 중복 정리는 계획 제시 후 승인받고 진행한다.

PWA 및 배포
배포 작업 시 Service Worker(sw.js) · manifest · 캐시 영향 여부를 확인한다.
기존 사용자 데이터는 유지한다.
Cloud Functions(functions/index.js) 변경은 git push가 아니라 firebase deploy --only functions 로 별도 배포한다.

Git 규칙
사용자가 요청하면 git pull / git push를 바로 수행한다.
불필요한 확인 질문, 무관한 git 상태 확인은 하지 않는다.

메모리 파일
project_moida_otpfc.md = 전체 파일 인벤토리 + 상세 역할.
중요 기능 변경 시에만 갱신한다. 사소한 수정은 갱신하지 않는다.

작업 완료 보고
수정 기능:
수정 파일:
결과:
사용법: (어느 탭/화면에서 → 어떤 버튼·동작 → 무슨 일이 일어나는지 → 누가 쓰는지, 자연어로)
테스트 내용: