import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Megaphone,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  ChevronRight,
  Pencil,
  Trash2,
  CircleDot,
  CheckCircle2,
  PauseCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  fetchCampaigns,
  fetchCampaignMetrics,
  createCampaign,
  deleteCampaign,
  getProducts,
  type ApiCampaign,
  type CampaignStatus,
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

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  planning: {
    label: "Planning",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CircleDot,
  },
  active: {
    label: "Active",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: TrendingUp,
  },
  paused: {
    label: "Paused",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: PauseCircle,
  },
  completed: {
    label: "Completed",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

// ─── Create Campaign Dialog ────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

function CreateCampaignDialog({ open, onOpenChange, onCreated }: CreateDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const [form, setForm] = useState({
    name: "",
    productId: "",
    objective: "",
    budget: "",
    targetCreatorCount: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const mutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign-metrics"] });
      toast({ title: "Campaign created" });
      onCreated();
      setForm({
        name: "",
        productId: "",
        objective: "",
        budget: "",
        targetCreatorCount: "",
        description: "",
        startDate: "",
        endDate: "",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Campaign Name *</Label>
              <Input
                placeholder="Q3 Creator Push"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Objective *</Label>
              <Input
                placeholder="Sign 10 active creator partners by end of quarter"
                value={form.objective}
                onChange={(e) => set("objective", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Product</Label>
              <Select value={form.productId} onValueChange={(v) => set("productId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Budget ($)</Label>
              <Input
                type="number"
                min={0}
                placeholder="10000"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Target Creators</Label>
              <Input
                type="number"
                min={0}
                placeholder="10"
                value={form.targetCreatorCount}
                onChange={(e) => set("targetCreatorCount", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="Optional notes about the campaign strategy…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              mutation.mutate({
                name: form.name,
                productId: form.productId || undefined,
                objective: form.objective,
                budget: form.budget ? Number(form.budget) : undefined,
                targetCreatorCount: form.targetCreatorCount
                  ? Number(form.targetCreatorCount)
                  : undefined,
                description: form.description || undefined,
                startDate: form.startDate || undefined,
                endDate: form.endDate || undefined,
              })
            }
            disabled={!form.name || !form.objective || mutation.isPending}
          >
            {mutation.isPending ? "Creating…" : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onDelete,
}: {
  campaign: ApiCampaign;
  onDelete: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[campaign.status];
  const Icon = cfg.icon;
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/campaigns/${campaign.id}`}>
              <h3 className="font-semibold text-sm leading-snug hover:text-primary truncate cursor-pointer">
                {campaign.name}
              </h3>
            </Link>
            {campaign.productName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {campaign.productName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 flex items-center gap-1 ${cfg.color}`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete(campaign.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {campaign.objective}
        </p>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Budget used</span>
            <span className="font-medium">
              {fmt$(campaign.budgetUsed)} / {fmt$(campaign.budget)}
            </span>
          </div>
          <Progress value={budgetPct} className="h-1.5" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Creators assigned</span>
            <span className="font-medium">
              {campaign.assignedCreatorCount} / {campaign.targetCreatorCount}
            </span>
          </div>
          <Progress value={creatorPct} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              {campaign.startDate
                ? fmtDate(campaign.startDate)
                : "No start date"}
            </span>
          </div>
          <Link href={`/campaigns/${campaign.id}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              View <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Campaigns() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
  });

  const { data: metrics } = useQuery({
    queryKey: ["campaign-metrics"],
    queryFn: fetchCampaignMetrics,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign-metrics"] });
      toast({ title: "Campaign deleted" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const tiles = [
    {
      label: "Total Campaigns",
      value: metrics?.totalCampaigns ?? 0,
      icon: Megaphone,
      color: "text-blue-600",
    },
    {
      label: "Active Campaigns",
      value: metrics?.activeCampaigns ?? 0,
      icon: TrendingUp,
      color: "text-emerald-600",
    },
    {
      label: "Budget Allocated",
      value: fmt$(metrics?.budgetAllocated ?? 0),
      icon: DollarSign,
      color: "text-violet-600",
    },
    {
      label: "Budget Used",
      value: fmt$(metrics?.budgetUsed ?? 0),
      icon: DollarSign,
      color: "text-amber-600",
    },
    {
      label: "Creators Assigned",
      value: metrics?.creatorsAssigned ?? 0,
      icon: Users,
      color: "text-teal-600",
    },
    {
      label: "Budget Utilisation",
      value:
        (metrics?.budgetCommitted ?? 0) > 0
          ? `${Math.round(((metrics?.budgetUsed ?? 0) / (metrics?.budgetCommitted ?? 1)) * 100)}%`
          : "0%",
      icon: Target,
      color: "text-pink-600",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Orchestrate your influencer partnerships from discovery to results.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/help/campaign-management">
            <Button variant="outline" size="sm" className="gap-1.5">
              <HelpCircle className="w-4 h-4" />
              How It Works
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label} className="text-center">
              <CardContent className="pt-4 pb-3">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${t.color}`} />
                <div className="text-xl font-bold">{t.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t.label}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Campaign Cards */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">No campaigns yet.</p>
          <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm">
            Create your first campaign
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setCreateOpen(false)}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Campaign?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the campaign and all assigned creators.
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
