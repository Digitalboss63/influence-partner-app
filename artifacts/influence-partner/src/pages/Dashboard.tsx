import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Users,
  Star,
  DollarSign,
  Plus,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Target,
  ArrowRight,
  BarChart2,
  Compass,
  MessageSquare,
  Clock,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { ProductIntelligencePreview } from "@/components/ProductIntelligenceSummary";
import {
  formatFollowers,
  getFitScoreColorClasses,
  getPlatformColor,
  getStageColor,
} from "@/lib/utils/format";
import {
  estimateMonthlyConversions,
  estimateMonthlyRevenue,
  estimateMonthlyProfit,
  getOpportunityLevel,
} from "@/lib/scoring";
import { generatePartnerIntelligence } from "@/lib/partnerIntelligence";
import {
  getSavedPlans,
  deleteSavedPlan,
  type SavedOutreachPlan,
} from "@/lib/savedPlans";
import { PipelineStage } from "@/types/influencePartner";

const STAGES: PipelineStage[] = ["New", "Contacted", "Interested", "Negotiating", "Active", "Rejected"];

const WORKFLOW_STEPS = [
  { id: 1, label: "Create Product", sub: "Define what you're selling", path: "/products" },
  { id: 2, label: "Review Creators", sub: "Find your best matches", path: "/discover" },
  { id: 3, label: "Generate Outreach", sub: "Send personalised pitches", path: "/outreach" },
  { id: 4, label: "Manage Pipeline", sub: "Track every conversation", path: "/pipeline" },
  { id: 5, label: "Activate Partner", sub: "Close the deal and go live", path: "/pipeline" },
];

const AVG_PRICE_USD = 97;
const AVG_COMMISSION_PCT = 37.5;

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Hard: "bg-red-50 text-red-700 border-red-200",
};

const REVENUE_OPP_STYLE: Record<string, string> = {
  Exceptional: "text-emerald-700 font-bold",
  High: "text-blue-700 font-bold",
  Moderate: "text-amber-700 font-semibold",
  Low: "text-gray-600 font-semibold",
};

