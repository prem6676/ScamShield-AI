import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeAlert, BookOpen,
  Check, CheckCircle2, ChevronRight, CircleHelp, Database, ExternalLink, FileSearch,
  Fingerprint, History, Info, Link2, LoaderCircle, LockKeyhole, Mail, MessageSquareText,
  Search, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, TriangleAlert, WandSparkles,
} from 'lucide-react';
import {
  getGetScansQueryKey, getGetStatsQueryKey, getGetScanQueryKey,
  useAnalyzeMessage, useDeleteScan, useGetScan, useGetScans, useGetStats, useHealthCheck,
} from '@workspace/api-client-react';
import type { RiskLevel, Scan } from '@workspace/api-client-react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } },
});

type NavItem = { href: string; label: string; icon: typeof Shield };
const navigation: NavItem[] = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/scan', label: 'Analyze a message', icon: FileSearch },
  { href: '/history', label: 'Scan history', icon: History },
  { href: '/about', label: 'Safety guide', icon: BookOpen },
];

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}
function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}
function riskClass(level: RiskLevel | string) {
  return `risk-${String(level).toLowerCase()}`;
}
function riskColor(level: RiskLevel | string) {
  if (level === 'Low') return '#70d3a0';
  if (level === 'Medium') return '#e9b45f';
  return '#ea777d';
}
function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
function titleCase(value: string) {
  return value.replaceAll('_', ' ');
}

function Mark() {
  return <div className="brand-mark"><Shield size={19} strokeWidth={1.8} /></div>;
}

