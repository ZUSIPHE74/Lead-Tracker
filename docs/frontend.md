# Frontend guidelines (Angular)

Baseline: the official [Angular style guide](https://angular.dev/style-guide). This file
only records where we make a specific choice or want emphasis.

## Project shape

Standalone components only — **no `NgModule`s**. Bootstrap with `bootstrapApplication` and
provide things through `app.config.ts`.

```
web/src/app/
  core/         # app-wide singletons: guards, interceptors, api clients, app config
  shared/       # reusable dumb components, directives, pipes — no feature knowledge
  features/
    leads/
      leads.routes.ts
      lead-list/            # component folder: .ts / .html / .scss / .spec.ts
      lead-detail/
      lead.service.ts       # feature data access (HTTP lives here, not in components)
      lead.model.ts         # types for this feature
  app.routes.ts
  app.config.ts
```

### Feature folders

- Everything a feature needs lives under `features/<feature>/` and nothing outside it
  imports from another feature's internals. Cross-feature sharing goes through `shared/`
  or `core/`.
- Each feature owns a `<feature>.routes.ts` and is **lazy-loaded** from `app.routes.ts`
  via `loadChildren` / `loadComponent`.

## Components

- `changeDetection: ChangeDetectionStrategy.OnPush` on every component.
- Prefer **signals** for component state; `input()` / `output()` functions over the
  `@Input()` / `@Output()` decorators for new code.
- Keep components thin: no business rules, no data shaping beyond display. Push that into
  a service or a plain function.
- No subscriptions managed by hand. Use the `async` pipe, or `toSignal`, or
  `takeUntilDestroyed()`.
- Templates stay declarative: no function calls in bindings, no complex expressions.
  Compute with a `computed()` signal or a pure pipe.
- Use the built-in control flow (`@if`, `@for`, `@switch`), not the legacy structural
  directives.

## Services & data

- HTTP only in services, never in components. Use `HttpClient` with typed responses and a
  declared model type.
- One service per feature area for its data access. Keep app-wide clients (auth, base API)
  in `core/`.
- Errors: handle in the service (map to a typed result or rethrow a typed error); the
  component decides how to display.

## State

Signals + services are the default. Don't add a state-management library until something
concrete forces it — write it up in an ADR first (see `docs/` in the backend guide for the
ADR note; same idea applies here).

## Naming & files

- Files kebab-case: `lead-list.component.ts`, `lead.service.ts`, `lead.model.ts`.
- One primary export per file (a component, a service, a pipe). Small helper types used
  only by that file can live alongside it.
- Selectors prefixed `app-` (or a short project prefix), kebab-case.

## Styling

- Component-scoped styles (`.scss` next to the component). No global styles beyond a small
  `styles.scss` for resets/tokens.
- Prefer CSS custom properties for theme values.

## Tests

- `*.spec.ts` next to the source file.
- Pure logic (formatters, guards' decision functions, mappers): test the function
  directly, no `TestBed`.
- Components: `TestBed` with the component standalone-imported; assert rendered output and
  emitted outputs, not internals.
- Mock HTTP with `HttpTestingController`. Don't hit the network.
- Focus on unit tests for now. It's fine to skip trivial presentational components.

## Formatting & lint

- Prettier (root config) formats `.ts` / `.html` / `.scss`. The pre-commit hook runs it.
- `npm run lint` in `web/` (Angular ESLint) once configured — keep it green before pushing.
