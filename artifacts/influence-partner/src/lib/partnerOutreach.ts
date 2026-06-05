import { Product } from "@/types/influencePartner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutreachPlanMessages {
  whySelected: string;
  offerAngle: string;
  followUpTiming: string;
  cta: string;
  firstEmail: string;
  dm: string;
  followUp1: string;
  followUp2: string;
  objectionResponse: string;
}

/** Legacy research context — kept for backward compatibility */
export interface ResearchContext {
  targetName: string;
  company: string | null;
  platform: string | null;
  audienceSize: string | null;
  contentAngle: string | null;
  notes: string | null;
  website: string | null;
  socialUrl: string | null;
}

/** Full intelligence context aggregated from all platform sources */
export interface OutreachIntelligenceContext {
  // ── Creator / Target ───────────────────────────────────────────────────────
  targetName: string;
  company: string | null;
  platform: string | null;
  partnerCategory: string;
  website: string | null;
  socialUrl: string | null;
  // ── Manual research notes ──────────────────────────────────────────────────
  audienceSize: string | null;
  contentAngle: string | null;
  notes: string | null;
  // ── Product intelligence ───────────────────────────────────────────────────
  productName: string;
  productCategory: string;
  productSummary: string;
  productBenefits: string;
  productMarket: string | null;
  productOutreachAngle: string | null;
  // ── Partner strategy ───────────────────────────────────────────────────────
  partnerStrategySummary: string | null;
  recommendedDealType: string | null;
  strategyOutreachAngle: string | null;
  // ── Qualification engine ───────────────────────────────────────────────────
  partnerFitScore: number | null;
  qualificationLabel: string | null;
  qualificationReasons: string[] | null;
  hardFlags: string[] | null;
  nextBestAction: string | null;
  // ── Contact intelligence ───────────────────────────────────────────────────
  contactReadinessScore: number | null;
  preferredContactMethod: string | null;
  businessEmail: string | null;
  // ── Outreach history ───────────────────────────────────────────────────────
  priorOutreachCount: number;
  priorOutreachStatuses: string[];
  lastOutreachDate: string | null;
  // ── Discovery / YouTube ────────────────────────────────────────────────────
  latestVideoTitle: string | null;
  latestVideoDate: string | null;
}

export interface QualityCheckItem {
  label: string;
  done: boolean;
  category: "product" | "creator" | "qualification" | "contact" | "strategy";
}

export interface ResearchUtilizationScore {
  total: number;
  productContext: number;
  creatorContext: number;
  qualificationContext: number;
  contactContext: number;
  strategyContext: number;
  checklist: QualityCheckItem[];
}

type PartnerFamily =
  | "educator"
  | "podcaster"
  | "newsletter"
  | "community"
  | "financial"
  | "reviewer"
  | "fitness"
  | "lifestyle"
  | "default";

// ─── Family detection ─────────────────────────────────────────────────────────

function detectFamily(partnerType: string): PartnerFamily {
  const t = partnerType.toLowerCase();
  if (t.includes("course") || t.includes("educator") || t.includes("teacher") || t.includes("training")) return "educator";
  if (t.includes("podcast") || t.includes("show host")) return "podcaster";
  if (t.includes("newsletter") || t.includes("email list") || t.includes("substack")) return "newsletter";
  if (t.includes("community") || t.includes("group") || t.includes("tribe") || t.includes("member")) return "community";
  if (t.includes("financial") || t.includes("mortgage") || t.includes("credit") || t.includes("accounting") || t.includes("budget") || t.includes("wealth") || t.includes("money") || t.includes("finance")) return "financial";
  if (t.includes("youtube") || t.includes("reviewer") || t.includes("review") || t.includes("channel") || t.includes("streamer")) return "reviewer";
  if (t.includes("fitness") || t.includes("trainer") || t.includes("nutrition") || t.includes("gym") || t.includes("health") || t.includes("wellness") || t.includes("supplement")) return "fitness";
  if (t.includes("lifestyle") || t.includes("vlogger") || t.includes("influencer") || t.includes("blogger")) return "lifestyle";
  return "default";
}

