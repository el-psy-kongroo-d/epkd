import { Link } from "react-router-dom";

export function NotFound() {
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
