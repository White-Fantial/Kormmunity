# Roles and Moderation Policy

## Roles

### USER
일반 사용자.

가능한 작업:
- 글 작성
- 글 수정/삭제: 본인 글만
- 판매글 판매 완료 처리: 본인 글만
- 댓글 작성
- 본인 댓글 삭제
- 작성자 연락 버튼 사용

제한:
- `LIMITED` 상태에서는 새 글/댓글 작성 제한 가능
- `SUSPENDED` 상태에서는 작성/댓글/연락 기능 제한

### MODERATOR
콘텐츠 모더레이션 담당자.

가능한 작업:
- 게시글을 `HELD` 상태로 변경
- 게시글 `HELD -> PUBLISHED` 복구
- 댓글 `HELD`/`DELETED` 전환 및 복구
- 신고 확정/반려 검토
- 문제가 있는 사용자에 대한 관리자 검토 요청 생성
- moderation action log 작성

제한:
- 사용자를 영구 삭제하거나 영구 정지할 수 없음
- 최종 사용자 제재/복구 결정은 admin만 가능

### COORDINATOR
커뮤니티 운영/활성화 보조자(비모더레이션 기본 역할).

가능한 작업:
- 지역/운영 공지 및 커뮤니티 운영 보조 업무
- 필요 시 별도 권한 부여를 통한 작성 범위 확장 (`PostPermission`)

제한:
- 기본적으로 moderation queue 처리 권한 없음
- 콘텐츠 보류/복구/신고 확정 권한 없음

### ADMIN
최종 관리자.

가능한 작업:
- 모든 게시글/댓글 상태 변경
- 사용자 제한/정지/복구/삭제 결정
- 역할/권한 부여 및 회수
- 카테고리/국가/도시 관리
- moderation log 확인

## Route Policy (Moderation)

- Canonical moderation routes:
  - `/moderator`
  - `/moderator/reports`
  - `/moderator/kakao-messages`
  - `/moderator/warmth-logs`
  - `/moderator/score-logs`
- Backward compatibility routes:
  - `/coordinator/*` -> `/moderator/*` redirect
  - `/moderation` -> `/moderator` redirect
- 레거시 경로는 기존 링크 보호를 위해 유지하되, 신규 문서/링크는 `/moderator`만 사용한다.

## Content Status Flow

### Normal Post Flow
1. USER creates post
2. Post status = `PUBLISHED`
3. Other users can view/comment/contact

### Moderation Flow
1. MODERATOR sees problematic post/comment
2. MODERATOR changes content to `HELD`
3. HELD content is hidden from normal users
4. MODERATOR adds reason and logs action
5. HELD/DELETED 전환 시 상단 고정은 자동 해제된다
6. MODERATOR can restore if minor issue resolved
7. ADMIN can permanently delete or restore

### User Restriction Flow
1. MODERATOR flags user for review
2. ADMIN reviews moderation history
3. ADMIN decides:
   - no action
   - `LIMITED`
   - `SUSPENDED`
   - `DELETED`

## Audit Requirements
Every moderation action should create a `ModerationAction` record.

Minimum log fields:
- actor
- target type
- target id
- action type
- reason
- timestamp

## UI Requirements

### Moderator Dashboard
- List of recent posts/comments
- Filter by `HELD`/`PUBLISHED`/`DELETED`
- Hold/restore buttons
- Reason input
- User review request button

### Admin Dashboard
- User list with status filter
- Post moderation queue
- Comment moderation queue
- Moderator action history
- User restriction controls
- Category/country/city management
