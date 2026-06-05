# member.html 분리 작업 진행 현황

목표: member.html 500줄 이하로 축소
원칙: 기능 변경 금지 / UI 변경 금지 / Firestore 구조 변경 금지

---

## 줄 수 변화

| 단계 | 줄 수 |
|------|-------|
| 원본 | 3,967줄 |
| 이전 세션 완료 후 | 2,333줄 |
| 이전 세션 완료 후 2 | 1,819줄 |
| 이번 세션 완료 후 | 1,039줄 |
| 목표 | 500줄 이하 |

---

## 완료된 분리 작업

| 파일 | 내용 |
|------|------|
| `firebase-init.js` | Firebase 초기화, getCol 전역 함수 |
| `utils.js` | 공통 유틸 함수 (formatBirth, formatPhoneInput, getTeamBadge 등) |
| `member-helpers.js` | 회원 상태 헬퍼 (ADMIN_ROLES, statusConfig, getMembershipStatus 등) |
| `member-icons.js` | 아이콘 모음 (Icon 전역 객체) |
| `location-picker.js` | 지도 장소 선택 모달 컴포넌트 |
| `qr-scanner.js` | QR 스캐너 모달 컴포넌트 |
| `tab-home.js` | 홈 탭 컴포넌트 |
| `tab-team.js` | 팀 편성 탭 컴포넌트 |
| `tab-match.js` | 매치 탭 컴포넌트 |
| `tab-attend.js` | 출석 탭 컴포넌트 |
| `tab-roster.js` | 명단/회비 탭 컴포넌트 |
| `modals.js` | 모든 모달 모음 컴포넌트 (12개) |
| `handlers-roster.js` | 회원/회비 핸들러 팩토리 (makeRosterHandlers) |
| `handlers-attend.js` | 출석/QR/GPS 핸들러 팩토리 (makeQRGPSHandlers, makeAttendHandlers) |
| `handlers-team.js` | 팀 편성 핸들러 팩토리 (makeTeamHandlers) |
| `handlers-match.js` | 매치 핸들러 팩토리 (makeMatchHandlers) |

---

## 현재 상태

이번 세션 작업 완료. push 완료된 상태.

**이전 오류 (웹 접속 시 아무것도 안 뜨는 오류)** - 이전 세션 기록, 현재 상태 미확인.

---

## 남은 작업 (1,039줄 → 500줄)

현재 member.html에 남아있는 내용:

- App 컴포넌트 상태 선언 (useState ~138줄) → 이동 불가
- useMemo 계산값 (~156줄) → 로직 분리 가능
- useEffect 훅 (~227줄) → 이동 불가 (hooks 제약)
- registerFcmToken, toggleTheme 등 소형 함수 (~30줄)
- 팩토리 호출 (~55줄)
- JSX 렌더 (~180줄)

### 분리 가능한 후보 (500줄 도달하려면 ~540줄 추가 절감 필요)

| 후보 방법 | 내용 | 예상 절감 |
|-----------|------|-----------|
| `useMemo` 로직 외부화 | 순수 함수로 분리, useMemo 래퍼만 유지 | ~80줄 |
| 헤더 JSX 컴포넌트화 | `MemberHeader.js` | ~50줄 |
| custom hook 도입 (제약 완화 필요) | useState/useEffect 그룹 분리 | ~350줄 |

> **500줄 달성 한계**: useState/useEffect를 App 내부에만 유지하는 제약 때문에
> custom hook 없이는 약 800~900줄이 현실적인 하한선.
> 500줄 목표는 custom hook 도입 필요. 다음 세션에 논의 필요.

---

## 구조 원칙 (변경 불가)

- 외부 파일은 순수 함수 또는 순수 컴포넌트만 가능
- hooks(useState, useEffect)는 App 컴포넌트 내부에만 사용
- 모든 상태는 App에서 관리하고 props로 전달
- 전역 함수(utils.js 등)는 props 불필요
