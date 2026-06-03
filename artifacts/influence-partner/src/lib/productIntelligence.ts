import { ProductForm, Platform } from "@/types/influencePartner";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MarketDifficulty = "Low" | "Medium" | "High" | "Very High";
export type CompetitionLevel = "Fragmented" | "Moderate" | "Competitive" | "Saturated";
export type CampaignOpportunityRating = "Exceptional" | "Strong" | "Moderate" | "Weak";

export interface BuyerPersona {
  age: string;
  gender: string;
  interests: string[];
  painPoints: string[];
  platforms: Platform[];
}

export interface CreatorCategoryRec {
  category: string;
  reason: string;
  fitLevel: "Primary" | "Secondary" | "Tertiary";
}

export interface ProductIntelligence {
  // Market positioning
  mainMarket: string;
  subMarket: string;
  buyerPersona: BuyerPersona;
  // Creator targeting
  recommendedCreatorCategories: CreatorCategoryRec[];
  recommendedPlatforms: Platform[];
  recommendedCommissionRange: string;
  // Strategy
  outreachAngle: string;
  whyTheseCreators: string;
  // Market assessment
  marketDifficulty: MarketDifficulty;
  marketDifficultyReason: string;
  competitionLevel: CompetitionLevel;
  competitionReason: string;
  campaignOpportunityRating: CampaignOpportunityRating;
  campaignOpportunityReason: string;
  // Revenue
  revenuePotentialLabel: string;
  revenuePotentialMonthly: string;
  revenuePotentialReason: string;
  estimatedPartnerAcquisitionPotential: string;
  partnerAcquisitionReason: string;
  // Sub/main niche (kept for backward compat)
  mainNiche: string;
  subNiches: string[];
  idealCreatorTypes: string[];
  suggestedOutreachAngle: string;
}

// ─── Lookup tables keyed by category ─────────────────────────────────────────

type CategoryKey =
  | "Productivity"
  | "Fitness"
  | "Finance"
  | "Tech"
  | "Health"
  | "Beauty"
  | "Gaming"
  | "Lifestyle"
  | "Other";

const CATEGORY_INTELLIGENCE: Record<
  CategoryKey,
  Omit<
    ProductIntelligence,
    | "mainNiche"
    | "subNiches"
    | "idealCreatorTypes"
    | "suggestedOutreachAngle"
    | "outreachAngle"
    | "recommendedCommissionRange"
    | "whyTheseCreators"
    | "revenuePotentialMonthly"
    | "revenuePotentialReason"
    | "estimatedPartnerAcquisitionPotential"
    | "partnerAcquisitionReason"
    | "revenuePotentialLabel"
  >
