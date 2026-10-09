import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { analyzeMessage, isAiConfigured } from "./analysis.js";
import {
  checkPersistence,
  getScan,
  getScans,
  getStats,
  isDatabaseConfigured,
  PersistenceError,
  removeScan,
  saveScan,
} from "./storage.js";

const app = express();
const riskLevels = ["Low", "Medium", "High", "Critical"];
const allowedCategories = [
  "phishing",
  "impersonation",
  "financial scam",
  "credential theft",
  "suspicious offer",
  "other",
];

const inputSchema = z
  .object({
    message: z.string().min(1).max(10_000),
    submittedUrl: z.string().max(2_048).nullable().optional(),
  })
  .strict();
const scanIdSchema = z.string().uuid();
const listSchema = z.object({
  riskLevel: z.enum(riskLevels).optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const clientOrigins = process.env.CLIENT_ORIGIN
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: clientOrigins?.length ? clientOrigins : true }));
app.use(express.json({ limit: "32kb" }));

function validateScan(scan) {
  const valid =
    typeof scan.id === "string" &&
    typeof scan.message === "string" &&
    Number.isInteger(scan.riskScore) &&
    scan.riskScore >= 0 &&
    scan.riskScore <= 100 &&
    riskLevels.includes(scan.riskLevel) &&
    typeof scan.summary === "string" &&
    Array.isArray(scan.indicators) &&
    Array.isArray(scan.recommendations) &&
    allowedCategories.includes(scan.category) &&
    Number.isFinite(scan.confidence) &&
    scan.confidence >= 0 &&
    scan.confidence <= 1 &&
    ["AI", "rule-based"].includes(scan.analysisSource) &&
    typeof scan.createdAt === "string" &&
    typeof scan.persistenceAvailable === "boolean";
  if (!valid) throw new Error("Internal analysis did not match the scan schema.");
  return scan;
}

function sendInvalid(res, error) {
  res.status(400).json({ error: error.issues.map((issue) => issue.message).join("; ") });
}

async function health(_req, res) {
  const persistenceAvailable = await checkPersistence();
  res.json({
    status: "ok",
    databaseConfigured: isDatabaseConfigured(),
    persistenceAvailable,
    aiConfigured: isAiConfigured(),
  });
}

app.get("/api/health", health);
app.get("/api/healthz", health);

app.post("/api/analyze", async (req, res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, parsed.error);

  const message = parsed.data.message.trim();
  if (!message) {
    res.status(400).json({ error: "Enter a message before analyzing it." });
    return;
  }
  const submittedUrl = parsed.data.submittedUrl?.trim() || null;
  const analysis = await analyzeMessage(message, submittedUrl);
  const scan = validateScan(
    await saveScan({
      id: randomUUID(),
      message,
      submittedUrl,
      ...analysis,
      createdAt: new Date().toISOString(),
    }),
  );
  res.status(201).json(scan);
});

app.get("/api/scans", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return sendInvalid(res, parsed.error);
  res.json(
    await getScans({
      ...parsed.data,
      search: parsed.data.search?.trim() || undefined,
    }),
  );
});

app.get("/api/scans/:id", async (req, res) => {
  const parsedId = scanIdSchema.safeParse(req.params.id);
  if (!parsedId.success) return sendInvalid(res, parsedId.error);
  const scan = await getScan(parsedId.data);
  if (!scan) {
    res.status(404).json({ error: "Scan not found." });
    return;
  }
  res.json(validateScan(scan));
});

app.delete("/api/scans/:id", async (req, res) => {
  const parsedId = scanIdSchema.safeParse(req.params.id);
  if (!parsedId.success) return sendInvalid(res, parsedId.error);
  const deleted = await removeScan(parsedId.data);
  if (!deleted) {
    res.status(404).json({ error: "Scan not found." });
    return;
  }
  res.json({
    deleted: true,
    persistenceAvailable: isDatabaseConfigured(),
  });
});

app.get("/api/stats", async (_req, res) => {
  res.json(await getStats());
});

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

app.use((err, _req, res, _next) => {
  if (err instanceof PersistenceError) {
    res.status(503).json({ error: err.message });
    return;
  }
  const status = Number(err?.statusCode ?? err?.status ?? 500);
  if (status >= 400 && status < 500) {
    res.status(status).json({
      error: status === 413 ? "Request body is too large." : "Invalid request.",
    });
    return;
  }
  console.error("ScamShield API request failed:", err);
  res.status(500).json({ error: "The server could not complete this request." });
});

export default app;
