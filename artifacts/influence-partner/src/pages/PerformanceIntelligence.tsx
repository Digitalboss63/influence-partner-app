import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  TrendingUp,
  HelpCircle,
  Users,
  Mail,
  MessageSquare,
  ArrowRight,
  Star,
  DollarSign,
  BarChart2,
  Zap,
  Edit3,
  CheckCircle2,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import {
  getPerformanceOverview,
  getCreatorPerformance,
  getProductPerformance,
  getChannelPerformance,
  getPerformanceInsights,
  updateCreatorRevenue,
  updateProductRevenue,
  type ApiPerformanceOverview,
  type ApiCreatorPerformance,
  type ApiProductPerformance,
  type ApiChannelPerformance,
  type ApiPerformanceInsight,
} from "@/lib/api-client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctBar(value: number, max = 100) {
  const w = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100);
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary/70 rounded-full transition-all"
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function ConvBadge({ value }: { value: number }) {
  const color =
    value >= 20
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : value >= 10
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : value >= 5
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-muted text-muted-foreground border-muted-foreground/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {value}%
    </span>
  );
}

function fmt$(v: number | null) {
  if (v === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

// ─── Revenue Entry ────────────────────────────────────────────────────────────

function RevenueEditor({
  label,
  estimated,
  actual,
  onSave,
  onClose,
}: {
  label: string;
  estimated: number | null;
  actual: number | null;
  onSave: (est: number | null, act: number | null) => void;
  onClose: () => void;
}) {
  const [est, setEst] = useState(estimated !== null ? String(estimated) : "");
  const [act, setAct] = useState(actual !== null ? String(actual) : "");

  return (
    <div className="mt-2 space-y-2 text-sm border rounded-lg p-3 bg-muted/20">
      <p className="font-medium text-xs text-muted-foreground">Edit revenue for {label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Estimated ($)</label>
          <input
            type="number"
            className="w-full border rounded-md px-2 py-1 text-sm bg-background"
            value={est}
            onChange={(e) => setEst(e.target.value)}
            placeholder="0"
            min="0"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Actual ($)</label>
          <input
            type="number"
            className="w-full border rounded-md px-2 py-1 text-sm bg-background"
            value={act}
            onChange={(e) => setAct(e.target.value)}
            placeholder="0"
            min="0"
          />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          onClick={() =>
            onSave(
              est !== "" ? parseFloat(est) : null,
              act !== "" ? parseFloat(act) : null,
            )
          }
        >
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Summary tile ─────────────────────────────────────────────────────────────

function Tile({
  label,
  value,
  sub,
  color = "text-foreground",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  channel: Mail,
  creator: Star,
  funnel: BarChart2,
  priority: Zap,
};

function InsightCard({ insight }: { insight: ApiPerformanceInsight }) {
  const Icon = INSIGHT_ICONS[insight.type] ?? TrendingUp;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
    </div>
  );
}

// ─── Creator Row ──────────────────────────────────────────────────────────────

function CreatorRow({
  row,
  rank,
  productId,
}: {
  row: ApiCreatorPerformance;
  rank: number;
  productId: string | null;
}) {
  const [editRevenue, setEditRevenue] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: { estimatedRevenue: number | null; actualRevenue: number | null }) =>
      updateCreatorRevenue({
        creatorName: row.creatorName,
        productId: productId ?? undefined,
        estimatedRevenue: payload.estimatedRevenue ?? undefined,
        actualRevenue: payload.actualRevenue ?? undefined,
      }),
    onSuccess: () => {
      toast({ title: "Revenue saved" });
      qc.invalidateQueries({ queryKey: ["perf-creators"] });
      qc.invalidateQueries({ queryKey: ["perf-overview"] });
      setEditRevenue(false);
    },
    onError: (e) => toast({ title: String(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
        {/* Rank */}
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            rank === 1 ? "bg-amber-100 text-amber-700" :
            rank === 2 ? "bg-slate-100 text-slate-600" :
            rank === 3 ? "bg-orange-100 text-orange-700" :
            "bg-muted text-muted-foreground"
          }`}
        >
          {rank}
        </span>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{row.creatorName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {pctBar(row.conversionRate, 100)}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
          <div className="text-center hidden sm:block">
            <div className="font-semibold text-foreground">{row.sent}</div>
            <div>Sent</div>
          </div>
          <div className="text-center hidden sm:block">
            <div className="font-semibold text-foreground">{row.replied}</div>
            <div>Replies</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-emerald-700">{row.converted}</div>
            <div>Conv.</div>
          </div>
          <ConvBadge value={row.conversionRate} />
          <div className="text-center min-w-[64px]">
            <div className="font-semibold text-foreground">{fmt$(row.actualRevenue ?? row.estimatedRevenue)}</div>
            <div>{row.actualRevenue !== null ? "Actual" : row.estimatedRevenue !== null ? "Est." : "Revenue"}</div>
          </div>
          <button
            className="text-primary hover:text-primary/70 ml-1"
            onClick={() => setEditRevenue((o) => !o)}
            title="Edit revenue"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {editRevenue && (
        <div className="px-3">
          <RevenueEditor
            label={row.creatorName}
            estimated={row.estimatedRevenue}
            actual={row.actualRevenue}
            onSave={(est, act) => mutation.mutate({ estimatedRevenue: est, actualRevenue: act })}
            onClose={() => setEditRevenue(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Funnel Visualization ─────────────────────────────────────────────────────

function FunnelViz({ overview }: { overview: ApiPerformanceOverview }) {
  return (
    <div className="space-y-2">
      {overview.funnel.map((step, idx) => {
        const prev = overview.funnel[idx - 1];
        const isConversion = idx > 0;
        return (
          <div key={step.stage} className="flex items-center gap-3">
            {isConversion && (
              <div className="flex flex-col items-center w-6 flex-shrink-0">
                <div className="w-0.5 h-3 bg-muted-foreground/20" />
              </div>
            )}
            <div className={`flex-1 ${isConversion ? "ml-0" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{step.stage}</span>
                <div className="flex items-center gap-2">
                  {isConversion && prev && (
                    <span className="text-xs text-muted-foreground">
                      {step.pct}% of prev
                    </span>
                  )}
                  <span className={`text-sm font-bold ${step.count > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                    {step.count}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    idx === 0 ? "bg-muted-foreground/40" :
                    idx === overview.funnel.length - 1 ? "bg-primary" :
                    "bg-primary/60"
                  }`}
                  style={{
                    width: `${overview.total > 0 ? Math.max((step.count / overview.total) * 100, step.count > 0 ? 2 : 0) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Channel Row ──────────────────────────────────────────────────────────────

function ChannelRow({ ch }: { ch: ApiChannelPerformance }) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30">
      <div className="w-32 flex-shrink-0">
        <p className="text-sm font-medium truncate">{ch.channel}</p>
        <p className="text-xs text-muted-foreground">{ch.total} total</p>
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs w-14 text-muted-foreground">Reply</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500/60 rounded-full"
              style={{ width: `${Math.min(ch.replyRate, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium w-10 text-right">{ch.replyRate}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-14 text-muted-foreground">Convert</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full"
              style={{ width: `${Math.min(ch.conversionRate, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium w-10 text-right">{ch.conversionRate}%</span>
        </div>
      </div>
      <div className="text-center flex-shrink-0 w-12">
        <div className="text-lg font-bold text-emerald-700">{ch.converted}</div>
        <div className="text-xs text-muted-foreground">Conv.</div>
      </div>
    </div>
  );
}

// ─── Product Row ──────────────────────────────────────────────────────────────

function ProductRow({ row }: { row: ApiProductPerformance }) {
  const [editRevenue, setEditRevenue] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: { estimatedRevenue: number | null; actualRevenue: number | null }) =>
      updateProductRevenue({
        productId: row.productId,
        estimatedRevenue: payload.estimatedRevenue ?? undefined,
        actualRevenue: payload.actualRevenue ?? undefined,
      }),
    onSuccess: () => {
      toast({ title: "Revenue saved" });
      qc.invalidateQueries({ queryKey: ["perf-products"] });
      qc.invalidateQueries({ queryKey: ["perf-overview"] });
      setEditRevenue(false);
    },
    onError: (e) => toast({ title: String(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30">
        <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{row.productName}</p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{row.total} outreach</span>
            <span>·</span>
            <span>{row.replyRate}% reply</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center hidden sm:block">
            <div className="text-sm font-bold text-emerald-700">{row.converted}</div>
            <div className="text-xs text-muted-foreground">Conv.</div>
          </div>
          <ConvBadge value={row.conversionRate} />
          <div className="text-sm font-medium min-w-[60px] text-right">
            {fmt$(row.actualRevenue ?? row.estimatedRevenue)}
          </div>
          <button
            className="text-primary hover:text-primary/70"
            onClick={() => setEditRevenue((o) => !o)}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {editRevenue && (
        <div className="px-3">
          <RevenueEditor
            label={row.productName}
            estimated={row.estimatedRevenue}
            actual={row.actualRevenue}
            onSave={(est, act) => mutation.mutate({ estimatedRevenue: est, actualRevenue: act })}
            onClose={() => setEditRevenue(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformanceIntelligence() {
  const { products, selectedProductId, setSelectedProductId } = useAppContext();
  const [showAllCreators, setShowAllCreators] = useState(false);

  const { data: overview } = useQuery<ApiPerformanceOverview>({
    queryKey: ["perf-overview", selectedProductId],
    queryFn: () => getPerformanceOverview(selectedProductId ?? undefined),
    staleTime: 15_000,
  });

  const { data: creators = [] } = useQuery<ApiCreatorPerformance[]>({
    queryKey: ["perf-creators", selectedProductId],
    queryFn: () => getCreatorPerformance(selectedProductId ?? undefined),
    staleTime: 15_000,
  });

  const { data: products_perf = [] } = useQuery<ApiProductPerformance[]>({
    queryKey: ["perf-products"],
    queryFn: () => getProductPerformance(),
    staleTime: 15_000,
  });

  const { data: channels = [] } = useQuery<ApiChannelPerformance[]>({
    queryKey: ["perf-channels", selectedProductId],
    queryFn: () => getChannelPerformance(selectedProductId ?? undefined),
    staleTime: 15_000,
  });

  const { data: insights = [] } = useQuery<ApiPerformanceInsight[]>({
    queryKey: ["perf-insights", selectedProductId],
    queryFn: () => getPerformanceInsights(selectedProductId ?? undefined),
    staleTime: 30_000,
  });

  const visibleCreators = showAllCreators ? creators : creators.slice(0, 10);

  const hasData = (overview?.total ?? 0) > 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Performance Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Measure which creators, channels, and products drive real partnership results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/help/performance-intelligence">
            <Button variant="outline" size="sm" className="gap-1.5">
              <HelpCircle className="w-4 h-4" />
              How It Works
            </Button>
          </Link>
        </div>
      </div>

      {/* Product filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Product:</span>
        <select
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
          value={selectedProductId ?? ""}
          onChange={(e) => setSelectedProductId(e.target.value || null)}
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Summary tiles */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Tile label="Total Operations" value={overview.total} icon={Users} />
          <Tile label="Sent" value={overview.sent} icon={Mail} />
          <Tile label="Reply Rate" value={`${overview.replyRate}%`} color={overview.replyRate >= 30 ? "text-emerald-700" : "text-foreground"} icon={MessageSquare} />
          <Tile label="Conversions" value={overview.converted} color={overview.converted > 0 ? "text-emerald-700" : "text-foreground"} icon={CheckCircle2} />
          <Tile label="Conv. Rate" value={`${overview.conversionRate}%`} color={overview.conversionRate >= 10 ? "text-emerald-700" : "text-foreground"} icon={TrendingUp} />
          <Tile
            label="Total Revenue"
            value={fmt$(overview.totalActualRevenue > 0 ? overview.totalActualRevenue : overview.totalEstimatedRevenue > 0 ? overview.totalEstimatedRevenue : null)}
            sub={overview.totalActualRevenue > 0 ? "actual" : overview.totalEstimatedRevenue > 0 ? "estimated" : undefined}
            icon={DollarSign}
          />
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Insights
              <span className="text-xs font-normal text-muted-foreground ml-1">Rule-based analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins, i) => (
              <InsightCard key={i} insight={ins} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Funnel Conversion Analysis */}
        <Card data-testid="card-funnel-analysis">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Funnel Conversion Analysis
              <span className="text-xs font-normal text-muted-foreground ml-1">Attribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview && hasData ? (
              <FunnelViz overview={overview} />
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No outreach data yet. Start creating operations to see funnel metrics.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Analysis */}
        <Card data-testid="card-channel-analysis">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Channel Analysis
              <span className="text-xs font-normal text-muted-foreground ml-1">Email vs DM vs LinkedIn</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {channels.length > 0 ? (
              <div className="space-y-1">
                {channels.map((ch) => (
                  <ChannelRow key={ch.channel} ch={ch} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No channel data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Creator Leaderboard */}
      <Card data-testid="card-creator-leaderboard">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            Creator Leaderboard
            <span className="text-xs font-normal text-muted-foreground ml-1">Ranked by conversions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creators.length > 0 ? (
            <div className="space-y-0.5">
              {/* Table header */}
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground font-medium border-b border-border mb-1">
                <span className="w-6">#</span>
                <span className="flex-1">Creator</span>
                <div className="flex items-center gap-4 flex-shrink-0 mr-10">
                  <span className="w-8 text-center">Sent</span>
                  <span className="w-12 text-center">Replies</span>
                  <span className="w-10 text-center">Conv.</span>
                  <span className="w-16 text-center">Rate</span>
                  <span className="w-16 text-center">Revenue</span>
                </div>
              </div>
              {visibleCreators.map((row, i) => (
                <CreatorRow
                  key={row.creatorName}
                  row={row}
                  rank={i + 1}
                  productId={selectedProductId}
                />
              ))}
              {creators.length > 10 && (
                <button
                  className="w-full text-xs text-primary hover:underline py-2 flex items-center justify-center gap-1"
                  onClick={() => setShowAllCreators((o) => !o)}
                >
                  {showAllCreators ? (
                    <><ChevronUp className="w-3 h-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> Show all {creators.length} creators</>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No creator performance data yet.</p>
              <p className="mt-1">Create outreach operations to start tracking creator metrics.</p>
              <Link href="/outreach-operations">
                <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                  Go to Outreach Operations
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Performance */}
      <Card data-testid="card-product-performance">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Product Performance
            <span className="text-xs font-normal text-muted-foreground ml-1">Campaigns</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products_perf.length > 0 ? (
            <div className="space-y-1">
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground font-medium border-b border-border mb-1">
                <span className="flex-1">Product</span>
                <div className="flex items-center gap-3 flex-shrink-0 mr-10">
                  <span className="w-12 text-center">Conv.</span>
                  <span className="w-16 text-center">Rate</span>
                  <span className="w-16 text-right">Revenue</span>
                </div>
              </div>
              {products_perf.map((row) => (
                <ProductRow key={row.productId} row={row} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No product performance data yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Tracking note */}
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Revenue Tracking</p>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue is manually entered. Click the <Edit3 className="w-3 h-3 inline" /> icon next to any creator or product to enter estimated and actual revenue values.
                No payment integrations are used — this is for your own tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