// ─── Per-family hooks ─────────────────────────────────────────────────────────

interface FamilyHook {
  whyTemplate: (partnerType: string, product: Product) => string;
  socialProof: (product: Product) => string;
  followUpTiming: string;
  ctaText: string;
}

const FAMILY_HOOKS: Record<PartnerFamily, FamilyHook> = {
  educator: {
    whyTemplate: (pt, p) =>
      `${pt}s have audiences that are actively investing in learning and implementation. Your students are already spending money on tools to improve their results — ${p.name} fits naturally into what they're already buying. A recommendation from you carries the weight of a trusted mentor, not an ad, which means your conversion rate will be significantly higher than a typical influencer partnership.`,
    socialProof: (p) =>
      `One of our current course creator partners drove 47 sales in their first month from a single mention inside their members' area — no discount code, no hard sell, just a genuine recommendation.`,
    followUpTiming: "Follow up 4–5 days after initial contact, then again at 9–10 days.",
    ctaText: "Would you be open to a quick 5-minute call to see if there's a mutual fit?",
  },
  podcaster: {
    whyTemplate: (pt, p) =>
      `${pt}s build deep, earned trust with listeners who tune in episode after episode. A single genuine mention can outperform a month of banner advertising. ${p.name} is the kind of product your audience is already looking for — you'd be doing them a favour by sharing it, and earning a meaningful commission in the process.`,
    socialProof: (p) =>
      `One of our podcast partners saw a 6.2% conversion rate from a single 60-second mid-roll mention — no discounts, no gimmicks, just the right product in front of the right audience.`,
    followUpTiming: "Follow up 5–6 days after initial contact, then again at 11–12 days.",
    ctaText: "Happy to send a full info pack if that would make it easier — just say the word.",
  },
  newsletter: {
    whyTemplate: (pt, p) =>
      `Your open rate is your competitive advantage. Every subscriber who opens your newsletter has actively chosen to hear from you — that's a level of trust most advertisers can only dream of. ${p.name} is a natural fit for what your readers already care about, and a dedicated send could drive real, measurable results without alienating your list.`,
    socialProof: (p) =>
      `Our best newsletter partner generated 31 sales from a single dedicated send to 4,000 subscribers — a 0.8% conversion rate, which is double the category average.`,
    followUpTiming: "Follow up 3–4 days after initial contact, then again at 8–9 days.",
    ctaText: "Would you be up for a quick call? Alternatively, I can send everything over by email.",
  },
  community: {
    whyTemplate: (pt, p) =>
      `Community owners sit at the centre of trust networks. Your members look to you for vetted recommendations — if you endorse something, they listen and act. ${p.name} would feel native inside your community and could genuinely help your members. The commission we're offering reflects how seriously we take this kind of partnership.`,
    socialProof: (p) =>
      `A community owner in a similar space drove 28 sales in two weeks just from posting in their group — with no paid ads, no discount codes, and minimal extra effort.`,
    followUpTiming: "Follow up 4–5 days after initial contact, then again at 10 days.",
    ctaText: "Would love to explore this — are you open to a quick 10-minute chat?",
  },
  financial: {
    whyTemplate: (pt, p) =>
      `Your clients are already in a financial growth mindset — they're actively seeking tools and strategies to improve their situation. ${p.name} aligns perfectly with the journey your audience is already on. A trusted recommendation from you carries enormous weight because your followers look to you for vetted solutions, not advertisements.`,
    socialProof: (p) =>
      `One of our financial coach partners made $3,400 in their first month — just by sharing it in their existing client onboarding process. No extra marketing spend, no cold outreach.`,
    followUpTiming: "Follow up 4–5 days after initial contact, then again at 9–10 days.",
    ctaText: "Are you open to a quick call? I'd love to walk you through how other financial educators are using this.",
  },
  reviewer: {
    whyTemplate: (pt, p) =>
      `Review audiences arrive with built-in purchase intent — they're watching your videos specifically because they're evaluating a buying decision. A genuine, in-depth review of ${p.name} would resonate deeply with your subscribers and drive real conversions. Our commission offer is significantly above standard because we understand what authentic exposure from a trusted reviewer is worth.`,
    socialProof: (p) =>
      `Our most recent review partnership resulted in the video ranking top 3 for a key buying keyword within 3 weeks — and it's still generating passive commissions for the creator today.`,
    followUpTiming: "Follow up 5 days after initial contact, then again at 10–12 days.",
    ctaText: "Happy to send over a full access trial account so you can review it honestly — interested?",
  },
  fitness: {
    whyTemplate: (pt, p) =>
      `Your audience is actively investing in their health and performance — they're not passive viewers, they're buyers looking for tools to level up. ${p.name} fits naturally alongside what you already teach and recommend. Your word carries real weight in this space and converts at a much higher rate than traditional advertising.`,
    socialProof: (p) =>
      `A fitness creator with a similar audience included ${p.name} in their weekly email and drove 22 sales in 48 hours — with zero extra content creation beyond that single mention.`,
    followUpTiming: "Follow up 4 days after initial contact, then again at 9 days.",
    ctaText: "Would love to discuss — are you open to a quick call this week?",
  },
  lifestyle: {
    whyTemplate: (pt, p) =>
      `Lifestyle audiences are aspirational buyers — they're constantly looking for products that help them live the life they're working toward. ${p.name} fits the identity and goals of your audience naturally. A genuine feature from you would feel like a recommendation from a trusted friend, not an ad, which is exactly why it converts so well.`,
    socialProof: (p) =>
      `A lifestyle creator with a comparable audience mentioned ${p.name} in a casual Instagram story and drove 18 conversions in a single day — with a two-sentence caption.`,
    followUpTiming: "Follow up 5 days after initial contact, then again at 10 days.",
    ctaText: "No pressure at all — would it be easier if I sent everything over by email first?",
  },
  default: {
    whyTemplate: (pt, p) =>
      `As a ${pt}, you've built an engaged audience that trusts your recommendations. ${p.name} is a genuinely strong fit for what your followers care about, and we'd love to build a partnership that feels good for both sides — not just a standard affiliate arrangement.`,
    socialProof: (p) =>
      `One of our partners in a similar space drove over $2,000 in commissions in their first month — just from their existing audience, no extra promotion required.`,
    followUpTiming: "Follow up 5 days after initial contact, then again at 10 days.",
    ctaText: "Would you be open to a quick 10-minute call to explore this?",
  },
};

