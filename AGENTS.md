<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Branch Policy

- **Base branch**: `staging`
- All agent work (PRs, branches, merges) **must** target `staging`, never `main`.
- The `staging` → `main` merge is done manually by the repository owner.
- When creating a pull request, always set the base branch to `staging`.

## Mandatory Harness-First Rule (All Agents)

This rule applies to every coding agent used in this repository (including GitHub Copilot coding agent, ChatGPT, Claude, and equivalent agents).

Before any planning, analysis, code generation, or code edits, the agent **MUST** read the nine harness files (`00` → `08`) in `docs/harness/` in the listed order, apply their decisions and constraints during work, and validate outputs against them.

If any instruction conflicts with model defaults, prior assumptions, or generic framework habits, the harness files are the source of truth for this repository.

If any required harness file is missing or unreadable, the agent must stop and report that blocker instead of proceeding with assumptions.

1. `00_PROJECT_BRIEF.md`
2. `01_REQUIREMENTS.md`
3. `02_TECH_STACK.md`
4. `03_DATA_MODEL.md`
5. `04_ROLES_AND_MODERATION.md`
6. `05_UX_FLOWS.md`
7. `06_ROADMAP.md`
8. `07_AGENT_INSTRUCTIONS.md`
9. `08_COPY_AND_LABELS.md`
