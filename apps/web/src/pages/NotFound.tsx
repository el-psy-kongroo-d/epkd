import { SITE_NAME } from "@epkd/shared";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

export function NotFound() {
  useDocumentMeta(`404 · ${SITE_NAME}`);

  return (
    <section className="section">
      <div className="section-head">
        <h2>404 — entry not found</h2>
      </div>
      <p className="status-line">
        the page you requested does not exist. <Link to="/">go home</Link> or browse the{" "}
        <Link to="/archive">archive</Link>.
      </p>
    </section>
  );
}
