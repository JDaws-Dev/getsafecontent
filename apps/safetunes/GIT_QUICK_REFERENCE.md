# Git Quick Reference Card

## 🚀 Making a Simple Change (Safe Method)

```bash
# 1. Start fresh
git checkout main
git pull origin main

# 2. Create branch
git checkout -b fix/my-change

# 3. Make changes, then:
git add .
git commit -m "Fix: describe what you fixed"

# 4. Push (backup to GitHub)
git push origin fix/my-change

# 5. Test on live site, then merge to main
git checkout main
git merge fix/my-change
git push origin main

# 6. Clean up
git branch -d fix/my-change
```

---

## 🆘 Emergency: Undo Things

```bash
# Undo changes before commit
git checkout -- filename.js    # Undo one file
git reset --hard HEAD          # Undo everything (⚠️ loses changes)

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (lose changes)
git reset --hard HEAD~1

# Undo after pushing (safe way)
git revert HEAD
git push origin main
```

---

## 📊 Check Status

```bash
git status                 # What changed?
git diff                   # Show exact changes
git log --oneline -10      # Last 10 commits
git branch                 # What branch am I on?
```

---

## 🏷️ Create Safety Snapshot

```bash
# Before big changes
git tag -a safe-point -m "Working version"
git push origin safe-point

# Return to it later
git checkout safe-point
git checkout -b restore-branch
```

---

## ⚡ Daily Workflow

```bash
# Start your day
git checkout main
git pull origin main

# Do work
git checkout -b fix/thing
# ... edit files ...
git add .
git commit -m "Fix: thing"

# End of day (backup)
git push origin fix/thing
```

---

## 🚨 Most Important Rules

1. ✅ **Always work on a branch** (not main)
2. ✅ **Commit often** (small commits are good)
3. ✅ **Push to GitHub daily** (backup)
4. ✅ **Test before merging to main**
5. ❌ **Never use `--force` unless sure**

---

See **GIT_WORKFLOW.md** for detailed explanations!
