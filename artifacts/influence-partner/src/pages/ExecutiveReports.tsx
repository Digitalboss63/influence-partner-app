import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileBarChart,
  HelpCircle,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  Mail,
  Download,
  Plus,
  Trash2,
  Edit3,
  Zap,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import {
  getReportsSummary,
  getReportsTrends,
  getReportsInsights,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getCreatorPerformance,
  getProductPerformance,
  getChannelPerformance,
  type ApiReportsSummary,
  type ApiTrendPoint,
  type ApiReportsInsight,
  type ApiGoal,
  type GoalType,
  type ApiCreatorPerformance,
  type ApiProductPerformance,
  type ApiChannelPerformance,
} from "@/lib/api-client";

// ─── CSV Export ───────────────────────────────────────────────────────────────

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const escape = (v: string | number | null) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const content = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(v: number | null) {
  if (v === null || v === 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function Delta({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null) return null;
  const pos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pos ? "text-emerald-600" : "text-red-500"}`}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? "+" : ""}{Math.round(value)}{suffix}
    </span>
  );
}

const GOAL_LABELS: Record<GoalType, string> = {
  creators_contacted: "Creators Contacted",
  replies: "Replies",
  interested: "Interested",
  negotiations: "Negotiations",
  conversions: "Conversions",
  estimated_revenue: "Estimated Revenue ($)",
  actual_revenue: "Actual Revenue ($)",
};

const GOAL_TYPES: GoalType[] = [
  "creators_contacted", "replies", "interested", "negotiations",
  "conversions", "estimated_revenue", "actual_revenue",
];

function statusConfig(status: string) {
  if (status === "achieved") return { color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2, label: "Achieved" };
  if (status === "on_track") return { color: "text-blue-700 bg-blue-50 border-blue-200", icon: Clock, label: "On Track" };
  return { color: "text-red-700 bg-red-50 border-red-200", icon: AlertCircle, label: "Behind" };
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number | null;
  icon?: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
          </span>
          {delta !== undefined && <Delta value={delta ?? null} />}
        </div>
        <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onDelete, onEdit }: { goal: ApiGoal; onDelete: (id: string) => void; onEdit: (id: string, target: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [targetInput, setTargetInput] = useState(String(goal.targetValue));
  const { color, icon: StatusIcon, label: statusLabel } = statusConfig(goal.status);
  const isRevenue = goal.goalType.includes("revenue");

  const fmtValue = (v: number) =>
    isRevenue ? fmt$(v) : v.toLocaleString();

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{GOAL_LABELS[goal.goalType]}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs font-medium ${color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing((o) => !o)} className="text-muted-foreground hover:text-foreground p-1">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(goal.id)} className="text-muted-foreground hover:text-destructive p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{fmtValue(goal.currentValue)} current</span>
          <span className="font-medium text-foreground">{goal.pctComplete}%</span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              goal.status === "achieved" ? "bg-emerald-500" :
              goal.status === "on_track" ? "bg-blue-500" : "bg-red-400"
            }`}
            style={{ width: `${Math.min(goal.pctComplete, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{fmtValue(goal.remaining)} remaining</span>
          <span>Target: {fmtValue(goal.targetValue)}</span>
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <label className="text-xs text-muted-foreground w-20">New target:</label>
          <input
            type="number"
            className="flex-1 border rounded-md px-2 py-1 text-sm bg-background"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            min="0"
          />
          <Button
            size="sm"
            onClick={() => {
              onEdit(goal.id, parseFloat(targetInput));
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Add Goal Form ────────────────────────────────────────────────────────────

function AddGoalForm({ onAdd, onClose }: { onAdd: (type: GoalType, target: number) => void; onClose: () => void }) {
  const [type, setType] = useState<GoalType>("conversions");
  const [target, setTarget] = useState("");

  return (
    <div className="rounded-lg border border-dashed border-primary/40 p-4 bg-primary/5 space-y-3">
      <p className="text-sm font-medium">New Goal</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Goal type</label>
          <select
            className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
            value={type}
            onChange={(e) => setType(e.target.value as GoalType)}
          >
            {GOAL_TYPES.map((t) => (
              <option key={t} value={t}>{GOAL_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Target value</label>
          <input
            type="number"
            className="w-full border rounded-md px-2 py-1 text-sm bg-background"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 10"
            min="1"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!target} onClick={() => onAdd(type, parseFloat(target))}>
          Add Goal
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

function InsightRow({ insight }: { insight: ApiReportsInsight }) {
  const priorityStyle = {
    high: "border-red-200 bg-red-50",
    medium: "border-amber-200 bg-amber-50",
    low: "border-emerald-200 bg-emerald-50",
  }[insight.priority];

  const Icon = insight.type === "goal" ? Target : insight.type === "channel" ? Mail : insight.type === "creator" ? Users : insight.type === "activity" ? TrendingUp : Zap;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${priorityStyle}`}>
      <div className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-foreground/60" />
      </div>
      <p className="text-sm leading-relaxed">{insight.text}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutiveReports() {
  const { products, selectedProductId, setSelectedProductId } = useAppContext();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [trendMonths, setTrendMonths] = useState<6 | 12>(6);

  const { data: summary } = useQuery<ApiReportsSummary>({
    queryKey: ["reports-summary", selectedProductId],
    queryFn: () => getReportsSummary(selectedProductId ?? undefined),
    staleTime: 15_000,
  });

  const { data: trends = [] } = useQuery<ApiTrendPoint[]>({
    queryKey: ["reports-trends", selectedProductId, trendMonths],
    queryFn: () => getReportsTrends(selectedProductId ?? undefined, trendMonths),
    staleTime: 15_000,
  });

  const { data: insights = [] } = useQuery<ApiReportsInsight[]>({
    queryKey: ["reports-insights", selectedProductId],
    queryFn: () => getReportsInsights(selectedProductId ?? undefined),
    staleTime: 30_000,
  });

  const { data: goals = [] } = useQuery<ApiGoal[]>({
    queryKey: ["reports-goals", selectedProductId],
    queryFn: () => getGoals(selectedProductId ?? undefined),
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

  const createGoalMutation = useMutation({
    mutationFn: ({ type, target }: { type: GoalType; target: number }) =>
      createGoal({ goalType: type, targetValue: target, productId: selectedProductId ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports-goals"] });
      setShowAddGoal(false);
      toast({ title: "Goal created" });
    },
    onError: (e) => toast({ title: String(e), variant: "destructive" }),
  });

  const editGoalMutation = useMutation({
    mutationFn: ({ id, target }: { id: string; target: number }) => updateGoal(id, { targetValue: target }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports-goals"] }); toast({ title: "Goal updated" }); },
    onError: (e) => toast({ title: String(e), variant: "destructive" }),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports-goals"] }); toast({ title: "Goal removed" }); },
    onError: (e) => toast({ title: String(e), variant: "destructive" }),
  });

  // CSV Export handlers
  function exportCreatorsCsv() {
    downloadCsv(
      "creator-performance.csv",
      ["Creator", "Sent", "Replied", "Interested", "Negotiating", "Converted", "Conv. Rate %", "Est. Revenue", "Actual Revenue"],
      creators.map((c) => [
        c.creatorName, c.sent, c.replied, c.interested, c.negotiating, c.converted,
        c.conversionRate, c.estimatedRevenue, c.actualRevenue,
      ]),
    );
    toast({ title: "Creator performance exported" });
  }

  function exportProductsCsv() {
    downloadCsv(
      "product-performance.csv",
      ["Product", "Total Ops", "Sent", "Replied", "Converted", "Conv. Rate %", "Est. Revenue", "Actual Revenue"],
      products_perf.map((p) => [
        p.productName, p.total, p.sent, p.replied, p.converted,
        p.conversionRate, p.estimatedRevenue, p.actualRevenue,
      ]),
    );
    toast({ title: "Product performance exported" });
  }

  function exportRevenueCsv() {
    const rows: (string | number | null)[][] = [];
    rows.push(["Creator Name", "Estimated Revenue", "Actual Revenue"]);
    for (const c of creators) {
      if (c.estimatedRevenue !== null || c.actualRevenue !== null) {
        rows.push([c.creatorName, c.estimatedRevenue, c.actualRevenue]);
      }
    }
    rows.push(["", "", ""]);
    rows.push(["Product Name", "Estimated Revenue", "Actual Revenue"]);
    for (const p of products_perf) {
      if (p.estimatedRevenue !== null || p.actualRevenue !== null) {
        rows.push([p.productName, p.estimatedRevenue, p.actualRevenue]);
      }
    }
    const totalEst = creators.reduce((s, c) => s + (c.estimatedRevenue ?? 0), 0);
    const totalAct = creators.reduce((s, c) => s + (c.actualRevenue ?? 0), 0);
    rows.push(["", "", ""]);
    rows.push(["TOTALS", totalEst, totalAct]);
    downloadCsv("revenue-report.csv", rows[0] as string[], rows.slice(1));
    toast({ title: "Revenue report exported" });
  }

  function exportSummaryCsv() {
    if (!summary) return;
    downloadCsv(
      "executive-summary.csv",
      ["Metric", "Value"],
      [
        ["Total Operations", summary.totalOps],
        ["Sent", summary.sent],
        ["Replied", summary.replied],
        ["Interested", summary.interested],
        ["Negotiations", summary.negotiations],
        ["Conversions", summary.conversions],
        ["Reply Rate %", summary.replyRate],
        ["Conversion Rate %", summary.conversionRate],
        ["Active Creators", summary.activeCreators],
        ["Products", summary.productCount],
        ["Total Estimated Revenue", summary.totalEstimatedRevenue],
        ["Total Actual Revenue", summary.totalActualRevenue],
        ["Goals Count", goals.length],
        ["Goals Achieved", goals.filter((g) => g.status === "achieved").length],
      ],
    );
    toast({ title: "Executive summary exported" });
  }

  const hasTrendData = trends.some((t) => t.total > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-primary" />
            Executive Reports
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Goal tracking, conversion trends, and exportable performance summaries.
          </p>
        </div>
        <Link href="/help/executive-reporting">
          <Button variant="outline" size="sm" className="gap-1.5">
            <HelpCircle className="w-4 h-4" />
            How It Works
          </Button>
        </Link>
      </div>

      {/* Product filter */}
      <div className="flex items-center gap-3 flex-wrap">
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
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Export:</span>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportSummaryCsv}>
            <Download className="w-3.5 h-3.5" />
            Summary
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCreatorsCsv}>
            <Download className="w-3.5 h-3.5" />
            Creators
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportProductsCsv}>
            <Download className="w-3.5 h-3.5" />
            Products
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportRevenueCsv}>
            <Download className="w-3.5 h-3.5" />
            Revenue
          </Button>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Executive Summary
          <span className="text-xs font-normal text-muted-foreground">Last 30 days vs prior 30 days</span>
        </h2>
        {summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KpiTile label="Operations" value={summary.totalOps} icon={FileBarChart} />
            <KpiTile
              label="Sent"
              value={summary.sent}
              delta={summary.periodComparison.recentSent - summary.periodComparison.priorSent}
              icon={Mail}
            />
            <KpiTile
              label="Replies"
              value={summary.replied}
              delta={summary.periodComparison.recentReplied - summary.periodComparison.priorReplied}
              icon={Mail}
            />
            <KpiTile
              label="Conversions"
              value={summary.conversions}
              delta={summary.periodComparison.recentConversions - summary.periodComparison.priorConversions}
              icon={CheckCircle2}
              highlight
            />
            <KpiTile
              label="Reply Rate"
              value={`${summary.replyRate}%`}
              delta={summary.periodComparison.replyRateDelta}
              icon={TrendingUp}
            />
            <KpiTile
              label="Conv. Rate"
              value={`${summary.conversionRate}%`}
              delta={summary.periodComparison.convRateDelta}
              icon={TrendingUp}
            />
            <KpiTile label="Creators" value={summary.activeCreators} icon={Users} />
            <KpiTile
              label="Revenue"
              value={fmt$(summary.totalActualRevenue > 0 ? summary.totalActualRevenue : summary.totalEstimatedRevenue > 0 ? summary.totalEstimatedRevenue : null)}
              sub={summary.totalActualRevenue > 0 ? "actual" : "estimated"}
              icon={DollarSign}
            />
          </div>
        ) : (
          <div className="h-24 rounded-lg border bg-muted/20 animate-pulse" />
        )}
      </section>

      {/* 2. Executive Insights */}
      {insights.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Executive Insights
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {insights.map((ins, i) => (
              <InsightRow key={i} insight={ins} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Goal Progress */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Goal Progress
          </h2>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddGoal(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Goal
          </Button>
        </div>

        {showAddGoal && (
          <div className="mb-3">
            <AddGoalForm
              onAdd={(type, target) => createGoalMutation.mutate({ type, target })}
              onClose={() => setShowAddGoal(false)}
            />
          </div>
        )}

        {goals.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={(id) => deleteGoalMutation.mutate(id)}
                onEdit={(id, target) => editGoalMutation.mutate({ id, target })}
              />
            ))}
          </div>
        ) : (
          !showAddGoal && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No goals set yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Set targets for conversions, replies, and revenue to track progress.</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setShowAddGoal(true)}>
                <Plus className="w-3.5 h-3.5" />
                Create first goal
              </Button>
            </div>
          )
        )}
      </section>

      {/* 4. Conversion Trends */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BarChart className="w-4 h-4 text-primary" />
            Conversion Trends
          </h2>
          <div className="flex items-center gap-1 text-xs">
            <button
              className={`px-2 py-1 rounded-md border ${trendMonths === 6 ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              onClick={() => setTrendMonths(6)}
            >
              6 months
            </button>
            <button
              className={`px-2 py-1 rounded-md border ${trendMonths === 12 ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              onClick={() => setTrendMonths(12)}
            >
              12 months
            </button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4 pb-2">
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="contacted" name="Sent" fill="hsl(var(--primary) / 0.5)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="replied" name="Replied" fill="hsl(var(--primary) / 0.7)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="converted" name="Converted" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-sm text-muted-foreground">
                <BarChart className="w-8 h-8 mb-2 opacity-30" />
                No trend data yet — create outreach operations to see monthly activity.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 5. Creator Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Creator Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {creators.length > 0 ? (
              <div className="space-y-1">
                {creators.slice(0, 8).map((c, i) => (
                  <div key={c.creatorName} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="w-5 h-5 rounded-full bg-muted text-center text-xs leading-5 flex-shrink-0 font-medium">{i + 1}</span>
                    <span className="flex-1 truncate">{c.creatorName}</span>
                    <span className="text-muted-foreground w-12 text-right">{c.sent} sent</span>
                    <span className="text-emerald-700 font-medium w-10 text-right">{c.converted} conv</span>
                  </div>
                ))}
                {creators.length > 8 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{creators.length - 8} more · <Link href="/performance" className="text-primary hover:underline">View all →</Link>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No creator data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* 6. Channel Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {channels.length > 0 ? (
              <div className="space-y-2">
                {channels.map((ch) => (
                  <div key={ch.channel} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{ch.channel}</span>
                      <span className="text-muted-foreground text-xs">{ch.total} total · {ch.replyRate}% reply · {ch.conversionRate}% conv</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${Math.min(ch.replyRate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No channel data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. Product Performance */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Product Performance
        </h2>
        {products_perf.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Product</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Sent</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Conv.</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Rate</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products_perf.map((p) => (
                  <tr key={p.productId} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{p.productName}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{p.total}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{p.sent}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-700">{p.converted}</td>
                    <td className="px-4 py-2.5 text-right">{p.conversionRate}%</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt$(p.actualRevenue ?? p.estimatedRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No product data yet.
            </CardContent>
          </Card>
        )}
      </section>

      {/* 8. Revenue Summary */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Revenue Summary
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Estimated Pipeline Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{fmt$(summary?.totalEstimatedRevenue ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {creators.filter((c) => c.estimatedRevenue !== null).length} creator records
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Actual Revenue Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-700">{fmt$(summary?.totalActualRevenue ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Manually entered · update in{" "}
                <Link href="/performance" className="text-primary hover:underline">Performance →</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
