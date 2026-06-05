import type { ExtractedContacts } from "./extractor.js";

export interface ContactReadinessResult {
  contactReadinessScore: number;
  confidenceScore: number;
  verificationStatus: "verified" | "likely" | "unverified" | "missing";
  auditNotes: Record<string, unknown>;
}

/**
 * Computes Contact Readiness Score (0–100) and confidence from extracted contacts.
 *
 * Formula:
 *   +35 business email
 *   +15 website URL
 *   +15 contact page URL
 *   +10 instagram URL
 *   +10 tiktok URL
 *   +10 linkedin URL
 *   +5  youtube URL (recent activity indicator)
 */
export function computeContactReadiness(
  extracted: ExtractedContacts,
  hasRecentActivity = false,
): ContactReadinessResult {
  const breakdown: Record<string, number> = {};
  let score = 0;

  if (extracted.businessEmail) {
    score += 35;
    breakdown.businessEmail = 35;
  }
  if (extracted.websiteUrl) {
    score += 15;
    breakdown.website = 15;
  }
  if (extracted.contactPageUrl) {
    score += 15;
    breakdown.contactPage = 15;
  }
  if (extracted.instagramUrl) {
    score += 10;
    breakdown.instagram = 10;
  }
  if (extracted.tiktokUrl) {
    score += 10;
    breakdown.tiktok = 10;
  }
  if (extracted.linkedinUrl) {
    score += 10;
    breakdown.linkedin = 10;
  }
  if (hasRecentActivity || extracted.youtubeUrl) {
    score += 5;
    breakdown.recentActivity = 5;
  }

  const capped = Math.min(score, 100);

  // Confidence: based on how many sources agree
  const sourceCount = Object.keys(extracted.sourceData).length;
  const confidenceScore = Math.min(
    Math.round((sourceCount / 4) * 100),
    100,
  );

  // Verification status
  let verificationStatus: ContactReadinessResult["verificationStatus"];
  if (capped >= 60) verificationStatus = "likely";
  else if (capped >= 35) verificationStatus = "unverified";
  else verificationStatus = "missing";

  const missingFields: string[] = [];
  if (!extracted.businessEmail) missingFields.push("business email");
  if (!extracted.websiteUrl) missingFields.push("website");
  if (!extracted.instagramUrl && !extracted.tiktokUrl) missingFields.push("social profile");

  const auditNotes: Record<string, unknown> = {
    scoreBreakdown: breakdown,
    totalScore: capped,
    missingFields,
    sourcesUsed: Object.keys(extracted.sourceData),
    computedAt: new Date().toISOString(),
  };

  return {
    contactReadinessScore: capped,
    confidenceScore,
    verificationStatus,
    auditNotes,
  };
}

export function getRecommendedNextAction(readiness: number, hasEmail: boolean): string {
  if (hasEmail && readiness >= 60) return "Ready to outreach — email found and profile verified";
  if (hasEmail && readiness < 60) return "Email found — verify account before outreaching";
  if (!hasEmail && readiness >= 40) return "Website/social found — look for contact or DM";
  if (readiness < 20) return "Manually research this creator's contact channels";
  return "Check social profiles for business email or contact link";
}
