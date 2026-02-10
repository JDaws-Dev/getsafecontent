# Git Workflow & Safety Guide for SafeTunes

**Last Updated:** November 17, 2025

---

## 🎯 TL;DR - Quick Safety Rules

1. **Never commit directly to `main`** - Always use branches
2. **Test locally first** - Run the site before pushing
3. **Small commits are safe** - Easier to roll back
4. **Tag before big changes** - Create snapshots you can return to
5. **Git never deletes your work** - Everything is recoverable

---

## 🛡️ Your Current Setup

### Repository
- **GitHub:** https://github.com/JDaws-Dev/AppleMusicWhitelist
- **Main Branch:** `main` (protected, stable code)
- **Current Branch:** `claude/start-website-project-014eCWE5hXozvGiM8iyqbSWY`

### Safety Net Already in Place
✅ You're working on a separate branch (not main)
✅ All changes are backed up to GitHub
✅ Vercel auto-deploys from main branch only

---

## 📚 Git Basics - What You Need to Know

### Your Code Has 3 "Locations"

1. **Working Directory** - Files on your computer (what you edit)
2. **Local Repository** - Git history on your computer (commits)
3. **Remote Repository** - GitHub (backup in the cloud)

```
Your Computer                    GitHub
┌─────────────────────┐         ┌──────────────┐
│ Working Directory   │         │              │
│ (files you edit)    │         │   Remote     │
│                     │         │  Repository  │
│         ↓           │         │              │
│   Local Repository  │ ←push→  │              │
│   (git commits)     │ ←pull→  │              │
└─────────────────────┘         └──────────────┘
```

### Git Never Deletes Your Work

**Important:** Git keeps EVERYTHING. Even if you "delete" a file, Git remembers it existed. You can always go back.

---

## 🚀 Safe Workflow for Making Changes

### Option 1: Small Quick Fixes (Recommended for Beginners)

**Use this for:** Bug fixes, typos, small updates

```bash
# 1. Make sure you're on main and it's up to date
git checkout main
git pull origin main

# 2. Create a new branch for your fix
git checkout -b fix/description-of-fix
# Example: git checkout -b fix/login-button-color

# 3. Make your changes in your code editor
# Edit files, test locally with: npm run dev

# 4. See what you changed
git status           # See which files changed
git diff             # See exactly what changed

# 5. Stage your changes (prepare to commit)
git add .            # Add all changes
# OR add specific files:
# git add src/pages/LoginPage.jsx

# 6. Commit with a clear message
git commit -m "Fix: Change login button color to match branding"

# 7. Push to GitHub (creates backup)
git push origin fix/description-of-fix

# 8. Merge into main (after testing)
git checkout main
git merge fix/description-of-fix

# 9. Push main to GitHub (triggers Vercel deployment)
git push origin main

# 10. Delete the branch (cleanup)
git branch -d fix/description-of-fix
```

### Option 2: Bigger Features (For More Complex Work)

**Use this for:** New features, major refactoring

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b feature/new-feature-name
# Example: git checkout -b feature/dark-mode

# 3. Work on your feature (make multiple commits)
# ... edit files ...
git add .
git commit -m "Add dark mode toggle button"

# ... edit more files ...
git add .
git commit -m "Add dark mode styles"

# ... test thoroughly ...
git add .
git commit -m "Fix dark mode on mobile"

# 4. Push branch to GitHub regularly (backup)
git push origin feature/new-feature-name

# 5. When ready, merge to main
git checkout main
git merge feature/new-feature-name

# 6. Push to deploy
git push origin main

# 7. Delete feature branch
git branch -d feature/new-feature-name
git push origin --delete feature/new-feature-name
```

---

## 🆘 Emergency: How to Undo Things

### Undo Changes Before Committing

```bash
# Undo all changes since last commit (DESTRUCTIVE - be careful!)
git reset --hard HEAD

# Undo changes to a specific file
git checkout -- src/pages/LoginPage.jsx

# See what would be reset before doing it
git status
```

### Undo Last Commit (Not Pushed Yet)

```bash
# Keep the changes, undo the commit
git reset --soft HEAD~1

