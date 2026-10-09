import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const volatileScans = new Map();
const memoryLimit = 500;
const riskLevels = ["Low", "Medium", "High", "Critical"];

export class PersistenceError extends Error {
  constructor() {
    super("Scan storage is unavailable. Check the Supabase configuration and schema.");
    this.statusCode = 503;
  }
}

export function isDatabaseConfigured() {
  return supabase !== null;
}

function mapRow(row) {
  return {
    id: row.id,
    message: row.message,
    submittedUrl: row.submitted_url,
    riskScore: Number(row.risk_score),
    riskLevel: row.risk_level,
    summary: row.summary,
    indicators: row.indicators ?? [],
    recommendations: row.recommendations ?? [],
    category: row.category,
    confidence: Number(row.confidence),
    analysisSource: row.analysis_source,
    createdAt: new Date(row.created_at).toISOString(),
    persistenceAvailable: true,
  };
}

function toRow(scan) {
  return {
    id: scan.id,
    message: scan.message,
    submitted_url: scan.submittedUrl,
    risk_score: scan.riskScore,
    risk_level: scan.riskLevel,
    summary: scan.summary,
    indicators: scan.indicators,
    recommendations: scan.recommendations,
    category: scan.category,
    confidence: scan.confidence,
    analysis_source: scan.analysisSource,
    created_at: scan.createdAt,
  };
}

function ensureNoError(error) {
  if (error) throw new PersistenceError();
}

export async function checkPersistence() {
  if (!supabase) return false;
  const { error } = await supabase.from("scans").select("id", { head: true }).limit(1);
  return !error;
}

export async function saveScan(scan) {
  if (!supabase) {
    volatileScans.set(scan.id, { ...scan, persistenceAvailable: false });
    if (volatileScans.size > memoryLimit) {
      const oldestId = volatileScans.keys().next().value;
      if (oldestId) volatileScans.delete(oldestId);
    }
    return volatileScans.get(scan.id);
  }

  const { data, error } = await supabase
    .from("scans")
    .insert(toRow(scan))
    .select("*")
    .single();
  ensureNoError(error);
  if (!data) throw new PersistenceError();
  return mapRow(data);
}

export async function getScans({ riskLevel, search, limit }) {
  if (!supabase) {
    const needle = search?.toLowerCase();
    const rows = [...volatileScans.values()]
      .filter((scan) => !riskLevel || scan.riskLevel === riskLevel)
      .filter(
        (scan) =>
          !needle ||
          scan.message.toLowerCase().includes(needle) ||
          scan.summary.toLowerCase().includes(needle),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      scans: rows.slice(0, limit),
      total: rows.length,
      persistenceAvailable: false,
    };
  }

  let query = supabase
    .from("scans")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (riskLevel) query = query.eq("risk_level", riskLevel);
  if (search) query = query.ilike("message", `%${search}%`);
  const { data, error, count } = await query;
  ensureNoError(error);
  return {
    scans: (data ?? []).map(mapRow),
    total: count ?? 0,
    persistenceAvailable: true,
  };
}

export async function getScan(id) {
  if (!supabase) return volatileScans.get(id) ?? null;
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  ensureNoError(error);
  return data ? mapRow(data) : null;
}

export async function removeScan(id) {
  if (!supabase) return volatileScans.delete(id);
  const { data, error } = await supabase
    .from("scans")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  ensureNoError(error);
  return data !== null;
}

export async function getStats() {
  if (!supabase) {
    const scans = [...volatileScans.values()];
    return {
      totalScans: scans.length,
      lowRiskCount: scans.filter((scan) => scan.riskLevel === "Low").length,
      mediumRiskCount: scans.filter((scan) => scan.riskLevel === "Medium").length,
      highRiskCount: scans.filter((scan) => scan.riskLevel === "High").length,
      criticalRiskCount: scans.filter((scan) => scan.riskLevel === "Critical").length,
      persistenceAvailable: false,
    };
  }

  const results = await Promise.all(
    [null, ...riskLevels].map((level) => {
      let query = supabase.from("scans").select("id", { count: "exact", head: true });
      if (level) query = query.eq("risk_level", level);
      return query;
    }),
  );
  if (results.some((result) => result.error)) ensureNoError(true);
  return {
    totalScans: results[0].count ?? 0,
    lowRiskCount: results[1].count ?? 0,
    mediumRiskCount: results[2].count ?? 0,
    highRiskCount: results[3].count ?? 0,
    criticalRiskCount: results[4].count ?? 0,
    persistenceAvailable: true,
  };
}
