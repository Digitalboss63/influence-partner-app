/**
 * Seed the database with mock products, creators, scores, intelligence snapshots,
 * pipeline items, and outreach messages.
 *
 * Usage: npm run db:seed
 * Safe to re-run: checks for existing data before inserting.
 */

import { initDb, getDb, getSqliteDb, persistDb, schema } from "./index";
import { eq } from "drizzle-orm";

const {
  products,
  creators,
  creatorScores,
  productIntelligenceSnapshots,
  pipelineItems,
  outreachMessages,
} = schema;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function past(daysAgo: number): number {
  return Date.now() - daysAgo * 86400_000;
}

// ─── Mock Products ────────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: "prod_001",
    name: "GlowDerm Serum",
    description: "A science-backed vitamin C and hyaluronic acid serum for brighter, firmer skin. Dermatologist-tested, fragrance-free.",
    category: "Beauty & Skincare",
    price: 68,
    url: "https://example.com/glowderm",
    imageUrl: null,
    targetAudience: "Women 25-45, skincare enthusiasts, anti-aging focus",
    keyBenefits: JSON.stringify(["Brightens skin tone", "Reduces fine lines", "Fragrance-free & dermatologist tested", "24hr hydration"]),
  },
  {
    id: "prod_002",
    name: "FlexPro Resistance Bands",
    description: "Premium latex-free resistance bands with 5 progressive levels. Ideal for home workouts, PT, and mobility training.",
    category: "Fitness & Wellness",
    price: 34,
    url: "https://example.com/flexpro",
    imageUrl: null,
    targetAudience: "Fitness enthusiasts 18-40, home gym crowd, physical therapy patients",
    keyBenefits: JSON.stringify(["5 resistance levels", "Latex-free & skin-safe", "Portable & travel-friendly", "Free workout guide included"]),
  },
  {
    id: "prod_003",
    name: "BrewMaster Cold Brew Kit",
    description: "All-in-one cold brew coffee system for smooth, low-acid coffee at home. Makes 1L per batch. BPA-free glass carafe.",
    category: "Food & Beverage",
    price: 49,
    url: "https://example.com/brewmaster",
    imageUrl: null,
    targetAudience: "Coffee lovers 22-40, home baristas, millennial DTC shoppers",
    keyBenefits: JSON.stringify(["Rich, smooth cold brew at home", "BPA-free borosilicate glass", "Ready in 12-24 hours", "Easy clean filter"]),
  },
];

// ─── Mock Creators ────────────────────────────────────────────────────────────

