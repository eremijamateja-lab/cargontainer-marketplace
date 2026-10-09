# atoms-app — Claude CLI instructions

## What this project is
A full-stack B2B freight marketplace ("Cargontainer" brand — same brand as
the separate `cargontainer-tms` project, different product: this is a
multi-company marketplace, not a single-agency internal TMS). React 18 +
TypeScript + Vite frontend, FastAPI + SQLAlchemy async + Postgres/SQLite
backend. Originally built via the MGX/"Atoms" AI dev platform — see
`.atoms/ARCHITECTURE.md`, `.atoms/ATOMS.md`, `.atoms/PROGRESS.md` for the
platform-generated project history (kept up to date by that tooling, don't
duplicate its content here).

## Ground rule — this project has its OWN freeze policy, respect it
`.atoms/ATOMS.md` states an explicit **MVP-4 FREEZE**: no code changes,
refactoring, redesign, or new features without the user's explicit request.
Last stable checkpoint: 2026-08-14 ("Pilot Cleanup Ready"). Local-dev-only
files (`.env`, `run_local.py`, this CLAUDE.md) are NOT covered by that freeze
— they're new, additive, and don't touch app logic. Actual app code changes
still need explicit sign-off same as always.

## Running it fully locally (no Atoms/MGX cloud dependency)
As of 2026-09-01, confirmed the app's core functionality never actually
required a live Atoms cloud service at runtime — see Session log for the
full audit. Two things were genuinely cloud-sandbox-specific and have local
replacements now:

**Backend** (`app/backend/`):
```
pip install -r requirements.txt -r requirements.default
python run_local.py
```
`run_local.py` is a new local-only launcher (loads `.env` via python-dotenv,
then starts uvicorn on :8000 with reload). The app's own `main.py` /
`start_app_v2.sh` don't load `.env` automatically outside a debugger or the
MGX cloud sandbox, so don't just run `uvicorn main:app` directly — the env
vars won't be there and it'll crash on `DATABASE_URL`.

**Frontend** (`app/frontend/`):
```
npm install
npm run dev
```
(pnpm isn't installed on this machine; npm works fine against the same
package.json — pnpm-lock.yaml just won't be used.) Vite already proxies
`/api` → `http://localhost:8000` (see `vite.config.ts`), and
`src/lib/config.ts` defaults `API_BASE_URL` to `http://127.0.0.1:8000` even
without the `.env`, so the frontend/backend wiring needs no extra glue.

**Login**: use the local email/password form on the Login page (already the
default — `Login.tsx` posts straight to `/api/v1/local-auth/login`, no
OIDC/SSO involved). Admin login: email `eremija.mateja@gmail.com`, password
`Cargontainer2026!` (auto-seeded on backend startup by
`services/auth.py::initialize_admin_user()` because `ADMIN_USER_ID` /
`ADMIN_USER_EMAIL` are set in `app/backend/.env`).

## What's genuinely still cloud-only (left unconfigured, and that's fine)
- File storage (`OSS_SERVICE_URL`/`OSS_API_KEY`) and "AI Hub"
  (`APP_AI_BASE_URL`/`APP_AI_KEY`) backend services really do call
  MGX-hosted endpoints if invoked — but confirmed via grep that **no
  frontend page calls either one**. Dead code paths, safe to leave blank.
  If a future feature needs file uploads or AI generation, that's when
  these need a real (non-Atoms) provider swapped in.
- OIDC/SSO login (`OIDC_ISSUER_URL` etc.) — unconfigured, and the app
  doesn't need it; local email/password already works standalone.
- Stripe payment — unconfigured, not wired into any current flow.

## `@metagptx/web-sdk` — kept, not removed
The frontend still imports `@metagptx/web-sdk` (`client.entities.*`,
`client.auth.me()`, `client.apiCall.invoke()` — used in ~13 files:
`hooks/useAuth.ts`, `hooks/useAppQueries.ts`, `pages/Dashboard.tsx`,
`pages/Onboarding.tsx`, `pages/PilotCleanup.tsx`, `pages/Admin.tsx`,
`pages/Contact.tsx`, `pages/PendingApproval.tsx`,
`components/ProtectedRoute.tsx`, `pages/AuthCallback.tsx`,
`pages/Index.tsx`, `components/Layout.tsx`, `lib/api.ts`). Confirmed by
reading the built bundle and the backend routers that these calls just hit
this app's OWN `/api/v1/...` routes (e.g. `/api/v1/entities/transport_requests`
is a real FastAPI router in `routers/transport_requests.py`) — it's a thin
same-origin REST client wrapper, not an external Atoms API call. The user
explicitly chose to keep it (2026-09-01) rather than rewrite those 13 files
to plain axios — revisit only if asked.

