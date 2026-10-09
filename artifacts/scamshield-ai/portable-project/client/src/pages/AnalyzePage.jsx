import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Info, Link2, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { api, explainError, keys } from "../services/api.js";
import { PageHeading } from "../components/Shared.jsx";

const examples = [
  "Your account will be suspended today. Verify your details and OTP now: https://bit.ly/secure-check",
  "Congratulations! You won a reward. Pay a small processing fee today to claim your prize.",
  "Hi, the project notes are ready for you to review. Let me know if you have any questions.",
];

export default function AnalyzePage() {
  const [message, setMessage] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [validation, setValidation] = useState("");
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const analyze = useMutation({
    mutationFn: api.analyze,
    onSuccess: async (scan) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.scans() }),
        queryClient.invalidateQueries({ queryKey: keys.stats }),
      ]);
      setLocation(`/scans/${scan.id}`);
    },
  });

  function submit(event) {
    event.preventDefault();
    setValidation("");
    if (!message.trim()) return setValidation("Paste a message to analyze.");
    if (message.length > 10_000) return setValidation("Messages must be 10,000 characters or fewer.");
    const url = submittedUrl.trim();
    if (url && !/^https?:\/\/\S+$/i.test(url)) {
      return setValidation("Enter a complete link beginning with http:// or https://.");
    }
    analyze.mutate({
      message: message.trim(),
      ...(url ? { submittedUrl: url } : {}),
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="MESSAGE ANALYSIS"
        title="Pause. Check. Then decide."
        description="Paste the suspicious message as it appeared. ScamShield looks for common warning signs; it cannot prove a message is safe."
      />
      <section className="panel scanner-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">SMS · EMAIL · CHAT</p><h2>What did they send you?</h2></div>
          <Sparkles size={18} />
        </div>
        <form onSubmit={submit} noValidate>
          <label htmlFor="message">Message text</label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={10_001}
            placeholder="Paste the message here. Include its wording and any urgent requests…"
          />
          <p className="field-hint">Remove personal details before pasting. Never include passwords, account numbers, or private information.</p>
          <label htmlFor="url" className="url-label">Link included in the message <span>(optional)</span></label>
          <div className="input-with-icon"><Link2 size={16} /><input id="url" type="url" value={submittedUrl} onChange={(event) => setSubmittedUrl(event.target.value)} maxLength={2048} placeholder="https://example.com/…" /></div>
          <p className="field-hint">We analyze the URL string only. Do not open a suspicious link to copy it.</p>
          <div className="examples">
            <span>TRY AN EXAMPLE</span>
            {examples.map((example, index) => (
              <button type="button" key={index} onClick={() => setMessage(example)}>Example {index + 1}</button>
            ))}
          </div>
          {(validation || analyze.isError) && <div className="form-error" role="alert">{validation || explainError(analyze.error)}</div>}
          <div className="form-actions">
            <span>{message.length.toLocaleString()} / 10,000 characters</span>
            <button className="button button-primary" type="submit" disabled={!message.trim() || analyze.isPending}>
              {analyze.isPending ? <><LoaderCircle className="spin" size={16} /> Analyzing…</> : <><Sparkles size={16} /> Analyze message <ArrowRight size={15} /></>}
            </button>
          </div>
        </form>
      </section>
      <div className="notice notice-info">
        <LockKeyhole size={16} />
        <span>Analysis may be wrong or miss context. Never share credentials or pay based only on a score; verify through a known contact method.</span>
      </div>
      <div className="confidence-note"><Info size={15} /> Submitted URLs are never opened or fetched by ScamShield.</div>
    </>
  );
}