const CREATORS = [
  {
    id: "cre_001",
    name: "Aria Chen",
    handle: "@ariaglows",
    platform: "instagram",
    niche: "Skincare & Beauty",
    followerCount: 284000,
    engagementRate: 4.2,
    avgViews: 41000,
    avgLikes: 9800,
    location: "Los Angeles, CA",
    email: "aria@ariaglows.com",
    bio: "Skincare nerd 🧴 | Dermatologist-approved routines | Honest reviews only",
    profileImageUrl: null,
    tags: JSON.stringify(["skincare", "beauty", "clean beauty", "anti-aging"]),
    audienceDemographics: JSON.stringify({ ageRange: "25-35", genderSplit: "82% female", topLocations: ["US", "UK", "CA"] }),
    priceRange: "$1,500-$4,000",
    isVerified: 1,
  },
  {
    id: "cre_002",
    name: "Marcus Webb",
    handle: "@marcusfitlife",
    platform: "youtube",
    niche: "Fitness & Home Workouts",
    followerCount: 612000,
    engagementRate: 3.8,
    avgViews: 98000,
    avgLikes: 5200,
    location: "Austin, TX",
    email: "marcus@fitlife.media",
    bio: "Home gym builds, no-BS workouts, and honest gear reviews",
    profileImageUrl: null,
    tags: JSON.stringify(["fitness", "home gym", "workout", "strength training"]),
    audienceDemographics: JSON.stringify({ ageRange: "22-35", genderSplit: "71% male", topLocations: ["US", "AU", "CA"] }),
    priceRange: "$2,000-$6,000",
    isVerified: 1,
  },
  {
    id: "cre_003",
    name: "Priya Nair",
    handle: "@priyabrews",
    platform: "tiktok",
    niche: "Coffee & Food",
    followerCount: 189000,
    engagementRate: 7.1,
    avgViews: 210000,
    avgLikes: 18400,
    location: "Brooklyn, NY",
    email: "priya@priyabrews.com",
    bio: "Obsessed with coffee ☕ | Home barista recipes | Honest product reviews",
    profileImageUrl: null,
    tags: JSON.stringify(["coffee", "cold brew", "food", "cooking", "home barista"]),
    audienceDemographics: JSON.stringify({ ageRange: "22-32", genderSplit: "61% female", topLocations: ["US", "UK"] }),
    priceRange: "$800-$2,500",
    isVerified: 0,
  },
  {
    id: "cre_004",
    name: "Devon Clarke",
    handle: "@devonwellness",
    platform: "instagram",
    niche: "Wellness & Fitness",
    followerCount: 94000,
    engagementRate: 5.6,
    avgViews: 22000,
    avgLikes: 4100,
    location: "Denver, CO",
    email: "devon@devonwellness.co",
    bio: "Holistic wellness | Yoga, mobility, and mindful living | PT certified",
    profileImageUrl: null,
    tags: JSON.stringify(["wellness", "yoga", "mobility", "resistance training", "fitness"]),
    audienceDemographics: JSON.stringify({ ageRange: "28-42", genderSplit: "78% female", topLocations: ["US"] }),
    priceRange: "$500-$1,800",
    isVerified: 0,
  },
  {
    id: "cre_005",
    name: "Zara Okafor",
    handle: "@zaraskincollective",
    platform: "youtube",
    niche: "Skincare & Lifestyle",
    followerCount: 437000,
    engagementRate: 3.1,
    avgViews: 62000,
    avgLikes: 3800,
    location: "Atlanta, GA",
    email: "zara@skincollective.co",
    bio: "Building your best skin routine | Science-backed | No fluff",
    profileImageUrl: null,
    tags: JSON.stringify(["skincare", "beauty", "vitamin c", "routine", "lifestyle"]),
    audienceDemographics: JSON.stringify({ ageRange: "24-38", genderSplit: "88% female", topLocations: ["US", "NG", "UK"] }),
    priceRange: "$2,500-$7,000",
    isVerified: 1,
  },
];

// ─── Score computation ────────────────────────────────────────────────────────

function computeScore(creator: typeof CREATORS[0], product: typeof PRODUCTS[0]) {
  const nicheMap: Record<string, string[]> = {
    prod_001: ["skincare", "beauty", "clean beauty", "anti-aging", "lifestyle"],
    prod_002: ["fitness", "home gym", "workout", "wellness", "yoga", "mobility"],
    prod_003: ["coffee", "food", "lifestyle", "home", "cooking"],
  };
  const relevantNiches = nicheMap[product.id] ?? [];
  const creatorNicheWords = (creator.niche + " " + creator.tags).toLowerCase();
  const nicheHits = relevantNiches.filter((n) => creatorNicheWords.includes(n)).length;
  const nicheRelevanceScore = Math.min(100, (nicheHits / Math.max(relevantNiches.length, 1)) * 100);
  const engagementScore = Math.min(100, creator.engagementRate * 12);
  const reachScore = Math.min(100, Math.log10(creator.followerCount) * 20);
  const audienceFitScore = nicheRelevanceScore * 0.8 + engagementScore * 0.2;
  const overallScore = nicheRelevanceScore * 0.35 + engagementScore * 0.30 + reachScore * 0.20 + audienceFitScore * 0.15;
  return {
    overallScore: Math.round(overallScore * 10) / 10,
    audienceFitScore: Math.round(audienceFitScore * 10) / 10,
    engagementScore: Math.round(engagementScore * 10) / 10,
    nicheRelevanceScore: Math.round(nicheRelevanceScore * 10) / 10,
    reachScore: Math.round(reachScore * 10) / 10,
  };
}

