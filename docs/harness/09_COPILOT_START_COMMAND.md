# GitHub Copilot / Coding Agent Start Command

아래 명령을 Copilot coding agent에게 그대로 전달한다.

```txt
You are building a new Next.js App Router project for a Korean-language community market board for Korean residents in New Zealand.

Read and follow these harness documents first:
- 00_PROJECT_BRIEF.md
- 01_REQUIREMENTS.md
- 02_TECH_STACK.md
- 03_DATA_MODEL.md
- 04_ROLES_AND_MODERATION.md
- 05_UX_FLOWS.md
- 06_ROADMAP.md
- 07_AGENT_INSTRUCTIONS.md
- 08_COPY_AND_LABELS.md

Implement Phase 0 to Phase 3 first:
1. Set up the Next.js App Router project structure if it does not already exist.
2. Add Prisma + PostgreSQL schema based on 03_DATA_MODEL.md.
3. Add seed data for initial New Zealand cities and categories.
4. Add basic Kakao-auth-ready user model and auth placeholders. If full Kakao OAuth cannot be completed yet, create clean TODO points and keep the auth layer easy to replace.
5. Build the core post MVP:
   - create post
   - optional title
   - required body
   - required category
   - required city
   - price for sale posts
   - list posts
   - filter by category and city
   - post detail page
   - my posts page
   - edit/delete own post
   - mark sale post as sold
6. Use Korean UI labels from 08_COPY_AND_LABELS.md.
7. Add permission helper functions for USER, COORDINATOR, ADMIN even if coordinator/admin UI is implemented later.
8. Keep code clean, typed, and migration-safe.
9. Update README with setup instructions, env vars, implemented features, and next phases.

Do not implement image upload or moderation dashboard yet unless the core MVP is complete. Leave clear TODO comments for Phase 4 and later.
```
