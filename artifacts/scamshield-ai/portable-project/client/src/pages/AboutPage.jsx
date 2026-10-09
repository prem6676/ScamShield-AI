import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, Info, ShieldCheck } from "lucide-react";
import { api, keys } from "../services/api.js";
import { PageHeading } from "../components/Shared.jsx";

const steps = [
  ["Pause before acting", "Urgency, secrecy, threats, or pressure to move quickly are reasons to stop—not reasons to rush."],
  ["Do not use the message’s link", "Open the organization’s app or type a familiar web address yourself. Do not use a link or phone number supplied in the suspicious message."],
  ["Verify with a known contact", "Contact the person or organization through a number, website, or channel you already trust. Names and logos can be copied."],
  ["Protect credentials and money", "Never share a password, verification code, payment, or remote access because a message asks."],
  ["Report and block", "Use your carrier, email provider, or platform’s reporting tools. If you already shared money or information, contact your bank promptly."],
];

export default function AboutPage() {
  const health = useQuery({ queryKey: keys.health, queryFn: api.health });
  return (
    <>
      <PageHeading
        eyebrow="USE THIS TOOL THOUGHTFULLY"
        title="A second opinion, not a verdict."
        description="ScamShield makes common warning signs easier to notice. It cannot know everything about the sender, your relationship, or what happened outside the text."
      />
      <div className="guide-grid">
        <section className="panel">
          <p className="eyebrow">A PRACTICAL ROUTINE</p><h2>When a message feels off</h2>
          <p className="muted-copy">The safest response is often to slow down and verify independently.</p>
          <div className="guide-steps">
            {steps.map(([title, body], index) => (
              <div className="guide-step" key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{body}</p></div></div>
            ))}
          </div>
        </section>
        <div className="guide-side">
          <section className="panel">
            <div className="panel-heading"><div><p className="eyebrow">IMPORTANT LIMITATIONS</p><h2>What a score can’t tell you</h2></div><Info size={18} /></div>
            <p className="muted-copy">Automated analysis can produce false positives and false negatives. Scam language changes, links may disguise their destination, and a short excerpt may omit important context.</p>
            <p className="muted-copy">A low risk score does not mean a message is safe. A high score does not prove who sent it or what they intended. Use signals as prompts to inspect, not as a substitute for your judgment.</p>
            <div className="guide-callout">Never share passwords, one-time passcodes, financial details, or private information with ScamShield.</div>
            <p className="single-operator-note">This local starter has no sign-in or per-user scan separation. Use it for one trusted operator and do not expose it publicly without adding authentication.</p>
          </section>
          <section className="panel service-panel">
            <div className="panel-heading"><div><p className="eyebrow">ANALYSIS SERVICE</p><h2>How it works</h2></div><ShieldCheck size={18} /></div>
            <p className="muted-copy">ScamShield checks message text and the URL string you submit. URLs are never opened or visited. The result identifies its source: AI-assisted or rule-based.</p>
            <div className="status-grid">
              <div><span>AI analysis</span><strong>{health.isLoading ? "Checking…" : health.data?.aiConfigured ? "Configured" : health.isError ? "Status unavailable" : "Not configured"}</strong></div>
              <div><span>Saved history</span><strong>{health.isLoading ? "Checking…" : health.data?.persistenceAvailable ? "Available" : health.isError ? "Status unavailable" : "Temporary only"}</strong></div>
            </div>
          </section>
        </div>
      </div>
      <div className="notice notice-info"><ArrowDownRight size={16} /><span>When in doubt, confirm through a trusted contact method outside the conversation.</span></div>
    </>
  );
}
