import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  youtubeSearch,
  createProspect,
  getProspects,
  type YouTubeChannel,
} from "@/lib/api-client";
import { useAppContext } from "@/context/AppContext";
import {
  recordYtSearch,
  addSearchHistory,
  getSearchHistory,
  deleteSearchHistoryEntry,
  type SearchHistoryEntry,
} from "@/lib/ytStats";
import { generateProductIntelligence } from "@/lib/productIntelligence";
import type { Product } from "@/types/influencePartner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Youtube,
  Search,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  Users,
  Star,
  Loader2,
  Info,
  Clock,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  MessageSquare,
  ArrowRight,
  Package,
  Download,
  Film,
  Filter,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const PARTNER_CATEGORIES = [
  "_none_",
  "Course Creator",
  "Newsletter Writer",
  "Podcast Host",
  "YouTuber",
  "Blogger / Writer",
  "Social Media Influencer",
  "Community Builder",
  "Software Reviewer",
  "Consultant / Coach",
  "Agency Owner",
  "Other",
];

const MIN_SUBSCRIBER_OPTIONS = [
  { label: "Any", value: "0" },
  { label: "1k+", value: "1000" },
  { label: "5k+", value: "5000" },
  { label: "10k+", value: "10000" },
  { label: "50k+", value: "50000" },
  { label: "100k+", value: "100000" },
  { label: "500k+", value: "500000" },
];

const SCORE_CONFIG: Record<
  YouTubeChannel["discoveryLabel"],
  { color: string; bg: string; dot: string; chipActive: string; chipInactive: string }
> = {
  Excellent: {
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    chipActive: "bg-emerald-600 text-white border-emerald-600",
    chipInactive: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  },
  Good: {
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
    chipActive: "bg-blue-600 text-white border-blue-600",
    chipInactive: "border-blue-200 text-blue-700 hover:bg-blue-50",
  },
  Moderate: {
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
    chipActive: "bg-amber-500 text-white border-amber-500",
    chipInactive: "border-amber-200 text-amber-700 hover:bg-amber-50",
  },
  Low: {
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    dot: "bg-gray-400",
    chipActive: "bg-gray-500 text-white border-gray-500",
    chipInactive: "border-gray-200 text-gray-600 hover:bg-gray-50",
  },
};

type ScoreFilter = "all" | YouTubeChannel["discoveryLabel"];

const FALLBACK_KEYWORDS = [
  "Mortgage Coach",
  "Credit Repair",
  "Homebuyer Education",
  "Wellness Coach",
  "Personal Finance",
  "SaaS Reviews",
  "Productivity Coaching",
  "Herbal Education",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

function formatMinSubs(n: number): string {
  if (n === 0) return "Any";
  return MIN_SUBSCRIBER_OPTIONS.find((o) => Number(o.value) === n)?.label ?? `${n}+`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function formatVideoAge(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 14) return `${diffDays}d ago`;
  if (diffDays < 60) return `${Math.round(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)}mo ago`;
  return `${Math.round(diffDays / 365)}y ago`;
}

// ─── Better product-based keyword suggestions ─────────────────────────────────
// Uses generateProductIntelligence() for niche-specific terms:
//   subNiches → best YouTube search terms (e.g., "Credit Building", "Debt Management")
//   buyerPersona.interests → audience intent terms (e.g., "Investing", "FIRE movement")
//   recommendedCreatorCategories → content category matches
// Falls back to raw product fields (name, category, targetCustomer).

function buildProductKeywords(product: Product): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (s: string | undefined) => {
    if (!s) return;
    const t = s.split(/[,;./\n]/)[0].trim();
    if (t.length >= 3 && t.length <= 55 && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      result.push(t);
    }
  };

  // Run deterministic intelligence (no API calls)
  const intel = generateProductIntelligence(product);

  // 1. subNiches (derived from subMarket — excellent search terms)
  //    e.g., Finance → ["Investment Tracking", "Budgeting", "Wealth Management"]
  intel.subNiches.forEach((s) => add(s));

  // 2. Buyer persona interests (audience intent)
  //    e.g., Finance → ["Investing", "FIRE movement", "Crypto"]
  intel.buyerPersona.interests.slice(0, 3).forEach((s) => add(s));

  // 3. Primary creator categories, split on "/" to get clean terms
  //    e.g., "Personal Finance / Investing" → "Personal Finance", "Investing"
  intel.recommendedCreatorCategories
    .filter((c) => c.fitLevel === "Primary")
    .forEach((c) => c.category.split(/[/·]/).forEach((s) => add(s.trim())));

  // 4. mainNiche if different from raw category
  if (intel.mainNiche && intel.mainNiche !== product.category) {
    intel.mainNiche.split(/[&/·]/).forEach((s) => add(s.trim()));
  }

  // 5. Product name and category as anchors
  add(product.name);
  add(product.category);

  return result.slice(0, 8);
}

