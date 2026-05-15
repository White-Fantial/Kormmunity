# 운영계정(Managed Account) 정책/구현 문서

## 1) 목적

운영계정은 실제 가입자(`REAL_USER`)와 분리된 **운영 목적 계정**으로, 커뮤니티 활성화·운영 공지·운영 개입을 안전하게 수행하기 위한 장치입니다.

- `PERSONA`: 커뮤니티 활성화용 일반형 운영 계정
- `OPERATOR`: 운영팀/공지/안내용 운영 계정

핵심 목표:

1. 운영 목적 작성을 실제 사용자 계정과 분리
2. 작성자 대리 선택을 엄격히 통제(ADMIN 한정)
3. 로그인/세션 정책과 공개 노출 정책을 계정 타입별로 명확히 분리
4. 내부 감사 추적(`authorId` vs `createdByUserId`)을 보장

---

## 2) 데이터 모델

`User` 모델의 관련 필드:

- `accountType`: `REAL_USER | PERSONA | OPERATOR | SYSTEM`
- `isManagedAccount`: 운영계정 여부
- `isActive`: 운영계정 활성/비활성 상태
- `personaNotes`: 페르소나 설정 메모(선택)
- `toneNotes`: 말투/문체 메모(선택)
- `activityNotes`: 활동 지침 메모(선택)

참고:

- 현재 `personaNotes`, `toneNotes`, `activityNotes`는 관리자 화면에서 생성/수정/조회되는 메타데이터이며, 작성 로직의 자동 동작을 직접 제어하는 조건으로는 아직 연결되어 있지 않습니다.

---

## 3) 계정 타입과 관리 여부 규칙

관리자 계정 타입 변경 시, 서버는 아래 기준으로 `isManagedAccount`를 계산합니다.

- managed 취급: `PERSONA`, `OPERATOR`, `SYSTEM`
- real user 취급: `REAL_USER`

즉, 타입 변경만으로 관리 여부가 자동 동기화됩니다.

---

## 4) 로그인 정책

운영계정은 로그인 대상이 아닙니다.

- 카카오 OAuth 콜백 로그인: 기존 계정이 `isManagedAccount=true` 또는 `isActive=false`면 차단
- 개발용 placeholder 로그인: 동일 기준으로 차단

의미:

- 운영계정은 운영자가 “대리 작성 대상으로 선택”해서 사용하고,
- 직접 로그인 주체로는 사용하지 않습니다.

---

## 5) 관리자 화면(운영계정 생성/수정)

현재 `/admin/users` 화면에서 운영계정을 함께 관리합니다.

### 생성

- ADMIN만 `PERSONA`/`OPERATOR` 타입으로 생성 가능
- 생성 시 `isManagedAccount=true`로 저장
- `displayName`, `accountType`, `cityId`, `isActive`, `profileImageUrl`, `shortBio`, `personaNotes`, `toneNotes`, `activityNotes` 입력 지원

### 수정

- 운영계정(PERSONA/OPERATOR + managed)만 수정 가능
- 활성/비활성 전환 가능
- 수정 내역은 `ModerationAction`에 `MANAGED_ACCOUNT_*` 액션으로 기록

### 목록/필터

- `managedType`(PERSONA/OPERATOR), `includeInactive`로 필터 가능
- 최근 사용 시각(해당 계정이 작성한 최근 글/댓글)을 함께 조회

---

## 6) 글/댓글 작성에서의 운영계정 사용 규칙

### 공통 원칙

- 기본 작성자는 현재 로그인 사용자
- `authorUserIdOverride` 제공 시 대리 작성 시도
- **ADMIN만** override 가능
- 대상 계정은 반드시 아래 조건을 모두 충족해야 함:
  - `isManagedAccount=true`
  - `isActive=true`
  - `accountType ∈ {PERSONA, OPERATOR}`

### 글 작성(`/posts/new`)

- ADMIN에게만 작성 계정 선택 UI 노출
- 서버 액션에서 동일 조건 재검증

### 댓글 작성(게시글 상세)

- ADMIN에게만 작성 계정 선택 UI 노출
- 서버 액션에서 동일 조건 재검증

### 감사 추적

- 실제 공개 작성자: `authorId`
- 실제 실행 주체(로그인 사용자): `createdByUserId`

이 분리로 운영 대리 작성의 감사 가능성을 확보합니다.

---

## 7) 공개 UI 노출 정책

- `OPERATOR`: 운영자 배지 노출, 온기 지표 비노출
- `PERSONA`: 일반 사용자처럼 표시(별도 페르소나 라벨 비노출)
- 온기 노출 정책은 `accountType` 기준으로 제어됨

---

## 8) 현재 `personaNotes` / `toneNotes` / `activityNotes`의 의미

- `personaNotes`: 인물 설정/캐릭터 콘셉트 메모
- `toneNotes`: 말투/표현 스타일 가이드 메모
- `activityNotes`: 활동 범위·빈도·주의사항 메모

현재 상태:

- 관리자 입력/수정/조회 가능
- 내부 운영 메모 성격
- 자동 생성/자동 검수/작성 가이드 엔진과의 런타임 연결은 아직 없음

---

## 9) 보안/운영상 주의점

1. 권한은 UI가 아니라 서버에서 최종 검증(이미 적용됨)
2. 비활성 운영계정은 작성자 선택 대상에서 제외(이미 적용됨)
3. 운영계정 직접 로그인 차단(이미 적용됨)
4. 대리 작성 감사 필드(`createdByUserId`)는 절대 제거하지 않기
5. 운영계정 정책 변경 시 계정타입 변경 로직과 author override 검증 로직을 함께 검토

---

## 10) 향후 확장 방향

### A. 운영 워크플로우 정교화

1. 운영계정 승인 플로우(초안 → 검토 → 활성)
2. 운영계정별 사용 가능 카테고리/지역 제한
3. 운영계정별 일일 작성량·속도 제한(오남용 방지)
4. 운영계정별 책임자(Owner) 지정 및 교체 이력 관리

### B. Notes 필드의 실사용 연결

1. 작성 보조 가이드(초안 템플릿/톤 체크)에 `personaNotes/toneNotes/activityNotes` 반영
2. 관리자 작성 화면에서 “최근 위반/주의사항”과 함께 통합 노출
3. 계정 전환 시 노트 템플릿 자동 제안(PERSONA/OPERATOR별)

### C. 감사/리스크 관리 고도화

1. `authorId != createdByUserId` 이벤트 전용 감사 로그 뷰
2. 운영계정 사용 빈도 이상 탐지(야간 대량 작성, 짧은 간격 반복 작성 등)
3. 운영계정별 신고율/보류율 KPI 대시보드
4. 운영계정 비활성화 시 예약 게시/알림 작업 자동 차단

### D. 정책 일관성 강화

1. 운영계정 정책을 단일 모듈로 집약(검증 규칙 중앙화)
2. 운영계정 관련 액션 타입 네이밍 정규화
3. 관리자 UI 분리 필요 시 `/admin/managed-accounts` 전용 화면 도입 검토

---

## 11) 체크리스트 (변경 시 참고)

- [ ] 스키마 변경 시 `User.accountType/isManagedAccount/isActive` 관계 유지 확인
- [ ] 로그인 경로(카카오/placeholder) 차단 정책 유지 확인
- [ ] 글/댓글 작성 액션의 author override 서버 검증 유지 확인
- [ ] 관리자 생성/수정 화면 입력 항목 동기화 확인
- [ ] 공개 UI에서 OPERATOR/PERSONA 노출 정책 회귀 확인
- [ ] 감사 필드(`createdByUserId`) 저장 경로 회귀 확인
