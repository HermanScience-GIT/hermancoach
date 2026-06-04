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

Personalized coach route example:

```text
http://127.0.0.1:8765/u/hsc-7f4a9d2b81
```

## Railway

The hosted app should run as one Node web service connected to a Railway Postgres service in the same Railway project. Set production secrets manually in Railway; do not commit `.env` files.
