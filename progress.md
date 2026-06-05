# 분리 작업 진행 현황

## member.html

목표: 500줄 이하로 축소  
원칙: 기능 변경 금지 / UI 변경 금지 / Firestore 구조 변경 금지

---

## member.html 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 3,967줄 | - |
| 1차 분리 완료 | 2,333줄 | -1,634줄 |
| 2차 분리 완료 | 1,819줄 | -514줄 |
| 3차 분리 완료 (현재) | 1,039줄 | -780줄 |
| 목표 | 500줄 이하 | -539줄 더 필요 |

---

## 완료된 분리 작업

### 1차 분리 (2,333줄까지)

| 파일 | 내용 |
|------|------|
| `firebase-init.js` | Firebase 초기화, getCol 전역 함수 |
| `utils.js` | 공통 유틸 함수 (formatBirth, formatPhoneInput, getTeamBadge 등) |
| `member-helpers.js` | 회원 상태 헬퍼 (ADMIN_ROLES, statusConfig, getMembershipStatus 등) |
| `member-icons.js` | 아이콘 모음 (Icon 전역 객체) |
| `location-picker.js` | 지도 장소 선택 모달 컴포넌트 |
| `qr-scanner.js` | QR 스캐너 모달 컴포넌트 |

### 2차 분리 (1,819줄까지)

| 파일 | 내용 |
|------|------|
| `tab-home.js` | 홈 탭 컴포넌트 |
| `tab-team.js` | 팀 편성 탭 컴포넌트 |
| `tab-match.js` | 매치 탭 컴포넌트 |
| `tab-attend.js` | 출석 탭 컴포넌트 |
| `tab-roster.js` | 명단/회비 탭 컴포넌트 |
| `modals.js` | 모든 모달 모음 컴포넌트 (12개) |

### 3차 분리 (1,039줄까지) ← 이번 세션

| 파일 | 내용 |
|------|------|
| `handlers-attend.js` | 출석/QR/GPS 핸들러 팩토리 (makeQRGPSHandlers, makeAttendHandlers) |
| `handlers-roster.js` | 회원/회비 핸들러 팩토리 (makeRosterHandlers) |
| `handlers-team.js` | 팀 편성 핸들러 팩토리 (makeTeamHandlers) |
| `handlers-match.js` | 매치 핸들러 팩토리 (makeMatchHandlers) |

**핸들러 분리 방식**: 각 파일은 `makeXxxHandlers(ctx)` 팩토리 함수를 전역으로 노출.  
App 컴포넌트에서 렌더 시마다 팩토리를 호출해 최신 상태 값을 클로저로 캡처.

---

## 현재 상태

**push 완료.** 1,039줄.

현재 member.html App 컴포넌트에 남아있는 내용 (구성):

| 항목 | 예상 줄 수 | 이동 가능 여부 |
|------|------------|----------------|
| HTML head + script 태그 | ~48줄 | 불가 |
| `useState` 상태 선언 | ~138줄 | 불가 (React 규칙) |
| `useEffect` 훅 | ~227줄 | 불가 (React 규칙) |
| `useMemo` 계산값 | ~156줄 | 로직 일부 외부화 가능 |
| 소형 함수 (toggleTheme 등) | ~30줄 | 이동 가능 |
| 팩토리 호출 4개 | ~55줄 | 유지 |
| JSX 렌더 (헤더 + 탭 + 토스트) | ~180줄 | 컴포넌트화 가능 |
| ReactDOM + script 닫기 | ~5줄 | 불가 |

---

## 다음 단계 (1,039줄 → 500줄)

500줄까지 ~540줄을 더 줄여야 함.

### 방법 A: custom hook 미사용 (제약 유지)

| 작업 | 방법 | 예상 절감 |
|------|------|-----------|
| 헤더 JSX 컴포넌트화 | `MemberHeader.js` 신규 | ~55줄 |
| `useMemo` 로직 외부화 | 순수 계산 함수 → 외부 파일, useMemo 래퍼만 유지 | ~80줄 |

→ 합계 ~135줄 절감 → **최종 약 904줄** (500줄 도달 불가)

### 방법 B: custom hook 도입 (제약 완화)

`useState` + `useEffect` 그룹을 custom hook으로 분리:

| 후보 hook 파일 | 내용 | 예상 절감 |
|----------------|------|-----------|
| `useAppState.js` | 모든 useState 선언 | ~138줄 |
| `useFirebaseSubscriptions.js` | Firebase onSnapshot useEffect 모음 | ~150줄 |
| `useAttendComputed.js` | 출석 관련 useMemo 계산값 | ~60줄 |

→ 합계 ~350줄 절감 → **최종 약 554줄**  
→ 헤더/useMemo 외부화까지 합하면 **500줄 이하 도달 가능**

