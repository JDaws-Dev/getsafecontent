# Pocock Loop

A streamlined autonomous issue processor inspired by [Matt Pocock's approach](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum).

## Philosophy

1. **Simple over complex** - The prompt is ~100 lines, not 400
2. **Learnings persist** - Each iteration leaves notes for the next
3. **Context via commits** - Recent git history provides awareness
4. **One issue, one commit** - Focused, atomic changes
5. **Fight entropy** - Leave the codebase better than you found it

## Files

| File             | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `prompt.md`      | Main instructions (minimal, focused)                  |
| `progress.md`    | Rolling context - learnings, roadblocks, decisions    |
| `once.sh`        | Run single iteration                                  |
| `loop.sh`        | Run multiple iterations locally                       |
| `loop-custom.sh` | Run alternative prompts in a loop                     |
| `afk.sh`         | Run in Docker sandbox (requires Docker Desktop 4.50+) |
| `loops/`         | Alternative loop prompts                              |
| `swarm.sh`       | Parallel multi-agent analysis → creates issues        |

## Usage

### Single iteration

```bash
./.pocock/once.sh
./.pocock/once.sh --epic safecontent-8as
```

### Multiple iterations (local)

```bash
./.pocock/loop.sh 10
./.pocock/loop.sh 5 --epic safecontent-8as
```

### Alternative loops

```bash
# Test coverage loop
./.pocock/loop-custom.sh 10 .pocock/loops/coverage.md

# Entropy/cleanup loop
./.pocock/loop-custom.sh 20 .pocock/loops/entropy.md

# Linting loop
./.pocock/loop-custom.sh 15 .pocock/loops/lint.md
```

### Swarm Analysis

Launch 6 parallel agents with different perspectives to analyze a goal, then auto-create issues:

```bash
# Analyze landing page for improvements
./.pocock/swarm.sh "Evaluate the landing page for conversion optimization"

# Find bugs
./.pocock/swarm.sh "Find bugs in the checkout flow"

# Code quality review
./.pocock/swarm.sh "Analyze code quality and suggest improvements"
```

**Perspectives included:**
- UX Expert - user flows, friction, accessibility
- Conversion Specialist - CTAs, trust, objections
- Senior Engineer - code quality, security, perf
- Market Analyst - competitor patterns, best practices
- Copywriter - messaging, emotional resonance
- Mobile Specialist - responsive, touch targets

After swarm completes, run `bd list` to see created issues, then `./.pocock/loop.sh 10` to process them.

### AFK mode (Docker sandbox)

**Requires Docker Desktop 4.50+** with AI features enabled.

```bash
./.pocock/afk.sh 20
./.pocock/afk.sh 10 --epic safecontent-8as
```

## Task Prioritization

The agent chooses tasks based on this priority:

1. **Architectural decisions** - Core abstractions, patterns
2. **Integration points** - Where modules connect
3. **Unknown unknowns** - Spike work, risky experiments
4. **Standard features** - Normal implementation
5. **Polish/quick wins** - Easy stuff last

Fail fast on risky work. Save easy wins for later.

## Current Epic

**safecontent-8as** - GetSafeContent Platform Consistency & Launch

Start with:
```bash
bd ready  # Shows Phase 0 as the only unblocked task
```
