import { COPYRIGHT_YEAR, GITHUB_HANDLE, GITHUB_URL, SITE_NAME } from "@epkd/shared";
import { NavLink, Outlet } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { ErrorBoundary } from "./ErrorBoundary";
import { VisitCounter } from "./VisitCounter";

export function Layout() {
  return (
    <div className="page">
      <header className="doc-header">
        <NavLink className="site" to={ROUTES.home}>
          {SITE_NAME}
        </NavLink>
        <nav>
          <NavLink to={ROUTES.home} end>
            Home
          </NavLink>
          <NavLink to={ROUTES.archive}>Archive</NavLink>
        </nav>
      </header>
      <main>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <span>
          © {COPYRIGHT_YEAR} · written by <a href={GITHUB_URL}>@{GITHUB_HANDLE}</a>
        </span>
        <span className="footer-right">
          <a href="/rss.xml">rss</a>
          <span>·</span>
          <VisitCounter />
        </span>
      </footer>
    </div>
  );
}