// ─── Legacy message builders (ResearchContext) ────────────────────────────────

function buildFirstEmail(
  partnerType: string,
  product: Product,
  commission: string,
  outreachAngle: string,
  family: PartnerFamily,
  research?: ResearchContext,
): string {
  const hook = FAMILY_HOOKS[family];
  const firstName = research?.targetName
    ? research.targetName.trim().split(/\s+/)[0]
    : "[First Name]";

  const companyLine = research?.company
    ? ` at ${research.company}`
    : "";
  const audienceLine = research?.audienceSize
    ? `\nI've been looking at your work${companyLine} — with ${research.audienceSize} engaged followers${research.platform ? ` on ${research.platform}` : ""}, the alignment here is very strong.`
    : "";
  const contentHook = research?.contentAngle
    ? `\n\n**What caught my eye:**\n${research.contentAngle}`
    : "";

  return `Subject: Partnership opportunity — ${product.name} × ${partnerType}

Hi ${firstName},

I'm reaching out from ${product.name}. We help ${product.targetCustomer} to ${product.mainBenefit}, and we're looking for a small group of mission-aligned partners to grow with.${audienceLine}

**Why I think you're the right fit:**
${outreachAngle}${contentHook}

${hook.whyTemplate(partnerType, product)}

**What we're offering:**
• ${commission} revenue share on every sale you drive (vs the industry standard of 5–10%)
• Simple tracking link — you see exactly how much you're earning in real time
• Full creative freedom: you choose how to feature it
• We handle all fulfilment, customer support, and billing

**Why such a high commission?**
Because finding the right partners is our biggest challenge. We'd rather share a meaningful percentage with someone whose audience genuinely needs this than spend the same money on ads that nobody believes.

**Next step:**
${hook.ctaText}

Either way, I'll send over our full partner info pack so you can review everything at your own pace.

Best,
[Your Name]
Partnerships @ ${product.name}
[your@email.com]`;
}

