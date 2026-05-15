# Implementation Roadmap

## Current Status

현재 구현 상태: **Phase 0 ~ Phase 11 + 운영 고도화 일부**

### Implemented Highlights
- Phase 0~10 기본 기능 및 폴리시 완료
- 실제 Kakao OAuth 로그인/콜백 처리
- 검색 + 검색 알림 카카오 메시지 발송
- 커뮤니티 스코어 기반 자동 보류 및 점수 이벤트 로그
- 관리자/모더레이터 운영 화면 확장
- 관리 계정(`PERSONA`/`OPERATOR`) 기반 작성자 오버라이드

## Current Improvement Backlog (Now)

상세 항목은 `docs/current-improvement-backlog.md`를 기준으로 관리한다.

핵심 범주:
- 커뮤니티 스코어/좋아요 이벤트 정합성
- 인증/권한/운영 정책 문서 정합성
- 업로드 provider 추상화
- 레거시 라우트 deprecation 정책

## Future Feature Roadmap

상세 항목은 `docs/future-feature-roadmap.md`를 기준으로 관리한다.

### Near-term
- 커뮤니티 스코어 신뢰도 강화
- 신고 처리 운영 자동화
- 검색 고도화

### Mid-term
- 분석 대시보드 연동
- 모더레이션 품질 루프
- 카카오 알림/연락 신뢰성 개선

### Long-term
- 카테고리/지역별 정책 엔진
- 커뮤니티 안전 기능 확장
- 개인화/리텐션

## Legacy Route Policy

- Canonical moderation routes are under `/moderator/*`.
- `/coordinator/*` 및 `/moderation`은 backward-compat redirect로 유지한다.
- 신규 문서와 운영 링크는 `/moderator/*`만 사용한다.
