#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import matter from "gray-matter";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function apiBase() {
  return process.env.API_BASE_URL ?? "http://localhost:3000";
}

function publishToken() {
  const token = process.env.PUBLISH_TOKEN;
  if (!token) throw new Error("PUBLISH_TOKEN env var must be set");
  return token;
}

function fail(message) {
  const err = new Error(message);
  err.isUsageError = true;
  throw err;
}

async function readFrontmatter(filePath) {
  const raw = await readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content };
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && DATE_REGEX.test(value)) return value;
  return null;
}

async function publish(filePath) {
  const slug = basename(filePath, extname(filePath));
  if (!SLUG_REGEX.test(slug)) fail(`invalid slug (from filename): "${slug}"`);

  const { data, content } = await readFrontmatter(filePath);

  if (data.draft === true) {
    fail(`refusing to publish draft: ${filePath} (frontmatter has "draft: true")`);
  }

  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) fail(`missing/invalid frontmatter "title" in ${filePath}`);

  const date = normalizeDate(data.date);
  if (!date) fail(`missing/invalid frontmatter "date" (expected YYYY-MM-DD) in ${filePath}`);

  const body = content.trim();
  if (!body) fail(`empty content in ${filePath}`);

  const token = publishToken();
  const res = await fetch(new URL("/api/posts", apiBase()), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug, title, date, content: body }),
  });
  await printEnvelope(res);
}

async function remove(slug) {
  if (!SLUG_REGEX.test(slug)) fail(`invalid slug: "${slug}"`);
  const token = publishToken();
  const res = await fetch(new URL(`/api/posts/${slug}`, apiBase()), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) {
    console.log(JSON.stringify({ data: { slug, deleted: true } }, null, 2));
    return;
  }
  await printEnvelope(res);
}

async function printEnvelope(res) {
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {}
  console.log(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  if (!res.ok) process.exitCode = 1;
}

function printUsage() {
  console.error("usage: pnpm post:publish <file.md>");
  console.error("       pnpm post:publish --delete <slug>");
}

async function main() {
  const args = process.argv.slice(2);
  try {
    if (args[0] === "--delete") {
      const slug = args[1];
      if (!slug) fail("--delete requires a slug argument");
      await remove(slug);
      return;
    }
    const file = args[0];
    if (!file) fail("missing <file.md> argument");
    await publish(file);
  } catch (e) {
    console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
    if (e?.isUsageError) printUsage();
    process.exitCode = 1;
  }
}

await main();
