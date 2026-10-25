# CLAUDE.md

Guidance for AI coding assistants (and a fast orientation for humans). Keep output
matching the house style below.

## What this is

**lead-tracker** — an internal tool to capture leads and track them from first contact
through follow-ups to conversion. Learning project first, useful tool second.

## Layout

- `web/` — Angular front end. Own `package.json`.
- `functions/` — Firebase Cloud Functions back end. Own `package.json`.
- `docs/` — the real guidelines. Read these before writing code:
  - [docs/frontend.md](docs/frontend.md)
  - [docs/backend.md](docs/backend.md)
- Repo root is shared tooling only. **Not** an npm workspace — install/run each project
  separately.
- Process, branching, commits: [CONTRIBUTING.md](CONTRIBUTING.md).

## Rules that are easy to get wrong

**Commits** — Conventional Commits, enforced by a commit hook and CI. Imperative,
lowercase subject, no trailing period. Branch `type/issue-number-short-description` off
`main`, one issue per branch, squash-merge.

**Backend**

- Three layers: `handler → domain`, `handler → adapter`. Domain never imports the others.
- Domain functions are pure: no `firebase-admin` / `firebase-functions` / `fetch` / fs.
  Take `now: Date` and `newId: () => string` as arguments — never call `Date.now()`,
  `Math.random()`, `crypto.randomUUID()` inline.
- Dependencies are passed in (args or a `deps` object), never imported as singletons into
  domain code. Compose at the edge.
- One concept per file; the file name is the concept. No `utils.ts` grab-bags.
- Functions over classes. Classes allowed only for a real thing with invariants.
- Validate external input at the boundary; domain assumes valid typed input.
- Tests: `node:test` + `node:assert/strict`, `*.test.ts` next to source, unit tests of
  domain functions with fake deps. No emulator.

**Frontend**

- Standalone components only, no `NgModule`s.
- `OnPush` everywhere; signals for state; `input()`/`output()` functions for new code.
- Feature folders under `web/src/app/features/<feature>/`, lazy-loaded. No cross-feature
  imports — share via `core/` or `shared/`.
- HTTP in services only. Templates stay declarative (no function calls in bindings).
- Tests: `*.spec.ts` next to source; test pure logic directly, `TestBed` for components.

## Commands

```bash
npm install            # root — installs Prettier + Git hooks
npm run format         # Prettier over the whole repo

cd web        && npm install && npm run lint && npm test && npm run build
cd functions  && npm install && npm run lint && npm test && npm run build
```
