# Implementation Roadmap

현재 구현 상태: **Phase 0 ~ Phase 10 (기본 폴리시 포함)**

## Phase 0 — Project Setup
- Next.js App Router setup
- TypeScript setup
- Tailwind setup
- Prisma setup
- PostgreSQL connection
- Basic layout
- Environment variable template

## Phase 1 — Auth and User Model
- Kakao OAuth login
- User creation/update on first login
- Role/status fields
- Basic session handling
- Protected routes

## Phase 2 — Seed Data
- Seed initial cities
- Seed initial categories
- Create admin seed user option

## Phase 3 — Posts MVP
- Post creation form
- Optional title
- Body
- Category selection
- City selection
- Price for sale posts
- Post listing page
- Post detail page
- My posts page
- Edit/delete own post
- Mark sale post as sold

## Phase 4 — Image Upload
- Choose provider: Cloudinary or UploadThing
- Implement upload endpoint/component
- Save image URLs to PostImage
- Display gallery on post detail
- Display thumbnail on listing

## Phase 5 — Comments
- Add comment form
- Show comments
- Delete own comment
- Basic comment moderation-ready status field
- Add category quick comment templates
- Unlock Kakao contact after one valid public comment when enabled

## Phase 6 — Filters and Search-ready Structure
- Category filter
- City filter
- Combined filters
- URL query params for shareable filtered pages
- Add DB indexes

## Phase 7 — Kakao Contact Flow
- Add openChatUrl/contactUrl to user profile
- Contact button on post detail
- Fallback message when no contact link exists
- Optional per-post contact link override
- Add per-category default for comment-before-contact
- Let authors override comment-before-contact per post

## Phase 8 — Coordinator Moderation
- Coordinator dashboard
- Hold post
- Restore post
- Delete/hide comment
- Add moderation reason
- Create ModerationAction records

## Phase 9 — Admin Controls
- Admin dashboard
- User list
- Change user role
- Limit/suspend/restore user
- Final delete decisions
- Review coordinator actions
- Category/city management

## Phase 10 — Polish
- [x] Mobile UI polish (모바일 네비게이션/카드 UI 개선)
- [x] Loading states (전역/게시글 로딩 스켈레톤)
- [x] Empty states (목록/내 글/댓글 empty 메시지 반영)
- [x] Error states (route/global error boundary 추가)
- [x] SEO metadata (레이아웃/목록/상세 메타데이터 보강)
- [x] Basic analytics (클라이언트 전환 이벤트 + 서버 이벤트 로깅)
- [x] Abuse prevention: rate limits, spam checks (게시글/댓글 작성 보호)
