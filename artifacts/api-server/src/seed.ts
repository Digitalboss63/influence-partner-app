/**
 * Seed the database with the mock data from the Phase 1D frontend.
 *
 * Usage: npx tsx src/seed.ts (from artifacts/api-server)
 * Or: pnpm --filter @workspace/api-server run seed
 *
 * Safe to re-run: checks for existing data before inserting.
 */

import { db, productsTable, creatorsTable, pipelineEntriesTable, pipelineEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── Seed Data (sourced from artifacts/influence-partner/src/data) ─────────────

const PRODUCTS = [
  {
    id: "p1",
    name: "AppBoost Pro",
    website: "https://appboostpro.com",
    description: "A productivity suite for remote teams to manage time and tasks efficiently.",
    category: "Productivity",
    targetCustomer: "Remote workers, freelancers, agency owners",
    mainBenefit: "save 10 hours a week on task management",
    price: "$49/mo",
    commissionOffer: 35,
    status: "active" as const,
  },
  {
    id: "p2",
    name: "FitCoach Elite",
    website: "https://fitcoachelite.com",
    description: "AI-powered personalized workout and nutrition coaching app.",
    category: "Fitness",
    targetCustomer: "Busy professionals looking to stay in shape",
    mainBenefit: "get personalized coaching without the high cost of a personal trainer",
    price: "$29/mo",
    commissionOffer: 38,
    status: "active" as const,
  },
  {
    id: "p3",
    name: "WealthTrack",
    website: "https://wealthtrack.io",
    description: "Automated personal finance and investment tracking dashboard.",
    category: "Finance",
    targetCustomer: "Millennials and Gen Z investors",
    mainBenefit: "track all their investments in one clean dashboard",
    price: "$19/mo",
    commissionOffer: 40,
    status: "active" as const,
  },
];

const CREATORS = [
  {
    id: "c1",
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
    audienceFitSummary: "Highly engaged tech-savvy audience, primarily 25-34. Perfect fit for SaaS tools.",
    platformFitSummary: "Long-form YouTube videos are ideal for in-depth software tutorials.",
    engagementQuality: "High. Comments show active intent and trust in her recommendations.",
    competitorSignal: "Low. Rarely promotes competing tools.",
    productGapOpportunity: "Currently missing a dedicated task management tool in her stack video.",
    whyGoodFit: "Deep trust with her audience and high production quality.",
    suggestedDealStructure: "40% Rev Share with a $500 minimum guarantee.",
    suggestedOutreachAngle: "Praise her recent \"My 2024 Tech Stack\" video and offer to fill the missing project management gap.",
    source: "manual" as const,
  },
  {
    id: "c2",
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
    audienceFitSummary: "Broad audience looking for personal finance tips. Skews slightly younger (18-24).",
    platformFitSummary: "IG Reels are performing well, good for quick tips.",
    engagementQuality: "Average. High views but lower click-through intent.",
    competitorSignal: "Moderate. Has worked with Wealthfront in the past.",
    productGapOpportunity: "Needs an easy-to-use budget tracker to recommend to beginners.",
    whyGoodFit: "Massive reach, good for brand awareness.",
    suggestedDealStructure: "30% Rev Share + $2k flat fee per Reel.",
    suggestedOutreachAngle: "Focus on how your tool simplifies investing for his beginner audience.",
    source: "manual" as const,
  },
  {
    id: "c3",
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
    audienceFitSummary: "Extremely loyal following of women 18-30 looking for home workouts.",
    platformFitSummary: "TikTok format is perfect for quick workout demos.",
    engagementQuality: "Exceptional. Highly responsive to DMs and comments.",
    competitorSignal: "None. Exclusive to her own generic plans currently.",
    productGapOpportunity: "Needs an app-based solution to recommend instead of static PDFs.",
    whyGoodFit: "Incredible engagement and untapped potential.",
    suggestedDealStructure: "35% Rev Share, performance bonuses at 100 signups.",
    suggestedOutreachAngle: "Highlight how the app can upgrade her audience from PDFs to interactive coaching.",
    source: "manual" as const,
  },
  {
    id: "c4",
    name: "Jason Builds",
    handle: "@jasonbuilds",
    platform: "YouTube" as const,
    niche: "Entrepreneurship",
    creatorType: "Mid-Tier" as const,
    followerCount: 320000,
    engagementRate: 6.7,
    audienceMatch: 85,
    platformFit: 80,
    productFit: 78,
    competitiveConflict: 20,
    recommendedDeal: "Revenue Share",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jason",
    audienceFitSummary: "Aspiring entrepreneurs and solopreneurs aged 25-40.",
    platformFitSummary: "Deep-dive YouTube videos work well for productivity tool reviews.",
    engagementQuality: "Good. Audience trusts his recommendations for business tools.",
    competitorSignal: "Low-Moderate. Has reviewed one competitor briefly.",
    productGapOpportunity: "Audience needs a reliable task management solution for remote work.",
    whyGoodFit: "Strong resonance with target customer profile.",
    suggestedDealStructure: "35% Rev Share + $1k flat fee for a dedicated review video.",
    suggestedOutreachAngle: "Position as the productivity tool that top remote teams use.",
    source: "manual" as const,
  },
  {
    id: "c5",
    name: "Mia Wellness",
    handle: "@miawellness",
    platform: "Instagram" as const,
    niche: "Health & Wellness",
    creatorType: "Mid-Tier" as const,
    followerCount: 175000,
    engagementRate: 9.1,
    audienceMatch: 88,
    platformFit: 85,
    productFit: 82,
    competitiveConflict: 15,
    recommendedDeal: "Revenue Share",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
    audienceFitSummary: "Health-conscious women aged 22-35. High purchase intent for wellness tools.",
    platformFitSummary: "IG Stories and Reels are excellent for daily routine content.",
    engagementQuality: "Very good. Saves and shares indicate high content value.",
    competitorSignal: "None detected.",
    productGapOpportunity: "No dedicated fitness coaching recommendation yet.",
    whyGoodFit: "Perfect niche-audience alignment for FitCoach Elite.",
    suggestedDealStructure: "38% Rev Share.",
    suggestedOutreachAngle: "Emphasize the AI-personalization angle as a unique upgrade from generic workout plans.",
    source: "manual" as const,
  },
];

const PIPELINE_ENTRIES = [
  {
    id: "pipe_c1_p1",
    productId: "p1",
    creatorId: "c1",
    stage: "Interested" as const,
    notes: "Replied positively to outreach. Wants a demo call.",
    proposedRate: 500,
    priority: "High" as const,
  },
  {
    id: "pipe_c2_p3",
    productId: "p3",
    creatorId: "c2",
    stage: "Contacted" as const,
    notes: "Sent Instagram DM. No reply yet.",
    proposedRate: 2000,
    priority: "Medium" as const,
  },
  {
    id: "pipe_c3_p2",
    productId: "p2",
    creatorId: "c3",
    stage: "New" as const,
    notes: "Identified as high-fit for FitCoach Elite via TikTok audit.",
    proposedRate: null,
    priority: "High" as const,
  },
];

// ─── Seed Runner ──────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n");

  // Products
  const existingProducts = await db.select().from(productsTable);
  if (existingProducts.length > 0) {
    console.log(`⏭  Products already seeded (${existingProducts.length} rows). Skipping.`);
  } else {
    const now = new Date();
    for (const p of PRODUCTS) {
      await db.insert(productsTable).values({ ...p, createdAt: now, updatedAt: now });
    }
    console.log(`✅ Inserted ${PRODUCTS.length} products.`);
  }

  // Creators
  const existingCreators = await db.select().from(creatorsTable);
  if (existingCreators.length > 0) {
    console.log(`⏭  Creators already seeded (${existingCreators.length} rows). Skipping.`);
  } else {
    const now = new Date();
    for (const c of CREATORS) {
      await db.insert(creatorsTable).values({ ...c, isActive: true, createdAt: now, updatedAt: now });
    }
    console.log(`✅ Inserted ${CREATORS.length} creators.`);
  }

  // Pipeline entries
  const existingPipeline = await db.select().from(pipelineEntriesTable);
  if (existingPipeline.length > 0) {
    console.log(`⏭  Pipeline entries already seeded (${existingPipeline.length} rows). Skipping.`);
  } else {
    const now = new Date();
    for (const entry of PIPELINE_ENTRIES) {
      await db.insert(pipelineEntriesTable).values({
        ...entry,
        agreedRate: null,
        dealType: null,
        dealStartDate: null,
        dealEndDate: null,
        createdAt: now,
        updatedAt: now,
      });
      // Initial event
      await db.insert(pipelineEventsTable).values({
        id: `evt_seed_${entry.id}`,
        pipelineEntryId: entry.id,
        fromStage: null,
        toStage: entry.stage,
        note: "Seeded from Phase 1D mock data",
        changedAt: now,
      });
    }
    console.log(`✅ Inserted ${PIPELINE_ENTRIES.length} pipeline entries.`);
  }

  console.log("\n🎉 Seed complete.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
