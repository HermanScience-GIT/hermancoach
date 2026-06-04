# Functional Prototype Build Plan

## Goal

Turn the current static HermanScience Prompt Challenge mockup into a functional prototype while keeping `main` as the stable mockup branch and doing implementation work on `codex/prototype`.

The prototype should support:

- Prompt submission and scoring.
- Lead capture with one contest entry per email.
- Immediate coach unlock after contact submission.
- Resend email delivery with the user's personalized coach link.
- A reusable `/u/{token}` coach route.
- Postgres storage for contacts, submissions, scores, tokens, admin review state, and winner history.
- A simple admin screen for exporting entries, reviewing/disqualifying submissions, and randomly selecting eligible winners.

The product positioning and UX should continue to follow `docs/Standalone_Prompt_Coach_Approach.md`.

## Branch And Release Workflow

- Keep `main` as the deployed/stable mockup branch until the prototype is ready.
- Build on `codex/prototype`.
- Commit in small, reviewable chunks.
- Push `codex/prototype` regularly.
- Test locally against a local Postgres database.
- When ready, open a PR from `codex/prototype` into `main`.
- Merge only after local testing and Railway deployment configuration are verified.

## Recommended Stack

Use a single web application for the MVP:

- Frontend: current HTML/CSS design ported into app-rendered screens.
- Backend: Node/Express.
- Database: Postgres, using Railway-provided `DATABASE_URL`.
- ORM/query layer: Prisma.
- Email: Resend.
- Hosting: Railway single web service.

The current mockup is static HTML/CSS/JS. For the functional prototype, the simplest practical path is to replace `server.py` with an application server that serves the UI and exposes API routes. The visual mockup can be kept mostly intact while the form actions move from local demo state to backend calls.

Hosted database setup:

- Add a Railway Postgres service inside the same Railway project as the HermanCoach web service.
- Connect the web service through Railway's injected `DATABASE_URL`.
- Do not require a separate external database provider for MVP.

Local development database setup:

- Use a local Docker Postgres instance for development and testing.
- Add Docker Compose or an equivalent local command so the database can be started consistently.
- Keep local `DATABASE_URL` in `.env`, not in committed files.

## Environment Variables

Expected `.env` shape:

```text
DATABASE_URL=postgres://...
RESEND_API_KEY=...
RESEND_API_BASE_URL=https://api.resend.com
EMAIL_FROM_NAME=HermanCoach
EMAIL_FROM_ADDRESS=onboarding@invites.prompttransformer.com
COACH_LINK_EMAIL_SUBJECT=Your Personal HermanCoach Link
PUBLIC_BASE_URL=https://...
PUBLIC_CHALLENGE_URL=https://hermancoach.hermanscience.com

ADMIN_EMAIL=admin@hermanscience.com
ADMIN_PASSWORD_HASH=...
ADMIN_CODE_TTL_MINUTES=10
SESSION_SECRET=...

ACCESS_TOKEN_BYTES=32
IP_CHECK_MODE=soft
DEFAULT_CONTEST_PERIOD=all_time
```

`ADMIN_PASSWORD_HASH` should be a bcrypt/argon hash, not a plaintext password.
Real admin credentials, session secrets, and Resend keys should stay local/private
and be set manually in Railway.

The Resend setup should follow the existing Herman Portal pattern in
`/Users/michaelanderson/projects/herman_portal`: use `RESEND_API_KEY`,
optionally support `RESEND_API_BASE_URL`, and send through the Resend
`/emails` endpoint. Herman Portal names its sender settings
`ADMIN_MFA_FROM_EMAIL` and `ADMIN_MFA_FROM_NAME`; HermanCoach can use the same
implementation pattern with HermanCoach-specific env names. Do not commit API
keys to the repo.

Herman-Admin also uses the same Resend domain and is the better sender-domain
reference for this app. It sends through Resend with:

- `HERMAN_ADMIN_RESEND_API_KEY`
- `HERMAN_ADMIN_INVITE_FROM_EMAIL`
- `HERMAN_ADMIN_INVITE_FROM_NAME`

