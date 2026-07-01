CLAUDE.md — OTP FC 모이다 프로젝트
Version: 3.8
Last Updated: 2026-07-01
개발 환경: Windows PC · macOS(맥북) 겸용. 세션 환경정보(Platform: win32/darwin · Shell)로 OS를 판별해 아래 '환경별 규칙 (Windows / macOS)'을 따른다. 경로·scratchpad는 하드코딩하지 말고 주입된 값을 쓴다.

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
지각/노쇼 벌금 (지각5천·통보노쇼1만/2만·무통보노쇼3만) → 관리자 확정·발송=handlers-attend.js(attendFinalizePenalties)+tab-attend.js(RecordDetailModal 벌금패널). 회원 납부(토스 금액자동·계좌복사·보냈어요)+관리자 확정/삭제=tab-home.js(PenaltyPayCard, 회비탭). 미납 시 모임신청 완전차단=handlers-registration.js(handleRegister 게이트)+tab-attend.js(RegistrationCard). Firestore: penalties/{모임ID}_{회원ID}. 토스/계좌는 회비 settings/club_account 재사용

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
경기 타이머 (게임 카운트다운 + 교체 알림 — 워치 TimerService 이식) → match-timer.js (MoidaTimer 단일상태·useMatchTimer·MatchTimerBar). 매치판 크게 보기(tab-match.js MatchBoardModal) 상단에 표시. WebAudio 삐 + navigator.vibrate(iOS는 소리만). 워치<->앱 연동은 미구현

회칙  (게시판 탭 안 정보카드로 진입 — 별도 하단탭 없음)

회칙 조회(전체) / 작성·수정(관리자) → tab-rules.js. 진입=tab-notice.js(게시판 카드 '정보' 항목 → TabRules 호출, 뒤로='게시판').
제목 "O.T.P FC 회칙" + 시행/개정일자(관리자가 편집에서 직접 지정).
Firestore: settings/club_rules { content, updatedAt, updatedBy, effectiveDate, revisedDate }

MY  (회원 마이페이지 — 하단탭 [홈·모임·게시판·MY], 회비탭 흡수)

프로필·회비·벌금·내출석·설정(알림/다크모드)·계정(로그아웃/버전)·(개발자)보기모드 → tab-my.js.
회비/벌금/출석 카드 정의는 tab-home.js, MY에서 호출만(embedded). 헤더 아바타=MY 바로가기. (자세히 메모리 project-my-tab)

홈 / 로그인 / 알림  (member.html)

로그인 / 회원가입 / 홈 / 라우팅 → handlers-kakao.js, tab-home.js
상단 헤더 → member-header.js
알림(FCM) 토큰/공지 → use-fcm.js
공지 작성·발송(대상 지정: 전체/직접/회비자격자/이번모임참여자) → modals.js(AnnouncementModal) + member.html(handleSaveAnnouncement). '이번 모임 참여자'는 weekly_session(선정명단) 기준.
공지 게시판(전체화면 목록/상세/선택삭제, 종·순환 띠로 진입, tab==='notice') → tab-notice.js + member.html(handleDeleteAnnouncements). 순환 띠·종 배지는 tab-home.js(AnnounceTicker)·member-header.js.
회원 화면 모달 전체 → modals.js
회원용 출석 / 체크인 → tab-attend.js, handlers-attend.js, use-attend.js
모임 탭 (모임 카드 목록 → 카드 누르면 모임 상세: 출석/대진/매치) → tab-attend.js(MeetingListScreen·MeetingDetailHeader·TabAttend) + member.html(viewMeetingId 라우팅, effectiveMeeting 컨텍스트). 팀/매치 데이터는 보고 있는 모임(meetingId) 기준
🧪 테스트 모임 (관리자, 모임 탭 관리영역 🧪 버튼) → test-meeting.js(createTestMeeting/deleteTestMeeting). 빈 날짜+현재시각으로 모임 생성 + 나 포함 랜덤 ~18명(weekly_session, checkedIn) + 팀편성(team_drafts isConfirmed) + 매치표(match_schedules) 자동, 전부 isTest:true 태깅. 삭제=meetings·weekly_session·team_drafts·match_schedules·history·registrations에서 isTest 문서 일괄 삭제(흔적 없음). 현재모임 mirror·watch_control은 안 건드림. UI 버튼=tab-attend.js MeetingListScreen, 핸들러 전달=member.html
모임 탭 '기록'(관리자 전용, 예정/기록 토글 → 정기/매칭 분리, 종료된 모임 목록·출석기록 상세) → tab-attend.js(MeetingRecordsView·RecordDetailModal·isMeetingEnded). 종료 판정: 정기=status 'done' / 매칭='지난 날짜'(computeMeetingDay past). 예정 목록·홈은 종료 모임 제외

