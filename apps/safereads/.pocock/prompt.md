# Pocock Loop - Issue Processing

## Philosophy

This codebase will outlive you. Every shortcut becomes someone else's burden. Every hack compounds into technical debt.

You are shaping the future of this project. The patterns you establish will be copied. The corners you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.

---

## Task Selection

Get an issue from Beads:

```bash
bd ready
bd update <issue-id> --status in_progress
bd show <issue-id>
```

**IMPORTANT**: Every issue returned by `bd ready` has NO blocking dependencies. If `bd ready` lists it, you MUST work on it. Do NOT skip issues or claim they are blocked — Beads already resolved all dependency checks. Pick one and start.

**YOU choose the highest priority task** - not necessarily first in the list.

**Priority ranking:**

1. Architectural decisions and core abstractions
2. Integration points between modules
3. Unknown unknowns and spike work (things you don't know how they'll turn out)
4. Standard features and implementation
5. Polish, cleanup, and quick wins

Fail fast on risky work. Save easy wins for later.

---

## Before Coding

Explore the repository. Gather context. Read the progress file to see recent decisions and roadblocks.

If a task proves larger than expected, **stop and break it into smaller issues**:

```bash
bd create --title "Sub-task: <specific piece>" --type task --parent <issue-id>
```

---

## Step Size

Keep changes **small and focused**:

- One logical change per commit
- If a task feels too large, break it into subtasks
- Prefer multiple small commits over one large commit
- Run feedback loops after each change, not at the end

Quality over speed. Small steps compound into big progress.

---

## Feedback Loops (MANDATORY)

Before committing, run ALL feedback loops:

```bash
npm run test      # Must pass
npm run build     # Must pass
npm run lint      # Must pass
```

**Do NOT commit if any feedback loop fails.** Fix issues first.

---

## Progress & Learnings (CRITICAL)

Update `progress.md` after each task. This is how you leave context for yourself in the next iteration.

Include:

- Task completed (issue ID)
- **Key decisions made and WHY**
- **Roadblocks encountered** (even if solved)
- Files changed
- Notes for next iteration

**Sacrifice grammar for concision.** This file helps future iterations skip exploration.

**Commit progress.md WITH your code changes** - they travel together.

---

## Single Focus Rule

Work on ONE issue at a time. Complete it fully before moving on.

---

## Completion

When done with the issue:

```bash
# 1. Update progress.md with learnings
# 2. Run all feedback loops one final time
npm run test && npm run build && npm run lint

# 3. Stage all changes including progress.md
git add -A

# 4. Commit with issue reference
git commit -m "<type>(<scope>): <description>

Refs: <issue-id>"

# 5. Push
git push

# 6. Mark acceptance criteria as verified (REQUIRED)
# Read the original acceptance criteria from the issue, then update with [x] and verification
bd show <issue-id>  # Get the acceptance criteria
bd update <issue-id> --acceptance "- [x] Original criterion 1 - VERIFIED: <how you verified>
- [x] Original criterion 2 - VERIFIED: <how you verified>
... (include ALL original criteria, marked as checked)"

# 7. Add implementation notes (REQUIRED)
bd update <issue-id> --notes "## Implementation Summary

### What was done
- <bullet points of changes>

### Key decisions
- <why you chose this approach>

### Files modified
- path/to/file.ts (new/modified)

### Caveats
- <any limitations or follow-up needed>"

# 8. Close the issue
bd close <issue-id>
```

**Do NOT close an issue until:**

- All acceptance criteria are checked off with verification notes
- Implementation notes are added to the issue

After closing the issue, run `bd ready` to check if more work exists.

If `bd ready` returns NO issues (empty list), output:
<promise>COMPLETE</promise>

If `bd ready` returns issues, stop. The loop will restart you.

**NEVER output COMPLETE if `bd ready` still shows issues.** Always check by running the command.
