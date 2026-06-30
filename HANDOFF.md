# 핸드오프 (인수인계) — 다음 작업 시작점

> 다른 PC/새 세션에서 이어갈 때 이 파일부터 읽으세요.
> 자세한 작업 규칙·금지사항은 `CLAUDE.md`에 있습니다(꼭 같이 읽기).

**마지막 갱신:** 2026-06-30 (밤) · **SW 캐시:** `moida-v341` · **표시버전:** `v1.13.0` · **마지막 커밋:** `af1a30a`
**라이브:** team-moida/team-moida.github.io · **Firebase:** moida-otpfc
**최종 제품:** `member.html` 통합앱 (회원·운영진·개발자). ※ 옛 독립 관리자 HTML(attendance/roster/team-maker/match/index)은 화제 금지.

---

## 오늘 세션 (v339 → v341, 자동배포됨 — `4adf494`·`af1a30a`)
- **매치표 인라인 편집**(관리자, 매치탭→매치 관리→매치표): 팀 배지를 **탭해서 선택 → 같은 라운드의 다른 팀(또는 휴식 팀) 탭하면 교체**, PC는 드래그. 휴식↔코트 교체 시 휴식 명단 자동 갱신. **같은 라운드 안에서만** 교체(라운드당 한 팀 한 번 규칙 보존). 저장(💾)은 이미 저장된 표면 **그 문서 덮어쓰기**(새 문서 양산 방지)+워치 동기화. → tab-match.js(`renderEditTeam`/`onPick`/`onDropSlot`/picked + 선택됨 바), handlers-match.js(`matchEditSwap`, matchSaveSchedule 덮어쓰기 분기), member.html(matchEditSwap 전달). 생성 알고리즘(buildRotationSchedule)은 안 건드림.
- **매치판 '크게 보기' → 홈 탭 이동**: 매치탭 진입버튼은 이미 제거돼 있었음 → 홈 정기모임 카드에 **"매치판 크게 보기"** 버튼 추가(매치표 있을 때만, `Icon.Tv`). 회원=내 경기 / 관리자=전체 대진+라운드 컨트롤. MatchBoardModal **정의는 tab-match.js에 두고 홈에서 재사용**(전역). → tab-home.js(NextMeetingCard에 boardOpen+버튼+모달, TabHome서 매치 컨트롤 prop 전달), member.html(matchLocalIndex/matchCompleted/onMatchPrev·Next·Toggle·AutoAdvance를 TabHome에 전달).
- **키오스크 수정 (홈에서만 열기)**: 모임탭 간소화로 독립 출석화면이 없어져 **KioskModal이 뜨는 TabAttend가 '팀→명단(rosterOnly)'에서만 마운트**되던 게 원인 — 홈 키오스크 버튼은 `attend` 서브탭으로 보내 KioskModal 없는 화면을 띄우고 isKioskOpen=true가 하단탭만 숨김(=빈 화면). **해결: KioskModal을 member.html 최상위 전역 모달로 이동**(isKioskOpen이면 어느 화면이든 뜸), TabAttend 내부 중복 제거. 홈 '키오스크' 버튼은 **화면 이동 없이** 열고(닫으면 홈 유지), 열 때 `setActiveMeetingKind('self')`로 활성 모임을 정기로 맞춤. 데이터는 기존처럼 displayMeetingSettings(활성 모임 미러) 기준. → member.html(전역 KioskModal + onOpenKiosk), tab-home.js(버튼), tab-attend.js(중복 제거).

## 사무실 세션 (v1.1.0 → v1.13.0, 전부 배포됨) — 요약
- 신청 UI **원형 토글**(신청하기↔취소)+완료팝업/순번+취소확인(v1.2.x) · **게시판 아코디언** 인라인 펼침(v1.3.0) · 팀 발표 시 **홈 카드를 내 조끼색**으로(v1.4.0) · **불참/노쇼 단계별 신청**+벌금 금액 명시(노쇼1만/당일2만)+운영진 알림(v1.5.x) · **모임 탭 간소화**(운영진 상세=관리 카드 1개: 모임정보·팀·매치 3줄)(v1.6~1.9) · 모임 **수정도 마법사**(v1.10.x) · 명단/팀 재구성·**'편성 관리' 토글 제거→바로 편성 도구**(v1.11~1.12) · 매치표 크게보기 버튼 제거(v1.12.1) · **매치표 고정 회전(라운드로빈) 생성**(v1.13.0).

