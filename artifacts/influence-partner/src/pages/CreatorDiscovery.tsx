import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { Creator, Platform, CreatorType, PipelineStage } from "@/types/influencePartner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Filter, ChevronDown, Users, ArrowRight, Telescope, Info } from "lucide-react";
import {
  formatFollowers,
  getFitScoreColorClasses,
  getPlatformColor,
  getStageColor,
  getOpportunityColor,
  getSponsorConflictColor,
} from "@/lib/utils/format";
import {
  getOpportunityLevel,
  getSponsorConflictLevel,
  getProductGapLevel,
} from "@/lib/scoring";
import { TermWithHelp } from "@/components/HoverHelp";

const PLATFORMS: Platform[] = ["YouTube", "Instagram", "TikTok"];
const CREATOR_TYPES: CreatorType[] = ["Micro", "Mid-Tier", "Macro", "Celebrity"];
const STAGES: PipelineStage[] = ["New", "Contacted", "Interested", "Negotiating", "Active", "Rejected"];

const FOLLOWER_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "Under 10K", min: 0, max: 10_000 },
  { label: "10K – 100K", min: 10_000, max: 100_000 },
  { label: "100K – 500K", min: 100_000, max: 500_000 },
  { label: "500K – 5M", min: 500_000, max: 5_000_000 },
  { label: "5M+", min: 5_000_000, max: Infinity },
];

const FIT_RANGES = [
  { label: "All", min: 0 },
  { label: "90+ (Excellent)", min: 90 },
  { label: "80–89 (Strong)", min: 80 },
  { label: "70–79 (Possible)", min: 70 },
  { label: "Below 70", min: 0, max: 70 },
];

