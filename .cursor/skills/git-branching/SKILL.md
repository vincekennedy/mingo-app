---
name: git-branching
description: Syncs origin/develop then creates a feature branch and opens PRs into develop, not master. Use when starting work, creating a branch, or opening a pull request.
---

# Git branching

Policy: `.cursor/rules/git-branching.mdc`. Follow this sequence even if the session already has a branch checked out.

## New feature branch

```text
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/…
```

Do not branch from `master` or skip the pull.

## Land the work

1. Commit and push on that feature branch (or on `develop` only if the user asks to land there).
2. Open the PR with `gh pr create --base develop` (not `master`), unless the user explicitly asks otherwise.

## Production

`master` is for releases. Cut CalVer on `develop`, then PR `develop` → `master` (see skill `calver-release`).
