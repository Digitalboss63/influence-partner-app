import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  getTargets,
  createTarget,
  updateTarget,
  deleteTarget,
  fetchCampaigns,
  addCampaignCreator,
  type ApiPartnerTarget,
  type ApiCampaign,
  type CreatePartnerTargetPayload,
} from "@/lib/api-client";
import { PartnerTargetStatus } from "@/types/influencePartner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Mail,
  Globe,
  Phone,
  Link2,
  Pencil,
  Trash2,
  MessageSquare,
  Crosshair,
  Building2,
  Loader2,
  ChevronDown,
  BookOpen,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES: PartnerTargetStatus[] = [
  "Not Contacted",
  "Contacted",
  "Replied",
  "Meeting Scheduled",
  "Negotiating",
  "Active Partner",
  "Rejected",
];

const STATUS_STYLE: Record<PartnerTargetStatus, string> = {
  "Not Contacted": "bg-gray-100 text-gray-700 border-gray-300",
  "Contacted": "bg-blue-100 text-blue-700 border-blue-300",
  "Replied": "bg-violet-100 text-violet-700 border-violet-300",
  "Meeting Scheduled": "bg-amber-100 text-amber-700 border-amber-300",
  "Negotiating": "bg-orange-100 text-orange-700 border-orange-300",
  "Active Partner": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "Rejected": "bg-red-100 text-red-700 border-red-300",
};

const PARTNER_CATEGORIES = [
  "Course Creator",
  "Productivity YouTuber",
  "Business Educator",
  "Podcast Host",
  "Newsletter Owner",
  "Community Builder",
  "Financial Coach",
  "Software Reviewer",
  "Fitness Influencer",
  "Lifestyle Creator",
  "Other",
];

// ─── Form helpers ─────────────────────────────────────────────────────────────

interface TargetForm {
  name: string;
  company: string;
  platform: string;
  website: string;
  email: string;
  phone: string;
  socialUrl: string;
  partnerCategory: string;
  productId: string;
  notes: string;
  status: PartnerTargetStatus;
}

function emptyForm(productId = ""): TargetForm {
  return {
    name: "",
    company: "",
    platform: "",
    website: "",
    email: "",
    phone: "",
    socialUrl: "",
    partnerCategory: "",
    productId,
    notes: "",
    status: "Not Contacted",
  };
}

function formToPayload(form: TargetForm): CreatePartnerTargetPayload {
  return {
    productId: form.productId,
    partnerCategory: form.partnerCategory,
    name: form.name,
    company: form.company || undefined,
    platform: form.platform || undefined,
    website: form.website || undefined,
    email: form.email || undefined,
    phone: form.phone || undefined,
    socialUrl: form.socialUrl || undefined,
    notes: form.notes || undefined,
    status: form.status,
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PartnerTargetStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium border", STATUS_STYLE[status])}
    >
      {status}
    </Badge>
  );
}

// ─── Target card ──────────────────────────────────────────────────────────────

interface TargetCardProps {
  target: ApiPartnerTarget;
  productName: string;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: PartnerTargetStatus) => void;
  onGenerateOutreach: () => void;
  onGenerateResearchLetters: () => void;
  onAddToCampaign: () => void;
  isUpdating: boolean;
}

