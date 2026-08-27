---
name: testing-tiers
description: Chooses which Mingo test command to run (eslint on changed JS, changed Playwright specs, new-spec prepush, smoke, or full suite) before commit, push, or a PR. Use when committing, pushing, adding or editing e2e specs, or deciding which tests to run.
---

# Testing tiers

Policy and secrets: `.cursor/rules/testing-tiers.mdc`. This skill is the playbook: pick a command, run it **before** git, treat hooks as a backstop.

Never print secret values. Log only whether a secret is present (`true`/`false`).

## Which command

| Situation | Command | Notes |
|-----------|---------|--------|
| About to `git commit` | `npm run lint:precommit`, then `npm run test:e2e:precommit` | Lint: changed `.js`/`.jsx`/`.mjs`/`.cjs` only. Specs: changed `e2e/*.spec.js`. Both skip if none. The commit hook uses `--from-commit` so it only checks files that will be committed. |
| About to `git push` | `npm run test:e2e:prepush` | Newly added specs in the push range only. Hook `.cursor/hooks/pre-push-e2e.sh` repeats it. |
| PR into `develop` | `npm run test:e2e:smoke` if you touched landing, `/api`, or lifecycle | CI **PR Smoke Tests** always runs smoke. |
| PR into `master` | `npm run test:e2e` | Local full run when the change is release-shaped or you edited existing specs the prepush gate ignores. |
| Debugging one file | `npx playwright test e2e/<file>.spec.js` | Prefer this over the full suite. |

Do **not** run the full Playwright suite on every commit.

## Order of operations

1. Make the code/test change.
2. Run the matching row above **in this session**.
3. Only then `git commit` / `git push`.
4. If a Cursor hook denies the command: fix the failure, re-run the same npm script. Do not `--no-verify` or rewrite the hook to skip.

## Examples

- Markdown/SQL/skills only: both precommit scripts skip; hook allows.
- `src/*.ts` only: lint-precommit skips (no JS); Playwright skips unless specs changed. Use `npm run typecheck` when you want TS checks.
- `src/*.js` / `.jsx` only: lint those files; Playwright skips; prepush likely skips.
- **Edit** `e2e/lifecycle.spec.js`: that spec at commit; prepush still skips unless the file is **new**.
- **Add** `e2e/foo.spec.js`: that spec at commit; prepush runs it again before the first push.
