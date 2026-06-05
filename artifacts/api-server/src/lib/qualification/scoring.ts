/**
 * Partner Qualification Engine — Rule-Based Scoring
 *
 * 5-pillar Partner Fit Score (0–100):
 *   Audience Match        25%
 *   Brand Safety          20%
 *   Partnership Readiness 20%
 *   Response Probability  20%
 *   Content Relevance     15%
 *
 * Deterministic — no LLM required.
 * QUAL_BRIEF_LLM_ENABLED=false by default.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QualificationInput {
  prospect: {
    name: string;
    company: string | null;
    platform: string | null;
    partnerCategory: string | null;
    audienceSize: string | null;
    notes: string | null;
    email: string | null;
    source: string;
    website: string | null;
    socialUrl: string | null;
  };
  product: {
    name: string;
    category: string;
    targetCustomer: string;
    mainBenefit: string;
    description: string;
  };
}

export type QualificationLabel =
  | "Ready to Pitch"
  | "Promising"
  | "Needs Review"
  | "Not Qualified";

export interface ScoreReasons {
  audienceMatch: string[];
  brandSafety: string[];
  partnershipReadiness: string[];
  responseProbability: string[];
  contentRelevance: string[];
}

export interface QualificationResult {
  partnerFitScore: number;
  audienceMatchScore: number;
  brandSafetyScore: number;
  partnershipReadinessScore: number;
  responseProbabilityScore: number;
  contentRelevanceScore: number;
  qualificationLabel: QualificationLabel;
  hardFlags: string[];
  scoreReasons: ScoreReasons;
  nextBestAction: string;
  contactEmail: string | null;
}

// ─── Keyword lists ────────────────────────────────────────────────────────────

const NSFW_KEYWORDS = [
  "nsfw", "adult content", "explicit", "xxx", "porn", "pornography",
  "erotic", "onlyfans", "only fans", "nude", "sexual",
];
const GAMBLING_KEYWORDS = [
  "gambling", "casino", "betting", "sports betting", "slots",
  "poker", "blackjack", "lottery", "sportsbetting",
];
const MLM_KEYWORDS = [
  "mlm", "multi-level marketing", "network marketing", "pyramid scheme",
  "downline", "upline", "recruit and earn", "crypto pump", "pump and dump",
  "get rich quick",
];
const HATE_KEYWORDS = [
  "extremist", "white nationalist", "neo-nazi", "supremacist",
  "hate speech", "racist propaganda",
];
const CONTROVERSIAL_KEYWORDS = [
  "conspiracy theory", "flat earth", "anti-vax", "qanon",
  "deep state propaganda",
];

const SPONSORSHIP_SIGNALS = [
  "sponsor", "partnership", "affiliate", "collab", "discount code",
  "promo code", "brand deal", "paid promotion", "business inquiry",
  "business email", "work with me", "ad", "sponsored by",
];

const CONTENT_CREATOR_CATEGORIES = [
  "youtub", "course creator", "newsletter", "podcast", "blogger", "writer",
  "social media", "influencer", "community", "software reviewer",
  "consultant", "coach", "agency",
];

// ─── Category → product-relevant keyword mapping ──────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Finance: ["finance", "invest", "money", "budget", "wealth", "credit", "loan", "mortgage", "debt", "saving"],
  Health: ["health", "wellness", "fitness", "nutrition", "medical", "herbal", "supplement", "biohack", "mindful", "sleep"],
  Productivity: ["productivity", "workflow", "task", "automation", "notion", "obsidian", "gtd", "efficiency", "remote work", "time management"],
  Tech: ["tech", "ai", "software", "developer", "coding", "saas", "tool", "automation", "startup"],
  Fitness: ["fitness", "workout", "gym", "nutrition", "diet", "exercise", "athletic", "trainer"],
  Beauty: ["beauty", "skincare", "cosmetic", "makeup", "haircare", "lifestyle"],
  Gaming: ["gaming", "gamer", "esports", "twitch", "stream", "pc gaming"],
  Lifestyle: ["lifestyle", "vlog", "travel", "personal development", "minimalism"],
  Other: ["business", "entrepreneur", "education", "how-to", "tips"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function toLowerCase(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.filter((kw) => text.includes(kw)).length;
}

/** Parse subscriber count from a string like "50k subscribers" or "1.2M subscribers". */
function parseSubscriberCount(audienceSize: string | null): number {
  if (!audienceSize) return 0;
  const lower = audienceSize.toLowerCase();
  const m = lower.match(/(\d+(?:\.\d+)?)\s*(k|m|b)?/);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  const mult = m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : m[2] === "b" ? 1_000_000_000 : 1;
  return Math.round(num * mult);
}