export default function CreatorDiscovery() {
  const [, setLocation] = useLocation();
  const { creators, updateCreatorStage } = useAppContext();

  const [platformFilter, setPlatformFilter] = useState<Platform | "All">("All");
  const [nicheFilter, setNicheFilter] = useState("All");
  const [followerRange, setFollowerRange] = useState("All");
  const [fitRange, setFitRange] = useState("All");
  const [creatorTypeFilter, setCreatorTypeFilter] = useState<CreatorType | "All">("All");

  const allNiches = useMemo(() => {
    const niches = [...new Set(creators.map((c) => c.niche))].sort();
    return ["All", ...niches];
  }, [creators]);

  const filtered = useMemo(() => {
    const fr = FOLLOWER_RANGES.find((r) => r.label === followerRange) || FOLLOWER_RANGES[0];
    const fit = FIT_RANGES.find((r) => r.label === fitRange) || FIT_RANGES[0];

    return creators.filter((c) => {
      if (platformFilter !== "All" && c.platform !== platformFilter) return false;
      if (nicheFilter !== "All" && c.niche !== nicheFilter) return false;
      if (creatorTypeFilter !== "All" && c.creatorType !== creatorTypeFilter) return false;
      if (c.followerCount < fr.min || c.followerCount >= (fr.max ?? Infinity)) return false;
      if (c.fitScore < fit.min) return false;
      if (fit.max !== undefined && c.fitScore >= fit.max) return false;
      return true;
    });
  }, [creators, platformFilter, nicheFilter, followerRange, fitRange, creatorTypeFilter]);

  const strongCount = filtered.filter((c) => c.fitScore >= 90).length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Page header + guide banner */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Discover Creators</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {filtered.length} creators · {strongCount} Excellent Partner matches
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-blue-800 leading-relaxed">
          <span className="font-semibold">How to use this page: </span>
          Every creator has been pre-scored against your product. Focus on creators with a{" "}
          <strong>Fit Score 80+</strong> and a <strong>Strong Opportunity</strong> rating — those are your best bets for a
          high-commission deal. Click <em>View Details</em> to see the full analysis and recommended outreach angle.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters:</span>
        </div>

        <Select
          value={platformFilter}
          onValueChange={(v) => setPlatformFilter(v as Platform | "All")}
        >
          <SelectTrigger className="w-36 h-8 text-xs" data-testid="filter-platform">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={nicheFilter} onValueChange={setNicheFilter}>
          <SelectTrigger className="w-36 h-8 text-xs" data-testid="filter-niche">
            <SelectValue placeholder="Niche" />
          </SelectTrigger>
          <SelectContent>
            {allNiches.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={followerRange} onValueChange={setFollowerRange}>
          <SelectTrigger className="w-40 h-8 text-xs" data-testid="filter-followers">
            <SelectValue placeholder="Follower range" />
          </SelectTrigger>
          <SelectContent>
            {FOLLOWER_RANGES.map((r) => (
              <SelectItem key={r.label} value={r.label}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fitRange} onValueChange={setFitRange}>
          <SelectTrigger className="w-44 h-8 text-xs" data-testid="filter-fit-score">
            <SelectValue placeholder="Fit score" />
          </SelectTrigger>
          <SelectContent>
            {FIT_RANGES.map((r) => (
              <SelectItem key={r.label} value={r.label}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={creatorTypeFilter}
          onValueChange={(v) => setCreatorTypeFilter(v as CreatorType | "All")}
        >
          <SelectTrigger className="w-36 h-8 text-xs" data-testid="filter-creator-type">
            <SelectValue placeholder="Creator type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            {CREATOR_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Creator Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Telescope className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No creators match your filters</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Try broadening your search criteria</p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => {
              setPlatformFilter("All");
              setNicheFilter("All");
              setFollowerRange("All");
              setFitRange("All");
              setCreatorTypeFilter("All");
            }}
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onViewDetails={() => setLocation(`/creator/${creator.id}`)}
              onGenerateOutreach={() => setLocation(`/outreach?creatorId=${creator.id}`)}
              onMoveStage={(stage) => updateCreatorStage(creator.id, stage)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreatorCard({
  creator,
  onViewDetails,
  onGenerateOutreach,
  onMoveStage,
}: {
  creator: Creator;
  onViewDetails: () => void;
  onGenerateOutreach: () => void;
  onMoveStage: (stage: PipelineStage) => void;
}) {
  const opportunityLevel = getOpportunityLevel(creator.fitScore, creator.competitiveConflict);
  const sponsorConflict = getSponsorConflictLevel(creator.competitiveConflict);
  const productGap = getProductGapLevel(creator.productFit);
  const avgInteractions = Math.round((creator.followerCount * creator.engagementRate) / 100);

  return (
    <Card
      className="flex flex-col hover:shadow-md transition-shadow"
      data-testid={`card-creator-${creator.id}`}
    >
      <CardContent className="p-4 flex flex-col gap-0 flex-1">
        {/* Header: avatar + name + FIT SCORE (big and prominent) */}
        <div className="flex items-start gap-3 mb-3">
          <img
            src={creator.avatarUrl}
            alt={creator.name}
            className="w-11 h-11 rounded-full bg-muted flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{creator.name}</p>
            <p className="text-muted-foreground text-xs">{creator.handle}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className={`text-xs border ${getPlatformColor(creator.platform)}`}>
                {creator.platform}
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {creator.creatorType}
              </Badge>
            </div>
          </div>
          {/* FIT SCORE — most prominent element */}
          <div className={`rounded-xl border-2 px-3 py-1.5 text-center flex-shrink-0 ${getFitScoreColorClasses(creator.fitScore)}`}>
            <p className="text-xl font-black leading-none">{creator.fitScore}</p>
            <p className="text-xs font-medium leading-tight mt-0.5 opacity-80">Fit</p>
          </div>
        </div>

        {/* Key deal info — 3 big visible items */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center rounded-lg bg-primary/8 border border-primary/15 px-2 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">
              <TermWithHelp term="Commission" className="text-xs" />
            </p>
            <p className="text-sm font-bold text-primary">{creator.suggestedCommission}</p>
          </div>
          <div className="text-center rounded-lg bg-muted/50 border border-border px-2 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">
              <TermWithHelp term="Deal Type" className="text-xs" />
            </p>
            <p className="text-xs font-semibold leading-tight">{creator.recommendedDeal}</p>
          </div>
          <div className="text-center rounded-lg bg-muted/50 border border-border px-2 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Engagement</p>
            <p className="text-xs font-semibold">{creator.engagementRate}%</p>
          </div>
        </div>

        {/* Opportunity Score section */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <TermWithHelp term="Opportunity Score" />
          </p>
          <div className="flex flex-col gap-1.5">
            {/* Opportunity Level badge */}
            <Badge
              variant="outline"
              className={`text-xs font-semibold border self-start px-2 py-0.5 ${getOpportunityColor(opportunityLevel)}`}
              data-testid={`badge-opportunity-${creator.id}`}
            >
              {opportunityLevel}
            </Badge>
            {/* Sponsor Conflict + Product Gap */}
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">
                  <TermWithHelp term="Sponsor Conflict" />:
                </span>
                <span className={`font-semibold ${getSponsorConflictColor(sponsorConflict)}`}>
                  {sponsorConflict}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">
                  <TermWithHelp term="Product Gap" />:
                </span>
                <span className="font-semibold text-foreground">{productGap}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary stats + stage */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="text-muted-foreground">
            {formatFollowers(creator.followerCount)} followers · ~{formatFollowers(avgInteractions)}/post
          </span>
          <Badge variant="outline" className={`text-xs ${getStageColor(creator.pipelineStage)}`} data-testid={`badge-stage-${creator.id}`}>
            {creator.pipelineStage}
          </Badge>
        </div>

        <Separator className="mb-3" />

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <Button
            size="sm"
            variant="default"
            className="flex-1 text-xs"
            onClick={onViewDetails}
            data-testid={`button-view-${creator.id}`}
          >
            View Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={onGenerateOutreach}
            data-testid={`button-outreach-${creator.id}`}
          >
            Outreach
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-xs px-2"
                data-testid={`button-move-${creator.id}`}
              >
                <ArrowRight className="w-3 h-3" />
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STAGES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => onMoveStage(s)}
                  data-testid={`menu-stage-${s.toLowerCase()}`}
                >
                  Move to {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