function buildDM(
  partnerType: string,
  product: Product,
  commission: string,
  outreachAngle: string,
  research?: ResearchContext,
): string {
  const firstName = research?.targetName
    ? research.targetName.trim().split(/\s+/)[0]
    : "[First Name]";
  const firstSentenceAngle = outreachAngle.split(".")[0].toLowerCase();
  const audienceHook = research?.audienceSize
    ? ` Your ${research.audienceSize}-strong audience${research.platform ? ` on ${research.platform}` : ""} is exactly what we're looking for.`
    : "";
  const contentNote = research?.contentAngle
    ? ` Loved your content on "${research.contentAngle.substring(0, 60)}${research.contentAngle.length > 60 ? "…" : ""}".`
    : "";

  return `Hey ${firstName} — I run partnerships for ${product.name}.

We help ${product.targetCustomer} with ${product.mainBenefit}, and I think you'd be a perfect fit as a partner — ${firstSentenceAngle}.${audienceHook}${contentNote}

We're offering ${commission} commission — well above the standard 5–10%. Zero fuss, full creative control on your end.

Worth a quick chat? Happy to send a one-pager over if easier 🙌`;
}

function buildFollowUp1(
  partnerType: string,
  product: Product,
  family: PartnerFamily,
  research?: ResearchContext,
): string {
  const hook = FAMILY_HOOKS[family];
  const firstName = research?.targetName
    ? research.targetName.trim().split(/\s+/)[0]
    : "[First Name]";

  return `Hi ${firstName},

Just following up on my message from a few days ago about a partnership with ${product.name}.

${hook.socialProof(product)}

I know your inbox gets busy — happy to keep this short. Would a quick 5-minute call work this week? Or if email is easier, I can answer any questions in writing.

Best,
[Your Name]
Partnerships @ ${product.name}`;
}

function buildFollowUp2(
  partnerType: string,
  product: Product,
  commission: string,
  research?: ResearchContext,
): string {
  const firstName = research?.targetName
    ? research.targetName.trim().split(/\s+/)[0]
    : "[First Name]";

  return `Hi ${firstName},

Last note from me on this — I don't want to clutter your inbox.

The short version: we're offering ${partnerType}s a ${commission} commission on ${product.name}, which pays out automatically every month with zero admin on your end.

If this isn't the right time or fit — totally understood and no hard feelings. But if you're even slightly curious, I'm happy to answer any questions in 2 minutes flat.

Either way, thanks for the content you create. It's genuinely valuable work.

Best,
[Your Name]
Partnerships @ ${product.name}`;
}

function buildObjectionResponse(
  partnerType: string,
  product: Product,
  commission: string,
  research?: ResearchContext,
): string {
  const firstName = research?.targetName
    ? research.targetName.trim().split(/\s+/)[0]
    : "[First Name]";

  return `Hi ${firstName},

Thanks for getting back to me — genuinely appreciate it.

A few thoughts, in case they're helpful:

**"I don't do affiliate deals"**
Totally understandable — most affiliate programs feel transactional and low-value. What we're offering is structured differently: ${commission} revenue share, full creative control, no quotas, and you only promote ${product.name} if you genuinely believe in it after trying it. If you test it and it's not right for your audience, you owe us nothing.

**"My audience isn't the right fit"**
Happy to defer to your judgement — you know your audience far better than we do. That said, we've seen strong results from ${partnerType}s with similar followings. We'd love to offer a free trial so you can experience it yourself and decide authentically.

**"I'm too busy right now"**
Completely fair. We're happy to keep this on your radar with zero pressure. Would it help if I sent a one-page overview you can read in 3 minutes whenever the timing is better?

Whatever you decide — no hard feelings at all. Thanks for considering it.

Best,
[Your Name]
Partnerships @ ${product.name}`;
}