/** Get product category keyword list (fall back to "Other"). */
function productKeywords(category: string): string[] {
  return CATEGORY_KEYWORDS[category] ?? CATEGORY_KEYWORDS.Other!;
}

// ─── Pillar scorers ───────────────────────────────────────────────────────────

function scoreAudienceMatch(input: QualificationInput): { score: number; reasons: string[] } {
  const { prospect, product } = input;
  const reasons: string[] = [];
  let score = 40;

  // Subscriber tier
  const subs = parseSubscriberCount(prospect.audienceSize);
  if (subs >= 50_000 && subs < 200_000) {
    score += 25;
    reasons.push(`Subscriber count (${(subs / 1000).toFixed(0)}k) is in the ideal 50k–200k sweet spot`);
  } else if (subs >= 10_000 && subs < 50_000) {
    score += 20;
    reasons.push(`Niche micro-creator size (${(subs / 1000).toFixed(0)}k) aligns with commission-based partnerships`);
  } else if (subs >= 200_000 && subs < 1_000_000) {
    score += 15;
    reasons.push(`Mid-tier reach (${(subs / 1000).toFixed(0)}k) — may need flat-fee + commission hybrid`);
  } else if (subs >= 1_000_000) {
    score += 5;
    reasons.push(`Large channel (${(subs / 1_000_000).toFixed(1)}M) — audience breadth may reduce specificity`);
  } else if (subs >= 1_000) {
    score += 10;
    reasons.push(`Small but growing audience (${(subs / 1000).toFixed(0)}k) — early-partner potential`);
  } else if (subs === 0) {
    reasons.push("Subscriber count unknown — scored conservatively");
  } else {
    score += 3;
    reasons.push("Very small audience — verify channel activity before qualifying");
  }

  // Platform match
  if (prospect.platform === "YouTube") {
    score += 10;
    reasons.push("YouTube platform — highest conversion rate for SaaS and D2C products");
  }

  // Category/keywords in product context
  const catKws = productKeywords(product.category);
  const fullText = toLowerCase(
    `${prospect.name} ${prospect.company} ${prospect.partnerCategory} ${prospect.notes}`,
  );
  const matches = countMatches(fullText, catKws);
  if (matches >= 3) {
    score += 20;
    reasons.push(`Strong product-category keyword alignment (${matches} terms found)`);
  } else if (matches >= 1) {
    score += 10;
    reasons.push(`Partial product-category keyword match (${matches} term${matches !== 1 ? "s" : ""} found)`);
  } else {
    reasons.push("No direct product-category keywords detected — audience fit is inferred from platform/category");
  }

  // partnerCategory signals
  const pc = toLowerCase(prospect.partnerCategory);
  if (pc && CONTENT_CREATOR_CATEGORIES.some((c) => pc.includes(c))) {
    score += 5;
    reasons.push("Partner category indicates active content creator");
  }

  return { score: clamp(score), reasons };
}

function scoreBrandSafety(input: QualificationInput): { score: number; reasons: string[]; flags: string[] } {
  const { prospect } = input;
  const flags: string[] = [];
  const reasons: string[] = [];
  let score = 85;

  const fullText = toLowerCase(
    `${prospect.name} ${prospect.company} ${prospect.notes} ${prospect.website}`,
  );

  if (containsAny(fullText, NSFW_KEYWORDS)) {
    score -= 60;
    flags.push("nsfw-content");
    reasons.push("⚠️ NSFW indicators detected — high brand risk");
  }
  if (containsAny(fullText, GAMBLING_KEYWORDS)) {
    score -= 50;
    flags.push("gambling-content");
    reasons.push("⚠️ Gambling-related content detected — potential brand misalignment");
  }
  if (containsAny(fullText, MLM_KEYWORDS)) {
    score -= 40;
    flags.push("mlm-indicators");
    reasons.push("⚠️ MLM or pyramid scheme indicators found — credibility risk");
  }
  if (containsAny(fullText, HATE_KEYWORDS)) {
    score -= 75;
    flags.push("hate-extremist");
    reasons.push("⚠️ Hate or extremist content indicators detected — disqualify");
  }
  if (containsAny(fullText, CONTROVERSIAL_KEYWORDS)) {
    score -= 20;
    flags.push("controversial-content");
    reasons.push("⚠️ Potentially controversial content found — review before partnering");
  }

  if (flags.length === 0) {
    reasons.push("No brand safety red flags detected");
    if (score >= 80) {
      reasons.push("Content signals appear safe for brand partnership");
    }
  }

  return { score: clamp(score), reasons, flags };
}

