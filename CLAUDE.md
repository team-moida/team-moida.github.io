# CLAUDE.md — OTP FC 모이다 프로젝트

Version: 3.0
Last Updated: 2026-06-05

---

# 프로젝트 개요

아마추어 혼성 풋살팀 OTP FC 운영 관리 웹앱 "모이다"

기술 스택: React 18 · Firebase Firestore · Firebase 익명 로그인 · Tailwind CSS · Leaflet · PWA · GitHub Pages

- Firebase Project ID: moida-otpfc
- 기본 컬렉션 경로: artifacts/moida-otpfc/public/data/

상세 구조 분석(기능별 역할·데이터·위험요소)은 project_moida_otpfc.md 참고.
이 파일에는 적지 않는다.

---

# 파일 지도 (가장 중요)

작업 전 반드시 이 지도부터 본다.
요청한 기능에 해당하는 파일만 읽는다.
지도에 없는 파일은 읽지 않는다.

## 홈 / 공통 진입

- 홈 화면, 페이지 이동, 로그인, 카카오 공유, 다크모드, PWA 설치 → index.html

## 출석

- 출석 관리 → attendance.html  (※ 아직 단일 파일, 분리 예정)
- 모임 생성 / 수정 / 삭제 → (담당 파일 확정 후 여기에 기입)

## 회원 / 회비  → roster/

- 회원 목록, 등록, 수정, 탈퇴 → roster/roster-members.js
- 회비 관리 → roster/roster-payment.js
- 휴식 회원 관리 → roster/roster-rest.js
- 운영진 관리 → roster/roster-admin.js
- roster 공통 유틸 → roster/roster-utils.js

## 팀 편성  → team-maker/

- 밸런스 / 레벨 계산 → team-maker/team-balance.js
- 팀 이동, 드래그앤드롭 → team-maker/team-dragdrop.js
- 임시 저장, 최종 확정 → team-maker/team-storage.js
- 이미지 저장 → team-maker/team-export.js
- team-maker 공통 유틸 → team-maker/team-utils.js

## 매치  → match/

- 경기 일정 / 경기표 생성 → match/match-generator.js
- 점수 입력 → match/match-score.js
- 경기 완료 처리, 결과 저장 → match/match-results.js
- 이미지 저장 → match/match-export.js
- match 공통 유틸 → match/match-utils.js

## 회원 전용

- 회원 전용 기능 → member.html  (※ 아직 단일 파일, 분리 예정)

## 전체 공통

- Firebase 설정 → firebase-config.js
- 공통 상수 / 유틸 → common.js
- 서비스워커 → sw.js
- 앱 설정 → manifest.json

---

# 읽기 규칙 (토큰 절약 핵심)

매우 중요

- 작업 시작 전, 어떤 파일을 읽을지 먼저 말한다. 승인 후 읽는다.
- 파일 지도에서 요청 기능에 해당하는 파일만 읽는다.
- 지도에 없거나 요청과 무관한 파일은 읽지 않는다.
- 전체 프로젝트 탐색(glob, grep 전수 검색)은 사용자가 명시적으로 요청한 경우에만 한다.
- 한 번 읽은 파일은 같은 세션에서 다시 읽지 않는다.
- 의존 관계가 꼭 필요할 때만, 그 파일 하나만 최소 범위로 추가로 읽는다.

---

# 최우선 원칙

- 기존 기능을 깨지 않는다. 새 기능보다 기존 기능 안정성을 우선한다.
- 추측으로 구현하지 않는다.
- 기능 변경 가능성이 있으면 먼저 설명한다.

---

# 비개발자 대응 원칙

사용자는 코드를 작성하지 않는다.
설명은 함수·변수·훅·컴포넌트 기준이 아니라 기능 기준으로 한다.
(예: "함수 수정" 대신 "출석 기능 수정", "회비 기능 수정")

---

# 작업 전 절차

수정 전에 반드시 아래를 설명한다.

1. 이해한 요청
2. 읽을 파일 (파일 지도 기준)
3. 수정될 기능
4. 영향 받는 화면
5. 위험 요소

설명 후 작업한다.

---

# 답변 방식

기본 응답은 짧고 명확하게.

수정 기능:
수정 파일:
결과:

상세 설명은 요청한 경우에만 제공한다.

---

# 토큰 절약 규칙

- 변경된 부분만 설명. 전체 파일 재출력 금지.
- 긴 보고서 금지.
- 요청되지 않은 개선·리팩토링·성능 최적화 제안 금지.
- 사용자가 이미 설명한 내용을 다시 반복하지 않는다.

---

# 대규모 작업 / 파일 분리 규칙

대규모 작업과 파일 분리는 아래 순서로만 진행한다.

1. 분석
2. 계획 제시 (어떤 파일을, 어떤 순서로, 위험은 무엇인지)
3. 사용자 승인
4. 작업
5. 검증

승인 없이 대규모 구조 변경이나 파일 분리를 진행하지 않는다.

---

# 새 기능 추가 규칙

새 기능은 먼저 파일 지도에서 담당 파일을 정한다.

- 담당 파일이 있으면 그 파일에만 추가한다.
- 담당 파일이 없으면 어느 파일/모듈에 넣을지 먼저 제안하고 승인받는다.
- 기존처럼 하나의 HTML에 전부 몰아넣지 않는다.
- 기능 추가 후 파일 지도를 갱신한다.

---

# 공통 모듈 원칙

중복 코드는 공통 모듈 사용을 우선 고려한다.
(Firebase 설정 → firebase-config.js, 공통 상수·유틸 → common.js, *-utils.js)
기능 변경 없이 안전한 경우에만 적용한다.

---

# PWA 및 배포

배포 관련 작업 시 Service Worker · manifest · 캐시 영향 여부를 확인한다.
기존 사용자 데이터는 유지한다.

---

# Git 규칙

사용자가 요청하면 git pull / git push를 바로 수행한다.
불필요한 확인 질문, 무관한 git 상태 확인은 하지 않는다.

---

# 메모리 파일

project_moida_otpfc.md 사용.
중요 기능 변경 시에만 갱신한다. 사소한 수정은 갱신하지 않는다.

---

# 작업 완료 보고

수정 기능:
수정 파일:
결과:
테스트 내용: