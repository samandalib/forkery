# 🔄 Git Workflow & Development Process

This document outlines our Git workflow, branching strategy, and development process for the One-Click Local Preview Extension.

## 🌿 Branching Strategy

### Main Branches

| Branch | Purpose | Status | Merge Policy |
|--------|---------|---------|--------------|
| **`main`** | Production releases | Stable | Only via PR from `develop` |
| **`develop`** | Active development | Active | Direct commits allowed |

### Branch Protection Rules

- **`main`** - Protected, no direct commits
- **`develop`** - Development branch, direct commits allowed
- **Feature branches** - Created from `develop` for complex features

## 🚀 Development Workflow

### 1. Daily Development (on `develop`)

```bash
# Ensure you're on develop branch
git checkout develop

# Pull latest changes
git pull origin develop

# Make your changes
# ... edit files ...

# Stage and commit changes
git add .
git commit -m "feat: description of changes"

# Push to develop
git push origin develop
```

### 2. Feature Development (optional)

For complex features that need isolation:

```bash
# Create feature branch from develop
git checkout -b feature/new-feature-name

# Work on feature
# ... make changes ...

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push feature branch
git push origin feature/new-feature-name

# When ready, merge back to develop
git checkout develop
git merge feature/new-feature-name
git push origin develop

# Clean up feature branch
git branch -d feature/new-feature-name
git push origin --delete feature/new-feature-name
```

### 3. Release Process

When ready to release a new version:

```bash
# Ensure develop is stable and tested
git checkout develop
git pull origin develop

# Merge develop to main
git checkout main
git pull origin main
git merge develop

# Tag the release
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin main
git push origin --tags

# Return to develop for next development cycle
git checkout develop
```

## 📝 Commit Message Convention

### Format
```
type: brief description

- Detailed bullet points
- Additional context
- Breaking changes if any
```

### Types
- **`feat:`** New features
- **`fix:`** Bug fixes
- **`docs:`** Documentation changes
- **`style:`** Code style changes (formatting, etc.)
- **`refactor:`** Code refactoring
- **`test:`** Adding or updating tests
- **`chore:`** Maintenance tasks

### Examples

```bash
git commit -m "feat: add Vue.js project template

- Add Vue 3 + Vite template
- Include TypeScript configuration
- Add Tailwind CSS support
- Update documentation"

git commit -m "fix: resolve preview button not working

- Fix command binding issues
- Add proper context key management
- Resolve status bar ID mismatch
- Ensure extension activates properly"
```

## 🔄 Current Development Status

### Version 0.1 (Released on `main`)
- ✅ Extension activation and UI
- ✅ Project creation from templates
- ✅ Project detection and framework identification
- ✅ Status bar integration
- ✅ Command palette integration
- ✅ Basic preview functionality

### Active Development (on `develop`)
- 🔄 Testing and bug fixes
- 🔄 Performance improvements
- 🔄 Additional framework support
- 🔄 Enhanced error handling

## 🚫 What NOT to Do

### ❌ Never Commit Directly to `main`
```bash
# DON'T do this
git checkout main
git commit -m "quick fix"  # ❌
```

### ❌ Never Force Push to `main`
```bash
# DON'T do this
git push --force origin main  # ❌
```

### ❌ Never Merge `main` into `develop`
```bash
# DON'T do this
git checkout develop
git merge main  # ❌
```

## ✅ Best Practices

### 1. Always Pull Before Committing
```bash
git pull origin develop
# ... make changes ...
git add .
git commit -m "feat: your changes"
git push origin develop
```

### 2. Keep Commits Atomic
- One logical change per commit
- Don't mix features and fixes
- Use descriptive commit messages

### 3. Test Before Pushing
- Ensure extension compiles: `npm run compile`
- Test basic functionality
- Check for obvious errors

### 4. Regular Sync with Remote
```bash
# At least once per day
git pull origin develop
git push origin develop
```

## 🆘 Troubleshooting

### If You Accidentally Commit to `main`
```bash
# 1. Don't push!
# 2. Reset to previous commit
git reset --soft HEAD~1

# 3. Switch to develop
git checkout develop

# 4. Cherry-pick your changes
git cherry-pick main

# 5. Reset main to previous state
git checkout main
git reset --hard origin/main
```

### If `develop` Gets Out of Sync
```bash
# 1. Check status
git status

# 2. Stash any uncommitted changes
git stash

# 3. Reset to match remote
git reset --hard origin/develop

# 4. Reapply your changes
git stash pop
```

### If You Need to Revert a Bad Commit
```bash
# 1. Find the commit hash
git log --oneline

# 2. Revert the commit
git revert <commit-hash>

# 3. Push the revert
git push origin develop
```

## 📚 Related Documentation

- [Development Guide](./DEVELOPMENT.md) - How to set up and work with the codebase
- [Testing Guide](./TESTING.md) - How to test the extension
- [README](./README.md) - Project overview and user guide

## 🔄 Workflow Summary

1. **Daily Work**: Commit and push to `develop`
2. **Feature Work**: Use feature branches if needed
3. **Release**: Merge `develop` → `main` when ready
4. **Never**: Commit directly to `main`

---

**Remember**: `develop` is your playground, `main` is for releases only! 🚀