출석 관리  (attendance.html)

모임 목록 (여러 모임 등록/수정/삭제, 현재 모임·mirror 동기화) → handlers-meetings.js, tab-meetings.js
정기 모임 자동 생성 (요일/시간/생성시점/기본값 + 날짜별 구장·선착순 미리 지정) → tab-meetings.js(정기 모임 설정·날짜별 미리 지정 모달) + handlers-meetings.js(loadRecurringConfig/saveRecurringConfig/computeUpcomingMeetingDates/loadRecurringOverrides/saveRecurringOverride). 서버 자동 생성 → functions/index.js(generateRecurringMeeting, 매시 정각 KST). Firestore: settings/recurring_meeting(설정), recurring_overrides/{날짜}(날짜별). 자동생성 모임 표시: meetings 문서 autoGenerated/needsReview
모임 설정 (날짜/시간/장소/GPS반경/QR/선착순/담당자) → tab-attend-setup.js, handlers-attend-session.js
출석 현황 (실시간 시계/팀 카드/대기자/기록 확정) → tab-attend-main.js
출결 기록 (목록/상세/정렬/장소편집/상태변경/삭제) → tab-attend-history.js
가입 신청 승인/거부 → handlers-attend-member.js
QR 코드 생성 → handlers-attend-qr.js
하단 네비게이션 → AttendNavBar.js
출석 화면 모달 → modals-attend.js

서버 / 배포 / 유틸 페이지

백그라운드 알림 수신 + 캐시 → sw.js
푸시 알림 발송 + 대기 자동승급 + 정기 모임 자동 생성(generateRecurringMeeting, onSchedule 매시 정각 KST) → functions/index.js
데이터 관리 도구(백업/초기화/롤백/특정 모임 신청 초기화) → admin-data-tool.html
테스트 회원 추가 → add-test-member.html
데이터 마이그레이션 → migrate.html


중복 주의 (수정 시 반드시 양쪽 확인)
같은 로직/정의가 두 곳 이상에 존재한다. 한쪽만 고치면 다른 페이지에서 버그가 난다.
하나를 수정하면 짝 파일도 영향 없는지 먼저 확인하고 보고한다.

팀 생성 알고리즘 → team-balance.js(team-maker.html 추정) + handlers-team.js(member.html 호출)
매치 스케줄 알고리즘 → match/match-generator.js + handlers-match.js
출석 기능 → member.html 계열(tab-attend.js / handlers-attend.js)과 attendance.html 계열(tab-attend-*.js)은 별개
회비/벌금/출석 카드(DuesAccountCard·PenaltyPayCard·MyAttendanceCard·DuesHistoryCard·PenaltyHistoryCard)는 tab-home.js에 정의되고 home·my 양쪽에서 렌더된다. 수정 시 두 화면 모두 확인.
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


이전 실수 방지 (반복 금지)
아래는 과거에 실제로 낸 실수다. 같은 류를 반복하지 않는다.

