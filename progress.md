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

# roster.html ✅ 목표 달성

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

## 취소된 작업

| 파일 | 비고 |
|------|------|
| `roster-rest.js` | processAction 내부에 납부와 혼재 — 별도 분리 불필요 |
| `roster-admin.js` | 한 줄 조건만 존재 — 별도 파일 의미 없음 |

---

# team-maker.html ✅ 목표 달성

목표: 500줄 이하 / 원칙: 기능·UI·Firestore 구조 변경 금지

## 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 909줄 | - |
| 1단계 (현재) | **285줄** | -624줄 |
| 목표 | 500줄 이하 | ✅ 달성 |

## 완료된 분리 파일

| 파일 | 내용 |
|------|------|
| `team-utils.js` | 아이콘 모음 (Icon 전역 객체) |
| `team-export.js` | 이미지 저장 (captureTeams 함수) |
| `team-balance.js` | 팀 편성 알고리즘 (buildTeams) + 편성 탭 화면 (GeneratorTab) |
| `team-dragdrop.js` | 드래그·클릭 이동 핸들러 (makeTeamMoveHandlers) + 결과 탭 화면 (ResultsTab) |
| `team-storage.js` | 임시저장·확정 핸들러 (makeTeamStorageHandlers) + 기록 탭 (StorageTab) + 미리보기 모달 (PreviewModal) |

---

# member.html ✅ 목표 달성

목표: 500줄 이하 / 원칙: 기능·UI·Firestore 구조 변경 금지

## 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 3,967줄 | - |
| 1차 분리 | 2,333줄 | -1,634줄 |
| 2차 분리 | 1,819줄 | -514줄 |
| 3차 분리 | 1,039줄 | -780줄 |
| 4차 분리 (현재) | **497줄** | -542줄 |
| 목표 | 500줄 이하 | ✅ 달성 |

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
| `member-header.js` | 헤더 JSX 컴포넌트 (모임 정보 + 버튼 바) |
| `use-roster.js` | 명단/회비 기능 custom hook (state + Firebase 구독 + computed) |
| `use-team.js` | 팀 편성 기능 custom hook (state + Firebase 구독 + computed) |
| `use-match.js` | 매치 기능 custom hook (state + Firebase 구독 + computed) |
| `use-attend.js` | 출석 기능 custom hook (state + Firebase 구독 + computed) |
| `use-fcm.js` | FCM/알림 + 공지사항 custom hook |

## 분리 원칙 (4차)

- 기능별 custom hook: useState + useEffect + useMemo를 기능 단위로 묶음
- 각 hook은 `isAdminMode`, `meetingSettings` 등 최소 의존성만 props로 받음
- App은 hook 결과를 조합해 핸들러 팩토리와 JSX에 전달하는 역할만 수행

---

# match.html ✅ 목표 달성

목표: 500줄 이하 / 원칙: 기능·UI·Firestore 구조 변경 금지

## 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 631줄 | - |
| 1단계 (현재) | **263줄** | -368줄 |
| 목표 | 500줄 이하 | ✅ 달성 |

## 완료된 분리 파일

| 파일 | 내용 |
|------|------|
| `match/match-utils.js` | 아이콘 모음 (Icon 전역 객체) + splitTime/hoursList/minutesList + PresetModal |
| `match/match-generator.js` | 경기 일정 생성 알고리즘 (generateSchedule) + 설정 탭 화면 (SetupTab) |
| `match/match-results.js` | 매치표 탭 화면 (ResultsTab) + 기록 불러오기 모달 (LoadModal) |
| `match/match-score.js` | 통계 계산 (computeStats) + 통계 탭 화면 (StatsTab) |
| `match/match-export.js` | 이미지 저장 함수 (captureMatchTable) |

## 분리 원칙

- 순수 함수(generateSchedule, computeStats, captureMatchTable)와 순수 컴포넌트(SetupTab, ResultsTab, StatsTab, LoadModal, PresetModal)만 외부 파일로 분리
- 모든 상태(useState, useEffect, useMemo)는 App 컴포넌트 내부에 유지
- match/ 서브폴더 구조 적용

---

# index.html ✅ 목표 달성

목표: 500줄 이하 / 원칙: 기능·UI 변경 금지

## 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 646줄 | - |
| 1단계 (현재) | **249줄** | -397줄 |
| 목표 | 500줄 이하 | ✅ 달성 |

## 완료된 분리 파일

| 파일 | 내용 |
|------|------|
| `index.css` | 애니메이션, 다크모드 CSS 변수 및 오버라이드 |
| `handlers-kakao.js` | 카카오 로그인·회원가입·계정연결 핸들러 + 앱 초기화 + 다크모드 토글 |

## 분리 원칙

- 다크모드 flash 방지 inline script(`<head>`)는 index.html에 유지
- Firebase 초기화는 기존 `firebase-init.js` 재사용 (`STAFF_ROLES` 공유)
- JS 파일은 body 최하단에서 로드 (DOM 완성 후 실행 보장)

---

# 기능 추가 이력

## 2026-06-05~06

### member.html 출석 탭 — 새 모임 만들기

수정 파일: `handlers-attend.js`, `tab-attend.js`, `member.html`

- 출석 탭 모임 설정 영역(관리자 모드)에 **새 모임** 버튼 추가
- 동작 순서:
  1. 확인 대화상자 표시
  2. 현재 날짜 기록이 history에 없으면 자동 저장
  3. `weekly_session` 현재 날짜 참가자 전체 삭제
  4. `meeting_schedule_v2`를 다음 일요일 + 08:00~10:00으로 초기화
- `handlers-attend.js`: `attendHandleCreateNew` 함수 추가 (makeAttendHandlers 반환 객체에 포함)
- `tab-attend.js`: 모임 설정 카드 헤더에 버튼 렌더링
- `member.html`: `attendHandleCreateNew` 구조분해 추가 + TabAttend props 전달

### member.html 출석 탭 — 출석 관리 버튼 레이아웃 조정

수정 파일: `tab-attend.js`

- "⚙️ 출석 관리" 버튼을 좌측 상단 → 우측으로 이동
- 좌측에 "출석" 레이블 추가
- 팀 탭("편성 관리"), 매치 탭("매치 관리")과 동일한 레이아웃 패턴 적용

## 2026-06-06

### 탈퇴 회원 — 탈퇴 철회 + 완전 삭제

수정 파일: `use-roster.js`, `handlers-roster.js`, `roster-members.js`, `roster.html`, `tab-roster.js`, `modals.js`, `member.html`

- 탈퇴 회원 카드에 복구(초록) / 완전 삭제(빨강) 버튼 추가
- **탈퇴 철회**: `isResigned`, `resignDate`, `resignReason`, `isForcedResign` 필드 삭제로 활성 회원 복구
- **완전 삭제**: 이름 직접 입력 이중 확인 → Firestore 회원 문서 영구 삭제 (출석 기록은 유지)
- roster.html(인라인 상태/핸들러)과 member.html(use-roster + handlers-roster 계열) 양쪽에 독립 구현

### 회칙 탭 추가

신규 파일: `tab-rules.js`
수정 파일: `member.html`, `CLAUDE.md`

- 하단 탭바 매치 다음에 "회칙" 탭 추가 (ShieldCheck 아이콘)
- 일반 회원: 읽기 전용 (줄바꿈 보존 표시, 마지막 수정일 표시)
- 관리자: 우측 상단 편집 버튼 → textarea → 저장/취소
- Firestore: `settings/club_rules { content, updatedAt, updatedBy }`
- 탭 수: 일반 회원 5개, 관리자 6개