# Undo commit AND changes (DESTRUCTIVE!)
git reset --hard HEAD~1
```

### Undo After Pushing to GitHub

```bash
# Create a new commit that undoes the last one
git revert HEAD
git push origin main

# This is SAFE - creates history, doesn't delete anything
```

### Go Back to a Specific Commit

```bash
# See commit history
git log --oneline

# Create a new branch from an old commit (SAFE way)
git checkout -b restore-point <commit-hash>
# Example: git checkout -b restore-point 8fc2ddc

# OR reset main to old commit (DESTRUCTIVE)
git reset --hard <commit-hash>
git push origin main --force  # ⚠️ DANGEROUS
```

---

## 🏷️ Creating Safety Snapshots (Tags)

**Before making big changes, create a tag you can return to:**

```bash
# Create a tag at current state
git tag -a v1.0-stable -m "Working version before Stripe changes"

# Push tag to GitHub (backup)
git push origin v1.0-stable

# Later, if needed, restore from tag
git checkout v1.0-stable
git checkout -b restore-from-stable
```

### Recommended Tags

```bash
# Before major features
git tag -a pre-stripe -m "Before Stripe integration"
git tag -a pre-ios-app -m "Before iOS app work"

# After successful deployments
git tag -a production-2025-11-17 -m "Production release Nov 17"

# Push all tags
git push origin --tags
```

---

## 🔍 Checking Status & History

### What Changed?

```bash
# See which files changed
git status

# See detailed changes
git diff                          # All changes
git diff src/pages/LoginPage.jsx # Specific file

# See changes already staged
git diff --staged
```

### View History

```bash
# Compact view
git log --oneline

# Detailed view
git log

# See changes in each commit
git log -p

# Graph view of branches
git log --oneline --graph --all

# See last 5 commits
git log --oneline -5
```

### Compare Branches

```bash
# See what's different between branches
git diff main..feature/new-feature

# See commits in feature branch not in main
git log main..feature/new-feature
```

---

## 🌿 Branch Management

### Create & Switch Branches

```bash
# Create new branch
git branch fix/bug-name

# Switch to branch
git checkout fix/bug-name

# Create AND switch (shortcut)
git checkout -b fix/bug-name

# Switch back to main
git checkout main
```

### List Branches

```bash
# Local branches
git branch

# All branches (including remote)
git branch -a

# See which branch you're on
git branch --show-current
```

### Delete Branches

```bash
# Delete local branch (safe - won't delete if not merged)
git branch -d branch-name

# Force delete (DESTRUCTIVE - deletes even if not merged)
git branch -D branch-name

# Delete remote branch
git push origin --delete branch-name
```

---

## 🔄 Syncing with GitHub

### Pull Latest Changes

```bash
# Update current branch from GitHub
git pull origin main

# See changes before pulling
git fetch origin
git diff origin/main
```

### Push Changes to GitHub

```bash
# Push current branch
git push origin branch-name

# Push all branches
git push origin --all

# Push and set upstream (for new branches)
git push -u origin branch-name
```

---

## 💡 Best Practices

### Commit Messages

**Good:**
```bash
git commit -m "Fix: Login button not responding on mobile"
git commit -m "Add: Dark mode toggle to settings"
git commit -m "Update: Database schema for new kid profile fields"
```

**Bad:**
```bash
git commit -m "fixes"
git commit -m "stuff"
git commit -m "wip"
```

**Format:**
```
Type: Short description (50 chars or less)

