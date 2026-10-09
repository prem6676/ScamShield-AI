import { ArrowRight, Database, TriangleAlert } from "lucide-react";
import { Link } from "wouter";

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function PersistenceWarning({ available }) {
  if (available !== false) return null;
  return (
    <div className="notice notice-warning" role="status">
      <Database size={17} />
      <span>
        <strong>Scan history is temporary.</strong> Supabase persistence is not
        configured. Scans will be lost when the server restarts.
      </span>
    </div>
  );
}

export function RiskBadge({ level }) {
  return <span className={`risk-badge risk-${String(level).toLowerCase()}`}>{level}</span>;
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function ErrorState({ error, retry }) {
  return (
    <div className="empty-state error-state" role="alert">
      <div className="empty-icon danger-icon"><TriangleAlert size={20} /></div>
      <h2>We couldn’t load this information</h2>
      <p>{error?.message || "Check the service and try again."}</p>
      {retry && <button className="button button-secondary" onClick={retry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><TriangleAlert size={20} /></div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ScanRows({ scans }) {
  return (
    <div className="scan-list">
      {scans.map((scan) => (
        <Link className="scan-row" key={scan.id} href={`/scans/${scan.id}`}>
          <div className="scan-row-copy">
            <div className="scan-row-meta">
              <RiskBadge level={scan.riskLevel} />
              <span>{formatDate(scan.createdAt)}</span>
            </div>
            <strong>{scan.message}</strong>
            <p>{scan.summary}</p>
          </div>
          <span className="scan-score">{scan.riskScore}<small>/100</small><ArrowRight size={16} /></span>
        </Link>
      ))}
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