function scorePartnershipReadiness(input: QualificationInput): { score: number; reasons: string[] } {
  const { prospect } = input;
  const reasons: string[] = [];
  let score = 40;

  const fullText = toLowerCase(`${prospect.notes} ${prospect.partnerCategory}`);

  // Business email
  if (prospect.email) {
    score += 20;
    reasons.push("Business or contact email detected — direct outreach is possible");
  } else {
    reasons.push("No email detected — will need to reach via platform DM or contact page");
  }

  // Sponsorship language in notes/description
  const sponsorMatches = countMatches(fullText, SPONSORSHIP_SIGNALS);
  if (sponsorMatches >= 3) {
    score += 20;
    reasons.push(`Strong sponsorship signals found (${sponsorMatches} terms) — likely open to brand deals`);
  } else if (sponsorMatches >= 1) {
    score += 12;
    reasons.push(`Sponsorship signals detected (${sponsorMatches} term${sponsorMatches !== 1 ? "s" : ""}) — may be open to collaboration`);
  } else {
    reasons.push("No explicit sponsorship signals found — readiness is inferred from creator type");
  }

  // YouTube source = structured channel, more likely to accept brand deals
  if (prospect.source === "YouTube") {
    score += 10;
    reasons.push("Discovered via YouTube search — YouTube creators commonly accept brand partnerships");
  }

  // Partner category
  const pc = toLowerCase(prospect.partnerCategory);
  if (pc && CONTENT_CREATOR_CATEGORIES.some((c) => pc.includes(c))) {
    score += 8;
    reasons.push("Creator category suggests active content production and brand collaboration history");
  }

  return { score: clamp(score), reasons };
}

function scoreResponseProbability(input: QualificationInput): { score: number; reasons: string[] } {
  const { prospect } = input;
  const reasons: string[] = [];
  let score = 30;

  const subs = parseSubscriberCount(prospect.audienceSize);

  if (subs >= 10_000 && subs < 50_000) {
    score += 30;
    reasons.push("Micro-creator size (10k–50k) — highest response rates; checking DMs regularly");
  } else if (subs >= 50_000 && subs < 200_000) {
    score += 25;
    reasons.push("Mid-tier size (50k–200k) — good response rate if email available");
  } else if (subs >= 1_000 && subs < 10_000) {
    score += 20;
    reasons.push("Small creator (1k–10k) — very likely to respond to partnership offers");
  } else if (subs >= 200_000 && subs < 1_000_000) {
    score += 12;
    reasons.push("Established creator (200k–1M) — may need personalised outreach to cut through volume");
  } else if (subs >= 1_000_000) {
    score += 4;
    reasons.push("Large channel (>1M) — response probability is low without a strong hook or warm intro");
  } else {
    score += 5;
    reasons.push("Subscriber count unclear — response potential is uncertain");
  }

  if (prospect.email) {
    score += 20;
    reasons.push("Email address available — email outreach converts significantly better than DM");
  } else {
    reasons.push("No email — platform DM is the only current contact method");
  }

  if (prospect.platform === "YouTube") {
    score += 5;
    reasons.push("YouTube creators commonly list business contacts in channel About tab");
  }

  return { score: clamp(score), reasons };
}

