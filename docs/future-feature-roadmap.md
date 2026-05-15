# 앞으로 추가할 기능 로드맵

신규 기능/확장 기능만 정리합니다.

## Near-term

### 1) 커뮤니티 스코어 신뢰도 강화
- 우선순위: Near-term
- 영향 범위: 자동 보류 정확도, 악용 방지, 운영 신뢰도
- 담당 영역: `app/posts/actions.ts`, `app/posts/[postId]/comments/actions.ts`, `lib/community-score/*`
- 완료 기준:
  - 점수 이벤트 중복/오작동 방지 규칙 강화
  - 셀프/토글 악용 방어 정책 테스트 케이스 확대
  - 감사 로그 기반 이상 패턴 탐지 지표 도입

### 2) 신고 처리 운영 자동화
- 우선순위: Near-term
- 영향 범위: 운영 처리 속도, SLA 준수율
- 담당 영역: `app/moderator/*`, `app/admin/reports/page.tsx`, `lib/notifications/*`
- 완료 기준:
  - 우선순위 큐(점수/반복 신고/신뢰도 가중) 도입
  - SLA/에스컬레이션 규칙 반영
  - 검토 결과 템플릿 응답 체계 제공

### 3) 검색 고도화
- 우선순위: Near-term
- 영향 범위: 콘텐츠 발견성, 재방문률
- 담당 영역: `app/posts/page.tsx`, `app/posts/search-alert-actions.ts`
- 완료 기준:
  - 복합 조건 저장 검색어 확장
  - 추천 검색어 제공
  - 검색 랭킹 개선 기준 정의/적용

## Mid-term

### 4) 분석 대시보드 연동
- 우선순위: Mid-term
- 영향 범위: 제품 의사결정, 운영 가시성
- 담당 영역: `app/api/analytics/route.ts`, `lib/analytics/*`
- 완료 기준:
  - 수집 이벤트를 운영 대시보드에서 조회 가능
  - 핵심 KPI(유입/전환/신고-처리 리드타임/재방문) 제공

### 5) 모더레이션 품질 루프
- 우선순위: Mid-term
- 영향 범위: 조치 정확도, 사용자 신뢰도
- 담당 영역: `app/moderator/*`, `app/admin/reports/page.tsx`, `lib/community-score/*`
- 완료 기준:
  - 자동 보류 콘텐츠 이의제기/재검토 흐름 제공
  - 조치 결과를 정책 조정에 반영하는 피드백 루프 구축

### 6) 카카오 알림/연락 신뢰성 개선
- 우선순위: Mid-term
- 영향 범위: 알림 도달률, 사용자 만족도
- 담당 영역: `lib/kakao/message.ts`, `app/moderator/kakao-messages/page.tsx`
- 완료 기준:
  - 발송 실패 사유 표준 분류
  - 재시도 정책 및 관측 지표 도입
  - 사용자별 수신 설정 세분화

## Long-term

### 7) 카테고리/지역별 정책 엔진
- 우선순위: Long-term
- 영향 범위: 운영 유연성, 카테고리별 최적화
- 담당 영역: `app/admin/categories/page.tsx`, `app/admin/cities/page.tsx`, `lib/permissions/index.ts`
- 완료 기준:
  - 카테고리별 보류 임계값 설정
  - 댓글 선행 접촉 정책/노출 규칙 운영 UI 제어

### 8) 커뮤니티 안전 기능 확장
- 우선순위: Long-term
- 영향 범위: 악성 행위 억제, 커뮤니티 안정성
- 담당 영역: `lib/community-score/*`, `app/moderator/reports/page.tsx`, `app/admin/users/page.tsx`
- 완료 기준:
  - 반복 악성 행위 자동 감지 규칙 도입
  - 계정/콘텐츠 리스크 스코어링
  - 단계적 제재 자동 제안 체계 제공

### 9) 개인화/리텐션
- 우선순위: Long-term
- 영향 범위: 체류시간, 재방문, 전환
- 담당 영역: `app/posts/page.tsx`, `app/my/saved/page.tsx`, `app/my/notifications/page.tsx`
- 완료 기준:
  - 관심 지역/카테고리 기반 피드 개인화
  - 저장글/행동 기반 알림 추천
  - 리텐션 측정 지표 및 실험 가능 구조 마련
