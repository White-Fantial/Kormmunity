# 현재 개선/문제 백로그

현재 코드/문서 기준의 **결함·불일치·정합성 이슈만** 정리합니다.

## 1) 커뮤니티 스코어 좋아요 반영 일관성
- 우선순위: P0
- 영향 범위: 게시글/댓글 점수 이벤트 신뢰도, 자동 보류 정확도
- 담당 영역: `app/posts/actions.ts`, `app/posts/[postId]/comments/actions.ts`, `docs/community-score-moderation.md`
- 완료 기준:
  - 게시글/댓글 모두 “신규 좋아요 + 타인 콘텐츠”에서만 점수 이벤트 반영
  - 취소/셀프 좋아요 경로에서 점수 반영 미발생
  - 운영 문서 설명과 코드 동작이 일치
- 상태: ✅ 완료

## 2) 인증 경계 주석 정합성
- 우선순위: P0
- 영향 범위: 로그인 유지보수성, 신규 기여자 온보딩 혼선
- 담당 영역: `app/login/actions.ts`, `app/api/auth/kakao/*`
- 완료 기준:
  - 실제 OAuth 구현 상태와 주석이 일치
  - placeholder TODO 오해 제거
- 상태: ✅ 완료

## 3) 업로드 Provider 추상화 미완료
- 우선순위: P1
- 영향 범위: 스토리지 벤더 전환성, 운영 비용/리스크 분산
- 담당 영역: `lib/upload/*`
- 완료 기준:
  - 업로드/삭제 인터페이스 공통화
  - Cloudinary 외 provider(UploadThing/S3 호환) 교체 가능
  - provider별 환경 변수/오류 처리 표준화
- 상태: ⏳ 진행 필요

## 4) 문서-구현 권한 정책 정합성
- 우선순위: P1
- 영향 범위: 운영 권한 정책 이해, QA 시나리오 정확도
- 담당 영역: `docs/harness/04_ROLES_AND_MODERATION.md`, `lib/permissions/index.ts`
- 완료 기준:
  - 문서의 moderation 주체가 실제 구현(`MODERATOR/ADMIN`)과 일치
  - COORDINATOR는 비모더레이션 역할로 명시
- 상태: ✅ 완료

## 5) 하네스 로드맵 최신화
- 우선순위: P1
- 영향 범위: 제품 계획 커뮤니케이션, 우선순위 의사결정
- 담당 영역: `docs/harness/06_ROADMAP.md`, `README.md`
- 완료 기준:
  - Phase 10 이후 실제 구현 상태 반영
  - 향후 과제를 Near/Mid/Long-term으로 분리
- 상태: ✅ 완료

## 6) 레거시 라우트(`/coordinator`, `/moderation`) 정리 정책
- 우선순위: P2
- 영향 범위: URL 일관성, 운영 문서/외부 링크 안정성
- 담당 영역: `app/coordinator/*`, `app/moderation/page.tsx`, `docs/harness/04_ROLES_AND_MODERATION.md`
- 완료 기준:
  - `/moderator`를 canonical route로 문서화
  - 레거시 경로는 backward-compat redirect로 유지 정책 명시
  - 제거 전 공지/마이그레이션 기준 정의
- 상태: ✅ 정책 문서화 완료 (코드 리다이렉트 유지)
