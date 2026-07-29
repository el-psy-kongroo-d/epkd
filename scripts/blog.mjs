#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import matter from "gray-matter";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BASE = process.env.API_BASE_URL ?? "http://localhost:3000";
const TOKEN = process.env.PUBLISH_TOKEN;

const die = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const TIMEOUT_MS = 10_000;

const request = async (path, init) => {
  const res = await fetch(new URL(path, BASE), {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}`, ...init?.headers },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) die(body?.error ? `${body.error.code}: ${body.error.message}` : `HTTP ${res.status}`);
  return body?.data ?? null;
};

const toDate = (v) =>
  v instanceof Date && !Number.isNaN(v.getTime())
    ? v.toISOString().slice(0, 10)
    : typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
      ? v
      : null;

const commands = {
  async publish(file) {
    if (!file) die("usage: pnpm blog publish <file.md>");
    if (!TOKEN) die("PUBLISH_TOKEN is not set");
    const slug = basename(file, extname(file));
    if (!SLUG.test(slug)) die(`invalid slug (filename): "${slug}"`);
    const { data, content } = matter(await readFile(file, "utf8"));
    if (data.draft === true) die("draft: true — refusing to publish");
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const date = toDate(data.date);
    const body = content.trim();
    if (!title || !date || !body) die("frontmatter needs title + date (YYYY-MM-DD) and a non-empty body");
    await request("/api/posts", { method: "POST", body: JSON.stringify({ slug, title, date, content: body }) });
    console.log(`published ${slug} (${date})`);
  },

  async delete(slug) {
    if (!slug || !SLUG.test(slug)) die("usage: pnpm blog delete <slug>");
    if (!TOKEN) die("PUBLISH_TOKEN is not set");
    await request(`/api/posts/${slug}`, { method: "DELETE" });
    console.log(`deleted ${slug}`);
  },

  async list() {
    const posts = (await request("/api/posts")) ?? [];
    if (posts.length === 0) return console.log("(no posts)");
    for (const p of posts) console.log(`${String(p.no).padStart(3)}  ${p.date}  ${p.slug}`);
  },
};

const [cmd, arg] = process.argv.slice(2);
const run = commands[cmd];
if (!run) die("usage: pnpm blog <publish <file.md> | delete <slug> | list>");
try {
  await run(arg);
} catch (e) {
  if (e?.name === "TimeoutError") die(`api at ${BASE} did not respond within ${TIMEOUT_MS / 1000}s`);
  die(e?.cause?.code === "ECONNREFUSED" ? `cannot reach api at ${BASE}` : (e?.message ?? String(e)));
}
