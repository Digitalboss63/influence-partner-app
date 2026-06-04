import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import {
  generatePartnerIntelligence,
  type PartnerCategory,
  type DealStructureRec,
  type PartnerTier,
} from "@/lib/partnerIntelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Compass,
  ArrowLeft,
  Users,
  TrendingUp,
  Zap,
  Shield,
  Target,
  ChevronRight,
  Package,
  Lightbulb,
  Info,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_STYLES: Record<PartnerTier, { badge: string; section: string; label: string }> = {
  1: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    section: "border-l-emerald-500 bg-emerald-50/40",
    label: "Primary Target",
  },
  2: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    section: "border-l-blue-400 bg-blue-50/40",
    label: "Secondary Target",
  },
  3: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    section: "border-l-amber-400 bg-amber-50/30",
    label: "Supplementary",
  },
};

const CONVERSION_STYLES: Record<string, string> = {
  High: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Medium: "bg-blue-100 text-blue-800 border-blue-200",
  Low: "bg-amber-100 text-amber-800 border-amber-200",
};

const EFFORT_STYLES: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Medium: "text-amber-700 bg-amber-50 border-amber-200",
  Hard: "text-red-700 bg-red-50 border-red-200",
};

const REVENUE_COLOR: Record<string, string> = {
  Exceptional: "text-emerald-700",
  High: "text-blue-700",
  Moderate: "text-amber-700",
  Low: "text-gray-600",
};

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) {
  const color =
    score >= 90 ? "bg-emerald-500" :
    score >= 75 ? "bg-blue-500" :
    score >= 60 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <span className="text-sm font-bold text-foreground">{score}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function PartnerCategoryCard({ cat }: { cat: PartnerCategory }) {
  const tier = TIER_STYLES[cat.tier];
  return (
    <Card
      className={`flex flex-col border-l-4 ${tier.section}`}
      data-testid={`card-partner-category-${cat.id}`}
    >
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl leading-none flex-shrink-0">{cat.icon}</span>
            <p className="font-bold text-sm text-foreground leading-tight">{cat.name}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Badge variant="outline" className={`text-xs border ${tier.badge}`}>
              Tier {cat.tier}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-background border border-border px-2 py-1.5">
            <p className="text-xs text-muted-foreground mb-0.5">Commission</p>
            <p className="text-xs font-bold text-primary">{cat.recommendedCommission}</p>
          </div>
          <div className="rounded-lg bg-background border border-border px-2 py-1.5">
            <p className="text-xs text-muted-foreground mb-0.5">Conversion</p>
            <Badge
              variant="outline"
              className={`text-xs border px-1.5 py-0 ${CONVERSION_STYLES[cat.conversionQuality]}`}
            >
              {cat.conversionQuality}
            </Badge>
          </div>
          <div className="rounded-lg bg-background border border-border px-2 py-1.5">
            <p className="text-xs text-muted-foreground mb-0.5">Match</p>
            <p className="text-xs font-bold text-foreground">{cat.audienceMatchScore}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Why they fit</p>
            <p className="text-xs text-foreground leading-relaxed">{cat.whyFit}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Audience</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{cat.audienceAlignment}</p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" /> Outreach Angle
          </p>
          <p className="text-xs text-foreground leading-relaxed italic">"{cat.outreachAngle}"</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DealCard({ deal }: { deal: DealStructureRec }) {
  return (
    <Card
      className={deal.isBest ? "border-primary/50 bg-primary/5 shadow-sm" : ""}
      data-testid={`card-deal-${deal.type.toLowerCase().replace(/\s/g, "-")}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-foreground">{deal.type}</p>
              {deal.isBest && (
                <Badge className="text-xs bg-primary text-primary-foreground px-1.5 py-0">
                  ★ Best Fit
                </Badge>
              )}
            </div>
            <p className="text-lg font-black text-primary mt-0.5">{deal.recommendedCommission}</p>
          </div>
          <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${EFFORT_STYLES[deal.expectedEffort]}`}>
            {deal.expectedEffort} effort
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{deal.why}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerStrategy() {
  const [, setLocation] = useLocation();
  const { products, selectedProductId } = useAppContext();

  const activeProduct =
    (selectedProductId ? products.find((p) => p.id === selectedProductId) : null) ??
    products[0] ??
    null;

  if (!activeProduct) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-5 mt-20">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Compass className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Partner Strategy</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Add a product first to see your personalised partner acquisition strategy.
          </p>
        </div>
        <Button onClick={() => setLocation("/products")} data-testid="button-add-product-strategy">
          <Package className="w-4 h-4 mr-2" />
          Add a Product
        </Button>
      </div>
    );
  }

  const intel = generatePartnerIntelligence(activeProduct);
  const tier1 = intel.partnerCategories.filter((c) => c.tier === 1);
  const tier2 = intel.partnerCategories.filter((c) => c.tier === 2);
  const tier3 = intel.partnerCategories.filter((c) => c.tier === 3);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Partner Strategy</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Who to pursue, why they fit, and exactly how to approach them — for <strong>{activeProduct.name}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 flex-shrink-0"
          onClick={() => setLocation("/discover")}
          data-testid="button-find-creators"
        >
          <Users className="w-3.5 h-3.5" />
          Find Creators
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Product + overview strip */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{activeProduct.name}</p>
                <p className="text-xs text-muted-foreground">{activeProduct.category} · {activeProduct.price} · {activeProduct.commissionOffer}% commission offer</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Top Partner Type</p>
                <p className="text-sm font-bold text-foreground">{intel.topPartnerCategory}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Acquisition</p>
                <Badge variant="outline" className={`text-xs border ${DIFFICULTY_COLOR[intel.estimatedAcquisitionDifficulty]}`}>
                  {intel.estimatedAcquisitionDifficulty}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Revenue Opp.</p>
                <p className={`text-sm font-bold ${REVENUE_COLOR[intel.estimatedRevenueOpportunity]}`}>{intel.estimatedRevenueOpportunity}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Rec. Commission</p>
                <p className="text-sm font-bold text-primary">{intel.recommendedCommission}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sm">
        <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-sky-800 leading-relaxed">
          <span className="font-semibold">How to read this page: </span>
          Tier 1 partners are your <strong>highest-priority targets</strong> — they have the best audience fit and the shortest path to conversion.
          Start with 3–5 Tier 1 contacts before moving to Tier 2. Every recommendation includes the exact outreach angle to use.
        </div>
      </div>

      {/* ── Section 1: Ideal Partner Categories ────────────────────────────── */}
      <section data-testid="section-partner-categories">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Ideal Partner Categories</h2>
          <Badge variant="outline" className="text-xs ml-auto">
            {intel.partnerCategories.length} categories identified
          </Badge>
        </div>

        {/* Tier 1 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-0.5">
              🏆 Tier 1 — Primary Targets
            </span>
            <span className="text-xs text-muted-foreground">Start here. Highest ROI per outreach hour.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tier1.map((cat) => <PartnerCategoryCard key={cat.id} cat={cat} />)}
          </div>
        </div>

        {/* Tier 2 */}
        {tier2.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-0.5">
                🎯 Tier 2 — Secondary Targets
              </span>
              <span className="text-xs text-muted-foreground">Scale here once Tier 1 pipeline is running.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tier2.map((cat) => <PartnerCategoryCard key={cat.id} cat={cat} />)}
            </div>
          </div>
        )}

        {/* Tier 3 */}
        {tier3.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-0.5">
                🌐 Tier 3 — Supplementary
              </span>
              <span className="text-xs text-muted-foreground">Low effort, long-tail discovery channels.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tier3.map((cat) => <PartnerCategoryCard key={cat.id} cat={cat} />)}
            </div>
          </div>
        )}
      </section>

      {/* ── Section 2: Priority Ranking ────────────────────────────────────── */}
      <section data-testid="section-priority-ranking">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Partner Priority Ranking</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([1, 2, 3] as PartnerTier[]).map((tier) => {
            const cats = intel.partnerCategories.filter((c) => c.tier === tier);
            const styles = TIER_STYLES[tier];
            const labels = ["🏆 Tier 1 — Primary", "🎯 Tier 2 — Secondary", "🌐 Tier 3 — Supplementary"];
            const reasons = [
              "Highest audience alignment and buying intent. Invest most of your outreach effort here. Each contact in this tier should receive a personalised, value-first message.",
              "Strong adjacent audiences. Begin outreach here once your Tier 1 pipeline has 3+ active conversations. Lower intent per contact but higher volume available.",
              "Long-tail discovery and passive referral channels. Minimal active effort required — set up once and let them generate background leads.",
            ];
            return (
              <Card key={tier} className={`border-l-4 ${styles.section}`} data-testid={`card-tier-${tier}`}>
                <CardContent className="p-4 space-y-3">
                  <p className="font-bold text-sm">{labels[tier - 1]}</p>
                  <div className="space-y-1.5">
                    {cats.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <span className="text-base leading-none">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">{cat.recommendedCommission} · {cat.conversionQuality} conversion</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground leading-relaxed">{reasons[tier - 1]}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Section 3: Deal Structures ─────────────────────────────────────── */}
      <section data-testid="section-deal-structures">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Recommended Deal Structure</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ranked by fit for <strong>{activeProduct.category}</strong> products. The starred deal is the best starting point.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {intel.dealStructures.map((deal) => <DealCard key={deal.type} deal={deal} />)}
        </div>
      </section>

      {/* ── Section 4: Audience Alignment ──────────────────────────────────── */}
      <section data-testid="section-audience-alignment">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Audience Alignment</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Aggregate Scores — {activeProduct.category} Products
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <ScoreBar label="Audience Match Score" score={intel.overallAudienceMatchScore} icon={Users} />
              <ScoreBar label="Buying Intent Score" score={intel.overallBuyingIntentScore} icon={TrendingUp} />
              <ScoreBar label="Trust Score" score={intel.overallTrustScore} icon={Shield} />
              <ScoreBar label="Conversion Potential" score={intel.overallConversionPotential} icon={Zap} />
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                Scores reflect the average across Tier 1–3 partners for this product category. Tier 1 partners consistently score 10–20 points higher.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Best Audience Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
                <p className="text-sm font-semibold text-foreground leading-relaxed">{intel.bestAudienceType}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Acquisition Difficulty</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Finding partners in the <strong>{activeProduct.category}</strong> space is rated{" "}
                      <span className={`font-bold ${DIFFICULTY_COLOR[intel.estimatedAcquisitionDifficulty].split(" ")[0]}`}>
                        {intel.estimatedAcquisitionDifficulty}
                      </span>. {intel.estimatedAcquisitionDifficulty === "Easy"
                        ? "Large creator pool — focus on quality over speed."
                        : intel.estimatedAcquisitionDifficulty === "Medium"
                        ? "Competitive niche — a personalised outreach angle is essential."
                        : "Highly contested space — lead with your differentiated commission offer."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Revenue Opportunity</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This product category has a{" "}
                      <span className={`font-bold ${REVENUE_COLOR[intel.estimatedRevenueOpportunity]}`}>
                        {intel.estimatedRevenueOpportunity}
                      </span>{" "}
                      revenue opportunity rating. {intel.estimatedRevenueOpportunity === "Exceptional"
                        ? "Strong purchase intent and high ticket values — prioritise high-fit partners."
                        : intel.estimatedRevenueOpportunity === "High"
                        ? "Solid market with proven buyer behaviour — consistent revenue at scale."
                        : "Steady market — volume and retention will drive long-term revenue growth."}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Footer */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-foreground">Ready to find your Tier 1 partners?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse the 15 pre-scored creators and filter by the partner categories identified above.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button
              onClick={() => setLocation("/discover")}
              data-testid="button-discover-creators"
            >
              <Users className="w-4 h-4 mr-2" />
              Discover Creators
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/outreach")}
              data-testid="button-generate-outreach-strategy"
            >
              Generate Outreach
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
