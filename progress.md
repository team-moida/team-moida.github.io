# member.html 분리 작업 진행 현황

목표: member.html 500줄 이하로 축소
원칙: 기능 변경 금지 / UI 변경 금지 / Firestore 구조 변경 금지

---

## 줄 수 변화

| 단계 | 줄 수 |
|------|-------|
| 원본 | 3,967줄 |
| 이전 세션 완료 후 | 2,333줄 |
| 이번 세션 완료 후 | 1,819줄 |
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

---

## 현재 상태

작업 중단 아님. push 완료된 상태.

단, **웹 접속 시 아무것도 안 뜨는 오류** 발생 중 → 원인 미확인, 점검 필요.

---

## 남은 작업 (1,819줄 → 500줄)

현재 member.html에 남아있는 내용:

- App 컴포넌트 상태 선언 (useState 수십 개)
- useEffect 훅 (Firebase 구독, QR 생성 등)
- 핸들러 함수 (handleAddMember, processAction, attendHandleCheckIn 등)
- 메인 JSX (탭 네비게이션 + 각 탭 컴포넌트 호출)

### 분리 가능한 후보

| 후보 파일 | 내용 | 예상 절감 |
|-----------|------|-----------|
| `handlers-roster.js` | 회원/회비 관련 핸들러 함수 | ~150줄 |
| `handlers-attend.js` | 출석 관련 핸들러 함수 | ~150줄 |
| `handlers-match.js` | 매치 관련 핸들러 함수 | ~200줄 |
| `tab-nav.js` | 탭 네비게이션 JSX | ~100줄 |

> 핸들러는 hooks(useState 등)를 직접 쓰지 않으므로 외부 파일 분리 가능.
> useEffect와 useState 선언은 App 내부에 유지 필요.

---

## 구조 원칙 (변경 불가)

- 외부 파일은 순수 함수 또는 순수 컴포넌트만 가능
- hooks(useState, useEffect)는 App 컴포넌트 내부에만 사용
- 모든 상태는 App에서 관리하고 props로 전달
- 전역 함수(utils.js 등)는 props 불필요
