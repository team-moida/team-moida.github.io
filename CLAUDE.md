# CLAUDE.md — OTP FC 모이다 프로젝트

## 프로젝트 개요

아마추어 혼성 풋살팀 **OTP FC**의 운영 관리 웹앱 **"모이다"**

- **GitHub Pages 호스팅**: `https://nakdo0415-crypto.github.io/moida/`
- **로컬 경로**: `c:\Users\nakdo\moida` (집/사무실 공통)
- **Firebase 프로젝트**: `moida-otpfc` (Firestore + Anonymous Auth)
- **배포 방법**: Claude Code Stop 훅 자동 커밋 & 푸시 (대화 종료 시 자동 반영)

### 자동 배포 설정 (`.claude/settings.json`)
- Claude Code 대화가 끝날 때마다 `git add -A → git commit → git push` 자동 실행
- 훅 경로는 `git rev-parse --show-toplevel` 기준 → **집/사무실 경로 달라도 동일 동작**
- 설정 파일이 git에 포함되므로 `git pull` 한 번이면 사무실도 동일 환경 적용됨
- `settings.local.json`은 머신별 오버라이드용 — 현재 비어 있음 (공통 설정만 사용)

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| UI 프레임워크 | React 18 (CDN UMD) + Babel Standalone (브라우저 JSX 트랜스파일) |
| 스타일 | Tailwind CSS (CDN) |
| 데이터베이스 | Firebase Firestore (compat v9.23.0) |
| 인증 | Firebase Anonymous Auth |
| 지도 | Leaflet.js + OpenStreetMap |
| 장소 검색 | 카카오 REST API + corsproxy.io (도메인 등록 없이 사용) |
| PWA | manifest.json + sw.js |

---

## 파일 구성

| 파일 | 역할 |
|------|------|
| `index.html` | 통합 홈 허브 (각 페이지 링크) |
| `attendance.html` | 관리자용 — 출석 체크, 회원 선정, 세션 기록 관리 |
| `roster.html` | 관리자용 — 회원 명단 + 회비 관리 |
| `team-maker.html` | 관리자용 — 균등 팀 자동 편성, 임시저장/확정 |
| `match.html` | 관리자용 — 매치 일정 자동 생성 |
| `member.html` | 회원용 — 출석/팀/매치 확인, 이름+생년월일 로그인 |
| `manifest.json` | PWA 설정 |
| `sw.js` | Service Worker |

---

## Firestore 컬렉션 구조

기본 경로: `artifacts/moida-otpfc/public/data/` 하위

| 컬렉션 | 내용 |
|--------|------|
| `members` | 회원 명단 |
| `weekly_session` | 당일 출석 세션 |
| `history` | 출석 기록 |
| `settings` (doc: `meeting_schedule_v2`) | 모임 일정 |
| `monthly_checks` | 월별 회비 납부 |
| `team_drafts` | 팀 편성 결과 (`isConfirmed: true/false`) |
| `court_presets` | 구장 프리셋 |
| `match_schedules` | 매치 테이블 |
| `pending_registrations` | 가입 신청 (현재 미사용) |

### members 컬렉션 필드

`name`, `birth`(8자리 YYYYMMDD), `gender`, `phone`, `joinDate`, `address`, `level`(1~12), `position`(all/피보/아라/픽소/골레이로), `role`(회원/회장/매니저/총무/부총무), `coupleId`(파트너 doc ID), `isResigned`, `resignDate`, `membershipType`, `membershipEndDate`, `totalRestMonths`, `isSpecialRest`

---

## 우리가 정한 개발 규칙

### 세션 시작 시 자동 요약
- `/clear` 후 새 대화가 시작되면, **첫 응답 맨 앞에** 메모리 파일(`project_moida_otpfc.md`)을 읽고 마지막으로 완료된 작업을 아래 형식으로 먼저 보여줄 것
- 형식: `📌 마지막 작업: [작업 내용 1~2줄]`
- 그 다음에 사용자 요청에 응답할 것