// ─── Intelligence-aware message builders ──────────────────────────────────────

function buildFirstEmailFromIntel(
  product: Product,
  commission: string,
  family: PartnerFamily,
  ctx: OutreachIntelligenceContext,
): string {
  const hook = FAMILY_HOOKS[family];
  const firstName = ctx.targetName.trim().split(/\s+/)[0] || "[First Name]";
  const companyLine = ctx.company ? ` at ${ctx.company}` : "";

  // Build the "why selected" section — prefer qualification reasons → strategy angle → content angle
  let whySelected: string;
  if (ctx.qualificationReasons && ctx.qualificationReasons.length > 0) {
    whySelected = ctx.qualificationReasons.slice(0, 2).join(". ");
  } else if (ctx.strategyOutreachAngle) {
    whySelected = ctx.strategyOutreachAngle;
  } else if (ctx.contentAngle) {
    whySelected = ctx.contentAngle;
  } else {
    whySelected = `${ctx.partnerCategory}s in the ${ctx.productCategory} space are a consistently strong fit for ${product.name}.`;
  }

  // Audience hook
  const audienceHook = ctx.audienceSize
    ? `\nI've been reviewing your work${companyLine} — with ${ctx.audienceSize}${ctx.platform ? ` on ${ctx.platform}` : ""}, the audience alignment here is genuinely compelling.`
    : ctx.company
    ? `\nI came across your work${companyLine} and wanted to reach out personally.`
    : "";

  // Content or video reference
  const contentRef = ctx.latestVideoTitle
    ? `\n\nI recently watched "${ctx.latestVideoTitle}" — it's exactly the kind of content that resonates with what we're building here.`
    : ctx.contentAngle
    ? `\n\n**What caught my eye:**\n${ctx.contentAngle}`
    : "";

  // Qualification signal (only if strong)
  const qualRef =
    ctx.qualificationLabel &&
    ctx.qualificationLabel !== "Not Qualified" &&
    ctx.partnerFitScore != null &&
    ctx.partnerFitScore >= 60
      ? `\n\nFor context: you came through our partner qualification process with a "${ctx.qualificationLabel}" rating and a ${ctx.partnerFitScore}/100 fit score — meaning you're in the top tier of the partners we're approaching for ${product.name}.`
      : "";

  // Strategy outreach angle (only if distinct from whySelected)
  const strategyLine =
    ctx.strategyOutreachAngle && ctx.strategyOutreachAngle !== whySelected
      ? `\n\n**How I'd suggest we work together:**\n${ctx.strategyOutreachAngle}`
      : "";

  // Product market context
  const marketLine = ctx.productMarket
    ? ` in the ${ctx.productMarket} market`
    : "";

  // Prior outreach reference
  const historyLine =
    ctx.priorOutreachCount > 0
      ? `\n\n(I know I may have reached out before — I wanted to follow up with more context this time.)`
      : "";

  return `Subject: Partnership opportunity — ${product.name} × ${ctx.partnerCategory}

Hi ${firstName},

I'm reaching out from ${product.name}. We help ${product.targetCustomer}${marketLine} to ${product.mainBenefit}, and we're building a small, hand-picked group of partners to grow alongside.${audienceHook}

**Why I selected you specifically:**
${whySelected}${contentRef}${qualRef}${strategyLine}${historyLine}

${hook.whyTemplate(ctx.partnerCategory, product)}

**What we're offering:**
• ${commission} revenue share on every sale you drive (vs the industry standard of 5–10%)
• Simple tracking link — you see exactly how much you're earning in real time
• Full creative freedom: you choose how to feature it
• We handle all fulfilment, customer support, and billing

**Why such a high commission?**
Because finding the right partners is our biggest challenge. We'd rather share a meaningful percentage with someone whose audience genuinely needs this than spend the same money on ads that nobody believes.

**Next step:**
${hook.ctaText}

Either way, I'll send over our full partner info pack so you can review everything at your own pace.

Best,
[Your Name]
Partnerships @ ${product.name}
[your@email.com]`;
}

