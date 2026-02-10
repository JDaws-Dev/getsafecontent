# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Current Epic

**safecontent-8as** - GetSafeContent Platform Consistency & Launch

**Phase 0 must complete first** - Move all apps into safecontent monorepo.

```bash
bd ready  # Shows only Phase 0 (safecontent-8as.8) as unblocked
```

## Project Structure (After Phase 0)

```
~/safecontent/
├── apps/
│   ├── safetunes/      # React + Vite + Convex
│   ├── safetube/       # React + Vite + Convex
│   └── safereads/      # Next.js + Convex
├── sites/
│   └── marketing/      # Next.js + Tailwind (getsafecontent.com)
├── .pocock/            # Autonomous loop files
├── .beads/             # Issue tracking database
├── CLAUDE.md           # Project instructions
└── AGENTS.md           # This file
```

## Convex Deployments

| App | Prod Deployment | Site URL |
|-----|-----------------|----------|
| SafeTunes | formal-chihuahua-623 | formal-chihuahua-623.convex.site |
| SafeTube | rightful-rabbit-333 | rightful-rabbit-333.convex.site |
| SafeReads | exuberant-puffin-838 | exuberant-puffin-838.convex.site |

## Admin Key

All apps use: `IscYPRsiaDdpuN378QS5tEvp2uCT+UHPyHpZG6lVko4=`

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
