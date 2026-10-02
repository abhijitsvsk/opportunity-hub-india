# AI Agent Instructions

> **Read this file first in every new session.**

## Context Loading Protocol

Follow **progressive context loading** — do NOT analyse the entire repository by default.

### Level 1 — Always read first
1. This file (`AGENTS.md`)
2. `PROJECT_CONTEXT.md` — what the project is, tech stack, structure
3. `STATE.md` — current development state, what's working, what's broken

### Level 2 — Read when relevant
- `ARCHITECTURE.md` — only when the task involves architecture, multiple modules, integrations, or significant structural changes
- `TODO.md` — only when the task involves planned work or prioritisation
- `frontend/AGENTS.md` and `frontend/CLAUDE.md` — only when working on frontend code

### Level 3 — Inspect on demand
- Source files directly relevant to the current task
- Dependencies of those files when necessary

### Level 4 — Rare
- Wider repository analysis only when genuinely required (e.g., large refactors, debugging cross-module issues)

## Rules

- **Do NOT recursively read every file** just to understand the project.
- **Inspect only files relevant to the current task.**
- **Preserve existing architecture** unless the task explicitly requires changing it.
- **Before making major changes**, inspect the relevant existing implementation first.
- **Trust actual code over context files** — if a context file conflicts with what the code actually does, trust the code and update the context file.

## After Significant Changes

| What changed | Update |
|---|---|
| Development state, features, bugs | `STATE.md` |
| Architectural decisions or structure | `ARCHITECTURE.md` |
| Completed or new planned tasks | `TODO.md` |
| Project scope, tech stack, models | `PROJECT_CONTEXT.md` |

- **Never replace context files with vague summaries.**
- **Keep them synchronized with the actual repository.**

## Key File Locations

| Purpose | Path |
|---|---|
| Frontend app | `frontend/` |
| Scraper pipeline | `scraper/` |
| Supabase config | `supabase/` |
| GitHub Actions | `.github/workflows/` |
| Product requirements | `PRD.md` |
| Implementation guide | `IMPLEMENTATION_GUIDE.md` |
| Product rules | `rules/product-rules.md` |
| Design system | `frontend/DESIGN.md` |