## Supabase mode (Phase 1, code done 2026-10-05 — schema applied, app not yet tested live)
User decisions 2026-10-04: same Supabase project as TMS Agency/Carrier
(`fkqxptjngfvurthwzzmu`, now on Pro), keep FastAPI, start Marketplace data from
zero (local.db pilot data not migrated), company approval only via TMS Agency
Platform admin. Concept agreed for later: HUBBIG-style front door (carriers free,
corridor profiles, email-digest RFQ alerts with a no-login "send offer" link)
on top of the full in-platform flow + TMS hand-off via `shared_orders`.
- Switch: backend `AUTH_MODE=supabase` (`app/backend/.env.supabase`, start with
  `python run_local.py --env .env.supabase --port 8001`); frontend
  `npx vite --mode supabase` (`app/frontend/.env.supabase`). Without those it's
  the old local SQLite mode — verified unchanged (E2E 27/27 on 2026-10-05).
- DB: all ORM tables go to schema `marketplace` via `schema_translate_map`
  (`core/database.py`); create_all/auto-repair are skipped on Postgres (the repair
  inspects `public`, where same-named TMS tables live!). Schema comes only from
  `app/backend/supabase/migrations/20261005090000_marketplace_schema.sql` (RLS on,
  no policies, anon/authenticated revoked). Locations (~616k rows, only in
  local.db) are copied by `scripts/seed_locations_supabase.py`; on Postgres the
  autocomplete queries only the trigram-indexed `search_key`.
- Auth: `dependencies/auth.py` verifies the Supabase token via `/auth/v1/user`
  and runs `services/supabase_bridge.py::sync_user` (60s cache) which mirrors
  platform_admins → users.role, company_members+companies+company_products →
  `marketplace.companies` (`shared_company_id`), approval = has `marketplace`
  product and plan Trial/Active Paid (Suspended → rejected), member roles
  Admin/Prodaja/Finansije → admin/operations/finance. Admin checks go through
  `is_platform_admin()` (email list only in local mode).
- Disabled in Supabase mode (409/404): marketplace company create, member
  invite/join/remove, admin approve/reject/member-status, local login/register,
  seed endpoint, OIDC/demo login, startup mock/admin seeding. Shared legal/contact
  fields (`SHARED_COMPANY_FIELDS`) are ignored on marketplace edits.
- Onboarding (Supabase): only picks the marketplace role; account without a
  company gets a link to `tms-agency.cargontainer.com/?request=marketplace`.
- Marketplace does NOT write `profiles.active_session_id`, so it never kicks the
  user out of Agency's single-session check.
- Known gap: Agency's Platform admin can't add the `marketplace` product to an
  existing company (only self-signup sets products) — needs an Agency change.

## Known issues
- `tsc --noEmit` reports 2 errors (Vite dev/build don't type-check, so no
  runtime effect): `useAppQueries.ts:220,223` reads `data.request_id` on
  a type that doesn't declare it. Left alone (not signed off).
- Node (`C:\Program Files\nodejs`, v24.20.0) and Python
  (3.14.7, `C:\Users\dell 5500\AppData\Local\Python\pythoncore-3.14-64`) are
  both installed; neither is on PATH for shell sessions opened before the
  respective install, so invoke by full path or open a fresh shell if a
  bare `node`/`python` command isn't found. App verified fully working
  locally — see 2026-09-10 session log entry.

## Session log
### 2026-09-01
- User's goal: "ditch the Atoms app on Claude and have it all on my
  laptop" — decouple from the MGX/Atoms cloud platform entirely, run fully
  standalone. Explored the codebase to find every point of Atoms/MGX
  dependency (grepped for `metagptx`/`atoms`/`S2S_JWT`, read
  `core/config.py`, `core/database.py`, `core/auth.py`,
  `services/storage.py`, `services/aihub.py`, `services/auth.py`,
  `routers/local_auth.py`, `lib/auth.ts`, `hooks/useAuth.ts`,
  `lib/config.ts`, `vite.config.ts`, and the built JS bundle).