> = {
  Productivity: {
    mainMarket: "B2C / B2SMB SaaS — Productivity & Workflow",
    subMarket: "Remote Work Tools · Task Automation · Time Tracking",
    buyerPersona: {
      age: "25–40",
      gender: "60% male / 40% female",
      interests: ["Remote work", "Notion/Obsidian", "Side hustles", "GTD methodology"],
      painPoints: ["Too many tools", "Context switching", "Losing hours to admin", "Missed deadlines"],
      platforms: ["YouTube", "TikTok"],
    },
    recommendedCreatorCategories: [
      { category: "Productivity / Workflow", reason: "Direct audience overlap — their followers actively seek better tools", fitLevel: "Primary" },
      { category: "Tech Reviews", reason: "High-intent buyers who evaluate and adopt SaaS rapidly", fitLevel: "Primary" },
      { category: "Entrepreneurship / Side Hustle", reason: "Aspirational buyers who invest in efficiency", fitLevel: "Secondary" },
      { category: "Career & Business Growth", reason: "Professionals seeking competitive edge", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["YouTube", "TikTok"],
    marketDifficulty: "Medium",
    marketDifficultyReason: "Established players (Notion, Asana, Monday) compete hard but creator channels are underused — white space exists.",
    competitionLevel: "Competitive",
    competitionReason: "Dozens of SaaS tools compete for the same creators. Winning requires a premium commission and a specific angle.",
    campaignOpportunityRating: "Strong",
    campaignOpportunityReason: "Productivity YouTubers have highly convertible audiences. Long-form reviews drive consistent subscription sign-ups.",
  },
  Fitness: {
    mainMarket: "D2C / B2C Health & Fitness Apps",
    subMarket: "Digital Coaching · Workout Tracking · Nutrition",
    buyerPersona: {
      age: "18–35",
      gender: "55% female / 45% male",
      interests: ["Home workouts", "Nutrition hacks", "Body transformation", "Athletic performance"],
      painPoints: ["Expensive personal trainers", "Lack of accountability", "Confusing nutrition advice", "No personalisation"],
      platforms: ["TikTok", "Instagram"],
    },
    recommendedCreatorCategories: [
      { category: "Fitness / Workout", reason: "Immediate audience alignment — followers trust product recommendations", fitLevel: "Primary" },
      { category: "Nutrition / Wellness", reason: "Complementary audience seeking holistic health solutions", fitLevel: "Primary" },
      { category: "Lifestyle / Health", reason: "Broad-appeal crossover with aspiration to 'healthy living'", fitLevel: "Secondary" },
      { category: "Women's Empowerment", reason: "Strong female buyer segment converts well on fitness subscriptions", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["TikTok", "Instagram"],
    marketDifficulty: "High",
    marketDifficultyReason: "Extremely crowded — MyFitnessPal, Peloton, Nike Training all sponsor creators heavily. Differentiation is essential.",
    competitionLevel: "Saturated",
    competitionReason: "Most mid-tier fitness creators already have at least one sponsored app. You must out-commission or offer exclusivity.",
    campaignOpportunityRating: "Strong",
    campaignOpportunityReason: "Micro fitness creators (under 100K) convert at 2–4× the rate of mega influencers. Huge ROI potential here.",
  },
  Finance: {
    mainMarket: "Fintech / Personal Finance Apps",
    subMarket: "Investment Tracking · Budgeting · Wealth Management",
    buyerPersona: {
      age: "22–38",
      gender: "65% male / 35% female",
      interests: ["Investing", "FIRE movement", "Crypto", "Side income streams"],
      painPoints: ["Fragmented financial data", "Poor investment visibility", "No easy budgeting tool", "Fear of missing opportunities"],
      platforms: ["YouTube", "Instagram"],
    },
    recommendedCreatorCategories: [
      { category: "Personal Finance / Investing", reason: "Direct buyers who actively seek tools to manage money better", fitLevel: "Primary" },
      { category: "Entrepreneurship / Business", reason: "Founders and solopreneurs who need financial oversight", fitLevel: "Primary" },
      { category: "Crypto / Web3", reason: "Tech-forward investors who quickly adopt new financial tools", fitLevel: "Secondary" },
      { category: "Career & Salary Growth", reason: "Aspiring wealth-builders entering the investing market", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["YouTube", "Instagram"],
    marketDifficulty: "High",
    marketDifficultyReason: "Regulated category attracts well-funded competitors. Finance creators are frequently courted — expect bidding wars.",
    competitionLevel: "Competitive",
    competitionReason: "Wealthfront, Robinhood, Coinbase all spend heavily on creator partnerships. You need a clear commission advantage.",
    campaignOpportunityRating: "Exceptional",
    campaignOpportunityReason: "Finance audiences have the highest disposable income and lowest churn of any SaaS vertical. LTV is exceptional.",
  },
  Tech: {
    mainMarket: "B2C / B2SMB Tech Tools & SaaS",
    subMarket: "Developer Tools · Automation · AI Assistants",
    buyerPersona: {
      age: "20–38",
      gender: "70% male / 30% female",
      interests: ["AI tools", "Automation", "Dev workflows", "Gadgets & apps"],
      painPoints: ["Information overload", "Tool fatigue", "Wasted engineering time", "Lack of AI adoption"],
      platforms: ["YouTube", "TikTok"],
    },
    recommendedCreatorCategories: [
      { category: "Tech Reviews / AI Tools", reason: "Early adopters who drive viral adoption of new software", fitLevel: "Primary" },
      { category: "Developer / Coding", reason: "Builders who integrate tools and influence their teams", fitLevel: "Primary" },
      { category: "Productivity / Workflow", reason: "Power users who curate tool stacks for their audiences", fitLevel: "Secondary" },
      { category: "Entrepreneurship / Startups", reason: "Founders who recommend tools to their teams and networks", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["YouTube", "TikTok"],
    marketDifficulty: "Medium",
    marketDifficultyReason: "Tech channels grow fast and audiences are receptive to new tools. However, trust is earned through demonstrations, not ads.",
    competitionLevel: "Moderate",
    competitionReason: "AI wave is opening up new creator channels faster than sponsors can fill them. Good timing for partnerships.",
    campaignOpportunityRating: "Exceptional",
    campaignOpportunityReason: "Tech creators with 50–500K followers have the highest conversion rates for SaaS products — often 5–8%.",
  },
  Health: {
    mainMarket: "D2C Health & Wellness",
    subMarket: "Mental Health · Sleep · Longevity",
    buyerPersona: {
      age: "28–45",
      gender: "55% female / 45% male",
      interests: ["Biohacking", "Mindfulness", "Preventative health", "Sleep optimisation"],
      painPoints: ["Burnout", "Poor sleep", "Anxiety & stress", "Lack of health accountability"],
      platforms: ["YouTube", "Instagram"],
    },
    recommendedCreatorCategories: [
      { category: "Health & Wellness", reason: "Trust-based audience that acts on personal health recommendations", fitLevel: "Primary" },
      { category: "Mindfulness / Meditation", reason: "Highly engaged niche with strong subscription intent", fitLevel: "Primary" },
      { category: "Fitness / Nutrition", reason: "Adjacent audience already investing in their health journey", fitLevel: "Secondary" },
      { category: "Productivity / Biohacking", reason: "Tech-savvy health optimisers open to new tracking apps", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["YouTube", "Instagram"],
    marketDifficulty: "Medium",
    marketDifficultyReason: "Wellness is exploding post-pandemic. New niches like sleep tracking and longevity are underserved by sponsors.",
    competitionLevel: "Moderate",
    competitionReason: "Opportunity to own a niche before larger health brands arrive with bigger budgets.",
    campaignOpportunityRating: "Strong",
    campaignOpportunityReason: "Health audiences have strong repeat purchase behaviour and high LTV, making commissions extremely attractive.",
  },
  Beauty: {
    mainMarket: "D2C Beauty & Personal Care",
    subMarket: "Skincare · Cosmetics · Haircare",
    buyerPersona: {
      age: "18–32",
      gender: "85% female / 15% male",
      interests: ["Skincare routines", "Makeup tutorials", "Clean beauty", "Aesthetic lifestyle"],
      painPoints: ["Finding trustworthy recommendations", "Product overwhelm", "Skin concerns", "Budget constraints"],
      platforms: ["TikTok", "Instagram"],
    },
    recommendedCreatorCategories: [
      { category: "Beauty / Skincare", reason: "Direct category match with highest purchase intent", fitLevel: "Primary" },
      { category: "Lifestyle / Fashion", reason: "Strong crossover — beauty is a core lifestyle category", fitLevel: "Primary" },
      { category: "Health & Wellness", reason: "Clean beauty and wellness audiences overlap heavily", fitLevel: "Secondary" },
      { category: "GRWM / Vlogging", reason: "Product placement in daily routine content converts authentically", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["TikTok", "Instagram"],
    marketDifficulty: "Very High",
    marketDifficultyReason: "L'Oreal, Sephora, and indie brands all spend aggressively on beauty creators. Differentiation through commission is key.",
    competitionLevel: "Saturated",
    competitionReason: "Nearly every beauty creator has multiple sponsors. Consider exclusivity windows and performance bonuses to stand out.",
    campaignOpportunityRating: "Moderate",
    campaignOpportunityReason: "Beauty converts well on TikTok with viral content but churn is high. Focus on micro-creators with loyal communities.",
  },
  Gaming: {
    mainMarket: "B2C Gaming & Entertainment",
    subMarket: "PC Gaming · Mobile Games · Gaming Gear",
    buyerPersona: {
      age: "16–30",
      gender: "75% male / 25% female",
      interests: ["Competitive gaming", "Streaming", "Gaming hardware", "Esports"],
      painPoints: ["Lag and performance issues", "Expensive gear", "Finding good teammates", "Improving skills"],
      platforms: ["YouTube", "TikTok"],
    },
    recommendedCreatorCategories: [
      { category: "Gaming / Esports", reason: "Core audience with highest engagement in the vertical", fitLevel: "Primary" },
      { category: "Tech Reviews", reason: "Hardware-focused audience open to performance products", fitLevel: "Secondary" },
      { category: "Streaming / Content Creation", reason: "Meta-audience of aspiring creators and streamers", fitLevel: "Tertiary" },
      { category: "Lifestyle / Entertainment", reason: "Casual gamers who consume gaming-adjacent content", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["YouTube", "TikTok"],
    marketDifficulty: "High",
    marketDifficultyReason: "Gaming is dominated by Twitch/YouTube deals with major publishers. Indie products must offer unique creator value.",
    competitionLevel: "Competitive",
    competitionReason: "Top gaming creators are locked in long-term deals. Target mid-tier creators 50K–500K for best ROI.",
    campaignOpportunityRating: "Moderate",
    campaignOpportunityReason: "Gaming audiences are large but conversion on SaaS/non-gaming products is lower. Best for gaming-specific tools.",
  },
  Lifestyle: {
    mainMarket: "D2C Lifestyle & Consumer Apps",
    subMarket: "Daily Habits · Travel · Personal Development",
    buyerPersona: {
      age: "22–38",
      gender: "60% female / 40% male",
      interests: ["Travel", "Aesthetics", "Self-improvement", "Minimalism"],
      painPoints: ["Lack of direction", "Overwhelming choices", "Work-life balance", "Finding community"],
      platforms: ["Instagram", "TikTok"],
    },
    recommendedCreatorCategories: [
      { category: "Lifestyle / Vlogging", reason: "Aspirational audiences that adopt products matching their ideal self-image", fitLevel: "Primary" },
      { category: "Personal Development", reason: "Growth-mindset audience willing to invest in tools that improve their life", fitLevel: "Primary" },
      { category: "Travel / Nomad", reason: "Independently-minded buyers who discover new products through creators", fitLevel: "Secondary" },
      { category: "Minimalism / Simplicity", reason: "Curated-lifestyle audience values quality recommendations over quantity", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["Instagram", "TikTok"],
    marketDifficulty: "Medium",
    marketDifficultyReason: "Lifestyle is broad, meaning less direct competition per creator but harder to achieve precise targeting.",
    competitionLevel: "Moderate",
    competitionReason: "Lifestyle creators spread sponsorships across many verticals — your product can stand out with the right angle.",
    campaignOpportunityRating: "Moderate",
    campaignOpportunityReason: "Lifestyle conversions are lower but brand equity built through these channels compounds over time.",
  },
  Other: {
    mainMarket: "Consumer / SMB Market",
    subMarket: "Digital Products · Online Services",
    buyerPersona: {
      age: "25–42",
      gender: "50% male / 50% female",
      interests: ["Digital tools", "Online business", "Learning"],
      painPoints: ["Finding reliable tools", "Complexity", "Lack of value"],
      platforms: ["YouTube", "Instagram"],
    },
    recommendedCreatorCategories: [
      { category: "Business / Entrepreneurship", reason: "Broad-appeal audience open to digital tools", fitLevel: "Primary" },
      { category: "Education / How-To", reason: "Highly engaged learners who trust expert recommendations", fitLevel: "Secondary" },
      { category: "Technology", reason: "Early adopters who influence peers", fitLevel: "Tertiary" },
      { category: "Lifestyle", reason: "Wide reach for general consumer products", fitLevel: "Tertiary" },
    ],
    recommendedPlatforms: ["YouTube", "Instagram"],
    marketDifficulty: "Medium",
    marketDifficultyReason: "Highly depends on niche specifics. Focus on categories with under-served creator audiences.",
    competitionLevel: "Moderate",
    competitionReason: "General digital products have moderate competition. Narrow your targeting for best results.",
    campaignOpportunityRating: "Moderate",
    campaignOpportunityReason: "Opportunity scales with how well you match creators to product use cases.",
  },
};

// ─── Revenue helpers ──────────────────────────────────────────────────────────

function parseMonthlyPrice(priceStr: string): number {
  const match = priceStr.match(/\d+(\.\d+)?/);
  if (!match) return 49;
  const n = parseFloat(match[0]);
  if (priceStr.toLowerCase().includes("/yr") || priceStr.toLowerCase().includes("year")) {
    return Math.round(n / 12);
  }
  return n;
}

function revenueLabel(monthly: number): string {
  if (monthly >= 50_000) return "Very High";
  if (monthly >= 20_000) return "High";
  if (monthly >= 8_000) return "Medium";
  return "Emerging";
}

// ─── Main function ────────────────────────────────────────────────────────────

export function generateProductIntelligence(data: ProductForm): ProductIntelligence {
  const key = (data.category as CategoryKey) in CATEGORY_INTELLIGENCE
    ? (data.category as CategoryKey)
    : "Other";

  const base = CATEGORY_INTELLIGENCE[key];
  const pricePerMonth = parseMonthlyPrice(data.price);
  const commLow = Math.max(data.commissionOffer - 5, 20);
  const commHigh = data.commissionOffer;

  // Revenue estimate: 8 mid-tier partners × assumed avg conversions
  const avgMonthlyConversions = 45;
  const partnersEstimate = 8;
  const monthlyRevenue = Math.round(avgMonthlyConversions * partnersEstimate * pricePerMonth);
  const partnerAcquisitionPotential = pricePerMonth >= 50
    ? "12–20 qualified partners within 90 days"
    : pricePerMonth >= 25
    ? "8–14 qualified partners within 90 days"
    : "5–10 qualified partners within 90 days";

  const partnerReason = pricePerMonth >= 50
    ? `At ${data.price}, creators earn meaningful commissions per referral. High-ticket SaaS attracts quality partners who promote actively.`
    : `${data.price} pricing is accessible to a large buyer pool. Micro-creators especially thrive with affordable recurring products.`;

  return {
    ...base,
    mainNiche: base.mainMarket.split("—")[1]?.trim() ?? data.category,
    subNiches: base.subMarket.split("·").map((s) => s.trim()),
    idealCreatorTypes: ["Micro", "Mid-Tier"],
    suggestedOutreachAngle: `Lead with how ${data.name} helps ${data.targetCustomer} to ${data.mainBenefit}. Emphasise the ${commHigh}% commission — 3–4× what most brands offer.`,
    outreachAngle: `Lead with the outcome, not the product. Show ${data.targetCustomer} achieving "${data.mainBenefit}" because of ${data.name}. Let the creator personalise the story — give them key proof points and a generous commission (${commHigh}%) to stay motivated.`,
    recommendedCommissionRange: `${commLow}–${commHigh}%`,
    whyTheseCreators: `${base.recommendedCreatorCategories[0].category} creators were chosen because their audiences already exhibit buying intent for products like ${data.name}. They've built trust in this space — a recommendation from them carries far more weight than a paid ad. With a ${commHigh}% commission, they have genuine financial incentive to promote actively and authentically.`,
    revenuePotentialLabel: revenueLabel(monthlyRevenue),
    revenuePotentialMonthly: `$${monthlyRevenue.toLocaleString()}/mo`,
    revenuePotentialReason: `Based on ${partnersEstimate} active partners averaging ${avgMonthlyConversions} conversions/mo at ${data.price}. Scales linearly as you recruit more creators.`,
    estimatedPartnerAcquisitionPotential: partnerAcquisitionPotential,
    partnerAcquisitionReason: partnerReason,
  };
}
