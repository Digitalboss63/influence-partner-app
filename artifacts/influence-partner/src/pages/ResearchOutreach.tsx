import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Mail,
  MessageSquare,
  Clock,
  Copy,
  CheckCheck,
  Zap,
  ArrowLeft,
  Send,
  CheckCircle2,
  Pencil,
  Check,
  X,
  HelpCircle,
  Users,
  Target,
  BookOpen,
  BarChart2,
  Loader2,
  Info,
  Globe,
  Link2,
  RefreshCw,
  ShieldCheck,
  Phone,
  Star,
  AlertTriangle,
  Brain,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import {
  getTargets,
  updateTarget,
  createOutreachOperation,
  getQualificationQueue,
  getContactIntelligence,
  getOutreachOperations,
  type ApiPartnerTarget,
  type ApiQueueItem,
  type ApiContactIntelligence,
  type OutreachContactMethod,
} from "@/lib/api-client";
import {
  generateIntelligenceOutreachMessages,
  generateResearchOutreachMessages,
  computeResearchUtilizationScore,
  computePersonalisationScore,
  type OutreachPlanMessages,
  type OutreachIntelligenceContext,
  type ResearchContext,
  type ResearchUtilizationScore,
  type QualityCheckItem,
} from "@/lib/partnerOutreach";
import { generateProductIntelligence } from "@/lib/productIntelligence";
import { generatePartnerIntelligence } from "@/lib/partnerIntelligence";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useQueryParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

type MessageKey = keyof Pick<
  OutreachPlanMessages,
  "firstEmail" | "dm" | "followUp1" | "followUp2" | "objectionResponse"
>;

interface Tab {
  key: MessageKey;
  label: string;
  icon: React.ElementType;
  timing: string;
  tip: string;
  channel: OutreachContactMethod;
}

const TABS: Tab[] = [
  {
    key: "firstEmail",
    label: "First Email",
    icon: Mail,
    timing: "Day 1",
    tip: "Your primary touchpoint. The subject line is pre-written — use it as-is or personalise. The goal is to open a conversation, not close a deal.",
    channel: "Email",
  },
  {
    key: "dm",
    label: "Short DM",
    icon: MessageSquare,
    timing: "Same day",
    tip: "Send this alongside the email — or instead of it for creators who primarily use social DMs. Keep it short. If they reply, move to email.",
    channel: "Instagram DM",
  },
  {
    key: "followUp1",
    label: "Follow-up 1",
    icon: Clock,
    timing: "4–5 days later",
    tip: "Most deals close after the first follow-up, not the first message. Includes a social proof angle — a real result that makes it concrete.",
    channel: "Email",
  },
  {
    key: "followUp2",
    label: "Follow-up 2",
    icon: Clock,
    timing: "9–10 days later",
    tip: "Your last active outreach. Keep it short, friendly, and easy to say yes or no to. No guilt, no pressure.",
    channel: "Email",
  },
  {
    key: "objectionResponse",
    label: "Handle Objections",
    icon: Zap,
    timing: "On reply",
    tip: "Use this when someone responds but isn't sure. Covers the three most common objections — edit the one that matches what they said.",
    channel: "Email",
  },
];

const SCORE_COLORS = (score: number) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-500";
};

const SCORE_LABEL = (score: number) => {
  if (score >= 80) return "Rich intelligence";
  if (score >= 50) return "Moderate — add more sources";
  if (score >= 20) return "Basic — run qualification";
  return "No intelligence yet";
};

// ─── Intelligence source status ───────────────────────────────────────────────

type IntelStatus = "loaded" | "partial" | "missing" | "loading";

interface IntelSource {
  label: string;
  status: IntelStatus;
  summary: string | null;
  link?: string;
  linkLabel?: string;
}

function IntelSourceBadge({ status }: { status: IntelStatus }) {
  if (status === "loading") return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
  if (status === "loaded") return <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
  if (status === "partial") return <AlertTriangle className="w-3 h-3 text-amber-500" />;
  return <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />;
}

