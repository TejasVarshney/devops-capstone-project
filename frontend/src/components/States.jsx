import { AlertIcon, RefreshIcon } from "./Icons.jsx";

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <section className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kpi kpi--skeleton">
            <span className="skeleton skeleton--sm" />
            <span className="skeleton skeleton--lg" />
            <span className="skeleton skeleton--md" />
          </div>
        ))}
      </section>
      <div className="content-grid">
        <div className="card">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-row">
              <span className="skeleton skeleton--md" />
              <span className="skeleton skeleton--sm" />
              <span className="skeleton skeleton--sm" />
            </div>
          ))}
        </div>
        <div className="card skeleton-card">
          <span className="skeleton skeleton--md" />
          <span className="skeleton skeleton--block" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <section className="card error-state" role="alert">
      <span className="error-state__icon">
        <AlertIcon size={26} />
      </span>
      <h2>Can't reach the TaskBoard API</h2>
      <p className="muted">
        The dashboard loaded, but <code>/api/tasks</code> did not answer.
      </p>
      <code className="error-state__detail">{message}</code>
      <ul className="error-state__hints">
        <li>
          Docker Compose: <code>docker compose ps</code> and <code>docker compose logs backend</code>
        </li>
        <li>
          Kubernetes: <code>kubectl get pods -n taskboard</code> and <code>kubectl get endpoints -n taskboard</code>
        </li>
        <li>
          Readiness: does <code>/ready</code> report the database as reachable?
        </li>
      </ul>
      <button className="btn btn--primary" onClick={onRetry}>
        <RefreshIcon /> Try again
      </button>
    </section>
  );
}

export function ConnectionBanner({ message, onRetry }) {
  return (
    <div className="banner" role="status">
      <AlertIcon size={16} />
      <span>
        Lost connection to the API ({message}). Showing the last data we received.
      </span>
      <button className="banner__action" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast toast--${toast.kind}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
