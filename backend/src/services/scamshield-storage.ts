import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RiskLevel, Scan } from "./scamshield-types";

interface ScanRow {
  id: string;
  message: string;
  submitted_url: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  summary: string;
  indicators: string[];
  recommendations: string[];
  category: Scan["category"];
  confidence: number | string;
  analysis_source: Scan["analysisSource"];
  created_at: string;
}

type NewScan = Omit<Scan, "persistenceAvailable">;

let cachedSupabase: SupabaseClient | null = null;
let initialized = false;

function getSupabase(): SupabaseClient | null {
  if (!initialized) {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (supabaseUrl && supabaseServiceKey) {
      cachedSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    initialized = true;
  }
  return cachedSupabase;
}

const volatileScans = new Map<string, Scan>();
const MEMORY_LIMIT = 500;

export class PersistenceError extends Error {
  readonly statusCode = 503;

  constructor() {
    super("Scan storage is unavailable. Check the Supabase configuration and schema.");
    this.name = "PersistenceError";
  }
}

export function isDatabaseConfigured(): boolean {
  return getSupabase() !== null;
}

function mapRow(row: ScanRow): Scan {
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

function toRow(scan: NewScan) {
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

function throwIfError(error: unknown): never {
  if (error) throw new PersistenceError();
  throw new PersistenceError();
}

export async function checkPersistence(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("scans").select("id", { head: true }).limit(1);
  return !error;
}

export async function saveScan(scan: NewScan): Promise<Scan> {
  const supabase = getSupabase();
  if (!supabase) {
    const saved: Scan = { ...scan, persistenceAvailable: false };
    volatileScans.set(scan.id, saved);
    if (volatileScans.size > MEMORY_LIMIT) {
      const oldestId = volatileScans.keys().next().value;
      if (oldestId) volatileScans.delete(oldestId);
    }
    return saved;
  }

  const { data, error } = await supabase
    .from("scans")
    .insert(toRow(scan))
    .select("*")
    .single();
  if (error || !data) throwIfError(error);
  return mapRow(data as ScanRow);
}

export async function getScans(options: {
  riskLevel?: RiskLevel;
  search?: string;
  limit: number;
}): Promise<{ scans: Scan[]; total: number; persistenceAvailable: boolean }> {
  const supabase = getSupabase();
  if (!supabase) {
    const needle = options.search?.toLowerCase();
    const filtered = Array.from(volatileScans.values())
      .filter((scan) => !options.riskLevel || scan.riskLevel === options.riskLevel)
      .filter(
        (scan) =>
          !needle ||
          scan.message.toLowerCase().includes(needle) ||
          scan.summary.toLowerCase().includes(needle),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      scans: filtered.slice(0, options.limit),
      total: filtered.length,
      persistenceAvailable: false,
    };
  }

  let query = supabase
    .from("scans")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(options.limit);
  if (options.riskLevel) query = query.eq("risk_level", options.riskLevel);
  if (options.search) query = query.ilike("message", `%${options.search}%`);

  const { data, error, count } = await query;
  if (error) throwIfError(error);
  return {
    scans: (data ?? []).map((row) => mapRow(row as ScanRow)),
    total: count ?? 0,
    persistenceAvailable: true,
  };
}

export async function getScan(id: string): Promise<Scan | null> {
  const supabase = getSupabase();
  if (!supabase) return volatileScans.get(id) ?? null;

  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throwIfError(error);
  return data ? mapRow(data as ScanRow) : null;
}

export async function removeScan(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return volatileScans.delete(id);

  const { data, error } = await supabase
    .from("scans")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throwIfError(error);
  return data !== null;
}

export async function getScanStats() {
  const supabase = getSupabase();
  if (!supabase) {
    const scans = Array.from(volatileScans.values());
    return {
      totalScans: scans.length,
      lowRiskCount: scans.filter((scan) => scan.riskLevel === "Low").length,
      mediumRiskCount: scans.filter((scan) => scan.riskLevel === "Medium").length,
      highRiskCount: scans.filter((scan) => scan.riskLevel === "High").length,
      criticalRiskCount: scans.filter((scan) => scan.riskLevel === "Critical").length,
      persistenceAvailable: false,
    };
  }

  const levels: Array<RiskLevel | null> = [null, "Low", "Medium", "High", "Critical"];
  const results = await Promise.all(
    levels.map((level) => {
      let query = supabase.from("scans").select("id", { count: "exact", head: true });
      if (level) query = query.eq("risk_level", level);
      return query;
    }),
  );
  if (results.some((result) => result.error)) throwIfError(true);
  return {
    totalScans: results[0].count ?? 0,
    lowRiskCount: results[1].count ?? 0,
    mediumRiskCount: results[2].count ?? 0,
    highRiskCount: results[3].count ?? 0,
    criticalRiskCount: results[4].count ?? 0,
    persistenceAvailable: true,
  };
}