### 문서 관리
- **새 규칙이 생길 때마다 이 CLAUDE.md 업데이트** — 별도 요청 없이도 자동으로 반영
- 기능 구현 완료 시 메모리 파일(`project_moida_otpfc.md`)도 함께 업데이트

### 코드 품질
- **코드 전달 전 반드시 검수** — 이전에 검색창 클릭 안 되는 버그가 있었음
- 기능 구현 후 직접 검토 후 전달할 것

### 크로스 플랫폼 호환성 (절대 원칙)
- **모든 기능은 수정 시 항상 PC, 모바일은 물론 Windows, macOS, Android, iOS 등 모든 환경에서 작동해야 한다** — 예외 없음
  - PC: Windows, macOS
  - 모바일: Android, iOS
  - 태블릿: Android, iOS
- 기능 추가·수정 시 반드시 크로스 플랫폼 동작 여부를 검토하고 전달할 것
- 터치 이벤트 / 마우스 이벤트 모두 지원 (Pointer Events 권장)
- 반응형 레이아웃: viewport 설정 필수, 미디어 쿼리 활용
- 작은 화면에서 탭/버튼 크기 최소 44×44px (터치 UX) — 터치 영역이 작으면 전체 행을 클릭 가능하게 처리
- 장시간 사용 시 배터리 고려: 불필요한 스크롤 리스너, 애니메이션 최소화
- 모바일 키보드 자동 팝업 제어: input focus 시 유의

### CSS/스타일
- `body`에 `user-select: none` 전역 적용됨 → **모달 input에는 반드시 `userSelect:'text'` 명시**
- Tailwind CDN 사용 중 → z-index 문제 시 **inline style로 처리** (Tailwind z-index 클래스 우선순위 문제)

### 팀 관련 상수
- **팀 색상**: 핑크(A) / 하늘(B) / 연두(C) / 노랑(D) / 파랑(E) / 빨강(F)
- **팀 이름**: `String.fromCharCode(65 + idx)` → A, B, C...
- **조끼 번호(Jersey)**: `team.members` 배열 내 인덱스 + 1 (1-based)

### 날짜 처리
- 오늘 날짜: `new Date()`로 로컬 기준 YYYY-MM-DD 계산 (UTC `toISOString()` 사용 금지 — 시차 오류)
- `isPastMeeting`: `displayedMeetingDate < today` (문자열 비교, 둘 다 YYYY-MM-DD 형식)

### 출석 판정 기준 (모임 08:00 시작 기준 예시)
| 상태 | 체크인 시간 | 계산식 |
|------|------------|--------|
| 정상 | 06:50:00 ~ 07:51:00 | `allowFrom(시작-70분)` ~ `normalThreshold(시작-9분)` |
| 지각 | 07:51:01 ~ 10:00:00 | `normalThreshold` 초과 ~ `meetingEnd` |
| 노쇼 | 미체크인 | 모임 종료 시 자동 처리 |
| 노쇼(1만원) | 전날 22:00 이후 통보 | 운영진 수동 설정 |
| 노쇼(2만원) | 당일 00:00~모임 직전 통보 | 운영진 수동 설정 |

- `allowFrom = meetingStart - 70분` (체크인 창 열림)
- `normalThreshold = meetingStart - 9분` (정상/지각 경계)
- `meetingEnd` 이후 수동 체크인 불가 (자동 노쇼 처리 완료)
- 테스트 모드: 시작 12분 후, 종료 시작+5분 → 지금부터 3분 이내=정상, 3분 초과=지각

### 로그인 (member.html)
- 이름 + YYMMDD 6자리 생년월일로 로그인
- Firestore `members`에서 name 쿼리 → `birth.substring(2)` 비교
- localStorage에 `{ memberId, name }` 저장 → 자동 로그인
- `pending_registrations` 더 이상 사용 안 함

