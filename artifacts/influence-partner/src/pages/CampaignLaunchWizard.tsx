import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Package,
  Search,
  Filter,
  ContactRound,
  Crosshair,
  BookOpen,
  Megaphone,
  ExternalLink,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getProducts,
  getQualificationQueue,
  getQualificationMetrics,
  getContactMetrics,
  getTargets,
  getOutreachOperations,
  fetchCampaigns,
  qualifyBatch,
  discoverContactsBatch,
  createCampaign,
  updateCampaign,
  type ApiProduct,
  type ApiCampaign,
  type CampaignType,
} from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "done" | "warning" | "pending";

interface StepMeta {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepMeta[] = [
  { id: "product", label: "Product", icon: Package },
  { id: "discovery", label: "Discovery", icon: Search },
  { id: "qualification", label: "Qualification", icon: Filter },
  { id: "contacts", label: "Contacts", icon: ContactRound },
  { id: "targets", label: "Targets", icon: Crosshair },
  { id: "outreach", label: "Outreach", icon: BookOpen },
  { id: "campaign", label: "Campaign", icon: Megaphone },
];

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, statuses }: { step: number; statuses: StepStatus[] }) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {STEPS.map((s, i) => {
        const active = step === i + 1 || (step === 8 && i === 6);
        const status = statuses[i] ?? "pending";
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex items-center gap-0.5">
            <div
              className={[
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground"
                  : status === "done"
                  ? "bg-emerald-100 text-emerald-700"
                  : status === "warning"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {status === "done" && !active ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : status === "warning" && !active ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── StatusRow ────────────────────────────────────────────────────────────────

function StatusRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
      )}
      <span className="text-muted-foreground">{label}:</span>
      <span className={ok ? "font-medium" : "text-amber-600 font-medium"}>{value}</span>
    </div>
  );
}

// ─── Warning box ──────────────────────────────────────────────────────────────

function Warning({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      {msg}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function CampaignLaunchWizard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState(1);
  const [pid, setPid] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    objective: "",
    campaignType: "affiliate" as CampaignType,
    budget: "",
    targetCreatorCount: "",
  });

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const enabled = !!pid;

  const { data: queue = [], isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ["wizard-queue", pid],
    queryFn: () => getQualificationQueue(pid),
    enabled,
  });

  const { data: qualMetrics, refetch: refetchQualMetrics } = useQuery({
    queryKey: ["wizard-qual-metrics", pid],
    queryFn: () => getQualificationMetrics(pid),
    enabled,
  });

  const { data: contactMetrics, refetch: refetchContactMetrics } = useQuery({
    queryKey: ["wizard-contact-metrics", pid],
    queryFn: () => getContactMetrics(pid),
    enabled,
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["wizard-targets", pid],
    queryFn: () => getTargets({ productId: pid }),
    enabled,
  });

  const { data: outreachOps = [] } = useQuery({
    queryKey: ["wizard-outreach", pid],
    queryFn: () => getOutreachOperations({ productId: pid }),
    enabled,
  });

  const { data: campaigns = [], refetch: refetchCampaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
    enabled,
  });

  // ── Derived values ───────────────────────────────────────────────────────────

  const selectedProduct = products.find((p) => p.id === pid) ?? null;
  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const productCampaigns = campaigns.filter((c) => c.productId === pid);

  const prospectsCount = queue.length;
  const qualifiedCount = (qualMetrics?.readyToPitch ?? 0) + (qualMetrics?.promising ?? 0);
  const contactsFound = contactMetrics?.contactsFound ?? 0;
  const targetsCount = targets.length;
  const outreachCount = outreachOps.length;
  const hasCampaign = !!selectedCampaignId;

  const statuses: StepStatus[] = [
    pid ? "done" : "pending",
    prospectsCount > 0 ? "done" : pid ? "warning" : "pending",
    qualifiedCount > 0 ? "done" : pid ? "warning" : "pending",
    contactsFound > 0 ? "done" : pid ? "warning" : "pending",
    targetsCount > 0 ? "done" : pid ? "warning" : "pending",
    outreachCount > 0 ? "done" : pid ? "warning" : "pending",
    hasCampaign ? "done" : pid ? "warning" : "pending",
  ];

  // ── Mutations ────────────────────────────────────────────────────────────────

  const qualMut = useMutation({
    mutationFn: () => qualifyBatch(pid),
    onSuccess: (d) => {
      toast({ title: `${d.qualified} creators qualified` });
      refetchQueue();
      refetchQualMetrics();
    },
    onError: (e: Error) =>
      toast({ title: "Qualification failed", description: e.message, variant: "destructive" }),
  });

  const contactMut = useMutation({
    mutationFn: () => discoverContactsBatch(pid),
    onSuccess: (d) => {
      toast({ title: `Contact discovery complete — ${d.succeeded} found` });
      refetchContactMetrics();
    },
    onError: (e: Error) =>
      toast({ title: "Contact discovery failed", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createCampaign({
        name: form.name,
        productId: pid,
        objective: form.objective,
        campaignType: form.campaignType,
        budget: form.budget ? Number(form.budget) : 0,
        targetCreatorCount: form.targetCreatorCount ? Number(form.targetCreatorCount) : 0,
      }),
    onSuccess: (c) => {
      toast({ title: "Campaign created!" });
      setSelectedCampaignId(c.id);
      setShowNewForm(false);
      refetchCampaigns();
    },
    onError: (e: Error) =>
      toast({ title: "Failed to create campaign", description: e.message, variant: "destructive" }),
  });

  const launchMut = useMutation({
    mutationFn: () => updateCampaign(selectedCampaignId, { status: "active" }),
    onSuccess: () => {
      toast({ title: "Campaign launched!" });
      setLocation(`/campaigns/${selectedCampaignId}`);
    },
    onError: (e: Error) =>
      toast({ title: "Launch failed", description: e.message, variant: "destructive" }),
  });

  // ── Navigation ───────────────────────────────────────────────────────────────

  const canAdvance = step === 1 ? !!pid : true;

  // ── Step renders ─────────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Select a Product</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the product you want to run a creator campaign for. All steps will
            be scoped to this product.
          </p>
        </div>
        {productsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading products…
          </div>
        ) : products.length === 0 ? (
          <div className="space-y-2">
            <Warning msg="No products found. Create a product before launching a campaign." />
            <Link href="/products">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Package className="w-3 h-3" /> Create Product
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setPid(p.id)}
                className={[
                  "text-left p-4 rounded-lg border-2 transition-all",
                  p.id === pid
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/50",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                  </div>
                  {p.id === pid && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {p.commissionOffer}% commission
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderStep2() {
    const done = prospectsCount > 0;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Run Discovery</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Discover creators and prospects for <strong>{selectedProduct?.name}</strong>.
            Add them in the Discovery Workspace or YouTube Discovery.
          </p>
        </div>
        <StatusRow
          ok={done}
          label="Prospects in queue"
          value={queueLoading ? "Loading…" : done ? `${prospectsCount} found` : "None found"}
        />
        {!done && (
          <Warning msg="No prospects found for this product. Use the Discovery Workspace to add creators." />
        )}
        {done && (
          <p className="text-xs text-muted-foreground">
            Top prospects: {queue.slice(0, 3).map((q) => q.prospect.name).join(", ")}
            {queue.length > 3 && ` +${queue.length - 3} more`}
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Link href="/discovery-workspace">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3 h-3" /> Discovery Workspace
            </Button>
          </Link>
          <Link href="/youtube-discovery">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3 h-3" /> YouTube Discovery
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  function renderStep3() {
    const done = qualifiedCount > 0;
    const scored = qualMetrics?.scored ?? 0;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Review Qualified Creators</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Run qualification scoring to identify the strongest fits for{" "}
            <strong>{selectedProduct?.name}</strong>.
          </p>
        </div>
        <div className="space-y-2">
          <StatusRow ok={prospectsCount > 0} label="Prospects" value={`${prospectsCount}`} />
          <StatusRow ok={scored > 0} label="Scored" value={`${scored}`} />
          <StatusRow
            ok={done}
            label="Ready to pitch / Promising"
            value={done ? `${qualifiedCount}` : "No qualified creators found"}
          />
        </div>
        {!done && prospectsCount === 0 && (
          <Warning msg="No prospects in queue. Complete Discovery first, then run Qualification." />
        )}
        {!done && prospectsCount > 0 && (
          <Warning msg="No qualified creators yet. Run batch qualification below." />
        )}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => qualMut.mutate()}
            disabled={qualMut.isPending || prospectsCount === 0}
            className="gap-1.5"
          >
            {qualMut.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Filter className="w-3 h-3" />
            )}
            Run Qualification
          </Button>
          <Link href="/qualification">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3 h-3" /> Open Qualification Engine
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  function renderStep4() {
    const done = contactsFound > 0;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Run Contact Intelligence</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Discover email addresses, social profiles, and contact readiness scores for
            qualified creators.
          </p>
        </div>
        <div className="space-y-2">
          <StatusRow
            ok={done}
            label="Contacts found"
            value={done ? `${contactsFound}` : "Contact Intelligence has not been run"}
          />
          {contactMetrics && (
            <>
              <StatusRow
                ok={(contactMetrics.emailsFound ?? 0) > 0}
                label="Emails found"
                value={`${contactMetrics.emailsFound ?? 0}`}
              />
              <StatusRow
                ok={(contactMetrics.highReadiness ?? 0) > 0}
                label="High readiness"
                value={`${contactMetrics.highReadiness ?? 0}`}
              />
            </>
          )}
        </div>
        {!done && (
          <Warning msg="Contact Intelligence has not been run for this product." />
        )}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => contactMut.mutate()}
            disabled={contactMut.isPending || qualifiedCount === 0}
            className="gap-1.5"
          >
            {contactMut.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ContactRound className="w-3 h-3" />
            )}
            Run Contact Intelligence
          </Button>
          <Link href="/contact-intelligence">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3 h-3" /> Open Contact Intelligence
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  function renderStep5() {
    const done = targetsCount > 0;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Select Targets</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Confirm your Partner Targets — the creators you will reach out to for this
            campaign.
          </p>
        </div>
        <StatusRow
          ok={done}
          label="Targets selected"
          value={done ? `${targetsCount} targets` : "No targets found for this product"}
        />
        {!done && (
          <Warning msg="No targets found. Approve qualified creators in the Qualification Engine to create targets." />
        )}
        {done && (
          <p className="text-xs text-muted-foreground">
            Top targets: {targets.slice(0, 3).map((t) => t.name).join(", ")}
            {targets.length > 3 && ` +${targets.length - 3} more`}
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Link href="/targets">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3 h-3" /> View Targets
            </Button>
          </Link>
          <Link href="/qualification">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3 h-3" /> Approve from Qualification
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  function renderStep6() {
    const done = outreachCount > 0;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Generate Research Letters</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Generate personalised research letters for your targets before outreach.
            This step is optional — you can add outreach after the campaign is created.
          </p>
        </div>
        <StatusRow
          ok={done}
          label="Outreach operations"
          value={done ? `${outreachCount} prepared` : "No outreach prepared yet"}
        />
        {!done && (
          <Warning msg="No outreach operations found for this product. You can skip this step and add outreach later." />
        )}
        <div className="flex gap-2 flex-wrap">
          <Link href="/research-outreach">
            <Button size="sm" className="gap-1.5">
              <ExternalLink className="w-3 h-3" /> Generate Research Letters
            </Button>
          </Link>
          <Link href="/outreach-operations">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3 h-3" /> Outreach Operations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  function renderStep7() {
    const formValid = form.name.trim().length > 0 && form.objective.trim().length > 0;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Create Campaign</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a campaign for <strong>{selectedProduct?.name}</strong> or select an
            existing one.
          </p>
        </div>

        {productCampaigns.length > 0 && !showNewForm && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Existing campaigns
            </p>
            {productCampaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCampaignId(c.id)}
                className={[
                  "w-full text-left p-3 rounded-lg border-2 transition-all",
                  c.id === selectedCampaignId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.objective}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {c.status}
                    </Badge>
                    {c.id === selectedCampaignId && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </div>
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setShowNewForm(true)}>
              + Create New Campaign
            </Button>
          </div>
        )}

        {(productCampaigns.length === 0 || showNewForm) && (
          <div className="space-y-3 border rounded-lg p-4">
            <p className="text-sm font-medium">New Campaign</p>
            <div>
              <Label className="text-xs">Campaign Name *</Label>
              <Input
                className="mt-0.5"
                placeholder="e.g. Q3 Creator Push"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Objective *</Label>
              <Textarea
                className="mt-0.5 text-sm"
                rows={2}
                placeholder="e.g. Sign 10 creators by end of quarter"
                value={form.objective}
                onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={form.campaignType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, campaignType: v as CampaignType }))
                  }
                >
                  <SelectTrigger className="mt-0.5 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "affiliate",
                        "awareness",
                        "sponsorship",
                        "launch",
                        "review",
                        "custom",
                      ] as CampaignType[]
                    ).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Budget ($)</Label>
                <Input
                  className="mt-0.5 h-8 text-xs"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Target Creator Count</Label>
                <Input
                  className="mt-0.5 h-8 text-xs"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.targetCreatorCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetCreatorCount: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createMut.mutate()}
                disabled={!formValid || createMut.isPending}
              >
                {createMut.isPending && (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                )}
                Create Campaign
              </Button>
              {showNewForm && productCampaigns.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {!hasCampaign && productCampaigns.length === 0 && (
          <Warning msg="No campaign created yet. Fill in the form above to create one." />
        )}
      </div>
    );
  }

  function renderStep8() {
    const ready = hasCampaign;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" /> Launch Campaign
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Review your campaign summary and launch when ready. Launching sets the campaign
            status to Active.
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Campaign Summary
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs block">Product</span>
              <span className="font-medium">{selectedProduct?.name ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Campaign</span>
              <span className="font-medium">{selectedCampaign?.name ?? "Not selected"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Creator Targets</span>
              <span className="font-medium">{targetsCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Contacts Found</span>
              <span className="font-medium">{contactsFound}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Qualified Creators</span>
              <span className="font-medium">{qualifiedCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Outreach Operations</span>
              <span className="font-medium">{outreachCount}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Checklist</p>
          <StatusRow ok={!!pid} label="Product selected" value={selectedProduct?.name ?? "—"} />
          <StatusRow ok={prospectsCount > 0} label="Discovery" value={`${prospectsCount} prospects`} />
          <StatusRow ok={qualifiedCount > 0} label="Qualification" value={`${qualifiedCount} qualified`} />
          <StatusRow ok={contactsFound > 0} label="Contact Intelligence" value={`${contactsFound} contacts`} />
          <StatusRow ok={targetsCount > 0} label="Targets" value={`${targetsCount} selected`} />
          <StatusRow ok={outreachCount > 0} label="Outreach" value={`${outreachCount} operations`} />
          <StatusRow ok={hasCampaign} label="Campaign" value={selectedCampaign?.name ?? "No campaign selected"} />
        </div>

        {!ready && (
          <Warning msg="No campaign selected. Go back to Step 7 to create or select a campaign." />
        )}

        <div className="flex gap-2">
          <Button
            disabled={!ready || launchMut.isPending}
            onClick={() => launchMut.mutate()}
            className="gap-1.5"
          >
            {launchMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            Launch Campaign
          </Button>
          {selectedCampaignId && (
            <Link href={`/campaigns/${selectedCampaignId}`}>
              <Button variant="outline" className="gap-1.5">
                <ExternalLink className="w-4 h-4" /> Open Campaign
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  function renderCurrentStep() {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      default: return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            Campaign Launch Wizard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step-by-step guide to launch a creator campaign without documentation.
          </p>
        </div>
        <Link href="/help/campaign-launch">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Help</span>
          </Button>
        </Link>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <ProgressBar step={step} statuses={statuses} />
        </CardContent>
      </Card>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-5">
            <Badge variant="outline" className="text-xs">Step {step} of 8</Badge>
            {step > 1 && selectedProduct && (
              <Badge variant="secondary" className="text-xs">{selectedProduct.name}</Badge>
            )}
          </div>
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {step > 1 && step < 8 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              className="text-muted-foreground"
            >
              Skip
            </Button>
          )}
          {step < 8 && (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
