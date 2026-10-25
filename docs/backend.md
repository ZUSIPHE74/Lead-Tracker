# Backend guidelines (Firebase Functions)

Node + TypeScript, deployed as Firebase Cloud Functions. The point of these rules is that
**business logic stays testable without Firebase, emulators, or network.**

## Layering

Three kinds of code. Dependencies point one direction: `handler → domain`, and
`handler → adapter`. Domain never imports the other two.

```
functions/src/
  features/
    leads/
      create-lead.ts            # domain: pure function, the actual rule
      create-lead.test.ts
      lead.ts                   # domain types for this feature
      leads.handler.ts          # trigger/HTTP wiring: parse input, call domain, call adapters
      leads.firestore.ts        # adapter: reads/writes Firestore for leads
  platform/
    firestore.ts                # adapter: shared Firestore client
    clock.ts                    # adapter: () => new Date()
    ids.ts                      # adapter: id generation
  index.ts                      # compose + export the deployed functions
```

### domain — pure functions

- No `firebase-admin`, no `firebase-functions`, no `fetch`/HTTP, no filesystem.
- No hidden clock or randomness: take `now: Date` (or a `clock`) and `newId: () => string`
  as arguments. Never call `Date.now()` / `Math.random()` / `crypto.randomUUID()` inline.
- Given input → return output (or throw a typed domain error). No side effects.
- This is where almost all the unit tests live.

```ts
// create-lead.ts
export interface CreateLeadInput {
  name: string;
  email: string;
  source: LeadSource;
}

export interface CreateLeadDeps {
  now: Date;
  newId: () => string;
}

export function createLead(input: CreateLeadInput, deps: CreateLeadDeps): Lead {
  if (!input.name.trim()) {
    throw new DomainError('lead.name-required');
  }
  return {
    id: deps.newId(),
    name: input.name.trim(),
    email: input.email.toLowerCase(),
    source: input.source,
    status: 'new',
    createdAt: deps.now.toISOString(),
  };
}
```

### adapters — the only place Firebase/externals live

- Thin. Translate between our types and Firestore/Auth/HTTP. No business rules.
- Each adapter is a set of functions that take their client as an argument (or a small
  factory that closes over it), so tests can pass a fake.

### handlers — the entrypoints

- One handler per trigger (`onRequest`, `onDocumentCreated`, scheduled, ...).
- Job: validate/parse the external input at the boundary, build the `deps`, call the
  domain function, hand the result to an adapter, map errors to a response.
- Keep them short and free of branching logic that deserves its own tested function.

```ts
// leads.handler.ts
export const createLeadHandler = onRequest(async (req, res) => {
  const input = parseCreateLeadRequest(req.body); // throws on bad input
  const lead = createLead(input, { now: new Date(), newId: crypto.randomUUID });
  await saveLead(db, lead);
  res.status(201).json(lead);
});
```

## Functions vs classes

- Default to plain functions + modules.
- Classes are allowed, not banned — reach for one only when you're genuinely modelling a
  thing with invariants and a lifecycle. A class that's just a bag of methods with an
  injected dependency should be a module of functions instead.

## File rules

- **One concept per file.** The file name is the concept: `create-lead.ts` exports
  `createLead`; `lead.ts` holds the `Lead` type.
- One primary export per file. Small private helpers used only there can stay.
- No `utils.ts` / `helpers.ts` grab-bags. Name the file after what the function does.

## Dependency injection

- Pass dependencies in — as function arguments or a `deps` object. Don't `import` a
  singleton client into domain code.
- Compose at the edge: the handler (or `index.ts`) is where real clients, the clock, and
  id generators get created and passed down.

## Input validation

- Validate/parse everything crossing the boundary (HTTP body, Firestore trigger payload,
  env) in the handler/adapter layer. A schema library (e.g. zod) is fine here.
- After the boundary, domain functions assume their typed input is already valid.

## Errors

- Domain throws typed errors (`DomainError` with a stable `code`).
- Handlers catch and map: known domain codes → 4xx with the code; anything else → log and 500. Don't leak stack traces to clients.

## Async

- `async`/`await`. Return promises; never leave a floating promise.
- No blocking work in a request path that belongs in a background trigger or scheduled job.

## Config & secrets

- Read from env / Firebase config **in the handler/composition layer only**, then pass the
  values down. Domain code receives plain values, not `process.env`.
- Never commit secrets. `.env` is gitignored; commit a `.env.example` with keys only.

## Tests

- Node's built-in runner: `import { test } from 'node:test'` + `node:assert/strict`.
- `*.test.ts` next to the source (compiled to `*.test.js`; run with
  `node --test` or the `test` script).
- Unit-test domain functions directly with fake `deps` (fixed `now`, counter-based
  `newId`). No emulator, no mocks of Firebase.
- Adapters: keep them so thin they need little testing; if one grows logic, that logic
  belongs back in domain.
- Integration tests against the emulator can come later — not the focus now.

## Architecture decisions

Non-trivial or contested decisions (a new library, a layering change, a data-model choice)
get a short ADR in `docs/adr/NNNN-title.md` — context, decision, consequences. Link it
from the PR.

## Formatting & lint

- Prettier (root config) via the pre-commit hook.
- `npm run lint` in `functions/` once ESLint is configured. Green before pushing.
