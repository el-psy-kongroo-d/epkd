import type { PostMeta } from "@epkd/shared";
import { Link } from "react-router-dom";
import { ROUTES } from "../lib/constants";

function PagerItem({ label, post, fallback }: { label: string; post: PostMeta | null; fallback: string }) {
  if (!post) {
    return (
      <span className="off">
        <span className="dir">{label}</span>
        <span className="t">{fallback}</span>
      </span>
    );
  }
  return (
    <Link to={ROUTES.post(post.slug)}>
      <span className="dir">{label}</span>
      <span className="t">{post.title}</span>
    </Link>
  );
}

export function Pager({ older, newer }: { older: PostMeta | null; newer: PostMeta | null }) {
  return (
    <nav className="pager" aria-label="adjacent entries">
      <PagerItem label="← older" post={older} fallback="this is the first entry" />
      <PagerItem label="newer →" post={newer} fallback="this is the latest entry" />
    </nav>
  );
}
