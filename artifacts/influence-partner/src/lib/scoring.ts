import { Creator, FitLabel } from '../types/influencePartner';

// Score 0–100:
// audienceMatch: 30%, engagement: 20%, platformFit: 15%, productFit: 20%, competitiveConflict: 15%
// competitiveConflict is inverted — low conflict = high score

export function computeFitScore(c: Pick<Creator, 'audienceMatch' | 'engagementRate' | 'platformFit' | 'productFit' | 'competitiveConflict'>): number {
  const engScore = Math.min(c.engagementRate * 10, 100); // 10% engagement = 100
  const conflictScore = 100 - c.competitiveConflict;
  return Math.round(
    c.audienceMatch * 0.30 +
    engScore * 0.20 +
    c.platformFit * 0.15 +
    c.productFit * 0.20 +
    conflictScore * 0.15
  );
}

export function getFitLabel(score: number): FitLabel {
  if (score >= 90) return 'Excellent Partner';
  if (score >= 80) return 'Strong Fit';
  if (score >= 70) return 'Possible Fit';
  return 'Low Priority';
}

export function getSuggestedCommission(label: FitLabel): string {
  if (label === 'Excellent Partner') return '40%';
  if (label === 'Strong Fit') return '35–40%';
  if (label === 'Possible Fit') return '30–35%';
  return 'Test Only';
}

export type SponsorConflictLevel = 'None' | 'Low' | 'Moderate' | 'High';
export type ProductGapLevel = 'Strong' | 'Moderate' | 'Weak' | 'None';
export type OpportunityLevel = 'Strong Opportunity' | 'Moderate Opportunity' | 'Low Opportunity';

export function getSponsorConflictLevel(competitiveConflict: number): SponsorConflictLevel {
  if (competitiveConflict < 10) return 'None';
  if (competitiveConflict < 25) return 'Low';
  if (competitiveConflict < 50) return 'Moderate';
  return 'High';
}

export function getProductGapLevel(productFit: number): ProductGapLevel {
  if (productFit >= 85) return 'Strong';
  if (productFit >= 70) return 'Moderate';
  if (productFit >= 50) return 'Weak';
  return 'None';
}

export function getOpportunityLevel(fitScore: number, competitiveConflict: number): OpportunityLevel {
  if (fitScore >= 80 && competitiveConflict < 25) return 'Strong Opportunity';
  if (fitScore >= 70 || competitiveConflict < 30) return 'Moderate Opportunity';
  return 'Low Opportunity';
}

// Revenue projection helpers
export function estimateMonthlyConversions(followerCount: number, engagementRate: number): number {
  // 3% of engaged followers convert per month
  return Math.round(followerCount * (engagementRate / 100) * 0.03);
}

export function estimateMonthlyRevenue(conversions: number, avgPriceUsd: number): number {
  return conversions * avgPriceUsd;
}

export function estimateMonthlyProfit(revenue: number, commissionPct: number): number {
  return Math.round(revenue * (1 - commissionPct / 100));
}
