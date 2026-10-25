# Deployment

Everything runs on free tiers. No Blaze plan, no Cloud Functions.

| Piece         | Where                       | Cost                            |
| ------------- | --------------------------- | ------------------------------- |
| Angular app   | Firebase Hosting            | Spark (free)                    |
| Express API   | Render.com web service      | Free instance                   |
| Database      | Firestore (`africa-south1`) | Spark (free)                    |
| Auth          | Firebase Auth               | Spark (free)                    |
| Admin SDK key | Firebase service account    | Free; stored as a Render secret |

Firebase project: `moderntech-hr`, a dedicated portfolio project that holds only
fictional sample data (Firestore in `africa-south1`).

## Environment variables (API, `functions/`)

| Variable                         | Required | Value / notes                                                                                                                                                                                  |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`            | yes      | `moderntech-hr`                                                                                                                                                                                |
| `GOOGLE_APPLICATION_CREDENTIALS` | yes      | Path to the service-account JSON. On Render: `/etc/secrets/service-account.json` (Secret File).                                                                                                |
| `ALLOWED_ORIGINS`                | yes      | Comma-separated CORS origins: `https://moderntech-hr.web.app,https://moderntech-hr.firebaseapp.com`                                                                                            |
| `NODE_ENV`                       | yes      | `production`. Outside production, `http://localhost:4200` is added to CORS automatically.                                                                                                      |
| `ALLOWED_EMAIL_DOMAIN`           | no       | Default `@moderntech.co.za`. Tokens for other emails get 403.                                                                                                                                  |
| `SEED_DEMO_ACCOUNTS`             | no       | Default off. `true` resets the demo accounts to known passwords on boot — never in production.                                                                                                 |
| `DEMO_MODE`                      | no       | Default `false`. `true` lets the public demo.\* accounts sign in and shows the demo shortcuts. `render.yaml` sets `true` for the portfolio demo; never enable it where real client data lives. |
| `PORT`                           | no       | Render sets it. Local default `4000`.                                                                                                                                                          |
| `NODE_VERSION`                   | Render   | `24.15.0` (matches `.nvmrc`)                                                                                                                                                                   |

All of these except the secret file are already in [`render.yaml`](../render.yaml).
For local runs, copy [`functions/.env.example`](../functions/.env.example) to
`functions/.env` and start with `node --env-file=.env lib/server.js`.

The frontend's API URL is set at build time in
[`web/src/environments/environment.ts`](../web/src/environments/environment.ts)
(production) and `environment.development.ts` (`ng serve`).

## One-time setup

### 1. Service-account key

1. [Firebase console](https://console.firebase.google.com) → project
   **moderntech-hr** → gear icon → **Project settings** → **Service accounts**.
2. **Generate new private key** → **Generate key**. A JSON file downloads.
3. Keep it out of the repo. It goes into Render in step 2 and nowhere else.

### 2. Render (API)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect the GitHub repo, pick branch `main`. Render reads `render.yaml` and proposes
   the `moderntech-hr-api` web service on the free plan. **Apply**.
3. Open the service → **Environment** → **Secret Files** → **Add Secret File**.
   Filename `service-account.json`, contents: paste the whole JSON key. **Save**.
4. **Manual Deploy** → **Deploy latest commit** (so the secret file is picked up).
5. When the deploy is live, open `https://<service>.onrender.com/health`. Expect
   `{"status":"ok",...}`.
6. If the URL is not exactly `https://moderntech-hr-api.onrender.com` (Render adds a
   suffix when the name is taken), put the real one in
   `web/src/environments/environment.ts` and commit before step 4 of the next section.

### 3. Firestore rules

The API uses the Admin SDK, which bypasses rules. Clients get no direct access.

1. Firebase console → **Firestore Database** → **Rules**.
2. Replace the contents with [`firestore.rules`](../firestore.rules) → **Publish**.

(Or `firebase deploy --only firestore:rules` with the Firebase CLI.)

Already published to `moderntech-hr` on 2026-10-25 (ruleset `a9b143bb…`). Repeat only
when `firestore.rules` changes.

The `history` composite index (`userId` ascending, `timestamp` descending, from
[`firestore.indexes.json`](../firestore.indexes.json)) must exist too, or "My history"
fails. Create it once in Firebase console → **Firestore Database** → **Indexes**, or with
`firebase deploy --only firestore:indexes`. The Admin SDK service account cannot create
indexes.

### 4. Firebase Hosting (web)

Needs Node ≥ 24.15 locally (Angular CLI 22 requirement) and the Firebase CLI
(`npm install -g firebase-tools`, then `firebase login`).

```bash
cd web
npm ci
npm run build              # outputs web/dist/web/browser
cd ..
firebase deploy --only hosting
```

`firebase.json` serves `web/dist/web/browser` and rewrites all paths to `index.html`.
Always pass `--only hosting` (or `--only hosting,firestore`) so the CLI never tries to
deploy anything that needs Blaze.

### 5. First admin

Sign-up is invite-only and, in production, the demo admin is disabled, so the first real
admin is created by hand once:

1. Firebase console → **Authentication** → **Users** → **Add user**: their
   @moderntech.co.za email and a temporary password. Copy the **User UID**.
2. Firebase console → **Firestore Database** → collection `users` → **Add document** with
   Document ID = that UID and string fields `email`, `displayName` and `role` = `admin`.
3. They sign in with the temporary password, then change it (Firebase password reset).

From then on, admins invite everyone else from **Management** → **Invite a team member**,
and change roles from the same page.

## Smoke test after deploy

```bash
API=https://moderntech-hr-api.onrender.com
curl $API/health                      # 200
curl -i $API/api/leads                # 401 Missing authorization token
curl $API/api/config                  # {"success":true,"demoMode":true} on the portfolio demo
curl -i -X OPTIONS $API/api/leads \
  -H 'Origin: https://evil.example.com' \
  -H 'Access-Control-Request-Method: GET'   # no Access-Control-Allow-Origin header
```

Then sign in on `https://moderntech-hr.web.app`, create, edit and delete a lead,
download its PDF, change the display name on Profile, and check both History views.

## Free-tier behaviour

- Render free instances sleep after 15 minutes without traffic. The first request after
  that takes up to about a minute. While someone is signed in, the session heartbeat
  (every 60 s) keeps it awake.
- A workspace gets 750 free instance hours a month, enough for one always-on service.
  If they run out, the service is suspended until the next month.
