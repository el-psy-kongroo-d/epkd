import { DEFAULT_BASE_URL, GITHUB_HANDLE, SITE_DESCRIPTION, SITE_NAME } from "@epkd/shared";
import type { PostDetail } from "@epkd/shared";
import { escapeHtml } from "../common/escape-html";

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  jsonLd?: unknown;
}

export function baseUrl(): string {
  return process.env.BASE_URL ?? DEFAULT_BASE_URL;
}

export function renderHead(meta: PageMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = escapeHtml(meta.canonical);
  const ogType = meta.ogType ?? "website";
  const lines = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta name="twitter:card" content="summary">`,
  ];
  if (meta.jsonLd !== undefined) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c");
    lines.push(`<script type="application/ld+json">${json}</script>`);
  }
  return lines.join("\n    ");
}

export function siteMeta(path: string): PageMeta {
  return { title: SITE_NAME, description: SITE_DESCRIPTION, canonical: `${baseUrl()}${path}` };
}

export function archiveMeta(path: string): PageMeta {
  return { title: `Archive · ${SITE_NAME}`, description: SITE_DESCRIPTION, canonical: `${baseUrl()}${path}` };
}

export function postMeta(post: PostDetail, path: string): PageMeta {
  return {
    title: `${post.title} · ${SITE_NAME}`,
    description: post.excerpt,
    canonical: `${baseUrl()}${path}`,
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      datePublished: post.date,
      author: { "@type": "Person", name: GITHUB_HANDLE },
    },
  };
}

export function notFoundMeta(path: string): PageMeta {
  return { title: `404 · ${SITE_NAME}`, description: SITE_DESCRIPTION, canonical: `${baseUrl()}${path}` };
}

export function renderPostArticle(post: PostDetail): string {
  return (
    `<article>` +
    `<h1 class="post-title">${escapeHtml(post.title)}</h1>` +
    `<div class="post-meta">no.${post.no} · ${escapeHtml(post.date)}</div>` +
    `<div class="post-body">${post.html}</div>` +
    `</article>`
  );
}