- 공용 에셋·공통 컴포넌트를 교체/수정하기 전, 그 파일이 어디에 쓰이는지 먼저 grep으로 확인한다.
  특히 아이콘은 분리돼 있다: icon.png = 인앱 엠블럼(OTP 팀 로고 — 헤더·첫화면·푸시), app-icon.png = 휴대폰 런처/홈추가 아이콘(모이다). "앱 아이콘만" 바꾸라면 app-icon.png만 건드린다. (실수: icon.png를 덮어 인앱 엠블럼까지 바뀜)
- "삭제된 X를 보관/복원" 류 요청은 X의 데이터 단위를 먼저 확정한다 — 모임 문서 자체인지, 그 부산물(출석기록 history)인지. 모임 삭제는 영구삭제가 아니라 soft-delete(meetings.deleted=true), 보관함=삭제된 모임, 통계 제외=history.trashed. (실수: 보관함을 history 기반으로 만들어 예정 모임이 안 떴음)
- 모임 상태(생성/삭제/복원)를 바꾸면 미러(현재 모임 = settings/meeting_schedule_v2 · meeting_schedule_match) 재동기화(syncMirror)를 항상 함께 고려한다. 미러를 안 맞추면 홈 키오스크(isActive)·운영진 선정(displayMeetingSettings 기준)·출석이 엉뚱한 모임을 가리킨다. (실수: 복원이 deleted만 풀고 미러를 안 맞춰 키오스크 미표시·선정 누락)
- 커밋 메시지에 큰따옴표가 있으면 PowerShell(Windows)에서 here-string이 깨진다 → Windows에서는 메시지를 파일로 쓰고 git commit -F 로 커밋한다. macOS(zsh)에서는 해당 없음 — 작은따옴표 -m '...' 또는 heredoc(git commit -F - <<'EOF' … EOF)을 쓴다. (Platform으로 자동 판별 — 아래 '환경별 규칙 (Windows / macOS)' 참고)


크로스 플랫폼 호환 (PC · Android · iOS)
모든 UI 변경은 PC·Android·iOS 세 환경에서 정상 동작하도록 한다.

iOS: 세이프 에어리어(노치/홈 인디케이터) → env(safe-area-inset-*) 적용
iOS Safari: overscroll-behavior 미지원 → 필요시 JS로 보완
PC: 마우스·큰 화면 / 모바일: 터치·작은 화면 — 둘 다 고려
플랫폼마다 동작이 다르면 각 환경에 맞는 처리를 따로 넣고, 무엇을 했는지 보고한다
변경 후 세 환경에서 점검할 항목을 알려준다
새 아이콘 사용 전 member-icons.js에 해당 아이콘이 있는지 먼저 확인한다. 없으면 텍스트 또는 기존 아이콘으로 대체.


## 디자인 기준 (요약 — 상세는 DESIGN.md)
- 색: 강조=인디고 현행 #183FB0 (텍스트·액티브 #122E78) / 글자=잉크 #0f172a·#475569·#94A3B8.
  ※클래스명은 여전히 teal-* (tailwind-config의 teal 스케일에 인디고 hex를 덮어씀). LIVE 포인트=라임
  #C2F94A(live 색, "진행 중" 배지만, 글자 #15171E). 각 색은 1값으로 고정,
  새 변형 만들지 말 것. 상태색 성공#10B981·경고#F59E0B·위험#EF4444.
- 간격: 8의 배수(8·16·24) 기본, 미세조정만 4. 카드 패딩 16, 화면 좌우 16.
- 모서리: 작은요소 rounded-xl(12~14) / 카드 rounded-2xl(16~20) / 알약 rounded-full. (3xl 남발 금지)
- 그림자: 카드용 1종(0 4px 14px rgba(0,0,0,.05))만. 그 외 추가 금지.
- 아이콘: member-icons.js 외곽선 세트 하나로 통일. size는 16/20/24/30 중에서.
- 정렬: 위 "박스 내부 정렬 규칙" 따름. (여기서 다시 풀어 쓰지 말 것)
- 토큰 주의: --c-ink/text/bg/card/border는 다크에서 값이 바뀜 → 라이트 고정 화면·darkMode 삼항엔
  쓰지 말 것(상세 DESIGN.md). 안전 토큰=accent/accent-deep/sub/success/warn/danger.
