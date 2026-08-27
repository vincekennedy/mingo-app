---
name: calver-release
description: Cuts a Mingo CalVer release on develop via GitHub Action, then opens a develop→master PR. Use when releasing, bumping the version, tagging, or promoting to production.
---

# CalVer release

Policy: `.cursor/rules/releases.mdc`. Prefer the Action on `develop`. Do not hand-edit `package.json` / `package-lock.json` version unless the user asks. Do not run `npm version` (it mangles CalVer).

## Cut the stamp on develop

```bash
gh workflow run "CalVer release on develop" --ref develop
```

The workflow checks out `develop`, runs `scripts/calver-release.sh` (`America/New_York` → `YYYY.MM.DD`, or `.1` / `.2` if that tag exists), commits `chore: release …`, tags `vYYYY.MM.DD`, and pushes to `develop` only.

Wait until the run succeeds, then `git fetch origin` and confirm `origin/develop` has the release commit and tag.

## Promote to production

Open a normal **`develop` → `master`** PR. Do not push the CalVer commit to `master`.

## Same calendar day

Follow-up releases are `YYYY.MM.DD.1`, `.2`, … — the script picks the next unused tag.
