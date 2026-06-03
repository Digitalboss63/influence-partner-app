import { useLocation, useParams } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { PipelineStage } from "@/types/influencePartner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  ThumbsUp,
  X,
  MoveRight,
  Users,
  TrendingUp,
  Target,
  AlertTriangle,
  Lightbulb,
  Handshake,
} from "lucide-react";
import {
  formatFollowers,
  getFitScoreColorClasses,
  getPlatformColor,
  getStageColor,
} from "@/lib/utils/format";

export default function CreatorDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { creators, updateCreatorStage } = useAppContext();

  const creator = creators.find((c) => c.id === params.id);

  if (!creator) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Creator not found.</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => setLocation("/discover")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Discover
        </Button>
      </div>
    );
  }

  const avgInteractions = Math.round(
    (creator.followerCount * creator.engagementRate) / 100
  );

  const moveStage = (stage: PipelineStage) => {
    updateCreatorStage(creator.id, stage);
  };

  const detailSections = [
    {
      icon: Users,
      label: "Audience Fit",
      content: creator.audienceFitSummary,
    },
    {
      icon: TrendingUp,
      label: "Platform Fit",
      content: creator.platformFitSummary,
    },
    {
      icon: Target,
      label: "Engagement Quality",
      content: creator.engagementQuality,
    },
    {
      icon: AlertTriangle,
      label: "Competitor Signal",
      content: creator.competitorSignal,
    },
    {
      icon: Lightbulb,
      label: "Product Gap Opportunity",
      content: creator.productGapOpportunity,
    },
    {
      icon: ThumbsUp,
      label: "Why This Creator",
      content: creator.whyGoodFit,
    },
    {
      icon: Handshake,
      label: "Suggested Deal Structure",
      content: creator.suggestedDealStructure,
    },
    {
      icon: MessageSquare,
      label: "Suggested Outreach Angle",
      content: creator.suggestedOutreachAngle,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/discover")}
        data-testid="button-back"
        className="-ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Discover
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Creator profile */}
        <div className="lg:col-span-1 space-y-4">
          <Card data-testid="card-creator-profile">
            <CardContent className="p-6 text-center">
              <img
                src={creator.avatarUrl}
                alt={creator.name}
                className="w-20 h-20 rounded-full bg-muted mx-auto"
              />
              <h2 className="text-lg font-bold mt-3">{creator.name}</h2>
              <p className="text-muted-foreground text-sm">{creator.handle}</p>

              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                <Badge
                  variant="outline"
                  className={`border ${getPlatformColor(creator.platform)}`}
                >
                  {creator.platform}
                </Badge>
                <Badge variant="outline">{creator.creatorType}</Badge>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <div
                  className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-lg ${getFitScoreColorClasses(creator.fitScore)}`}
                  data-testid="text-fit-score"
                >
                  {creator.fitScore}
                </div>
              </div>
              <p className="text-sm font-medium mt-2">{creator.fitLabel}</p>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-3 text-left text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Followers</p>
                  <p className="font-semibold">{formatFollowers(creator.followerCount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Engagement</p>
                  <p className="font-semibold">{creator.engagementRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Avg Interactions</p>
                  <p className="font-semibold">~{formatFollowers(avgInteractions)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Niche</p>
                  <p className="font-semibold">{creator.niche}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Suggested Commission</p>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-sm font-bold">
                    {creator.suggestedCommission}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Deal Type</p>
                  <p className="text-xs font-medium">{creator.recommendedDeal}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Pipeline Stage</p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStageColor(creator.pipelineStage)}`}
                  >
                    {creator.pipelineStage}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <Button
                className="w-full"
                onClick={() => setLocation(`/outreach?creatorId=${creator.id}&channel=Email`)}
                data-testid="button-generate-email"
              >
                <Mail className="w-4 h-4 mr-2" />
                Generate Email
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation(`/outreach?creatorId=${creator.id}&channel=DM`)}
                data-testid="button-generate-dm"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Generate DM
              </Button>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => moveStage("Contacted")}
                data-testid="button-move-contacted"
              >
                <MoveRight className="w-4 h-4 mr-2" />
                Move to Contacted
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => moveStage("Interested")}
                data-testid="button-mark-interested"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Mark Interested
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  moveStage("Rejected");
                  setLocation("/discover");
                }}
                data-testid="button-reject"
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column — Analysis */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold">Creator Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {detailSections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.label} data-testid={`card-section-${section.label.toLowerCase().replace(/\s/g, "-")}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.label}
                      </p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