For HermanCoach, either map the existing Resend key into `RESEND_API_KEY` in
Railway, or support `HERMAN_ADMIN_RESEND_API_KEY` as a fallback. Use
`onboarding@invites.prompttransformer.com` as the current sender address unless
a more specific HermanCoach sender is verified later. Do not commit the API key.

## Data Model

### contacts

Stores the lead/contact identity.

- `id`
- `email`, unique, normalized lowercase
- `first_name`
- `last_name`
- `email_confirmed_at`, nullable
- `email_confirmation_token_hash`, nullable
- `email_confirmation_sent_at`, nullable
- `created_at`
- `updated_at`
- `unsubscribed_at`, nullable

### prompt_submissions

Stores the original contest prompt and review state.

- `id`
- `contact_id`
- `prompt_text`
- `prompt_hash`
- `overall_score`
- `who_score`
- `task_score`
- `context_score`
- `output_score`
- `feedback_summary`
- `status`: `eligible`, `disqualified`, `removed`
- `disqualified_reason`, nullable
- `reviewed_at`, nullable
- `reviewed_by`, nullable
- `created_at`
- `ip_hash`, nullable
- `user_agent`, nullable

MVP rule: one active contest submission per contact/email. If the email already exists, reuse the existing contact and token rather than creating a second contest entry.

### access_tokens

Stores reusable personalized coach links.

- `id`
- `contact_id`
- `token_hash`, unique
- `token_prefix`, optional display/debug helper
- `created_at`
- `last_used_at`, nullable
- `revoked_at`, nullable
- `first_ip_hash`, nullable
- `last_ip_hash`, nullable
- `ip_mismatch_count`, default `0`

Store only a hash of the token. The raw token appears only in the URL emailed/displayed to the user.

### token_access_events

Lightweight audit trail for `/u/{token}` usage.

- `id`
- `access_token_id`
- `created_at`
- `ip_hash`
- `user_agent`
- `action`: `view_coach`, `rescore`, `copy_prompt`, optional

### coach_sessions

Stores coach state after unlock.

- `id`
- `contact_id`
- `access_token_id`
- `current_prompt`
- `draft_version`
- `overall_score`
- `who_score`
- `task_score`
- `context_score`
- `output_score`
- `created_at`
- `updated_at`

### contest_winners

Prevents repeat winners and records drawing history.

- `id`
- `contact_id`
- `prompt_submission_id`
- `selected_at`
- `selected_by`
- `prize_label`, nullable
- `notes`, nullable

Winner eligibility excludes any contact already present in this table.

### admin_login_codes

Backs the emailed admin verification code.

- `id`
- `email`
- `code_hash`
- `expires_at`
- `used_at`, nullable
- `created_at`

## Public User Flow

### 1. Challenge Screen

User enters their best prompt.

API:

```text
POST /api/score-preview
```

Request:

- `promptText`

Response:

- `overallScore`
- `whoScore`
- `taskScore`
- `contextScore`
- `outputScore`
- `feedbackSummary`
- `placementPreview`

For the first functional prototype, scoring can be deterministic/rubric-based without calling an LLM. Later, this endpoint can be upgraded to use the Herman scoring logic.

### 2. Score And Contact Screen

User sees score, details, rankings, personalization teaser, and contact form.

API:

```text
POST /api/entries
```

Request:

- `firstName`
- `lastName`
- `email`
- `promptText`
- score payload from preview, or server recomputes score
- contest agreement boolean

Server behavior:

- Normalize email.
- If email already exists, do not create a second contest entry.
- If no contact exists, create contact.
- If no submission exists for that contact, create submission.
- Generate or reuse personalized token.
- Create or reuse initial coach session.
- Send Resend email with personalized `/u/{token}` link.
- Return the coach URL so the user can proceed immediately.

Response:

- `coachUrl`
- `alreadyEntered`
- `message`

### 3. Personalized Coach Screen

Route:

```text
/u/{token}
```

Server behavior:

