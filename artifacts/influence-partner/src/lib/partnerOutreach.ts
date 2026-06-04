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

// ─── Message builders ─────────────────────────────────────────────────────────

function buildFirstEmail(
  partnerType: string,
  product: Product,
  commission: string,
  outreachAngle: string,
  family: PartnerFamily
): string {
  const hook = FAMILY_HOOKS[family];
  return `Subject: Partnership opportunity — ${product.name} × ${partnerType}

Hi [First Name],

I'm reaching out from ${product.name}. We help ${product.targetCustomer} to ${product.mainBenefit}, and we're looking for a small group of mission-aligned partners to grow with.

**Why I think you're the right fit:**
${outreachAngle}

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
  outreachAngle: string
): string {
  const firstSentenceAngle = outreachAngle.split(".")[0].toLowerCase();
  return `Hey [First Name] — I run partnerships for ${product.name}.

We help ${product.targetCustomer} with ${product.mainBenefit}, and I think you'd be a perfect fit as a partner — ${firstSentenceAngle}.

We're offering ${commission} commission — well above the standard 5–10%. Zero fuss, full creative control on your end.

Worth a quick chat? Happy to send a one-pager over if easier 🙌`;
}

function buildFollowUp1(
  partnerType: string,
  product: Product,
  family: PartnerFamily
): string {
  const hook = FAMILY_HOOKS[family];
  return `Hi [First Name],

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
  commission: string
): string {
  return `Hi [First Name],

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
  commission: string
): string {
  return `Hi [First Name],

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

// ─── Main export ──────────────────────────────────────────────────────────────

export function generatePartnerOutreachMessages(
  partnerType: string,
  product: Product,
  commission: string,
  outreachAngle: string
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
