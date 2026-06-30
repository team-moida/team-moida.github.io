# 핸드오프 (인수인계) — 다음 작업 시작점

> 다른 PC/새 세션에서 이어갈 때 이 파일부터 읽으세요.
> 자세한 작업 규칙·금지사항은 `CLAUDE.md`에 있습니다(꼭 같이 읽기).

**마지막 갱신:** 2026-06-30 · **SW 캐시:** `moida-v303` · **표시버전:** `v1.1.0` · **마지막 커밋:** `0373158`
**라이브:** team-moida/team-moida.github.io · **Firebase:** moida-otpfc
**최종 제품:** `member.html` 통합앱 (회원·운영진·개발자). ※ 옛 독립 관리자 HTML(attendance/roster/team-maker/match/index)은 화제 금지.

---

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

## 진행 중 / 다음에 할 일 (사무실에서 이어가기)
- **홈 모임 카드 fill 미세 조정**(작업 중): 칸별 크기 다듬기 — 신청버튼 **최대 높이 제한** 여부, **날짜 숫자 크기**, 간격, 팀/체크 그래픽 크기 등. 사용자가 실제 화면 보고 피드백 → 조정.
- **lab 페이지 정리**: `lab-meeting.html`(홈 모임카드 히어로 미리보기) + `lab-create.html`(모임 생성 마법사 시안)이 저장소에 있음 → **확정/적용 끝나면 삭제**(noindex). lab-activity.html은 이미 제거됨. ※모임 생성 마법사는 본앱 적용 완료 → lab-create.html은 UI 다듬기 끝나면 삭제.
- fill 적용 후 **상태별 깨짐 점검**: 먼 예정(신청버튼 위주) / 당일·진행중(GPS·QR 출석) / 매칭(라임 카드) / 관리자(수정·삭제) 등 NextMeetingCard 상태가 많음.

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
