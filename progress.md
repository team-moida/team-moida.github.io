# 분리 작업 진행 현황

---

# attendance.html ✅ 목표 달성

목표: 500줄 이하 / 원칙: 기능·UI·Firestore 구조 변경 금지

## 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 2,011줄 | - |
| 1단계 | 1,666줄 | -345줄 |
| 2단계 | 1,595줄 | -71줄 |
| 3단계 | 1,615줄 | +20줄 |
| 4단계 | 1,591줄 | -24줄 |
| 5단계 | 1,539줄 | -52줄 |
| 6단계 | 1,368줄 | -171줄 |
| 7단계 | 1,133줄 | -235줄 |
| 8단계 | 891줄 | -242줄 |
| 9단계 | 578줄 | -313줄 |
| 10단계 (현재) | **492줄** | -86줄 |
| 목표 | 500줄 이하 | ✅ 달성 |

## 완료된 분리 파일

| 파일 | 내용 |
|------|------|
| `location-picker.js` | 지도 장소 선택 모달 (member.html 공유) |
| `tab-attend-history.js` | 기록 탭 컴포넌트 |
| `handlers-attend-qr.js` | QR 생성 핸들러 + QRModal |
| `handlers-attend-member.js` | 가입 신청 승인/거절 핸들러 + PendingModal |
| `tab-attend-setup.js` | 선정 탭 컴포넌트 (모임 설정 + 회원 선정 + 게스트) |
| `tab-attend-main.js` | 출석 탭 컴포넌트 (시계 + 팀카드 + 명단 + 대기자) |
| `modals-attend.js` | CheckInModal, NotifModal, GuestModal, HistoryEditModal, AlertModal |
| `handlers-attend-session.js` | makeAttendSessionHandlers — 14개 핸들러 팩토리 |
| `AttendNavBar.js` | nav 바 컴포넌트 (isMoreMenuOpen 상태 내부 관리) |
| `attendance.css` | 페이지 전용 스타일 (폰트, 다크모드 오버라이드, Leaflet 등) |

## 분리 원칙

- 외부 파일: 순수 함수 또는 순수 컴포넌트만
- `useState`, `useEffect`는 App 컴포넌트 내부에만
- 모든 상태는 App에서 관리, props로 전달
- 전역 함수(`utils.js` 등)는 props 불필요

---

# roster.html — 진행 중

목표: 500줄 이하 / 원칙: 기능·UI·Firestore 구조 변경 금지

## 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 696줄 | - |
| 1단계 | 614줄 | -82줄 |
| 2단계 | 451줄 | -163줄 |
| 3단계 (현재) | **354줄** | -97줄 |
| 목표 | 500줄 이하 | ✅ 달성 |

## 완료된 분리 파일

| 파일 | 내용 |
|------|------|
| `roster-utils.js` | 회비 기간 계산, 상태 분류, 아이콘, 상태 설정(statusConfig) |
| `roster-members.js` | DirectoryTab, AddMemberModal, EditMemberModal, ResignModal |
| `roster-payment.js` | PaymentTab(회비 탭 화면), PaymentActionModal(납부/휴식 액션 모달) |

## 남은 작업

| 파일 | 상태 | 비고 |
|------|------|------|
| `roster-rest.js` | 계획 취소 권장 | processAction 내부에 납부와 혼재 — 별도 분리 불필요 |
| `roster-admin.js` | 계획 취소 권장 | 한 줄 조건만 존재 — 별도 파일 의미 없음 |

---

# member.html — 진행 중

목표: 500줄 이하 / 원칙: 기능·UI·Firestore 구조 변경 금지

## 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 3,967줄 | - |
| 1차 분리 | 2,333줄 | -1,634줄 |
| 2차 분리 | 1,819줄 | -514줄 |
| 3차 분리 (현재) | 1,039줄 | -780줄 |
| 목표 | 500줄 이하 | -539줄 더 필요 |

## 완료된 분리 파일

| 파일 | 내용 |
|------|------|
| `firebase-init.js` | Firebase 초기화, getCol 전역 함수 |
| `utils.js` | 공통 유틸 (formatBirth, formatPhoneInput, getTeamBadge 등) |
| `member-helpers.js` | 회원 상태 헬퍼 (ADMIN_ROLES, statusConfig, getMembershipStatus 등) |
| `member-icons.js` | 아이콘 모음 (Icon 전역 객체) |
| `location-picker.js` | 지도 장소 선택 모달 |
| `qr-scanner.js` | QR 스캐너 모달 |
| `tab-home.js` | 홈 탭 컴포넌트 |
| `tab-team.js` | 팀 편성 탭 컴포넌트 |
| `tab-match.js` | 매치 탭 컴포넌트 |
| `tab-attend.js` | 출석 탭 컴포넌트 |
| `tab-roster.js` | 명단/회비 탭 컴포넌트 |
| `modals.js` | 모든 모달 모음 (12개) |
| `handlers-attend.js` | 출석/QR/GPS 핸들러 팩토리 |
| `handlers-roster.js` | 회원/회비 핸들러 팩토리 |
| `handlers-team.js` | 팀 편성 핸들러 팩토리 |
| `handlers-match.js` | 매치 핸들러 팩토리 |

## 현재 App에 남아있는 내용

| 항목 | 예상 줄 수 | 이동 가능 여부 |
|------|------------|----------------|
| HTML head + script 태그 | ~48줄 | 불가 |
| `useState` 상태 선언 | ~138줄 | custom hook으로만 이동 가능 |
| `useEffect` 훅 | ~227줄 | custom hook으로만 이동 가능 |
| `useMemo` 계산값 | ~156줄 | 로직 일부 외부화 가능 |
| 소형 함수 (toggleTheme 등) | ~30줄 | 이동 가능 |
| 팩토리 호출 4개 | ~55줄 | 유지 |
| JSX 렌더 (헤더 + 탭 + 토스트) | ~180줄 | 컴포넌트화 가능 |
| ReactDOM + script 닫기 | ~5줄 | 불가 |

## 다음 단계 선택지

### 방법 A: custom hook 미사용 (현재 원칙 유지)

| 작업 | 방법 | 예상 절감 |
|------|------|-----------|
| 헤더 JSX 컴포넌트화 | `MemberHeader.js` 신규 | ~55줄 |
| `useMemo` 로직 외부화 | 순수 계산 함수 → 외부 파일 | ~80줄 |

→ 합계 ~135줄 절감 → **최종 약 904줄** (500줄 도달 불가)

### 방법 B: custom hook 도입 (원칙 완화 필요)

| 후보 파일 | 내용 | 예상 절감 |
|-----------|------|-----------|
| `useAppState.js` | 모든 useState 선언 | ~138줄 |
| `useFirebaseSubscriptions.js` | Firebase onSnapshot useEffect | ~150줄 |
| `useAttendComputed.js` | 출석 관련 useMemo | ~60줄 |

→ 합계 ~350줄 + 헤더/useMemo 외부화 = **500줄 이하 도달 가능**

> **결론**: custom hook 도입 없이 500줄 불가. 다음 세션에서 방향 결정 필요.
