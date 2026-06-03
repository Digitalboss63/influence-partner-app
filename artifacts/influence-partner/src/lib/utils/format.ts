import { OpportunityLevel, SponsorConflictLevel } from "@/lib/scoring";

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function getFitScoreColorClasses(score: number): string {
  if (score >= 90) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 70) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export function getFitScoreDotColor(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 80) return "bg-blue-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-gray-400";
}

export function getPlatformColor(platform: string): string {
  switch (platform) {
    case "YouTube": return "bg-red-100 text-red-700 border-red-200";
    case "Instagram": return "bg-pink-100 text-pink-700 border-pink-200";
    case "TikTok": return "bg-gray-900 text-white border-gray-700";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getStageColor(stage: string): string {
  switch (stage) {
    case "Active": return "bg-emerald-100 text-emerald-800";
    case "Interested": return "bg-blue-100 text-blue-800";
    case "Negotiating": return "bg-purple-100 text-purple-800";
    case "Contacted": return "bg-orange-100 text-orange-800";
    case "Rejected": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

export function getOpportunityColor(level: OpportunityLevel): string {
  switch (level) {
    case "Strong Opportunity": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Moderate Opportunity": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Low Opportunity": return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function getSponsorConflictColor(level: SponsorConflictLevel): string {
  switch (level) {
    case "None": return "text-emerald-700";
    case "Low": return "text-blue-700";
    case "Moderate": return "text-amber-700";
    case "High": return "text-red-700";
  }
}