> **결론**: 500줄 목표는 custom hook 도입 없이는 달성 불가.  
> 다음 세션에서 "hooks는 App 내부에만" 제약 완화 여부를 결정해야 함.

---

## 분리 원칙 (현재 유지 중)

- 외부 파일은 순수 함수 또는 순수 컴포넌트만 가능
- `useState`, `useEffect`는 App 컴포넌트 내부에만 사용
- 모든 상태는 App에서 관리하고 props로 전달
- 전역 함수(`utils.js`, `member-helpers.js` 등)는 props 불필요

---

---

# attendance.html 분리 작업 진행 현황

목표: attendance.html 500줄 이하로 축소  
원칙: 기능 변경 금지 / UI 변경 금지 / Firestore 구조 변경 금지

---

## attendance.html 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 2,011줄 | - |
| 1단계 완료 | 1,666줄 | -345줄 |
| 2단계 완료 (현재) | 1,595줄 | -71줄 |
| 3단계 완료 예정 | ~1,597줄 | -100줄 |
| 4단계 완료 예정 | ~1,537줄 | -60줄 |
| 5단계 완료 예정 | ~1,457줄 | -80줄 |
| 6단계 완료 예정 | ~1,267줄 | -190줄 |
| 7단계 완료 예정 | ~1,027줄 | -240줄 |
| 추가단계 완료 예정 | ~220줄 | -807줄 |
| 목표 | 500줄 이하 | - |

---

## 분리 계획 (미완료)

### 1단계 — 지도 분리

| 항목 | 내용 |
|------|------|
| 예상 파일 | `location-picker.js` (기존 파일 공유) |
| 절감 | -244줄 |
| 작업 | attendance.html 내부 LocationPickerModal 코드 삭제, script 태그 추가 |
| 위험 | member.html 버전과 코드 차이 확인 필요 |

### 2단계 — 공통 코드 정리

| 항목 | 내용 |
|------|------|
| 예상 파일 | `member-icons.js`, `utils.js` / `attend-helpers.js` (기존 파일 공유) |
| 절감 | -70줄 |
| 작업 | Icon 객체, getThisSunday·getMembershipStatus 등 헬퍼 함수 외부화 |
| 위험 | 함수 이름 충돌 여부 확인 필요 |

### 3단계 — 출석 기록 탭 분리

| 항목 | 내용 |
|------|------|
| 예상 파일 | `tab-attend-history.js` (신규) |
| 절감 | -100줄 |
| 작업 | 기록 탭 JSX 전체 컴포넌트화 |
| 위험 | 없음 (다른 기능과 연결 없음) |

### 4단계 — QR 출석 분리

| 항목 | 내용 |
|------|------|
| 예상 파일 | `handlers-attend-qr.js` (신규) |
| 절감 | -60줄 |
| 작업 | QR 생성 함수 + QR 모달 외부화 |
| 위험 | 모임 날짜/시간 데이터 전달 필요 |

### 5단계 — 회원 관리 (가입 신청) 분리

| 항목 | 내용 |
|------|------|
| 예상 파일 | `handlers-attend-member.js` (신규) |
| 절감 | -80줄 |
| 작업 | 가입 신청 모달 + 승인/거절 함수 외부화 |
| 위험 | 없음 |

### 6단계 — 설정 + 선정 탭 분리

| 항목 | 내용 |
|------|------|
| 예상 파일 | `tab-attend-setup.js` (신규) |
| 절감 | -190줄 |
| 작업 | 선정 탭 JSX 전체 (모임 설정 + 회원 선정 + 게스트 추가 + 회비 필터) 컴포넌트화 |
| 위험 | 테스트 모드 설정 백업 로직 연결 주의 |

### 7단계 — 출석 탭 분리

| 항목 | 내용 |
|------|------|
| 예상 파일 | `tab-attend-main.js` (신규) |
| 절감 | -240줄 |
| 작업 | 출석 탭 JSX 전체 (팀별 카드 + 명단 + 체크인 모달) 컴포넌트화 |
| 위험 | 팀 배정 + 출석 데이터 동시 사용, 가장 복잡 |

### 추가 단계 — 모달 묶음 분리 (500줄 달성)

| 항목 | 내용 |
|------|------|
| 예상 파일 | `modals-attend.js` (신규) |
| 절감 | -400줄 |
| 작업 | 출석·게스트·기록 편집·QR·공지·가입 신청·알림 모달 7개 외부화 |
| 위험 | 모달별 상태 전달 누락 시 동작 안 함 |

---

## 현재 상태

**2단계 완료. 1,595줄.**

---

## 분리 원칙

- 외부 파일은 순수 함수 또는 순수 컴포넌트만 가능
- `useState`, `useEffect`는 App 컴포넌트 내부에만 사용
- 모든 상태는 App에서 관리하고 props로 전달
- 전역 함수(`utils.js` 등)는 props 불필요
