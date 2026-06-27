# Atlas

Trumbull's internal project tracker. Phase 1 foundation.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Motion (animation) + dnd-kit (drag and drop)
- Supabase (Postgres, Auth, RLS, Realtime, Storage) — schema in `supabase/migrations`
- Deploys on Vercel

## What is in here now

This is the foundation slice: a polished, animated Kanban board for the
"remove discontinued silicone references" audit, running on seed data so it
runs with no backend. It demonstrates the look and feel, the status columns
(including a first-class Blocked state), the marketplace filter, and the
coverage meter.

The database schema (the real data model) lives in
`supabase/migrations/0001_init.sql` and is ready to apply once the Atlas
Supabase project is provisioned.

## Run it locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Build:

```bash
npm run build
```

## Project structure

```
app/
  layout.tsx        root layout + global styles
  page.tsx          home (renders the board)
  globals.css       theme tokens (light + dark)
components/
  Board.tsx         the Kanban board (dnd-kit + Motion, seed data)
supabase/
  migrations/
    0001_init.sql   full data model + RLS + append-only audit log
.env.local.example  Supabase env vars (fill once provisioned)
```

## Next steps

1. Provision the Atlas Supabase project (free tier to start) and apply
   `0001_init.sql`.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   to `.env.local`, then wire the board to live data and realtime.
3. Add invite-only email/password auth (`@trumbull.com`).
4. Deploy to Vercel at atlas.trumbullecommerce.com.

See `Trumbull-Atlas-Plan.md` for the full plan and phases.