function TargetCard({
  target,
  productName,
  onEdit,
  onDelete,
  onStatusChange,
  onGenerateOutreach,
  onGenerateResearchLetters,
  onAddToCampaign,
  isUpdating,
}: TargetCardProps) {
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground leading-tight truncate">
              {target.name}
            </h3>
            {target.company && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{target.company}</span>
              </div>
            )}
          </div>
          <StatusBadge status={target.status} />
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {target.partnerCategory}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">{productName}</span>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 flex-1 flex flex-col gap-3">
        {/* Contact details */}
        <div className="space-y-1.5">
          {target.email && (
            <a
              href={`mailto:${target.email}`}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{target.email}</span>
            </a>
          )}
          {target.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{target.phone}</span>
            </div>
          )}
          {target.website && (
            <a
              href={target.website.startsWith("http") ? target.website : `https://${target.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{target.website}</span>
            </a>
          )}
          {target.socialUrl && (
            <a
              href={target.socialUrl.startsWith("http") ? target.socialUrl : `https://${target.socialUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{target.socialUrl}</span>
            </a>
          )}
          {!target.email && !target.phone && !target.website && !target.socialUrl && (
            <p className="text-xs text-muted-foreground/60 italic">No contact info yet</p>
          )}
        </div>

        {target.notes && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5 leading-relaxed line-clamp-2">
            {target.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-auto pt-1">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1"
            onClick={onEdit}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1"
            onClick={onGenerateResearchLetters}
            title="Generate personalised research-based outreach letters"
          >
            <BookOpen className="w-3 h-3" />
            Letters
          </Button>
          <Button
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={onGenerateOutreach}
          >
            <MessageSquare className="w-3 h-3" />
            Outreach
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1"
            onClick={onAddToCampaign}
            title="Add to a campaign"
          >
            <Megaphone className="w-3 h-3" />
            Campaign
          </Button>
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1"
              onClick={() => setStatusOpen((o) => !o)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Move
            </Button>
            {statusOpen && (
              <div className="absolute bottom-full left-0 mb-1 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-40">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                      s === target.status && "font-semibold text-primary",
                    )}
                    onClick={() => {
                      onStatusChange(s);
                      setStatusOpen(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 gap-1 text-destructive hover:text-destructive ml-auto"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add to Campaign Dialog ───────────────────────────────────────────────────

interface AddToCampaignDialogProps {
  target: ApiPartnerTarget;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function AddToCampaignDialog({ target, open, onOpenChange }: AddToCampaignDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  const { data: campaigns = [] } = useQuery<ApiCampaign[]>({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
    enabled: open,
  });

  const activeCampaigns = campaigns.filter(
    (c) => !["completed", "cancelled"].includes(c.status),
  );

  const mutation = useMutation({
    mutationFn: () =>
      addCampaignCreator(selectedCampaignId, {
        creatorName: target.name,
        targetId: target.id,
        assignmentStatus: "identified",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["eligible-targets", selectedCampaignId] });
      toast({ title: `${target.name} added to campaign` });
      setSelectedCampaignId("");
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSelectedCampaignId("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Adding <strong>{target.name}</strong> as an identified creator.
          </p>
          {activeCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-border rounded-md p-3 text-center">
              No active campaigns. Create a campaign first.
            </p>
          ) : (
            <div className="space-y-1">
              <Label>Select Campaign</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a campaign…" />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!selectedCampaignId || mutation.isPending || activeCampaigns.length === 0}
          >
            {mutation.isPending ? "Adding…" : "Add to Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

interface TargetDialogProps {
  open: boolean;
  mode: "add" | "edit";
  form: TargetForm;
  products: { id: string; name: string }[];
  isSaving: boolean;
  onChange: (patch: Partial<TargetForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function TargetDialog({
  open,
  mode,
  form,
  products,
  isSaving,
  onChange,
  onSubmit,
  onClose,
}: TargetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Partner Target" : "Edit Target"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          {/* Name + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-name" className="text-xs">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="John Smith"
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-company" className="text-xs">
                Company
              </Label>
              <Input
                id="t-company"
                value={form.company}
                onChange={(e) => onChange({ company: e.target.value })}
                placeholder="Acme Corp"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Partner Category + Product */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Partner Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.partnerCategory}
                onValueChange={(v) => onChange({ partnerCategory: v })}
                required
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Product <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.productId}
                onValueChange={(v) => onChange({ productId: v })}
                required
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Platform + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-platform" className="text-xs">
                Platform
              </Label>
              <Input
                id="t-platform"
                value={form.platform}
                onChange={(e) => onChange({ platform: e.target.value })}
                placeholder="YouTube, Podcast, Blog…"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => onChange({ status: v as PartnerTargetStatus })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Website + Social URL */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-website" className="text-xs">
                Website
              </Label>
              <Input
                id="t-website"
                value={form.website}
                onChange={(e) => onChange({ website: e.target.value })}
                placeholder="https://example.com"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-social" className="text-xs">
                Social URL
              </Label>
              <Input
                id="t-social"
                value={form.socialUrl}
                onChange={(e) => onChange({ socialUrl: e.target.value })}
                placeholder="https://youtube.com/@..."
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-email" className="text-xs">
                Email
              </Label>
              <Input
                id="t-email"
                type="email"
                value={form.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="john@example.com"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-phone" className="text-xs">
                Phone
              </Label>
              <Input
                id="t-phone"
                value={form.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                placeholder="+1 555 000 1234"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="t-notes" className="text-xs">
              Notes
            </Label>
            <Textarea
              id="t-notes"
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Audience size, niche details, referral notes…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !form.name || !form.partnerCategory || !form.productId}
              className="text-sm"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {mode === "add" ? "Add Target" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerTargets() {
  const [, setLocation] = useLocation();
  const { products, selectedProductId } = useAppContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TargetForm>(emptyForm());

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState("_all_");
  const [filterProduct, setFilterProduct] = useState("_all_");
  const [searchName, setSearchName] = useState("");

  // ── Updater targets ──────────────────────────────────────────────────────
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [addToCampaignTarget, setAddToCampaignTarget] = useState<ApiPartnerTarget | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["targets"],
    queryFn: () => getTargets(),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePartnerTargetPayload> }) =>
      updateTarget(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      setUpdatingId(null);
    },
    onError: () => setUpdatingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      toast({ title: "Target removed" });
    },
  });

  // ── Dialog handlers ───────────────────────────────────────────────────────
  const openAdd = () => {
    setDialogMode("add");
    setEditId(null);
    setForm(emptyForm(selectedProductId ?? products[0]?.id ?? ""));
    setDialogOpen(true);
  };

  const openEdit = (t: ApiPartnerTarget) => {
    setDialogMode("edit");
    setEditId(t.id);
    setForm({
      name: t.name,
      company: t.company ?? "",
      platform: t.platform ?? "",
      website: t.website ?? "",
      email: t.email ?? "",
      phone: t.phone ?? "",
      socialUrl: t.socialUrl ?? "",
      partnerCategory: t.partnerCategory,
      productId: t.productId,
      notes: t.notes ?? "",
      status: t.status,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = formToPayload(form);
    if (dialogMode === "edit" && editId) {
      updateMutation.mutate(
        { id: editId, payload },
        {
          onSuccess: () => {
            toast({ title: "Target updated" });
            closeDialog();
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Target added", description: form.name });
          closeDialog();
        },
      });
    }
  };

  // ── Status change ─────────────────────────────────────────────────────────
  const handleStatusChange = (t: ApiPartnerTarget, newStatus: PartnerTargetStatus) => {
    setUpdatingId(t.id);
    updateMutation.mutate(
      { id: t.id, payload: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: `Moved to "${newStatus}"`, description: t.name });
        },
      },
    );
  };

  // ── Generate research letters ─────────────────────────────────────────────
  const handleGenerateResearchLetters = (t: ApiPartnerTarget) => {
    const params = new URLSearchParams({ targetId: t.id });
    if (t.productId) params.set("productId", t.productId);
    setLocation(`/research-outreach?${params.toString()}`);
  };

  // ── Generate outreach ─────────────────────────────────────────────────────
  const handleGenerateOutreach = (t: ApiPartnerTarget) => {
    const product = products.find((p) => p.id === t.productId);
    if (!product) {
      toast({ title: "Product not found", variant: "destructive" });
      return;
    }
    const params = new URLSearchParams({
      partnerType: t.partnerCategory,
      commission: `${product.commissionOffer}%`,
      outreachAngle: product.mainBenefit,
      tier: "1",
      icon: "🎯",
      targetName: t.name,
    });
    setLocation(`/partner-outreach?${params.toString()}`);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = targets.filter((t) => {
    if (filterStatus !== "_all_" && t.status !== filterStatus) return false;
    if (filterProduct !== "_all_" && t.productId !== filterProduct) return false;
    if (
      searchName &&
      !t.name.toLowerCase().includes(searchName.toLowerCase()) &&
      !(t.company ?? "").toLowerCase().includes(searchName.toLowerCase())
    )
      return false;
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCount = targets.length;
  const contactedCount = targets.filter((t) =>
    ["Contacted", "Replied"].includes(t.status),
  ).length;
  const meetingsCount = targets.filter((t) => t.status === "Meeting Scheduled").length;
  const negotiatingCount = targets.filter((t) => t.status === "Negotiating").length;
  const activeCount = targets.filter((t) => t.status === "Active Partner").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-primary" />
            Partner Targets
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track individual people you're recruiting as partners
          </p>
        </div>
        <Button onClick={openAdd} disabled={products.length === 0}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Target
        </Button>
      </div>

      {products.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
          You need at least one product before adding targets.{" "}
          <button
            className="underline font-medium"
            onClick={() => setLocation("/products")}
          >
            Add a product →
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: totalCount, color: "text-foreground" },
          { label: "Contacted", value: contactedCount, color: "text-blue-700" },
          { label: "Meetings", value: meetingsCount, color: "text-amber-700" },
          { label: "Negotiating", value: negotiatingCount, color: "text-orange-700" },
          { label: "Active Partners", value: activeCount, color: "text-emerald-700" },
        ].map((stat) => (
          <Card key={stat.label} className="text-center py-3 px-2">
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Search by name or company…"
          className="sm:max-w-64 h-8 text-sm"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-44 h-8 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="sm:w-48 h-8 text-sm">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All products</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterStatus !== "_all_" || filterProduct !== "_all_" || searchName) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setFilterStatus("_all_");
              setFilterProduct("_all_");
              setSearchName("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Crosshair className="w-10 h-10 text-muted-foreground/30 mb-3" />
          {targets.length === 0 ? (
            <>
              <p className="font-semibold text-foreground">No targets yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Add real people you want to recruit from your Partner Strategy
                categories.
              </p>
              <Button className="mt-4" onClick={openAdd} disabled={products.length === 0}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Your First Target
              </Button>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">No targets match your filters</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting or clearing the filters.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const productName =
              products.find((p) => p.id === t.productId)?.name ?? "Unknown product";
            return (
              <TargetCard
                key={t.id}
                target={t}
                productName={productName}
                onEdit={() => openEdit(t)}
                onDelete={() => deleteMutation.mutate(t.id)}
                onStatusChange={(s) => handleStatusChange(t, s)}
                onGenerateOutreach={() => handleGenerateOutreach(t)}
                onGenerateResearchLetters={() => handleGenerateResearchLetters(t)}
                onAddToCampaign={() => setAddToCampaignTarget(t)}
                isUpdating={updatingId === t.id}
              />
            );
          })}
        </div>
      )}

      {/* Add to Campaign dialog */}
      {addToCampaignTarget && (
        <AddToCampaignDialog
          target={addToCampaignTarget}
          open={!!addToCampaignTarget}
          onOpenChange={(v) => { if (!v) setAddToCampaignTarget(null); }}
        />
      )}

      {/* Add / Edit dialog */}
      <TargetDialog
        open={dialogOpen}
        mode={dialogMode}
        form={form}
        products={products}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleSubmit}
        onClose={closeDialog}
      />
    </div>
  );
}
