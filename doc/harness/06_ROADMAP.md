# Implementation Roadmap

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
- Mobile UI polish
- Loading states
- Empty states
- Error states
- SEO metadata
- Basic analytics
- Abuse prevention: rate limits, spam checks
