# epkd

a minimal document weblog. posts + comments live in Supabase, NestJS api, React front.
api serves SSR-lite (meta/OG/JSON-LD injected server-side) so crawlers see real content.

## dev

    pnpm install
    cp apps/api/.env.example apps/api/.env   # PUBLISH_TOKEN, SUPABASE_URL/SERVICE_ROLE_KEY 채우기
    pnpm dev        # api :3000, web :5173

## write & publish

posts are stored in Supabase (`posts` table), not the repo. write a local `slug-like-this.md`
file anywhere (e.g. `~/epkd-posts/`) with frontmatter:

    ---
    title: My title
    date: 2026-07-28
    ---

    body...

then publish it against a running api (local or prod) with the CLI:

    PUBLISH_TOKEN=... API_BASE_URL=http://localhost:3000 pnpm post:publish slug-like-this.md

`API_BASE_URL` defaults to `http://localhost:3000`. A frontmatter `draft: true` refuses to
publish. To remove a post:

    PUBLISH_TOKEN=... pnpm post:publish --delete slug-like-this

Equivalently, `POST`/`DELETE /api/posts` directly with `Authorization: Bearer $PUBLISH_TOKEN`.
Comments (anonymous nickname + delete password) go through `/api/posts/:slug/comments`
and `DELETE /api/comments/:id` — no CLI needed, they're written from the web UI.

## env vars (apps/api/.env)

| var | required | purpose |
|---|---|---|
| `PORT` | no (default 3000) | api listen port |
| `NODE_ENV` | no | `production` enables prod behavior (static asset serving of web dist, etc.) |
| `PUBLISH_TOKEN` | yes | bearer token guarding `POST`/`DELETE /api/posts` and admin comment delete |
| `CORS_ORIGINS` | yes | comma-separated allowlist for CORS |
| `BASE_URL` | yes | canonical origin used for SEO meta, canonical links, sitemap.xml, robots.txt, RSS |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase service-role key (server-only, never exposed to web) |
| `WEB_DIST` | no | override path to built `apps/web/dist/index.html` (defaults to the sibling `apps/web/dist` in the monorepo; mainly for tests/custom deploy layouts) |

## prod

in production the built web app is served by the api itself: `apps/web` builds a static
`dist/`, and `apps/api` (`NODE_ENV=production`) serves its assets directly and injects
SSR-lite HTML (meta/OG/canonical/JSON-LD, server-rendered article body) for `/`, `/archive`,
and `/posts/:slug`, plus `/sitemap.xml` and `/robots.txt`. Unknown slugs return a real
HTTP 404. Build both, then run the api:

    pnpm build
    cd apps/api && node dist/main.js

## test / build

    pnpm test
    pnpm build
