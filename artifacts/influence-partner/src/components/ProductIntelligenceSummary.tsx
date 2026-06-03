import { Product, CreatorCategoryRec } from "@/types/influencePartner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPlatformColor } from "@/lib/utils/format";
import {
  Globe2,
  Users,
  Tag,
  Layers,
  Megaphone,
  TrendingUp,
  AlertTriangle,
  Swords,
  Trophy,
  DollarSign,
  UserPlus,
  Lightbulb,
  Target,
  Zap,
  BarChart2,
} from "lucide-react";

const FIT_LEVEL_STYLES: Record<CreatorCategoryRec["fitLevel"], string> = {
  Primary: "bg-primary text-primary-foreground border-primary",
  Secondary: "bg-blue-100 text-blue-800 border-blue-200",
  Tertiary: "bg-muted text-muted-foreground border-border",
};

function RatingPill({ value }: { value: string | undefined }) {
  if (!value) return null;
  const styles: Record<string, string> = {
    Exceptional: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Strong: "bg-blue-100 text-blue-800 border-blue-200",
    Moderate: "bg-amber-100 text-amber-800 border-amber-200",
    Weak: "bg-red-100 text-red-700 border-red-200",
    Low: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Medium: "bg-amber-100 text-amber-800 border-amber-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    "Very High": "bg-red-100 text-red-700 border-red-200",
    Fragmented: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Competitive: "bg-orange-100 text-orange-800 border-orange-200",
    Saturated: "bg-red-100 text-red-700 border-red-200",
    "Very High Revenue": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "High Revenue": "bg-blue-100 text-blue-800 border-blue-200",
    "Medium Revenue": "bg-amber-100 text-amber-800 border-amber-200",
    Emerging: "bg-gray-100 text-gray-700 border-gray-200",
  };
  const style = styles[value] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`text-xs font-bold border px-2 py-0.5 ${style}`}>
      {value}
    </Badge>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
    </div>
  );
}

function IntelCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`border border-border ${className}`}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function ProductIntelligenceSummary({ product }: { product: Product }) {
  const hasIntelligence = !!(product.mainMarket);

  if (!hasIntelligence) {
    return (
      <Card className="border-dashed border-2 border-border bg-muted/20">
        <CardContent className="py-10 text-center">
          <BarChart2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">No intelligence data yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Fill in the product form and click Analyze Product to generate your intelligence report.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="product-intelligence-summary">

      {/* ── 1. Intelligence Summary header ── */}
      <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm font-bold text-primary">Product Intelligence Summary</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Strategic analysis for <span className="font-semibold text-foreground">{product.name}</span> — use this to guide your creator recruitment and outreach strategy.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <RatingPill value={product.campaignOpportunityRating} />
          {product.revenuePotentialLabel && (
            <span className="text-xs text-muted-foreground font-medium">{product.revenuePotentialLabel} revenue potential</span>
          )}
        </div>
      </div>

      {/* ── Row 1: Market + Buyer Persona ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 2. Main Market */}
        <IntelCard>
          <SectionHeader icon={Globe2} title="Main Market" />
          <p className="text-sm font-semibold text-foreground leading-snug">{product.mainMarket}</p>
          {product.subMarket && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1.5">
                Sub-Markets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.subMarket.split("·").map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s.trim()}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </IntelCard>

        {/* 3. Buyer Persona */}
        {product.buyerPersona && (
          <IntelCard>
            <SectionHeader icon={Users} title="Buyer Persona" />
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age Range</span>
                <span className="font-semibold">{product.buyerPersona.age}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gender Split</span>
                <span className="font-semibold">{product.buyerPersona.gender}</span>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1.5">Key Interests</p>
                <div className="flex flex-wrap gap-1">
                  {product.buyerPersona.interests.slice(0, 4).map((i) => (
                    <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1.5">Pain Points</p>
                <div className="flex flex-wrap gap-1">
                  {product.buyerPersona.painPoints.slice(0, 3).map((p) => (
                    <Badge key={p} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">{p}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </IntelCard>
        )}
      </div>

      {/* ── 4. Recommended Creator Categories ── */}
      {product.recommendedCreatorCategories && product.recommendedCreatorCategories.length > 0 && (
        <IntelCard>
          <SectionHeader icon={Tag} title="Recommended Creator Categories" />
          <div className="space-y-2.5">
            {product.recommendedCreatorCategories.map((cat) => (
              <div key={cat.category} className="flex items-start gap-3">
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold border flex-shrink-0 mt-0.5 ${FIT_LEVEL_STYLES[cat.fitLevel]}`}
                >
                  {cat.fitLevel}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{cat.category}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cat.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </IntelCard>
      )}

      {/* ── Row 2: Platforms + Commission ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 5. Recommended Platforms */}
        {product.recommendedPlatforms && (
          <IntelCard>
            <SectionHeader icon={Layers} title="Recommended Platforms" />
            <div className="flex flex-wrap gap-2">
              {product.recommendedPlatforms.map((p) => (
                <Badge key={p} variant="outline" className={`border text-sm font-semibold ${getPlatformColor(p)}`}>
                  {p}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              These platforms have the highest density of creators matching your buyer persona.
            </p>
          </IntelCard>
        )}

        {/* 6. Recommended Commission Range */}
        {product.recommendedCommissionRange && (
          <IntelCard>
            <SectionHeader icon={DollarSign} title="Recommended Commission Range" />
            <p className="text-3xl font-black text-primary">{product.recommendedCommissionRange}</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Significantly above the industry average of 5–10%. This is your competitive advantage — creators will prioritise your product over lower-commission offers.
            </p>
          </IntelCard>
        )}
      </div>

      {/* ── 7. Outreach Angle ── */}
      {product.outreachAngle && (
        <IntelCard className="border-amber-200 bg-amber-50/40">
          <SectionHeader icon={Megaphone} title="Recommended Outreach Angle" />
          <p className="text-sm text-foreground leading-relaxed">{product.outreachAngle}</p>
        </IntelCard>
      )}

      {/* ── Row 3: Revenue + Partner Acquisition ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 8. Revenue Potential */}
        {product.revenuePotentialMonthly && (
          <IntelCard className="border-emerald-200 bg-emerald-50/30">
            <SectionHeader icon={TrendingUp} title="Revenue Potential Estimate" />
            <div className="flex items-end gap-2 mb-2">
              <p className="text-2xl font-black text-emerald-700">{product.revenuePotentialMonthly}</p>
              <RatingPill value={product.revenuePotentialLabel} />
            </div>
            {product.revenuePotentialReason && (
              <p className="text-xs text-muted-foreground leading-relaxed">{product.revenuePotentialReason}</p>
            )}
          </IntelCard>
        )}

        {/* 9. Partner Acquisition Potential */}
        {product.estimatedPartnerAcquisitionPotential && (
          <IntelCard>
            <SectionHeader icon={UserPlus} title="Est. Partner Acquisition Potential" />
            <p className="text-sm font-bold text-foreground mb-2">{product.estimatedPartnerAcquisitionPotential}</p>
            {product.partnerAcquisitionReason && (
              <p className="text-xs text-muted-foreground leading-relaxed">{product.partnerAcquisitionReason}</p>
            )}
          </IntelCard>
        )}
      </div>

      {/* ── Row 4: Market difficulty + Competition + Campaign Rating ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 10. Market Difficulty */}
        {product.marketDifficulty && (
          <IntelCard>
            <SectionHeader icon={AlertTriangle} title="Market Difficulty" />
            <div className="mb-2">
              <RatingPill value={product.marketDifficulty} />
            </div>
            {product.marketDifficultyReason && (
              <p className="text-xs text-muted-foreground leading-relaxed">{product.marketDifficultyReason}</p>
            )}
          </IntelCard>
        )}

        {/* 11. Competition Level */}
        {product.competitionLevel && (
          <IntelCard>
            <SectionHeader icon={Swords} title="Competition Level" />
            <div className="mb-2">
              <RatingPill value={product.competitionLevel} />
            </div>
            {product.competitionReason && (
              <p className="text-xs text-muted-foreground leading-relaxed">{product.competitionReason}</p>
            )}
          </IntelCard>
        )}

        {/* 12. Campaign Opportunity Rating */}
        {product.campaignOpportunityRating && (
          <IntelCard>
            <SectionHeader icon={Trophy} title="Campaign Opportunity" />
            <div className="mb-2">
              <RatingPill value={product.campaignOpportunityRating} />
            </div>
            {product.campaignOpportunityReason && (
              <p className="text-xs text-muted-foreground leading-relaxed">{product.campaignOpportunityReason}</p>
            )}
          </IntelCard>
        )}
      </div>

      {/* ── 13. Why We Chose These Creators ── */}
      {product.whyTheseCreators && (
        <IntelCard className="border-blue-200 bg-blue-50/30">
          <SectionHeader icon={Lightbulb} title="Why We Chose These Creators" />
          <p className="text-sm text-foreground leading-relaxed">{product.whyTheseCreators}</p>
        </IntelCard>
      )}
    </div>
  );
}

// ─── Compact version for Dashboard ───────────────────────────────────────────

export function ProductIntelligencePreview({ product }: { product: Product }) {
  if (!product.mainMarket) return null;

  return (
    <div className="space-y-3" data-testid="intel-preview">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Opportunity</p>
          <RatingPill value={product.campaignOpportunityRating} />
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Competition</p>
          <RatingPill value={product.competitionLevel} />
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Difficulty</p>
          <RatingPill value={product.marketDifficulty} />
        </div>
      </div>
      {product.recommendedPlatforms && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground shrink-0">Best platforms:</span>
          <div className="flex gap-1 flex-wrap">
            {product.recommendedPlatforms.map((p) => (
              <Badge key={p} variant="outline" className={`text-xs border ${getPlatformColor(p)}`}>{p}</Badge>
            ))}
          </div>
        </div>
      )}
      {product.recommendedCommissionRange && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground shrink-0">Commission range:</span>
          <span className="font-bold text-primary">{product.recommendedCommissionRange}</span>
        </div>
      )}
      {product.estimatedPartnerAcquisitionPotential && (
        <div className="flex items-center gap-2 text-xs">
          <Target className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">{product.estimatedPartnerAcquisitionPotential}</span>
        </div>
      )}
    </div>
  );
}
