import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProspects,
  createProspect,
  updateProspect,
  deleteProspect,
  getProducts,
  createTarget,
  type ApiPartnerProspect,
  type CreatePartnerProspectPayload,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Telescope,
  Plus,
  Zap,
  Upload,
  Trash2,
  ExternalLink,
  Mail,
  Globe,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Crosshair,
  Users,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { PartnerProspectStatus } from "@/types/influencePartner";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PartnerProspectStatus,
  { label: string; color: string; dot: string }
> = {
  "New Prospect": {
    label: "New Prospect",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  Qualified: {
    label: "Qualified",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  Rejected: {
    label: "Rejected",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
  "Added To Targets": {
    label: "Added To Targets",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
};

const STATUSES: PartnerProspectStatus[] = [
  "New Prospect",
  "Qualified",
  "Rejected",
  "Added To Targets",
];

const PARTNER_CATEGORIES = [
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

// ─── Quick Capture Parser ─────────────────────────────────────────────────────

function parseQuickCapture(raw: string): Partial<CreatePartnerProspectPayload> {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const emailRe = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
  const urlRe = /https?:\/\/[^\s]+/i;

  let name = "";
  let company = "";
  let email = "";
  let website = "";
  const noteLines: string[] = [];

  let textLineCount = 0;

  for (const line of lines) {
    const isEmail = emailRe.test(line);
    const isUrl = urlRe.test(line);

    if (isEmail && !email) {
      email = line.match(emailRe)![0];
      continue;
    }
    if (isUrl && !website) {
      website = line.match(urlRe)![0].replace(/[,;]$/, "");
      continue;
    }
    if (!isEmail && !isUrl) {
      if (textLineCount === 0) {
        name = line;
        textLineCount++;
      } else if (textLineCount === 1) {
        company = line;
        textLineCount++;
      } else {
        noteLines.push(line);
      }
    }
  }

  return {
    name,
    company: company || undefined,
    email: email || undefined,
    website: website || undefined,
    notes: noteLines.join(" ").trim() || undefined,
    source: "Quick Capture",
  };
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

interface CsvRow {
  name: string;
  company: string;
  email: string;
  website: string;
  platform: string;
  partnerCategory: string;
  notes: string;
}

function parseCsv(text: string): { rows: CsvRow[]; error: string } {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) {
    return { rows: [], error: "CSV must have a header row and at least one data row." };
  }

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s_-]+/g, "")
      .replace(/[^a-z]/g, "");

  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map(normalize);

  const col = (key: string): number => {
    const aliases: Record<string, string[]> = {
      name: ["name"],
      company: ["company", "org", "organization"],
      email: ["email", "emailaddress"],
      website: ["website", "url", "site", "web"],
      platform: ["platform", "channel"],
      partnerCategory: ["partnercategory", "category", "type", "partnertype"],
      notes: ["notes", "note", "comments", "comment", "description"],
    };
    const candidates = aliases[key] ?? [key];
    for (const candidate of candidates) {
      const idx = headers.findIndex((h) => h === candidate);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameCol = col("name");
  if (nameCol === -1) {
    return { rows: [], error: 'CSV must have a "Name" column.' };
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (key: string) => {
      const idx = col(key);
      return idx !== -1 ? (cells[idx] ?? "") : "";
    };
    const name = get("name");
    if (!name) continue;
    rows.push({
      name,
      company: get("company"),
      email: get("email"),
      website: get("website"),
      platform: get("platform"),
      partnerCategory: get("partnerCategory"),
      notes: get("notes"),
    });
  }

  if (rows.length === 0) {
    return { rows: [], error: "No valid rows found (Name column is required per row)." };
  }

  return { rows, error: "" };
}

// ─── Empty form ───────────────────────────────────────────────────────────────

function emptyForm(): CreatePartnerProspectPayload {
  return {
    name: "",
    company: "",
    platform: "",
    partnerCategory: "",
    website: "",
    email: "",
    socialUrl: "",
    audienceSize: "",
    notes: "",
    source: "Manual",
    status: "New Prospect",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiscoveryWorkspace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: () => getProspects(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["prospects"] });

  const createMutation = useMutation({
    mutationFn: createProspect,
    onSuccess: () => { invalidate(); },
    onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePartnerProspectPayload> }) =>
      updateProspect(id, payload),
    onSuccess: () => { invalidate(); },
    onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProspect,
    onSuccess: () => { invalidate(); toast({ title: "Prospect removed" }); },
    onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
  });

  const createTargetMutation = useMutation({
    mutationFn: createTarget,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["targets"] }),
    onError: (e) => toast({ title: "Target creation failed", description: (e as Error).message, variant: "destructive" }),
  });

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState("_all_");
  const [searchName, setSearchName] = useState("");

  // ── Manual add / edit dialog ──────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePartnerProspectPayload>(emptyForm());

  // ── Quick Capture dialog ──────────────────────────────────────────────────
  const [qcOpen, setQcOpen] = useState(false);
  const [qcText, setQcText] = useState("");
  const [qcParsed, setQcParsed] = useState<Partial<CreatePartnerProspectPayload> | null>(null);
  const [qcSaving, setQcSaving] = useState(false);

  // ── CSV Import dialog ─────────────────────────────────────────────────────
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Add To Targets dialog ─────────────────────────────────────────────────
  const [attProspect, setAttProspect] = useState<ApiPartnerProspect | null>(null);
  const [attProductId, setAttProductId] = useState("_none_");
  const [attCategory, setAttCategory] = useState("");
  const [attSaving, setAttSaving] = useState(false);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = prospects.filter((p) => {
    if (filterStatus !== "_all_" && p.status !== filterStatus) return false;
    if (
      searchName &&
      !p.name.toLowerCase().includes(searchName.toLowerCase()) &&
      !(p.company ?? "").toLowerCase().includes(searchName.toLowerCase())
    )
      return false;
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCount = prospects.length;
  const qualifiedCount = prospects.filter((p) => p.status === "Qualified").length;
  const addedCount = prospects.filter((p) => p.status === "Added To Targets").length;
  const rejectedCount = prospects.filter((p) => p.status === "Rejected").length;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setField = (k: keyof CreatePartnerProspectPayload, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function openAdd() {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(p: ApiPartnerProspect) {
    setEditId(p.id);
    setForm({
      name: p.name,
      company: p.company ?? "",
      platform: p.platform ?? "",
      partnerCategory: p.partnerCategory ?? "",
      website: p.website ?? "",
      email: p.email ?? "",
      socialUrl: p.socialUrl ?? "",
      audienceSize: p.audienceSize ?? "",
      notes: p.notes ?? "",
      source: p.source,
      status: p.status,
    });
    setDialogOpen(true);
  }

  async function saveProspect() {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload: CreatePartnerProspectPayload = {
      name: form.name.trim(),
      company: form.company?.trim() || undefined,
      platform: form.platform?.trim() || undefined,
      partnerCategory: form.partnerCategory?.trim() || undefined,
      website: form.website?.trim() || undefined,
      email: form.email?.trim() || undefined,
      socialUrl: form.socialUrl?.trim() || undefined,
      audienceSize: form.audienceSize?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      source: form.source || "Manual",
      status: form.status ?? "New Prospect",
    };
    if (editId) {
      await updateMutation.mutateAsync({ id: editId, payload });
      toast({ title: "Prospect updated" });
    } else {
      await createMutation.mutateAsync(payload);
      toast({ title: "Prospect added" });
    }
    setDialogOpen(false);
  }

  async function quickStatusChange(id: string, status: PartnerProspectStatus) {
    await updateMutation.mutateAsync({ id, payload: { status } });
    toast({ title: `Marked as ${status}` });
  }

  // ── Quick Capture ─────────────────────────────────────────────────────────
  function parseQc() {
    const parsed = parseQuickCapture(qcText);
    setQcParsed(parsed);
  }

  async function saveQc() {
    if (!qcParsed?.name?.trim()) {
      toast({ title: "Could not extract a name from the text", variant: "destructive" });
      return;
    }
    setQcSaving(true);
    try {
      await createMutation.mutateAsync({
        name: qcParsed.name,
        company: qcParsed.company,
        email: qcParsed.email,
        website: qcParsed.website,
        notes: qcParsed.notes,
        source: "Quick Capture",
        status: "New Prospect",
      });
      toast({ title: "Prospect captured!", description: qcParsed.name });
      setQcOpen(false);
      setQcText("");
      setQcParsed(null);
    } finally {
      setQcSaving(false);
    }
  }

  // ── CSV Import ────────────────────────────────────────────────────────────
  function parseCsvText(text: string) {
    const result = parseCsv(text);
    setCsvRows(result.rows);
    setCsvError(result.error);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  }

  async function importCsv() {
    if (csvRows.length === 0) return;
    setCsvImporting(true);
    let ok = 0;
    let fail = 0;
    for (const row of csvRows) {
      try {
        await createProspect({
          name: row.name,
          company: row.company || undefined,
          email: row.email || undefined,
          website: row.website || undefined,
          platform: row.platform || undefined,
          partnerCategory: row.partnerCategory || undefined,
          notes: row.notes || undefined,
          source: "CSV Import",
          status: "New Prospect",
        });
        ok++;
      } catch {
        fail++;
      }
    }
    await invalidate();
    setCsvImporting(false);
    setCsvOpen(false);
    setCsvText("");
    setCsvRows([]);
    toast({
      title: `Imported ${ok} prospect${ok !== 1 ? "s" : ""}`,
      description: fail > 0 ? `${fail} row(s) failed` : undefined,
    });
  }

  // ── Add To Targets ────────────────────────────────────────────────────────
  function openAddToTargets(p: ApiPartnerProspect) {
    setAttProspect(p);
    setAttProductId("_none_");
    setAttCategory(p.partnerCategory ?? "");
  }

  async function confirmAddToTargets() {
    if (!attProspect || attProductId === "_none_") {
      toast({ title: "Please select a product", variant: "destructive" });
      return;
    }
    setAttSaving(true);
    try {
      await createTargetMutation.mutateAsync({
        productId: attProductId,
        partnerCategory: attCategory || attProspect.partnerCategory || "Other",
        name: attProspect.name,
        company: attProspect.company ?? undefined,
        platform: attProspect.platform ?? undefined,
        website: attProspect.website ?? undefined,
        email: attProspect.email ?? undefined,
        socialUrl: attProspect.socialUrl ?? undefined,
        notes: attProspect.notes ?? undefined,
        status: "Not Contacted",
      });
      await updateMutation.mutateAsync({
        id: attProspect.id,
        payload: { status: "Added To Targets" },
      });
      toast({
        title: "Added to Targets",
        description: `${attProspect.name} is now in your Targets pipeline.`,
      });
      setAttProspect(null);
    } finally {
      setAttSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Telescope className="w-6 h-6 text-primary" />
            Discovery Workspace
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stage and qualify partner prospects before moving them to Targets
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setQcOpen(true)}>
            <Zap className="w-4 h-4 mr-1" />
            Quick Capture
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4 mr-1" />
            Import CSV
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: totalCount, color: "text-foreground" },
          { label: "Qualified", value: qualifiedCount, color: "text-emerald-600" },
          { label: "Added To Targets", value: addedCount, color: "text-purple-600" },
          { label: "Rejected", value: rejectedCount, color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-card border rounded-lg p-4 text-center cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() =>
              setFilterStatus(
                label === "Total"
                  ? "_all_"
                  : label === "Added To Targets"
                  ? "Added To Targets"
                  : label
              )
            }
          >
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
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
        {(filterStatus !== "_all_" || searchName) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setFilterStatus("_all_"); setSearchName(""); }}
          >
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {prospects.length} prospects
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading prospects…</div>
      ) : prospects.length === 0 ? (
        <div className="text-center py-20">
          <Telescope className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-foreground mb-1">No prospects yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Paste raw research with Quick Capture, import a CSV, or add one manually.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setQcOpen(true)}>
              <Zap className="w-4 h-4 mr-1" />
              Quick Capture
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Add Prospect
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No prospects match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const cfg = STATUS_CONFIG[p.status];
            return (
              <div
                key={p.id}
                className="bg-card border rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base truncate">{p.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    {p.company && (
                      <p className="text-sm text-muted-foreground mt-0.5">{p.company}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => deleteMutation.mutate(p.id)}
                    title="Delete prospect"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1.5">
                  {p.partnerCategory && (
                    <Badge variant="secondary" className="text-xs">
                      {p.partnerCategory}
                    </Badge>
                  )}
                  {p.platform && (
                    <Badge variant="outline" className="text-xs">
                      {p.platform}
                    </Badge>
                  )}
                  {p.audienceSize && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      {p.audienceSize}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <FileText className="w-3 h-3" />
                    {p.source}
                  </span>
                </div>

                {/* Contact links */}
                {(p.email || p.website || p.socialUrl) && (
                  <div className="flex flex-wrap gap-3 text-xs text-primary">
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {p.email}
                      </a>
                    )}
                    {p.website && (
                      <a
                        href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Website
                      </a>
                    )}
                    {p.socialUrl && (
                      <a
                        href={p.socialUrl.startsWith("http") ? p.socialUrl : `https://${p.socialUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Social
                      </a>
                    )}
                  </div>
                )}

                {/* Notes */}
                {p.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 rounded px-2 py-1.5">
                    {p.notes}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  {p.status !== "Qualified" && p.status !== "Added To Targets" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => quickStatusChange(p.id, "Qualified")}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Qualify
                    </Button>
                  )}
                  {p.status !== "Rejected" && p.status !== "Added To Targets" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => quickStatusChange(p.id, "Rejected")}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  )}
                  {p.status !== "Added To Targets" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                      onClick={() => openAddToTargets(p)}
                    >
                      <Crosshair className="w-3.5 h-3.5 mr-1" />
                      Add To Targets
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs ml-auto text-muted-foreground"
                      >
                        More <ChevronDown className="w-3 h-3 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-sm">
                      <DropdownMenuItem onClick={() => openEdit(p)}>Edit</DropdownMenuItem>
                      {STATUSES.filter((s) => s !== p.status).map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => quickStatusChange(p.id, s)}
                        >
                          Move to {s}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Prospect" : "Add Prospect"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1">
                <Label>Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setField("company", e.target.value)}
                  placeholder="Company or brand"
                />
              </div>
              <div className="space-y-1">
                <Label>Platform</Label>
                <Input
                  value={form.platform}
                  onChange={(e) => setField("platform", e.target.value)}
                  placeholder="YouTube, Podcast, Blog…"
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-1">
                <Label>Audience Size</Label>
                <Input
                  value={form.audienceSize}
                  onChange={(e) => setField("audienceSize", e.target.value)}
                  placeholder="50k, 1.2M…"
                />
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1">
                <Label>Social URL</Label>
                <Input
                  value={form.socialUrl}
                  onChange={(e) => setField("socialUrl", e.target.value)}
                  placeholder="https://youtube.com/…"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Partner Category</Label>
                <Select
                  value={form.partnerCategory || "_none_"}
                  onValueChange={(v) => setField("partnerCategory", v === "_none_" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">No category</SelectItem>
                    {PARTNER_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Status</Label>
                <Select
                  value={form.status ?? "New Prospect"}
                  onValueChange={(v) =>
                    setField("status", v as PartnerProspectStatus)
                  }
                >
                  <SelectTrigger>
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
              <div className="space-y-1 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Anything worth remembering…"
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProspect}>
              {editId ? "Save changes" : "Add Prospect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick Capture Dialog ──────────────────────────────────────── */}
      <Dialog open={qcOpen} onOpenChange={(o) => { setQcOpen(o); if (!o) { setQcText(""); setQcParsed(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Quick Capture
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Paste a name, email, website, or raw research. We'll parse it into a prospect record.
            </p>
            <Textarea
              value={qcText}
              onChange={(e) => setQcText(e.target.value)}
              placeholder={`John Smith\nAcme Corp\nhttps://acme.com\njohn@acme.com\nHas 50k newsletter subscribers in productivity niche.`}
              rows={7}
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={parseQc}
              disabled={!qcText.trim()}
            >
              Parse →
            </Button>

            {qcParsed && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Parsed result
                </p>
                {qcParsed.name ? (
                  <div>
                    <span className="text-muted-foreground w-24 inline-block">Name:</span>
                    <span className="font-medium">{qcParsed.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">Could not extract a name — try adding one on the first line.</span>
                  </div>
                )}
                {qcParsed.company && (
                  <div>
                    <span className="text-muted-foreground w-24 inline-block">Company:</span>
                    {qcParsed.company}
                  </div>
                )}
                {qcParsed.email && (
                  <div>
                    <span className="text-muted-foreground w-24 inline-block">Email:</span>
                    {qcParsed.email}
                  </div>
                )}
                {qcParsed.website && (
                  <div>
                    <span className="text-muted-foreground w-24 inline-block">Website:</span>
                    {qcParsed.website}
                  </div>
                )}
                {qcParsed.notes && (
                  <div>
                    <span className="text-muted-foreground w-24 inline-block">Notes:</span>
                    <span className="text-xs">{qcParsed.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQcOpen(false); setQcText(""); setQcParsed(null); }}>
              Cancel
            </Button>
            <Button
              onClick={saveQc}
              disabled={!qcParsed?.name?.trim() || qcSaving}
            >
              {qcSaving ? "Saving…" : "Create Prospect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV Import Dialog ─────────────────────────────────────────── */}
      <Dialog open={csvOpen} onOpenChange={(o) => { setCsvOpen(o); if (!o) { setCsvText(""); setCsvRows([]); setCsvError(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Supported columns:{" "}
              <code className="text-xs bg-muted px-1 rounded">
                Name, Company, Email, Website, Platform, Partner Category, Notes
              </code>
              . First row must be headers.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-1" />
                Upload .csv file
              </Button>
              <span className="text-xs text-muted-foreground">or paste below</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            <Textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                parseCsvText(e.target.value);
              }}
              placeholder={"Name,Company,Email,Website,Platform,Partner Category,Notes\nJane Doe,Acme Inc,jane@acme.com,https://acme.com,YouTube,YouTuber,Great fit for SaaS tools"}
              rows={8}
              className="font-mono text-xs"
            />
            {csvError && (
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {csvError}
              </div>
            )}
            {csvRows.length > 0 && (
              <div className="rounded-lg border overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      {["Name", "Company", "Email", "Platform", "Category"].map((h) => (
                        <th key={h} className="text-left px-2 py-1.5 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-2 py-1.5 font-medium">{r.name}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.company}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.email}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.platform}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.partnerCategory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length > 10 && (
                  <p className="text-xs text-muted-foreground px-2 py-1.5 border-t">
                    …and {csvRows.length - 10} more rows
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={importCsv}
              disabled={csvRows.length === 0 || csvImporting}
            >
              {csvImporting
                ? "Importing…"
                : `Import ${csvRows.length} prospect${csvRows.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add To Targets Dialog ─────────────────────────────────────── */}
      <Dialog open={!!attProspect} onOpenChange={(o) => { if (!o) setAttProspect(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-purple-600" />
              Add to Targets
            </DialogTitle>
          </DialogHeader>
          {attProspect && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Move <strong>{attProspect.name}</strong> from Discovery into your Targets pipeline. Select which product to recruit them for.
              </p>
              <div className="space-y-1">
                <Label>Product *</Label>
                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products yet.{" "}
                    <button
                      className="text-primary underline"
                      onClick={() => { setAttProspect(null); setLocation("/products"); }}
                    >
                      Add one
                    </button>
                    .
                  </p>
                ) : (
                  <Select value={attProductId} onValueChange={setAttProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Select product…</SelectItem>
                      {products.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id}>
                          {pr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label>Partner Category</Label>
                <Select
                  value={attCategory || "_none_"}
                  onValueChange={(v) => setAttCategory(v === "_none_" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">No category</SelectItem>
                    {PARTNER_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttProspect(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAddToTargets}
              disabled={attProductId === "_none_" || attSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {attSaving ? "Adding…" : "Add to Targets"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
