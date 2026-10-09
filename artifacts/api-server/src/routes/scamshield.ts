import { randomUUID } from "node:crypto";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  AnalyzeMessageBody,
  AnalyzeMessageResponse,
  DeleteScanParams,
  DeleteScanResponse,
  GetScanParams,
  GetScanResponse,
  GetScansQueryParams,
  GetScansResponse,
  GetStatsResponse,
} from "@workspace/api-zod";
import { analyzeMessage, isAiConfigured } from "../services/scamshield-analysis";
import {
  getScan,
  getScans,
  getScanStats,
  PersistenceError,
  removeScan,
  saveScan,
  isDatabaseConfigured,
} from "../services/scamshield-storage";
import { riskLevelForScore } from "../services/scamshield-types";

const router: IRouter = Router();

router.post("/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const message = parsed.data.message.trim();
  if (!message) {
    res.status(400).json({ error: "Enter a message before analyzing it." });
    return;
  }

  const submittedUrl = parsed.data.submittedUrl?.trim() || null;
  const analysis = await analyzeMessage(message, submittedUrl);
  if (isAiConfigured() && analysis.analysisSource === "rule-based") {
    req.log.warn("AI provider failed validation or was unavailable; used rule-based analysis");
  }

  const scan = await saveScan({
    id: randomUUID(),
    message,
    submittedUrl,
    ...analysis,
    riskLevel: riskLevelForScore(analysis.riskScore),
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(AnalyzeMessageResponse.parse(scan));
});

router.get("/scans", async (req, res): Promise<void> => {
  const parsed = GetScansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await getScans({
    riskLevel: parsed.data.riskLevel,
    search: parsed.data.search?.trim() || undefined,
    limit: parsed.data.limit,
  });
  res.json(GetScansResponse.parse(result));
});

router.get("/scans/:id", async (req, res): Promise<void> => {
  const parsed = GetScanParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const scan = await getScan(parsed.data.id);
  if (!scan) {
    res.status(404).json({ error: "Scan not found." });
    return;
  }
  res.json(GetScanResponse.parse(scan));
});

router.delete("/scans/:id", async (req, res): Promise<void> => {
  const parsed = DeleteScanParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const deleted = await removeScan(parsed.data.id);
  if (!deleted) {
    res.status(404).json({ error: "Scan not found." });
    return;
  }
  res.json(
    DeleteScanResponse.parse({
      deleted: true,
      persistenceAvailable: isDatabaseConfigured(),
    }),
  );
});

router.get("/stats", async (_req, res): Promise<void> => {
  res.json(GetStatsResponse.parse(await getScanStats()));
});

router.use(
  (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
  if (err instanceof PersistenceError) {
    req.log.error({ err }, "Supabase operation failed");
    res.status(503).json({ error: err.message });
    return;
  }
  next(err);
  },
);

export default router;