## 사무실 세션 추가 (v301 → v1.1.0, 전부 배포됨)
- **모임 생성 = 6단계 마법사** (새 모임만 / 수정은 기존 단일 폼 유지) — 유형→날짜·시간→장소→인원→신청→마무리. 진행바·단계 제목, 마지막에 센스 로딩(공 통통+회전 문구) 후 등록. **저장은 기존 handleSaveMeeting 재사용**, 필드·검증 그대로. 안드로이드 뒤로=이전 단계. → tab-meetings.js(`wizStep`/`stepShow`/`wizSubmit`/`WIZ_STEPS`/`WIZ_LOAD`), 로딩 공=member.css `.moida-ball`. 시안=lab-create.html.
- **홈 모임 카드 fill 스크롤 제거**(v1.0.3) — fill 높이 계산에 카드 아래 형제 높이 + content-pb 하단패딩까지 반영(tab-home.js). 모바일에서 카드가 스크롤 없이 한 화면.
- **표시 버전 시맨틱 정리**: 자잘한 변경은 표시버전 안 올리고 SW 캐시만 +1. 표시=index.html 푸터 + tab-my.js APP_VERSION 두 곳.

## 가장 최근 세션에 한 일 (v294 → v301, 전부 배포됨)
- **담당자 자동 1번 등록 = 체크박스로** (모임 생성 폼 + 정기모임 설정, 기본 ON). 정기모임 **서버 자동생성(functions)에도 담당자 자동등록 추가**(이전엔 빠져서 매니저에게 신청버튼이 안 뜨던 버그 해결). 신청버튼 가시성을 "담당자 제외"가 아니라 **등록상태 기반**으로 변경. → tab-home.js·tab-attend.js·tab-meetings.js·handlers-meetings.js·functions/index.js. ★**functions는 `firebase deploy --only functions`로 배포 완료**(git push로는 서버 반영 안 됨).
- **본인 프로필 등급(레벨) 숨김** — MY 탭 프로필 카드에서 운영진 본인도 Lv. 미표시(레벨은 *다른* 회원 평가용). tab-my.js. (명단/팀편성 등 다른 곳은 그대로)
- **'내 활동' 카드 리디자인** (tab-home.js `MyActivitySummaryCard` + 헬퍼 `MyActivityBody`/`useActCountUp`/`actRateColor`/`ActSlotNumber`): 출석/지각/노쇼 비율 **세그먼트 도넛**(초록·노랑·빨강), 가운데 출석률%(값따라 빨강→초록 색변화 카운트업), 출석/지각/노쇼 숫자 **슬롯머신**, 진입 애니메이션. **홈(예정모임 없을 때) + MY 탭 메인** 양쪽 표시(데이터 준비 후 본문 마운트로 애니 재생).
- **홈 모임 카드 fill** (tab-home.js `NextMeetingCard`, prop `fill`): 모임 카드가 **1개일 때만** 하단탭 근처까지 세로로 채움(`.tab-bar` 높이·카드 위치 측정 → minHeight). 내부도 상태별 큰 히어로 — 신청기간=영역 꽉 채우는 큰 신청버튼(flex-1) / 신청완료=큰 체크(120) / 마감후 팀공개=팀색 블록(132)+번호(66). 신청/출석 영역을 flex-1로 늘려 빈 공간 제거. **2개(정기+매칭)·기타 상태는 기존 유지.**

> 그 이전 세션: MY 탭 신설(tab-my.js), 회칙→게시판 통합, 시맨틱버전 v1.0.x, 회비 '가입 월'(duesStartMonth)·명단 '빠른 년생'(isFastYear). / 그 전: 매칭카드 라임색, 개근왕 통계, 모임 보관함(soft-delete, 아래 핵심구조).

