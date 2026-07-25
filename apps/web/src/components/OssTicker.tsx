import { useEffect, useState } from "react";
import type { OssRepo } from "@epkd/shared";
import { apiGet } from "../api/client";
import { SectionHead } from "./SectionHead";

export function OssTicker() {
  const [repos, setRepos] = useState<OssRepo[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ repos: OssRepo[] }>("/api/oss")
      .then((data) => {
        if (!cancelled) setRepos(Array.isArray(data?.repos) ? data.repos : []);
      })
      .catch(() => {
        if (!cancelled) setRepos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (repos.length === 0) return null;

  const doubled = [...repos, ...repos];
  const duration = `${repos.length * 5}s`;

  return (
    <section className="section">
      <SectionHead title="OSS Contributions" aside={<span className="aside">merged PRs</span>} />
      <div className="ticker">
        <div className="ticker-track" style={{ animationDuration: duration }}>
          {doubled.map((repo, i) => (
            <span className="ticker-item" key={`${repo.fullName}-${i}`}>
              {i > 0 && <span className="ticker-sep"> · </span>}
              <a className="ticker-repo" href={repo.url}>
                {repo.fullName}
              </a>
              <span className="ticker-count"> +{repo.prCount}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
