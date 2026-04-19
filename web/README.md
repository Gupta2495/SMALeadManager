# Madhav Leads — web app

Next.js 16 (App Router) + Tailwind v4 + Supabase SSR. This is the
production web UI for Shree Madhav Academy's admissions lead tracker —
it reads and writes the same Supabase project the Python ingester
(`lead_tracker/`) uses.

## Stack

- **Next.js 16** with the App Router and Turbopack
- **Tailwind v4** + a few shadcn/ui primitives (`src/components/ui/*`)
- **Supabase** for auth, DB, and RLS (schema at `../supabase/schema.sql`)
- **Netlify** as the deploy target (`netlify.toml` + `@netlify/plugin-nextjs`)

## Routes

| Path | Role | What it does |
|---|---|---|
| `/login` | public | email + password sign-in via Supabase |
| `/` | authed | Today dashboard — overdue / due today / new leads |
| `/leads` | authed | All leads with filters + "New lead" |
| `/leads/[id]` | authed | Lead detail, call-log form, status actions |
| `/analytics` | authed | Pipeline tiles + top locations/interests |
| `/review` | admin  | Low-confidence ingester extractions queue |
| `/profile` | authed | Profile info + sign out |

`src/middleware.ts` refreshes the Supabase session and redirects
unauthenticated requests to `/login?next=<path>`.

## Local dev

```bash
cd web
cp .env.local.example .env.local   # fill in the 3 Supabase values
npm install
npm run dev                         # http://localhost:3000
```

Set `role = 'admin'` on a row in `public.profiles` to unlock `/review`.

## Scripts

```bash
npm run dev          # Next dev server (Turbopack)
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## Layout

```
src/
├── app/
│   ├── (app)/           # authed routes (layout-level redirect)
│   ├── auth/            # supabase session callbacks
│   ├── login/           # public sign-in
│   ├── globals.css      # ported prototype styles + Tailwind
│   └── layout.tsx       # fonts + shell
├── components/          # TopNav, BottomNav, LeadCard, StatusChip, …
├── lib/
│   ├── supabase/        # client / server / profile helpers
│   ├── date.ts
│   ├── phoneFormat.ts
│   ├── followUpSuggester.ts
│   └── types.ts
└── middleware.ts
```

The design-system source of truth lives in `prototype/` (static JSX). It
is reference-only and excluded from lint/build.

## Deploy

See `../SETUP.md` for the Netlify + Supabase setup walkthrough.
