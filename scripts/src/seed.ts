import { db } from "@workspace/db";
import {
  productsTable,
  productIntelligenceSnapshotsTable,
  creatorsTable,
  creatorScoresTable,
  pipelineEntriesTable,
  pipelineEventsTable,
  outreachMessagesTable,
} from "@workspace/db";

// ─── Scoring helpers (mirrors frontend src/lib/scoring.ts) ────────────────────

function computeFitScore(c: {
  audienceMatch: number;
  platformFit: number;
  productFit: number;
  competitiveConflict: number;
  engagementRate: number;
}): number {
  const normalizedEngagement = Math.min(c.engagementRate / 15, 1) * 100;
  const score =
    c.audienceMatch * 0.3 +
    c.platformFit * 0.2 +
    c.productFit * 0.3 +
    (100 - c.competitiveConflict) * 0.15 +
    normalizedEngagement * 0.05;
  return Math.round(score);
}

function getFitLabel(
  score: number,
): "Excellent Partner" | "Strong Fit" | "Possible Fit" | "Low Priority" {
  if (score >= 85) return "Excellent Partner";
  if (score >= 70) return "Strong Fit";
  if (score >= 55) return "Possible Fit";
  return "Low Priority";
}

function getSuggestedCommission(label: string): string {
  switch (label) {
    case "Excellent Partner":
      return "38-40%";
    case "Strong Fit":
      return "35-37%";
    case "Possible Fit":
      return "30-34%";
    default:
      return "20-25%";
  }
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const productSeeds = [
  {
    name: "AppBoost Pro",
    website: "https://appboostpro.com",
    description:
      "A productivity suite for remote teams to manage time and tasks efficiently.",
    category: "Productivity",
    targetCustomer: "Remote workers, freelancers, agency owners",
    mainBenefit: "save 10 hours a week on task management",
    price: "$49/mo",
    commissionOffer: 35,
  },
  {
    name: "FitCoach Elite",
    website: "https://fitcoachelite.com",
    description: "AI-powered personalized workout and nutrition coaching app.",
    category: "Fitness",
    targetCustomer: "Busy professionals looking to stay in shape",
    mainBenefit:
      "get personalized coaching without the high cost of a personal trainer",
    price: "$29/mo",
    commissionOffer: 38,
  },
  {
    name: "WealthTrack",
    website: "https://wealthtrack.io",
    description:
      "Automated personal finance and investment tracking dashboard.",
    category: "Finance",
    targetCustomer: "Millennials and Gen Z investors",
    mainBenefit: "track all their investments in one clean dashboard",
    price: "$19/mo",
    commissionOffer: 40,
  },
];

const intelligenceSeeds = [
  {
    // AppBoost Pro
    isCurrent: true,
    version: 1,
    mainMarket: "B2B SaaS",
    subMarket: "Productivity Tools",
    buyerPersona: {
      age: "25-40",
      gender: "Mixed",
      interests: ["productivity", "remote work", "time management"],
      painPoints: ["scattered tasks", "time waste", "team coordination"],
      platforms: ["YouTube", "Instagram"],
    },
    recommendedCreatorCategories: [
      { category: "Productivity", reason: "Direct niche alignment", fitLevel: "Primary" },
      { category: "Tech", reason: "SaaS audience overlap", fitLevel: "Secondary" },
      { category: "Business", reason: "Entrepreneur audience", fitLevel: "Tertiary" },
    ],
    outreachAngle:
      "Highlight 10 hours saved per week and the 35% commission offer.",
    whyTheseCreators:
      "Productivity and tech creators have audiences actively seeking tools to improve their workflow.",
    marketDifficulty: "Medium",
    marketDifficultyReason:
      "Crowded SaaS space but strong commission differentiates partners.",
    competitionLevel: "Competitive",
    competitionReason: "Notion, Asana, and Monday.com have affiliate programs.",
    campaignOpportunityRating: "Strong",
    campaignOpportunityReason:
      "Remote work trend drives consistent demand for productivity tools.",
    revenuePotentialLabel: "High",
    revenuePotentialMonthly: "$50k-$150k",
    revenuePotentialReason:
      "High LTV SaaS product with strong recurring commission potential.",
    estimatedPartnerAcquisitionPotential: "20-40",
    partnerAcquisitionReason:
      "Productive niche has dozens of active mid-tier creators.",
  },
  {
    // FitCoach Elite
    isCurrent: true,
    version: 1,
    mainMarket: "Health & Wellness",
    subMarket: "Fitness Apps",
    buyerPersona: {
      age: "22-38",
      gender: "Female skew",
      interests: ["fitness", "nutrition", "wellness"],
      painPoints: ["expensive trainers", "inconsistent routines", "lack of personalization"],
      platforms: ["TikTok", "Instagram"],
    },
    recommendedCreatorCategories: [
      { category: "Fitness", reason: "Core audience alignment", fitLevel: "Primary" },
      { category: "Health", reason: "Wellness overlap", fitLevel: "Secondary" },
      { category: "Lifestyle", reason: "Broader reach", fitLevel: "Tertiary" },
    ],
    outreachAngle:
      "Position as affordable AI personal trainer with 38% commission.",
    whyTheseCreators:
      "Fitness creators have highly engaged audiences who trust product recommendations.",
    marketDifficulty: "High",
    marketDifficultyReason:
      "MyFitnessPal, Peloton, and Noom dominate with large affiliate budgets.",
    competitionLevel: "Very Competitive",
    competitionReason:
      "Major fitness brands actively recruit creators with flat fees.",
    campaignOpportunityRating: "Strong",
    campaignOpportunityReason:
      "Micro fitness creators convert extremely well on TikTok.",
    revenuePotentialLabel: "Medium-High",
    revenuePotentialMonthly: "$30k-$100k",
    revenuePotentialReason: "Strong conversion from engaged fitness audiences.",
    estimatedPartnerAcquisitionPotential: "30-60",
    partnerAcquisitionReason:
      "Large pool of micro fitness influencers seeking affiliate income.",
  },
  {
    // WealthTrack
    isCurrent: true,
    version: 1,
    mainMarket: "Personal Finance",
    subMarket: "Investment Tracking",
    buyerPersona: {
      age: "24-35",
      gender: "Male skew",
      interests: ["investing", "personal finance", "financial independence"],
      painPoints: ["scattered portfolios", "no unified view", "manual tracking"],
      platforms: ["YouTube", "Instagram"],
    },
    recommendedCreatorCategories: [
      { category: "Finance", reason: "Perfect audience match", fitLevel: "Primary" },
      { category: "Business", reason: "Entrepreneur investors", fitLevel: "Secondary" },
      { category: "Lifestyle", reason: "FIRE movement audience", fitLevel: "Tertiary" },
    ],
    outreachAngle:
      "Lead with 40% commission and the gap in clean portfolio tracking tools.",
    whyTheseCreators:
      "Finance creators have action-taking audiences who invest in recommended tools.",
    marketDifficulty: "Medium",
    marketDifficultyReason:
      "Mint discontinued, creating an opening for new tracking tools.",
    competitionLevel: "Competitive",
    competitionReason: "Personal Capital and Copilot have affiliate programs.",
    campaignOpportunityRating: "Excellent",
    campaignOpportunityReason:
      "Mint shutdown left a gap that finance creators are actively filling.",
    revenuePotentialLabel: "High",
    revenuePotentialMonthly: "$40k-$120k",
    revenuePotentialReason:
      "Finance audiences have high purchase intent and LTV.",
    estimatedPartnerAcquisitionPotential: "25-50",
    partnerAcquisitionReason:
      "Finance YouTube is growing with many mid-tier creators seeking tools.",
  },
];

const creatorSeeds = [
  {
    name: "Tara Simmons",
    handle: "@techwithtara",
    platform: "YouTube" as const,
    niche: "Tech",
    creatorType: "Mid-Tier" as const,
    followerCount: 245000,
    engagementRate: 8.5,
    audienceMatch: 95,
    platformFit: 90,
    productFit: 85,
    competitiveConflict: 10,
    recommendedDeal: "Revenue Share",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tara",
    audienceFitSummary:
      "Highly engaged tech-savvy audience, primarily 25-34. Perfect fit for SaaS tools.",
    platformFitSummary:
      "Long-form YouTube videos are ideal for in-depth software tutorials.",
    engagementQuality:
      "High. Comments show active intent and trust in her recommendations.",
    competitorSignal: "Low. Rarely promotes competing tools.",
    productGapOpportunity:
      "Currently missing a dedicated task management tool in her stack video.",
    whyGoodFit: "Deep trust with her audience and high production quality.",
    suggestedDealStructure:
      "40% Rev Share with a $500 minimum guarantee.",
    suggestedOutreachAngle:
      'Praise her recent "My 2024 Tech Stack" video and offer to fill the missing project management gap.',
  },
  {
    name: "Mark Johnson",
    handle: "@financewithmark",
    platform: "Instagram" as const,
    niche: "Finance",
    creatorType: "Macro" as const,
    followerCount: 1200000,
    engagementRate: 4.2,
    audienceMatch: 80,
    platformFit: 85,
    productFit: 90,
    competitiveConflict: 25,
    recommendedDeal: "CPA + Flat Fee",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mark",
    audienceFitSummary:
      "Broad audience looking for personal finance tips. Skews slightly younger (18-24).",
    platformFitSummary: "IG Reels are performing well, good for quick tips.",
    engagementQuality: "Average. High views but lower click-through intent.",
    competitorSignal: "Moderate. Has worked with Wealthfront in the past.",
    productGapOpportunity:
      "Needs an easy-to-use budget tracker to recommend to beginners.",
    whyGoodFit: "Massive reach, good for brand awareness.",
    suggestedDealStructure: "30% Rev Share + $2k flat fee per Reel.",
    suggestedOutreachAngle:
      "Focus on how your tool simplifies investing for his beginner audience.",
  },
  {
    name: "Elena Fit",
    handle: "@elenafitness",
    platform: "TikTok" as const,
    niche: "Fitness",
    creatorType: "Micro" as const,
    followerCount: 85000,
    engagementRate: 12.4,
    audienceMatch: 90,
    platformFit: 95,
    productFit: 80,
    competitiveConflict: 5,
    recommendedDeal: "Affiliate Only",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    audienceFitSummary:
      "Extremely loyal following of women 18-30 looking for home workouts.",
    platformFitSummary: "TikTok format is perfect for quick workout demos.",
    engagementQuality: "Exceptional. Highly responsive to DMs and comments.",
    competitorSignal:
      "None. Exclusive to her own generic plans currently.",
    productGapOpportunity:
      "Needs an app-based solution to recommend instead of static PDFs.",
    whyGoodFit: "Incredible engagement and untapped potential.",
    suggestedDealStructure:
      "35% Rev Share, performance bonuses at 100 signups.",
    suggestedOutreachAngle:
      "Highlight how the app can upgrade her audience from PDFs to interactive coaching.",
  },
  {
    name: "David Kim",
    handle: "@dkbuilds",
    platform: "YouTube" as const,
    niche: "Productivity",
    creatorType: "Mid-Tier" as const,
    followerCount: 310000,
    engagementRate: 6.8,
    audienceMatch: 85,
    platformFit: 90,
    productFit: 88,
    competitiveConflict: 20,
    recommendedDeal: "Revenue Share",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    audienceFitSummary:
      "Professionals and students optimizing their workflow.",
    platformFitSummary: "Great at Notion/Obsidian tutorials.",
    engagementQuality: "Strong. High retention rate on 15+ min videos.",
    competitorSignal: "Promotes Notion heavily.",
    productGapOpportunity:
      "Looking for integrated time-tracking solutions.",
    whyGoodFit: "Authority in the productivity space.",
    suggestedDealStructure: "38% Rev Share, dedicated 60s integration.",
    suggestedOutreachAngle:
      "Compliment his Notion templates and pitch your tool as the perfect companion.",
  },
  {
    name: "Sarah Chen",
    handle: "@sarahcodes",
    platform: "Instagram" as const,
    niche: "Business",
    creatorType: "Micro" as const,
    followerCount: 45000,
    engagementRate: 9.1,
    audienceMatch: 75,
    platformFit: 70,
    productFit: 85,
    competitiveConflict: 15,
    recommendedDeal: "Affiliate Only",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    audienceFitSummary: "Indie hackers and solo founders.",
    platformFitSummary: "Good use of IG carousels for coding tips.",
    engagementQuality: "Very high peer-to-peer engagement.",
    competitorSignal: "Low.",
    productGapOpportunity:
      "Needs SaaS recommendations for her startup journey series.",
    whyGoodFit: "Authentic voice in the indie hacker community.",
    suggestedDealStructure: "30% Rev Share.",
    suggestedOutreachAngle: "Connect over shared founder experiences.",
  },
  {
    name: "Alex Rivera",
    handle: "@alexhealth",
    platform: "YouTube" as const,
    niche: "Health",
    creatorType: "Macro" as const,
    followerCount: 890000,
    engagementRate: 5.5,
    audienceMatch: 82,
    platformFit: 80,
    productFit: 75,
    competitiveConflict: 40,
    recommendedDeal: "Flat Fee",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    audienceFitSummary: "General health and wellness enthusiasts.",
    platformFitSummary: "High production value video essays.",
    engagementQuality: "Solid, but expensive.",
    competitorSignal: "High. Sponsored by BetterHelp and Athletic Greens.",
    productGapOpportunity: "N/A",
    whyGoodFit: "Good reach, but perhaps too expensive for ROI.",
    suggestedDealStructure: "$5k Flat Fee.",
    suggestedOutreachAngle: "Focus on audience overlap.",
  },
  {
    name: "Jessica Lee",
    handle: "@jessicabeauty",
    platform: "TikTok" as const,
    niche: "Beauty",
    creatorType: "Mid-Tier" as const,
    followerCount: 420000,
    engagementRate: 11.2,
    audienceMatch: 40,
    platformFit: 85,
    productFit: 30,
    competitiveConflict: 10,
    recommendedDeal: "Test Only",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
    audienceFitSummary: "Beauty enthusiasts, young demographic.",
    platformFitSummary: "Viral trend creator.",
    engagementQuality: "High views, low conversion intent.",
    competitorSignal: "Low.",
    productGapOpportunity: "Low fit for SaaS/Finance.",
    whyGoodFit: "Not a good fit, low priority.",
    suggestedDealStructure: "Test CPA.",
    suggestedOutreachAngle: "Standard outreach.",
  },
  {
    name: "Chris Wong",
    handle: "@chrisgaming",
    platform: "YouTube" as const,
    niche: "Gaming",
    creatorType: "Celebrity" as const,
    followerCount: 5200000,
    engagementRate: 3.8,
    audienceMatch: 50,
    platformFit: 90,
    productFit: 40,
    competitiveConflict: 30,
    recommendedDeal: "Flat Fee",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris",
    audienceFitSummary: "Gamers, heavily male skew.",
    platformFitSummary: "Livestreams and let's plays.",
    engagementQuality: "High volume, low niche focus.",
    competitorSignal: "Moderate.",
    productGapOpportunity: "Needs gaming gear, not software.",
    whyGoodFit: "Too broad.",
    suggestedDealStructure: "Very expensive.",
    suggestedOutreachAngle: "N/A",
  },
  {
    name: "Emma Stone",
    handle: "@emmalifestyle",
    platform: "Instagram" as const,
    niche: "Lifestyle",
    creatorType: "Macro" as const,
    followerCount: 1500000,
    engagementRate: 4.9,
    audienceMatch: 60,
    platformFit: 80,
    productFit: 55,
    competitiveConflict: 20,
    recommendedDeal: "CPA",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    audienceFitSummary: "Aspirational lifestyle followers.",
    platformFitSummary: "Aesthetic photo/video.",
    engagementQuality: "Average.",
    competitorSignal: "Low.",
    productGapOpportunity: 'Could pitch finance app as "getting life together".',
    whyGoodFit: "Good for broad lifestyle apps.",
    suggestedDealStructure: "30% CPA.",
    suggestedOutreachAngle: "Pitch as a life-hack.",
  },
  {
    name: "Ryan Daily",
    handle: "@ryanhustle",
    platform: "TikTok" as const,
    niche: "Business",
    creatorType: "Mid-Tier" as const,
    followerCount: 280000,
    engagementRate: 9.5,
    audienceMatch: 90,
    platformFit: 85,
    productFit: 95,
    competitiveConflict: 15,
    recommendedDeal: "Revenue Share",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan",
    audienceFitSummary: "Entrepreneurs, side-hustlers.",
    platformFitSummary: "Quick motivational/tactical advice.",
    engagementQuality: "High action-takers.",
    competitorSignal: "Low.",
    productGapOpportunity: "Needs tactical tools to recommend.",
    whyGoodFit: "Perfect match for B2B SaaS.",
    suggestedDealStructure: "40% Rev Share.",
    suggestedOutreachAngle: 'Partner on a "top tools for founders" series.',
  },
  {
    name: "Cooking with Jen",
    handle: "@jencooks",
    platform: "YouTube" as const,
    niche: "Food",
    creatorType: "Macro" as const,
    followerCount: 950000,
    engagementRate: 6.2,
    audienceMatch: 30,
    platformFit: 85,
    productFit: 25,
    competitiveConflict: 5,
    recommendedDeal: "Test Only",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jen",
    audienceFitSummary: "Home cooks.",
    platformFitSummary: "Recipe videos.",
    engagementQuality: "High.",
    competitorSignal: "Low.",
    productGapOpportunity: "None.",
    whyGoodFit: "Poor fit.",
    suggestedDealStructure: "N/A",
    suggestedOutreachAngle: "N/A",
  },
  {
    name: "Tech Ninja",
    handle: "@techninjareviews",
    platform: "TikTok" as const,
    niche: "Tech",
    creatorType: "Micro" as const,
    followerCount: 65000,
    engagementRate: 14.2,
    audienceMatch: 88,
    platformFit: 95,
    productFit: 90,
    competitiveConflict: 10,
    recommendedDeal: "Revenue Share",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ninja",
    audienceFitSummary: "Early adopters, gadget lovers.",
    platformFitSummary: "Fast-paced app reviews.",
    engagementQuality: "Very high conversion potential.",
    competitorSignal: "Low.",
    productGapOpportunity: "Loves reviewing new productivity apps.",
    whyGoodFit: "High energy, great converter.",
    suggestedDealStructure: "35% Rev Share.",
    suggestedOutreachAngle: "Give early access for an exclusive review.",
  },
  {
    name: "Yoga with Anna",
    handle: "@annayoga",
    platform: "Instagram" as const,
    niche: "Fitness",
    creatorType: "Mid-Tier" as const,
    followerCount: 180000,
    engagementRate: 7.4,
    audienceMatch: 85,
    platformFit: 80,
    productFit: 85,
    competitiveConflict: 15,
    recommendedDeal: "CPA",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
    audienceFitSummary: "Mindfulness and yoga practitioners.",
    platformFitSummary: "Aesthetic poses and routines.",
    engagementQuality: "Good.",
    competitorSignal: "Low.",
    productGapOpportunity: "Needs an app for guided flows.",
    whyGoodFit: "Loyal community.",
    suggestedDealStructure: "35% Rev Share.",
    suggestedOutreachAngle: "Focus on wellness tracking.",
  },
  {
    name: "Crypto King",
    handle: "@cryptoking",
    platform: "YouTube" as const,
    niche: "Finance",
    creatorType: "Macro" as const,
    followerCount: 1100000,
    engagementRate: 5.8,
    audienceMatch: 75,
    platformFit: 85,
    productFit: 70,
    competitiveConflict: 60,
    recommendedDeal: "Flat Fee",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=King",
    audienceFitSummary: "Crypto degens and traders.",
    platformFitSummary: "Market analysis.",
    engagementQuality: "Medium.",
    competitorSignal: "Very High (shills many exchanges).",
    productGapOpportunity: "Needs portfolio tracking.",
    whyGoodFit: "Big reach, but high conflict.",
    suggestedDealStructure: "Sponsorship only.",
    suggestedOutreachAngle: "Pitch portfolio tracking features.",
  },
  {
    name: "Organize Me",
    handle: "@organizeme",
    platform: "Instagram" as const,
    niche: "Productivity",
    creatorType: "Micro" as const,
    followerCount: 35000,
    engagementRate: 11.5,
    audienceMatch: 95,
    platformFit: 90,
    productFit: 95,
    competitiveConflict: 5,
    recommendedDeal: "Revenue Share",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Organize",
    audienceFitSummary: "Type-A planners and organizers.",
    platformFitSummary: "Aesthetic desk setups and planning.",
    engagementQuality: "Excellent.",
    competitorSignal: "Low.",
    productGapOpportunity: "Perfect for digital planners.",
    whyGoodFit: "Incredible niche alignment.",
    suggestedDealStructure: "40% Rev Share.",
    suggestedOutreachAngle: "Collaborate on a custom template.",
  },
];

// Pipeline stage per creator (p1 = AppBoost Pro default)
const creatorPipelineStages: Record<
  string,
  | "New"
  | "Contacted"
  | "Interested"
  | "Negotiating"
  | "Active"
  | "Rejected"
> = {
  "@techwithtara": "Interested",
  "@financewithmark": "Contacted",
  "@elenafitness": "New",
  "@dkbuilds": "Negotiating",
  "@sarahcodes": "Active",
  "@alexhealth": "Rejected",
  "@jessicabeauty": "New",
  "@chrisgaming": "New",
  "@emmalifestyle": "Contacted",
  "@ryanhustle": "Active",
  "@jencooks": "New",
  "@techninjareviews": "Interested",
  "@annayoga": "Negotiating",
  "@cryptoking": "New",
  "@organizeme": "Active",
};

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n");

  // 1. Products
  console.log("Inserting products...");
  const products = await db
    .insert(productsTable)
    .values(productSeeds)
    .returning();
  const [p1, p2, p3] = products;
  console.log(
    `  ✓ ${products.length} products: ${products.map((p) => p.name).join(", ")}\n`,
  );

  // 2. Product Intelligence Snapshots
  console.log("Inserting intelligence snapshots...");
  await db.insert(productIntelligenceSnapshotsTable).values([
    { ...intelligenceSeeds[0], productId: p1.id },
    { ...intelligenceSeeds[1], productId: p2.id },
    { ...intelligenceSeeds[2], productId: p3.id },
  ]);
  console.log("  ✓ 3 intelligence snapshots\n");

  // 3. Creators
  console.log("Inserting creators...");
  const creators = await db
    .insert(creatorsTable)
    .values(creatorSeeds)
    .returning();
  console.log(`  ✓ ${creators.length} creators\n`);

  // 4. Creator Scores (per product)
  console.log("Inserting creator scores...");
  const scoreRows = [];
  for (const creator of creators) {
    const fitScore = computeFitScore(creator);
    const fitLabel = getFitLabel(fitScore);
    const suggestedCommission = getSuggestedCommission(fitLabel);
    for (const product of [p1, p2, p3]) {
      scoreRows.push({
        creatorId: creator.id,
        productId: product.id,
        fitScore,
        fitLabel,
        suggestedCommission,
      });
    }
  }
  await db.insert(creatorScoresTable).values(scoreRows);
  console.log(`  ✓ ${scoreRows.length} creator scores (${creators.length} creators × 3 products)\n`);

  // 5. Pipeline Entries (all 15 creators vs p1 = AppBoost Pro)
  console.log("Inserting pipeline entries...");
  const pipelineRows = creators.map((creator) => ({
    creatorId: creator.id,
    productId: p1.id,
    stage: (creatorPipelineStages[creator.handle] ?? "New") as
      | "New"
      | "Contacted"
      | "Interested"
      | "Negotiating"
      | "Active"
      | "Rejected",
  }));
  const entries = await db
    .insert(pipelineEntriesTable)
    .values(pipelineRows)
    .returning();
  console.log(`  ✓ ${entries.length} pipeline entries\n`);

  // 6. Pipeline Events (one initial event per entry)
  console.log("Inserting pipeline events...");
  const eventRows = entries.map((entry) => ({
    pipelineEntryId: entry.id,
    fromStage: null as null,
    toStage: entry.stage,
    notes: "Entry seeded",
  }));
  await db.insert(pipelineEventsTable).values(eventRows);
  console.log(`  ✓ ${eventRows.length} pipeline events\n`);

  // 7. Outreach Messages (3 examples: top creator per product)
  console.log("Inserting outreach messages...");
  const taraId = creators.find((c) => c.handle === "@techwithtara")!.id;
  const elenaId = creators.find((c) => c.handle === "@elenafitness")!.id;
  const markId = creators.find((c) => c.handle === "@financewithmark")!.id;

  await db.insert(outreachMessagesTable).values([
    {
      creatorId: taraId,
      productId: p1.id,
      channel: "Email",
      tone: "High-Commission Offer",
      subjectLine: "35% commission + your audience needs this tool, Tara",
      message:
        "Hi Tara,\n\nI watched your 2024 Tech Stack video — great breakdown. I noticed you don't have a dedicated project management tool in there, and I think that's actually a gap your audience has been waiting for you to fill.\n\nWe built AppBoost Pro specifically for remote teams and freelancers. It saves users 10 hours/week on task management — exactly the kind of result your audience is looking for.\n\nWe'd love to offer you a 35% recurring commission on every signup you drive, plus a $500/month minimum guarantee.\n\nInterested in a quick call?",
      followUp:
        "Following up — would love to hear if AppBoost Pro could be a fit for your next tools video.",
    },
    {
      creatorId: elenaId,
      productId: p2.id,
      channel: "TikTok DM",
      tone: "Friendly",
      subjectLine: null,
      message:
        "Hey Elena! 👋 I've been following your home workout content and your audience is incredible. Quick question — are you recommending any apps right now for your followers who want personalized coaching?\n\nWe have FitCoach Elite — an AI-powered coaching app your audience would love as an upgrade from static PDFs. We're offering 38% commission to a small group of fitness creators.\n\nWould love to send you early access if you're interested!",
      followUp:
        "Hey! Just checking in — did you get a chance to look at FitCoach Elite? Happy to set up early access for you 🙌",
    },
    {
      creatorId: markId,
      productId: p3.id,
      channel: "Instagram DM",
      tone: "Professional",
      subjectLine: null,
      message:
        "Hi Mark,\n\nLove what you're doing for beginner investors on Instagram. Your Reels break down complex topics in a way that actually sticks.\n\nWe built WealthTrack — a clean investment tracking dashboard for the exact audience you serve. With Mint gone, there's a real gap for a simple, visual portfolio tracker.\n\nWe'd like to offer you a 40% recurring commission. It's the highest in our category and we think your audience will convert well given their investment intent.\n\nWould you be open to a short call?",
      followUp:
        "Hi Mark — following up on WealthTrack. Happy to share our conversion data from other finance creators if that would help.",
    },
  ]);
  console.log("  ✓ 3 outreach messages\n");

  console.log("✅ Seed complete!\n");
  console.log("Summary:");
  console.log(`  Products:           ${products.length}`);
  console.log("  Intel snapshots:    3");
  console.log(`  Creators:           ${creators.length}`);
  console.log(`  Creator scores:     ${scoreRows.length}`);
  console.log(`  Pipeline entries:   ${entries.length}`);
  console.log(`  Pipeline events:    ${eventRows.length}`);
  console.log("  Outreach messages:  3");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