function Sidebar() {
  const [location] = useLocation();
  const health = useHealthCheck();
  const persistenceAvailable = health.data?.persistenceAvailable;
  return (
    <>
      <aside className="sidebar">
        <Link href="/" className="brand" data-testid="link-brand">
          <Mark /><span className="brand-name">ScamShield<span className="brand-sub">Message intelligence</span></span>
        </Link>
        <div className="nav-label">Workspace</div>
        <nav className="nav-links" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${location === href || (href === '/scan' && location.startsWith('/scans/')) ? 'active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-box">
            <div className="system-head"><span className="status-dot" style={health.isError ? { background: '#e9b45f' } : undefined} /> {health.isError ? 'Service status unknown' : 'Analysis service'}</div>
            <div className="system-copy">{health.isLoading ? 'Checking service availability…' : health.isError ? 'Could not confirm service health. Analysis may still be available.' : health.data?.aiConfigured ? 'Analysis engine is available. Results may still be uncertain.' : 'Rule-based analysis is available; AI analysis is not configured.'}</div>
          </div>
          <div className="sidebar-foot">SCAMSHIELD AI · USE WITH CARE</div>
        </div>
      </aside>
      <header className="mobile-top">
        <Link href="/" className="brand" data-testid="link-mobile-brand"><Mark /><span className="brand-name">ScamShield</span></Link>
        <span className="eyebrow">Message intelligence</span>
      </header>
      <nav className="mobile-nav" aria-label="Primary navigation">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-link ${location === href || (href === '/scan' && location.startsWith('/scans/')) ? 'active' : ''}`} data-testid={`mobile-link-${label.toLowerCase().replaceAll(' ', '-')}`}>
            <Icon size={14} /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const health = useHealthCheck();
  return <div className="app-shell"><Sidebar /><main className="main-area"><div className="main-inner">{health.data?.persistenceAvailable === false && <PersistenceWarning available={false} />}{children}</div></main></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-head animate-in"><div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-desc">{description}</p></div>{action}</div>;
}

function PersistenceWarning({ available }: { available?: boolean }) {
  if (available !== false) return null;
  return <div className="warning-banner" role="status" data-testid="warning-persistence"><Database size={16} /><span><strong>Scan history is not being saved.</strong> Persistent storage is unavailable right now. Your analysis can still be viewed, but may not appear in history later.</span></div>;
}

function LoadingRows({ count = 3 }: { count?: number }) {
  return <div aria-label="Loading scans" data-testid="status-loading-scans">{Array.from({ length: count }, (_, index) => <div className="scan-row" key={index}><div><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-line" style={{ width: `${72 - index * 9}%` }} /></div><div className="skeleton" style={{ width: 75, height: 24 }} /></div>)}</div>;
}

function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  return <span className={`risk-pill ${riskClass(level)}`} data-testid={`status-risk-${level.toLowerCase()}`}>{level}{typeof score === 'number' && <span className="score">{score}/100</span>}</span>;
}

function ScanListRows({ scans }: { scans: Scan[] }) {
  return <div>{scans.map((scan) => (
    <div className="scan-row" key={scan.id} data-testid={`row-scan-${scan.id}`}>
      <div className="scan-row-main">
        <div className="row-meta"><RiskBadge level={scan.riskLevel} /><span className="row-date">{relativeDate(scan.createdAt)}</span></div>
        <Link href={`/scans/${encodeURIComponent(scan.id)}`} className="row-preview" data-testid={`link-scan-${scan.id}`}>{scan.message}</Link>
        <div className="row-summary">{scan.summary}</div>
      </div>
      <div className="row-actions"><span className="score">{scan.riskScore} / 100</span><Link href={`/scans/${encodeURIComponent(scan.id)}`} className="icon-btn" aria-label="View analysis" data-testid={`button-view-scan-${scan.id}`}><ChevronRight size={17} /></Link></div>
    </div>
  ))}</div>;
}

function Dashboard() {
  const scans = useGetScans({ limit: 5 });
  const stats = useGetStats();
  const statsValues = stats.data;
  return <Shell>
    <PageHeading eyebrow="Your message safety workspace" title="A clearer second opinion." description="Check a suspicious message, understand the signals, and decide what to do next. No automated check can guarantee a message is safe." action={<div className="page-actions"><Link href="/scan" className="btn btn-primary" data-testid="button-start-analysis"><WandSparkles size={15} /> Analyze a message <ArrowRight size={14} /></Link></div>} />
    {(stats.isError || scans.isError) && <div className="error-box" role="alert" data-testid="status-dashboard-error">We couldn't load your dashboard data. {errorText(stats.error ?? scans.error)} <button className="text-link" onClick={() => { void stats.refetch(); void scans.refetch(); }} data-testid="button-retry-dashboard">Try again</button></div>}
    <section className="stat-grid" aria-label="Scan totals">
      {[
        { label: 'Messages checked', value: statsValues?.totalScans, color: '#9bb7ff', tint: 'rgba(108,143,237,.13)', icon: MessageSquareText },
        { label: 'Low signal', value: statsValues?.lowRiskCount, color: '#72d0a0', tint: 'rgba(76,181,128,.12)', icon: ShieldCheck },
        { label: 'Needs a closer look', value: statsValues ? statsValues.mediumRiskCount + statsValues.highRiskCount : undefined, color: '#e8b45f', tint: 'rgba(225,170,82,.12)', icon: BadgeAlert },
        { label: 'Critical risk', value: statsValues?.criticalRiskCount, color: '#ed8384', tint: 'rgba(211,89,89,.13)', icon: ShieldAlert },
      ].map(({ label, value, color, tint, icon: Icon }) => <div className="card stat-card" key={label} style={{ '--tint': tint } as CSSProperties} data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
        <div className="stat-label"><Icon size={13} style={{ color, verticalAlign: 'middle', marginRight: 6 }} />{label}</div>
        <div className="stat-value" style={{ color }}>{stats.isLoading ? <span className="skeleton" style={{ display: 'block', width: 42, height: 25, marginTop: 10 }} /> : value ?? '—'}</div>
        <div className="stat-foot">{stats.isLoading ? 'Loading totals' : 'Across saved analyses'}</div>
      </div>)}
    </section>
    <div className="split-layout">
      <section className="card panel" aria-labelledby="recent-scans-heading">
        <div className="section-heading"><div><div className="section-kicker">Latest activity</div><h2 className="section-title" id="recent-scans-heading" style={{ marginTop: 5 }}>Recent scans</h2></div><Link href="/history" className="text-link" data-testid="link-view-history">All history <ArrowRight size={13} /></Link></div>
        {scans.isLoading ? <LoadingRows /> : scans.isError ? <div className="empty-state"><div className="empty-icon"><TriangleAlert size={21} /></div><h3>Recent scans unavailable</h3><p>We couldn't retrieve your latest analyses.</p><button className="btn btn-quiet" onClick={() => void scans.refetch()} data-testid="button-retry-scans">Retry</button></div> : scans.data?.scans?.length ? <ScanListRows scans={scans.data.scans} /> : <div className="empty-state"><div className="empty-icon"><FileSearch size={21} /></div><h3>No scans yet</h3><p>Paste a suspicious message to get a readable breakdown of its risk signals.</p><Link href="/scan" className="btn btn-quiet" data-testid="button-empty-first-scan">Analyze your first message <ArrowRight size={14} /></Link></div>}
        {!scans.isLoading && !scans.isError && scans.data?.scans?.length ? <div className="recent-footer"><span>Showing {scans.data.scans.length} of {scans.data.total ?? 0} scans</span><Link href="/history" className="text-link">Browse history <ArrowRight size={13} /></Link></div> : null}
      </section>
      <section className="card panel">
        <div className="section-heading"><div><div className="section-kicker">Read the signal</div><h2 className="section-title" style={{ marginTop: 5 }}>Risk at a glance</h2></div><span style={{ color: '#78859b' }}><CircleHelp size={16} /></span></div>
        {stats.isLoading ? <div className="skeleton skeleton-card" /> : stats.data ? <><div className="risk-track"><div className="risk-fill" style={{ width: `${stats.data.totalScans ? Math.max(5, ((stats.data.highRiskCount + stats.data.criticalRiskCount) / stats.data.totalScans) * 100) : 0}%` }} /></div><div className="risk-bars">
          {[
            ['Low', stats.data.lowRiskCount, '#69ca9b'],
            ['Medium', stats.data.mediumRiskCount, '#e6b461'],
            ['High', stats.data.highRiskCount, '#e7827f'],
            ['Critical', stats.data.criticalRiskCount, '#d9616d'],
          ].map(([label, count, color]) => <div className="risk-bar-row" key={label as string}><span>{label}</span><div className="mini-track"><div className="mini-fill" style={{ width: `${stats.data!.totalScans ? Math.max(Number(count) ? 5 : 0, Number(count) / stats.data!.totalScans * 100) : 0}%`, background: color as string }} /></div><span className="mini-count">{count}</span></div>)}
        </div></> : <div className="empty-state" style={{ padding: '20px 0' }}><p>Risk distribution will appear after your first saved scan.</p></div>}
        <div className="note-callout"><Info size={15} /><span>A low score is not proof of safety. Treat unexpected requests carefully and verify through a trusted channel.</span></div>
      </section>
    </div>
  </Shell>;
}

function AnalyzePage() {
  const [message, setMessage] = useState('');
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [validation, setValidation] = useState('');
  const [, setLocation] = useLocation();
  const queryClientRef = useQueryClient();
  const analyze = useAnalyzeMessage();
  const canSubmit = message.trim().length > 0 && message.length <= 10000;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidation('');
    if (!message.trim()) { setValidation('Paste a message to analyze.'); return; }
    if (message.length > 10000) { setValidation('Messages must be 10,000 characters or fewer.'); return; }
    const normalizedUrl = submittedUrl.trim();
    if (normalizedUrl && !/^https?:\/\/\S+$/i.test(normalizedUrl)) { setValidation('Enter a complete link beginning with http:// or https://.'); return; }
    analyze.mutate({ data: { message: message.trim(), ...(normalizedUrl ? { submittedUrl: normalizedUrl } : {}) } }, {
      onSuccess: async (scan) => {
        await Promise.all([
          queryClientRef.invalidateQueries({ queryKey: getGetScansQueryKey() }),
          queryClientRef.invalidateQueries({ queryKey: getGetStatsQueryKey() }),
        ]);
        setLocation(`/scans/${encodeURIComponent(scan.id)}`);
      },
    });
  }
  return <Shell>
    <PageHeading eyebrow="Message analysis" title="Pause. Check. Then decide." description="Paste the suspicious message as it appeared. We’ll surface signals that may help you assess it—not make the decision for you." />
    {analyze.data && <div className="note-callout" style={{ marginBottom: 17 }}><Info size={15} /><span>Analysis finished but you are viewing this page. <Link href={`/scans/${encodeURIComponent(analyze.data.id)}`} className="text-link">Open the full result <ArrowRight size={13} /></Link></span></div>}
    <div className="card panel form-card">
      <div className="section-heading"><div><div className="section-kicker">SMS · email · chat</div><h2 className="section-title" style={{ marginTop: 5 }}>What did they send you?</h2></div><MessageSquareText size={19} color="#97b2f8" /></div>
      <form onSubmit={submit} noValidate>
        <label htmlFor="message-text" className="field-label">Message text</label>
        <textarea id="message-text" className="textarea" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={10001} placeholder="Paste the message here. Include the sender’s wording and any urgent requests…" data-testid="input-message" />
        <p className="field-help">You can remove personal details before pasting. Avoid sharing passwords, account numbers, or private information.</p>
        <div className="url-input-wrap"><label htmlFor="submitted-url" className="field-label">Link included in the message <span style={{ color: '#748199', fontWeight: 400 }}>(optional)</span></label>
          <div style={{ position: 'relative' }}><Link2 size={15} style={{ position: 'absolute', left: 13, top: 13, color: '#7a88a3' }} /><input id="submitted-url" type="url" className="input" style={{ paddingLeft: 38 }} value={submittedUrl} onChange={(event) => setSubmittedUrl(event.target.value)} placeholder="https://example.com/…" maxLength={2048} data-testid="input-submitted-url" /></div>
          <p className="field-help">We check the URL string you provide; do not open a suspicious link to copy it.</p>
        </div>
        {(validation || analyze.isError) && <div className="error-box" role="alert" data-testid="status-analysis-error">{validation || `Analysis could not be completed. ${errorText(analyze.error)}`}</div>}
        <div className="form-bottom"><span className="char-count" data-testid="text-character-count">{message.length.toLocaleString()} / 10,000 characters</span><button type="submit" className="btn btn-primary" disabled={!canSubmit || analyze.isPending} data-testid="button-analyze">
          {analyze.isPending ? <><LoaderCircle size={15} className="spin" /> Analyzing message…</> : <><Sparkles size={15} /> Analyze message <ArrowRight size={14} /></>}
        </button></div>
      </form>
    </div>
    <div className="note-callout" style={{ maxWidth: 820 }}><LockKeyhole size={15} /><span>ScamShield can be wrong or miss important context. Analysis is not a guarantee, financial advice, or a substitute for verifying directly with the organization through a known, trusted contact method.</span></div>
  </Shell>;
}

function ResultContent({ scan }: { scan: Scan }) {
  const levelColor = riskColor(scan.riskLevel);
  return <>
    <div className="card detail-hero">
      <div className="result-top">
        <div style={{ minWidth: 0 }}><div className="eyebrow">Analysis result · {relativeDate(scan.createdAt)}</div><h1 className="page-title" style={{ fontSize: 27, marginTop: 9 }}>Risk signals found</h1><p className="page-desc" style={{ fontSize: 12 }}>This assessment is an informed signal—not a verdict. Use context and verify independently.</p>
           <div className="result-meta"><RiskBadge level={scan.riskLevel} score={scan.riskScore} /><span className="risk-pill" style={{ color: '#a7b4ce', background: 'rgba(133,150,184,.08)', border: '1px solid rgba(133,150,184,.14)' }}>{scan.confidence.toLocaleString(undefined, { style: 'percent', maximumFractionDigits: 0 })} model self-assessment</span><span className="risk-pill" style={{ color: '#a7b4ce', background: 'rgba(133,150,184,.08)', border: '1px solid rgba(133,150,184,.14)' }}>{scan.analysisSource === 'AI' ? 'AI-assisted' : 'Rule-based'}</span></div>
        </div>
      <div className="score-ring" style={{ '--score': scan.riskScore, '--score-color': levelColor } as CSSProperties} aria-label={`Risk score ${scan.riskScore} out of 100`} data-testid="status-risk-score"><div className="score-ring-inner"><span className="score-number">{scan.riskScore}</span><span className="score-caption">risk score</span></div></div>
      </div>
      <div className="section-kicker" style={{ marginBottom: 8 }}>Assessment</div><p style={{ margin: 0, color: '#b4bfd2', lineHeight: 1.7, fontSize: 13 }} data-testid="text-scan-summary">{scan.summary}</p>
    </div>
    <div className="card panel detail-message-card"><div className="section-heading"><div><div className="section-kicker">Original content</div><h2 className="section-title" style={{ marginTop: 5 }}>Message reviewed</h2></div><Mail size={17} color="#8da9fb" /></div><div className="result-message" data-testid="text-original-message">{scan.message}</div>
      {scan.submittedUrl && <div style={{ marginTop: 12 }}><div className="section-kicker" style={{ marginBottom: 7 }}>Submitted link</div><div className="result-message" style={{ overflowWrap: 'anywhere' }}><ExternalLink size={13} style={{ display: 'inline', marginRight: 7, color: '#9db7ff' }} />{scan.submittedUrl}</div></div>}
      <div className="metadata-grid"><div className="metadata-item"><div className="metadata-label">Category</div><div className="metadata-value">{titleCase(scan.category)}</div></div><div className="metadata-item"><div className="metadata-label">Analysis source</div><div className="metadata-value">{scan.analysisSource === 'AI' ? 'AI-assisted analysis' : 'Rule-based analysis'}</div></div><div className="metadata-item"><div className="metadata-label">Confidence</div><div className="metadata-value">{scan.confidence.toLocaleString(undefined, { style: 'percent', maximumFractionDigits: 0 })} · not certainty</div></div></div>
    </div>
    <div className="detail-columns">
      <section className="card panel"><div className="section-heading"><div><div className="section-kicker">Why it was flagged</div><h2 className="section-title" style={{ marginTop: 5 }}>Signals to consider</h2></div><TriangleAlert size={17} color="#e8b45f" /></div>
        {scan.indicators?.length ? <ul className="result-list" data-testid="list-risk-indicators">{scan.indicators.map((indicator, index) => <li key={`${indicator}-${index}`}><ArrowUpRight size={14} />{indicator}</li>)}</ul> : <p className="page-desc" style={{ fontSize: 12 }}>No specific indicators were identified. That does not establish that the message is safe.</p>}
      </section>
      <section className="card panel"><div className="section-heading"><div><div className="section-kicker">What you can do</div><h2 className="section-title" style={{ marginTop: 5 }}>Safer next steps</h2></div><CheckCircle2 size={17} color="#77d4a4" /></div>
        {scan.recommendations?.length ? <ul className="result-list recommendations" data-testid="list-recommendations">{scan.recommendations.map((recommendation, index) => <li key={`${recommendation}-${index}`}><Check size={14} />{recommendation}</li>)}</ul> : <p className="page-desc" style={{ fontSize: 12 }}>If unsure, do not reply or click. Verify using contact details you find independently.</p>}
      </section>
    </div>
     <div className="note-callout"><Info size={15} /><span>Confidence is a rough system self-assessment, not a scientifically validated probability. A low risk score does not mean the message is safe. Automated analysis can miss context, new tactics, or disguised links. When money, credentials, or personal information are involved, verify through a known channel.</span></div>
  </>;
}

function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? '';
  const scan = useGetScan(id, { query: { enabled: !!id, queryKey: getGetScanQueryKey(id) } });
  const [, setLocation] = useLocation();
  return <Shell>
    <div style={{ marginBottom: 19 }}><Link href="/history" className="text-link" data-testid="link-back-history"><ArrowLeft size={14} /> Back to scan history</Link></div>
    {scan.isLoading && <><div className="card panel skeleton-card" style={{ marginBottom: 15 }} /><div className="card panel"><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-line" /></div></>}
    {scan.isError && <div className="card empty-state" role="alert" data-testid="status-detail-error"><div className="empty-icon"><TriangleAlert size={21} /></div><h3>Analysis unavailable</h3><p>This scan may no longer exist, or the service could not load it.</p><div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}><button className="btn btn-quiet" onClick={() => void scan.refetch()} data-testid="button-retry-detail">Try again</button><button className="btn btn-primary" onClick={() => setLocation('/history')} data-testid="button-return-history">View history</button></div></div>}
    {scan.data && <><div className="page-head" style={{ marginBottom: 18 }}><div><div className="eyebrow">Full analysis</div><h1 className="page-title" style={{ fontSize: 26 }}>A closer look</h1></div><div className="detail-actions"><Link href="/scan" className="btn btn-quiet" data-testid="button-new-analysis">New analysis <ArrowRight size={14} /></Link></div></div><ResultContent scan={scan.data} /></>}
  </Shell>;
}

function HistoryPage() {
  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Scan | null>(null);
  const queryClientRef = useQueryClient();
  const params = { limit: 100, ...(search.trim() ? { search: search.trim() } : {}), ...(riskLevel ? { riskLevel: riskLevel as RiskLevel } : {}) };
  const scans = useGetScans(params);
  const deletion = useDeleteScan();
  const [location, setLocation] = useLocation();
  function confirmDelete() {
    if (!pendingDelete) return;
    deletion.mutate({ id: pendingDelete.id }, {
      onSuccess: async () => {
        await Promise.all([
          queryClientRef.invalidateQueries({ queryKey: getGetScansQueryKey() }),
          queryClientRef.invalidateQueries({ queryKey: getGetStatsQueryKey() }),
          queryClientRef.invalidateQueries({ queryKey: getGetScanQueryKey(pendingDelete.id) }),
        ]);
        if (location === `/scans/${pendingDelete.id}`) setLocation('/history');
        setPendingDelete(null);
      },
    });
  }
  return <Shell>
    <PageHeading eyebrow="Your saved analyses" title="Scan history" description="Search past checks and revisit the signals. History is available only when persistent storage is configured." />
    <div className="filter-bar">
      <div className="search-wrap"><Search size={15} /><input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search message text or result…" aria-label="Search scan history" data-testid="input-history-search" /></div>
      <select className="select filter-select" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} aria-label="Filter by risk level" data-testid="select-risk-filter">
        <option value="">All risk levels</option><option value="Low">Low risk</option><option value="Medium">Medium risk</option><option value="High">High risk</option><option value="Critical">Critical risk</option>
      </select>
      {(search || riskLevel) && <button className="btn btn-quiet" onClick={() => { setSearch(''); setRiskLevel(''); }} data-testid="button-clear-filters">Clear</button>}
    </div>
    {scans.isError && <div className="error-box" role="alert" data-testid="status-history-error">History could not be loaded. {errorText(scans.error)} <button className="text-link" onClick={() => void scans.refetch()} data-testid="button-retry-history">Retry</button></div>}
    {deletion.isError && <div className="error-box" role="alert" data-testid="status-delete-error">This scan could not be deleted. {errorText(deletion.error)}</div>}
    <section className="card table-card" aria-label="Scan history results">
      <div className="table-head"><span>Message &amp; summary</span><span>Risk level</span><span>Score</span><span>Date checked</span><span></span></div>
      {scans.isLoading ? <div style={{ padding: '0 18px' }}><LoadingRows count={5} /></div> : scans.data?.scans?.length ? scans.data.scans.map((scan) => <div className="history-row" key={scan.id} data-testid={`history-row-${scan.id}`}>
        <Link href={`/scans/${encodeURIComponent(scan.id)}`} className="history-message" data-testid={`history-message-${scan.id}`}><strong>{scan.message}</strong><span>{scan.summary}</span></Link>
        <RiskBadge level={scan.riskLevel} /><span className="score">{scan.riskScore} / 100</span><span className="history-date">{shortDate(scan.createdAt)}</span>
        <button className="icon-btn" aria-label={`Delete scan from ${relativeDate(scan.createdAt)}`} title="Delete scan" onClick={() => setPendingDelete(scan)} data-testid={`button-delete-${scan.id}`}><Trash2 size={15} /></button>
      </div>) : <div className="empty-state" data-testid="status-history-empty"><div className="empty-icon"><History size={21} /></div><h3>{search || riskLevel ? 'No matching scans' : 'Your history is clear'}</h3><p>{search || riskLevel ? 'Try a different search or risk filter.' : 'Analyses that can be saved will show up here for easy review.'}</p>{!search && !riskLevel && <Link href="/scan" className="btn btn-quiet" data-testid="button-history-first-scan">Analyze a message <ArrowRight size={14} /></Link>}</div>}
      {!scans.isLoading && scans.data?.scans?.length ? <div className="recent-footer" style={{ padding: '13px 18px' }}><span data-testid="text-history-count">{scans.data.total ?? 0} {scans.data.total === 1 ? 'scan' : 'scans'}{search || riskLevel ? ' match these filters' : ''}</span><span>Search results up to 100 scans</span></div> : null}
    </section>
    {pendingDelete && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletion.isPending) setPendingDelete(null); }}>
      <section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-copy" data-testid="dialog-confirm-delete">
        <div className="empty-icon" style={{ marginLeft: 0, color: '#f09a9a', background: 'rgba(203,74,74,.1)', borderColor: 'rgba(203,74,74,.2)' }}><Trash2 size={19} /></div>
        <h2 id="delete-title">Delete this scan?</h2><p id="delete-copy">This removes the saved analysis from your history. This action cannot be undone.</p>
        <div className="dialog-actions"><button className="btn btn-quiet" onClick={() => setPendingDelete(null)} disabled={deletion.isPending} data-testid="button-cancel-delete">Keep scan</button><button className="btn btn-danger" onClick={confirmDelete} disabled={deletion.isPending} data-testid="button-confirm-delete">{deletion.isPending ? 'Deleting…' : 'Delete scan'}</button></div>
      </section>
    </div>}
  </Shell>;
}

function AboutPage() {
  const health = useHealthCheck();
  return <Shell>
    <PageHeading eyebrow="Use this tool thoughtfully" title="A second opinion, not a verdict." description="ScamShield helps make suspicious-message signals easier to notice. It cannot know everything about the sender, your relationship, or what happened outside the text." />
    <div className="guide-grid">
      <section className="card guide-block"><div className="section-kicker">A practical routine</div><h2 className="section-title" style={{ fontSize: 17, margin: '7px 0 6px' }}>When a message feels off</h2><p className="guide-copy">The safest response is often to slow the conversation down and verify independently.</p>
        {[
          ['Pause before acting', 'Urgency, secrecy, threats, or pressure to move quickly are reasons to stop—not reasons to rush.'],
          ['Do not use the message’s link', 'Open the organization’s app or type a familiar web address yourself. Do not use a phone number or link supplied in the suspicious message.'],
          ['Verify with a known contact', 'Contact the person or organization through a number, website, or channel you already trust. A familiar name or logo can be copied.'],
          ['Protect credentials and money', 'Never share a password, verification code, payment, or remote access because a message asks. Legitimate support teams should not need your one-time sign-in code.'],
          ['Report and block', 'Use your carrier, email provider, or platform’s reporting tools. If you already shared money or information, contact your bank or relevant provider promptly.'],
        ].map(([title, body], index) => <div className="guide-step" key={title}><span className="step-number">0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}
      </section>
      <div>
        <section className="card guide-block"><div className="section-heading"><div><div className="section-kicker">Important limitations</div><h2 className="section-title" style={{ marginTop: 5 }}>What a score can’t tell you</h2></div><Info size={17} color="#9db7ff" /></div>
          <p className="guide-copy">Automated analysis can produce false positives and false negatives. Scam language changes, links may disguise their destination, and a short excerpt may omit important context.</p>
          <p className="guide-copy">A low risk score does not mean a message is safe. A high score does not prove who sent it or what they intended. Use the indicators as prompts to inspect—not as a substitute for your judgment.</p>
           <div className="guide-callout">Never share passwords, one-time passcodes, financial details, or private information with ScamShield or in response to an unexpected message.</div>
           <p className="guide-copy">This starter has no sign-in or per-user scan isolation. Run it for one trusted operator; do not expose it publicly until access controls are added.</p>
        </section>
        <section className="card guide-block" style={{ marginTop: 17 }}><div className="section-heading"><div><div className="section-kicker">Analysis service</div><h2 className="section-title" style={{ marginTop: 5 }}>How this check works</h2></div><Fingerprint size={17} color="#a994e9" /></div>
          <p className="guide-copy">ScamShield analyzes the text and any URL you choose to submit, then returns a risk level, an explanation, and suggested next steps. The source is shown with each result: AI-assisted or rule-based.</p>
          <div className="metadata-grid" style={{ gridTemplateColumns: '1fr 1fr' }}><div className="metadata-item"><div className="metadata-label">AI analysis</div><div className="metadata-value">{health.isLoading ? 'Checking…' : health.data?.aiConfigured ? 'Configured' : health.isError ? 'Status unavailable' : 'Not configured'}</div></div><div className="metadata-item"><div className="metadata-label">Saved history</div><div className="metadata-value">{health.isLoading ? 'Checking…' : health.data?.persistenceAvailable ? 'Available' : health.isError ? 'Status unavailable' : 'Unavailable'}</div></div></div>
          {health.isError && <div className="error-box" role="alert">Service details could not be loaded. <button className="text-link" onClick={() => void health.refetch()} data-testid="button-retry-health">Check again</button></div>}
        </section>
      </div>
    </div>
    <div className="note-callout" style={{ marginTop: 18 }}><ArrowDownRight size={15} /><span>When in doubt, use a trusted contact method outside the conversation to confirm what is real.</span></div>
  </Shell>;
}

function NotFound() {
  return <Shell><div className="card empty-state" style={{ marginTop: 50 }}><div className="empty-icon"><Search size={21} /></div><h3>That page is not here</h3><p>Return to your ScamShield overview or start a new message check.</p><Link href="/" className="btn btn-primary" data-testid="button-not-found-home">Back to overview <ArrowRight size={14} /></Link></div></Shell>;
}

function Router() {
  return <Switch>
    <Route path="/" component={Dashboard} />
    <Route path="/scan" component={AnalyzePage} />
    <Route path="/scans/:id" component={ScanDetailPage} />
    <Route path="/history" component={HistoryPage} />
    <Route path="/about" component={AboutPage} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></QueryClientProvider>;
}

export default App;
