import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "wouter";
import AnalysisResult from "../components/AnalysisResult.jsx";
import { ErrorState, LoadingState, PageHeading } from "../components/Shared.jsx";
import { api, keys } from "../services/api.js";

export default function ScanDetailPage() {
  const { id } = useParams();
  const scan = useQuery({
    queryKey: keys.scan(id),
    queryFn: () => api.scan(id),
    enabled: Boolean(id),
  });

  return (
    <>
      <Link className="text-link back-link" href="/history"><ArrowLeft size={15} /> Back to scan history</Link>
      {scan.isLoading && <LoadingState label="Retrieving analysis…" />}
      {scan.isError && <ErrorState error={scan.error} retry={() => scan.refetch()} />}
      {scan.data && (
        <>
          <PageHeading
            eyebrow="FULL ANALYSIS"
            title="A closer look"
            description="Review the original message, risk signals, and practical next steps."
            action={<Link className="button button-secondary" href="/scan">New analysis <ArrowRight size={15} /></Link>}
          />
          <AnalysisResult scan={scan.data} />
        </>
      )}
    </>
  );
}
