import { COPYRIGHT_YEAR, GITHUB_HANDLE, GITHUB_URL, SITE_NAME } from "@epkd/shared";
import { NavLink, Outlet } from "react-router-dom";
import { ROUTES } from "../lib/constants";

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
        <Outlet />
      </main>
      <footer className="footer">
        <span>
          © {COPYRIGHT_YEAR} · written by <a href={GITHUB_URL}>@{GITHUB_HANDLE}</a>
        </span>
        <span>
          <a href="/rss.xml">rss</a>
        </span>
      </footer>
    </div>
  );
}