function scoreContentRelevance(input: QualificationInput): { score: number; reasons: string[] } {
  const { prospect, product } = input;
  const reasons: string[] = [];
  let score = 35;

  const catKws = productKeywords(product.category);
  const fullText = toLowerCase(
    `${prospect.name} ${prospect.notes} ${prospect.partnerCategory}`,
  );

  // Keyword overlap with product
  const matches = countMatches(fullText, catKws);
  if (matches >= 4) {
    score += 30;
    reasons.push(`High content-topic overlap — ${matches} product-relevant keywords in channel data`);
  } else if (matches >= 2) {
    score += 20;
    reasons.push(`Moderate content-topic match — ${matches} product-relevant keywords detected`);
  } else if (matches >= 1) {
    score += 10;
    reasons.push(`Partial content-topic match — ${matches} keyword overlap with product category`);
  } else {
    reasons.push("No direct keyword match — content relevance based on creator type and platform");
  }

  // Platform match to product category
  const productPlatformFit: Record<string, string[]> = {
    Finance: ["YouTube", "Instagram"],
    Health: ["YouTube", "Instagram"],
    Productivity: ["YouTube", "TikTok"],
    Tech: ["YouTube", "TikTok"],
    Fitness: ["TikTok", "Instagram"],
    Beauty: ["TikTok", "Instagram"],
    Gaming: ["YouTube", "TikTok"],
    Lifestyle: ["Instagram", "TikTok"],
  };
  const fittingPlatforms = productPlatformFit[product.category] ?? ["YouTube"];
  if (fittingPlatforms.includes(prospect.platform ?? "")) {
    score += 15;
    reasons.push(`Platform (${prospect.platform}) is a top channel for ${product.category} products`);
  }

  // partnerCategory relevance
  const pc = toLowerCase(prospect.partnerCategory);
  const catKwLower = product.category.toLowerCase();
  if (pc && (pc.includes(catKwLower) || catKwLower.includes(pc.split(" ")[0] ?? ""))) {
    score += 10;
    reasons.push("Creator category directly aligns with product vertical");
  } else if (pc) {
    score += 5;
    reasons.push("Creator category is in a complementary content niche");
  }

  return { score: clamp(score), reasons };
}

// ─── Label and next action ────────────────────────────────────────────────────

function computeLabel(score: number): QualificationLabel {
  if (score >= 80) return "Ready to Pitch";
  if (score >= 60) return "Promising";
  if (score >= 40) return "Needs Review";
  return "Not Qualified";
}

function computeNextBestAction(label: QualificationLabel, hasFlags: boolean): string {
  if (hasFlags) {
    return "Review the flagged content carefully. If the flag is a false positive, clear it manually and re-score. Otherwise, reject or archive.";
  }
  switch (label) {
    case "Ready to Pitch":
      return "Move this creator to Targets and generate outreach — they're a strong fit for your commission offer.";
    case "Promising":
      return "Review their recent videos manually, then approve if the audience looks aligned with your product.";
    case "Needs Review":
      return "Check recent video titles and channel description before deciding — more context is needed.";
    case "Not Qualified":
      return "Reject or archive unless you have a specific reason to keep them in your pipeline.";
  }
}

// ─── Email extraction ─────────────────────────────────────────────────────────

function extractEmail(text: string | null): string | null {
  if (!text) return null;
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function scoreProspect(input: QualificationInput): QualificationResult {
  const { prospect } = input;

  const audienceResult = scoreAudienceMatch(input);
  const brandResult = scoreBrandSafety(input);
  const readinessResult = scorePartnershipReadiness(input);
  const responseResult = scoreResponseProbability(input);
  const relevanceResult = scoreContentRelevance(input);

  const partnerFitScore = clamp(
    Math.round(
      audienceResult.score * 0.25 +
      brandResult.score * 0.20 +
      readinessResult.score * 0.20 +
      responseResult.score * 0.20 +
      relevanceResult.score * 0.15,
    ),
  );

  const hardFlags = brandResult.flags;
  const qualificationLabel = computeLabel(partnerFitScore);
  const nextBestAction = computeNextBestAction(qualificationLabel, hardFlags.length > 0);

  // Extract contact email from prospect email field or parse from notes
  const contactEmail =
    prospect.email ??
    extractEmail(prospect.notes) ??
    null;

  return {
    partnerFitScore,
    audienceMatchScore: audienceResult.score,
    brandSafetyScore: brandResult.score,
    partnershipReadinessScore: readinessResult.score,
    responseProbabilityScore: responseResult.score,
    contentRelevanceScore: relevanceResult.score,
    qualificationLabel,
    hardFlags,
    scoreReasons: {
      audienceMatch: audienceResult.reasons,
      brandSafety: brandResult.reasons,
      partnershipReadiness: readinessResult.reasons,
      responseProbability: responseResult.reasons,
      contentRelevance: relevanceResult.reasons,
    },
    nextBestAction,
    contactEmail,
  };
}
