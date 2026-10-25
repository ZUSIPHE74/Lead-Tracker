# Contributing to lead-tracker

This repo is primarily a learning project, so the process below is deliberately close to
what a normal professional team does. Read it once end to end before your first PR.

## Repo layout

| Path         | What it is                                                                   |
| ------------ | ---------------------------------------------------------------------------- |
| `web/`       | Angular front end (own `package.json`, own lint/test/build)                  |
| `functions/` | Firebase Cloud Functions back end (own `package.json`)                       |
| `docs/`      | Coding guidelines — [frontend](docs/frontend.md), [backend](docs/backend.md) |
| repo root    | Shared tooling only: formatting, commit hooks, CI                            |

The root is **not** an npm workspace. Each project is installed and run on its own.

## Prerequisites

- Node — the version in [`.nvmrc`](.nvmrc) (`nvm use` picks it up)
- npm 10+
- Firebase CLI (`npm i -g firebase-tools`) for backend work

## First-time setup

```bash
git clone <repo-url>
cd lead-tracker
npm install          # root: installs Prettier + the Git hooks (Husky)

cd web && npm install        # once web/ exists
cd ../functions && npm install
```

`npm install` at the root runs `husky` and wires up the commit hooks. If hooks ever stop
firing, run `npm run prepare` again.

## Branching

- Branch from `main`. One GitHub issue per branch.
- Name: `type/issue-number-short-description`
  - e.g. `feat/12-lead-list-view`, `fix/34-duplicate-follow-up-email`
- `type` is one of the Conventional Commit types below.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg`
hook (commitlint) rejects anything that doesn't match, and CI checks it again on the PR.

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `revert`

**Subject rules:** imperative mood ("add", not "added"/"adds"), lowercase first letter,
no trailing period, aim for <= 72 chars.

Good:

```
feat(leads): add status filter to the lead list
fix(follow-ups): stop sending a reminder after conversion
docs: explain the domain/adapter split in the backend guide
```

Bad:

```
Added filter            # not imperative, no type
feat: Stuff.            # vague subject, capitalised, trailing period
update code             # no type, says nothing
```

Keep each commit focused — one logical change. It's fine to have several commits per PR;
the PR is squash-merged, so make the **PR title** a valid Conventional Commit too.

## Before you push

The pre-commit hook formats staged files with Prettier automatically. You still run the
per-project checks yourself:

```bash
# in web/ and/or functions/, whichever you touched
npm run lint
npm test
npm run build
```

Format the whole repo manually any time with `npm run format` (root).

## Pull requests

- Small and scoped to one issue. If it's growing, split it.
- Fill in the PR template. Link the issue with `Closes #<n>`.
- CI must be green (commitlint, formatting, and each project's lint/test/build).
- At least one review approval.
- Squash-and-merge. The squash commit title must be a valid Conventional Commit.

## Tests

- **Backend:** Node's built-in test runner (`node:test` + `node:assert`). Focus on unit
  tests of pure domain functions — see [docs/backend.md](docs/backend.md).
- **Frontend:** Angular's default spec setup. Test pure logic directly; use `TestBed`
  for components — see [docs/frontend.md](docs/frontend.md).

## Adding ESLint later

When `web/` and `functions/` each have their own ESLint config, extend
[`.lintstagedrc.json`](.lintstagedrc.json) so staged `.ts` files in those folders also
run `eslint --fix`. CI already calls `npm run lint --if-present` per project.