- Hash the token and look up `access_tokens`.
- Reject revoked or unknown tokens.
- Load contact, latest submission, and coach session.
- Record access event.
- Perform simple IP sharing check.
- Render/serve the coach state.

Coach actions:

```text
GET /api/coach/session
POST /api/coach/rescore
POST /api/coach/draft
```

The prototype can keep coaching simple:

- Show the current prompt.
- Ask one targeted coaching question based on the weakest dimension.
- Let user update the draft.
- Rescore the draft.
- Copy final prompt.

## Email Flow

Use Resend for:

### User coach link email

Trigger: successful contact submission.

Subject direction:

```text
Your Personal HermanCoach Link
```

Content:

- Thank them for entering the weekly random drawing.
- Include their personalized coach link.
- Note that they can reuse the link.
- Include a lightweight confirmation CTA for prize eligibility.

Email details:

- From name: `HermanCoach`
- Subject: `Your Personal HermanCoach Link`
- From address: use the verified Resend sender address configured in the environment.
  Current sender: `onboarding@invites.prompttransformer.com`.

Optional confirmation:

```text
GET /api/email/confirm?token=...
```

Email confirmation should validate prize eligibility/list quality, but should not block immediate coach access.

### Admin login code email

Trigger: admin enters valid email/password.

Content:

- Short numeric or alphanumeric code.
- Expiration window, default 10 minutes.

## Admin Flow

Route:

```text
/admin
```

### Admin Login

Step 1:

- Email
- Password

Server verifies:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`

If valid, send one-time code through Resend.

Step 2:

- Enter emailed code.

If valid, create signed HTTP-only admin session cookie.

### Admin Dashboard

Core features:

- View submissions table.
- Search/filter by email, name, score, review status, winner status.
- Mark a submission as disqualified.
- Add or edit disqualification reason.
- Restore a disqualified submission to eligible.
- Download CSV of entries.
- Select random winner from eligible pool.

Random winner rules:

- Include only submissions with `status = eligible`.
- Exclude contacts already in `contest_winners`.
- Require `email_confirmed_at IS NOT NULL`.
- Let the admin choose the contest period before drawing.
- Default contest period is all time.
- Randomly select one eligible row.
- Insert into `contest_winners`.
- Show selected winner details.
- Do not enforce contest period automatically outside the admin-selected drawing filter.

### Admin CSV Export

The admin CSV is the downloadable entries export from the admin dashboard.
It is meant to help review contest entries outside the app if needed.

CSV export should include:

- Contact name
- Email
- Submitted prompt
- Scores
- Status
- Disqualification reason
- Created date
- Winner history flag

No extra fields are needed for the MVP export.

## Source IP Sharing Check

Keep this intentionally simple and soft.

Recommended MVP behavior:

- On first `/u/{token}` access, store `first_ip_hash`.
- On later accesses, compare current `ip_hash` to `first_ip_hash`.
- If the IP differs, increment `ip_mismatch_count` and store `last_ip_hash`.
- Do not block immediately.
- If mismatch count crosses a threshold, show a lightweight user-facing sharing notice.

Suggested threshold:

```text
Allow first 2 distinct IP mismatches without friction.
After that, show a soft sharing notice.
```

Suggested notice copy:

```text
Your personal link is not meant to be shared. If you are using a shared link,
get your own coach link and enter for a chance to win your own prize in our
weekly drawing.
```

The notice should link back to the public challenge URL. It should not block access unless abuse becomes a real issue.

Use `PUBLIC_CHALLENGE_URL` from the environment and fall back to `/`.
For now, the production challenge URL is `https://hermancoach.hermanscience.com`.

Why soft instead of hard blocking:

- Mobile networks, VPNs, office networks, travel, and home/work switching can change IPs legitimately.
- The token is already long and unguessable.
- Overly strict IP binding could frustrate the exact people we want to nurture.

Implementation note:

- Hash IPs before storage.
- If deployed behind Railway/proxy, use the trusted forwarded IP header only after proxy configuration is understood.

## Scoring Strategy

The prototype needs real-enough scoring, but does not need a complete AI scoring engine on day one.