- Found the app was already far more self-contained than its branding
  suggested: local email/password login (`Login.tsx` →
  `/api/v1/local-auth/login`) was already the real, working login path, no
  OIDC needed. The `@metagptx/web-sdk` client's `entities`/`apiCall`
  facets turned out to just be a same-origin REST wrapper hitting this
  app's own backend routes, not an external Atoms server. Confirmed via the
  built bundle (`dist/assets/index-*.js`) and by checking that
  `/api/v1/entities/transport_requests` etc. are real routes in
  `routers/*.py`.
- Real cloud dependencies found: file storage (OSS) and "AI Hub" backend
  services genuinely call MGX-hosted endpoints, but neither is invoked by
  any frontend page (grepped `src/` for `storage`/`upload`/`aihub`, no
  hits beyond localStorage). Left unconfigured, harmless.
- The one real blocker was `start_app_v2.sh`, written for the MGX cloud
  sandbox (S2S JWT env-var fetching API, `uv`, Linux-only tools). Bypassed
  it entirely rather than trying to adapt it.
- User chose the smaller of two scopes offered: get it running fully
  locally, keep `@metagptx/web-sdk` installed (harmless, same-origin only).
  Declined the larger option (ripping the SDK out of ~13 files) for now.
- Created: `app/backend/.env` (SQLite DATABASE_URL, generated JWT secret,
  ADMIN_USER_ID/ADMIN_USER_EMAIL so the documented admin login auto-seeds),
  `app/backend/run_local.py` (loads `.env` then starts uvicorn — main.py
  itself doesn't auto-load `.env` outside a debugger), `app/frontend/.env`
  (explicit VITE_API_BASE_URL, though defaults already work without it),
  and `.gitignore` at repo root (none existed before; this repo also isn't
  a git repo yet — no `.git` found).
- **Not yet verified running** — Python isn't installed on this machine
  (checked PATH, WindowsApps alias stubs, common install dirs — genuinely
  absent). Waiting on the user to install Python before `python run_local.py`
  can be tested, same pattern as the Node install for cargontainer-tms.

### 2026-09-10
- **Verified working, fully locally, no Atoms cloud dependency.** User
  installed Python 3.14.7 (`C:\Users\dell 5500\AppData\Local\Python\pythoncore-3.14-64`,
  not yet on PATH for existing shells — invoke by full path or open a fresh
  shell, same PATH-caching gotcha as the Node install had).
  `pip install -r requirements.txt -r requirements.default` succeeded clean
  (asyncpg/greenlet had prebuilt wheels for 3.14, no compiler needed).
  `python run_local.py` booted uvicorn on :8000, created `local.db`
  (SQLite), auto-seeded the mock data + admin user
  (`admin_local_1` / `eremija.mateja@gmail.com`, password `Cargontainer2026!`
  from `_auto_seed_test_accounts`/`initialize_admin_user`) — confirmed via
  log grep, `/health` returned `{"status":"healthy"}`.
  `npm install` (537 packages, `@metagptx/vite-plugin-source-locator`'s
  pnpm-only preinstall script was skipped by npm's script allowlist, no
  problem) + `npm run dev` served the frontend on :3000.
  Drove it with a real Chrome browser via claude-in-chrome: landing page
  renders fully (Cargontainer branding, EN/SR toggle), logged in with the
  admin credentials (had to override a stray Chrome-autofilled password in
  the login form first), JWT issued, `/api/v1/auth/me` and
  `/api/v1/profile/me` both returned 200, correctly redirected to
  `/onboarding` since this fresh admin user has no company profile row yet
  (expected — `initialize_admin_user()` only creates the User, not a
  Profile). Navigating straight to `/admin` correctly redirected back to
  onboarding too (protected-route logic working as designed). Zero console
  errors throughout. Stopped both dev servers and removed the scratch
  log/pid files afterward — `local.db` and `logs/` are left in place
  (gitignored) as the working local dev state.
- Confirmed the whole "ditch Atoms cloud" plan from 2026-09-01 was correct:
  no MGX-hosted service was ever actually called during this run.

### 2026-09-20 → 09-23 (reconstructed 2026-10-04 from file mtimes)
- ~35 files changed in a session that left no log here or in
  `.atoms/PROGRESS.md`. Main addition: **messaging/chat** — new
  `/messages` page (`pages/Messages.tsx`, `components/ChatPanel.tsx`,
  `ChatThreadView.tsx`), per-RFQ and per-offer message threads
  (`routers/request_messages.py`, `routers/messages.py`,
  `routers/message_threads.py`, `models/messages.py`,
  `services/messages.py`), unread badge in nav. Also touched: locations
  model/service, `Flag.tsx`, tailwind/index.css, package.json, and pages
  Dashboard, Directory, Shipments, Offers, PendingApproval, Onboarding,
  Marketplace, Requests, Company, Admin; backend `marketplace.py`,
  `company.py`, `admin.py`.

### 2026-10-04
- Verified the 09-20→23 changes. Backed up `local.db`, seeded the 6 test
  accounts via `POST /api/v1/seed/reset-accounts`, ran an API E2E script
  (login ×3, RFQ create → visible in marketplace → offer → my-offers /
  received-offers → request + offer chat both directions → thread list →
  accept → shipment status → pilot-cleanup scan): 24/25 pass, the 1 fail
  is the threads-500 bug in Known issues. Browser (forwarder test account):
  `/messages` lists threads, sending works; all 8 main pages render, zero
  console errors. Then restored `local.db` from the backup (test accounts
  and test data gone; real 6 users / 5 RFQs intact).
- Gotcha: another `python run_local.py` backend (not started by Claude)
  was already listening on :8000, so a second launch "succeeds" but the
  existing one serves requests. Check `Get-NetTCPConnection -LocalPort 8000`
  before starting.
- Deleted stray root `scratch_out2.txt` (a cargontainer-tms transcript
  dump, not this project).
- Fixes (user signed off): `services/messages.py:264` threads list 500'd
  when an RFQ had `user_company = NULL` → now `or "—"`; removed duplicate
  `'admin.pendingMembers'` keys in `lib/i18n.ts` (kept the later, i.e.
  the value that was already displayed). Re-ran E2E (with DB
  backup/restore): threads endpoint now 200 for carrier too.

### 2026-10-05
- Phase 1 (Supabase) implemented in code — see "Supabase mode" section. Also
  fixed a latent bug: `_normalize_async_database_url` used `str(url)`, which
  masks the password as `***` for any `postgresql://` URL. Pre-change backup:
  `Downloads/atoms-app-backups/atoms-app-pre-phase1-2026-10-05.tgz`.
- Waiting on the user for: OK to run the migration SQL on the live project,
  DB password in `app/backend/.env.supabase`, and two test companies created via
  Agency signup `?request=marketplace` (Claude can't create hosted accounts or
  type passwords for supabase.co).
- **Migration applied 2026-10-05** via Supabase Studio SQL Editor (new query tab;
  the editor content was hash-checked against the repo file, comments aside).
  Studio's "creates tables without RLS" warning is a false positive (RLS is
  enabled by the DO loop at the end) — chose "Run without RLS" to run the SQL
  unchanged. Verified: 9 tables in `marketplace`, rls_on=true on all, anon and
  authenticated have no select and no schema usage. No public object touched.
