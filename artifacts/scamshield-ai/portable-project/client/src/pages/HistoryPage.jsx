import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { api, explainError, formatDate, keys } from "../services/api.js";
import { EmptyState, ErrorState, LoadingState, PageHeading, RiskBadge } from "../components/Shared.jsx";

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const queryClient = useQueryClient();
  const params = {
    limit: 100,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(riskLevel ? { riskLevel } : {}),
  };
  const scans = useQuery({ queryKey: keys.scans(params), queryFn: () => api.scans(params) });
  const deletion = useMutation({
    mutationFn: api.deleteScan,
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.scans() }),
        queryClient.invalidateQueries({ queryKey: keys.stats }),
        queryClient.invalidateQueries({ queryKey: keys.scan(id) }),
      ]);
      setPendingDelete(null);
    },
  });

  return (
    <>
      <PageHeading
        eyebrow="YOUR SAVED ANALYSES"
        title="Scan history"
        description="Search prior checks and revisit their signals. History is saved only when persistent storage is configured."
      />
      <div className="history-filters">
        <div className="search-field"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search message text…" aria-label="Search scan history" /></div>
        <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} aria-label="Filter by risk level">
          <option value="">All risk levels</option>
          <option value="Low">Low risk</option><option value="Medium">Medium risk</option>
          <option value="High">High risk</option><option value="Critical">Critical risk</option>
        </select>
        {(search || riskLevel) && <button className="button button-secondary clear-button" onClick={() => { setSearch(""); setRiskLevel(""); }}><X size={14} /> Clear</button>}
      </div>
      {scans.isError && <ErrorState error={new Error(explainError(scans.error))} retry={() => scans.refetch()} />}
      {deletion.isError && <div className="form-error" role="alert">The scan could not be deleted. {explainError(deletion.error)}</div>}
      {scans.isLoading ? <LoadingState label="Loading scan history…" /> : null}
      {!scans.isLoading && !scans.isError && scans.data?.scans.length ? (
        <section className="panel history-panel" aria-label="Scan history results">
          <div className="history-header"><span>MESSAGE &amp; SUMMARY</span><span>RISK</span><span>SCORE</span><span>DATE</span><span /></div>
          {scans.data.scans.map((scan) => (
            <div className="history-row" key={scan.id}>
              <Link className="history-message" href={`/scans/${scan.id}`}><strong>{scan.message}</strong><span>{scan.summary}</span></Link>
              <RiskBadge level={scan.riskLevel} />
              <span className="mono-score">{scan.riskScore} / 100</span>
              <span className="history-date">{formatDate(scan.createdAt, false)}</span>
              <button className="icon-button delete-button" aria-label={`Delete scan from ${formatDate(scan.createdAt)}`} onClick={() => setPendingDelete(scan)}><Trash2 size={15} /></button>
            </div>
          ))}
          <div className="history-footer">{scans.data.total} {scans.data.total === 1 ? "scan" : "scans"}{search || riskLevel ? " match these filters" : ""}</div>
        </section>
      ) : null}
      {!scans.isLoading && !scans.isError && !scans.data?.scans.length && (
        <EmptyState
          title={search || riskLevel ? "No matching scans" : "Your history is clear"}
          text={search || riskLevel ? "Try a different search or risk filter." : "Analyses saved to available storage will appear here."}
          action={!search && !riskLevel ? <Link className="button button-secondary" href="/scan">Analyze a message</Link> : null}
        />
      )}
      {pendingDelete && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletion.isPending) setPendingDelete(null); }}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="empty-icon danger-icon"><Trash2 size={19} /></div>
            <h2 id="delete-title">Delete this scan?</h2>
            <p>This removes the saved analysis from history. This action cannot be undone.</p>
            <div className="dialog-actions">
              <button className="button button-secondary" disabled={deletion.isPending} onClick={() => setPendingDelete(null)}>Keep scan</button>
              <button className="button button-danger" disabled={deletion.isPending} onClick={() => deletion.mutate(pendingDelete.id)}>{deletion.isPending ? "Deleting…" : "Delete scan"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
