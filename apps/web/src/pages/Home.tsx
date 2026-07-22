import type { PostMeta } from "@epkd/shared";
import { Link } from "react-router-dom";
import { DivergenceMeter } from "../components/DivergenceMeter";
import { SectionHead } from "../components/SectionHead";
import { StatusLine } from "../components/StatusLine";
import { useApi } from "../hooks/useApi";
import { HOME_ENTRY_COUNT, ROUTES, readingTime } from "../lib/constants";

export function Home() {
  const { data: posts, error } = useApi<PostMeta[]>("/api/posts");

  return (
    <>
      <section className="intro">
        <p>
          engineering notes from a one-person future gadget lab — build logs, experiments, and whatever survives the
          worldline shift.
        </p>
        <DivergenceMeter />
      </section>
      <section className="section">
        <SectionHead
          title="Latest Entries"
          aside={
            <Link className="aside" to={ROUTES.archive}>
              view all →
            </Link>
          }
        />
        {error && <StatusLine>failed to load entries. try again later.</StatusLine>}
        {!error && !posts && <StatusLine>loading…</StatusLine>}
        {!error && posts && (
          <ul className="entries">
            {posts.slice(0, HOME_ENTRY_COUNT).map((p) => (
              <li key={p.slug}>
                <span className="no">{p.no}</span>
                <div className="body">
                  <div className="title">
                    <Link to={ROUTES.post(p.slug)}>{p.title}</Link>
                  </div>
                  <div className="meta">
                    {p.date} · {readingTime(p.readingMinutes)}
                  </div>
                  <div className="excerpt">{p.excerpt}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
