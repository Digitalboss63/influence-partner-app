import { Product } from "@/types/influencePartner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartnerTier = 1 | 2 | 3;
export type ConversionQuality = "High" | "Medium" | "Low";
export type DealType =
  | "Affiliate"
  | "JV Partner"
  | "Revenue Share"
  | "Strategic Referral";
export type AcquisitionDifficulty = "Easy" | "Medium" | "Hard";
export type RevenueOpportunity = "Low" | "Moderate" | "High" | "Exceptional";

export type PartnerBucket =
  | "Business & Productivity"
  | "Finance & Credit"
  | "Fitness & Wellness"
  | "Beauty & Lifestyle"
  | "Gaming & Tech"
  | "Community & Education";

export interface PartnerCategory {
  id: string;
  name: string;
  tier: PartnerTier;
  icon: string;
  whyFit: string;
  audienceAlignment: string;
  conversionQuality: ConversionQuality;
  recommendedCommission: string;
  outreachAngle: string;
  audienceMatchScore: number;
  buyingIntentScore: number;
  trustScore: number;
  bucket: PartnerBucket;
}

export interface DealStructureRec {
  type: DealType;
  why: string;
  recommendedCommission: string;
  expectedEffort: "Low" | "Medium" | "High";
  isBest: boolean;
}

export interface PartnerIntelligenceResult {
  topPartnerCategory: string;
  bestAudienceType: string;
  recommendedCommission: string;
  estimatedAcquisitionDifficulty: AcquisitionDifficulty;
  estimatedRevenueOpportunity: RevenueOpportunity;
  overallAudienceMatchScore: number;
  overallBuyingIntentScore: number;
  overallTrustScore: number;
  overallConversionPotential: number;
  partnerCategories: PartnerCategory[];
  dealStructures: DealStructureRec[];
}

// ─── Internal category definition ─────────────────────────────────────────────

interface CategoryDef {
  bestAudienceType: string;
  acquisitionDifficulty: AcquisitionDifficulty;
  revenueOpportunity: RevenueOpportunity;
  overallScores: { audienceMatch: number; buyingIntent: number; trust: number };
  deals: DealStructureRec[];
  categories: PartnerCategory[];
}

