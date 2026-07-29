import type { PostDetail, PostMeta } from "@epkd/shared";
import { ErrorCode, SITE_NAME } from "@epkd/shared";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Comments } from "../components/Comments";
import { Pager } from "../components/Pager";
import { PostSkeleton } from "../components/Skeleton";
import { StatusLine } from "../components/StatusLine";
import { useApi } from "../hooks/useApi";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { ROUTES, readingTime } from "../lib/constants";
import { storageGet, storageSet } from "../lib/safe-storage";
import { NotFound } from "./NotFound";

export function Post() {
  const { slug = "" } = useParams();
  const { data: post, error } = useApi<PostDetail>(`/api/posts/${slug}`);
  const { data: posts } = useApi<PostMeta[]>("/api/posts");
  useDocumentMeta(post ? `${post.title} · ${SITE_NAME}` : SITE_NAME);

  useEffect(() => {
    if (!post) return;
    const key = `epkd-viewed:${post.slug}`;
    if (storageGet("session", key)) return;
    storageSet("session", key, "1");
    fetch(`/api/posts/${post.slug}/view`, { method: "POST" }).catch(() => {});
  }, [post]);

  if (error === ErrorCode.POST_NOT_FOUND || error === ErrorCode.NOT_FOUND) return <NotFound />;
  if (error) return <StatusLine>failed to load this entry.</StatusLine>;
  if (!post) return <PostSkeleton />;

  const sortedAsc = posts ? [...posts].sort((a, b) => a.no - b.no) : [];
  const index = sortedAsc.findIndex((p) => p.slug === post.slug);
  const older = index > 0 ? sortedAsc[index - 1] : null;
  const newer = index >= 0 && index < sortedAsc.length - 1 ? sortedAsc[index + 1] : null;

  return (
    <article>
      <Link className="crumb" to={ROUTES.archive}>
        ← back to archive
      </Link>
      <h1 className="post-title">{post.title}</h1>
      <div className="post-meta">
        no.{post.no} · {post.date} · {readingTime(post.readingMinutes)} · {post.views.toLocaleString()} views
      </div>
      <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />
      <Pager older={older} newer={newer} />
      <Comments slug={post.slug} />
    </article>
  );
}
