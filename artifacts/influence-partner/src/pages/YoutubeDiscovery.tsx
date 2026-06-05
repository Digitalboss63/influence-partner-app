import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { youtubeSearch, createProspect, type YouTubeChannel } from "@/lib/api-client";
import { recordYtSearch } from "@/lib/ytStats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  { color: string; bg: string; dot: string }
> = {
  Excellent: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  Good: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  Moderate: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-400" },
  Low: { color: "text-gray-600", bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400" },
};

const EXAMPLE_KEYWORDS = [
  "Mortgage Coach",
  "Credit Repair",
  "Homebuyer Education",
  "Wellness Coach",
  "Personal Finance",
  "SaaS Reviews",
  "Productivity Coaching",
  "Herbal Education",
];

function formatSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function YoutubeDiscovery() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Search form state ──────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState("");
  const [partnerCategory, setPartnerCategory] = useState("_none_");
  const [minSubscribers, setMinSubscribers] = useState("0");

  // ── Active search params (set on submit) ──────────────────────────────────
  const [activeParams, setActiveParams] = useState<{
    keyword: string;
    partnerCategory: string;
    minimumSubscribers: number;
  } | null>(null);

  // ── Added channel tracking ─────────────────────────────────────────────────
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  // ── Search query ───────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
    isFetched,
  } = useQuery({
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
          activeParams.partnerCategory !== "_none_"
            ? activeParams.partnerCategory
            : undefined,
        minimumSubscribers: activeParams.minimumSubscribers || undefined,
      });
      // Record to localStorage stats
      recordYtSearch(result.channels);
      return result;
    },
    enabled: !!activeParams,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  const channels = data?.channels ?? [];
  const avgScore =
    channels.length > 0
      ? Math.round(channels.reduce((s, c) => s + c.discoveryScore, 0) / channels.length)
      : 0;

  // ── Mutation: add to Discovery Workspace ──────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (ch: YouTubeChannel) =>
      createProspect({
        name: ch.channelName,
        company: ch.channelName,
        website: ch.channelUrl,
        socialUrl: ch.channelUrl,
        partnerCategory:
          activeParams?.partnerCategory !== "_none_"
            ? activeParams?.partnerCategory
            : undefined,
        notes: ch.description
          ? ch.description.slice(0, 500)
          : undefined,
        audienceSize: `${formatSubscribers(ch.subscriberCount)} subscribers`,
        platform: "YouTube",
        source: "YouTube",
        status: "New Prospect",
      }),
    onSuccess: (_data, ch) => {
      setAddedIds((prev) => new Set([...prev, ch.channelId]));
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast({
        title: "Added to Discovery Workspace",
        description: `${ch.channelName} is now a prospect.`,
      });
    },
    onError: (e, ch) => {
      toast({
        title: `Failed to add ${ch.channelName}`,
        description: (e as Error).message,
        variant: "destructive",
      });
    },
  });

  async function handleAdd(ch: YouTubeChannel) {
    if (addedIds.has(ch.channelId) || addingId === ch.channelId) return;
    setAddingId(ch.channelId);
    try {
      await addMutation.mutateAsync(ch);
    } finally {
      setAddingId(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setActiveParams({
      keyword: keyword.trim(),
      partnerCategory,
      minimumSubscribers: parseInt(minSubscribers, 10) || 0,
    });
    setAddedIds(new Set());
  }

  const errorMessage = isError
    ? ((error as Error)?.message ?? "Search failed. Please try again.")
    : null;

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
      <div className="bg-card border rounded-xl p-5">
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
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
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
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Example keywords */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground mr-1">Examples:</span>
            {EXAMPLE_KEYWORDS.map((kw) => (
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
            <Button
              type="submit"
              disabled={!keyword.trim() || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isLoading ? "Searching…" : "Search YouTube"}
            </Button>
            {channels.length > 0 && !isLoading && (
              <span className="text-sm text-muted-foreground">
                {channels.length} channel{channels.length !== 1 ? "s" : ""} found
                {avgScore > 0 && (
                  <> · avg score <strong>{avgScore}</strong></>
                )}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* API key missing hint */}
      {errorMessage?.includes("not configured") && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">YouTube API key required</p>
            <p className="mt-1">
              Add your <code className="bg-amber-100 px-1 rounded text-xs">YOUTUBE_API_KEY</code> to
              the Replit Secrets panel (lock icon in the sidebar). Get a free key from{" "}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Google Cloud Console
              </a>{" "}
              → APIs &amp; Services → YouTube Data API v3.
            </p>
          </div>
        </div>
      )}

      {/* Quota error */}
      {errorMessage?.includes("quota") && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Other errors */}
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
          <p className="text-sm mt-1">
            Try a broader keyword or reduce the minimum subscriber count.
          </p>
        </div>
      )}

      {/* Results grid */}
      {channels.length > 0 && (
        <div className="space-y-3">
          {/* Results header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Results for "{activeParams?.keyword}"
              {activeParams?.partnerCategory !== "_none_" && (
                <span className="normal-case font-normal">
                  {" "}· {activeParams?.partnerCategory}
                </span>
              )}
            </h2>
            <span className="text-xs text-muted-foreground">
              {addedIds.size} of {channels.length} added to workspace
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {channels.map((ch) => {
              const scoreCfg = SCORE_CONFIG[ch.discoveryLabel];
              const isAdded = addedIds.has(ch.channelId);
              const isAdding = addingId === ch.channelId;

              return (
                <div
                  key={ch.channelId}
                  className="bg-card border rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3">
                    {ch.thumbnailUrl ? (
                      <img
                        src={ch.thumbnailUrl}
                        alt={ch.channelName}
                        className="w-12 h-12 rounded-full flex-shrink-0 object-cover bg-muted"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex-shrink-0 bg-red-100 flex items-center justify-center">
                        <Youtube className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-base leading-tight">{ch.channelName}</p>
                        {/* Score badge */}
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

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">YouTube</Badge>
                    {activeParams?.partnerCategory !== "_none_" && (
                      <Badge variant="secondary" className="text-xs">
                        {activeParams?.partnerCategory}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {ch.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 rounded px-2 py-1.5">
                      {ch.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <a
                      href={ch.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Channel
                      </Button>
                    </a>

                    {isAdded ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-emerald-700 border-emerald-200 bg-emerald-50 cursor-default"
                        disabled
                      >
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
                        {isAdding ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
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

      {/* Initial state */}
      {!activeParams && !isLoading && (
        <div className="text-center py-20">
          <Youtube className="w-14 h-14 mx-auto mb-4 text-red-500/40" />
          <p className="text-lg font-semibold text-foreground mb-2">
            Find your next partner on YouTube
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter a keyword that describes your ideal partner's content — like "Mortgage Coach" or
            "Personal Finance". We'll score each channel and let you add the best ones to your
            Discovery Workspace.
          </p>
        </div>
      )}
    </div>
  );
}
