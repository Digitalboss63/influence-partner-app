import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { Creator, PipelineStage } from "@/types/influencePartner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatFollowers,
  getFitScoreColorClasses,
  getPlatformColor,
} from "@/lib/utils/format";
import { ChevronDown, ArrowRight, Eye, Info } from "lucide-react";

const STAGES: PipelineStage[] = [
  "New",
  "Contacted",
  "Interested",
  "Negotiating",
  "Active",
  "Rejected",
];

const STAGE_STYLES: Record<PipelineStage, string> = {
  New: "bg-gray-50 border-gray-200",
  Contacted: "bg-orange-50 border-orange-200",
  Interested: "bg-blue-50 border-blue-200",
  Negotiating: "bg-purple-50 border-purple-200",
  Active: "bg-emerald-50 border-emerald-200",
  Rejected: "bg-red-50 border-red-200",
};

const STAGE_HEADER_STYLES: Record<PipelineStage, string> = {
  New: "bg-gray-100 text-gray-700",
  Contacted: "bg-orange-100 text-orange-800",
  Interested: "bg-blue-100 text-blue-800",
  Negotiating: "bg-purple-100 text-purple-800",
  Active: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-700",
};

export default function CRMPipeline() {
  const [, setLocation] = useLocation();
  const { creators, updateCreatorStage } = useAppContext();

  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<PipelineStage | null>(null);
  const dragItem = useRef<Creator | null>(null);

  const byStage = (stage: PipelineStage) =>
    creators.filter((c) => c.pipelineStage === stage);

  const handleDragStart = (creator: Creator) => {
    dragItem.current = creator;
    setDragging(creator.id);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
    dragItem.current = null;
  };

  const handleDrop = (stage: PipelineStage) => {
    if (dragItem.current) {
      updateCreatorStage(dragItem.current.id, stage);
    }
    setDragging(null);
    setDragOver(null);
    dragItem.current = null;
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">CRM Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drag creators between stages or use the move button. {creators.length} total creators.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-sm flex-shrink-0">
        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-indigo-800 leading-relaxed">
          <span className="font-semibold">How to use this board: </span>
          Drag creator cards between columns as your conversations progress. Move them from{" "}
          <em>New → Contacted → Interested → Negotiating → Active</em>. Once a creator is{" "}
          <strong>Active</strong>, they're live and generating revenue for you.
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
        {STAGES.map((stage) => {
          const items = byStage(stage);
          const isOver = dragOver === stage;

          return (
            <div
              key={stage}
              className={cn(
                "flex flex-col flex-shrink-0 w-56 rounded-xl border-2 transition-colors",
                STAGE_STYLES[stage],
                isOver && "border-primary/50 scale-[1.01]"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage)}
              data-testid={`column-${stage.toLowerCase()}`}
            >
              {/* Column header */}
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-t-xl",
                  STAGE_HEADER_STYLES[stage]
                )}
              >
                <span className="text-xs font-bold uppercase tracking-wider">
                  {stage}
                </span>
                <span className="text-xs font-bold bg-white/60 rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
                {items.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/60 italic">
                    Drop here
                  </div>
                )}
                {items.map((creator) => (
                  <PipelineCard
                    key={creator.id}
                    creator={creator}
                    isDragging={dragging === creator.id}
                    onDragStart={() => handleDragStart(creator)}
                    onDragEnd={handleDragEnd}
                    onView={() => setLocation(`/creator/${creator.id}`)}
                    onMove={(stage) => updateCreatorStage(creator.id, stage)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineCard({
  creator,
  isDragging,
  onDragStart,
  onDragEnd,
  onView,
  onMove,
}: {
  creator: Creator;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onView: () => void;
  onMove: (stage: PipelineStage) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "bg-white rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none",
        isDragging && "opacity-40 scale-95"
      )}
      data-testid={`pipeline-card-${creator.id}`}
    >
      <div className="flex items-start gap-2">
        <img
          src={creator.avatarUrl}
          alt={creator.name}
          className="w-8 h-8 rounded-full bg-muted flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight">{creator.name}</p>
          <p className="text-muted-foreground text-xs truncate">{creator.handle}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-xs flex-shrink-0 font-bold border ${getFitScoreColorClasses(creator.fitScore)}`}
        >
          {creator.fitScore}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        <Badge
          variant="outline"
          className={`text-xs border ${getPlatformColor(creator.platform)}`}
        >
          {creator.platform}
        </Badge>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {creator.niche}
        </Badge>
      </div>

      <p className="text-xs text-primary font-semibold mt-2">
        {creator.suggestedCommission} commission
      </p>

      <div className="flex gap-1 mt-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs flex-1"
          onClick={onView}
          data-testid={`button-view-pipeline-${creator.id}`}
        >
          <Eye className="w-3 h-3 mr-1" />
          View
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              data-testid={`button-move-pipeline-${creator.id}`}
            >
              <ArrowRight className="w-3 h-3" />
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {(["New","Contacted","Interested","Negotiating","Active","Rejected"] as PipelineStage[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => onMove(s)}
                className="text-xs"
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