// ─── Channel insights (deterministic, subscriber-tier based) ─────────────────

interface ChannelInsights {
  matchReason: string;
  whyItFits: string;
  outreachAngle: string;
  nextAction: string;
  nextActionColor: string;
}

function computeInsights(ch: YouTubeChannel): ChannelInsights {
  const subs = ch.subscriberCount;
  const fmt = formatSubscribers(subs);

  const matchReason = `#${ch.searchRank} search result · ${fmt} subscribers · discovery score ${ch.discoveryScore}/100`;

  let whyItFits: string;
  if (subs >= 50_000 && subs < 200_000) {
    whyItFits = "Sweet spot for 35–40% commission deals — enough reach for real revenue without mega-creator rates";
  } else if (subs >= 10_000 && subs < 50_000) {
    whyItFits = "Engaged niche audience — early-partner potential at favorable terms before they outgrow commission deals";
  } else if (subs >= 200_000 && subs < 1_000_000) {
    whyItFits = "Established creator with strong credibility — may negotiate a hybrid flat-fee + commission structure";
  } else if (subs >= 1_000_000) {
    whyItFits = "High-reach channel — consider as a brand-awareness play; pure commission may not close at this scale";
  } else {
    whyItFits = "Small but growing — very low acquisition cost; ideal if content alignment to your niche is tight";
  }

  let outreachAngle: string;
  if (subs >= 50_000 && subs < 200_000) {
    outreachAngle = "Lead with a revenue projection: show estimated monthly earnings at 35–40% commission";
  } else if (subs < 10_000) {
    outreachAngle = "Pitch an exclusive early-partner deal — top commission tier, grow-together narrative";
  } else if (subs >= 1_000_000) {
    outreachAngle = "Propose a sponsored series + revenue share hybrid to reduce their perceived risk";
  } else {
    outreachAngle = "Offer uncapped performance commission — highlight that earnings scale with their content output";
  }

  const actionMap: Record<YouTubeChannel["discoveryLabel"], { text: string; color: string }> = {
    Excellent: { text: "Add now → Qualify → Move to Targets", color: "text-emerald-700" },
    Good: { text: "Add and review recent videos before reaching out", color: "text-blue-700" },
    Moderate: { text: "Review channel content for audience fit first", color: "text-amber-700" },
    Low: { text: "Low priority — monitor or skip to the next result", color: "text-gray-500" },
  };
  const action = actionMap[ch.discoveryLabel];

  return { matchReason, whyItFits, outreachAngle, nextAction: action.text, nextActionColor: action.color };
}

// ─── Prospect notes builder ───────────────────────────────────────────────────
// Pre-fills the Discovery Workspace prospect with insights so the team
// knows why this channel was added and how to approach them.

