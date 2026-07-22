import type { PostMeta } from "@epkd/shared";
import { Link, useSearchParams } from "react-router-dom";
import { SectionHead } from "../components/SectionHead";
import { StatusLine } from "../components/StatusLine";
import { useApi } from "../hooks/useApi";
import { ARCHIVE_PAGE_SIZE, ROUTES } from "../lib/constants";

export function Archive() {
  const { data: posts, error } = useApi<PostMeta[]>("/api/posts");
  const [params, setParams] = useSearchParams();
  if (error) return <StatusLine>failed to load the archive.</StatusLine>;
  if (!posts) {
    return (
      <section className="section">
        <SectionHead title="Archive" />
        <StatusLine>loading…</StatusLine>
      </section>
    );
  }

  const rawPage = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const totalPages = Math.max(1, Math.ceil(posts.length / ARCHIVE_PAGE_SIZE));
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const current = posts.slice((page - 1) * ARCHIVE_PAGE_SIZE, page * ARCHIVE_PAGE_SIZE);

  return (
    <section className="section">
      <SectionHead title="Archive" aside={<span className="aside">{posts.length} entries</span>} />
      <table className="archive">
        <thead>
          <tr>
            <th style={{ width: 36, textAlign: "right" }}>No.</th>
            <th>Title</th>
            <th style={{ width: 96 }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {current.map((p) => (
            <tr key={p.slug}>
              <td className="no">{p.no}</td>
              <td className="title">
                <Link to={ROUTES.post(p.slug)}>{p.title}</Link>
              </td>
              <td className="date">{p.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <nav className="paging" aria-label="pages">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) =>
          n === page ? (
            <strong key={n}>{n}</strong>
          ) : (
            <a
              key={n}
              href={`?page=${n}`}
              onClick={(e) => {
                e.preventDefault();
                setParams({ page: String(n) });
              }}
            >
              {n}
            </a>
          ),
        )}
      </nav>
    </section>
  );
}
