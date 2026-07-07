# nexzy-landing — AI context (repo-level)

Next.js 16 (App Router) + Chakra UI v3. The **public site + admin** for Nexzy. Runs on **:3004** (`next dev -p 3004`). Talks to the API on **:3003** (server-side fetches — the API must be running or pages 404).

> **Master context + marketing/content knowledge base live one level up** in the Nexzy workspace:
> - `../CLAUDE.md` — the full project map (two content engines, systems, standing rules, how to continue).
> - `../growth-playbook/` — the marketing/content source of truth.
>
> Read those first if this repo is opened on its own.

## Where things are
- `src/app/blog`, `src/app/guides`, `src/app/lists` — the three public content page types (article / guide / list). Each has JSON-LD (Article / HowTo / ItemList), canonical, `ViewPing` read counts.
- `src/app/admin` — the admin: Leads, Review queue, Published, Subscribers, Marketing, **Content**, Forum, Analytics, Tools.
- `src/app/sitemap.ts` — dynamic sitemap (auto-includes guides/lists). `src/app/api/published/route.ts` — publish webhook (type-aware revalidate + IndexNow).
- `src/lib/admin/client.ts` — admin API client. `src/components/admin/` — panels (ContentPanel, ListPanel, MarketingPanel…).

## Standing rules (see ../CLAUDE.md for the full list)
1. Verify every change: `npx tsc --noEmit` + `npx prettier --write` on touched files. (Sandbox ESLint may fail on a config quirk — that's environmental, not the code.)
2. Nothing auto-publishes; the admin only moves things through the human Review queue.
3. Keep public URLs type-correct: guides → `/guides`, lists → `/lists`, articles → `/blog`.
4. Communicate results in Chris's format: what you did / what to see + where / how it works / what changed / short git msg.