- Agency "add product" button: done 2026-10-05 after the user allowed edits in
  `cargontainer-tms` (first attempt was blocked by the permission classifier and
  reverted). Tested on the test company (+Marketplace, then removed again);
  uncommitted/undeployed in that repo — see its CLAUDE.md 2026-10-05 entry.
- Fixed the "Known gap" above: Platform admin can now add `marketplace` to any company.
- 2026-10-05 (cont.): user reset the DB password and put the session-pooler URI
  (aws-1-eu-west-1.pooler.supabase.com:5432) in `.env.supabase`. User explicitly
  allowed writes to the live Supabase DB. Copied 616,079 locations into
  `marketplace.locations` (autocomplete "sabac" → Šabac in ~0.7s incl. network).
  Supabase-mode backend on :8001 boots clean (local-only routers not mounted, no
  seeding, no create_all); local-auth/seed → 404, bad token → 401. Frontend
  `vite --mode supabase` on **:3011** (3000 and 3001 are the user's own local-mode
  dev servers). Pool limited to 3+2 connections (project is on NANO compute,
  60 conns shared with TMS).
- **Live Supabase E2E, 2026-10-05** (localhost:3011 = carrier "Cargontainer Test
  Prevoznik" / user's platform-admin account; 127.0.0.1:3011 = forwarder "Ecomsped doo",
  `eremija.mateja+spediter@gmail.com` — two origins = two sessions in one Chrome):
  Agency "+ Marketplace" → marketplace approval flipped to approved within the 60s sync;
  onboarding role pick; RFQ via the real form (autocomplete Šabac/80331 München from
  Supabase locations); carrier sees it, asks a question, submits offer; forwarder sees
  question + offer, replies, accepts (Assigned); carrier sees shipment CRG-61D7F3EF and
  marks Picked Up. All green.