function buildDMFromIntel(
  product: Product,
  commission: string,
  ctx: OutreachIntelligenceContext,
): string {
  const firstName = ctx.targetName.trim().split(/\s+/)[0] || "[First Name]";

  const audienceHook = ctx.audienceSize
    ? ` Your ${ctx.audienceSize}-strong audience${ctx.platform ? ` on ${ctx.platform}` : ""} is exactly the profile we're looking for.`
    : "";

  const contentNote = ctx.latestVideoTitle
    ? ` Just watched "${ctx.latestVideoTitle.substring(0, 55)}${ctx.latestVideoTitle.length > 55 ? "…" : ""}" — quality work.`
    : ctx.contentAngle
    ? ` Loved your take on "${ctx.contentAngle.substring(0, 55)}${ctx.contentAngle.length > 55 ? "…" : ""}".`
    : "";

  const fitNote =
    ctx.qualificationLabel && ctx.qualificationLabel !== "Not Qualified"
      ? ` You came up as "${ctx.qualificationLabel}" in our partner scoring.`
      : "";

  const angle = ctx.strategyOutreachAngle ?? ctx.contentAngle ?? `${ctx.partnerCategory} audiences are a great fit`;
  const firstSentence = angle.split(".")[0].toLowerCase();

  return `Hey ${firstName} — I run partnerships for ${product.name}.

We help ${product.targetCustomer} with ${product.mainBenefit}, and I think you'd be a great fit — ${firstSentence}.${audienceHook}${contentNote}${fitNote}

We're offering ${commission} commission — well above the standard 5–10%. Full creative control, zero quotas.

Worth a quick chat? Happy to send a one-pager over if easier 🙌`;
}

function buildFollowUp1FromIntel(
  product: Product,
  family: PartnerFamily,
  ctx: OutreachIntelligenceContext,
): string {
  const hook = FAMILY_HOOKS[family];
  const firstName = ctx.targetName.trim().split(/\s+/)[0] || "[First Name]";

  const fitReminder =
    ctx.partnerFitScore != null
      ? ` (Our scoring put you at ${ctx.partnerFitScore}/100 for audience fit with ${product.name} — we don't often reach out at that level.)`
      : "";

  return `Hi ${firstName},

Just following up on my message from a few days ago about a partnership with ${product.name}.${fitReminder}

${hook.socialProof(product)}

I know your inbox gets busy — happy to keep this short. Would a quick 5-minute call work this week? Or if email is easier, I can answer any questions in writing.

Best,
[Your Name]
Partnerships @ ${product.name}`;
}

function buildFollowUp2FromIntel(
  product: Product,
  commission: string,
  ctx: OutreachIntelligenceContext,
): string {
  const firstName = ctx.targetName.trim().split(/\s+/)[0] || "[First Name]";
  const stratNote = ctx.strategyOutreachAngle
    ? `\n\nOne specific thought: ${ctx.strategyOutreachAngle.split(".")[0].toLowerCase()}.`
    : "";

  return `Hi ${firstName},

Last note from me on this — I don't want to clutter your inbox.

The short version: we're offering ${ctx.partnerCategory}s a ${commission} commission on ${product.name}, which pays out automatically every month with zero admin on your end.${stratNote}

If this isn't the right time or fit — totally understood and no hard feelings. But if you're even slightly curious, I'm happy to answer any questions in 2 minutes flat.

Either way, thanks for the content you create. It's genuinely valuable work.

Best,
[Your Name]
Partnerships @ ${product.name}`;
}

