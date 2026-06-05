import { useState, useMemo, useCallback } from "react";
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
  submitQualificationFeedback,
  bulkQualificationAction,
  type ApiQueueItem,
  type ApiQualification,
  type QualificationStatus,
  type QualificationLabel,
  type ScoreReasons,
  type FeedbackType,
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
  Download,
  SlidersHorizontal,
  Calculator,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "all" | QualificationLabel | "starred" | "rejected";
type SortKey = "score_desc" | "score_asc" | "response_prob" | "audience_match" | "most_recent";

// ─── Config ───────────────────────────────────────────────────────────────────

const PILLAR_HELP: Record<string, {
  label: string;
  weight: string;
  weightNum: number;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  reasonsKey: keyof ScoreReasons;
}> = {
  audienceMatchScore: {
    label: "Audience Match",
    weight: "25%",
    weightNum: 0.25,
    tooltip: "Measures how closely this creator's audience aligns with the customers your product is trying to reach.",
    icon: Users,
    reasonsKey: "audienceMatch",
  },
  brandSafetyScore: {
    label: "Brand Safety",
    weight: "20%",
    weightNum: 0.20,
    tooltip: "Checks whether this creator appears safe for your brand to partner with.",
    icon: Shield,
    reasonsKey: "brandSafety",
  },
  partnershipReadinessScore: {
    label: "Partnership Readiness",
    weight: "20%",
    weightNum: 0.20,
    tooltip: "Looks for signs the creator accepts sponsorships, affiliate deals, reviews, or business inquiries.",
    icon: Handshake,
    reasonsKey: "partnershipReadiness",
  },
  responseProbabilityScore: {
    label: "Response Probability",
    weight: "20%",
    weightNum: 0.20,
    tooltip: "Estimates how likely the creator is to respond based on their size, activity, and contact availability.",
    icon: Activity,
    reasonsKey: "responseProbability",
  },
  contentRelevanceScore: {
    label: "Content Relevance",
    weight: "15%",
    weightNum: 0.15,
    tooltip: "Checks how closely the creator's content matches your product topic.",
    icon: FileText,
    reasonsKey: "contentRelevance",
  },
};

const PILLARS = Object.entries(PILLAR_HELP);

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score_desc", label: "Highest Score" },
  { value: "score_asc", label: "Lowest Score" },
  { value: "response_prob", label: "Highest Response Probability" },
  { value: "audience_match", label: "Best Audience Match" },
  { value: "most_recent", label: "Most Recent" },
];

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

function loadSortKey(): SortKey {
  try {
    return (localStorage.getItem("ip_qual_sort") as SortKey) ?? "score_desc";
  } catch {
    return "score_desc";
  }
}

function sortItems(items: ApiQueueItem[], key: SortKey): ApiQueueItem[] {
  return [...items].sort((a, b) => {
    const qa = a.qualification;
    const qb = b.qualification;
    if (!qa && !qb) return 0;
    if (!qa) return 1;
    if (!qb) return -1;
    switch (key) {
      case "score_desc": return qb.partnerFitScore - qa.partnerFitScore;
      case "score_asc": return qa.partnerFitScore - qb.partnerFitScore;
      case "response_prob": return qb.responseProbabilityScore - qa.responseProbabilityScore;
      case "audience_match": return qb.audienceMatchScore - qa.audienceMatchScore;
      case "most_recent": {
        const tA = qa.createdAt ? new Date(qa.createdAt).getTime() : 0;
        const tB = qb.createdAt ? new Date(qb.createdAt).getTime() : 0;
        return tB - tA;
      }
      default: return 0;
    }
  });
}

