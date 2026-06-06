import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Megaphone,
  Users,
  Send,
  Package,
  DollarSign,
  TrendingUp,
  FileText,
  Plus,
  Pencil,
  Check,
  X,
  HelpCircle,
  CircleDot,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock,
  UserPlus,
  Activity,
  MessageSquare,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  fetchCampaign,
  fetchCampaignTimeline,
  updateCampaign,
  addCampaignCreator,
  updateCampaignCreator,
  deleteCampaignCreator,
  bulkAddCampaignCreators,
  fetchEligibleTargets,
  type ApiCampaignDetail,
  type ApiCampaignCreator,
  type ApiCampaignTimelineEvent,
  type ApiEligibleTarget,
  type CampaignStatus,
  type AssignmentStatus,
  type DeliverableType,
  type ExclusivityType,
  type ExclusivityStatus,
} from "@/lib/api-client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CAMPAIGN_STATUS_OPTIONS: CampaignStatus[] = [
  "planning",
  "active",
  "paused",
  "completed",
  "cancelled",
];

const STATUS_COLORS: Record<CampaignStatus, string> = {
  planning: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-purple-50 text-purple-700 border-purple-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<CampaignStatus, React.ElementType> = {
  planning: CircleDot,
  active: TrendingUp,
  paused: PauseCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const ASSIGNMENT_STATUS_OPTIONS: AssignmentStatus[] = [
  "identified",
  "contacted",
  "interested",
  "negotiating",
  "contracted",
  "completed",
  "declined",
];

const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  identified: "bg-slate-50 text-slate-600 border-slate-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  interested: "bg-teal-50 text-teal-700 border-teal-200",
  negotiating: "bg-amber-50 text-amber-700 border-amber-200",
  contracted: "bg-violet-50 text-violet-700 border-violet-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-red-50 text-red-600 border-red-200",
};

const DELIVERABLE_OPTIONS = [
  "Video",
  "Short",
  "Post",
  "Story",
  "Review",
  "Custom",
];

const TIMELINE_EVENT_ICONS: Record<string, React.ElementType> = {
  campaign_created: Megaphone,
  creator_assigned: UserPlus,
  creator_status_changed: Activity,
  outreach_sent: Send,
  outreach_replied: MessageSquare,
  outreach_activity: Activity,
};

const TIMELINE_EVENT_COLORS: Record<string, string> = {
  campaign_created: "text-blue-600 bg-blue-50 border-blue-200",
  creator_assigned: "text-violet-600 bg-violet-50 border-violet-200",
  creator_status_changed: "text-amber-600 bg-amber-50 border-amber-200",
  outreach_sent: "text-teal-600 bg-teal-50 border-teal-200",
  outreach_replied: "text-emerald-600 bg-emerald-50 border-emerald-200",
  outreach_activity: "text-orange-600 bg-orange-50 border-orange-200",
};

// ─── Add Creator Dialog ────────────────────────────────────────────────────────

interface AddCreatorDialogProps {
  campaignId: string;
  productId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}

function AddCreatorDialog({
  campaignId,
  productId,
  open,
  onOpenChange,
  onAdded,
}: AddCreatorDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: eligibleTargets = [], isLoading: loadingTargets } = useQuery<ApiEligibleTarget[]>({
    queryKey: ["eligible-targets", campaignId],
    queryFn: () => fetchEligibleTargets({ campaignId, productId }),
    enabled: open,
  });

  const [targetSearch, setTargetSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState({
    creatorName: "",
    targetId: "",
    assignmentStatus: "identified" as AssignmentStatus,
    deliverables: [] as string[],
    deliverableType: "" as DeliverableType | "",
    deliverableDueDate: "",
    estimatedValue: "",
    notes: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleDeliverable = (d: string) =>
    set("deliverables",
      form.deliverables.includes(d)
        ? form.deliverables.filter((x) => x !== d)
        : [...form.deliverables, d],
    );

  const selectedTarget = form.targetId
    ? eligibleTargets.find((t) => t.id === form.targetId)
    : null;

  const filteredTargets = eligibleTargets.filter((t) =>
    !targetSearch ||
    t.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
    (t.company ?? "").toLowerCase().includes(targetSearch.toLowerCase()),
  );

  const selectTarget = (t: ApiEligibleTarget) => {
    setForm((f) => ({ ...f, targetId: t.id, creatorName: f.creatorName || t.name }));
    setTargetSearch("");
    setShowDropdown(false);
  };

  const mutation = useMutation({
    mutationFn: () =>
      addCampaignCreator(campaignId, {
        creatorName: form.creatorName,
        targetId: form.targetId || undefined,
        assignmentStatus: form.assignmentStatus,
        deliverables: form.deliverables,
        deliverableType: (form.deliverableType || undefined) as DeliverableType | undefined,
        deliverableDueDate: form.deliverableDueDate || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : 0,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
      qc.invalidateQueries({ queryKey: ["campaign-timeline", campaignId] });
      qc.invalidateQueries({ queryKey: ["eligible-targets", campaignId] });
      toast({ title: "Creator assigned to campaign" });
      onAdded();
      setForm({
        creatorName: "",
        targetId: "",
        assignmentStatus: "identified",
        deliverables: [],
        deliverableType: "",
        deliverableDueDate: "",
        estimatedValue: "",
        notes: "",
      });
      setTargetSearch("");
      setShowDropdown(false);
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { setTargetSearch(""); setShowDropdown(false); }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Creator</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">

          {/* Eligible Target Picker */}
          <div className="space-y-1">
            <Label>Select from Eligible Targets</Label>
            {selectedTarget ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{selectedTarget.name}</div>
                  <div className="flex gap-3 mt-0.5 text-xs">
                    {selectedTarget.company && (
                      <span className="text-muted-foreground">{selectedTarget.company}</span>
                    )}
                    {selectedTarget.partnerFitScore != null && (
                      <span className="text-violet-600">Fit: {selectedTarget.partnerFitScore}</span>
                    )}
                    {selectedTarget.contactReadinessScore != null && (
                      <span className="text-teal-600">CR: {selectedTarget.contactReadinessScore}</span>
                    )}
                    {selectedTarget.outreachStatus && (
                      <span className="text-blue-600 capitalize">{selectedTarget.outreachStatus}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => set("targetId", "")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder={loadingTargets ? "Loading…" : `Search ${eligibleTargets.length} eligible targets…`}
                  value={targetSearch}
                  onChange={(e) => { setTargetSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  className="h-8 text-sm"
                />
                {loadingTargets && (
                  <Loader2 className="w-3 h-3 animate-spin absolute right-2.5 top-2.5 text-muted-foreground" />
                )}
                {showDropdown && filteredTargets.length > 0 && (
                  <div className="absolute z-50 w-full top-full mt-0.5 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredTargets.slice(0, 10).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-start justify-between gap-2"
                        onMouseDown={(e) => { e.preventDefault(); selectTarget(t); }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{t.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[t.company, t.platform, t.status].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="flex gap-2 text-xs flex-shrink-0 mt-0.5">
                          {t.partnerFitScore != null && (
                            <span className="text-violet-600">Fit: {t.partnerFitScore}</span>
                          )}
                          {t.contactReadinessScore != null && (
                            <span className="text-teal-600">CR: {t.contactReadinessScore}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Creator Name */}
          <div className="space-y-1">
            <Label>Creator Name *</Label>
            <Input
              placeholder="e.g. TechReviewPro"
              value={form.creatorName}
              onChange={(e) => set("creatorName", e.target.value)}
            />
          </div>

          {/* Assignment Status */}
          <div className="space-y-1">
            <Label>Assignment Status</Label>
            <Select
              value={form.assignmentStatus}
              onValueChange={(v) => set("assignmentStatus", v as AssignmentStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deliverable Type + Due Date */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Deliverable Type</Label>
              <Select
                value={form.deliverableType || "__none__"}
                onValueChange={(v) =>
                  set("deliverableType", v === "__none__" ? "" : (v as DeliverableType))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {(["video", "short", "post", "story", "review", "custom"] as DeliverableType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.deliverableDueDate}
                onChange={(e) => set("deliverableDueDate", e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Deliverables */}
          <div className="space-y-1">
            <Label>Deliverables</Label>
            <div className="flex flex-wrap gap-2">
              {DELIVERABLE_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDeliverable(d)}
                  className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-colors ${
                    form.deliverables.includes(d)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/60"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Value */}
          <div className="space-y-1">
            <Label>Estimated Value ($)</Label>
            <Input
              type="number"
              min={0}
              placeholder="2500"
              value={form.estimatedValue}
              onChange={(e) => set("estimatedValue", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              placeholder="Any notes about this creator…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { onOpenChange(false); setTargetSearch(""); setShowDropdown(false); }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.creatorName || mutation.isPending}
          >
            {mutation.isPending ? "Assigning…" : "Assign Creator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Assign Dialog ────────────────────────────────────────────────────────

interface BulkAssignDialogProps {
  campaignId: string;
  existingNames: Set<string>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}

function BulkAssignDialog({
  campaignId,
  existingNames,
  open,
  onOpenChange,
  onAdded,
}: BulkAssignDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data: targets = [], isLoading: loadingTargets } = useQuery<ApiEligibleTarget[]>({
    queryKey: ["eligible-targets-bulk", campaignId],
    queryFn: () => fetchEligibleTargets({ campaignId }),
    enabled: open,
  });

  const available = targets.filter((t) => {
    const alreadyByName = existingNames.has(t.name.toLowerCase());
    if (alreadyByName) return false;
    if (!search) return true;
    return (
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.company ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const toggleTarget = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: () => {
      const creators = targets
        .filter((t) => selected.has(t.id))
        .map((t) => ({
          creatorName: t.name,
          targetId: t.id,
        }));
      return bulkAddCampaignCreators(campaignId, creators);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
      qc.invalidateQueries({ queryKey: ["campaign-timeline", campaignId] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["eligible-targets", campaignId] });
      qc.invalidateQueries({ queryKey: ["eligible-targets-bulk", campaignId] });
      const msg =
        result.skipped > 0
          ? `Added ${result.added} creator${result.added !== 1 ? "s" : ""}, ${result.skipped} already assigned.`
          : `Added ${result.added} creator${result.added !== 1 ? "s" : ""}.`;
      toast({ title: msg });
      setSelected(new Set());
      setSearch("");
      onAdded();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setSelected(new Set());
          setSearch("");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Assign from Targets</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search targets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />

          {loadingTargets ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading targets…
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {targets.length === 0
                ? "No targets found. Add targets in the Targets section first."
                : search
                ? "No targets match your search."
                : "All available targets are already assigned to this campaign."}
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {available.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selected.has(t.id)
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={() => toggleTarget(t.id)}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[t.company, t.platform]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {(t.partnerFitScore != null || t.contactReadinessScore != null) && (
                      <div className="flex gap-3 mt-0.5 text-xs">
                        {t.partnerFitScore != null && (
                          <span className="text-violet-600">Fit: {t.partnerFitScore}</span>
                        )}
                        {t.contactReadinessScore != null && (
                          <span className="text-teal-600">CR: {t.contactReadinessScore}</span>
                        )}
                        {t.contactMethod && (
                          <span className="text-blue-600">{t.contactMethod}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs flex-shrink-0 capitalize"
                  >
                    {t.status}
                  </Badge>
                </label>
              ))}
            </div>
          )}

          {selected.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {selected.size} target{selected.size !== 1 ? "s" : ""} selected.
              All will be added with status: <strong>Identified</strong>.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelected(new Set());
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={selected.size === 0 || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Adding…
              </>
            ) : (
              `Add ${selected.size} Creator${selected.size !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Creator Row ──────────────────────────────────────────────────────────────

const EXCLUSIVITY_TYPE_OPTIONS: ExclusivityType[] = ["none", "soft", "full"];
const EXCLUSIVITY_STATUS_OPTIONS: ExclusivityStatus[] = [
  "not_eligible",
  "eligible_for_review",
  "under_review",
  "approved",
  "declined",
  "expired",
];
const EXCLUSIVITY_TYPE_LABELS: Record<ExclusivityType, string> = {
  none: "None",
  soft: "Soft",
  full: "Full",
};
const EXCLUSIVITY_STATUS_LABELS: Record<ExclusivityStatus, string> = {
  not_eligible: "Not Eligible",
  eligible_for_review: "Eligible for Review",
  under_review: "Under Review",
  approved: "Approved",
  declined: "Declined",
  expired: "Expired",
};
const EXCLUSIVITY_STATUS_COLORS: Record<ExclusivityStatus, string> = {
  not_eligible: "bg-slate-50 text-slate-500 border-slate-200",
  eligible_for_review: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  declined: "bg-red-50 text-red-600 border-red-200",
  expired: "bg-slate-50 text-slate-500 border-slate-200",
};

function CreatorRow({ creator }: { creator: ApiCampaignCreator }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<AssignmentStatus>(creator.assignmentStatus);
  const [actual, setActual] = useState(String(creator.actualValue ?? 0));
  const [notes, setNotes] = useState(creator.notes ?? "");
  const [delivType, setDelivType] = useState<DeliverableType | "">(
    creator.deliverableType ?? "",
  );
  const [dueDate, setDueDate] = useState(
    creator.deliverableDueDate ? creator.deliverableDueDate.split("T")[0] : "",
  );
  const [exclType, setExclType] = useState<ExclusivityType>(
    creator.exclusivityType ?? "none",
  );
  const [exclStatus, setExclStatus] = useState<ExclusivityStatus>(
    creator.exclusivityStatus ?? "not_eligible",
  );
  const [exclStart, setExclStart] = useState(
    creator.exclusivityStartDate ? creator.exclusivityStartDate.split("T")[0] : "",
  );
  const [exclEnd, setExclEnd] = useState(
    creator.exclusivityEndDate ? creator.exclusivityEndDate.split("T")[0] : "",
  );
  const [exclNotes, setExclNotes] = useState(creator.exclusivityNotes ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      updateCampaignCreator(creator.id, {
        assignmentStatus: status,
        deliverableType: (delivType || undefined) as DeliverableType | undefined,
        deliverableDueDate: dueDate || undefined,
        actualValue: Number(actual),
        notes: notes || undefined,
        exclusivityType: exclType,
        exclusivityStatus: exclStatus,
        exclusivityStartDate: exclStart || undefined,
        exclusivityEndDate: exclEnd || undefined,
        exclusivityNotes: exclNotes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", creator.campaignId] });
      qc.invalidateQueries({ queryKey: ["campaign-timeline", creator.campaignId] });
      toast({ title: "Updated" });
      setEditing(false);
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCampaignCreator(creator.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", creator.campaignId] });
      qc.invalidateQueries({ queryKey: ["campaign-timeline", creator.campaignId] });
      qc.invalidateQueries({ queryKey: ["eligible-targets", creator.campaignId] });
      toast({ title: `${creator.creatorName} removed from campaign` });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor =
    ASSIGNMENT_STATUS_COLORS[creator.assignmentStatus] ??
    "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-border transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{creator.creatorName}</span>
          {!editing ? (
            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${statusColor}`}>
              {creator.assignmentStatus.charAt(0).toUpperCase() +
                creator.assignmentStatus.slice(1)}
            </Badge>
          ) : (
            <Select value={status} onValueChange={(v) => setStatus(v as AssignmentStatus)}>
              <SelectTrigger className="h-6 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {creator.deliverableType && !editing && (
            <Badge
              variant="outline"
              className="text-xs px-2 py-0.5 capitalize bg-amber-50 text-amber-700 border-amber-200"
            >
              {creator.deliverableType}
            </Badge>
          )}
          {!editing && creator.exclusivityType !== "none" && (
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${EXCLUSIVITY_STATUS_COLORS[creator.exclusivityStatus]}`}
            >
              {EXCLUSIVITY_TYPE_LABELS[creator.exclusivityType]} excl ·{" "}
              {EXCLUSIVITY_STATUS_LABELS[creator.exclusivityStatus]}
            </Badge>
          )}
          {creator.targetId && (
            <span className="text-xs text-muted-foreground/70" title="Linked to Target record">
              🔗
            </span>
          )}
          {creator.outreachCount > 0 && (
            <span className="text-xs text-muted-foreground border border-border/60 rounded-full px-2 py-0.5 bg-muted">
              {creator.outreachCount} outreach
            </span>
          )}
        </div>
        {creator.deliverableDueDate && !editing && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Due:{" "}
            {new Date(creator.deliverableDueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}
        {creator.deliverables && creator.deliverables.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1.5">
            {creator.deliverables.map((d) => (
              <span
                key={d}
                className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
              >
                {d}
              </span>
            ))}
          </div>
        )}
        {editing && (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Deliverable Type</Label>
                <Select
                  value={delivType || "__none__"}
                  onValueChange={(v) =>
                    setDelivType(v === "__none__" ? "" : (v as DeliverableType))
                  }
                >
                  <SelectTrigger className="h-7 text-xs mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {(["video", "short", "post", "story", "review", "custom"] as DeliverableType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  className="h-7 text-xs mt-0.5"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Actual ($)</Label>
              <Input
                type="number"
                min={0}
                className="h-7 text-xs"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </div>
            <Textarea
              rows={1}
              className="text-xs"
              placeholder="Notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {/* Exclusivity section */}
            <div className="pt-1 border-t border-border/60">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Exclusivity</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={exclType}
                    onValueChange={(v) => setExclType(v as ExclusivityType)}
                  >
                    <SelectTrigger className="h-7 text-xs mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXCLUSIVITY_TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {EXCLUSIVITY_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={exclStatus}
                    onValueChange={(v) => setExclStatus(v as ExclusivityStatus)}
                  >
                    <SelectTrigger className="h-7 text-xs mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXCLUSIVITY_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {EXCLUSIVITY_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    className="h-7 text-xs mt-0.5"
                    value={exclStart}
                    onChange={(e) => setExclStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    className="h-7 text-xs mt-0.5"
                    value={exclEnd}
                    onChange={(e) => setExclEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-1.5">
                <Label className="text-xs">Exclusivity Notes</Label>
                <Input
                  className="h-7 text-xs mt-0.5"
                  placeholder="Terms, conditions…"
                  value={exclNotes}
                  onChange={(e) => setExclNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        {!editing && creator.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {creator.notes}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
        <div className="text-xs text-muted-foreground">
          Est: {fmt$(creator.estimatedValue ?? 0)}
        </div>
        <div className="text-xs font-medium text-emerald-700">
          Act: {fmt$(creator.actualValue ?? 0)}
        </div>
        {!editing ? (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              title="Remove from campaign"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-emerald-600"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={() => {
                setEditing(false);
                setStatus(creator.assignmentStatus);
                setActual(String(creator.actualValue ?? 0));
                setNotes(creator.notes ?? "");
                setDelivType(creator.deliverableType ?? "");
                setDueDate(
                  creator.deliverableDueDate
                    ? creator.deliverableDueDate.split("T")[0]
                    : "",
                );
                setExclType(creator.exclusivityType ?? "none");
                setExclStatus(creator.exclusivityStatus ?? "not_eligible");
                setExclStart(
                  creator.exclusivityStartDate
                    ? creator.exclusivityStartDate.split("T")[0]
                    : "",
                );
                setExclEnd(
                  creator.exclusivityEndDate
                    ? creator.exclusivityEndDate.split("T")[0]
                    : "",
                );
                setExclNotes(creator.exclusivityNotes ?? "");
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Timeline Section ──────────────────────────────────────────────────────────

function TimelineSection({ campaignId }: { campaignId: string }) {
  const { data: events = [], isLoading } = useQuery<ApiCampaignTimelineEvent[]>({
    queryKey: ["campaign-timeline", campaignId],
    queryFn: () => fetchCampaignTimeline(campaignId),
    enabled: !!campaignId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading timeline…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
        No activity yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const Icon = TIMELINE_EVENT_ICONS[event.type] ?? Activity;
        const colorClass =
          TIMELINE_EVENT_COLORS[event.type] ??
          "text-muted-foreground bg-muted border-muted-foreground/30";
        return (
          <div key={event.id} className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium">{event.label}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {relativeTime(event.date)}
                </span>
              </div>
              {event.detail && (
                <p className="text-xs text-muted-foreground">{event.detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignDetail() {
  const [, params] = useRoute("/campaigns/:id");
  const id = params?.id ?? "";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addCreatorOpen, setAddCreatorOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<CampaignStatus>("planning");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: campaign, isLoading } = useQuery<ApiCampaignDetail>({
    queryKey: ["campaign", id],
    queryFn: () => fetchCampaign(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateCampaign>[1]) =>
      updateCampaign(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign updated" });
      setEditingStatus(false);
      setEditingNotes(false);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading campaign…
      </div>
    );
  }
  if (!campaign) {
    return (
      <div className="p-6 text-muted-foreground text-sm">Campaign not found.</div>
    );
  }

  const StatusIcon = STATUS_ICONS[campaign.status];
  const statusColor = STATUS_COLORS[campaign.status];

  const budgetPct =
    campaign.budget > 0
      ? Math.min(100, Math.round((campaign.budgetUsed / campaign.budget) * 100))
      : 0;
  const creatorPct =
    campaign.targetCreatorCount > 0
      ? Math.min(
          100,
          Math.round(
            (campaign.assignedCreatorCount / campaign.targetCreatorCount) * 100,
          ),
        )
      : 0;

  // Group deliverables across all creators
  const deliverableMap: Record<string, number> = {};
  for (const cc of campaign.creators) {
    for (const d of cc.deliverables ?? []) {
      deliverableMap[d] = (deliverableMap[d] ?? 0) + 1;
    }
  }

  const contractedCreators = campaign.creators.filter((cc) =>
    ["contracted", "completed"].includes(cc.assignmentStatus),
  );

  // Sets for duplicate detection in dialogs
  const assignedNames = new Set(
    campaign.creators.map((cc) => cc.creatorName.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/campaigns">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Campaigns
          </Button>
        </Link>
        <Link href="/help/campaign-management">
          <Button variant="outline" size="sm" className="gap-1 text-muted-foreground">
            <HelpCircle className="w-3.5 h-3.5" />
            Help
          </Button>
        </Link>
      </div>

      {/* Campaign Overview */}
      <Section icon={Megaphone} title="Campaign Overview">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold">{campaign.name}</h2>
                {campaign.productName && (
                  <p className="text-sm text-muted-foreground">
                    {campaign.productName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editingStatus ? (
                  <>
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-1.5 px-3 py-1 ${statusColor}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {campaign.status.charAt(0).toUpperCase() +
                        campaign.status.slice(1)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => {
                        setNewStatus(campaign.status);
                        setEditingStatus(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={newStatus}
                      onValueChange={(v) =>
                        setNewStatus(v as CampaignStatus)
                      }
                    >
                      <SelectTrigger className="h-8 text-sm w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateMutation.mutate({ status: newStatus })
                      }
                      disabled={updateMutation.isPending}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingStatus(false)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{campaign.objective}</p>
            {campaign.campaignType && (
              <p className="text-xs text-muted-foreground">
                Type:{" "}
                <span className="capitalize font-medium text-foreground">
                  {campaign.campaignType}
                </span>
              </p>
            )}
            {campaign.description && (
              <p className="text-sm">{campaign.description}</p>
            )}

            <div className="grid sm:grid-cols-3 gap-4 pt-1">
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-semibold">{fmt$(campaign.budget)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target Creators</p>
                <p className="text-lg font-semibold">
                  {campaign.targetCreatorCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dates</p>
                <p className="text-sm font-medium">
                  {fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Assigned Creators */}
      <Section
        icon={Users}
        title={`Assigned Creators (${campaign.creators.length})`}
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setBulkAssignOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              Bulk Assign
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setAddCreatorOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Assign Creator
            </Button>
          </div>
        }
      >
        {campaign.creators.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg space-y-2">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p>No creators assigned yet.</p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkAssignOpen(true)}
              >
                Bulk assign from Targets
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddCreatorOpen(true)}
              >
                Add one manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {campaign.creators.map((cc) => (
              <CreatorRow key={cc.id} creator={cc} />
            ))}
          </div>
        )}
      </Section>

      {/* Outreach Status */}
      <Section icon={Send} title="Outreach Status">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              label: "Sent",
              value: campaign.outreachRollup.sent,
              color: "text-blue-600",
            },
            {
              label: "Replied",
              value: campaign.outreachRollup.replied,
              color: "text-teal-600",
            },
            {
              label: "Interested",
              value: campaign.outreachRollup.interested,
              color: "text-violet-600",
            },
            {
              label: "Negotiating",
              value: campaign.outreachRollup.negotiating,
              color: "text-amber-600",
            },
            {
              label: "Converted",
              value: campaign.outreachRollup.converted,
              color: "text-emerald-600",
            },
          ].map((tile) => (
            <Card key={tile.label} className="text-center">
              <CardContent className="pt-3 pb-3">
                <div className={`text-2xl font-bold ${tile.color}`}>
                  {tile.value}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {tile.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Rolled up from Outreach Operations. Where a target ID is linked, the
          match is stable; otherwise matched by creator name.
        </p>
      </Section>

      {/* Deliverables */}
      <Section icon={Package} title="Deliverables">
        {Object.keys(deliverableMap).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deliverables tracked yet. Assign creators with deliverables to see
            them here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(deliverableMap).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/60 text-sm"
              >
                <span className="font-medium">{type}</span>
                <span className="text-muted-foreground text-xs">×{count}</span>
              </div>
            ))}
          </div>
        )}
        {campaign.creators.some((cc) => cc.deliverables?.length > 0) && (
          <div className="space-y-1">
            {campaign.creators
              .filter((cc) => cc.deliverables?.length > 0)
              .map((cc) => (
                <div key={cc.id} className="flex items-center gap-2 text-xs">
                  <span className="font-medium w-36 truncate">
                    {cc.creatorName}
                  </span>
                  <span className="text-muted-foreground">
                    {cc.deliverables.join(", ")}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Section>

      {/* Budget Tracking */}
      <Section icon={DollarSign} title="Budget Tracking">
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">
                Planned Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt$(campaign.budget)}</div>
              <Progress value={100} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">
                Committed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">
                {fmt$(campaign.budgetCommitted)}
              </div>
              <Progress
                value={
                  campaign.budget > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (campaign.budgetCommitted / campaign.budget) * 100,
                        ),
                      )
                    : 0
                }
                className="h-1.5 mt-2"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">
                Actual Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {fmt$(campaign.budgetUsed)}
              </div>
              <Progress value={budgetPct} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground">
          Committed = sum of estimated values. Actual = sum of actual values
          entered per creator.
        </p>
      </Section>

      {/* Performance Summary */}
      <Section icon={TrendingUp} title="Performance Summary">
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{campaign.assignedCreatorCount}</div>
              <div className="text-xs text-muted-foreground">Creators Assigned</div>
              <div className="mt-2">
                <Progress value={creatorPct} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {creatorPct}% of target {campaign.targetCreatorCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">
                {contractedCreators.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Contracted / Completed
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-violet-700">
                {fmt$(campaign.totalRevenue)}
              </div>
              <div className="text-xs text-muted-foreground">Revenue (from Performance)</div>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Activity Timeline */}
      <Section icon={Activity} title="Activity Timeline">
        <TimelineSection campaignId={id} />
      </Section>

      {/* Notes */}
      <Section icon={FileText} title="Notes">
        {!editingNotes ? (
          <div
            className="group rounded-lg border border-border/60 p-3 min-h-[60px] cursor-pointer hover:border-border"
            onClick={() => {
              setNotes(campaign.description ?? "");
              setEditingNotes(true);
            }}
          >
            {campaign.description ? (
              <p className="text-sm">{campaign.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">
                Click to add campaign notes…
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Campaign notes…"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingNotes(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  updateMutation.mutate({ description: notes })
                }
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Section>

      <AddCreatorDialog
        campaignId={id}
        productId={campaign?.productId ?? undefined}
        open={addCreatorOpen}
        onOpenChange={setAddCreatorOpen}
        onAdded={() => setAddCreatorOpen(false)}
      />

      <BulkAssignDialog
        campaignId={id}
        existingNames={assignedNames}
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        onAdded={() => setBulkAssignOpen(false)}
      />
    </div>
  );
}