function IntelPanel({
  sources,
  isExpanded,
  onToggle,
}: {
  sources: IntelSource[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const loaded = sources.filter((s) => s.status === "loaded").length;
  const partial = sources.filter((s) => s.status === "partial").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={onToggle}
        >
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-violet-600" />
            Intelligence Sources
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {loaded + partial}/{sources.length} loaded
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-2 pt-0">
          {sources.map((src) => (
            <div
              key={src.label}
              className={`rounded-lg border p-2.5 ${
                src.status === "loaded"
                  ? "border-emerald-200 bg-emerald-50/50"
                  : src.status === "partial"
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-muted bg-muted/20"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <IntelSourceBadge status={src.status} />
                <span className="text-xs font-medium">{src.label}</span>
              </div>
              {src.summary ? (
                <p className="text-xs text-muted-foreground leading-snug pl-4.5">
                  {src.summary}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic leading-snug pl-4">
                  {src.status === "loading" ? "Loading…" : "Not found — "}
                  {src.status === "missing" && src.link && (
                    <Link href={src.link}>
                      <span className="text-primary not-italic hover:underline cursor-pointer">
                        {src.linkLabel ?? "Go there →"}
                      </span>
                    </Link>
                  )}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Research Utilization Score card ─────────────────────────────────────────

function UtilizationScoreCard({
  scoreData,
  selectedTarget,
  selectedProduct,
}: {
  scoreData: ResearchUtilizationScore;
  selectedTarget: ApiPartnerTarget | null;
  selectedProduct: { name: string } | null;
}) {
  const { total, productContext, creatorContext, qualificationContext, contactContext, strategyContext, checklist } =
    scoreData;

  const bars: { label: string; value: number; color: string }[] = [
    { label: "Product", value: productContext, color: "bg-blue-500" },
    { label: "Creator", value: creatorContext, color: "bg-violet-500" },
    { label: "Qualification", value: qualificationContext, color: "bg-emerald-500" },
    { label: "Contact", value: contactContext, color: "bg-amber-500" },
    { label: "Strategy", value: strategyContext, color: "bg-rose-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
          Research Utilization Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-bold ${SCORE_COLORS(total)}`}>{total}%</span>
          <span className={`text-xs font-medium ${SCORE_COLORS(total)}`}>{SCORE_LABEL(total)}</span>
        </div>
        <Progress value={total} className="h-2" />

        {/* Per-source breakdown */}
        <div className="space-y-1.5">
          {bars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-20 shrink-0">{bar.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${bar.color}`}
                  style={{ width: `${(bar.value / 20) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-8 text-right">{bar.value}/20</span>
            </div>
          ))}
        </div>

        {/* Quality checklist */}
        <div className="border-t pt-2 mt-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-medium">
            Quality Checklist
          </p>
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-xs">
                {item.done ? (
                  <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                )}
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Inline field editor ──────────────────────────────────────────────────────

function InlineField({
  label,
  value,
  placeholder,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!editing) {
    return (
      <div
        className="group flex items-start gap-2 cursor-pointer"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
          {value ? (
            <p className="text-sm leading-snug line-clamp-2">{value}</p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">{placeholder}</p>
          )}
        </div>
        <Pencil className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {multiline ? (
        <Textarea
          rows={3}
          className="text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
      ) : (
        <Input
          className="text-sm h-8"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
      )}
      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => {
            onChange(draft);
            setEditing(false);
          }}
        >
          <Check className="w-3 h-3 mr-1" />
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => setEditing(false)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 text-xs">
      {copied ? (
        <>
          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy
        </>
      )}
    </Button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ResearchOutreach() {
  const { products, selectedProductId } = useAppContext();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const targetIdParam = useQueryParam("targetId");
  const productIdParam = useQueryParam("productId");

  const { data: allTargets = [], isLoading: loadingTargets } = useQuery({
    queryKey: ["targets"],
    queryFn: () => getTargets(),
  });

  const [selectedTargetId, setSelectedTargetId] = useState(targetIdParam);
  const [selectedProdId, setSelectedProdId] = useState(
    productIdParam || selectedProductId || (products[0]?.id ?? ""),
  );

  useEffect(() => {
    if (targetIdParam) setSelectedTargetId(targetIdParam);
  }, [targetIdParam]);

  const selectedTarget = allTargets.find((t) => t.id === selectedTargetId) ?? null;
  const selectedProduct = products.find((p) => p.id === selectedProdId) ?? products[0] ?? null;

  // ── Intelligence queries ──────────────────────────────────────────────────────

  const { data: queueItems = [], isLoading: loadingQueue } = useQuery({
    queryKey: ["qualification-queue", selectedProdId],
    queryFn: () => getQualificationQueue(selectedProdId),
    enabled: !!selectedProdId,
  });

  const { data: contactItems = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["contact-intelligence", selectedProdId],
    queryFn: () => getContactIntelligence({ productId: selectedProdId }),
    enabled: !!selectedProdId,
  });

  const { data: allOps = [], isLoading: loadingOps } = useQuery({
    queryKey: ["outreach-operations-all", selectedProdId],
    queryFn: () => getOutreachOperations({ productId: selectedProdId }),
    enabled: !!selectedProdId,
  });

  // ── Match intelligence to selected target ─────────────────────────────────

  const matchedQueueItem = useMemo((): ApiQueueItem | null => {
    if (!selectedTarget || queueItems.length === 0) return null;
    const tName = selectedTarget.name.toLowerCase().trim();
    const firstName = tName.split(/\s+/)[0];
    return (
      queueItems.find(
        (item) =>
          item.prospect.name.toLowerCase().trim() === tName ||
          (firstName.length >= 3 && item.prospect.name.toLowerCase().includes(firstName)),
      ) ?? null
    );
  }, [selectedTarget, queueItems]);

  const qualification = matchedQueueItem?.qualification ?? null;

  const contactIntel = useMemo((): ApiContactIntelligence | null => {
    if (!matchedQueueItem || contactItems.length === 0) return null;
    return (
      contactItems.find((c) => c.prospectId === matchedQueueItem.prospect.id) ??
      null
    );
  }, [matchedQueueItem, contactItems]);

  const targetOutreachOps = useMemo(() => {
    if (!selectedTarget || allOps.length === 0) return [];
    return allOps.filter((op) => op.targetId === selectedTarget.id);
  }, [selectedTarget, allOps]);

  // ── Product + partner intelligence (deterministic, client-side) ────────────

  const productIntel = useMemo(() => {
    if (!selectedProduct) return null;
    try {
      return generateProductIntelligence(selectedProduct);
    } catch {
      return null;
    }
  }, [selectedProduct]);

  const partnerStrategy = useMemo(() => {
    if (!selectedProduct) return null;
    try {
      return generatePartnerIntelligence(selectedProduct);
    } catch {
      return null;
    }
  }, [selectedProduct]);

  // ── Research fields (local state, mirrors target record, saveable) ─────────

  const [researchDraft, setResearchDraft] = useState({
    audienceSize: "",
    contentAngle: "",
    notes: "",
  });

  useEffect(() => {
    if (selectedTarget) {
      setResearchDraft({
        audienceSize: selectedTarget.audienceSize ?? "",
        contentAngle: selectedTarget.contentAngle ?? "",
        notes: selectedTarget.notes ?? "",
      });
    } else {
      setResearchDraft({ audienceSize: "", contentAngle: "", notes: "" });
    }
  }, [selectedTargetId, selectedTarget?.id]);

  const updateResearch = (field: keyof typeof researchDraft, value: string) => {
    setResearchDraft((prev) => ({ ...prev, [field]: value }));
  };

  const [savedResearch, setSavedResearch] = useState(false);

  const saveResearchMutation = useMutation({
    mutationFn: () => {
      if (!selectedTarget) throw new Error("No target selected");
      return updateTarget(selectedTarget.id, {
        audienceSize: researchDraft.audienceSize || undefined,
        contentAngle: researchDraft.contentAngle || undefined,
        notes: researchDraft.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["targets"] });
      setSavedResearch(true);
      toast({ title: "Research saved to target record" });
      setTimeout(() => setSavedResearch(false), 2000);
    },
    onError: (e: Error) => {
      toast({ title: "Error saving research", description: e.message, variant: "destructive" });
    },
  });

  // ── Build full OutreachIntelligenceContext ────────────────────────────────

  const intelContext = useMemo((): OutreachIntelligenceContext | null => {
    if (!selectedTarget || !selectedProduct) return null;

    // Collect all qualification reasons into a flat array
    const qualReasons: string[] = [];
    if (qualification?.scoreReasons) {
      const sr = qualification.scoreReasons;
      [sr.audienceMatch, sr.contentRelevance, sr.partnershipReadiness].forEach((arr) => {
        if (arr) qualReasons.push(...arr);
      });
    }

    // Find the matching partner category from strategy
    const strategyCategory = partnerStrategy?.partnerCategories?.find(
      (c) =>
        selectedTarget.partnerCategory.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(selectedTarget.partnerCategory.toLowerCase()),
    );

    // Derive preferred contact method from contact intel
    let preferredContactMethod: string | null = null;
    if (contactIntel) {
      if (contactIntel.businessEmail) preferredContactMethod = "Email";
      else if (contactIntel.instagramUrl) preferredContactMethod = "Instagram DM";
      else if (contactIntel.linkedinUrl) preferredContactMethod = "LinkedIn";
      else if (contactIntel.tiktokUrl) preferredContactMethod = "TikTok DM";
      else if (contactIntel.contactPageUrl) preferredContactMethod = "Website Contact Form";
    }

    // Outreach history
    const priorStatuses = targetOutreachOps.map((op) => op.outreachStatus);
    const lastOp = targetOutreachOps.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

    return {
      targetName: selectedTarget.name,
      company: selectedTarget.company,
      platform: selectedTarget.platform,
      partnerCategory: selectedTarget.partnerCategory,
      website: selectedTarget.website,
      socialUrl: selectedTarget.socialUrl,
      audienceSize: researchDraft.audienceSize || selectedTarget.audienceSize || null,
      contentAngle: researchDraft.contentAngle || selectedTarget.contentAngle || null,
      notes: researchDraft.notes || selectedTarget.notes || null,
      productName: selectedProduct.name,
      productCategory: selectedProduct.category,
      productSummary: `${selectedProduct.targetCustomer} — ${selectedProduct.mainBenefit}`,
      productBenefits: selectedProduct.mainBenefit,
      productMarket: productIntel?.mainMarket ?? null,
      productOutreachAngle: productIntel?.outreachAngle ?? null,
      partnerStrategySummary: partnerStrategy
        ? `${partnerStrategy.topPartnerCategory} · ${partnerStrategy.estimatedRevenueOpportunity} revenue opportunity`
        : null,
      recommendedDealType:
        partnerStrategy?.dealStructures?.find((d) => d.isBest)?.type ?? null,
      strategyOutreachAngle: strategyCategory?.outreachAngle ?? productIntel?.suggestedOutreachAngle ?? null,
      partnerFitScore: qualification?.partnerFitScore ?? null,
      qualificationLabel: qualification?.qualificationLabel ?? null,
      qualificationReasons: qualReasons.length > 0 ? qualReasons : null,
      hardFlags: qualification?.hardFlags ?? null,
      nextBestAction: qualification?.nextBestAction ?? null,
      contactReadinessScore: contactIntel?.contactReadinessScore ?? null,
      preferredContactMethod,
      businessEmail: contactIntel?.businessEmail ?? null,
      priorOutreachCount: targetOutreachOps.length,
      priorOutreachStatuses: priorStatuses,
      lastOutreachDate: lastOp?.createdAt ?? null,
      latestVideoTitle: matchedQueueItem?.prospect.notes?.match(/latest.*?:\s*(.+?)(?:\n|$)/i)?.[1] ?? null,
      latestVideoDate: null,
    };
  }, [
    selectedTarget,
    selectedProduct,
    qualification,
    contactIntel,
    partnerStrategy,
    productIntel,
    researchDraft,
    targetOutreachOps,
    matchedQueueItem,
  ]);

  // ── Intelligence sources panel data ───────────────────────────────────────

  const [intelPanelExpanded, setIntelPanelExpanded] = useState(true);

  const intelSources = useMemo((): IntelSource[] => {
    const hasTarget = !!selectedTarget;
    const hasProduct = !!selectedProduct;

    return [
      {
        label: "Product Intelligence",
        status: productIntel ? "loaded" : hasProduct ? "partial" : "missing",
        summary: productIntel
          ? `${productIntel.mainMarket} · ${productIntel.campaignOpportunityRating} opportunity · ${productIntel.marketDifficulty} difficulty`
          : null,
        link: "/product-intake",
        linkLabel: "Add a product →",
      },
      {
        label: "Partner Strategy",
        status: partnerStrategy ? "loaded" : hasProduct ? "partial" : "missing",
        summary: partnerStrategy
          ? `Top category: ${partnerStrategy.topPartnerCategory} · ${partnerStrategy.estimatedRevenueOpportunity} revenue · ${partnerStrategy.estimatedAcquisitionDifficulty} acquisition`
          : null,
        link: "/partner-strategy",
        linkLabel: "View partner strategy →",
      },
      {
        label: "Qualification Engine",
        status: loadingQueue
          ? "loading"
          : qualification
          ? "loaded"
          : hasTarget
          ? "missing"
          : "missing",
        summary: qualification
          ? `${qualification.qualificationLabel} · Fit score: ${qualification.partnerFitScore}/100 · ${qualification.qualificationStatus}`
          : null,
        link: "/qualification",
        linkLabel: "Run qualification →",
      },
      {
        label: "Contact Intelligence",
        status: loadingContacts
          ? "loading"
          : contactIntel
          ? contactIntel.businessEmail
            ? "loaded"
            : "partial"
          : hasTarget
          ? "missing"
          : "missing",
        summary: contactIntel
          ? [
              contactIntel.businessEmail && `Email: ${contactIntel.businessEmail}`,
              contactIntel.contactReadinessScore != null &&
                `Readiness: ${contactIntel.contactReadinessScore}/100`,
              contactIntel.verificationStatus && `Status: ${contactIntel.verificationStatus}`,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
        link: "/contact-intelligence",
        linkLabel: "Discover contact intel →",
      },
      {
        label: "Outreach History",
        status: loadingOps
          ? "loading"
          : targetOutreachOps.length > 0
          ? "loaded"
          : "missing",
        summary:
          targetOutreachOps.length > 0
            ? `${targetOutreachOps.length} prior message${targetOutreachOps.length !== 1 ? "s" : ""} · Latest: ${targetOutreachOps[0]?.outreachStatus ?? "unknown"}`
            : null,
        link: "/outreach-operations",
        linkLabel: "View outreach ops →",
      },
    ];
  }, [
    selectedTarget,
    selectedProduct,
    productIntel,
    partnerStrategy,
    qualification,
    contactIntel,
    targetOutreachOps,
    loadingQueue,
    loadingContacts,
    loadingOps,
  ]);

  // ── Research Utilization Score ────────────────────────────────────────────

  const scoreData = useMemo(() => computeResearchUtilizationScore(intelContext), [intelContext]);

  // ── Message generation ────────────────────────────────────────────────────

  const [messages, setMessages] = useState<OutreachPlanMessages | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<MessageKey, string>>({
    firstEmail: "",
    dm: "",
    followUp1: "",
    followUp2: "",
    objectionResponse: "",
  });
  const [activeTab, setActiveTab] = useState<MessageKey>("firstEmail");
  const [savedOpTab, setSavedOpTab] = useState<MessageKey | null>(null);

  const commission = selectedProduct ? `${selectedProduct.commissionOffer}%` : "35–40%";

  const generate = useCallback(() => {
    if (!selectedTarget || !selectedProduct) return;

    let msgs: OutreachPlanMessages;
    if (intelContext) {
      msgs = generateIntelligenceOutreachMessages(selectedProduct, commission, intelContext);
    } else {
      // Fallback to legacy research messages
      const research: ResearchContext = {
        targetName: selectedTarget.name,
        company: selectedTarget.company,
        platform: selectedTarget.platform,
        audienceSize: researchDraft.audienceSize || selectedTarget.audienceSize || null,
        contentAngle: researchDraft.contentAngle || selectedTarget.contentAngle || null,
        notes: researchDraft.notes || selectedTarget.notes || null,
        website: selectedTarget.website,
        socialUrl: selectedTarget.socialUrl,
      };
      const outreachAngle =
        researchDraft.contentAngle ||
        selectedTarget.contentAngle ||
        `${selectedTarget.partnerCategory}s in the ${selectedProduct.category} space are a strong fit for ${selectedProduct.name}.`;
      msgs = generateResearchOutreachMessages(
        selectedTarget.partnerCategory,
        selectedProduct,
        commission,
        outreachAngle,
        research,
      );
    }

    setMessages(msgs);
    setEditedMessages({ firstEmail: "", dm: "", followUp1: "", followUp2: "", objectionResponse: "" });
    setSavedOpTab(null);
  }, [selectedTarget, selectedProduct, intelContext, commission, researchDraft]);

  const getMessage = useCallback(
    (key: MessageKey): string => editedMessages[key] || messages?.[key] || "",
    [editedMessages, messages],
  );

  const saveAsOpMutation = useMutation({
    mutationFn: (tab: Tab) => {
      if (!selectedTarget || !selectedProduct) throw new Error("No target/product");
      const msg = getMessage(tab.key);
      const subject =
        tab.key === "firstEmail"
          ? `Partnership opportunity — ${selectedProduct.name} × ${selectedTarget.partnerCategory}`
          : tab.key === "dm"
          ? undefined
          : `Re: Partnership opportunity — ${selectedProduct.name}`;
      return createOutreachOperation({
        targetId: selectedTarget.id,
        creatorName: selectedTarget.name,
        contactMethod: tab.channel,
        outreachSubject: subject,
        outreachMessage: msg,
        productId: selectedProdId || undefined,
        outreachStatus: "draft",
        priority: "medium",
      });
    },
    onSuccess: (_, tab) => {
      setSavedOpTab(tab.key);
      qc.invalidateQueries({ queryKey: ["outreach-operations"] });
      qc.invalidateQueries({ queryKey: ["outreach-metrics"] });
      qc.invalidateQueries({ queryKey: ["outreach-operations-all"] });
      toast({ title: "Saved as draft in Outreach Operations" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const activeTabDef = TABS.find((t) => t.key === activeTab)!;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/targets">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Targets
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Research-Based Outreach Letters
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Letters powered by product intelligence, qualification scores, contact data, and partner strategy.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200 text-sm">
        <Info className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
        <div className="text-violet-800 leading-relaxed">
          <strong>How intelligence powers outreach:</strong> Each letter draws from 5 sources —
          Product Intelligence (market context), Partner Strategy (outreach angle), Qualification Engine
          (why this creator was selected), Contact Intelligence (preferred channel), and Outreach History
          (prior engagement). The Research Utilization Score tells you how much of that data is being used.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Target + Intelligence + Research + Score */}
        <div className="space-y-4">
          {/* Target Selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Target className="w-4 h-4 text-muted-foreground" />
                Select Target
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingTargets ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading targets…
                </div>
              ) : (
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a target…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTargets.length === 0 ? (
                      <SelectItem value="__no_targets__" disabled>
                        No targets yet — add some in Targets
                      </SelectItem>
                    ) : (
                      allTargets.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.company ? ` · ${t.company}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}

              {selectedTarget && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">
                      {selectedTarget.partnerCategory}
                    </Badge>
                    {selectedTarget.platform && (
                      <Badge variant="outline" className="text-xs">
                        {selectedTarget.platform}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ml-auto ${
                        selectedTarget.status === "Active Partner"
                          ? "text-emerald-700 border-emerald-200"
                          : selectedTarget.status === "Not Contacted"
                          ? "text-slate-500 border-slate-200"
                          : "text-blue-700 border-blue-200"
                      }`}
                    >
                      {selectedTarget.status}
                    </Badge>
                  </div>
                  {selectedTarget.company && (
                    <p className="text-muted-foreground">{selectedTarget.company}</p>
                  )}
                  {selectedTarget.website && (
                    <a
                      href={selectedTarget.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="w-3 h-3" />
                      {selectedTarget.website.replace(/^https?:\/\//, "").split("/")[0]}
                    </a>
                  )}
                  {selectedTarget.socialUrl && (
                    <a
                      href={selectedTarget.socialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Link2 className="w-3 h-3" />
                      Social profile
                    </a>
                  )}
                  {/* Quick qualification signal */}
                  {qualification && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">
                        {qualification.qualificationLabel} · {qualification.partnerFitScore}/100
                      </span>
                    </div>
                  )}
                  {/* Quick contact signal */}
                  {contactIntel?.businessEmail && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span className="text-blue-700 font-medium truncate">
                        {contactIntel.businessEmail}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Product</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedProdId} onValueChange={setSelectedProdId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product…" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.commissionOffer}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    Commission: <strong className="text-primary">{selectedProduct.commissionOffer}%</strong>{" "}
                    · {selectedProduct.price}
                  </p>
                  {productIntel && (
                    <p className="text-xs text-muted-foreground">
                      Market: <strong>{productIntel.mainMarket}</strong> ·{" "}
                      <span
                        className={
                          productIntel.campaignOpportunityRating === "Exceptional"
                            ? "text-emerald-600"
                            : productIntel.campaignOpportunityRating === "Strong"
                            ? "text-blue-600"
                            : "text-amber-600"
                        }
                      >
                        {productIntel.campaignOpportunityRating} opportunity
                      </span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Intelligence Panel */}
          <IntelPanel
            sources={intelSources}
            isExpanded={intelPanelExpanded}
            onToggle={() => setIntelPanelExpanded((v) => !v)}
          />

          {/* Research Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                Manual Research Notes
                {selectedTarget && (
                  <span className="ml-auto text-xs text-muted-foreground font-normal">
                    Saved to target
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedTarget ? (
                <p className="text-sm text-muted-foreground/60 italic">
                  Select a target to fill in research.
                </p>
              ) : (
                <>
                  <InlineField
                    label="Audience size"
                    value={researchDraft.audienceSize}
                    placeholder="e.g. 45K email subscribers, 120K YouTube"
                    onChange={(v) => updateResearch("audienceSize", v)}
                  />
                  <InlineField
                    label="Content angle / recent topic"
                    value={researchDraft.contentAngle}
                    placeholder='e.g. "Just launched a course on productivity systems for solopreneurs"'
                    multiline
                    onChange={(v) => updateResearch("contentAngle", v)}
                  />
                  <InlineField
                    label="Notes / why they're a good fit"
                    value={researchDraft.notes}
                    placeholder="Any additional context — niche alignment, mutual connections, past mentions…"
                    multiline
                    onChange={(v) => updateResearch("notes", v)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => saveResearchMutation.mutate()}
                    disabled={saveResearchMutation.isPending || savedResearch}
                  >
                    {savedResearch ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Research Saved
                      </>
                    ) : saveResearchMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Save Research to Target
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Research Utilization Score */}
          <UtilizationScoreCard
            scoreData={scoreData}
            selectedTarget={selectedTarget}
            selectedProduct={selectedProduct}
          />

          {/* Generate button */}
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={generate}
            disabled={!selectedTarget || !selectedProduct}
          >
            <Zap className="w-4 h-4" />
            Generate Outreach Sequence
          </Button>
        </div>

        {/* Right column: Message Tabs */}
        <div className="lg:col-span-2 space-y-4">
          {!messages ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4 border-2 border-dashed rounded-xl p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">Ready to generate</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Select a target and product, then click Generate Outreach Sequence.
                </p>
              </div>
              {scoreData.total > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-bold ${SCORE_COLORS(scoreData.total)}`}>
                    {scoreData.total}%
                  </span>
                  <span className="text-muted-foreground">research utilization</span>
                  <span className="text-xs text-muted-foreground">
                    ({intelSources.filter((s) => s.status === "loaded").length}/5 sources loaded)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Intelligence used banner */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/30">
                <Brain className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span className="font-medium text-foreground">Intelligence used:</span>
                {intelSources
                  .filter((s) => s.status === "loaded")
                  .map((s) => (
                    <Badge key={s.label} variant="outline" className="text-[10px] h-4 px-1.5">
                      {s.label}
                    </Badge>
                  ))}
                <span className="ml-auto font-medium">
                  Score:{" "}
                  <span className={SCORE_COLORS(scoreData.total)}>{scoreData.total}%</span>
                </span>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 flex-wrap">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        activeTab === tab.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      <span className="text-xs opacity-60">{tab.timing}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tip banner */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 border rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{activeTabDef.tip}</span>
              </div>

              {/* Message editor */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{activeTabDef.label}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {activeTabDef.channel}
                      </Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          generate();
                          setEditedMessages((prev) => ({ ...prev, [activeTab]: "" }));
                        }}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Regenerate
                      </Button>
                      <CopyButton text={getMessage(activeTab)} />
                      {savedOpTab === activeTab ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 text-xs gap-1.5"
                          onClick={() => setLocation("/outreach-operations")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          View in Ops →
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => saveAsOpMutation.mutate(activeTabDef)}
                          disabled={saveAsOpMutation.isPending}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {saveAsOpMutation.isPending ? "Saving…" : "Save as Draft Op"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={getMessage(activeTab)}
                    onChange={(e) =>
                      setEditedMessages((prev) => ({ ...prev, [activeTab]: e.target.value }))
                    }
                    className="min-h-[340px] font-mono text-sm resize-none"
                  />
                </CardContent>
              </Card>

              {/* Sequence overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                    Sequence Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {TABS.map((tab, i) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-colors ${
                            activeTab === tab.key
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {i + 1}
                          </div>
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs leading-tight">{tab.label}</span>
                          <span className="text-[10px] text-muted-foreground/60">{tab.timing}</span>
                        </button>
                      );
                    })}
                  </div>
                  {messages.followUpTiming && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {messages.followUpTiming}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
