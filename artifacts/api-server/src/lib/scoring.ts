/**
 * Server-side scoring engine.
 * Mirrors the frontend scoring.ts logic so server and client produce identical results.
 * Phase 2B: Replace this with LLM-backed scoring per product.
 */

export type FitLabel = "Excellent Partner" | "Strong Fit" | "Possible Fit" | "Low Priority";

export function computeFitScore(c: {
  audienceMatch: number;
  engagementRate: number;
  platformFit: number;
  productFit: number;
  competitiveConflict: number;
}): number {
  const engScore = Math.min(c.engagementRate * 10, 100);
  const conflictScore = 100 - c.competitiveConflict;
  return Math.round(
    c.audienceMatch * 0.3 +
    engScore * 0.2 +
    c.platformFit * 0.15 +
    c.productFit * 0.2 +
    conflictScore * 0.15
  );
}

export function getFitLabel(score: number): FitLabel {
  if (score >= 90) return "Excellent Partner";
  if (score >= 80) return "Strong Fit";
  if (score >= 70) return "Possible Fit";
  return "Low Priority";
}

export function getSuggestedCommission(label: FitLabel): string {
  if (label === "Excellent Partner") return "40%";
  if (label === "Strong Fit") return "35–40%";
  if (label === "Possible Fit") return "30–35%";
  return "Test Only";
}
