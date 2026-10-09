export const riskLevels = ["Low", "Medium", "High", "Critical"] as const;
export type RiskLevel = (typeof riskLevels)[number];

export const categories = [
  "phishing",
  "impersonation",
  "financial scam",
  "credential theft",
  "suspicious offer",
  "other",
] as const;
export type ScamCategory = (typeof categories)[number];
export type AnalysisSource = "AI" | "rule-based";

export interface Scan {
  id: string;
  message: string;
  submittedUrl: string | null;
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  indicators: string[];
  recommendations: string[];
  category: ScamCategory;
  confidence: number;
  analysisSource: AnalysisSource;
  createdAt: string;
  persistenceAvailable: boolean;
}

export interface Analysis {
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  indicators: string[];
  recommendations: string[];
  category: ScamCategory;
  confidence: number;
  analysisSource: AnalysisSource;
}

export function riskLevelForScore(score: number): RiskLevel {
  if (score >= 85) return "Critical";
  if (score >= 65) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}