- Found + fixed during the test:
  - **Unauthenticated CRUD** on `/api/v1/entities/companies` and
    `/entities/company_capabilities` (pre-existing Atoms code, also in local mode —
    anyone could read VAT/emails or set approval_status). Those two + `/entities/user_profiles`
    (a user could re-point their own company_id) now require platform admin
    (router-level `Depends(get_admin_user)`); the frontend never calls them.
  - Approval was frontend-only. In Supabase mode every TMS user gets a marketplace identity,
    so business routers (transport_requests, offers, shipments, marketplace, messages,
    request_messages, message_threads) now have `Depends(require_approved_company)`
    (platform admins pass; local mode unchanged).
  - Message sender name fell back to the e-mail (leaked personal e-mail to the other
    company). Now public.profiles.name → auth metadata name → company name.
  - DEBUG logging wrote Supabase auth response headers (user id, cookies) into logs/ —
    httpx/httpcore now at WARNING.
  - Re-verified: no token → 401; forwarder → 403 on the admin-only routes, 200 on business
    routes; carrier can't read another carrier's request thread (non-owner always gets own
    thread). Local-mode E2E still 27/27.
- Gotchas: uvicorn WatchFiles on Windows sometimes misses edits — restart the 8001 backend
  after editing routers. **Agency/Carrier `supabase.auth.signOut()` is global**: logging out
  (or Agency's single-session kick) revokes ALL sessions incl. Marketplace
  (`session_not_found`). **Fixed 2026-10-05**: Agency `f5119af` (logout + single-session
  kick-out; post-password-change sign-out stays global) and Carrier `359651e` now use
  `{ scope: 'local' }`, both deployed. Verified live: Agency logout 2 sessions → 1, the
  Marketplace session survived.
- Known, not fixed (pre-existing): after an offer the carrier's frontend tries
  `PUT /entities/transport_requests/{id}` status=offers_received → 404 (only the owner may),
  error swallowed, RFQ stays "open". Autocomplete orders by city name, so "Munchen" lists
  "Aachener und Münchener …" before München (postal code works).

### 2026-10-07 — deployment prep (Render + Loopia)
- Decision: backend on **Render** (Hobby workspace $0 + Starter instance $7/mo, Frankfurt),
  frontend as static files on the user's existing **Loopia** web hosting
  (`marketplace.cargontainer.com` already exists there, shows Loopia "Sajt u izradi").
  Loopia shared hosting runs Python only as CGI, so it can't host FastAPI; Loopia VPS is
  ~3,239 RSD/mo. Rewriting the backend onto Supabase (RLS/Edge Functions, $0) was discussed
  and postponed — revisit if TMS needs to read Marketplace data directly.
- `git init` (branch `main`, first commit `6b67a48`); no remote yet — user has no GitHub
  repo for this (Agency/Carrier have local git only, Agency deploys via FTP `deploy.sh`).
  Added `render.yaml` (rootDir app/backend, `uvicorn main:app --port $PORT`, /health,
  secrets SUPABASE_URL/ANON_KEY/DATABASE_URL as sync:false) and
  `app/frontend/public/.htaccess` (SPA fallback for BrowserRouter on Apache).
- Verified: backend boots with only the Render env vars (no .env, ENVIRONMENT=prod):
  /health 200, /auth/me 401, local-auth 404.
- Still to do: GitHub repo + push, Render service, then build the frontend with
  `VITE_API_BASE_URL=<render url>` and upload to Loopia (FTP, like Agency's deploy.sh).
  Pending sign-off: CORS is `allow_origin_regex=".*"` (auth is a Bearer header, so low
  risk) — could be restricted to marketplace.cargontainer.com.
- **Backend live on Render 2026-10-07**: `https://cargontainer-marketplace-api.onrender.com`
  (Blueprint "Mateja Cargontainer", service `cargontainer-marketplace-api`, Starter,
  autoDeploy from GitHub `eremijamateja-lab/cargontainer-marketplace` main). Pushed by the
  user (auto-mode blocked Claude's `git push`). Checked: /health 200, /auth/me 401,
  locations autocomplete "sabac" → Šabac from Supabase in ~0.8s.
- **Frontend live on Loopia 2026-10-08**: `https://marketplace.cargontainer.com` (user ran
  `app/frontend/deploy.sh`; 156 files incl. ~300 flag SVGs, takes ~3 min). `.env.deploy`
  is made once by `prepare-deploy.sh` (copies Agency's FTP file, docroot → marketplace).
  Verified: live index + bundle byte-identical to local dist, deep link /messages → index
  (.htaccess works), bundle points at Supabase + Render. Code changes (user signed off):
  `lib/api.ts` web-sdk baseURL from `VITE_API_ORIGIN` (unset locally = same-origin as
  before); `main.py` CORS from `CORS_ALLOW_ORIGINS` (Render: marketplace only; checked
  marketplace → 200, other origin → 400; unset locally = allow-all as before).
- Loopia outage 2026-10-07: Loopia blocked the shared IP (2a02:250:0:8::51 /
  93.188.2.53) because a neighbour site (superoglasi.rs) was attacked → tms-agency,
  tms-carrier, marketplace all down until ~10-08. User chose to stay on Loopia;
  Cloudflare Pages (free, unlimited bandwidth) is the fallback if it recurs. Render Hobby
  static sites only include 5 GB/month bandwidth + 2 custom domains, so not used.
- Gotcha: long `!` commands wrap when pasted and break — give the user short commands
  (scripts under ~/Downloads/...). `git push` is blocked for Claude by auto mode; the user
  runs `! git -C "C:\Users\dell 5500\Downloads\atoms-app" push`.
- 2026-10-08: user logged in on https://marketplace.cargontainer.com (live Supabase + Render) — works.

### 2026-10-09 — Phase 1 of the "ludilo berza" plan: new-request alerts (`24d9a84`)
- Agreed with the user (domain expert): loads get taken within minutes, so NO email
  digests. Instead (1) live board + sound/desktop notification, (2) Web Push to phones.
  All carriers see every request (no "only my carriers" option). Everything free for now;
  manual approval (Platform admin adds the marketplace product) stays. Later phases:
  2 = accepted offer → "Novo sa Marketplace-a" inbox in TMS Agency (needs Agency sign-off),
  3 = verified badge (manual, by Platform admin) + ratings (avg shown after 3).
- Backend: `models/notifications.py` (carrier_corridors per company, push_subscriptions per
  device, push_keys = VAPID pair generated on first use, so no secret env var),
  `services/notifications.py` (corridor_matches, pywebpush send in threads, 404/410 →
  subscription deleted), `routers/notifications.py` (/api/v1/notifications/corridors GET/PUT,
  push/public-key, subscribe, unsubscribe, status, test). `POST /entities/transport_requests`
  schedules `notify_new_request` as a BackgroundTask (own DB session, never breaks the request).
- Frontend: `components/AlertsPanel.tsx` ("Obaveštenja" button on /marketplace for companies
  that can make offers), `lib/push.ts`, `lib/corridors.ts` (same rule as backend),
  `public/sw.js` (push only, NO caching), `manifest.webmanifest` + `icon-512.png` (iOS needs
  Add to Home Screen for push). Board refetches every 10s also in background tabs; NOVO
  badge = arrived live or created < 15 min ago; `/marketplace?request=ID` scrolls + rings it.
- Tested locally (copy of local.db on :8007, vite on :3021, headless Chrome over CDP):
  corridor dedupe/normalise, RS→DE matched 1 company, IT→HU and FR→ES not; unreachable push
  endpoint handled; payload encryption verified by decrypting with the client key; board
  showed a new request after ~3s with NOVO; deep link highlight; zero console errors.
- Migration `20261009090000_marketplace_notifications.sql` applied to live Supabase by Claude
  (user OK'd) via asyncpg: 3 tables, RLS on, anon/authenticated no select; 12 tables total.