Optional longer explanation if needed.
- Why you made this change
- What problem it solves
- Any side effects
```

**Types:**
- `Fix:` Bug fixes
- `Add:` New features
- `Update:` Changes to existing features
- `Remove:` Deleted features
- `Refactor:` Code cleanup (no behavior change)
- `Docs:` Documentation only

### When to Commit

✅ **Good times:**
- After completing a single logical change
- Before switching to work on something else
- Before trying something risky
- At the end of the day (backup)

❌ **Bad times:**
- In the middle of changing a feature
- When code doesn't run
- When tests are failing (unless that's the commit's purpose)

### Commit Size

**Small commits (preferred):**
- Easy to understand
- Easy to roll back
- Easy to review
- Less risky

**Example of small commits:**
```bash
git commit -m "Add: Login form UI"
git commit -m "Add: Login form validation"
git commit -m "Add: Login API integration"
git commit -m "Fix: Login error handling"
```

---

## 🚨 Common Mistakes & Fixes

### Mistake: Committed to Main Directly

```bash
# Move commit to a new branch
git branch fix/accidental-commit
git reset --hard HEAD~1
git checkout fix/accidental-commit
```

### Mistake: Committed Wrong Files

```bash
# Remove file from last commit (keep file changes)
git reset --soft HEAD~1
git reset HEAD unwanted-file.txt
git commit -m "Your commit message"
```

### Mistake: Need to Change Last Commit Message

```bash
# Change message of last commit (not pushed yet)
git commit --amend -m "New commit message"

# If already pushed (⚠️ requires force push)
git commit --amend -m "New commit message"
git push origin branch-name --force
```

### Mistake: Accidentally Deleted Important Branch

```bash
# Find the commit SHA
git reflog

# Restore the branch
git checkout -b recovered-branch <commit-sha>
```

---

## 🔐 Safety Checklist Before Deploying

### Pre-Deployment Checklist

```bash
# 1. Test locally
npm run dev
# Open http://localhost:5173 and test all features

# 2. Check what's changed
git status
git diff

# 3. Review commits
git log origin/main..HEAD --oneline

# 4. Make sure tests pass (if you have them)
npm test

# 5. Build succeeds
npm run build

# 6. Check Convex functions are deployed
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex deploy

# 7. Merge to main
git checkout main
git merge your-branch-name

# 8. Push to trigger deployment
git push origin main

# 9. Monitor deployment
vercel --prod
```

### Post-Deployment Checklist

```bash
# 1. Visit live site
open https://getsafetunes.com

# 2. Check key features work
# - Login
# - Kid profile selection
# - Music search
# - Playback

# 3. Check Vercel logs for errors
vercel logs getsafetunes.com

# 4. Check Convex logs
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex logs --history 50

# 5. Tag successful deployment
git tag -a production-$(date +%Y-%m-%d) -m "Production deployment"
git push origin --tags
```

---

## 🎓 Learning Resources

### Quick References
```bash
# Save this alias for common operations
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit

# Now you can use:
git st    # instead of git status
git co main   # instead of git checkout main
```

### Visualizing Git

- **GitKraken** - Visual Git client (free)
- **GitHub Desktop** - Simple Git GUI
- **VS Code Git** - Built-in Git support

### Git Cheat Sheet

```bash
# Daily Commands
git status              # What changed?
git add .               # Stage all changes
git commit -m "msg"     # Save changes
git push                # Backup to GitHub
git pull                # Get latest from GitHub

# Branching
git checkout -b name    # New branch
git merge branch        # Merge branch

# Undo
git checkout -- file    # Undo file changes
git reset --soft HEAD~1 # Undo last commit
git revert HEAD         # Undo (safe way)

# History
git log --oneline       # See commits
git diff                # See changes
```

---

## 🆘 Emergency Contacts

### If You Break Something

1. **Don't panic** - Git remembers everything
2. **Check status:** `git status`
3. **See recent commits:** `git log --oneline -10`
4. **Check reflog:** `git reflog` (shows ALL actions, even "deleted" ones)
5. **Ask for help** with the output of those commands

### Useful Commands When Stuck

```bash
# Where am I?
git branch --show-current

# What's different from main?
git diff main

# What did I do recently?
git reflog

# Show me everything
git status
git log --oneline --graph --all -10
```

---

## 📞 Getting Help

- **Git Documentation:** https://git-scm.com/doc
- **GitHub Guides:** https://guides.github.com
- **Interactive Tutorial:** https://learngitbranching.js.org

---

**Remember:** Git is designed to prevent you from losing work. When in doubt:
1. Commit your changes (saves them)
2. Push to GitHub (backs them up)
3. Create a new branch for experiments (safe sandbox)

You can't break anything permanently unless you use `--force` or `--hard`, and even then, Git remembers for 30-90 days in the reflog!