// ─── Category map ─────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, CategoryDef> = {
  Productivity: {
    bestAudienceType: "Remote workers and entrepreneurs actively investing in better workflows",
    acquisitionDifficulty: "Medium",
    revenueOpportunity: "High",
    overallScores: { audienceMatch: 88, buyingIntent: 84, trust: 90 },
    deals: [
      { type: "Revenue Share", isBest: true, recommendedCommission: "35–40%", expectedEffort: "Medium", why: "Productivity partners already recommend tools to their audience — ongoing rev share rewards consistent promotion and keeps them motivated long-term." },
      { type: "Affiliate", isBest: false, recommendedCommission: "35%", expectedEffort: "Low", why: "Low friction for creators who prefer a simple link — ideal for newsletter and community placements." },
      { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Deep integrations (webinars, co-created content) with top educators can unlock large warm audiences in a single campaign." },
      { type: "Strategic Referral", isBest: false, recommendedCommission: "30%", expectedEffort: "Low", why: "Great for agency networks where word-of-mouth referrals happen organically without active promotion." },
    ],
    categories: [
      { id: "course-creator", name: "Course Creator", tier: 1, icon: "🎓", bucket: "Business & Productivity", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 95, buyingIntentScore: 88, trustScore: 92, whyFit: "Students are actively investing in their growth and looking for tools to apply what they learn — your product becomes required viewing.", audienceAlignment: "Aspiring professionals who pay to improve and actively purchase recommended tools", outreachAngle: "Position your tool as the missing piece in their curriculum and offer to demo it live to their student community." },
      { id: "productivity-youtuber", name: "Productivity YouTuber", tier: 1, icon: "📹", bucket: "Business & Productivity", recommendedCommission: "37–40%", conversionQuality: "High", audienceMatchScore: 90, buyingIntentScore: 85, trustScore: 88, whyFit: "Real-workflow demonstrations create genuine demand — viewers see your tool solve a problem they recognise in their own life.", audienceAlignment: "Desk workers, freelancers, and remote teams looking for systems to reclaim their time", outreachAngle: "Pitch a sponsored 'My Favourite Tool for [use case]' segment with an exclusive deal code to drive trackable conversions." },
      { id: "business-educator", name: "Business Educator", tier: 1, icon: "💼", bucket: "Business & Productivity", recommendedCommission: "37%", conversionQuality: "High", audienceMatchScore: 88, buyingIntentScore: 83, trustScore: 89, whyFit: "Teaches systems and processes — your product fits naturally as a recommended implementation tool in their methodology.", audienceAlignment: "Entrepreneurs and team leads actively scaling their operations and open to buying tools that save time", outreachAngle: "Offer to be featured as a case study in their next 'how I run my business' content piece." },
      { id: "podcast-host-biz", name: "Business Podcast Host", tier: 2, icon: "🎙️", bucket: "Business & Productivity", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 82, buyingIntentScore: 76, trustScore: 84, whyFit: "Dedicated listeners trust their host's recommendations, delivering warm leads who are already pre-sold.", audienceAlignment: "Ambitious professionals who consume long-form content to improve their business skills", outreachAngle: "Sponsor a 60-second read with a free trial link — the host's name as the code creates accountability to promote it." },
      { id: "newsletter-writer-prod", name: "Newsletter Writer", tier: 2, icon: "📧", bucket: "Business & Productivity", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 78, trustScore: 86, whyFit: "Self-selected newsletter readers have high-quality attention — they opened on purpose, making them more receptive than passive social viewers.", audienceAlignment: "Curated audiences of professionals who pay for good information and act on what they read", outreachAngle: "Offer a co-promotion — their readers get an exclusive deal, they get a higher commission on the cohort." },
      { id: "community-owner-prod", name: "Community Owner", tier: 2, icon: "👥", bucket: "Community & Education", recommendedCommission: "30–35%", conversionQuality: "Medium", audienceMatchScore: 78, buyingIntentScore: 72, trustScore: 78, whyFit: "Direct access to groups of self-selected professionals who swap tool recommendations daily — peer validation drives faster adoption.", audienceAlignment: "Groups of like-minded professionals sharing workflows and systems with each other", outreachAngle: "Ask to post a live demo or AMA in their community — let members ask questions and let the tool sell itself." },
      { id: "freelancer-community", name: "Freelancer Community", tier: 3, icon: "🧑‍💻", bucket: "Community & Education", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 72, buyingIntentScore: 64, trustScore: 70, whyFit: "Large, tool-hungry communities where viral adoption is possible — volume can offset lower per-conversion rates.", audienceAlignment: "Independent workers who need affordable tools — volume over high-ticket conversion", outreachAngle: "Offer a special freelancer pricing tier and promote it through the community leader as a partner perk." },
      { id: "agency-network", name: "Agency Network", tier: 3, icon: "🏢", bucket: "Business & Productivity", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 70, buyingIntentScore: 68, trustScore: 68, whyFit: "Multiplier effect if agencies adopt the tool internally and recommend it to clients — one partner can bring dozens of users.", audienceAlignment: "Agency owners looking for tools to streamline delivery and impress clients", outreachAngle: "Pitch a white-label or team licence deal that makes the agency look good to their own clients." },
    ],
  },

  Tech: {
    bestAudienceType: "Developers, builders, and tech-savvy professionals evaluating new tools",
    acquisitionDifficulty: "Hard",
    revenueOpportunity: "High",
    overallScores: { audienceMatch: 87, buyingIntent: 82, trust: 89 },
    deals: [
      { type: "Revenue Share", isBest: true, recommendedCommission: "35–40%", expectedEffort: "Medium", why: "Tech audiences respond to honest, long-term endorsements — revenue share rewards creators for continued promotion as your product evolves." },
      { type: "Affiliate", isBest: false, recommendedCommission: "35%", expectedEffort: "Low", why: "Simple link tracking preferred by developer-focused creators who want transparency in their recommendations." },
      { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Deep integration partnerships with top educators can build enormous credibility fast." },
      { type: "Strategic Referral", isBest: false, recommendedCommission: "30%", expectedEffort: "Low", why: "Community leaders and tool curators can organically add your product to lists and directories with minimal active promotion." },
    ],
    categories: [
      { id: "course-creator-tech", name: "Course Creator", tier: 1, icon: "🎓", bucket: "Business & Productivity", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 94, buyingIntentScore: 86, trustScore: 92, whyFit: "Technical course students are the highest-intent buyers — they are learning to build something and need the right tools.", audienceAlignment: "Developers and builders who invest in upskilling and actively purchase tools in their learning path", outreachAngle: "Offer a free account for their students to use during the course — adoption drives future paid conversions." },
      { id: "developer-educator", name: "Developer Educator", tier: 1, icon: "👨‍💻", bucket: "Gaming & Tech", recommendedCommission: "38–40%", conversionQuality: "High", audienceMatchScore: 92, buyingIntentScore: 84, trustScore: 91, whyFit: "Highly technical audiences trust educators who can demonstrate real use cases — their recommendation carries the weight of peer review.", audienceAlignment: "Engineers and technical founders who rely on trusted educators to filter the noise of the tech landscape", outreachAngle: "Pitch a hands-on tutorial where they use your product to solve a real problem their audience faces." },
      { id: "productivity-youtuber-tech", name: "Tech Productivity YouTuber", tier: 1, icon: "📹", bucket: "Business & Productivity", recommendedCommission: "37%", conversionQuality: "High", audienceMatchScore: 88, buyingIntentScore: 82, trustScore: 87, whyFit: "Tool review and comparison videos drive enormous pre-purchase research traffic — being featured means capturing buyers at peak intent.", audienceAlignment: "Tech-literate professionals evaluating tools before committing — high research intent that converts when trust is established", outreachAngle: "Ask for a side-by-side comparison with their current favourite tool and let the product performance speak for itself." },
      { id: "tech-podcast", name: "Tech Podcast Host", tier: 2, icon: "🎙️", bucket: "Gaming & Tech", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 82, buyingIntentScore: 75, trustScore: 83, whyFit: "Long-form interviews let you explain complex value propositions in depth — ideal for technical products that need more than a 30-second pitch.", audienceAlignment: "Tech founders, engineers, and early adopters who listen to stay ahead of industry trends", outreachAngle: "Pitch a founder interview that doubles as a product demo — audiences trust founders who explain their own product with conviction." },
      { id: "tech-newsletter", name: "Tech Newsletter Writer", tier: 2, icon: "📧", bucket: "Business & Productivity", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 78, trustScore: 85, whyFit: "Curated tech newsletters have extremely high open rates and readers who act on tool recommendations from trusted curators.", audienceAlignment: "Developers and technical founders who subscribe to discover useful tools and stay current", outreachAngle: "Offer an exclusive deal for newsletter readers plus a 'deal of the week' feature slot with trackable attribution." },
      { id: "dev-community-owner", name: "Developer Community Owner", tier: 2, icon: "👥", bucket: "Community & Education", recommendedCommission: "30–35%", conversionQuality: "Medium", audienceMatchScore: 78, buyingIntentScore: 71, trustScore: 77, whyFit: "Developer communities debate and recommend tools constantly — a genuine recommendation is more powerful than a paid post.", audienceAlignment: "Groups of developers sharing code, tools, and learning resources with genuine peer-to-peer influence", outreachAngle: "Ask the owner to share an honest review and give them early access to features to make the review compelling." },
      { id: "tool-curator", name: "Tool Curator / Directory", tier: 3, icon: "🗂️", bucket: "Gaming & Tech", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 72, buyingIntentScore: 66, trustScore: 72, whyFit: "Directory listings drive passive long-tail discovery — not high volume but consistently generates qualified leads.", audienceAlignment: "Buyers researching specific tool categories who land on directories during their evaluation process", outreachAngle: "Offer a premium listing with a deal code attached for better click attribution." },
      { id: "agency-network-tech", name: "Dev Agency Network", tier: 3, icon: "🏢", bucket: "Business & Productivity", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 70, buyingIntentScore: 68, trustScore: 68, whyFit: "Agencies that adopt your tool internally become a powerful referral source by including it in client project recommendations.", audienceAlignment: "Development agencies evaluating tools to standardise their delivery workflow and recommend to clients", outreachAngle: "Offer an agency partner programme with team licences and a referral fee for every client they onboard." },
    ],
  },

  Finance: {
    bestAudienceType: "Motivated buyers in financial stress or transformation — peak purchase intent",
    acquisitionDifficulty: "Medium",
    revenueOpportunity: "Exceptional",
    overallScores: { audienceMatch: 92, buyingIntent: 90, trust: 85 },
    deals: [
      { type: "Strategic Referral", isBest: true, recommendedCommission: "35–40%", expectedEffort: "Medium", why: "Finance creators are bound by compliance concerns — a referral structure lets them recommend without appearing to 'sell', which their audiences respond better to." },
      { type: "Revenue Share", isBest: false, recommendedCommission: "35%", expectedEffort: "Medium", why: "Ongoing commissions motivate finance educators to keep your product in their content — especially valuable for recurring subscription products." },
      { type: "Affiliate", isBest: false, recommendedCommission: "35%", expectedEffort: "Low", why: "Clean trackable attribution — preferred by smaller finance creators who want to monetise without compliance risk." },
      { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Deep partnerships with top finance educators (webinars, co-authored guides) can convert their entire email list in a single launch." },
    ],
    categories: [
      { id: "personal-finance-educator", name: "Personal Finance Educator", tier: 1, icon: "💰", bucket: "Finance & Credit", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 96, buyingIntentScore: 90, trustScore: 88, whyFit: "Directly teaches the financial behaviours your product enables — audience alignment is near-perfect and buying intent is among the highest in any niche.", audienceAlignment: "Adults actively managing their money who trust educational content over advertising and invest in financial tools", outreachAngle: "Offer to sponsor a 'my favourite financial tools' episode — lead with the commission offer and genuine utility." },
      { id: "credit-coach", name: "Credit Coach", tier: 1, icon: "📊", bucket: "Finance & Credit", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 94, buyingIntentScore: 92, trustScore: 87, whyFit: "Clients are in active pain and highly motivated to pay for solutions — your product becomes a natural recommendation in their repair programme.", audienceAlignment: "People actively working on credit repair — maximum motivation and willingness to invest in the outcome", outreachAngle: "Position your product as the tool that helps their clients track and act on the advice they teach." },
      { id: "mortgage-coach", name: "Mortgage Coach", tier: 1, icon: "🏠", bucket: "Finance & Credit", recommendedCommission: "37–40%", conversionQuality: "High", audienceMatchScore: 92, buyingIntentScore: 94, trustScore: 85, whyFit: "Buyers at the mortgage stage are at the most financially motivated point in their lives — no other audience has higher urgency.", audienceAlignment: "First-time homebuyers navigating the loan process — prepared to invest in tools that protect a major financial decision", outreachAngle: "Pitch the product as a way to help their clients arrive at the mortgage consultation better prepared." },
      { id: "real-estate-educator", name: "Real Estate Educator", tier: 2, icon: "🏡", bucket: "Finance & Credit", recommendedCommission: "35–37%", conversionQuality: "Medium", audienceMatchScore: 85, buyingIntentScore: 82, trustScore: 81, whyFit: "Investment-minded audience with disposable income and high willingness to invest in tools that protect their financial position.", audienceAlignment: "Property investors and aspiring homeowners looking for tools to improve their financial decisions", outreachAngle: "Offer a free tool walkthrough showing how it helps their audience analyse deals or track financial goals." },
      { id: "debt-coach", name: "Debt Reduction Coach", tier: 2, icon: "📉", bucket: "Finance & Credit", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 88, buyingIntentScore: 90, trustScore: 82, whyFit: "Deeply motivated audience searching for any tool that helps them regain financial control — pain-driven buying makes conversion rates above average.", audienceAlignment: "People overwhelmed by debt who are actively seeking a plan and willing to spend to escape their situation", outreachAngle: "Show how your product helps visualise and accelerate their debt payoff plan — frame it as the co-pilot to their coaching programme." },
      { id: "investment-educator", name: "Investment Educator", tier: 2, icon: "📈", bucket: "Finance & Credit", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 78, trustScore: 83, whyFit: "Financially literate audience that understands ROI and is comfortable with recurring subscriptions — the least price-sensitive finance audience.", audienceAlignment: "Investors and high-earners who consume financial education to optimise returns — comfortable spending money on tools that prove their value", outreachAngle: "Lead with ROI framing — show time saved or mistakes avoided and let the numbers make the case." },
      { id: "biz-finance-podcast", name: "Business Finance Podcast", tier: 3, icon: "🎙️", bucket: "Finance & Credit", recommendedCommission: "30–35%", conversionQuality: "Low", audienceMatchScore: 72, buyingIntentScore: 68, trustScore: 75, whyFit: "Entrepreneur-focused financial content attracts business owners looking for tools — good fit if your product also serves the B2B or SMB market.", audienceAlignment: "Founders and business operators tracking cash flow and financial planning for their company", outreachAngle: "Pitch as a sponsor for an episode on financial tools for entrepreneurs — natural fit that doesn't feel forced." },
      { id: "tax-advisor-community", name: "Tax Advisor Community", tier: 3, icon: "🧾", bucket: "Finance & Credit", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 70, buyingIntentScore: 72, trustScore: 72, whyFit: "Year-round audience with financial tool needs, but seasonal engagement patterns can limit consistent promotion.", audienceAlignment: "Self-employed individuals and small business owners seeking to minimise their tax burden", outreachAngle: "Offer a 'tax season prep' collaboration where your product is positioned as the essential tool before they meet their advisor." },
    ],
  },

  Fitness: {
    bestAudienceType: "Health-motivated individuals actively investing in physical transformation",
    acquisitionDifficulty: "Easy",
    revenueOpportunity: "High",
    overallScores: { audienceMatch: 90, buyingIntent: 82, trust: 88 },
    deals: [
      { type: "Affiliate", isBest: true, recommendedCommission: "37–40%", expectedEffort: "Low", why: "Fitness creators have loyal audiences that follow supplement and tool recommendations closely — a simple affiliate link outperforms complex deal structures in this niche." },
      { type: "Revenue Share", isBest: false, recommendedCommission: "35%", expectedEffort: "Medium", why: "Ongoing rev share keeps fitness creators motivated to weave your product into regular content rather than a one-off mention." },
      { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Co-created fitness challenges featuring your product can drive enormous spikes in acquisition from a passionate, action-oriented audience." },
      { type: "Strategic Referral", isBest: false, recommendedCommission: "30%", expectedEffort: "Low", why: "Gym communities and personal trainers referring clients organically is a slow-burn but highly trusted conversion path." },
    ],
    categories: [
      { id: "fitness-coach", name: "Fitness Coach", tier: 1, icon: "💪", bucket: "Fitness & Wellness", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 95, buyingIntentScore: 85, trustScore: 92, whyFit: "Clients pay for results — your product fits naturally into a results-driven conversation where the coach's endorsement carries enormous authority.", audienceAlignment: "Fitness enthusiasts who follow coaches for accountability and trust their product recommendations as part of the transformation system", outreachAngle: "Offer your product as a free add-on to their coaching programme and let client results create authentic social proof." },
      { id: "wellness-educator-fit", name: "Wellness Educator", tier: 1, icon: "🌿", bucket: "Fitness & Wellness", recommendedCommission: "37–40%", conversionQuality: "High", audienceMatchScore: 90, buyingIntentScore: 82, trustScore: 88, whyFit: "Holistic audience actively seeking new tools and products to optimise their wellbeing — habitual buyers with strong brand loyalty once trust is earned.", audienceAlignment: "Health-conscious individuals who invest continuously in their wellness journey and are receptive to new product discoveries", outreachAngle: "Ask for inclusion in a 'my complete wellness stack' piece — curated personal recommendations outperform ads." },
      { id: "personal-trainer", name: "Personal Trainer", tier: 1, icon: "🏋️", bucket: "Fitness & Wellness", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 93, buyingIntentScore: 87, trustScore: 94, whyFit: "One-on-one client trust translates directly into product conversion — a trainer's recommendation is indistinguishable from a personal endorsement.", audienceAlignment: "Active clients with dedicated fitness goals who purchase products based on trainer-specific recommendations", outreachAngle: "Give trainers a personal affiliate code and let them recommend it conversationally during sessions." },
      { id: "nutrition-coach-fit", name: "Nutrition Coach", tier: 2, icon: "🥗", bucket: "Fitness & Wellness", recommendedCommission: "35–37%", conversionQuality: "Medium", audienceMatchScore: 84, buyingIntentScore: 80, trustScore: 84, whyFit: "Supplement and health-product-hungry audience with proven willingness to invest in anything that supports their fitness goals.", audienceAlignment: "Health optimisers who track macros and invest regularly in supplements and tools that support their nutritional goals", outreachAngle: "Sponsor a 'my supplement and tool stack' video — audiences in this niche have high product discovery intent." },
      { id: "alt-health-channel", name: "Alternative Health Channel", tier: 2, icon: "🌱", bucket: "Fitness & Wellness", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 78, buyingIntentScore: 76, trustScore: 80, whyFit: "Underserved niche with fierce loyalty and minimal competing sponsorships — lower barrier to partnership and highly engaged audiences.", audienceAlignment: "Individuals who have rejected mainstream approaches and invest in alternative wellness solutions", outreachAngle: "Emphasise the natural aspects of your product and let the creator frame it as an alternative to mainstream options." },
      { id: "yoga-instructor", name: "Yoga Instructor", tier: 2, icon: "🧘", bucket: "Fitness & Wellness", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 72, trustScore: 82, whyFit: "Values-driven audience — when a product aligns with their ethos, conversion is strong and word-of-mouth follow-through is excellent.", audienceAlignment: "Mindfulness-focused individuals with disposable income who invest in holistic health tools and wellness practices", outreachAngle: "Lead with shared values and community impact — yoga audiences convert on meaning and alignment, not features alone." },
      { id: "wellness-newsletter-fit", name: "Wellness Newsletter", tier: 3, icon: "📧", bucket: "Fitness & Wellness", recommendedCommission: "30–35%", conversionQuality: "Low", audienceMatchScore: 72, buyingIntentScore: 68, trustScore: 76, whyFit: "Engaged self-selected readers with lower volume but high intent per reader — ideal as a supplementary channel.", audienceAlignment: "Health-conscious readers who actively curate their information diet and take action on wellness tips", outreachAngle: "Offer an exclusive reader discount with a time limit — newsletter audiences respond very well to member-only deals." },
      { id: "health-community", name: "Health Community Owner", tier: 3, icon: "👥", bucket: "Community & Education", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 70, buyingIntentScore: 65, trustScore: 72, whyFit: "Groups of health-motivated members sharing recommendations organically — peer-to-peer validation can trigger viral adoption.", audienceAlignment: "Health enthusiasts who participate in wellness communities and trust peer recommendations over sponsored content", outreachAngle: "Ask the community leader to post an honest review and facilitate a live Q&A with the founder to build trust." },
    ],
  },

  Health: {
    bestAudienceType: "Health-conscious individuals seeking trusted, expert-backed wellness solutions",
    acquisitionDifficulty: "Easy",
    revenueOpportunity: "High",
    overallScores: { audienceMatch: 88, buyingIntent: 86, trust: 89 },
    deals: [
      { type: "Affiliate", isBest: true, recommendedCommission: "37–40%", expectedEffort: "Low", why: "Health audiences follow specific trusted voices — affiliate structures let creators recommend authentically without the appearance of a paid endorsement." },
      { type: "Revenue Share", isBest: false, recommendedCommission: "35%", expectedEffort: "Medium", why: "Ongoing revenue share keeps health educators motivated to continuously reference your product as part of their trusted stack." },
      { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Co-created health programmes featuring your product can drive mass adoption from a passionate, motivated audience." },
      { type: "Strategic Referral", isBest: false, recommendedCommission: "30%", expectedEffort: "Low", why: "Practitioner referrals — naturopaths, functional medicine coaches — carry exceptional trust weight and convert at high rates." },
    ],
    categories: [
      { id: "wellness-educator-health", name: "Wellness Educator", tier: 1, icon: "🌿", bucket: "Fitness & Wellness", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 93, buyingIntentScore: 87, trustScore: 91, whyFit: "Holistic health educators attract audiences who are already committed spenders on wellness — your product fits naturally into their programme.", audienceAlignment: "Health-conscious individuals who invest in both education and products to improve their wellbeing", outreachAngle: "Offer your product as a recommended tool within their educational content — let them teach how to use it to drive genuine adoption." },
      { id: "herbal-practitioner", name: "Herbal Practitioner", tier: 1, icon: "🌾", bucket: "Fitness & Wellness", recommendedCommission: "38–40%", conversionQuality: "High", audienceMatchScore: 90, buyingIntentScore: 85, trustScore: 93, whyFit: "Practitioner audiences view recommendations as prescriptions — the trust level is unmatched and conversion rates reflect it.", audienceAlignment: "Patients and students of holistic medicine who follow practitioner guidance closely and invest in recommended health tools", outreachAngle: "Offer a clinical or educational framing — position your product as something they would prescribe to their clients." },
      { id: "alt-health-channel-health", name: "Alternative Health Channel", tier: 1, icon: "🧬", bucket: "Fitness & Wellness", recommendedCommission: "37%", conversionQuality: "High", audienceMatchScore: 88, buyingIntentScore: 83, trustScore: 89, whyFit: "Low competition for sponsorships means your brand stands out — audiences in alternative health are highly receptive to new solutions.", audienceAlignment: "Individuals who have opted out of conventional medicine and actively seek natural, alternative approaches — deeply loyal to trusted creators", outreachAngle: "Emphasise what makes your product different from mainstream alternatives and let the creator speak to the natural angle." },
      { id: "nutrition-educator-health", name: "Nutrition Educator", tier: 2, icon: "🥗", bucket: "Fitness & Wellness", recommendedCommission: "35–37%", conversionQuality: "Medium", audienceMatchScore: 84, buyingIntentScore: 80, trustScore: 84, whyFit: "Food and supplement-focused audience with high product discovery intent and a track record of following educator recommendations.", audienceAlignment: "Health optimisers who track their nutritional intake and invest in tools and supplements that support their dietary goals", outreachAngle: "Sponsor a 'what I eat and use in a day' video that naturally integrates your product into a daily health routine." },
      { id: "mindfulness-instructor", name: "Mindfulness Instructor", tier: 2, icon: "🧘", bucket: "Fitness & Wellness", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 72, trustScore: 84, whyFit: "Mindful audiences buy products that align with their values — once trust is earned, they become long-term loyal customers.", audienceAlignment: "Mindfulness practitioners with a holistic lifestyle who invest in tools that support mental and physical wellbeing", outreachAngle: "Lead with the emotional and lifestyle alignment of your product — values-first pitches convert better in this segment." },
      { id: "health-podcast", name: "Health Podcast Host", tier: 2, icon: "🎙️", bucket: "Fitness & Wellness", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 78, buyingIntentScore: 74, trustScore: 80, whyFit: "Long-form podcast audiences form stronger parasocial relationships — their trust in recommendations is well above the social media average.", audienceAlignment: "Health enthusiasts who invest in education through audio and are receptive to expert-backed product recommendations", outreachAngle: "Pitch a founder interview where you explain the problem your product solves — health podcast audiences convert on story and authenticity." },
      { id: "wellness-newsletter-health", name: "Wellness Newsletter", tier: 3, icon: "📧", bucket: "Fitness & Wellness", recommendedCommission: "30–35%", conversionQuality: "Low", audienceMatchScore: 72, buyingIntentScore: 68, trustScore: 76, whyFit: "Niche wellness newsletters have extremely engaged readers — low volume but high conversion rate per reader.", audienceAlignment: "Curated wellness enthusiasts who proactively seek health content and take action on product recommendations", outreachAngle: "Offer an exclusive reader deal with a clear call to action and time limit." },
      { id: "health-community-health", name: "Health Community Owner", tier: 3, icon: "👥", bucket: "Community & Education", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 70, buyingIntentScore: 65, trustScore: 72, whyFit: "Organic peer recommendations in health communities drive meaningful word-of-mouth.", audienceAlignment: "Health community members who share experiences — peer trust exceeds influencer trust in these spaces", outreachAngle: "Give the community owner early access and let them share their experience authentically." },
    ],
  },

  Beauty: {
    bestAudienceType: "Beauty-conscious consumers with high product purchase frequency and brand loyalty",
    acquisitionDifficulty: "Easy",
    revenueOpportunity: "Moderate",
    overallScores: { audienceMatch: 85, buyingIntent: 80, trust: 86 },
    deals: [
      { type: "Affiliate", isBest: true, recommendedCommission: "37–40%", expectedEffort: "Low", why: "Beauty audiences buy based on visual demonstration — affiliate links with discount codes are the proven conversion mechanism in this niche." },
      { type: "Revenue Share", isBest: false, recommendedCommission: "35%", expectedEffort: "Medium", why: "Ongoing rev share encourages repeated product mentions, building the repetitive exposure that drives beauty product sales." },
      { type: "Strategic Referral", isBest: false, recommendedCommission: "30%", expectedEffort: "Low", why: "Community recommendations carry strong peer validation — ideal for products that benefit from word-of-mouth discovery." },
      { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Co-created product collections or exclusive limited editions can turn a creator's audience into a concentrated buying event." },
    ],
    categories: [
      { id: "beauty-educator", name: "Beauty Educator", tier: 1, icon: "💄", bucket: "Beauty & Lifestyle", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 94, buyingIntentScore: 86, trustScore: 90, whyFit: "Tutorial content creates direct purchase intent — viewers see the product in a real use case and convert at the highest rate in any beauty content format.", audienceAlignment: "Beauty enthusiasts who watch tutorials to learn techniques and actively seek the exact products used to replicate the results they see", outreachAngle: "Offer a dedicated tutorial featuring your product as the hero — viewers are pre-sold by the time the affiliate link appears." },
      { id: "skincare-expert", name: "Skincare Expert", tier: 1, icon: "✨", bucket: "Beauty & Lifestyle", recommendedCommission: "37–40%", conversionQuality: "High", audienceMatchScore: 92, buyingIntentScore: 84, trustScore: 93, whyFit: "Science-backed recommendations carry the weight of expert authority — audiences convert on ingredient explanations that untrained creators cannot make credibly.", audienceAlignment: "Skincare-focused consumers who research ingredients and seek expert-validated recommendations over trend-driven content", outreachAngle: "Give them a detailed product breakdown to review — audiences trust their analysis and convert based on ingredient-level endorsement." },
      { id: "lifestyle-blogger-beauty", name: "Lifestyle Blogger", tier: 1, icon: "🌸", bucket: "Beauty & Lifestyle", recommendedCommission: "37%", conversionQuality: "High", audienceMatchScore: 88, buyingIntentScore: 81, trustScore: 87, whyFit: "Broad lifestyle audiences with strong product affinity and consistent purchasing behaviour across beauty, fashion, and home categories.", audienceAlignment: "Style-conscious aspirational audiences with purchasing power who shop based on influencer lifestyle curation", outreachAngle: "Ask for a 'my current beauty favourites' feature — lifestyle audiences convert strongly on curated collection posts." },
      { id: "fashion-influencer", name: "Fashion Influencer", tier: 2, icon: "👗", bucket: "Beauty & Lifestyle", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 83, buyingIntentScore: 78, trustScore: 82, whyFit: "Style-forward audiences with disposable income overlap heavily with beauty buyers — cross-category conversion is well-documented.", audienceAlignment: "Fashion-conscious consumers who invest in their appearance across multiple categories", outreachAngle: "Position your product as the beauty complement to their fashion aesthetic — frame it as the missing piece in the complete look." },
      { id: "beauty-reviewer", name: "Beauty Product Reviewer", tier: 2, icon: "🔍", bucket: "Beauty & Lifestyle", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 82, trustScore: 80, whyFit: "Unboxing and review audiences are at peak buying intent during research — being featured as a recommended product converts viewers already in buying mode.", audienceAlignment: "Research-driven beauty consumers who watch reviews before purchasing and trust honest comparative content over brand advertising", outreachAngle: "Send a PR package with a personal note — authentic reviewer content outperforms scripted ads in this niche." },
      { id: "clean-beauty-community", name: "Clean Beauty Community", tier: 2, icon: "🌿", bucket: "Beauty & Lifestyle", recommendedCommission: "30–35%", conversionQuality: "Medium", audienceMatchScore: 78, buyingIntentScore: 74, trustScore: 79, whyFit: "Clean beauty audiences are actively looking for alternatives to conventional products — your brand can stand out simply by being there.", audienceAlignment: "Values-driven beauty consumers who prioritise clean, ethical ingredients over luxury brands", outreachAngle: "Lead with your product's clean credentials and ingredient transparency — these audiences respond to values alignment before features." },
      { id: "parenting-blogger", name: "Parenting Blogger", tier: 3, icon: "👶", bucket: "Beauty & Lifestyle", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 72, buyingIntentScore: 65, trustScore: 74, whyFit: "Family-focused audiences with lifestyle overlap — relevant if your product has a family or personal care angle beyond pure beauty.", audienceAlignment: "Parents with purchasing power who buy beauty and personal care products for the whole family", outreachAngle: "Frame the product for family use if applicable — parenting audiences convert on practical, family-relevant benefit messaging." },
      { id: "home-aesthetic-creator", name: "Home & Aesthetic Creator", tier: 3, icon: "🏡", bucket: "Beauty & Lifestyle", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 70, buyingIntentScore: 64, trustScore: 72, whyFit: "Aesthetic-driven audiences interested in beautiful environments are receptive to beauty and personal care products that fit their visual brand.", audienceAlignment: "Aspirational audiences with a strong sense of personal aesthetic who curate their surroundings", outreachAngle: "Position the product as a lifestyle object — lead with beautiful photography that fits their aesthetic." },
    ],
  },

  Gaming: {
    bestAudienceType: "Highly engaged gaming enthusiasts with strong brand loyalty and consistent spending habits",
    acquisitionDifficulty: "Easy",
    revenueOpportunity: "Moderate",
    overallScores: { audienceMatch: 80, buyingIntent: 78, trust: 82 },
    deals: [
      { type: "Affiliate", isBest: true, recommendedCommission: "37–40%", expectedEffort: "Low", why: "Gaming audiences are accustomed to affiliate codes and actively use them to support their favourite creators — the conversion mechanism is culturally embedded in the gaming community." },
      { type: "Revenue Share", isBest: false, recommendedCommission: "35%", expectedEffort: "Medium", why: "Ongoing revenue share incentivises gaming creators to keep mentioning your product naturally across streams and videos." },
      { type: "Strategic Referral", isBest: false, recommendedCommission: "30%", expectedEffort: "Low", why: "Community referrals in Discord servers and forums can drive viral organic adoption — peer trust is paramount in gaming." },
      { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Exclusive in-game items or co-branded content with top gaming creators can drive massive acquisition events." },
    ],
    categories: [
      { id: "gaming-streamer", name: "Gaming Streamer", tier: 1, icon: "🎮", bucket: "Gaming & Tech", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 94, buyingIntentScore: 84, trustScore: 88, whyFit: "Live audiences trust streamer recommendations in real-time — a single sponsored segment to 10K+ live viewers can drive explosive conversion.", audienceAlignment: "Dedicated gaming fans who watch their favourite streamers daily and are primed to support them through purchases", outreachAngle: "Offer a live sponsored segment with a real-time exclusive deal code — urgency of a live offer drives much higher conversion than pre-recorded ads." },
      { id: "game-review-channel", name: "Game Review Channel", tier: 1, icon: "⭐", bucket: "Gaming & Tech", recommendedCommission: "37–40%", conversionQuality: "High", audienceMatchScore: 90, buyingIntentScore: 86, trustScore: 85, whyFit: "Review audiences are at peak buying intent during the research phase — being featured means getting in front of buyers who are ready to purchase.", audienceAlignment: "Gamers doing pre-purchase research who watch reviews to validate their buying decision", outreachAngle: "Ask for an honest review in exchange for early access and a generous affiliate commission — authentic reviews outperform paid endorsements." },
      { id: "esports-creator", name: "Esports Creator", tier: 1, icon: "🏆", bucket: "Gaming & Tech", recommendedCommission: "37%", conversionQuality: "High", audienceMatchScore: 88, buyingIntentScore: 82, trustScore: 86, whyFit: "Competitive audiences invest heavily in anything that gives them an edge — tools used by pros carry enormous aspirational purchase motivation.", audienceAlignment: "Competitive gamers who spend on gaming gear and software associated with winning", outreachAngle: "Position your product as the pro player's choice — esports audiences aspire to match their idols' setups." },
      { id: "gaming-community-owner", name: "Gaming Community Owner", tier: 2, icon: "🎯", bucket: "Gaming & Tech", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 82, buyingIntentScore: 74, trustScore: 78, whyFit: "Discord servers and gaming forums generate authentic peer-to-peer recommendations that carry more weight than influencer content.", audienceAlignment: "Community-first gamers who trust peer recommendations and participate in group decisions on tools and products", outreachAngle: "Offer the community owner early access and ask them to post their honest experience — organic community adoption drives powerful word of mouth." },
      { id: "gaming-tech-reviewer", name: "Gaming Tech Reviewer", tier: 2, icon: "🖥️", bucket: "Gaming & Tech", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 78, trustScore: 80, whyFit: "Hardware and peripheral reviewers have audiences in an active research phase — if your product touches gaming hardware or software, this is high-converting territory.", audienceAlignment: "Gear-obsessed gamers actively researching before major purchases — they trust detailed technical assessments over aesthetic endorsements", outreachAngle: "Offer a technical deep-dive review with early access to new features — this audience values exclusivity and detailed information." },
      { id: "gaming-podcast", name: "Gaming Podcast", tier: 3, icon: "🎙️", bucket: "Gaming & Tech", recommendedCommission: "30–35%", conversionQuality: "Low", audienceMatchScore: 72, buyingIntentScore: 64, trustScore: 74, whyFit: "Core gaming fans engage deeply with podcast content but the format limits product demonstration — better for awareness than direct conversion.", audienceAlignment: "Dedicated gaming fans who consume long-form audio content about games and industry news", outreachAngle: "Sponsor a themed episode (e.g. 'best tools for gaming') rather than a generic ad read — topic alignment improves listener receptivity." },
      { id: "retro-gaming", name: "Retro Gaming Channel", tier: 3, icon: "🕹️", bucket: "Gaming & Tech", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 68, buyingIntentScore: 62, trustScore: 72, whyFit: "Passionate niche with extraordinary loyalty and word-of-mouth potential within a tight-knit community.", audienceAlignment: "Nostalgic gaming enthusiasts and collectors with strong purchase intent for niche products", outreachAngle: "Lead with nostalgia and community connection — this audience responds to authentic passion for their niche far more than polished advertising." },
    ],
  },

  Lifestyle: {
    bestAudienceType: "Aspirational consumers with broad interests and consistent product purchase behaviour",
    acquisitionDifficulty: "Easy",
    revenueOpportunity: "Moderate",
    overallScores: { audienceMatch: 82, buyingIntent: 75, trust: 80 },
    deals: [
      { type: "Revenue Share", isBest: true, recommendedCommission: "37–40%", expectedEffort: "Medium", why: "Lifestyle creators have deeply trusted audience relationships — ongoing revenue share rewards continuous authentic product integration rather than one-off posts." },
      { type: "Affiliate", isBest: false, recommendedCommission: "35%", expectedEffort: "Low", why: "Simple affiliate links fit naturally into lifestyle content — swipe-ups, story links, and description links are an established part of the format." },
      { type: "Strategic Referral", isBest: false, recommendedCommission: "30%", expectedEffort: "Low", why: "Community-driven audiences respond well to peer referral codes — unique codes per creator build accountability and track performance precisely." },
      { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Co-created lifestyle content can generate premium assets both the creator and your brand can repurpose extensively." },
    ],
    categories: [
      { id: "lifestyle-blogger", name: "Lifestyle Blogger", tier: 1, icon: "🌟", bucket: "Beauty & Lifestyle", recommendedCommission: "40%", conversionQuality: "High", audienceMatchScore: 92, buyingIntentScore: 80, trustScore: 88, whyFit: "Aspirational lifestyle audiences follow their favourite creators as a model for how to live — product recommendations are treated as personal advice from a trusted friend.", audienceAlignment: "Aspirational consumers who look to lifestyle creators as inspiration for their daily lives, purchases, and personal development choices", outreachAngle: "Ask for a 'day in my life' feature that naturally integrates your product — authentic lifestyle integration outperforms dedicated product posts." },
      { id: "community-owner-lifestyle", name: "Community Owner", tier: 1, icon: "👥", bucket: "Community & Education", recommendedCommission: "37%", conversionQuality: "High", audienceMatchScore: 86, buyingIntentScore: 76, trustScore: 84, whyFit: "Curated lifestyle communities contain self-selected members with strong shared values and mutual trust — peer recommendations convert at an above-average rate.", audienceAlignment: "Community members sharing lifestyle experiences, recommendations, and product discoveries with people who share identical values", outreachAngle: "Offer the community leader an exclusive deal for their members — giving something valuable is the fastest path to authentic group endorsement." },
      { id: "podcast-host-lifestyle", name: "Lifestyle Podcast Host", tier: 1, icon: "🎙️", bucket: "Community & Education", recommendedCommission: "37–40%", conversionQuality: "High", audienceMatchScore: 84, buyingIntentScore: 78, trustScore: 87, whyFit: "Intimate audio relationships create deep listener trust — podcast recommendations have the highest purchase follow-through of any content format.", audienceAlignment: "Lifestyle-curious listeners who turn to podcasts for inspiration and authentic product recommendations from hosts they admire", outreachAngle: "Pitch a host-read sponsorship where they share personal experience with your product — their voice and genuine endorsement is the conversion mechanism, not your script." },
      { id: "newsletter-writer-lifestyle", name: "Curated Newsletter Writer", tier: 2, icon: "📧", bucket: "Community & Education", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 76, trustScore: 85, whyFit: "Lifestyle newsletter audiences are self-selected highly engaged readers who open on purpose — their action rate consistently exceeds social media by 3–5x.", audienceAlignment: "Curated readers who subscribe to lifestyle newsletters to stay inspired and discover new products — intentional and ready to act on good recommendations", outreachAngle: "Offer a co-branded exclusive deal with a compelling narrative about why this product fits their lifestyle — narrative outperforms banner ads." },
      { id: "course-creator-lifestyle", name: "Lifestyle Course Creator", tier: 2, icon: "🎓", bucket: "Community & Education", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 78, buyingIntentScore: 74, trustScore: 82, whyFit: "Students investing in lifestyle transformation are in a purchasing mindset — they have already committed to change.", audienceAlignment: "Individuals who have invested in lifestyle transformation courses and are actively acquiring tools to support their personal development goals", outreachAngle: "Offer your product as a course resource — positioning within educational content dramatically increases credibility and conversion." },
      { id: "travel-creator", name: "Travel Creator", tier: 3, icon: "✈️", bucket: "Beauty & Lifestyle", recommendedCommission: "30–35%", conversionQuality: "Low", audienceMatchScore: 74, buyingIntentScore: 66, trustScore: 74, whyFit: "Wanderlust audiences overlap with lifestyle buyers when products are relevant to travel, home, or daily routines.", audienceAlignment: "Travel enthusiasts with disposable income who invest in experiences and products that enhance their lifestyle", outreachAngle: "Connect your product to the travel or home lifestyle aspect — placement in authentic travel content outperforms dedicated product posts." },
      { id: "food-home-creator", name: "Food & Home Creator", tier: 3, icon: "🍽️", bucket: "Beauty & Lifestyle", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 72, buyingIntentScore: 64, trustScore: 72, whyFit: "Home-based audiences with broad lifestyle receptivity — conversion depends on how well your product connects to food, kitchen, or home use cases.", audienceAlignment: "Home-focused audiences who invest in products that improve their daily domestic life", outreachAngle: "Find the home-use angle for your product and ask for a lifestyle integration in a 'what I use at home' style video." },
    ],
  },
};

// Alias: same data, different category name keys
CATEGORY_MAP.Other = {
  bestAudienceType: "Self-selected audiences with high purchase intent and trust in their content creators",
  acquisitionDifficulty: "Medium",
  revenueOpportunity: "Moderate",
  overallScores: { audienceMatch: 75, buyingIntent: 70, trust: 75 },
  deals: [
    { type: "Affiliate", isBest: true, recommendedCommission: "35–40%", expectedEffort: "Low", why: "A simple affiliate structure is the fastest path to getting partners started — low friction maximises the number of creators willing to try." },
    { type: "Revenue Share", isBest: false, recommendedCommission: "35%", expectedEffort: "Medium", why: "Ongoing revenue share creates long-term partner motivation to keep promoting and refining their approach." },
    { type: "Strategic Referral", isBest: false, recommendedCommission: "30%", expectedEffort: "Low", why: "Organic referrals from trusted community voices is the highest-quality lead source — invest in relationships before expecting consistent referrals." },
    { type: "JV Partner", isBest: false, recommendedCommission: "40%", expectedEffort: "High", why: "Deep co-creation partnerships take more time but generate the most durable distribution relationships." },
  ],
  categories: [
    { id: "community-owner-gen", name: "Community Owner", tier: 1, icon: "👥", bucket: "Community & Education", recommendedCommission: "37%", conversionQuality: "High", audienceMatchScore: 88, buyingIntentScore: 78, trustScore: 84, whyFit: "Community owners have the deepest trust with their members — a recommendation is treated as a peer endorsement, not an advertisement.", audienceAlignment: "Self-selected community members who actively seek tools and solutions recommended by people they respect", outreachAngle: "Offer the community owner a behind-the-scenes look at your product and let them share it as a discovery rather than a promotion." },
    { id: "course-creator-gen", name: "Course Creator", tier: 1, icon: "🎓", bucket: "Community & Education", recommendedCommission: "38–40%", conversionQuality: "High", audienceMatchScore: 84, buyingIntentScore: 80, trustScore: 88, whyFit: "Students who pay for courses are investment-minded and take action on what their educator recommends.", audienceAlignment: "Motivated learners who invest in courses and actively purchase tools that help them implement what they learn", outreachAngle: "Ask to be included in their course as a resource — contextual placement within education is the highest-trust endorsement available." },
    { id: "podcast-host-gen", name: "Podcast Host", tier: 1, icon: "🎙️", bucket: "Community & Education", recommendedCommission: "37%", conversionQuality: "High", audienceMatchScore: 82, buyingIntentScore: 74, trustScore: 86, whyFit: "Podcast listeners develop long-term parasocial relationships with hosts — recommendations feel like advice from a trusted friend.", audienceAlignment: "Dedicated listeners with a high trust baseline for their host's recommendations on tools, products, and services", outreachAngle: "Pitch a host-read ad where they share personal experience with your product — their authentic voice is the most effective ad format in podcasting." },
    { id: "newsletter-writer-gen", name: "Niche Newsletter Writer", tier: 2, icon: "📧", bucket: "Community & Education", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 80, buyingIntentScore: 76, trustScore: 83, whyFit: "Newsletter subscribers are among the highest-intent audiences online — they opted into consistent communication and are primed to receive product recommendations.", audienceAlignment: "Engaged newsletter readers who have self-selected into a specific topic and respond well to curated product discoveries", outreachAngle: "Offer an exclusive reader deal with a trackable code and a compelling story about why this product matters to their niche." },
    { id: "educator-gen", name: "Niche Educator", tier: 2, icon: "📚", bucket: "Community & Education", recommendedCommission: "35%", conversionQuality: "Medium", audienceMatchScore: 78, buyingIntentScore: 72, trustScore: 80, whyFit: "Educators in any niche build authority audiences who purchase based on pedagogical trust.", audienceAlignment: "Students and followers who invest in learning and are comfortable purchasing tools that help them apply what they are taught", outreachAngle: "Add value before asking for a commercial relationship — offer a free educational session or guest contribution to their content." },
    { id: "blogger-gen", name: "Niche Blogger", tier: 2, icon: "✍️", bucket: "Community & Education", recommendedCommission: "30–35%", conversionQuality: "Medium", audienceMatchScore: 74, buyingIntentScore: 68, trustScore: 76, whyFit: "SEO-driven blog traffic delivers buyers in active research mode — a 'best tools for X' feature can generate consistent long-tail discovery traffic.", audienceAlignment: "Researchers and buyers who find content through search — high-intent but lower relationship depth than social or email audiences", outreachAngle: "Offer a review product and trackable affiliate link — bloggers with high-ranking content can deliver consistent discovery traffic over time." },
    { id: "affiliate-network-gen", name: "Affiliate Network", tier: 3, icon: "🔗", bucket: "Community & Education", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 68, buyingIntentScore: 64, trustScore: 65, whyFit: "Broad distribution through affiliate networks can generate volume — useful for reaching audiences outside your primary creator relationships.", audienceAlignment: "Diverse buyers discovering products through comparison sites and affiliate network publishers", outreachAngle: "List on major affiliate platforms with a competitive commission rate — let the network supplement your direct creator partnerships." },
    { id: "review-site-gen", name: "Review Site", tier: 3, icon: "⭐", bucket: "Community & Education", recommendedCommission: "30%", conversionQuality: "Low", audienceMatchScore: 66, buyingIntentScore: 66, trustScore: 68, whyFit: "Review site traffic is purchase-intent driven — visitors arrive having already decided to buy something in your category.", audienceAlignment: "Informed buyers in the final evaluation stage who use review sites to make the final decision between competing products", outreachAngle: "Secure listings and encourage verified reviews — a strong review profile acts as passive 24/7 sales conversion infrastructure." },
  ],
};

// ─── Niche → Partner Bucket mapping (for CreatorDiscovery filter) ─────────────

export const NICHE_TO_PARTNER_BUCKET: Record<string, PartnerBucket[]> = {
  Tech: ["Business & Productivity", "Gaming & Tech"],
  Finance: ["Finance & Credit"],
  Fitness: ["Fitness & Wellness"],
  Health: ["Fitness & Wellness"],
  Lifestyle: ["Beauty & Lifestyle"],
  Beauty: ["Beauty & Lifestyle"],
  Gaming: ["Gaming & Tech"],
  Productivity: ["Business & Productivity"],
  Education: ["Community & Education", "Business & Productivity"],
  Food: ["Beauty & Lifestyle", "Community & Education"],
  Travel: ["Beauty & Lifestyle"],
  Parenting: ["Beauty & Lifestyle", "Community & Education"],
};

export const ALL_PARTNER_BUCKETS: PartnerBucket[] = [
  "Business & Productivity",
  "Finance & Credit",
  "Fitness & Wellness",
  "Beauty & Lifestyle",
  "Gaming & Tech",
  "Community & Education",
];

// ─── Main export ──────────────────────────────────────────────────────────────

export function generatePartnerIntelligence(
  product: Pick<Product, "name" | "category" | "description" | "targetCustomer" | "commissionOffer">,
): PartnerIntelligenceResult {
  const def = CATEGORY_MAP[product.category] ?? CATEGORY_MAP.Other;
  const { overallScores } = def;

  const overallConversionPotential = Math.round(
    overallScores.audienceMatch * 0.4 +
    overallScores.buyingIntent * 0.35 +
    overallScores.trust * 0.25,
  );

  const topCategory = def.categories.find((c) => c.tier === 1) ?? def.categories[0];

  return {
    topPartnerCategory: topCategory?.name ?? "Course Creator",
    bestAudienceType: def.bestAudienceType,
    recommendedCommission: topCategory?.recommendedCommission ?? "35–40%",
    estimatedAcquisitionDifficulty: def.acquisitionDifficulty,
    estimatedRevenueOpportunity: def.revenueOpportunity,
    overallAudienceMatchScore: overallScores.audienceMatch,
    overallBuyingIntentScore: overallScores.buyingIntent,
    overallTrustScore: overallScores.trust,
    overallConversionPotential,
    partnerCategories: def.categories,
    dealStructures: def.deals,
  };
}
