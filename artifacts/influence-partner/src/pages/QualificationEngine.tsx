import { useState, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import {
  getQualificationQueue,
  qualifyBatch,
  qualifyProspect,
  updateQualificationStatus,
  approveQualification,
  getQualificationMetrics,
  type ApiQueueItem,
  type ApiQualification,
  type QualificationStatus,
  type QualificationLabel,
  type ScoreReasons,
} from "@/lib/api-client";
import {
  Target,
  Youtube,
  HelpCircle,
  Star,
  X,
  Archive,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  Shield,
  Handshake,
  Activity,
  FileText,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "all" | QualificationLabel | "starred" | "rejected";

// ─── Config ───────────────────────────────────────────────────────────────────

const PILLAR_HELP: Record<string, { label: string; weight: string; tooltip: string; icon: React.ComponentType<{ className?: string }>; reasonsKey: keyof ScoreReasons }> = {
  audienceMatchScore: {
    label: "Audience Match",
    weight: "25%",
    tooltip: "Measures how closely this creator's audience aligns with the customers your product is trying to reach.",
    icon: Users,
    reasonsKey: "audienceMatch",
  },
  brandSafetyScore: {
    label: "Brand Safety",
    weight: "20%",
    tooltip: "Checks whether this creator appears safe for your brand to partner with.",
    icon: Shield,
    reasonsKey: "brandSafety",
  },
  partnershipReadinessScore: {
    label: "Partnership Readiness",
    weight: "20%",
    tooltip: "Looks for signs the creator accepts sponsorships, affiliate deals, reviews, or business inquiries.",
    icon: Handshake,
    reasonsKey: "partnershipReadiness",
  },
  responseProbabilityScore: {
    label: "Response Probability",
    weight: "20%",
    tooltip: "Estimates how likely the creator is to respond based on their size, activity, and contact availability.",
    icon: Activity,
    reasonsKey: "responseProbability",
  },
  contentRelevanceScore: {
    label: "Content Relevance",
    weight: "15%",
    tooltip: "Checks how closely the creator's content matches your product topic.",
    icon: FileText,
    reasonsKey: "contentRelevance",
  },
};

const PILLARS = Object.entries(PILLAR_HELP);

const TOUR_STEPS = [
  {
    step: 1,
    title: "Run YouTube Discovery first",
    desc: "Go to YouTube Discovery and search for channels related to your product. They'll show up here automatically.",
  },
  {
    step: 2,
    title: "Review the Qualification Queue",
    desc: "Every discovered creator is listed here. Click 'Qualify All' to score them all against your product in seconds.",
  },
  {
    step: 3,
    title: "Read the score explanation",
    desc: "Expand 'Why This Score' on any card to see the exact reasons — no guesswork, just plain English.",
  },
  {
    step: 4,
    title: "Approve the best creators",
    desc: "Click 'Approve to Targets' on Ready to Pitch or Promising creators to move them into your outreach list.",
  },
  {
    step: 5,
    title: "Generate outreach",
    desc: "Head to Targets or Outreach and create personalised messages for each approved creator.",
  },
  {
    step: 6,
    title: "Track responses in Pipeline",
    desc: "As creators respond, move them through your CRM Pipeline — Contacted → Interested → Active.",
  },
];

const FLAG_LABELS: Record<string, string> = {
  "nsfw-content": "NSFW Content",
  "gambling-content": "Gambling",
  "mlm-indicators": "MLM / Pyramid",
  "hate-extremist": "Hate / Extremist",
  "controversial-content": "Controversial",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLabelStyle(label: QualificationLabel): string {
  switch (label) {
    case "Ready to Pitch": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Promising": return "bg-blue-100 text-blue-800 border-blue-200";
    case "Needs Review": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Not Qualified": return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-gray-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-blue-50 border-blue-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-gray-50 border-gray-200";
}

function getBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-gray-400";
}

function loadTourDismissed(): boolean {
  try {
    return localStorage.getItem("ip_qual_tour_dismissed") === "true";
  } catch {
    return false;
  }
}

function saveTourDismissed() {
  try {
    localStorage.setItem("ip_qual_tour_dismissed", "true");
  } catch {
    // ignore
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color = "default",
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: "default" | "emerald" | "blue" | "amber" | "red";
}) {
  const colors = {
    default: "border-border",
    emerald: "border-emerald-200 bg-emerald-50/50",
    blue: "border-blue-200 bg-blue-50/50",
    amber: "border-amber-200 bg-amber-50/50",
    red: "border-red-200 bg-red-50/50",
  };
  const valueColors = {
    default: "text-foreground",
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  return (
    <div className={`rounded-xl border p-4 bg-card ${colors[color]}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function PillarBar({
  pillarKey,
  score,
  reasons,
}: {
  pillarKey: string;
  score: number;
  reasons: string[];
}) {
  const cfg = PILLAR_HELP[pillarKey]!;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-1.5 w-44 flex-shrink-0 text-left group" type="button">
            <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
              {cfg.label}
            </span>
            <HelpCircle className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-xs">
          <p className="font-semibold mb-1">{cfg.label} ({cfg.weight})</p>
          <p>{cfg.tooltip}</p>
          {reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-border/40 pt-2">
              {reasons.slice(0, 3).map((r, i) => (
                <li key={i} className="text-xs opacity-80">• {r}</li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right tabular-nums">{score}</span>
    </div>
  );
}

function Walkthrough({
  step,
  total,
  onNext,
  onPrev,
  onSkip,
  onDontShow,
}: {
  step: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onDontShow: () => void;
}) {
  const current = TOUR_STEPS[step];
  if (!current) return null;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
            {current.step}
          </div>
          <div>
            <p className="font-semibold text-sm">{current.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{current.desc}</p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-primary/20"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDontShow}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Don't show again
          </button>
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={onPrev}>
              Previous
            </Button>
          )}
          {step < total - 1 ? (
            <Button size="sm" onClick={onNext}>
              Next
            </Button>
          ) : (
            <Button size="sm" onClick={onDontShow}>
              Got it!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function QualificationCard({
  item,
  productId,
  onStatusChange,
  onApprove,
  onRescoreStart,
}: {
  item: ApiQueueItem;
  productId: string;
  onStatusChange: (id: string, status: QualificationStatus) => void;
  onApprove: (id: string) => void;
  onRescoreStart: (prospectId: string) => void;
}) {
  const { prospect, qualification: qual } = item;
  const [reasonsOpen, setReasonsOpen] = useState(false);

  const reasons: ScoreReasons = qual?.scoreReasons ?? {
    audienceMatch: [],
    brandSafety: [],
    partnershipReadiness: [],
    responseProbability: [],
    contentRelevance: [],
  };

  const flags = (qual?.hardFlags as string[] | null) ?? [];
  const isStarred = qual?.qualificationStatus === "starred";
  const isRejected = qual?.qualificationStatus === "rejected";
  const isArchived = qual?.qualificationStatus === "archived";
  const isApproved = qual?.qualificationStatus === "qualified";

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden transition-all ${
        isRejected || isArchived ? "opacity-60" : ""
      } ${isApproved ? "border-emerald-200" : ""}`}
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
          {prospect.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{prospect.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {prospect.platform && (
                  <span className="text-xs text-muted-foreground">{prospect.platform}</span>
                )}
                {prospect.audienceSize && (
                  <span className="text-xs text-muted-foreground">· {prospect.audienceSize}</span>
                )}
                {qual?.contactEmail && (
                  <span className="text-xs text-emerald-600 font-medium">· Email found</span>
                )}
              </div>
            </div>

            {qual ? (
              <div className={`flex-shrink-0 rounded-lg border p-2 text-center min-w-[56px] ${getScoreBg(qual.partnerFitScore)}`}>
                <p className={`text-xl font-bold leading-none ${getScoreColor(qual.partnerFitScore)}`}>
                  {qual.partnerFitScore}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">/ 100</p>
              </div>
            ) : (
              <div className="flex-shrink-0 rounded-lg border border-dashed border-muted-foreground/30 p-2 text-center min-w-[56px]">
                <p className="text-sm font-medium text-muted-foreground/50">—</p>
                <p className="text-xs text-muted-foreground/40">score</p>
              </div>
            )}
          </div>

          {qual && (
            <div className="mt-1.5">
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getLabelStyle(qual.qualificationLabel)}`}
              >
                {qual.qualificationLabel}
              </span>
              {isApproved && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Moved to Targets
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pillars */}
      {qual ? (
        <div className="px-4 pb-3 space-y-1.5">
          {PILLARS.map(([key, cfg]) => (
            <PillarBar
              key={key}
              pillarKey={key}
              score={qual[key as keyof ApiQualification] as number}
              reasons={reasons[cfg.reasonsKey] ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground">
            Not yet scored — click "Score" to analyse this creator.
          </p>
        </div>
      )}

      {/* Hard flags */}
      {flags.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {flags.map((flag) => (
              <span
                key={flag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"
              >
                <AlertCircle className="w-3 h-3" />
                {FLAG_LABELS[flag] ?? flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Why This Score */}
      {qual && (
        <div className="border-t border-border">
          <button
            onClick={() => setReasonsOpen(!reasonsOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <span>Why This Score</span>
            {reasonsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {reasonsOpen && (
            <div className="px-4 pb-3 space-y-2">
              {PILLARS.map(([key, cfg]) => {
                const pillarReasons = reasons[cfg.reasonsKey] ?? [];
                if (pillarReasons.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{cfg.label}</p>
                    <ul className="space-y-0.5">
                      {pillarReasons.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                          <span className="text-muted-foreground/50 flex-shrink-0">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Next Best Action */}
      {qual && qual.nextBestAction && (
        <div className="px-4 py-3 bg-muted/20 border-t border-border">
          <div className="flex gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Recommended Action</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{qual.nextBestAction}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-1.5 flex-wrap">
        {!qual ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7"
            onClick={() => onRescoreStart(prospect.id)}
          >
            <Zap className="w-3 h-3" />
            Score
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7"
            onClick={() => onRescoreStart(prospect.id)}
          >
            <RefreshCw className="w-3 h-3" />
            Re-score
          </Button>
        )}

        {qual && !isApproved && (
          <Button
            size="sm"
            className="gap-1.5 text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onApprove(qual.id)}
          >
            <Target className="w-3 h-3" />
            Approve to Targets
          </Button>
        )}

        {qual && !isStarred && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7"
            onClick={() => onStatusChange(qual.id, "starred")}
          >
            <Star className="w-3 h-3" />
            Star
          </Button>
        )}

        {qual && isStarred && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7 text-amber-600 border-amber-200 bg-amber-50"
            onClick={() => onStatusChange(qual.id, "unreviewed")}
          >
            <Star className="w-3 h-3 fill-amber-500" />
            Starred
          </Button>
        )}

        {qual && !isRejected && !isApproved && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onStatusChange(qual.id, "rejected")}
          >
            <X className="w-3 h-3" />
            Reject
          </Button>
        )}

        {qual && !isArchived && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs h-7 text-muted-foreground"
            onClick={() => onStatusChange(qual.id, "archived")}
          >
            <Archive className="w-3 h-3" />
            Archive
          </Button>
        )}

        {prospect.socialUrl && (
          <a
            href={prospect.socialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto"
          >
            <ExternalLink className="w-3 h-3" />
            View Channel
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QualificationEngine() {
  const queryClient = useQueryClient();
  const { products, selectedProductId, setSelectedProductId } = useAppContext();

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [tourStep, setTourStep] = useState<number | null>(() =>
    loadTourDismissed() ? null : 0,
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  // ── Queries ────────────────────────────────────────────────────────────────

  const queueQuery = useQuery({
    queryKey: ["qualification-queue", selectedProductId],
    queryFn: () => getQualificationQueue(selectedProductId!),
    enabled: !!selectedProductId,
    staleTime: 15_000,
  });

  const metricsQuery = useQuery({
    queryKey: ["qualification-metrics", selectedProductId],
    queryFn: () => getQualificationMetrics(selectedProductId!),
    enabled: !!selectedProductId,
    staleTime: 15_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const batchMutation = useMutation({
    mutationFn: (productId: string) => qualifyBatch(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qualification-queue", selectedProductId] });
      queryClient.invalidateQueries({ queryKey: ["qualification-metrics", selectedProductId] });
    },
  });

  const rescoreMutation = useMutation({
    mutationFn: ({ prospectId, productId }: { prospectId: string; productId: string }) =>
      qualifyProspect(prospectId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qualification-queue", selectedProductId] });
      queryClient.invalidateQueries({ queryKey: ["qualification-metrics", selectedProductId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QualificationStatus }) =>
      updateQualificationStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["qualification-queue", selectedProductId] });
      const prev = queryClient.getQueryData<ApiQueueItem[]>(["qualification-queue", selectedProductId]);
      queryClient.setQueryData<ApiQueueItem[]>(
        ["qualification-queue", selectedProductId],
        (old = []) =>
          old.map((item) =>
            item.qualification?.id === id
              ? { ...item, qualification: { ...item.qualification, qualificationStatus: status } }
              : item,
          ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["qualification-queue", selectedProductId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["qualification-metrics", selectedProductId] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveQualification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qualification-queue", selectedProductId] });
      queryClient.invalidateQueries({ queryKey: ["qualification-metrics", selectedProductId] });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStatusChange = useCallback((id: string, status: QualificationStatus) => {
    statusMutation.mutate({ id, status });
  }, [statusMutation]);

  const handleApprove = useCallback((id: string) => {
    approveMutation.mutate(id);
  }, [approveMutation]);

  const handleRescore = useCallback((prospectId: string) => {
    if (!selectedProductId) return;
    rescoreMutation.mutate({ prospectId, productId: selectedProductId });
  }, [selectedProductId, rescoreMutation]);

  const handleTourNext = useCallback(() => setTourStep((s) => (s !== null ? s + 1 : null)), []);
  const handleTourPrev = useCallback(() => setTourStep((s) => (s !== null ? Math.max(0, s - 1) : null)), []);
  const handleTourDismiss = useCallback(() => { saveTourDismissed(); setTourStep(null); }, []);

  // ── Filter queue ───────────────────────────────────────────────────────────

  const queue = queueQuery.data ?? [];
  const metrics = metricsQuery.data;

  const filteredItems: ApiQueueItem[] = (() => {
    switch (activeTab) {
      case "all":
        return queue;
      case "starred":
        return queue.filter((i) => i.qualification?.qualificationStatus === "starred");
      case "rejected":
        return queue.filter(
          (i) =>
            i.qualification?.qualificationStatus === "rejected" ||
            i.qualification?.qualificationStatus === "archived",
        );
      default:
        return queue.filter((i) => i.qualification?.qualificationLabel === activeTab);
    }
  })();

  const tabCounts: Record<string, number> = {
    all: queue.length,
    "Ready to Pitch": metrics?.readyToPitch ?? 0,
    Promising: metrics?.promising ?? 0,
    "Needs Review": metrics?.needsReview ?? 0,
    "Not Qualified": metrics?.notQualified ?? 0,
    starred: metrics?.starred ?? 0,
    rejected: (metrics?.rejected ?? 0),
  };

  // ── Guard: no products ─────────────────────────────────────────────────────

  if (products.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-10 text-center space-y-4">
        <Target className="w-10 h-10 mx-auto text-muted-foreground" />
        <h2 className="text-lg font-semibold">Add a product first</h2>
        <p className="text-sm text-muted-foreground">
          The Qualification Engine scores your discovered creators against a specific product.
          Create your first product to get started.
        </p>
        <Link href="/products">
          <Button>Go to Products</Button>
        </Link>
      </div>
    );
  }

  // ── Guard: no product selected ─────────────────────────────────────────────

  if (!selectedProductId || !selectedProduct) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-10 space-y-4">
        <h2 className="text-lg font-semibold">Select a product to begin</h2>
        <p className="text-sm text-muted-foreground">
          Choose the product you want to score creators against:
        </p>
        <select
          className="w-full border border-border rounded-lg px-3 py-2 bg-card text-sm"
          value={selectedProductId ?? ""}
          onChange={(e) => setSelectedProductId(e.target.value || null)}
        >
          <option value="">-- Choose a product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  const hasProspects = queue.length > 0;
  const hasScored = (metrics?.scored ?? 0) > 0;
  const isQualifying = batchMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Partner Qualification Engine
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review your discovered creators, understand why they fit, and move the best partners into outreach.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Scoring against:</span>
            <select
              className="text-xs border border-border rounded px-2 py-1 bg-card"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/help/qualification-engine">
            <Button variant="outline" size="sm" className="gap-1.5">
              <HelpCircle className="w-4 h-4" />
              How it works
            </Button>
          </Link>
          {hasProspects && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => batchMutation.mutate(selectedProductId)}
              disabled={isQualifying}
            >
              {isQualifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Qualifying...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {hasScored ? "Re-qualify All" : "Qualify All"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tour */}
      {tourStep !== null && (
        <Walkthrough
          step={tourStep}
          total={TOUR_STEPS.length}
          onNext={handleTourNext}
          onPrev={handleTourPrev}
          onSkip={handleTourDismiss}
          onDontShow={handleTourDismiss}
        />
      )}

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Discovered" value={metrics.discovered} />
          <MetricCard label="Scored" value={metrics.scored} />
          <MetricCard label="Ready to Pitch" value={metrics.readyToPitch} color="emerald" />
          <MetricCard label="Promising" value={metrics.promising} color="blue" />
          <MetricCard label="Needs Review" value={metrics.needsReview} color="amber" />
          <MetricCard label="Approved" value={metrics.approved} color="emerald" sub="moved to targets" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(
          [
            ["all", "All"],
            ["Ready to Pitch", "Ready to Pitch"],
            ["Promising", "Promising"],
            ["Needs Review", "Needs Review"],
            ["Not Qualified", "Not Qualified"],
            ["starred", "Starred ★"],
            ["rejected", "Rejected / Archived"],
          ] as [TabKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {tabCounts[key] !== undefined && tabCounts[key] > 0 && (
              <span className={`ml-1.5 ${activeTab === key ? "opacity-80" : "opacity-60"}`}>
                {tabCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state: no prospects at all */}
      {!queueQuery.isLoading && !hasProspects && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-12 text-center space-y-4">
          <Youtube className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-semibold text-base">No creators have been qualified yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Start by running a YouTube Discovery search, then return here to review your best partner matches.
            </p>
          </div>
          <Link href="/youtube-discovery">
            <Button className="gap-2">
              <Youtube className="w-4 h-4" />
              Run Discovery
            </Button>
          </Link>
        </div>
      )}

      {/* Empty state: prospects exist but none scored yet */}
      {!queueQuery.isLoading && hasProspects && !hasScored && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center space-y-3">
          <Zap className="w-8 h-8 mx-auto text-primary/60" />
          <p className="font-semibold">Ready to score {queue.length} creator{queue.length !== 1 ? "s" : ""}</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Click "Qualify All" to score every prospect against <strong>{selectedProduct.name}</strong> in seconds.
          </p>
          <Button
            onClick={() => batchMutation.mutate(selectedProductId)}
            disabled={isQualifying}
            className="gap-2"
          >
            {isQualifying ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Qualifying...</>
            ) : (
              <><Zap className="w-4 h-4" />Qualify All</>
            )}
          </Button>
        </div>
      )}

      {/* Empty state: filtered tab is empty */}
      {hasProspects && hasScored && filteredItems.length === 0 && (
        <div className="rounded-xl border border-dashed border-muted-foreground/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No creators in this category yet. Try a different filter tab.
          </p>
        </div>
      )}

      {/* Card grid */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <QualificationCard
              key={item.prospect.id}
              item={item}
              productId={selectedProductId}
              onStatusChange={handleStatusChange}
              onApprove={handleApprove}
              onRescoreStart={handleRescore}
            />
          ))}
        </div>
      )}

      {/* Loading state */}
      {queueQuery.isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading qualification queue…
        </div>
      )}
    </div>
  );
}
