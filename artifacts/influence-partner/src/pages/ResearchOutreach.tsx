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
  type ApiPartnerTarget,
  type OutreachContactMethod,
} from "@/lib/api-client";
import {
  generateResearchOutreachMessages,
  computePersonalisationScore,
  type OutreachPlanMessages,
  type ResearchContext,
} from "@/lib/partnerOutreach";

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
  if (score >= 80) return "High personalisation";
  if (score >= 50) return "Moderate — add more research";
  if (score >= 20) return "Basic — add target data";
  return "No personalisation yet";
};

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

  // Target selection state
  const [selectedTargetId, setSelectedTargetId] = useState(targetIdParam);
  const [selectedProdId, setSelectedProdId] = useState(
    productIdParam || selectedProductId || (products[0]?.id ?? ""),
  );

  useEffect(() => {
    if (targetIdParam) setSelectedTargetId(targetIdParam);
  }, [targetIdParam]);

  const selectedTarget = allTargets.find((t) => t.id === selectedTargetId) ?? null;
  const selectedProduct = products.find((p) => p.id === selectedProdId) ?? products[0] ?? null;

  // Research fields (local state, mirrors target record, saveable)
  const [researchDraft, setResearchDraft] = useState({
    audienceSize: "",
    contentAngle: "",
    notes: "",
  });

  // Sync research draft from selected target
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

  // Generate messages
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

  const buildResearchContext = useCallback((): ResearchContext | null => {
    if (!selectedTarget) return null;
    return {
      targetName: selectedTarget.name,
      company: selectedTarget.company,
      platform: selectedTarget.platform || researchDraft.audienceSize ? selectedTarget.platform : null,
      audienceSize: researchDraft.audienceSize || null,
      contentAngle: researchDraft.contentAngle || null,
      notes: researchDraft.notes || null,
      website: selectedTarget.website,
      socialUrl: selectedTarget.socialUrl,
    };
  }, [selectedTarget, researchDraft]);

  const outreachAngle = useMemo(() => {
    if (!selectedTarget || !selectedProduct) return "";
    const notes = researchDraft.notes || selectedTarget.notes || "";
    const contentAngle = researchDraft.contentAngle || selectedTarget.contentAngle || "";
    const audienceSize = researchDraft.audienceSize || selectedTarget.audienceSize || "";
    const parts = [];
    if (contentAngle) parts.push(contentAngle);
    if (notes) parts.push(notes);
    if (audienceSize) parts.push(`Audience size: ${audienceSize}`);
    return parts.join(". ") || `${selectedTarget.partnerCategory}s in the ${selectedProduct.category} space are a strong fit for ${selectedProduct.name}.`;
  }, [selectedTarget, selectedProduct, researchDraft]);

  const commission = selectedProduct
    ? `${selectedProduct.commissionOffer}%`
    : "35–40%";

  const generate = useCallback(() => {
    if (!selectedTarget || !selectedProduct) return;
    const research = buildResearchContext();
    const msgs = research
      ? generateResearchOutreachMessages(
          selectedTarget.partnerCategory,
          selectedProduct,
          commission,
          outreachAngle,
          research,
        )
      : null;
    if (msgs) {
      setMessages(msgs);
      setEditedMessages({
        firstEmail: "",
        dm: "",
        followUp1: "",
        followUp2: "",
        objectionResponse: "",
      });
      setSavedOpTab(null);
    }
  }, [selectedTarget, selectedProduct, buildResearchContext, commission, outreachAngle]);

  const getMessage = useCallback(
    (key: MessageKey): string => {
      return editedMessages[key] || messages?.[key] || "";
    },
    [editedMessages, messages],
  );

  const score = useMemo(() => {
    const research = buildResearchContext();
    return computePersonalisationScore(research, !!selectedProduct, outreachAngle.length > 20);
  }, [buildResearchContext, selectedProduct, outreachAngle]);

  const saveAsOpMutation = useMutation({
    mutationFn: (tab: Tab) => {
      if (!selectedTarget || !selectedProduct) throw new Error("No target/product");
      const msg = getMessage(tab.key);
      const subject = tab.key === "firstEmail"
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
      toast({ title: "Saved as draft in Outreach Operations" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const activeTabDef = TABS.find((t) => t.key === activeTab)!;

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
            Select a target, fill in research notes, then generate a personalised 5-message sequence.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200 text-sm">
        <Info className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
        <div className="text-violet-800 leading-relaxed">
          <strong>Why this is different from generic outreach:</strong> These letters use your actual research about this specific person — their audience size, recent content, and what makes them a good fit. The more research you add, the higher the personalisation score and the better the response rate.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Target + Research */}
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
                <Select
                  value={selectedTargetId}
                  onValueChange={setSelectedTargetId}
                >
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
                  <div className="flex items-center gap-1.5 text-muted-foreground">
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
              <Select
                value={selectedProdId}
                onValueChange={setSelectedProdId}
              >
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
                <p className="text-xs text-muted-foreground mt-2">
                  Commission: <strong className="text-primary">{selectedProduct.commissionOffer}%</strong> · {selectedProduct.price}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Research Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                Research Notes
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

          {/* Personalisation Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                Personalisation Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${SCORE_COLORS(score)}`}>
                  {score}%
                </span>
                <span className={`text-xs font-medium ${SCORE_COLORS(score)}`}>
                  {SCORE_LABEL(score)}
                </span>
              </div>
              <Progress value={score} className="h-2" />
              <ul className="space-y-1 text-xs text-muted-foreground mt-2">
                {[
                  { label: "Target selected", done: !!selectedTarget },
                  { label: "Product selected", done: !!selectedProduct },
                  { label: "Audience size filled", done: !!researchDraft.audienceSize },
                  { label: "Content angle filled", done: !!researchDraft.contentAngle },
                  { label: "Notes / fit reasoning", done: !!researchDraft.notes },
                  { label: "Company name", done: !!selectedTarget?.company },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-1.5">
                    {item.done ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span className={item.done ? "text-foreground" : ""}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

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
                  Select a target, add research notes, then click Generate Outreach Sequence.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Higher personalisation score → better response rate
              </div>
            </div>
          ) : (
            <>
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
                      setEditedMessages((prev) => ({
                        ...prev,
                        [activeTab]: e.target.value,
                      }))
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