function exportToCSV(items: ApiQueueItem[]) {
  const scored = items.filter((i) => i.qualification !== null);
  if (scored.length === 0) return;
  const headers = [
    "Name", "Platform", "Audience Size", "Partner Fit Score", "Label", "Status",
    "Contact Email", "Audience Match", "Brand Safety", "Partnership Readiness",
    "Response Probability", "Content Relevance", "Hard Flags", "Next Best Action",
  ];
  const rows = scored.map((i) => {
    const q = i.qualification!;
    return [
      i.prospect.name,
      i.prospect.platform ?? "",
      i.prospect.audienceSize ?? "",
      q.partnerFitScore,
      q.qualificationLabel,
      q.qualificationStatus,
      q.contactEmail ?? "",
      q.audienceMatchScore,
      q.brandSafetyScore,
      q.partnershipReadinessScore,
      q.responseProbabilityScore,
      q.contentRelevanceScore,
      ((q.hardFlags as string[] | null) ?? []).join("; "),
      q.nextBestAction,
    ];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qualified-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

function AuditPanel({ qual }: { qual: ApiQualification }) {
  const flags = (qual.hardFlags as string[] | null) ?? [];
  const auditRows = PILLARS.map(([key, cfg]) => {
    const score = qual[key as keyof ApiQualification] as number;
    const contribution = (score * cfg.weightNum).toFixed(1);
    return { key, label: cfg.label, weight: cfg.weight, weightNum: cfg.weightNum, score, contribution };
  });

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="rounded-lg overflow-hidden border border-border">
        <div className="px-3 py-1.5 bg-muted/50 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score Calculation</p>
        </div>
        <div className="divide-y divide-border/50">
          {auditRows.map(({ key, label, weight, score, contribution }) => (
            <div key={key} className="grid grid-cols-3 px-3 py-1.5 text-xs font-mono">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-center text-muted-foreground">
                {score} × {weight}
              </span>
              <span className="text-right font-medium">= {contribution}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 px-3 py-2 bg-muted/50 border-t border-border text-xs font-mono">
          <span className="col-span-2 font-bold">Partner Fit Score</span>
          <span className={`text-right font-bold text-base ${getScoreColor(qual.partnerFitScore)}`}>
            {qual.partnerFitScore}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Label</p>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getLabelStyle(qual.qualificationLabel)}`}>
            {qual.qualificationLabel}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Status</p>
          <p className="text-xs capitalize text-muted-foreground">{qual.qualificationStatus}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Hard Flags</p>
        {flags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {flags.map((f) => (
              <span key={f} className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 border border-red-200">
                {FLAG_LABELS[f] ?? f}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">None detected</p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Applied Weights</p>
        <div className="flex flex-wrap gap-1.5">
          {PILLARS.map(([key, cfg]) => (
            <span key={key} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border font-mono">
              {cfg.label}: {cfg.weight}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedbackButtons({
  qualId,
  submitted,
  onFeedback,
}: {
  qualId: string;
  submitted: string | undefined;
  onFeedback: (qualId: string, type: FeedbackType) => void;
}) {
  const options: { type: FeedbackType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: "accurate", label: "Accurate", icon: ThumbsUp },
    { type: "too_high", label: "Too High", icon: TrendingUp },
    { type: "too_low", label: "Too Low", icon: TrendingDown },
  ];
  return (
    <div className="px-4 py-2.5 border-t border-border bg-muted/10">
      <p className="text-xs text-muted-foreground mb-1.5">Was this score accurate?</p>
      <div className="flex items-center gap-1.5">
        {options.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            disabled={!!submitted}
            onClick={() => onFeedback(qualId, type)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-all ${
              submitted === type
                ? "bg-primary border-primary text-white font-medium"
                : submitted
                ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground bg-background"
            }`}
          >
            <Icon className="w-3 h-3" />
            {submitted === type ? "✓ " : ""}{label}
          </button>
        ))}
        {submitted && (
          <span className="text-xs text-muted-foreground ml-1">— Thanks for the feedback</span>
        )}
      </div>
    </div>
  );
}