## 진행 중 / 다음에 할 일 (내일 사무실에서 이어가기)
- **★키오스크 실기기 확인**: 오늘 전역 모달로 고치고 배포(v341)했으나 사용자 화면에선 아직 "안 뜸". **배포 지연/캐시로 추정**(테스트 시점 라이브가 v340이었음). 내일 **앱 완전 종료 후 재실행/강력 새로고침**으로 v341 받아 확인. 그래도 안 뜨면 실제 버그 → KioskModal 전역 마운트·`attend.isKioskOpen` 전달·`Icon.Tv` 버튼 동작 추적. (member.html 전역 KioskModal, tab-home.js 버튼)
- **보류: '매치 관리' 토글 제거 + 설정 직접 노출** (팀편성 v1.12.0 방식). 사용자가 요청했고 **분석 완료**(워크플로): tab-match.js **284행 `{isAdminMode && isMatchPanelOpen ?` → `{isAdminMode ?`** 로 바꾸고 토글 버튼(272~281행) 제거하면 됨. 회원 뷰(557행 else)는 손대지 말 것. member.html의 자동닫기 `setIsMatchPanelOpen(false)`(842행 근처)·`adminModeLabel`의 '매치 관리 모드'(859행)는 팀탭처럼 **무해한 잔존**으로 그냥 둠. 첫 화면은 matchAdminView 기본 'setup'(use-match.js:7) → 첫 매치표 로드 시 'results' 전환(use-match.js:73). **승인 후 적용.**
- **lab 페이지 정리**: 저장소에 lab-*.html 다수 누적(lab-create, lab-apply, lab-absence, lab-match-rotation, lab-meeting-*, lab-member-now 등). **확정/적용 끝난 것 삭제**(noindex). lab-activity.html은 이미 제거됨.

## 핵심 구조 — 삭제한 모임 보관함 (꼭 이해)
- 모임 삭제 = 영구삭제 아님 → **soft-delete** (`meetings.deleted = true`). 신청·명단(weekly_session)은 복원 위해 **유지**, 출석기록(history)은 `trashed:true`(통계 제외).
- member.html 메인 meetings 스냅샷에서 `deleted` 거름 → `meetings`(일반) / `deletedMeetings`(보관함)으로 분리. 삭제 모임은 홈·목록·활성계산 전부에서 자동 제외.
- 통계 제외: use-attend.js가 history를 `attendHistory`(!trashed)/`attendHistoryTrash`(trashed)로 분리.
- 복원 UI: ① 모임탭 [예정/기록/**보관함**] (tab-attend.js `MeetingArchiveView`) ② 명단>통계>모임별 하단 **휴지통** + 모임 펼치면 "이 기록 통계에서 빼기" 버튼.
- 복원 = `restoreMeeting`(handlers-meetings.js): deleted 해제 + history trashed 해제 + **복원 모임이 현재(활성·미래) 모임이면 syncMirror 재동기화**. ★미러 안 맞추면 키오스크 미표시·운영진 선정이 엉뚱한 모임에 기록됨.

## ⚠️ 이전 실수 (반복 금지 — CLAUDE.md '이전 실수 방지'에도 있음)
1. 공용 에셋/공통 컴포넌트 교체 전 **사용처 먼저 grep**. (icon.png를 덮어 인앱 엠블럼까지 바뀐 적 있음)
2. "삭제 보관/복원" 요청은 **데이터 단위 먼저 확정** (모임 문서 soft-delete vs 부산물 history).
3. **모임 상태(생성/삭제/복원) 변경 시 미러(현재 모임 = settings/meeting_schedule_v2·meeting_schedule_match) 재동기화 항상 고려.**
4. 커밋 메시지에 큰따옴표 있으면 PowerShell 깨짐 → 파일로 쓰고 `git commit -F`.

## 작업 규칙 (요약)
- 코드 수정 → `sw.js` `CACHE_NAME` +1 → commit/push (CLAUDE.md·HANDOFF.md 같은 비런타임 문서는 SW 안 올려도 됨).
- Babel 검증: 세션 스크래치패드에 `@babel/standalone` 설치 후 `Babel.transform(code,{presets:['react']})`. .js는 파일째, member.html/lab 인라인은 `<script type="text/babel">` regex로 추출해 검증.
- 파일 지도(CLAUDE.md) 기준으로 **해당 파일만** 읽기. JSX는 text/babel (단 member-icons.js만 React.createElement).
- STAFF_ROLES = ['회장','매니저','총무','부총무'].

## 알려진 후속/주의
- 이 기능 적용 전(과거 영구삭제된 모임)은 데이터가 없어 보관함에 안 뜸.
- 예전 방식으로 복원해둔 모임이 어긋나 있으면: 모임탭에서 한 번 더 삭제→보관함에서 복원(또는 수정→저장)하면 현재 모임으로 재동기화돼 정상화.