### 지도/검색
- Nominatim(OpenStreetMap)은 한국 업체명 검색 불가 → 카카오 REST API 사용
- 카카오 JavaScript SDK는 도메인 등록 필요 → REST API + corsproxy.io 방식 사용
- 카카오 REST API 키: `bdebf2ece4ae2d9315448ec55001d7b2`

---

## 현재 구현 상태 (2026-06-01 기준)

### team-maker.html
- 팀 자동 편성 (레벨 균등 + 커플 분리 로직)
- 팀원 카드에 순번(1, 2, 3...) 표시
- 재편성 버튼 (`reGenerateTeams`)
- **임시저장** (`saveDraft`): Firestore `team_drafts`에 `isConfirmed: false`로 저장
- **날짜 표시**: 결과 탭 상단에 `displayedMeetingDate` 표시
- **열람/편집 모드**: 오늘 이전 날짜 = 열람 전용(드래그/버튼 비활성), 이후 = 편집 가능
- **저장소 탭 서브탭**: "✓ 확정 기록" / "💾 임시 저장" 분리
- **미리보기 모달**: 바텀시트로 팀 구성 전체 표시, 불러오기/열람하기 버튼

### attendance.html
- 모임 설정: 장소 입력 + 지도 핀 버튼 (LocationPickerModal)
- 지도 클릭/드래그, GPS 현재위치, 카카오 업체명 검색
- 기록 상세에서 카카오맵 링크 표시
- **출석 탭 팀별 카드 뷰**:
  - 팀 헤더: 색상 배지 + 팀명 + 출석N/전체N + 조끼색상명
  - 회원 카드 2열 그리드: 팀 색상 배경, 조끼 번호 흐리게 뒤에 표시
  - 출석 시 상단 초록 스트라이프 + ✓ 뱃지
  - 미편성/게스트 별도 섹션, 팀 없을 시 기존 플랫 리스트 fallback

### roster.html
- 회원 카드: 전화번호(자동포맷), 가입일, 거주지, 커플 파트너 이름 표시
- 추가/수정 모달: 전화번호/생년월일 자동 포맷
- 커플 연결 드롭다운

### member.html
- 이름 + YYMMDD 로그인 (기기 ID 기반 등록 신청 제거)
- 로그아웃 버튼 (헤더 우측 상단)
- 팀 정보: 조끼 번호 + 색상 표시 ("A팀 1번 / 핑크 조끼")

---

## 핵심 코드 패턴

### 오늘 날짜 (로컬 기준)
```js
const today = (()=>{
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})();
```

### 팀 색상 이름
```js
const getTeamColorName = (index) => ['핑크','하늘','연두','노랑','파랑','빨강'][index] || '';
```

### member.html 로그인
```js
const handleLogin = async () => {
  const birth6 = loginForm.birth.replace(/[^0-9]/g, '').slice(0, 6);
  const snap = await getCol('members').where('name', '==', loginForm.name.trim()).get();
  let found = null;
  snap.forEach(doc => {
    const data = doc.data();
    if (data.isResigned) return;
    const b = String(data.birth || '');
    if (b.substring(2) === birth6 || b === birth6) found = { id: doc.id, ...data };
  });
  // ...
};
```

### groupedTeams (attendance.html)
```js
const groupedTeams = useMemo(() => {
  if (!activeTeamData?.teams) return [];
  return activeTeamData.teams.map((t, teamIdx) => {
    const members = t.members.map((tm, mi) => {
      const p = activeParticipants.find(p => p.memberId === (tm.memberId||tm.id));
      return p ? { ...p, jerseyNumber: mi + 1 } : null;
    }).filter(Boolean);
    return members.length > 0 ? { teamName: String.fromCharCode(65+teamIdx), teamIdx, members } : null;
  }).filter(Boolean);
}, [activeParticipants, activeTeamData]);
```
