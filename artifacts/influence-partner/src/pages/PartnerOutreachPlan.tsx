import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { generatePartnerOutreachMessages } from "@/lib/partnerOutreach";
import { saveOutreachPlan, addPartnerPipelineTarget } from "@/lib/savedPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Clock,
  Copy,
  CheckCheck,
  BookmarkCheck,
  Users,
  Zap,
  Target,
  Package,
  Info,
  ChevronRight,
  PlusCircle,
} from "lucide-react";

// ─── Query param helper ───────────────────────────────────────────────────────

function useQueryParam(key: string): string {
  // useLocation() in Wouter v3 returns only the pathname (no search string).
  // Reading window.location.search directly is the reliable cross-version approach.
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

// ─── Message tab config ───────────────────────────────────────────────────────

type MessageKey = "firstEmail" | "dm" | "followUp1" | "followUp2" | "objectionResponse";

interface Tab {
  key: MessageKey;
  label: string;
  icon: React.ElementType;
  timing: string;
  tip: string;
}

const TABS: Tab[] = [
  {
    key: "firstEmail",
    label: "First Email",
    icon: Mail,
    timing: "Send on Day 1",
    tip: "This is your primary touchpoint. The subject line is pre-written — use it as-is or personalise. The goal is to open a conversation, not close a deal.",
  },
  {
    key: "dm",
    label: "Short DM",
    icon: MessageSquare,
    timing: "Send same day",
    tip: "Send this alongside the email — or instead of it for creators who primarily use social DMs. Keep it short. If they reply, move to email.",
  },
  {
    key: "followUp1",
    label: "Follow-up 1",
    icon: Clock,
    timing: "4–5 days later",
    tip: "Most deals close after the first follow-up, not the first message. Add a social proof angle here — a result or story that makes it real.",
  },
  {
    key: "followUp2",
    label: "Follow-up 2",
    icon: Clock,
    timing: "9–10 days later",
    tip: "Your last active outreach. Keep it short, friendly, and easy to say yes or no to. No guilt, no pressure — just a clear door left open.",
  },
  {
    key: "objectionResponse",
    label: "Handle Objections",
    icon: Zap,
    timing: "Use when they reply with hesitation",
    tip: "Use this when someone responds but isn't sure. It covers the three most common objections — edit the one that matches what they said.",
  },
];

const TIER_BADGE: Record<string, { label: string; style: string }> = {
  "1": { label: "Tier 1 — Primary", style: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  "2": { label: "Tier 2 — Secondary", style: "bg-blue-100 text-blue-800 border-blue-200" },
  "3": { label: "Tier 3 — Supplementary", style: "bg-amber-100 text-amber-800 border-amber-200" },
};

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
        <><CheckCheck className="w-3.5 h-3.5 text-emerald-600" />Copied!</>
      ) : (
        <><Copy className="w-3.5 h-3.5" />Copy</>
      )}
    </Button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerOutreachPlan() {
  const [, setLocation] = useLocation();
  const { products, selectedProductId } = useAppContext();
  const { toast } = useToast();

  const partnerType = useQueryParam("partnerType");
  const commission = useQueryParam("commission");
  const outreachAngle = useQueryParam("outreachAngle");
  const tierParam = useQueryParam("tier");
  const icon = useQueryParam("icon");
  const targetName = useQueryParam("targetName");

  const firstName = targetName ? targetName.trim().split(/\s+/)[0] : "";

  const [activeTab, setActiveTab] = useState<MessageKey>("firstEmail");
  const [saved, setSaved] = useState(false);
  const [addedToPipeline, setAddedToPipeline] = useState(false);

  const activeProduct =
    (selectedProductId ? products.find((p) => p.id === selectedProductId) : null) ??
    products[0] ??
    null;

  const messages = useMemo(() => {
    if (!activeProduct || !partnerType) return null;
    return generatePartnerOutreachMessages(partnerType, activeProduct, commission, outreachAngle);
  }, [activeProduct, partnerType, commission, outreachAngle]);

  const [editedMessages, setEditedMessages] = useState<Record<MessageKey, string>>({
    firstEmail: "",
    dm: "",
    followUp1: "",
    followUp2: "",
    objectionResponse: "",
  });

  const getMessage = useCallback(
    (key: MessageKey): string => {
      const raw = editedMessages[key] || messages?.[key] || "";
      if (!firstName) return raw;
      return raw.replace(/\[First Name\]/gi, firstName);
    },
    [editedMessages, messages, firstName]
  );

  const setMessage = useCallback((key: MessageKey, val: string) => {
    setEditedMessages((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSavePlan = () => {
    if (!activeProduct || !partnerType) return;
    saveOutreachPlan({
      partnerType,
      productId: activeProduct.id,
      productName: activeProduct.name,
      commission,
      outreachAngle,
      tier: Number(tierParam) || 1,
      icon: icon || undefined,
    });
    setSaved(true);
    toast({
      title: "Outreach plan saved",
      description: `Your plan for ${partnerType} is saved and ready to use from the Dashboard.`,
    });
  };

  const handleAddToPipeline = () => {
    if (!activeProduct || !partnerType) return;
    const { isNew } = addPartnerPipelineTarget({
      partnerType,
      productId: activeProduct.id,
      productName: activeProduct.name,
      commission,
      icon: icon || undefined,
    });
    setAddedToPipeline(true);
    toast({
      title: isNew ? "Added to pipeline" : "Already in pipeline",
      description: isNew
        ? `${partnerType} has been added as a partner target in your pipeline.`
        : `${partnerType} is already tracked in your pipeline.`,
    });
  };

  // ── Empty states ─────────────────────────────────────────────────────────────

  if (!activeProduct) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-5 mt-20">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">No product selected</h1>
          <p className="text-muted-foreground mt-2">Add a product first so we can personalise your outreach plan.</p>
        </div>
        <Button onClick={() => setLocation("/products")}>Add a Product</Button>
      </div>
    );
  }

  if (!partnerType) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-5 mt-20">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Target className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">No partner type selected</h1>
          <p className="text-muted-foreground mt-2">Go to Partner Strategy and click "Create Outreach Plan" on a partner category.</p>
        </div>
        <Button onClick={() => setLocation("/partner-strategy")}>Go to Partner Strategy</Button>
      </div>
    );
  }

  const tierInfo = TIER_BADGE[tierParam] ?? TIER_BADGE["1"];
  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Back nav */}
      <button
        onClick={() => setLocation("/partner-strategy")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-back-strategy"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Partner Strategy
      </button>

      {/* Target personalization banner */}
      {targetName && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-200 bg-blue-50/70 text-sm">
          <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-blue-800">
            Personalising for <strong>{targetName}</strong> — <span className="font-mono text-xs bg-blue-100 px-1 rounded">[First Name]</span> placeholders replaced with <strong>{firstName}</strong>.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {icon && <span className="text-2xl leading-none">{icon}</span>}
            <h1 className="text-2xl font-bold text-foreground">
              Outreach Plan — {partnerType}
            </h1>
            <Badge variant="outline" className={`text-xs border ${tierInfo.style}`}>
              {tierInfo.label}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            5 ready-to-send messages for <strong>{activeProduct.name}</strong> · {commission} commission offer
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant={addedToPipeline ? "outline" : "outline"}
            size="sm"
            className={cn("gap-1.5", addedToPipeline && "border-emerald-300 text-emerald-700")}
            onClick={handleAddToPipeline}
            data-testid="button-add-to-pipeline"
          >
            <PlusCircle className="w-4 h-4" />
            {addedToPipeline ? "In Pipeline ✓" : "Add to Pipeline"}
          </Button>
          <Button
            size="sm"
            className={cn("gap-1.5", saved && "bg-emerald-600 hover:bg-emerald-700")}
            onClick={handleSavePlan}
            data-testid="button-save-plan"
          >
            <BookmarkCheck className="w-4 h-4" />
            {saved ? "Plan Saved ✓" : "Save Outreach Plan"}
          </Button>
        </div>
      </div>

      {/* Context bar */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{activeProduct.name}</p>
                <p className="text-xs text-muted-foreground">{activeProduct.category} · {activeProduct.price}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Commission</p>
                <p className="text-sm font-bold text-primary">{commission}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target Customer</p>
                <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">{activeProduct.targetCustomer}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Main Benefit</p>
                <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">{activeProduct.mainBenefit}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Why this partner + offer details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-amber-700 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Why this partner type was selected
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm text-foreground leading-relaxed">{messages?.whySelected}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Outreach plan details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Recommended offer angle</p>
              <p className="text-sm text-foreground leading-relaxed italic">"{outreachAngle}"</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Follow-up timing</p>
              <p className="text-sm text-foreground">{messages?.followUpTiming}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">Call to action</p>
              <p className="text-sm text-foreground italic">"{messages?.cta}"</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sm">
        <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-sky-800 leading-relaxed">
          <strong>How to use these messages:</strong> Replace every <code className="bg-sky-100 px-1 rounded text-sky-900">[First Name]</code> and <code className="bg-sky-100 px-1 rounded text-sky-900">[Your Name]</code> placeholder before sending. Edit the message in the text box below — your changes are saved when you click Copy.
        </div>
      </div>

      {/* Message tabs + editor */}
      <div className="space-y-4">
        {/* Tab strip */}
        <div className="flex gap-1 flex-wrap p-1 bg-muted/40 rounded-xl border border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`tab-${tab.key}`}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 min-w-[100px] justify-center",
                  active
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active message panel */}
        <Card data-testid={`panel-${activeTab}`}>
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <currentTab.icon className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">{currentTab.label}</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  {currentTab.timing}
                </Badge>
              </div>
              <CopyButton text={getMessage(activeTab)} />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {/* Tip */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border">
              <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{currentTab.tip}</p>
            </div>

            {/* Editable message */}
            <Textarea
              value={getMessage(activeTab)}
              onChange={(e) => setMessage(activeTab, e.target.value)}
              className="min-h-[360px] font-mono text-sm resize-none leading-relaxed"
              data-testid={`textarea-${activeTab}`}
            />

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" />
                Every message leads with the {commission} commission angle — significantly above industry standard.
              </p>
              <CopyButton text={getMessage(activeTab)} />
            </div>
          </CardContent>
        </Card>

        {/* Tab navigation arrows */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={activeTab === "firstEmail"}
            onClick={() => {
              const idx = TABS.findIndex((t) => t.key === activeTab);
              if (idx > 0) setActiveTab(TABS[idx - 1].key);
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous message
          </Button>
          <span className="text-xs text-muted-foreground">
            {TABS.findIndex((t) => t.key === activeTab) + 1} of {TABS.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={activeTab === "objectionResponse"}
            onClick={() => {
              const idx = TABS.findIndex((t) => t.key === activeTab);
              if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].key);
            }}
          >
            Next message
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* CTA footer */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-foreground">Ready to find real {partnerType}s?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse the pre-scored creator list and filter by partner category to find your first contacts.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setLocation("/partner-strategy")}
              data-testid="button-back-to-strategy"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Partner Strategy
            </Button>
            <Button
              onClick={() => setLocation("/discover")}
              data-testid="button-find-creators"
            >
              <Users className="w-4 h-4 mr-2" />
              Browse Creators
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
