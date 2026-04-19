# Madhav Leads — web UI prototype

This is the interactive design prototype from the Lead Tracker Web UI spec.
Six screens, fully navigable, state held in memory + `localStorage` for the
active route.

## Screens

- **Today** — Overdue / Due today / New leads dashboard
- **Lead detail** — two-column layout with call-logging form, status
  dropdown, source message, history timeline
- **All leads** — search, filters (status, class, sort), table view
- **Analytics** — 8 KPI tiles, weekly captured-vs-admitted bar chart,
  insights
- **Review** — low-confidence extraction queue (admin only)
- **Login** — branded sign-in card

## Run it locally

This is a static site — no build step. Any static server works:

```bash
cd web
python3 -m http.server 5173
# then open http://localhost:5173/
```

Or open `index.html` in a browser. The page pulls React 18 and Babel
standalone from a CDN and compiles the `.jsx` files in the browser.

## File map

| File | What's in it |
|---|---|
| `index.html` | App shell, `<App>` root, `TweaksPanel`, routing state |
| `styles.css` | All visual design tokens, cards, chips, modals, login page |
| `data.jsx` | Mock `LEADS`, `REVIEW`, `WEEKLY`, status/outcome metadata |
| `ui.jsx` | Shared primitives: `Icon`, `StatusChip`, `Toast`, `Modal`, date helpers |
| `nav.jsx` | `TopNav`, `BottomTabs`, `LoginScreen` |
| `dashboard.jsx` | `Dashboard` + `LeadCard` |
| `detail.jsx` | `LeadDetail` + call-logging form + follow-up suggester |
| `all_leads.jsx` | `AllLeads` search/filter/table |
| `analytics.jsx` | `Analytics` tiles + `MiniBarChart` |
| `review.jsx` | `Review` queue (admin-only) |

## What's intentionally not here

The spec targets **Next.js 15 + Tailwind v4 + shadcn/ui + Netlify
Functions + Google Sheets API**. This directory is the visual source of
truth for the real port; none of the below are wired up yet:

- Next.js App Router scaffolding
- Tailwind/shadcn replacements for the custom CSS
- `/api/leads`, `/api/leads/:id`, `/api/follow-ups`, `/api/analytics`,
  `/api/review` — Netlify Functions backed by Google Sheets
- Netlify Identity auth + `<AuthGate>`
- SWR data fetching + 30s stale-while-revalidate
- Offline queue for call logs
- fuzzy search via `fuse.js` (currently a naive `includes`)

## Port order (from the spec)

1. Scaffold Next.js + Tailwind + shadcn, deploy empty shell to Netlify
2. Netlify Identity + `<AuthGate>`
3. `/api/leads` + `/api/leads/:id` (read-only) hitting Sheets
4. Dashboard with real data
5. Lead detail (read-only)
6. Call logging form + `/api/follow-ups` write path
7. Status update flow
8. All Leads filters + search
9. Analytics
10. Review (admin only)
11. Offline queueing
12. Mobile polish

Ship after step 7 as v1.

## Placeholder assumptions (swap when real values arrive)

- Caller: **Priya** · priya@shreemadhav.in
- English UI
- Admin flag = logged-in user (so Review tab is visible in the demo)
