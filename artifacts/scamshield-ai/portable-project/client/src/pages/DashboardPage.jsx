import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeAlert,
  FileSearch,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, explainError, keys } from "../services/api.js";
import { EmptyState, ErrorState, LoadingState, PageHeading, RiskBadge, ScanRows } from "../components/Shared.jsx";

const riskColors = {
  Low: "#55c895",
  Medium: "#efb85f",
  High: "#ed8580",
  Critical: "#d95d6b",
};

export default function DashboardPage() {
  const stats = useQuery({ queryKey: keys.stats, queryFn: api.stats });
  const recent = useQuery({ queryKey: keys.scans({ limit: 5 }), queryFn: () => api.scans({ limit: 5 }) });
  const cards = [
    { title: "Messages checked", value: stats.data?.totalScans, icon: MessageSquareText, tone: "blue" },
    { title: "Low risk signals", value: stats.data?.lowRiskCount, icon: ShieldCheck, tone: "green" },
    { title: "Needs a closer look", value: stats.data ? stats.data.mediumRiskCount + stats.data.highRiskCount : undefined, icon: BadgeAlert, tone: "amber" },
    { title: "Critical signals", value: stats.data?.criticalRiskCount, icon: ShieldAlert, tone: "red" },
  ];
  const chartData = [
    { name: "Low", count: stats.data?.lowRiskCount || 0 },
    { name: "Medium", count: stats.data?.mediumRiskCount || 0 },
    { name: "High", count: stats.data?.highRiskCount || 0 },
    { name: "Critical", count: stats.data?.criticalRiskCount || 0 },
  ];

  return (
    <>
      <PageHeading
        eyebrow="MESSAGE SAFETY"
        title="A clearer second opinion."
        description="Check a suspicious message, understand the signals, and decide what to do next. No automated check can guarantee a message is safe."
        action={<Link className="button button-primary" href="/scan"><FileSearch size={16} /> Analyze a message <ArrowRight size={15} /></Link>}
      />
      {stats.isError && <ErrorState error={new Error(explainError(stats.error))} retry={() => stats.refetch()} />}
      <section className="metric-grid" aria-label="Scan totals">
        {cards.map(({ title, value, icon: Icon, tone }) => (
          <div className={`metric-card tone-${tone}`} key={title}>
            <div className="metric-label"><Icon size={15} />{title}</div>
            {stats.isLoading ? <div className="skeleton metric-skeleton" /> : <strong>{value ?? "—"}</strong>}
            <span>Across analyzed messages</span>
          </div>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent scans</h2></div>
            <Link className="text-link" href="/history">All history <ArrowRight size={14} /></Link>
          </div>
          {recent.isLoading ? <LoadingState label="Loading recent scans…" /> : null}
          {recent.isError ? <ErrorState error={recent.error} retry={() => recent.refetch()} /> : null}
          {!recent.isLoading && !recent.isError && recent.data?.scans.length ? <ScanRows scans={recent.data.scans} /> : null}
          {!recent.isLoading && !recent.isError && !recent.data?.scans.length && (
            <EmptyState
              title="No scans yet"
              text="Paste a suspicious message to see the signals and safer next steps."
              action={<Link href="/scan" className="button button-secondary">Analyze your first message <ArrowRight size={15} /></Link>}
            />
          )}
        </section>
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">RISK DISTRIBUTION</p><h2>Signals at a glance</h2></div>
          </div>
          {stats.isLoading ? <LoadingState label="Loading risk totals…" /> : stats.data?.totalScans ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={chartData} margin={{ top: 12, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(146,163,200,.1)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#929db3", fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#77849c", fontSize: 10 }} />
                  <Tooltip cursor={{ fill: "rgba(146,163,200,.06)" }} contentStyle={{ background: "#151e31", border: "1px solid #2b3750", borderRadius: 9, color: "#e5ebf7" }} />
                  <Bar dataKey="count" name="Scans" radius={[5, 5, 0, 0]}>
                    {chartData.map((entry) => <Cell key={entry.name} fill={riskColors[entry.name]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {chartData.map((entry) => <span key={entry.name}><i style={{ background: riskColors[entry.name] }} />{entry.name}<b>{entry.count}</b></span>)}
              </div>
            </div>
          ) : (
            <EmptyState title="Risk breakdown appears here" text="Your distribution will update after the first analysis." />
          )}
          <p className="inline-disclaimer">A low risk score does not mean a message is safe.</p>
        </section>
      </div>
    </>
  );
}