function BulkActionBar({
  count,
  onAction,
  onClear,
  isLoading,
}: {
  count: number;
  onAction: (action: "approve" | "reject" | "star" | "archive") => void;
  onClear: () => void;
  isLoading: boolean;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-border bg-card shadow-xl px-4 py-3 min-w-max">
      <span className="text-sm font-semibold mr-1">{count} selected</span>
      <div className="w-px h-5 bg-border" />
      <Button
        size="sm"
        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
        onClick={() => onAction("approve")}
        disabled={isLoading}
      >
        <Target className="w-3 h-3" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
        onClick={() => onAction("star")}
        disabled={isLoading}
      >
        <Star className="w-3 h-3" />
        Star
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => onAction("reject")}
        disabled={isLoading}
      >
        <X className="w-3 h-3" />
        Reject
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs gap-1.5 text-muted-foreground"
        onClick={() => onAction("archive")}
        disabled={isLoading}
      >
        <Archive className="w-3 h-3" />
        Archive
      </Button>
      <button
        onClick={onClear}
        className="ml-1 text-muted-foreground hover:text-foreground"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
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
  isSelected,
  onToggleSelect,
  onStatusChange,
  onApprove,
  onRescoreStart,
  onFeedback,
  submittedFeedback,
}: {
  item: ApiQueueItem;
  productId: string;
  isSelected: boolean;
  onToggleSelect: (qualId: string) => void;
  onStatusChange: (id: string, status: QualificationStatus) => void;
  onApprove: (id: string) => void;
  onRescoreStart: (prospectId: string) => void;
  onFeedback: (qualId: string, type: FeedbackType) => void;
  submittedFeedback: string | undefined;
}) {
  const { prospect, qualification: qual } = item;
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

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

  function handleToggleReasons() {
    setReasonsOpen(!reasonsOpen);
    if (!reasonsOpen) setAuditOpen(false);
  }

  function handleToggleAudit() {
    setAuditOpen(!auditOpen);
    if (!auditOpen) setReasonsOpen(false);
  }

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden transition-all relative ${
        isRejected || isArchived ? "opacity-60" : ""
      } ${isApproved ? "border-emerald-200" : ""} ${
        isSelected ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
    >
      {/* Bulk select checkbox */}
      {qual && (
        <button
          onClick={() => onToggleSelect(qual.id)}
          className={`absolute top-3 left-3 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all text-xs ${
            isSelected
              ? "bg-primary border-primary text-white"
              : "bg-background border-border hover:border-primary"
          }`}
          aria-label={isSelected ? "Deselect" : "Select"}
        >
          {isSelected && "✓"}
        </button>
      )}

      {/* Header */}
      <div className={`p-4 flex items-start gap-3 ${qual ? "pl-10" : ""}`}>
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

      {/* Why This Score + Audit toggle */}
      {qual && (
        <div className="border-t border-border">
          <div className="flex items-center divide-x divide-border">
            <button
              onClick={handleToggleReasons}
              className="flex-1 flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <span>Why This Score</span>
              {reasonsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleToggleAudit}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                auditOpen
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <Calculator className="w-3 h-3" />
              Audit
              {auditOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Why This Score panel */}
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

          {/* Audit panel */}
          {auditOpen && <AuditPanel qual={qual} />}
        </div>
      )}

      {/* Feedback */}
      {qual && (
        <FeedbackButtons
          qualId={qual.id}
          submitted={submittedFeedback}
          onFeedback={onFeedback}
        />
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
  const [sortKey, setSortKey] = useState<SortKey>(loadSortKey);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submittedFeedback, setSubmittedFeedback] = useState<Record<string, string>>({});
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
        (old) =>
          old?.map((item) =>
            item.qualification?.id === id
              ? { ...item, qualification: { ...item.qualification!, qualificationStatus: status } }
              : item,
          ) ?? [],
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

  const feedbackMutation = useMutation({
    mutationFn: ({ qualId, type }: { qualId: string; type: FeedbackType }) =>
      submitQualificationFeedback(qualId, type),
    onSuccess: (_data, vars) => {
      setSubmittedFeedback((prev) => ({ ...prev, [vars.qualId]: vars.type }));
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: "approve" | "reject" | "star" | "archive" }) =>
      bulkQualificationAction(ids, action),
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["qualification-queue", selectedProductId] });
      queryClient.invalidateQueries({ queryKey: ["qualification-metrics", selectedProductId] });
    },
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const allItems = queueQuery.data ?? [];
  const metrics = metricsQuery.data;

  const filteredItems = useMemo(() => {
    let filtered: ApiQueueItem[];
    switch (activeTab) {
      case "all":
        filtered = allItems;
        break;
      case "starred":
        filtered = allItems.filter((i) => i.qualification?.qualificationStatus === "starred");
        break;
      case "rejected":
        filtered = allItems.filter((i) => i.qualification?.qualificationStatus === "rejected");
        break;
      default:
        filtered = allItems.filter((i) => i.qualification?.qualificationLabel === activeTab);
        break;
    }
    return sortItems(filtered, sortKey);
  }, [allItems, activeTab, sortKey]);

  const scoredOnTab = filteredItems.filter((i) => i.qualification !== null);
  const scoredCount = scoredOnTab.length;

  const tabCounts = useMemo(() => ({
    all: allItems.length,
    "Ready to Pitch": allItems.filter((i) => i.qualification?.qualificationLabel === "Ready to Pitch").length,
    Promising: allItems.filter((i) => i.qualification?.qualificationLabel === "Promising").length,
    "Needs Review": allItems.filter((i) => i.qualification?.qualificationLabel === "Needs Review").length,
    "Not Qualified": allItems.filter((i) => i.qualification?.qualificationLabel === "Not Qualified").length,
    starred: allItems.filter((i) => i.qualification?.qualificationStatus === "starred").length,
    rejected: allItems.filter((i) => i.qualification?.qualificationStatus === "rejected").length,
  }), [allItems]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleSelect = useCallback((qualId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qualId)) next.delete(qualId);
      else next.add(qualId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === scoredCount && scoredCount > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scoredOnTab.map((i) => i.qualification!.id)));
    }
  }, [selectedIds.size, scoredCount, scoredOnTab]);

  const handleSortChange = (key: SortKey) => {
    setSortKey(key);
    try {
      localStorage.setItem("ip_qual_sort", key);
    } catch {
      // ignore
    }
  };

  const handleExportCSV = () => exportToCSV(filteredItems);

  const handleFeedback = useCallback((qualId: string, type: FeedbackType) => {
    feedbackMutation.mutate({ qualId, type });
  }, [feedbackMutation]);

  const handleBulkAction = (action: "approve" | "reject" | "star" | "archive") => {
    if (selectedIds.size === 0) return;
    bulkMutation.mutate({ ids: Array.from(selectedIds), action });
  };

  const handleRescoreStart = (prospectId: string) => {
    if (!selectedProductId) return;
    rescoreMutation.mutate({ prospectId, productId: selectedProductId });
  };

  // ── Tour helpers ──────────────────────────────────────────────────────────

  const handleTourNext = () => setTourStep((s) => (s !== null ? Math.min(s + 1, TOUR_STEPS.length - 1) : null));
  const handleTourPrev = () => setTourStep((s) => (s !== null ? Math.max(s - 1, 0) : null));
  const handleTourSkip = () => setTourStep(null);
  const handleTourDontShow = () => { saveTourDismissed(); setTourStep(null); };

  // ── Guard: no products ────────────────────────────────────────────────────

  if (products.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-lg mb-2">No product selected</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Create a product first, then come back to qualify your prospects against it.
          </p>
          <Link href="/products">
            <Button>Create a Product</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const TABS: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "Ready to Pitch", label: "Ready to Pitch" },
    { key: "Promising", label: "Promising" },
    { key: "Needs Review", label: "Needs Review" },
    { key: "Not Qualified", label: "Not Qualified" },
    { key: "starred", label: "Starred" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Partner Qualification Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">
            5-pillar AI scoring across every prospect — see who's worth pitching.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/help/qualification-engine">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <HelpCircle className="w-4 h-4" />
              How It Works
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => batchMutation.mutate(selectedProductId!)}
            disabled={!selectedProductId || batchMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${batchMutation.isPending ? "animate-spin" : ""}`} />
            {batchMutation.isPending ? "Scoring…" : "Qualify All"}
          </Button>
          <Link href="/youtube-discovery">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Youtube className="w-4 h-4" />
              Add Prospects
            </Button>
          </Link>
        </div>
      </div>

      {/* Product selector */}
      {products.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Qualifying for:</span>
          <select
            value={selectedProductId ?? ""}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tour */}
      {tourStep !== null && (
        <Walkthrough
          step={tourStep}
          total={TOUR_STEPS.length}
          onNext={handleTourNext}
          onPrev={handleTourPrev}
          onSkip={handleTourSkip}
          onDontShow={handleTourDontShow}
        />
      )}

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Discovered" value={metrics.discovered} />
          <MetricCard label="Scored" value={metrics.scored} color="blue" />
          <MetricCard label="Ready to Pitch" value={metrics.readyToPitch} color="emerald"
            sub={metrics.scored > 0 ? `${Math.round((metrics.readyToPitch / metrics.scored) * 100)}%` : undefined} />
          <MetricCard label="Promising" value={metrics.promising} color="blue" />
          <MetricCard label="Needs Review" value={metrics.needsReview} color="amber" />
          <MetricCard label="Approved" value={metrics.approved} color="emerald"
            sub="moved to targets" />
        </div>
      )}

      {/* Toolbar: sort + select-all + export */}
      {allItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {scoredCount > 0 && (
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs transition-colors ${
                  selectedIds.size > 0 && selectedIds.size === scoredCount
                    ? "bg-primary border-primary text-white"
                    : "border-border"
                }`}>
                  {selectedIds.size > 0 && selectedIds.size === scoredCount && "✓"}
                </div>
                {selectedIds.size > 0 ? `${selectedIds.size} of ${scoredCount} selected` : "Select all"}
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={sortKey}
                onChange={(e) => handleSortChange(e.target.value as SortKey)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={handleExportCSV}
            disabled={scoredCount === 0}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const count = tabCounts[tab.key as keyof typeof tabCounts];
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.key ? "bg-white/20" : "bg-muted-foreground/20"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {!selectedProductId ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground text-sm">Select a product above to begin qualifying prospects.</p>
        </div>
      ) : queueQuery.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-xl border bg-card p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-2 bg-muted rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Youtube className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-2">No prospects yet</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
            Use YouTube Discovery to find channels in your niche — they'll appear here automatically, ready to qualify.
          </p>
          <Link href="/youtube-discovery">
            <Button>
              <Youtube className="w-4 h-4 mr-2" />
              Go to YouTube Discovery
            </Button>
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground text-sm">
            No prospects in this category yet.{" "}
            {allItems.some((i) => !i.qualification) && (
              <button
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => batchMutation.mutate(selectedProductId!)}
              >
                Run Qualify All
              </button>
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <QualificationCard
                key={item.prospect.id}
                item={item}
                productId={selectedProductId!}
                isSelected={item.qualification ? selectedIds.has(item.qualification.id) : false}
                onToggleSelect={handleToggleSelect}
                onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                onApprove={(id) => approveMutation.mutate(id)}
                onRescoreStart={handleRescoreStart}
                onFeedback={handleFeedback}
                submittedFeedback={item.qualification ? submittedFeedback[item.qualification.id] : undefined}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Showing {filteredItems.length} prospect{filteredItems.length !== 1 ? "s" : ""}
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
          </p>
        </>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        count={selectedIds.size}
        onAction={handleBulkAction}
        onClear={() => setSelectedIds(new Set())}
        isLoading={bulkMutation.isPending}
      />
    </div>
  );
}
