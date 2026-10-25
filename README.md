# Lead Tracker

## Live Demo

**[moderntech-hr.web.app](https://moderntech-hr.web.app)**

No sign-up needed:

1. Open the live link.
2. On the login page, click **Demo Admin**, **Demo Manager** or **Demo Agent**. This fills
   in the email and password for that role.
3. Click **Sign In**.

Each role sees a different app. **Demo Admin** and **Demo Manager** can open the
Management page (team, roles, invites, pipeline health); **Demo Agent** works with leads,
history and their profile. Every lead has a one-click PDF report. All data in the demo is
fictional.

The API runs on Render's free tier and sleeps when idle, so the first sign-in after a quiet
spell can take up to a minute while it wakes up.

---

A CRM for tracking sales leads from first contact to conversion. Built for ModernTech HR so the team has one place to log leads, follow up on time, and see how the pipeline is actually doing.

The frontend is Angular on Firebase Hosting. The backend is an Express API on Render.com that talks to Firestore and Firebase Auth through the Admin SDK. Everything stays on free tiers (Firebase Spark, Render free) — deployment steps are in [docs/deployment.md](docs/deployment.md).

---

## What it does

Lead management

- Create, edit, delete and view leads
- The person who creates a lead is automatically assigned to it
- Leads can be reassigned to another team member
- Status flow: New, Contacted, Follow-up, Converted, Lost
- Priority levels: Low, Medium, High

Follow-ups

- Each lead can have a next follow-up date
- Overdue follow-ups are highlighted in red
- Due-today follow-ups are marked separately
- When a lead is converted or lost, the follow-up date is cleared automatically

Search and filters

- Search across company, email, phone, industry, notes and assigned rep
- Filter by status
- Sort any column in the table view

Views

- Table view for dense lists
- Card view for a visual scan
- Dashboard with live counts and a conversion rate
- History page that logs every create, update, status change and delete, with who did it and when

Phone numbers

- Country picker with dial codes and flags
- Numbers format as you type
- Stored in E.164 format

Security

- Login required on every page
- Only @moderntech.co.za addresses can sign in (enforced by the API, not just the login page)
- Invite-only: accounts are created by an admin; self-service sign-ups are refused by the API
- Demo accounts work only where `DEMO_MODE=true` (the public portfolio demo)
- Idle timeout after 30 minutes of no activity
- Absolute session limit of 12 hours
- Firestore rules deny all direct client access; only the API reads and writes

Reports

- Download a one-page PDF report for any lead

---

## Stack

Frontend

- Angular with standalone components
- Signals for state
- TypeScript
- libphonenumber-js for phone parsing
- jspdf for PDF generation
- Font Awesome for icons
- Inter for typography

Backend

- Express (Node.js + TypeScript), hosted on Render.com
- Firebase Admin SDK
- Firestore
- Firebase Auth

Tooling

- ESLint
- Prettier
- Husky for Git hooks
- commitlint for commit messages
- Conventional Commits

---

## How it fits together

The frontend calls the Express API over HTTPS with a Firebase ID token, and the API talks to Firestore. Nothing in the browser touches the database directly.

A request looks like this:

    Angular component
      -> LeadService (holds state in a signal, logs to history)
        -> FirebaseLeadApi (fetch to /api/leads with a Bearer token)
          -> Express router (requireAuth: valid token, company domain, invited, demo rules)
            -> domain function (pure logic, no Firebase imports)
            -> Firestore adapter (reads/writes)
              -> Firestore

The backend is split into three layers:

- domain: pure functions that hold the business rules. No Firebase, no network, no clock. Everything is passed in as arguments.
- adapters: the only place that talks to Firestore.
- routers: parse the incoming request, call the domain, hand the result to an adapter, map errors to a response.

The frontend services:

- LeadService - holds the list of leads and logs every change to history
- AuthService - wraps Firebase Auth
- SessionService - idle timeout and heartbeat
- HistoryService - reads the audit log from the API
- FirebaseLeadApi - implements the LeadApi interface and calls the API

---

## Before you start

You need:

- Node.js 24.15.0, pinned in `.nvmrc` (run `nvm use`). The Angular CLI needs it, and
  `npm install` in `web/` and `functions/` refuses older versions (`engine-strict` + `engines`).
- npm 10 or newer.
- A Firebase service-account key for the API (see [docs/deployment.md](docs/deployment.md#1-service-account-key)).
- Firebase CLI, only for deploying hosting/rules: `npm install -g firebase-tools`.

---

## Getting it running

Clone the repo:

    git clone <repo-url>
    cd lead-tracker

Install everything:

    npm install
    cd web && npm install && cd ..
    cd functions && npm install && cd ..

Configure and start the API:

    cd functions
    cp .env.example .env     # then set GOOGLE_APPLICATION_CREDENTIALS
    npm run build
    node --env-file=.env lib/server.js

Check http://localhost:4000/health returns `{"status":"ok",...}`.

Start the frontend in a new terminal:

    cd web
    npm start

Then open http://localhost:4200 and sign in.

---

## Accounts and invitations

Sign-up is invite-only. Nobody can create their own account:

- The login page never creates accounts. An unknown address gets "Incorrect email or
  password. New to Lead Tracker? Contact your admin to be invited."
- The API enforces it too. Firebase Auth will issue a token to anyone who signs up with
  the public web API key, but every API call from an account without a `users/{uid}`
  profile gets **403 `auth/not-invited`**.

To invite someone, an admin or manager opens **Management** → **Team & Role Access
Control** → **Invite a team member**, enters their @moderntech.co.za address and role,
and sends them the one-time password-setup link that appears. If that address had
already self-registered, its password is wiped and its sessions are signed out, so only
the link holder gets in.

The first admin in a new environment is created by hand: see
[docs/deployment.md](docs/deployment.md#5-first-admin).

---

## Demo accounts

Three permanent demo accounts exist in the Firebase project, one per role:

| Account                       | Password          | Role    | Sees                                      |
| ----------------------------- | ----------------- | ------- | ----------------------------------------- |
| demo.admin@moderntech.co.za   | `DemoAdmin123!`   | admin   | Everything, including the Management page |
| demo.manager@moderntech.co.za | `DemoManager123!` | manager | Everything, including the Management page |
| demo.agent@moderntech.co.za   | `DemoAgent123!`   | agent   | Leads, history and profile; no Management |

The login page has a **Demo account shortcuts** panel with three buttons: **Demo Admin**,
**Demo Manager** and **Demo Agent**. Clicking one fills in that account's email and
password; it does not sign in. Press **Sign In** to continue. The normal
@moderntech.co.za check and form validation still apply.

The credentials live in two places, because `web/` and `functions/` are separate projects:

- `web/src/app/features/login/demo-accounts.ts` — the buttons on the login page
- `functions/src/features/admin/demo-accounts.ts` — what the seeder creates

To change a password, edit both files, then re-seed once:

    cd functions
    npm run build
    SEED_DEMO_ACCOUNTS=true node --env-file=.env lib/server.js   # stop it once it logs "Demo accounts verified"
    node --env-file=.env lib/server.js                          # normal start, seeding off

Seeding creates any missing account, resets its password and display name, and writes
its role to `users/{uid}`. Keep `SEED_DEMO_ACCOUNTS=false` in `.env` so passwords are
not reset on every start.

### DEMO_MODE

**The public portfolio demo runs with `DEMO_MODE=true` on its own Firebase project
(`moderntech-hr`), which holds only fictional sample data. Never enable it on a project
that holds real client data.**

`DEMO_MODE` is a backend environment variable (default `false`) and the single switch for
both halves:

- `false`: the API refuses every `demo.*@` account with "Demo accounts are disabled in
  this environment.", and the login page hides the shortcuts panel.
- `true`: the demo accounts work and the shortcuts panel is shown.

The login page reads it at runtime from the public `GET /api/config` endpoint, so the same
frontend build serves staging and production. The accounts are never deleted, only gated.

These passwords are public (they are on the login page and in this README), which is why
`DEMO_MODE` must stay off anywhere real client data lives.

---

## Folder layout

    lead-tracker/
      .github/            PR and issue templates, CI
      .husky/             Git hooks
      docs/               Coding guidelines
      functions/          Express API (deployed to Render)
        src/
          features/
            auth/
            leads/
          platform/
          index.ts
        lib/              Compiled output (gitignored)
      web/                Angular frontend
        src/
          app/
            core/
              guards/
              services/
            features/
              dashboard/
              history/
              leads/
              login/
              profile/
            shared/
              models/
              utils/
            app.config.ts
            app.routes.ts
            app.ts
      CONTRIBUTING.md
      firebase.json
      firestore.rules
      README.md

---

## Working on the project

Branches
Branch from main. One branch per issue. Name it like this:

    type/issue-number-short-description

For example:

    feat/12-lead-list-view
    fix/34-duplicate-follow-up-email
    docs/56-update-readme

Commits
Use Conventional Commits. The commit-msg hook rejects anything else, and CI checks again on the pull request.

Format:

    <type>(<scope>): <subject>

Types are feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert.

Examples:

    feat(leads): add status filter to the lead list
    fix(follow-ups): stop sending reminders after conversion
    docs: explain the domain and adapter split

Keep each commit to one logical change. A PR can have several commits. The PR is squash-merged, so the PR title has to be a valid Conventional Commit too.

Pull requests

- Small and scoped to one issue
- Fill in the PR template and link the issue with Closes #<number>
- CI has to be green (commitlint, formatting, lint, test, build)
- At least one review approval
- Squash-and-merge

The full rules are in CONTRIBUTING.md.

---

## Commands

At the root:

    npm run format          Format everything with Prettier
    npm run format:check    Check formatting without writing

In web/:

    npm start               Dev server on localhost:4200
    npm run build           Production build
    npm test                Unit tests
    npm run lint            Lint TypeScript and templates

In functions/:

    npm run build           Clean and compile TypeScript to lib/
    npm run dev             Run the API with auto-reload (ts-node-dev)
    npm start               Run the compiled API (what Render runs)
    npm test                Build, then run the node:test unit tests
    npm run lint            Type-check with tsc --noEmit

---

## Local or production

The web app picks its API URL at build time: `ng serve` uses
web/src/environments/environment.development.ts (localhost:4000), and `npm run build`
uses web/src/environments/environment.ts (the Render service). Deploying is covered in
[docs/deployment.md](docs/deployment.md).

---

## Status

Phase 1 (core lead management) is done. That covers login, lead CRUD, auto-ownership, assignment, status changes, search, filters, follow-up dates, dashboard metrics, history, and PDF reports.

Phase 2 (dashboard and analytics) is in progress.

Phase 3 (automation and integrations) is planned. That will include automated reminders, email integration, lead scoring, and mobile support.