function buildObjectionResponseFromIntel(
  product: Product,
  commission: string,
  ctx: OutreachIntelligenceContext,
): string {
  const firstName = ctx.targetName.trim().split(/\s+/)[0] || "[First Name]";
  const qualNote =
    ctx.qualificationLabel && ctx.partnerFitScore != null
      ? `For what it's worth, our qualification process flagged you as "${ctx.qualificationLabel}" (${ctx.partnerFitScore}/100 fit score) — meaning we genuinely believe this is a mutual fit, not just a generic outreach blast.`
      : `We reached out specifically because your audience profile is a strong match — this isn't a generic outreach campaign.`;

  return `Hi ${firstName},

Thanks for getting back to me — genuinely appreciate it.

${qualNote}

A few thoughts, in case they're helpful:

**"I don't do affiliate deals"**
Totally understandable — most affiliate programs feel transactional and low-value. What we're offering is structured differently: ${commission} revenue share, full creative control, no quotas, and you only promote ${product.name} if you genuinely believe in it after trying it. If you test it and it's not right for your audience, you owe us nothing.

**"My audience isn't the right fit"**
Happy to defer to your judgement — you know your audience far better than we do. That said, we've seen strong results from ${ctx.partnerCategory}s with similar followings. We'd love to offer a free trial so you can experience it yourself and decide authentically.

**"I'm too busy right now"**
Completely fair. We're happy to keep this on your radar with zero pressure. Would it help if I sent a one-page overview you can read in 3 minutes whenever the timing is better?

Whatever you decide — no hard feelings at all. Thanks for considering it.

Best,
[Your Name]
Partnerships @ ${product.name}`;
}

// ─── Research Utilization Score ───────────────────────────────────────────────

function buildChecklist(ctx: OutreachIntelligenceContext | null): QualityCheckItem[] {
  return [
    {
      label: "Product referenced in letter",
      done: !!ctx?.productName,
      category: "product",
    },
    {
      label: "Creator referenced by name",
      done: !!ctx?.targetName && ctx.targetName.length > 1,
      category: "creator",
    },
    {
      label: "Audience size referenced",
      done: !!ctx?.audienceSize,
      category: "creator",
    },
    {
      label: "Content angle or latest video used",
      done: !!(ctx?.contentAngle || ctx?.latestVideoTitle),
      category: "creator",
    },
    {
      label: "Qualification reason referenced",
      done: (ctx?.qualificationReasons?.length ?? 0) > 0,
      category: "qualification",
    },
    {
      label: "Strategy outreach angle applied",
      done: !!ctx?.strategyOutreachAngle,
      category: "strategy",
    },
    {
      label: "Contact method aligned",
      done: !!ctx?.preferredContactMethod,
      category: "contact",
    },
    {
      label: "CTA included",
      done: !!ctx?.productName,
      category: "product",
    },
  ];
}

export function computeResearchUtilizationScore(
  ctx: OutreachIntelligenceContext | null,
): ResearchUtilizationScore {
  const checklist = buildChecklist(ctx);

  if (!ctx) {
    return {
      total: 0,
      productContext: 0,
      creatorContext: 0,
      qualificationContext: 0,
      contactContext: 0,
      strategyContext: 0,
      checklist,
    };
  }

  // Product context (max 20)
  const productContext = Math.min(
    20,
    [ctx.productName, ctx.productCategory, ctx.productSummary, ctx.productMarket, ctx.productOutreachAngle].filter(
      Boolean,
    ).length * 4,
  );

  // Creator context (max 20)
  const creatorContext = Math.min(
    20,
    [ctx.targetName, ctx.company, ctx.audienceSize, ctx.contentAngle, ctx.latestVideoTitle].filter(Boolean).length * 4,
  );

  // Qualification context (max 20)
  const qualificationContext = Math.min(
    20,
    (ctx.partnerFitScore != null ? 8 : 0) +
      (ctx.qualificationLabel ? 4 : 0) +
      ((ctx.qualificationReasons?.length ?? 0) > 0 ? 8 : 0),
  );

  // Contact context (max 20)
  const contactContext = Math.min(
    20,
    (ctx.contactReadinessScore != null ? 8 : 0) +
      (ctx.businessEmail ? 7 : 0) +
      (ctx.preferredContactMethod ? 5 : 0),
  );

  // Strategy context (max 20)
  const strategyContext = Math.min(
    20,
    (ctx.partnerStrategySummary ? 7 : 0) +
      (ctx.strategyOutreachAngle ? 9 : 0) +
      (ctx.recommendedDealType ? 4 : 0),
  );

  return {
    total: Math.min(100, productContext + creatorContext + qualificationContext + contactContext + strategyContext),
    productContext,
    creatorContext,
    qualificationContext,
    contactContext,
    strategyContext,
    checklist,
  };
}

