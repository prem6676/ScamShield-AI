import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  FileSearch,
  History,
  Shield,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { api, keys } from "../services/api.js";
import { PersistenceWarning } from "./Shared.jsx";

const navigation = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/scan", label: "Analyze a message", icon: FileSearch },
  { href: "/history", label: "Scan history", icon: History },
  { href: "/about", label: "Safety guide", icon: BookOpen },
];

function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-icon"><Shield size={19} /></span>
      <span>ScamShield<span className="brand-caption">MESSAGE INTELLIGENCE</span></span>
    </Link>
  );
}

export default function AppShell({ children }) {
  const [location] = useLocation();
  const health = useQuery({ queryKey: keys.health, queryFn: api.health });
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${location === href || (href === "/scan" && location.startsWith("/scans/")) ? "active" : ""}`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="service-status">
            <span className={`status-indicator ${health.isError ? "status-unknown" : ""}`} />
            <div>
              <strong>{health.isError ? "Service status unknown" : "Analysis service"}</strong>
              <p>
                {health.isLoading
                  ? "Checking availability…"
                  : health.data?.aiConfigured
                    ? "AI-assisted checks are enabled."
                    : "Rule-based checks are ready."}
              </p>
            </div>
          </div>
          <div className="sidebar-footer">SCAMSHIELD AI · USE WITH CARE</div>
        </div>
      </aside>
      <div className="mobile-header"><Brand /></div>
      <main className="main-area">
        <header className="topbar">
          <span className="topbar-label">Your message safety workspace</span>
          <span className="topbar-label">Submitted URLs are never opened</span>
        </header>
        <div className="content-wrap">
          <PersistenceWarning available={health.data?.persistenceAvailable} />
          {children}
          <footer className="app-footer">
            <span>Analysis is not a guarantee. Verify unexpected requests independently.</span>
            <Link href="/about">Safety guidance</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