// ─── Seed Runner ──────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n");

  await initDb();
  const db = getDb();

  // ── Products ──
  const existingProducts = db.select().from(products).all();
  if (existingProducts.length > 0) {
    console.log(`⏭  Products already seeded (${existingProducts.length} rows). Skipping.`);
  } else {
    const now = past(30);
    for (const p of PRODUCTS) {
      db.insert(products).values({ ...p, createdAt: now, updatedAt: now }).run();
    }
    console.log(`✅ Inserted ${PRODUCTS.length} products.`);
  }

  // ── Creators ──
  const existingCreators = db.select().from(creators).all();
  if (existingCreators.length > 0) {
    console.log(`⏭  Creators already seeded (${existingCreators.length} rows). Skipping.`);
  } else {
    const now = past(20);
    for (const c of CREATORS) {
      db.insert(creators).values({ ...c, createdAt: now, updatedAt: now }).run();
    }
    console.log(`✅ Inserted ${CREATORS.length} creators.`);
  }

  // ── Product Intelligence Snapshots ──
  const existingSnapshots = db.select().from(productIntelligenceSnapshots).all();
  if (existingSnapshots.length > 0) {
    console.log(`⏭  Intelligence snapshots already seeded. Skipping.`);
  } else {
    const snapshotData: Record<string, Record<string, string>> = {
      prod_001: {
        targetAudienceAnalysis: "Primary: women 25-44 with active skincare routines. Secondary: clean beauty advocates.",
        contentAngles: JSON.stringify(["Before/after skincare journey", "Ingredient deep dive (Vit C + HA)", "AM routine integration", "Fragrance-free round-up"]),
        competitorLandscape: "Competes with SkinCeuticals CE Ferulic ($166), Drunk Elephant C-Firma ($78). Strong value at $68.",
        pricingPosition: "Mid-premium. Below clinical brands, above drugstore.",
        bestCreatorProfile: JSON.stringify({ niches: ["skincare", "clean beauty"], platforms: ["instagram", "youtube"], minFollowers: 30000 }),
      },
      prod_002: {
        targetAudienceAnalysis: "Home gym enthusiasts, PT patients, beginner-to-intermediate fitness audiences aged 20-40.",
        contentAngles: JSON.stringify(["Full body home workout", "Progressive overload at home", "PT-approved mobility routine", "Travel workout essentials"]),
        competitorLandscape: "Competes with Fit Simplify ($23), Victorem ($28). Differentiator: latex-free, 5-level set.",
        pricingPosition: "Slightly premium for category. Justifiable with latex-free angle.",
        bestCreatorProfile: JSON.stringify({ niches: ["fitness", "wellness", "yoga"], platforms: ["youtube", "instagram"], minFollowers: 20000 }),
      },
      prod_003: {
        targetAudienceAnalysis: "Coffee-passionate millennials with home kitchen interest.",
        contentAngles: JSON.stringify(["Cold brew recipe + taste test", "30-day home cafe challenge", "Coffee aesthetic setup", "Iced latte recipes"]),
        competitorLandscape: "Competes with Toddy ($45), OXO Good Grips ($50). Glass carafe is key differentiator.",
        pricingPosition: "Competitive mid-range. Coffee audience spends freely on gear.",
        bestCreatorProfile: JSON.stringify({ niches: ["coffee", "food", "lifestyle"], platforms: ["tiktok", "instagram"], minFollowers: 10000 }),
      },
    };
    for (const p of PRODUCTS) {
      const snap = snapshotData[p.id] ?? {};
      db.insert(productIntelligenceSnapshots).values({
        id: `snap_${p.id}`,
        productId: p.id,
        version: 1,
        targetAudienceAnalysis: snap.targetAudienceAnalysis ?? null,
        contentAngles: snap.contentAngles ?? null,
        competitorLandscape: snap.competitorLandscape ?? null,
        pricingPosition: snap.pricingPosition ?? null,
        bestCreatorProfile: snap.bestCreatorProfile ?? null,
        source: "mock",
        createdAt: past(20),
      }).run();
    }
    console.log(`✅ Inserted ${PRODUCTS.length} intelligence snapshots.`);
  }

  // ── Creator Scores ──
  const existingScores = db.select().from(creatorScores).all();
  if (existingScores.length > 0) {
    console.log(`⏭  Creator scores already seeded. Skipping.`);
  } else {
    let count = 0;
    for (const p of PRODUCTS) {
      for (const c of CREATORS) {
        const scores = computeScore(c, p);
        db.insert(creatorScores).values({
          id: `score_${c.id}_${p.id}`,
          creatorId: c.id,
          productId: p.id,
          ...scores,
          scoringMethod: "formula",
          scoreNotes: "Formula mock score — replace with LLM in Phase 2B.",
          computedAt: past(15),
        }).run();
        count++;
      }
    }
    console.log(`✅ Inserted ${count} creator scores.`);
  }

  // ── Pipeline Items ──
  const existingPipeline = db.select().from(pipelineItems).all();
  if (existingPipeline.length > 0) {
    console.log(`⏭  Pipeline items already seeded. Skipping.`);
  } else {
    const pipes = [
      { id: "pipe_001", productId: "prod_001", creatorId: "cre_001", status: "Active", notes: "Running 30-day glow challenge campaign", proposedRate: 2500, agreedRate: 2200, priority: 1 },
      { id: "pipe_002", productId: "prod_001", creatorId: "cre_005", status: "Negotiating", notes: "YouTube review + IG reel. Awaiting rate confirmation.", proposedRate: 5000, agreedRate: null, priority: 2 },
      { id: "pipe_003", productId: "prod_002", creatorId: "cre_002", status: "Contacted", notes: "Sent outreach email. No reply yet.", proposedRate: 4000, agreedRate: null, priority: 1 },
      { id: "pipe_004", productId: "prod_002", creatorId: "cre_004", status: "Interested", notes: "Devon replied — wants product sample before committing.", proposedRate: 1200, agreedRate: null, priority: 2 },
      { id: "pipe_005", productId: "prod_003", creatorId: "cre_003", status: "New", notes: "Identified as high-fit via TikTok coffee content.", proposedRate: null, agreedRate: null, priority: 1 },
    ];
    for (const item of pipes) {
      db.insert(pipelineItems).values({
        ...item,
        agreedRate: item.agreedRate ?? null,
        proposedRate: item.proposedRate ?? null,
        createdAt: past(10),
        updatedAt: past(5),
      }).run();
    }
    console.log(`✅ Inserted ${pipes.length} pipeline items.`);
  }

  // ── Outreach Messages ──
  const existingMessages = db.select().from(outreachMessages).all();
  if (existingMessages.length > 0) {
    console.log(`⏭  Outreach messages already seeded. Skipping.`);
  } else {
    const msgs = [
      {
        id: "msg_001",
        pipelineItemId: "pipe_001",
        creatorId: "cre_001",
        productId: "prod_001",
        subject: "Partnership Opportunity — GlowDerm Serum",
        body: "Hi Aria! We love your skincare content and think GlowDerm would be a perfect fit. We'd love to send you a full product set and discuss a 30-day campaign.",
        channel: "email",
        direction: "outbound",
        status: "replied",
        sentAt: past(12),
      },
      {
        id: "msg_002",
        pipelineItemId: "pipe_003",
        creatorId: "cre_002",
        productId: "prod_002",
        subject: "FlexPro × MarcusFitLife — Collab?",
        body: "Hey Marcus — FlexPro just launched a new latex-free resistance band set. Interested in a review + workout integration?",
        channel: "email",
        direction: "outbound",
        status: "sent",
        sentAt: past(7),
      },
    ];
    for (const msg of msgs) {
      db.insert(outreachMessages).values({
        ...msg,
        createdAt: msg.sentAt,
        updatedAt: msg.sentAt,
      }).run();
    }
    console.log(`✅ Inserted ${msgs.length} outreach messages.`);
  }

  persistDb();
  console.log("\n🎉 Seed complete. Database persisted.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