// ─── Legacy personalisation score (kept for backward compat) ──────────────────

export function computePersonalisationScore(
  research: ResearchContext | null,
  hasProduct: boolean,
  hasAngle: boolean,
): number {
  if (!research) return hasProduct && hasAngle ? 20 : 0;
  const fields: (string | null | undefined)[] = [
    research.targetName,
    research.company,
    research.platform,
    research.audienceSize,
    research.contentAngle,
    research.notes,
  ];
  const filled = fields.filter((f) => f && f.trim().length > 0).length;
  const base = Math.round((filled / fields.length) * 60);
  const productBonus = hasProduct ? 20 : 0;
  const angleBonus = hasAngle ? 20 : 0;
  return Math.min(100, base + productBonus + angleBonus);
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function generatePartnerOutreachMessages(
  partnerType: string,
  product: Product,
  commission: string,
  outreachAngle: string,
): OutreachPlanMessages {
  const family = detectFamily(partnerType);
  const hook = FAMILY_HOOKS[family];

  return {
    whySelected: hook.whyTemplate(partnerType, product),
    offerAngle: outreachAngle,
    followUpTiming: hook.followUpTiming,
    cta: hook.ctaText,
    firstEmail: buildFirstEmail(partnerType, product, commission, outreachAngle, family),
    dm: buildDM(partnerType, product, commission, outreachAngle),
    followUp1: buildFollowUp1(partnerType, product, family),
    followUp2: buildFollowUp2(partnerType, product, commission),
    objectionResponse: buildObjectionResponse(partnerType, product, commission),
  };
}

export function generateResearchOutreachMessages(
  partnerType: string,
  product: Product,
  commission: string,
  outreachAngle: string,
  research: ResearchContext,
): OutreachPlanMessages {
  const family = detectFamily(partnerType);
  const hook = FAMILY_HOOKS[family];

  return {
    whySelected: hook.whyTemplate(partnerType, product),
    offerAngle: outreachAngle,
    followUpTiming: hook.followUpTiming,
    cta: hook.ctaText,
    firstEmail: buildFirstEmail(partnerType, product, commission, outreachAngle, family, research),
    dm: buildDM(partnerType, product, commission, outreachAngle, research),
    followUp1: buildFollowUp1(partnerType, product, family, research),
    followUp2: buildFollowUp2(partnerType, product, commission, research),
    objectionResponse: buildObjectionResponse(partnerType, product, commission, research),
  };
}

/** Primary export for Phase 5E.1 — uses full OutreachIntelligenceContext */
export function generateIntelligenceOutreachMessages(
  product: Product,
  commission: string,
  ctx: OutreachIntelligenceContext,
): OutreachPlanMessages {
  const family = detectFamily(ctx.partnerCategory);
  const hook = FAMILY_HOOKS[family];

  return {
    whySelected: hook.whyTemplate(ctx.partnerCategory, product),
    offerAngle: ctx.strategyOutreachAngle ?? ctx.contentAngle ?? "",
    followUpTiming: hook.followUpTiming,
    cta: hook.ctaText,
    firstEmail: buildFirstEmailFromIntel(product, commission, family, ctx),
    dm: buildDMFromIntel(product, commission, ctx),
    followUp1: buildFollowUp1FromIntel(product, family, ctx),
    followUp2: buildFollowUp2FromIntel(product, commission, ctx),
    objectionResponse: buildObjectionResponseFromIntel(product, commission, ctx),
  };
}
