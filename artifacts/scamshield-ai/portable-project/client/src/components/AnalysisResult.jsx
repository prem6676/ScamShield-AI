import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  Mail,
  TriangleAlert,
} from "lucide-react";
import { formatDate } from "../services/api.js";
import { RiskBadge } from "./Shared.jsx";

export default function AnalysisResult({ scan }) {
  const color =
    scan.riskLevel === "Low"
      ? "var(--green)"
      : scan.riskLevel === "Medium"
        ? "var(--amber)"
        : "var(--red)";
  return (
    <>
      <section className="result-hero panel">
        <div className="result-top">
          <div>
            <p className="eyebrow">ANALYSIS RESULT · {formatDate(scan.createdAt)}</p>
            <h1>Risk signals found</h1>
            <p className="page-description">An informed signal, not a verdict. Verify independently.</p>
            <div className="result-tags">
              <RiskBadge level={scan.riskLevel} />
              <span className="soft-tag">{scan.analysisSource === "AI" ? "AI-assisted" : "Rule-based"}</span>
              <span className="soft-tag">{scan.category}</span>
            </div>
          </div>
          <div className="score-ring" style={{ "--score": scan.riskScore, "--score-color": color }}>
            <span className="score-number">{scan.riskScore}</span>
            <small>RISK SCORE</small>
          </div>
        </div>
        <p className="eyebrow">ASSESSMENT</p>
        <p className="result-summary">{scan.summary}</p>
      </section>
      <section className="panel original-message">
        <div className="panel-heading"><div><p className="eyebrow">ORIGINAL CONTENT</p><h2>Message reviewed</h2></div><Mail size={18} /></div>
        <div className="quoted-message">{scan.message}</div>
        {scan.submittedUrl && (
          <div className="submitted-link">
            <span className="eyebrow">SUBMITTED LINK</span>
            <p><ExternalLink size={14} />{scan.submittedUrl}</p>
          </div>
        )}
        <div className="confidence-note">
          <Info size={15} />
          <span>Confidence is a rough system self-assessment, not a validated probability.</span>
        </div>
      </section>
      <div className="detail-grid">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">WHY IT WAS FLAGGED</p><h2>Signals to consider</h2></div><TriangleAlert size={18} /></div>
          {scan.indicators.length ? (
            <ul className="detail-list">
              {scan.indicators.map((item, index) => <li key={`${index}-${item}`}><ArrowUpRight size={15} />{item}</li>)}
            </ul>
          ) : <p className="muted-copy">No specific indicators were identified. That does not mean the message is safe.</p>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">WHAT YOU CAN DO</p><h2>Safer next steps</h2></div><CheckCircle2 size={18} /></div>
          <ul className="detail-list recommendations">
            {scan.recommendations.map((item, index) => <li key={`${index}-${item}`}><Check size={15} />{item}</li>)}
          </ul>
        </section>
      </div>
      <div className="notice notice-info">
        <Info size={16} />
        <span>A low score is not proof of safety. Automated analysis can miss context, new tactics, or disguised links.</span>
      </div>
    </>
  );
}