function buildProspectNotes(ch: YouTubeChannel, insights: ChannelInsights): string {
  const lines: string[] = [
    `Match Reason: ${insights.matchReason}`,
    `Why This Fits: ${insights.whyItFits}`,
    `Suggested Outreach Angle: ${insights.outreachAngle}`,
  ];
  if (ch.description) {
    lines.push("", `About: ${ch.description.slice(0, 300)}`);
  }
  return lines.join("\n").slice(0, 1000);
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportToCSV(channels: YouTubeChannel[], searchKeyword: string) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const headers = [
    "Channel Name",
    "URL",
    "Subscribers",
    "Discovery Score",
    "Score Label",
    "Description",
    "Suggested Outreach Angle",
    "Latest Video Title",
    "Latest Video Date",
  ].map(esc).join(",");

  const rows = channels.map((ch) => {
    const ins = computeInsights(ch);
    return [
      ch.channelName,
      ch.channelUrl,
      ch.subscriberCount,
      ch.discoveryScore,
      ch.discoveryLabel,
      ch.description,
      ins.outreachAngle,
      ch.latestVideoTitle ?? "",
      ch.latestVideoPublishedAt ? new Date(ch.latestVideoPublishedAt).toLocaleDateString() : "",
    ].map(esc).join(",");
  });

  const csv = [headers, ...rows].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const slug = searchKeyword.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
  a.download = `yt-discovery-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function YoutubeDiscovery() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { products, selectedProductId } = useAppContext();

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );
  const productKeywords = useMemo(
    () => (selectedProduct ? buildProductKeywords(selectedProduct) : []),
    [selectedProduct],
  );

  // ── Form state ────────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState("");
  const [partnerCategory, setPartnerCategory] = useState("_none_");
  const [minSubscribers, setMinSubscribers] = useState("0");

  // ── Active search params (drives React Query) ─────────────────────────────
  const [activeParams, setActiveParams] = useState<{
    keyword: string;
    partnerCategory: string;
    minimumSubscribers: number;
  } | null>(null);

  // ── Per-channel tracking ──────────────────────────────────────────────────
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // ── Score filter ──────────────────────────────────────────────────────────
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");

  // ── Search history ────────────────────────────────────────────────────────
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() => getSearchHistory());

  // ── Existing prospects (deduplication) ───────────────────────────────────
  const { data: prospects = [] } = useQuery({
    queryKey: ["prospects"],
    queryFn: () => getProspects(),
    staleTime: 30_000,
  });

  const existingUrls = useMemo(() => {
    const urls = new Set<string>();
    for (const p of prospects) {
      if (p.website) urls.add(p.website);
      if (p.socialUrl) urls.add(p.socialUrl);
    }
    return urls;
  }, [prospects]);

  // ── YouTube search query ──────────────────────────────────────────────────
  const { data, isLoading, isError, error, isFetched } = useQuery({
    queryKey: [
      "youtube-search",
      activeParams?.keyword,
      activeParams?.partnerCategory,
      activeParams?.minimumSubscribers,
    ],
    queryFn: async () => {
      if (!activeParams) throw new Error("No search params");
      const result = await youtubeSearch({
        keyword: activeParams.keyword,
        partnerCategory:
          activeParams.partnerCategory !== "_none_" ? activeParams.partnerCategory : undefined,
        minimumSubscribers: activeParams.minimumSubscribers || undefined,
      });
      recordYtSearch(result.channels);
      const avgScore =
        result.channels.length > 0
          ? Math.round(
              result.channels.reduce((s, c) => s + c.discoveryScore, 0) / result.channels.length,
            )
          : 0;
      addSearchHistory({
        keyword: activeParams.keyword,
        partnerCategory: activeParams.partnerCategory,
        minimumSubscribers: activeParams.minimumSubscribers,
        resultCount: result.channels.length,
        avgScore,
        searchedAt: new Date().toISOString(),
      });
      setHistory(getSearchHistory());
      return result;
    },
    enabled: !!activeParams,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const channels = data?.channels ?? [];
  const avgScore =
    channels.length > 0
      ? Math.round(channels.reduce((s, c) => s + c.discoveryScore, 0) / channels.length)
      : 0;

  // ── Filtered channels (score filter) ─────────────────────────────────────
  const filteredChannels = useMemo(
    () =>
      scoreFilter === "all" ? channels : channels.filter((ch) => ch.discoveryLabel === scoreFilter),
    [channels, scoreFilter],
  );

  // Score counts for filter chips
  const scoreCounts = useMemo(() => {
    const counts: Record<string, number> = { Excellent: 0, Good: 0, Moderate: 0, Low: 0 };
    channels.forEach((ch) => counts[ch.discoveryLabel]++);
    return counts;
  }, [channels]);

  // ── Derived selection state ───────────────────────────────────────────────
  const selectableIds = useMemo(
    () =>
      filteredChannels
        .filter((ch) => !addedIds.has(ch.channelId) && !existingUrls.has(ch.channelUrl))
        .map((ch) => ch.channelId),
    [filteredChannels, addedIds, existingUrls],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const selectedCount = [...selectedIds].filter((id) => selectableIds.includes(id)).length;

  // ── Add single channel ────────────────────────────────────────────────────
  async function handleAdd(ch: YouTubeChannel) {
    if (addedIds.has(ch.channelId) || addingId === ch.channelId) return;
    setAddingId(ch.channelId);
    const insights = computeInsights(ch);
    try {
      await createProspect({
        name: ch.channelName,
        company: ch.channelName,
        website: ch.channelUrl,
        socialUrl: ch.channelUrl,
        partnerCategory:
          activeParams?.partnerCategory !== "_none_" ? activeParams?.partnerCategory : undefined,
        notes: buildProspectNotes(ch, insights),
        audienceSize: `${formatSubscribers(ch.subscriberCount)} subscribers`,
        platform: "YouTube",
        source: "YouTube",
        status: "New Prospect",
      });
      setAddedIds((prev) => new Set([...prev, ch.channelId]));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(ch.channelId);
        return next;
      });
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast({ title: "Added to Discovery Workspace", description: `${ch.channelName} is now a prospect.` });
    } catch (e) {
      toast({
        title: `Failed to add ${ch.channelName}`,
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setAddingId(null);
    }
  }

  // ── Bulk add ──────────────────────────────────────────────────────────────
  async function handleBulkAdd() {
    const toAdd = channels.filter(
      (ch) =>
        selectedIds.has(ch.channelId) &&
        !addedIds.has(ch.channelId) &&
        !existingUrls.has(ch.channelUrl),
    );
    if (toAdd.length === 0) return;

    setIsBulkAdding(true);
    let added = 0;
    let failed = 0;

    for (const ch of toAdd) {
      const insights = computeInsights(ch);
      try {
        await createProspect({
          name: ch.channelName,
          company: ch.channelName,
          website: ch.channelUrl,
          socialUrl: ch.channelUrl,
          partnerCategory:
            activeParams?.partnerCategory !== "_none_" ? activeParams?.partnerCategory : undefined,
          notes: buildProspectNotes(ch, insights),
          audienceSize: `${formatSubscribers(ch.subscriberCount)} subscribers`,
          platform: "YouTube",
          source: "YouTube",
          status: "New Prospect",
        });
        setAddedIds((prev) => new Set([...prev, ch.channelId]));
        added++;
      } catch {
        failed++;
      }
    }

    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: ["prospects"] });
    setIsBulkAdding(false);

    toast({
      title: `${added} channel${added !== 1 ? "s" : ""} added to Discovery Workspace`,
      description: failed > 0 ? `${failed} failed to add.` : undefined,
    });
  }

  // ── Search helpers ────────────────────────────────────────────────────────
  function doSearch(kw: string, cat: string, minSubs: string) {
    setActiveParams({ keyword: kw, partnerCategory: cat, minimumSubscribers: parseInt(minSubs, 10) || 0 });
    setAddedIds(new Set());
    setSelectedIds(new Set());
    setExpandedInsights(new Set());
    setScoreFilter("all");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    doSearch(keyword.trim(), partnerCategory, minSubscribers);
  }

  function runHistoryEntry(entry: SearchHistoryEntry) {
    setKeyword(entry.keyword);
    setPartnerCategory(entry.partnerCategory);
    setMinSubscribers(String(entry.minimumSubscribers));
    doSearch(entry.keyword, entry.partnerCategory, String(entry.minimumSubscribers));
  }

  function removeHistoryEntry(id: string) {
    deleteSearchHistoryEntry(id);
    setHistory(getSearchHistory());
  }

  function toggleInsight(channelId: string) {
    setExpandedInsights((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  }

  function toggleSelectChannel(channelId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  }

  const errorMessage = isError ? ((error as Error)?.message ?? "Search failed. Please try again.") : null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Youtube className="w-6 h-6 text-red-600" />
          YouTube Discovery
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Find YouTube channels that match your product and add them to your Discovery Workspace
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-1">
              <Label>Keyword *</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Mortgage Coach"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label>Partner Category</Label>
              <Select value={partnerCategory} onValueChange={setPartnerCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Any category</SelectItem>
                  {PARTNER_CATEGORIES.filter((c) => c !== "_none_").map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Minimum Subscribers</Label>
              <Select value={minSubscribers} onValueChange={setMinSubscribers}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MIN_SUBSCRIBER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product-suggested keywords (intelligence-powered) */}
          {productKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="flex items-center gap-1 text-xs text-primary font-medium mr-1">
                <Package className="w-3 h-3" />
                From {selectedProduct?.name}:
              </span>
              {productKeywords.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setKeyword(kw)}
                  className="text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
          )}

          {/* Fallback example chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground mr-1">
              {productKeywords.length > 0 ? "Or try:" : "Examples:"}
            </span>
            {FALLBACK_KEYWORDS.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => setKeyword(kw)}
                className="text-xs px-2 py-0.5 rounded-full border border-border hover:bg-accent transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!keyword.trim() || isLoading} className="gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isLoading ? "Searching…" : "Search YouTube"}
            </Button>
            {channels.length > 0 && !isLoading && (
              <span className="text-sm text-muted-foreground">
                {channels.length} channel{channels.length !== 1 ? "s" : ""} found
                {avgScore > 0 && <> · avg score <strong>{avgScore}</strong></>}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Recent Search History */}
      {history.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Recent Searches
          </h3>
          <div className="space-y-1.5">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{entry.keyword}</span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {entry.partnerCategory !== "_none_" && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {entry.partnerCategory}
                      </Badge>
                    )}
                    {entry.minimumSubscribers > 0 && <span>{formatMinSubs(entry.minimumSubscribers)}</span>}
                    {entry.resultCount > 0 && (
                      <span>{entry.resultCount} results · avg score {entry.avgScore}</span>
                    )}
                    <span className="text-muted-foreground/60">{formatDate(entry.searchedAt)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => runHistoryEntry(entry)}
                >
                  <Search className="w-3 h-3" />
                  Run Again
                </Button>
                <button
                  onClick={() => removeHistoryEntry(entry.id)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error messages */}
      {errorMessage?.includes("not configured") && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">YouTube API key required</p>
            <p className="mt-1">
              Add your{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">YOUTUBE_API_KEY</code> to the
              Replit Secrets panel. Get a free key from{" "}
              <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">
                Google Cloud Console
              </a>{" "}
              → APIs &amp; Services → YouTube Data API v3.
            </p>
          </div>
        </div>
      )}
      {errorMessage?.includes("quota") && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}
      {errorMessage && !errorMessage.includes("not configured") && !errorMessage.includes("quota") && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* No results */}
      {isFetched && !isLoading && !isError && channels.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Youtube className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-foreground">No matching channels found</p>
          <p className="text-sm mt-1">Try a broader keyword or reduce the minimum subscriber count.</p>
        </div>
      )}

      {/* Results */}
      {channels.length > 0 && (
        <div className="space-y-3">
          {/* Results header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Results for "{activeParams?.keyword}"
              {activeParams?.partnerCategory !== "_none_" && (
                <span className="normal-case font-normal"> · {activeParams?.partnerCategory}</span>
              )}
            </h2>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {/* Select all */}
              {selectableIds.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Checkbox checked={allSelected} className="w-3.5 h-3.5" />
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}

              {/* Bulk add */}
              {selectedCount > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleBulkAdd}
                  disabled={isBulkAdding}
                >
                  {isBulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {isBulkAdding ? "Adding…" : `Add Selected (${selectedCount})`}
                </Button>
              )}

              {/* Export CSV */}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => exportToCSV(filteredChannels, activeParams?.keyword ?? "results")}
              >
                <Download className="w-3.5 h-3.5" />
                Export{filteredChannels.length < channels.length ? ` (${filteredChannels.length})` : ""}
              </Button>

              <span className="text-xs text-muted-foreground">
                {addedIds.size} of {channels.length} added
              </span>
            </div>
          </div>

          {/* Score filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="w-3 h-3" />
              Filter:
            </span>
            <button
              onClick={() => setScoreFilter("all")}
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                scoreFilter === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              All ({channels.length})
            </button>
            {(["Excellent", "Good", "Moderate", "Low"] as const).map((label) => {
              const count = scoreCounts[label];
              if (count === 0) return null;
              const cfg = SCORE_CONFIG[label];
              const isActive = scoreFilter === label;
              return (
                <button
                  key={label}
                  onClick={() => setScoreFilter(isActive ? "all" : label)}
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                    isActive ? cfg.chipActive : cfg.chipInactive
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
            {scoreFilter !== "all" && (
              <span className="text-xs text-muted-foreground">
                — showing {filteredChannels.length} of {channels.length}
              </span>
            )}
          </div>

          {/* No results after filter */}
          {filteredChannels.length === 0 && scoreFilter !== "all" && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No {scoreFilter} channels in this search.{" "}
              <button onClick={() => setScoreFilter("all")} className="underline">
                Show all
              </button>
            </div>
          )}

          {/* Channel cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredChannels.map((ch) => {
              const scoreCfg = SCORE_CONFIG[ch.discoveryLabel];
              const isAdded = addedIds.has(ch.channelId);
              const isAdding = addingId === ch.channelId;
              const isDuplicate = existingUrls.has(ch.channelUrl);
              const isSelected = selectedIds.has(ch.channelId);
              const isSelectable = !isAdded && !isDuplicate;
              const insightsExpanded = expandedInsights.has(ch.channelId);
              const insights = computeInsights(ch);

              return (
                <div
                  key={ch.channelId}
                  className={`bg-card border rounded-xl p-5 flex flex-col gap-3 transition-shadow ${
                    isSelected ? "ring-2 ring-primary/40 shadow-sm" : "hover:shadow-sm"
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3">
                    {channels.length > 1 && (
                      <div className="pt-0.5 flex-shrink-0">
                        <Checkbox
                          checked={isSelected}
                          disabled={!isSelectable}
                          onCheckedChange={() => isSelectable && toggleSelectChannel(ch.channelId)}
                          className="w-4 h-4"
                        />
                      </div>
                    )}
                    {ch.thumbnailUrl ? (
                      <img
                        src={ch.thumbnailUrl}
                        alt={ch.channelName}
                        className="w-11 h-11 rounded-full flex-shrink-0 object-cover bg-muted"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex-shrink-0 bg-red-100 flex items-center justify-center">
                        <Youtube className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-base leading-tight">{ch.channelName}</p>
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${scoreCfg.bg} ${scoreCfg.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${scoreCfg.dot}`} />
                          {ch.discoveryLabel} · {ch.discoveryScore}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {formatSubscribers(ch.subscriberCount)} subscribers
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Rank #{ch.searchRank}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tags + duplicate warning */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Badge variant="outline" className="text-xs">YouTube</Badge>
                    {activeParams?.partnerCategory !== "_none_" && (
                      <Badge variant="secondary" className="text-xs">
                        {activeParams?.partnerCategory}
                      </Badge>
                    )}
                    {isDuplicate && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Already in Discovery Workspace
                      </span>
                    )}
                  </div>

                  {/* Latest video */}
                  {ch.latestVideoTitle && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
                      <Film className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="truncate">
                        <span className="font-medium text-foreground">Latest: </span>
                        {ch.latestVideoTitle}
                        {ch.latestVideoPublishedAt && (
                          <span className="ml-1 text-muted-foreground/70">
                            · {formatVideoAge(ch.latestVideoPublishedAt)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {ch.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 rounded px-2 py-1.5">
                      {ch.description}
                    </p>
                  )}

                  {/* Insights toggle */}
                  <button
                    onClick={() => toggleInsight(ch.channelId)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors self-start"
                  >
                    <Sparkles className="w-3 h-3" />
                    {insightsExpanded ? "Hide analysis" : "See analysis"}
                    {insightsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {/* Insights panel */}
                  {insightsExpanded && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2.5 text-xs">
                      <div className="flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">Match Reason</p>
                          <p className="text-foreground">{insights.matchReason}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">Why This Fits</p>
                          <p className="text-foreground">{insights.whyItFits}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">Suggested Outreach Angle</p>
                          <p className="text-foreground">{insights.outreachAngle}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">Recommended Next Action</p>
                          <p className={`font-medium ${insights.nextActionColor}`}>{insights.nextAction}</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground/60 text-[10px] pt-1 border-t border-border/40">
                        This analysis is saved to the prospect notes in Discovery Workspace
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <a href={ch.channelUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Channel
                      </Button>
                    </a>

                    {isDuplicate ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-amber-700 border-amber-200 bg-amber-50 cursor-default" disabled>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Already in Workspace
                      </Button>
                    ) : isAdded ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-700 border-emerald-200 bg-emerald-50 cursor-default" disabled>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Added
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleAdd(ch)}
                        disabled={isAdding}
                      >
                        {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {isAdding ? "Adding…" : "Add To Discovery Workspace"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Initial empty state */}
      {!activeParams && !isLoading && (
        <div className="text-center py-20">
          <Youtube className="w-14 h-14 mx-auto mb-4 text-red-500/40" />
          <p className="text-lg font-semibold text-foreground mb-2">Find your next partner on YouTube</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {selectedProduct
              ? `We've pulled suggested keywords from "${selectedProduct.name}" above. Pick one or type your own, then hit Search YouTube.`
              : `Enter a keyword that describes your ideal partner's content — like "Mortgage Coach" or "Personal Finance". We'll score each channel and let you add the best ones to your Discovery Workspace.`}
          </p>
        </div>
      )}
    </div>
  );
}
