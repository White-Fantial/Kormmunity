# Agent Instructions

## Project Goal
Build a Korean-language, Kakao-friendly community market board for Korean residents in New Zealand.

## Important Product Decisions
- The app should feel closer to a chat/community board than a formal classified ads site.
- Post title is optional.
- Body, category, and city are required.
- Categories and cities should be stored in DB and seeded.
- Sale posts need price and sold status.
- Images must be uploaded to an external image hosting/storage service, not stored directly in DB.
- Kakao login is the primary authentication method.
- Direct Kakao message sending may not be available in MVP. Prefer user-provided Kakao Open Chat/contact URL.
- The UI language should be Korean first.
- Internal code names, routes, types, enums, and DB schema should use English.

## Required Roles
- USER
- COORDINATOR
- ADMIN

## Moderation Rules
- Coordinators can hold posts and comments.
- Coordinators can request review for problematic users.
- Admins make final user restriction/deletion decisions.
- Every moderation action must be logged.

## Branch Policy

- All agent PRs must target the **`staging`** branch, not `main`.
- The `staging` → `main` merge is performed manually by the repository owner.
- Never open a PR against `main` directly.

## Development Style
- Implement incrementally by phase.
- Keep DB schema explicit and migration-safe.
- Prefer simple, production-ready MVP over over-engineered features.
- Add README updates whenever major functionality is implemented.
- Add clear TODO comments for Kakao messaging limitations and image provider choices.

## Suggested Route Structure

```txt
/
/login
/posts
/posts/new
/posts/[postId]
/my/posts
/my/profile
/admin
/admin/users
/admin/posts
/admin/categories
/admin/cities
/coordinator
/coordinator/posts
/coordinator/reports
```

## Suggested Component Structure

```txt
app/
  posts/
  my/
  admin/
  coordinator/
components/
  posts/
  comments/
  filters/
  auth/
  moderation/
lib/
  auth/
  db/
  kakao/
  upload/
  permissions/
  moderation/
prisma/
  schema.prisma
  seed.ts
```

## Permission Helper Requirement
Create helper functions such as:

```ts
canCreatePost(user)
canEditPost(user, post)
canDeletePost(user, post)
canHoldPost(user)
canRestorePost(user)
canModerateUser(user)
canMakeFinalUserDecision(user)
```