- 새 화면·박스 제작 시 위 기준을 따르고, 애매하면 DESIGN.md 참고.


박스 내부 정렬 규칙 (카드·안내·상태·빈 상태·버튼 박스)
새로 만드는 카드/안내/상태/빈 상태/버튼 박스는 아래를 기본으로 한다.

- 세로 중앙은 기본: 박스가 내용보다 큰 높이를 가질 수 있으면 내용을 세로 중앙에 둔다
  (display:flex; align-items:center; justify-content:center 또는 그에 준하는 처리).
  단, 박스 높이가 내용만큼뿐이면 세로 중앙은 의미가 없으므로 넣지 않는다.
- 가로 정렬은 내용 성격대로 보존한다:
  · 안내/상태/빈 상태 문구 → 가로도 중앙(justify-center 또는 text-center)
  · 목록/행/라벨+값 → 좌측 또는 양끝 정렬 유지
  · 길게 풀어쓴 안내 문장 → 좌측 정렬
- 여러 줄이거나 글씨 크기가 다른 문구는 하나의 컨테이너로 묶어, 그 묶음 전체를 박스 세로
  중앙에 둔다. 개별 줄을 따로 중앙 처리하지 않는다. 묶음 내부 줄 간격은 gap으로 조절하고,
  가로 정렬은 내용 성격대로 묶음에 한 번만 지정한다.
- 핵심 원칙: "세로 중앙은 기본, 가로 정렬은 보존." 기존 가로 정렬을 임의로 바꾸지 않는다.


비개발자 대응 원칙
사용자는 코드를 작성하지 않는다.
설명은 함수·변수·훅·컴포넌트가 아니라 기능 기준으로 한다.
(예: "함수 수정" 대신 "회비 기능 수정", "출석 기능 수정")

사용법 안내 (작업 완료 시 필수)
기능을 새로 추가하거나 수정하면, 함수·파일명만 알려주지 말고
"어떻게 쓰는지"를 자연어로 설명한다.

- 어느 탭/화면에서 (예: 홈 탭, 출석 탭)
- 어떤 버튼을 누르거나 어떤 동작을 하면
- 무슨 일이 일어나는지
- 누가 쓸 수 있는지 (관리자 / 일반 회원)

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
대기 승급(onRegistrationDeleted)은 registrations 복합 색인 필요 — firestore.indexes.json에 기록됨, Firebase Console에서 생성 완료 (meetingDate + status + registeredAt).
Firestore 색인 배포: firebase deploy --only firestore:indexes

## 환경별 규칙 (Windows / macOS — 자동 선택)
이 프로젝트는 Windows PC와 macOS(맥북)에서 겸용으로 작업한다. Claude Code는 세션마다 환경정보(Platform: win32/darwin · Shell · 작업디렉토리 · scratchpad 경로)를 자동으로 주입한다. 그 값을 보고 해당 OS 규칙만 따른다. 경로·기기명·scratchpad 경로를 코드나 문서에 하드코딩하지 않는다 — 항상 주입된 값을 쓴다.

공통 (OS 무관 — 어디서든 동일)
- git 흐름(pull → 수정 → commit → push), 파일 지도·읽기 규칙·디자인 기준·박스 정렬 규칙은 OS와 무관하게 동일하다.
- Babel 검증: 세션 scratchpad에 @babel/standalone 설치 후 검증. scratchpad 경로는 하드코딩하지 말고 주입된 경로를 쓴다.
- Firebase 배포 명령은 OS 무관 동일: `firebase deploy --only functions` / `firebase deploy --only firestore:indexes`. 새 기기는 최초 1회 firebase-tools 설치 + firebase login(같은 계정) 필요.

