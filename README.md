# HermanCoach

Functional prototype branch for the HermanScience Prompt Challenge and Prompt Structure Coach.

## Local Development

Install dependencies:

```bash
npm install
```

Start local Postgres:

```bash
docker compose up -d postgres
```

Create a local `.env` from the example and fill private values as needed:

```bash
cp .env.example .env
```

Generate Prisma client:

```bash
npm run db:generate
```

Apply local database migrations:

```bash
npm run db:migrate
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:8765/
```

Health check:

```text
http://127.0.0.1:8765/health
```

Database health check:

```text
http://127.0.0.1:8765/health/db
```

Set `CQI_LINK` to control the destination of the coach screen's "Take the CQI" button.

Personalized coach route example:

```text
http://127.0.0.1:8765/u/hsc-7f4a9d2b81
```

Admin route:

```text
http://127.0.0.1:8765/admin
```

The admin login uses `ADMIN_EMAIL` plus a SHA-256 password hash in `ADMIN_PASSWORD_HASH`, then sends a one-time code by email. Generate a local hash with:

```bash
node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update(process.argv[1]).digest('hex'))" "your-password"
```

If Resend is not configured locally, email payloads are logged to the terminal for development.

## Prototype API

Score a prompt:

```text
POST /api/score-preview
```

Create or reuse a contest entry:

```text
POST /api/entries
```

Confirm an entry email:

```text
GET /api/email/confirm?token=hce-...
```

Load a personalized coach session:

```text
GET /api/coach/session?token=hsc-...
```

Admin APIs:

```text
POST /api/admin/login
POST /api/admin/verify
GET /api/admin/entries
GET /api/admin/entries.csv
PATCH /api/admin/submissions/:id
POST /api/admin/draw-winner
```

## Railway

The hosted app should run as one Node web service connected to a Railway Postgres service in the same Railway project. Set production secrets manually in Railway; do not commit `.env` files.

Run production migrations during deploy with:

```bash
npm run db:deploy
```
