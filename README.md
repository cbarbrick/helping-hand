# Helping Hand

Real help, in your language, in your neighborhood. An app + kiosk system for people facing homelessness, food or housing insecurity, addiction, or unemployment in Miami-Dade. Inspired by one man near the Aldi on NE 108th St.

## What is built (v1)

- Home: "I'm helping someone" / "I need help", in English, Spanish, Haitian Creole
- Guided flow: ID? phone? place to sleep? (if no, route to street outreach, not a shelter) → area → needs → contact → a personal help plan with real phone numbers and call scripts
- Accounts with no email or phone: a name + 6-digit PIN
- Inbox: housing updates, job replies, helper messages and pickup alerts, readable in the app or at any kiosk
- Helper matching: volunteers set their area, people request to meet in person, helpers accept from a dashboard
- Job board: employers post jobs (with "No ID needed", "No address needed", "Same-day pay" tags); anyone can apply, even without an account
- Kiosk mode (`/kiosk?code=NM-108`): food/clothes/hygiene request → pickup code → 20-minute delivery from the warehouse; driver dashboard moves it through Received → Packing → On the way → At the kiosk → Picked up

## Stack

- Next.js 15 (App Router) + TypeScript, plain CSS
- Supabase (Postgres + Auth + Edge Function `pin-signup`) — project `helping-hand` (ref `fqfadlbdsvlhgictyjob`, us-east-1)
- Vercel for hosting (auto-deploys from `main`; `bootstrap.js` only pulls the `source_files` table when `USE_SOURCE_FILES_TABLE=1`)

## Run locally

```bash
npm install
npm run dev
```

Environment (already has safe public fallbacks in `lib/supabase.ts`):

```
NEXT_PUBLIC_SUPABASE_URL=https://fqfadlbdsvlhgictyjob.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4ekH89HcPxt5ImsIZ6MSuw_DLsrc6ip
```

## Key files

- `lib/i18n.ts` — every string in EN / ES / HT. Add a language by adding a dictionary and an entry in `LANGS`.
- `components/HelpFlow.tsx` — the guided questions and the help plan
- `components/Kiosk.tsx` — kiosk screens
- `components/PinLogin.tsx`, `lib/pinAuth.ts` — name + PIN accounts
- `app/helpers/dashboard`, `app/driver`, `app/jobs/new` — staff screens

## Database

Tables: `profiles`, `intakes`, `resources`, `matches`, `jobs`, `job_applications`, `kiosks`, `warehouses`, `supply_requests`, `messages`. Row-level security is on for all of them. Resources are seeded with the Miami-Dade helpline, Miami Recovery Project, Hermanos de la Calle, SSA, DHSMV, Florida Access, Camillus Health, CareerSource, Lifeline, and 211.

## Roles

`seeker` (default), `helper`, `employer`, `driver`, `admin`. Change a role on the Account page or in the `profiles` table.