Windows (Platform: win32 · PowerShell 주 · Git Bash 보조)
- 커밋 메시지에 큰따옴표가 있거나 여러 줄이면 PowerShell here-string이 깨진다 → 메시지를 파일로 써서 `git commit -F <파일>` 하거나 Git Bash에서 `git commit -F - <<'EOF' … EOF` 를 쓴다.
- PowerShell은 `&&`·`||`·삼항이 없다 → `;` + `if ($?) { … }` 로 분기. 경로는 c:\ 역슬래시.

macOS (Platform: darwin · zsh)
- zsh는 heredoc(`git commit -F - <<'EOF' … EOF`)·`&&`·`||`·`$(…)`가 정상이다. 큰따옴표/여러 줄 커밋 메시지도 작은따옴표 `-m '...'` 또는 heredoc으로 그냥 넘긴다. (위 PowerShell here-string 회피책은 맥에 불필요.) 경로는 /Users 슬래시.

주의 (커밋/푸시 정책)
- 리포에 커밋된 .claude/settings.json의 Stop 훅이 세션 종료마다 자동 commit + push 한다(커밋 로그의 "모이다 자동 업데이트"가 이것). 이 훅은 shell:bash라 맥에서도 그대로 동작한다 → 세션만 끝나도 GitHub Pages 라이브로 배포됨. 특정 기기에서 "명시적으로 시킬 때만 push"를 원하면 그 기기에서 이 훅을 끄거나 무력화한다(문서가 아니라 훅 설정 문제).

새 기기·새 세션은 저장소 루트 HANDOFF.md를 먼저 읽는다. Claude 로컬 메모리는 기기마다 따로라 git으로 동기화되지 않는다 — 기기 간 인수인계는 HANDOFF.md로만 한다.

Git 규칙
사용자가 요청하면 git pull / git push를 바로 수행한다.
불필요한 확인 질문, 무관한 git 상태 확인은 하지 않는다.

메모리 파일
project_moida_otpfc.md = 전체 파일 인벤토리 + 상세 역할.
중요 기능 변경 시에만 갱신한다. 사소한 수정은 갱신하지 않는다.
※ 로컬 메모리(C:\Users\...\.claude\...\memory\)는 이 PC에만 있고 집↔사무실 동기화 안 됨. PC 간 공유가 필요한 인수인계는 아래 HANDOFF.md에 쓴다.

핸드오프 파일 (HANDOFF.md) — PC 간 공유 인수인계 (★규칙)
저장소 루트 HANDOFF.md는 집·사무실 두 PC가 git으로 공유하는 유일한 인수인계 파일이다. 로컬 메모리와 달리 git pull/push로 동기화된다.
- 갱신 시점: 그 날 작업을 마무리할 때 반드시 갱신한다. 마무리 신호 = 사용자가 "기록/마무리/집에 갈래/오늘 여기까지" 등으로 세션을 접거나, git push를 요청하거나, 배포까지 끝나 작업이 일단락된 시점.
- 갱신 내용: ① 헤더(마지막 갱신 날짜 · SW 캐시 · 표시버전 · 마지막 커밋) ② '오늘 세션' 요약(무엇을 왜 바꿨는지 + 건드린 파일) ③ '다음에 할 일'.
- 갱신 후 반드시 commit + push 한다(그래야 다른 PC가 git pull로 받는다). HANDOFF.md는 비런타임 문서라 SW 캐시(sw.js)는 올리지 않아도 된다.
- 다른 PC/새 세션 시작 시엔 git pull 후 HANDOFF.md를 먼저 읽는다.

작업 완료 보고
수정 기능:
수정 파일:
결과:
사용법: (어느 탭/화면에서 → 어떤 버튼·동작 → 무슨 일이 일어나는지 → 누가 쓰는지, 자연어로)
테스트 내용: