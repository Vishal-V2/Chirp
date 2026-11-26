# Chirp

A Twitter/X-style social app: short posts ("chirps"), follows, likes, reposts, quotes, real-time messages and notifications.

**Live:** https://chirp-xi-ruddy.vercel.app

## Features

- **Accounts:** sign up with email and password or **Continue with Google**, email confirmation, forgot/reset password, and choosing a username at onboarding.
- **Chirps:** up to 280 characters, up to 4 images or a GIF, polls, location, replies, quote reposts, reposts, likes, bookmarks and delete.
- **Rich text:** `@mentions` (with notifications), `#hashtags` (with hashtag pages and trends) and links. YouTube and X links embed, and X GIFs play inline.
- **Feeds:** For you and Following (including reposts), plus Explore with search, trends and popular chirps.
- **Accounts and safety:** block and mute (Settings lists them), notification sound and pop-ups, and account deletion: deactivate with your password (or a fresh Google sign-in), restorable for 5 days, then deleted for good by a daily Vercel Cron job.
- **Profiles:** avatar (cropped 1:1) and banner (cropped 3:1), bio, an editable username with a live availability check, and Chirps / Replies / Likes tabs (Likes ordered by when you liked them), followers and following.
- **Real time:** private 1:1 messages with typing indicators, and live notifications for likes, replies, reposts, quotes, follows and mentions.
- **Mobile:** bottom navigation, and bars that slide away as you scroll.
- **UI:** light and dark themes, motion and animations (respecting reduced-motion settings).

## Tech stack

| Area        | Choice                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack), React 19, TypeScript                    |
| API         | GraphQL: GraphQL Yoga + Pothos (Prisma and Relay plugins) at `/api/graphql` |
| Client data | urql + Graphcache (normalized cache, optimistic updates), GraphQL Codegen   |
| Database    | PostgreSQL on Supabase, Prisma 7 ORM with `@prisma/adapter-pg`              |
| Auth        | Supabase Auth (email/password + Google OAuth) via `@supabase/ssr`           |
| Storage     | Supabase Storage (`profile-images`, `chirp-media`)                          |
| Realtime    | Supabase Realtime (private channels)                                        |
| Styling     | Tailwind CSS 4, shadcn/ui, Motion                                           |
| Hosting     | Vercel (region `hnd1`)                                                      |

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project

### 1. Install

```bash
npm install
```

`postinstall` generates the Prisma client and the GraphQL types.

### 2. Environment variables

Copy `.env.example` to `.env` and fill it in from Supabase (**Project Settings → Database / API**):

| Variable                               | Used for                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | App runtime: transaction pooler (port 6543, `?pgbouncer=true`)                              |
| `DIRECT_URL`                           | Migrations: session pooler / direct connection (port 5432)                                  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                                                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key                                                             |
| `SUPABASE_SECRET_KEY`                  | Server-only. The daily job that permanently deletes deactivated accounts (login and photos) |
| `CRON_SECRET`                          | Any long random string; Vercel sends it so only Vercel Cron can run that job                |

Never commit `.env`.

### 3. Database

```bash
npm run db:migrate   # apply migrations (tables, RLS, storage and realtime policies)
npm run db:seed      # optional: sample users and chirps. WIPES all Chirp tables first; never run on production
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

### Supabase settings

- **Authentication → URL Configuration:**
  - **Site URL:** your production URL
  - **Redirect URLs:** `https://<your-domain>/**` and `http://localhost:3000/**`
- **Authentication → Sign In / Providers → Google:** enable it, and add the Client ID and Client Secret from Google Cloud (OAuth client, redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`).
- **Email:** the built-in sender is heavily rate-limited. Use custom SMTP (e.g. Resend) for real traffic.

## Scripts

| Command                                   | What it does                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run dev`                             | Start the dev server                                                                               |
| `npm run build` / `npm start`             | Production build / serve                                                                           |
| `npm run lint`                            | ESLint                                                                                             |
| `npm run format` / `npm run format:check` | Format with Prettier / check formatting                                                            |
| `npm run typecheck`                       | TypeScript check                                                                                   |
| `npm run codegen`                         | Regenerate `schema.graphql` and client GraphQL types (run after changing GraphQL types or queries) |
| `npm run db:migrate`                      | Create/apply Prisma migrations                                                                     |
| `npm run db:studio`                       | Open Prisma Studio                                                                                 |
| `npm run db:seed`                         | Seed sample data (wipes existing data; dev only)                                                   |

## Project structure

```
prisma/              schema, migrations, seed
src/app/             routes: (main) app pages, (auth) login/signup, onboarding, API routes
src/components/      UI by feature (tweet, user, feed, messages, layout, auth, providers, ui)
src/graphql/         server schema (types/*), feed/timeline queries, notifications
src/graphql/client/  client queries, mutations, Graphcache config
src/hooks/           client hooks
src/lib/             Prisma, Supabase clients, validation, uploads, rich text, embeds
scripts/             schema printing for codegen, one-off data scripts
src/proxy.ts         session refresh and route protection
```

## Security

- Row Level Security is on for every table. The app reads and writes data only through the GraphQL API on the server, and the database's public Data API is locked.
- Storage uploads are restricted to each user's own folder.
- Realtime uses private channels, so only conversation participants and notification recipients receive events.
- Usernames that clash with app routes (`explore`, `messages`, `settings`, …) are reserved.

## Deployment

Push to `main` and Vercel builds and deploys. Set the same environment variables in **Vercel → Project → Settings → Environment Variables**. Apply new migrations against the production database with `npx prisma migrate deploy` before deploying code that depends on them.

## License

[MIT](LICENSE)