Phase 1 deterministic scoring:

- `Who`: looks for role/persona/audience language.
- `Task`: looks for clear action verbs and specific objective.
- `Context`: looks for constraints, situation, audience, source material, or background.
- `Output`: looks for format, length, tone, criteria, examples, or deliverable.

Each dimension produces:

- 0-100 score.
- Short feedback.
- Improvement question.

Overall score can be a weighted or simple average.

Phase 2 scoring:

- Port scoring/coaching behavior from `herman_transform` / `prompt_transformer`.
- Add AI-assisted scoring if deterministic scoring does not provide enough perceived value.
- Keep the deterministic scorer as a fallback even if AI-assisted scoring is added later.

## Implementation Phases

### Phase 1: App Foundation

- Replace static server with functional app server.
- Add dependency/package setup.
- Use Node/Express and Prisma.
- Serve existing UI and assets.
- Add health route.
- Add `.env.example`.
- Add local Docker Postgres configuration.
- Add Railway-friendly start command.

### Phase 2: Database

- Add Postgres client/ORM.
- Create migrations for contacts, submissions, scores, tokens, coach sessions, admin login codes, winners, and token access events.
- Add local Docker database setup notes.
- Add seed/dev helper if useful.

### Phase 3: Public API

- Implement `POST /api/score-preview`.
- Implement `POST /api/entries`.
- Implement `/u/{token}` lookup.
- Wire current UI forms to APIs.
- Replace mock score values with API response values.
- Persist prompt and coach session state.

### Phase 4: Email

- Add Resend integration.
- Send user personalized coach link.
- Add email confirmation link for prize eligibility.
- Add admin login code email.
- Add dev-mode email logging fallback when `RESEND_API_KEY` is absent.

### Phase 5: Admin

- Build `/admin/login`.
- Build emailed-code verification.
- Build `/admin` dashboard.
- Add CSV download.
- Add review/disqualification actions.
- Add contest-period selector for winner drawing, defaulting to all time.
- Add random winner selection with no-repeat-winner rule and confirmed-email requirement.

### Phase 6: Abuse And Access Controls

- Add one-entry-per-email enforcement.
- Add token hashing.
- Add IP access event logging.
- Add soft IP mismatch warning/admin signal.
- Add basic rate limits for scoring, entry submission, admin login, and email sends.

### Phase 7: Prototype QA

- Test challenge-to-email-to-coach flow.
- Test returning `/u/{token}` route.
- Test duplicate email behavior.
- Test admin login and code flow.
- Test disqualification and CSV export.
- Test random winner excludes prior winners.
- Test Railway deployment with Postgres and Resend env vars.

## Clarifying Questions

1. Decide whether to create a more specific verified HermanCoach sender later, or keep using `onboarding@invites.prompttransformer.com`.

## Resolved Product Decisions

- Email confirmation is required for prize eligibility and should be tracked in Postgres.
- Duplicate email submissions should resend the same personalized coach link and must not create duplicate contest entries.
- IP mismatch handling should be user-facing after repeated mismatches, but should remain soft and non-blocking for MVP.
- Admin winner drawing should support a contest-period selector that defaults to all time.
- Resend sending domain is ready; production email sending can be implemented directly.
- One env-defined admin is enough for MVP.
- Duplicate email submissions should send `Your Personal HermanCoach Link` from `HermanCoach` and reuse the same coach URL.
- The random drawing prize label can stay generic as `weekly prize`.
- The shared-link notice URL is TBD and should be environment-driven.
- The public challenge URL should use `https://hermancoach.hermanscience.com` for now.
- The admin CSV export needs no extra fields beyond the planned entry/review/winner fields.
- HermanCoach can reuse the Herman-Admin Resend domain/config pattern for MVP.
- Hosted Postgres should be a Railway Postgres service in the same Railway project.
- Local development should use Docker Postgres.
- The implementation stack should be Node/Express with Prisma.
- Scoring should start deterministic, with AI-assisted scoring reserved for a later upgrade if the deterministic version feels too thin.
