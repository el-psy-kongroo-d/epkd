# epkd

A minimal, document-style weblog. Posts are written as local Markdown files and published
to Supabase through a CLI; a NestJS API renders and serves them, and a React front end
displays them. The API also injects SSR-lite HTML (title/OG/canonical/JSON-LD and the
rendered article body) so crawlers see real content without a full SSR framework.

## Stack

- **api** — NestJS (Express), Supabase Postgres, remark/rehype + shiki markdown rendering
- **web** — React + Vite + react-router
- **shared** — zod schemas as the single contract (types, error codes, response envelope)

## Getting started

```sh
pnpm install
cp apps/api/.env.example apps/api/.env   # fill in the values (see comments in the file)
pnpm dev                                 # api :3000, web :5173
```

## Writing & publishing

Posts live in Supabase, not in this repo. Write a local `slug-like-this.md` anywhere:

```md
---
title: My title
date: 2026-07-28
---

body...
```

Publish against a running API (local or prod):

```sh
PUBLISH_TOKEN=... API_BASE_URL=http://localhost:3000 pnpm post:publish slug-like-this.md
```

- The file name becomes the slug (`[a-z0-9-]` only).
- `draft: true` in frontmatter refuses to publish.
- Remove a post: `pnpm post:publish --delete slug-like-this`
- Equivalent raw API: `POST` / `DELETE /api/posts` with `Authorization: Bearer $PUBLISH_TOKEN`.

Comments (anonymous nickname + delete password) are written from the web UI via
`/api/posts/:slug/comments`; no CLI involved.

## Environment

All variables are documented inline in [`apps/api/.env.example`](apps/api/.env.example).
Copy it to `apps/api/.env` and fill in `PUBLISH_TOKEN`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS`, and `BASE_URL`.

## Production

The API serves the built web app itself — no separate static host needed:

```sh
pnpm build
cd apps/api && NODE_ENV=production node dist/main.js
```

This serves the static assets from `apps/web/dist`, injects SSR-lite HTML for `/`,
`/archive`, and `/posts/:slug`, and exposes `/sitemap.xml`, `/robots.txt`, and `/rss.xml`.
Unknown slugs return a real HTTP 404.

## Test & build

```sh
pnpm test
pnpm build
```