const TIER_BADGE: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 border-emerald-200",
  2: "bg-blue-100 text-blue-800 border-blue-200",
  3: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { creators, products, selectedProductId } = useAppContext();
  const [savedPlans, setSavedPlans] = useState<SavedOutreachPlan[]>([]);

  useEffect(() => {
    setSavedPlans(getSavedPlans());
  }, []);

  const handleDeletePlan = (id: string) => {
    deleteSavedPlan(id);
    setSavedPlans(getSavedPlans());
  };

  const creatorsByStage = (stage: PipelineStage) =>
    creators.filter((c) => c.pipelineStage === stage);

  const activeCreators = creatorsByStage("Active");
  const contactedCreators = creatorsByStage("Contacted");
  const interestedCreators = creatorsByStage("Interested");
  const topCreators = [...creators].sort((a, b) => b.fitScore - a.fitScore).slice(0, 5);

  const totalConversions = activeCreators.reduce((sum, c) => {
    return sum + estimateMonthlyConversions(c.followerCount, c.engagementRate);
  }, 0);
  const estRevenue = estimateMonthlyRevenue(totalConversions, AVG_PRICE_USD);
  const estProfit = estimateMonthlyProfit(estRevenue, AVG_COMMISSION_PCT);
  const estPartnerPayout = estRevenue - estProfit;

  const workflowProgress = [
    products.length > 0,
    creators.some((c) => c.pipelineStage !== "New"),
    contactedCreators.length > 0,
    interestedCreators.length > 0 || creatorsByStage("Negotiating").length > 0,
    activeCreators.length > 0,
  ];
  const completedSteps = workflowProgress.filter(Boolean).length;
  const currentStep = workflowProgress.findIndex((v) => !v);
  const progressPct = Math.round((completedSteps / 5) * 100);

  const bestNewCreator = [...creators]
    .filter((c) => c.pipelineStage === "New" && c.fitScore >= 80)
    .sort((a, b) => b.fitScore - a.fitScore)[0];
  const bestContactedCreator = contactedCreators.sort((a, b) => b.fitScore - a.fitScore)[0];

  let recommendationCreator = bestNewCreator ?? bestContactedCreator;
  let recommendationAction = "";
  let recommendationReason = "";

  if (bestNewCreator) {
    const opp = getOpportunityLevel(bestNewCreator.fitScore, bestNewCreator.competitiveConflict);
    recommendationAction = `Contact ${bestNewCreator.name} first`;
    recommendationReason = `${bestNewCreator.fitLabel} with a ${bestNewCreator.fitScore} Fit Score and ${opp.toLowerCase()} signal. Their audience is an ideal match — reach out before a competitor does.`;
  } else if (bestContactedCreator) {
    recommendationAction = `Follow up with ${bestContactedCreator.name}`;
    recommendationReason = `They've been contacted and have a ${bestContactedCreator.fitScore} Fit Score. A second touchpoint can move them to Interested — try a DM alongside your email.`;
  } else if (activeCreators.length > 0) {
    recommendationAction = "Review your active partners' performance";
    recommendationReason = `You have ${activeCreators.length} active partner${activeCreators.length > 1 ? "s" : ""} driving conversions. Check in, offer support, and consider upping their commission to keep them motivated.`;
  } else {
    recommendationAction = "Add your first product to get started";
    recommendationReason = "Without a product, creators have nothing to promote. Add one now and the system will score all creators against it automatically.";
  }

  const activeProduct =
    (selectedProductId ? products.find((p) => p.id === selectedProductId) : null) ??
    products[0] ??
    null;
  const partnerIntel = activeProduct ? generatePartnerIntelligence(activeProduct) : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your influencer partnership command center
          </p>
        </div>
        <Button
          onClick={() => setLocation("/products")}
          data-testid="button-start-campaign"
          className="flex-shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Product Campaign
        </Button>
      </div>

      {/* Revenue + AI Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 lg:col-span-1" data-testid="card-revenue-projection">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Revenue Projection
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {activeCreators.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">Activate a partner to see projections</p>
                <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setLocation("/discover")}>
                  Find Creators →
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Monthly Sales</p>
                  <p className="text-2xl font-bold text-foreground">{totalConversions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">conversions/mo from {activeCreators.length} partner{activeCreators.length > 1 ? "s" : ""}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Gross Revenue</p>
                    <p className="text-lg font-bold text-emerald-700">${estRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">/mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className="text-lg font-bold text-foreground">${estProfit.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">after {AVG_COMMISSION_PCT}% commissions</p>
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 border border-primary/15 px-3 py-2 text-xs text-primary font-medium">
                  Partner payouts ≈ ${estPartnerPayout.toLocaleString()}/mo — money well spent
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 lg:col-span-2" data-testid="card-ai-recommendation">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-amber-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Recommended Next Action
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-start gap-4">
              {recommendationCreator && (
                <img
                  src={recommendationCreator.avatarUrl}
                  alt={recommendationCreator.name}
                  className="w-12 h-12 rounded-full bg-muted flex-shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-base leading-snug">{recommendationAction}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{recommendationReason}</p>
                {recommendationCreator && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => setLocation(`/creator/${recommendationCreator!.id}`)}
                    >
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setLocation(`/outreach?creatorId=${recommendationCreator!.id}&channel=Email`)}
                    >
                      Generate Outreach
                    </Button>
                  </div>
                )}
              </div>
              {recommendationCreator && (
                <Badge
                  variant="outline"
                  className={`text-sm font-bold flex-shrink-0 border ${getFitScoreColorClasses(recommendationCreator.fitScore)}`}
                >
                  {recommendationCreator.fitScore}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Workflow */}
      <Card data-testid="card-campaign-workflow">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Campaign Workflow
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">{completedSteps}/5 steps</span>
              <div className="w-24">
                <Progress value={progressPct} className="h-1.5" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-start gap-1 overflow-x-auto pb-1">
            {WORKFLOW_STEPS.map((step, idx) => {
              const done = workflowProgress[idx];
              const active = currentStep === idx;
              return (
                <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setLocation(step.path)}
                    data-testid={`workflow-step-${step.id}`}
                    className={`flex flex-col items-center text-center px-4 py-3 rounded-xl border-2 transition-all min-w-[120px] ${
                      done
                        ? "border-emerald-200 bg-emerald-50"
                        : active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-muted/20 opacity-60"
                    }`}
                  >
                    <div className={`mb-1 ${done ? "text-emerald-600" : active ? "text-primary" : "text-muted-foreground"}`}>
                      {done ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${active ? "border-primary text-primary" : "border-muted-foreground/40 text-muted-foreground/40"}`}>
                          {step.id}
                        </div>
                      )}
                    </div>
                    <p className={`text-xs font-semibold leading-tight ${done ? "text-emerald-800" : active ? "text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 leading-tight">{step.sub}</p>
                  </button>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${done ? "text-emerald-400" : "text-muted-foreground/30"}`} />
                  )}
                </div>
              );
            })}
          </div>
          {currentStep >= 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-xs text-primary font-medium">
                Current step: <span className="font-bold">{WORKFLOW_STEPS[currentStep]?.label}</span> — {WORKFLOW_STEPS[currentStep]?.sub}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-xs text-primary h-6 px-2"
                onClick={() => setLocation(WORKFLOW_STEPS[currentStep].path)}
              >
                Go <ArrowRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ready To Contact — saved outreach plans */}
      {savedPlans.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/30" data-testid="card-ready-to-contact">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-emerald-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Ready To Contact
                <Badge className="text-xs bg-emerald-600 text-white ml-1">
                  {savedPlans.length}
                </Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-700 h-6 px-2"
                onClick={() => setLocation("/partner-strategy")}
              >
                Add more →
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Outreach plans you've saved — click any card to open all 5 messages.
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedPlans.map((plan) => {
                const planParams = new URLSearchParams({
                  partnerType: plan.partnerType,
                  commission: plan.commission,
                  outreachAngle: plan.outreachAngle,
                  tier: String(plan.tier),
                  icon: plan.icon ?? "",
                });
                const savedDate = new Date(plan.savedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div
                    key={plan.id}
                    className="flex flex-col gap-2 p-3 rounded-xl bg-background border border-emerald-200 hover:shadow-sm transition-shadow"
                    data-testid={`card-saved-plan-${plan.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {plan.icon && <span className="text-lg leading-none flex-shrink-0">{plan.icon}</span>}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground leading-tight truncate">
                            {plan.partnerType}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{plan.productName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-muted-foreground/50 hover:text-red-500 flex-shrink-0 transition-colors"
                        data-testid={`button-delete-plan-${plan.id}`}
                        title="Remove saved plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs border ${TIER_BADGE[plan.tier] ?? TIER_BADGE[1]}`}
                      >
                        Tier {plan.tier}
                      </Badge>
                      <span className="text-xs font-bold text-primary">{plan.commission}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5 ml-auto">
                        <Clock className="w-3 h-3" />
                        {savedDate}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      className="w-full text-xs gap-1.5 mt-1"
                      onClick={() => setLocation(`/partner-outreach?${planParams.toString()}`)}
                      data-testid={`button-open-plan-${plan.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open 5 Messages
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partner Discovery Intelligence */}
      {partnerIntel && activeProduct && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="card-partner-intelligence">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                Partner Discovery Intelligence — {activeProduct.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-6 px-2"
                onClick={() => setLocation("/partner-strategy")}
                data-testid="button-view-partner-strategy"
              >
                View Full Strategy →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="rounded-xl bg-background border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Top Partner Type</p>
                <p className="font-bold text-sm text-foreground leading-tight">{partnerIntel.topPartnerCategory}</p>
              </div>
              <div className="rounded-xl bg-background border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Recommended Commission</p>
                <p className="font-bold text-sm text-primary">{partnerIntel.recommendedCommission}</p>
              </div>
              <div className="rounded-xl bg-background border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Acquisition</p>
                <Badge
                  variant="outline"
                  className={`text-xs border ${DIFFICULTY_STYLE[partnerIntel.estimatedAcquisitionDifficulty]}`}
                >
                  {partnerIntel.estimatedAcquisitionDifficulty}
                </Badge>
              </div>
              <div className="rounded-xl bg-background border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Revenue Opportunity</p>
                <p className={`text-sm ${REVENUE_OPP_STYLE[partnerIntel.estimatedRevenueOpportunity]}`}>
                  {partnerIntel.estimatedRevenueOpportunity}
                </p>
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-background border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Best Audience Type</p>
                <p className="text-sm text-foreground leading-relaxed">{partnerIntel.bestAudienceType}</p>
              </div>
              <Button
                size="sm"
                className="flex-shrink-0 text-xs gap-1.5"
                onClick={() => setLocation("/partner-strategy")}
                data-testid="button-view-recommended-partners"
              >
                <Users className="w-3.5 h-3.5" />
                View Recommended Partners
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Intelligence Preview */}
      {products.length > 0 && (() => {
        const prod = products.find((p) => p.id === selectedProductId) ?? products[0];
        if (!prod?.mainMarket) return null;
        return (
          <Card data-testid="card-product-intel-preview">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Product Intelligence — {prod.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-6 px-2"
                  onClick={() => setLocation("/products")}
                >
                  Full Report →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <ProductIntelligencePreview product={prod} />
            </CardContent>
          </Card>
        );
      })()}

      {/* Top Opportunities + Pipeline Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" data-testid="card-top-opportunities">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Top Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
            {topCreators.map((creator) => {
              const opp = getOpportunityLevel(creator.fitScore, creator.competitiveConflict);
              const oppColor =
                opp === "Strong Opportunity"
                  ? "text-emerald-700 bg-emerald-50"
                  : opp === "Moderate Opportunity"
                  ? "text-amber-700 bg-amber-50"
                  : "text-gray-600 bg-gray-50";
              return (
                <div
                  key={creator.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/creator/${creator.id}`)}
                  data-testid={`card-top-creator-${creator.id}`}
                >
                  <img
                    src={creator.avatarUrl}
                    alt={creator.name}
                    className="w-9 h-9 rounded-full bg-muted flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{creator.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {creator.niche} · {formatFollowers(creator.followerCount)} followers
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${oppColor}`}>
                      {opp}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs border ${getPlatformColor(creator.platform)}`}
                    >
                      {creator.platform}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-sm font-bold border ${getFitScoreColorClasses(creator.fitScore)}`}
                    >
                      {creator.fitScore}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getStageColor(creator.pipelineStage)}`}
                    >
                      {creator.pipelineStage}
                    </Badge>
                  </div>
                </div>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 text-xs text-primary"
              onClick={() => setLocation("/discover")}
            >
              View all {creators.length} creators →
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1" data-testid="card-pipeline-summary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {STAGES.map((stage) => {
              const count = creatorsByStage(stage).length;
              const barPct = creators.length > 0 ? (count / creators.length) * 100 : 0;
              return (
                <div
                  key={stage}
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/40 rounded-lg px-2 py-1.5 transition-colors"
                  onClick={() => setLocation("/pipeline")}
                  data-testid={`pipeline-stage-${stage.toLowerCase()}`}
                >
                  <Badge variant="outline" className={`text-xs w-20 justify-center ${getStageColor(stage)}`}>
                    {stage}
                  </Badge>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold w-6 text-right ${count > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                    {count}
                  </span>
                </div>
              );
            })}

            <Separator className="my-2" />
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold">{activeCreators.length} Active Partners</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-6"
                onClick={() => setLocation("/pipeline")}
              >
                Open →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
