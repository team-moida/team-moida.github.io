# 핸드오프 (인수인계) — 다음 작업 시작점

> 다른 PC/새 세션에서 이어갈 때 이 파일부터 읽으세요.
> 자세한 작업 규칙·금지사항은 `CLAUDE.md`에 있습니다(꼭 같이 읽기).

**마지막 갱신:** 2026-06-27 · **SW 캐시:** `moida-v271` · **마지막 커밋:** `8d895c2`
**라이브:** team-moida/team-moida.github.io · **Firebase:** moida-otpfc
**최종 제품:** `member.html` 통합앱 (회원·운영진·개발자). ※ 옛 독립 관리자 HTML(attendance/roster/team-maker/match/index)은 화제 금지.

---

## 가장 최근 세션에 한 일 (v257 → v271, 전부 배포됨)
- 홈 **매칭 모임 카드 = 라임색**(어두운 글자). 날씨·수정버튼·남은시간 배지도 대비 보정. (tab-home.js `NextMeetingCard`, `dark = kind==='match'`)
- **개근왕** 산정 정교화 + **명단탭 [통계] 서브탭**: [회원별](랭킹) / [모임별](월별 묶음·월별 개근왕, 모임 펼치면 출석명단). 회비 대상자 기준. (tab-roster.js `RosterStatsView`)
- **운영진도 선착순 신청 가능**(그 모임 담당자=managerId는 제외, 자동등록됨). (tab-attend.js `showRegister`)
- **홈 모임카드 안에서 바로 신청/취소** + 신청·취소 시 **확인 팝업**. (tab-home.js 카드별 registrations 구독 + `makeRegistrationHandlers(meeting)`, handlers-registration.js의 register/cancel을 `showConfirm`으로 감쌈)
- **공지 권한**: 새 공지에 `authorId` 저장. 개발자=전부 / 그 외=본인 글만 수정·삭제. 전체삭제=개발자만. (member.html `canManageAnnouncement` + tab-notice.js)
- **삭제한 모임 보관함 (soft-delete)** ← 아래 "핵심 구조" 참고
- **팀편성**: 확정 후 드래그/교체로 한 명이라도 옮기면 "확정됨→확정하기"로 해제. (handlers-team.js)
- **앱 아이콘 분리**: `app-icon.png`(모이다)=런처/홈추가, `icon.png`(OTP 엠블럼)=인앱. 섞지 말 것.

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
- Babel 검증: `cd /d/tmp/babel-test && node -e "..."`(@babel/standalone). member.html 인라인은 regex로 추출해 검증.
- 파일 지도(CLAUDE.md) 기준으로 **해당 파일만** 읽기. JSX는 text/babel (단 member-icons.js만 React.createElement).
- STAFF_ROLES = ['회장','매니저','총무','부총무'].

## 알려진 후속/주의
- 이 기능 적용 전(과거 영구삭제된 모임)은 데이터가 없어 보관함에 안 뜸.
- 예전 방식으로 복원해둔 모임이 어긋나 있으면: 모임탭에서 한 번 더 삭제→보관함에서 복원(또는 수정→저장)하면 현재 모임으로 재동기화돼 정상화.
