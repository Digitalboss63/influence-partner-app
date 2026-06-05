import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Mail,
  Globe,
  Instagram,
  Youtube,
  Linkedin,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import {
  getContactIntelligence,
  getContactMetrics,
  discoverContact,
  discoverContactsBatch,
  verifyContact,
  exportContactIntelligenceCsv,
  type ApiContactIntelligence,
  type ContactTab,
  type VerificationStatus,
} from "@/lib/api-client";
import { getProspects } from "@/lib/api-client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortKey = "readiness" | "email_first" | "recent" | "fit_score";

function readinessColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-500";
}

function readinessBg(score: number) {
  if (score >= 70) return "bg-emerald-50 border-emerald-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function statusBadge(status: VerificationStatus) {
  const map: Record<VerificationStatus, { label: string; cls: string }> = {
    verified: { label: "Verified", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    likely: { label: "Likely", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    unverified: { label: "Unverified", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    missing: { label: "Missing", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] ?? map.unverified;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${s.cls}`}>
      {status === "verified" || status === "likely" ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      {s.label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground transition-colors ml-1"
      title="Copy"
    >
      {copied ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ─── Recommended next action ──────────────────────────────────────────────────

function getNextAction(row: ApiContactIntelligence): string {
  if (row.businessEmail && row.contactReadinessScore >= 60)
    return "Ready to outreach — email found and profile verified";
  if (row.businessEmail)
    return "Email found — verify before outreaching";
  if (row.websiteUrl || row.instagramUrl || row.tiktokUrl)
    return "Website/social found — look for contact or DM";
  if (row.contactReadinessScore < 20)
    return "Manually research this creator's contact channels";
  return "Check social profiles for business email or contact link";
}

// ─── Audit Panel ──────────────────────────────────────────────────────────────

function AuditPanel({ row }: { row: ApiContactIntelligence }) {
  const notes = row.auditNotes as Record<string, unknown> | null;
  const sources = (notes?.sourcesUsed as string[] | null) ?? [];
  const breakdown = (notes?.scoreBreakdown as Record<string, number> | null) ?? {};
  const missing = (notes?.missingFields as string[] | null) ?? [];

  const srcLabels: Record<string, string> = {
    prospect_email_field: "Prospect email field",
    prospect_website: "Prospect website field",
    prospect_social_url: "Prospect social URL",
    prospect_notes: "Prospect notes text",
    qualification_contact_email: "Qualification contact email",
    youtube_description: "YouTube channel description",
    youtube_channel_url: "YouTube channel URL",
    youtube_custom_url: "YouTube custom URL",
    youtube_channel_id: "YouTube channel ID",
    youtube_video_title: "Latest video title",
    inferred_contact_page: "Inferred from website",
    creator_handle: "Creator handle",
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3 text-xs">
      <p className="font-semibold text-foreground">Contact Audit</p>

      {sources.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Sources used:</p>
          <ul className="space-y-0.5 ml-2">
            {sources.map((s) => (
              <li key={s} className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                {srcLabels[s] ?? s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(breakdown).length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Score breakdown:</p>
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(breakdown).map(([k, v]) => (
                  <tr key={k} className="border-b border-border last:border-0">
                    <td className="px-2 py-1 text-muted-foreground capitalize">
                      {k.replace(/([A-Z])/g, " $1")}
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-emerald-700">+{v}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-2 py-1">Total</td>
                  <td className="px-2 py-1 text-right font-mono">{row.contactReadinessScore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Missing fields:</p>
          <ul className="space-y-0.5 ml-2">
            {missing.map((m) => (
              <li key={m} className="text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {typeof notes?.computedAt === "string" && (
        <p className="text-muted-foreground/60">
          Last computed: {new Date(notes.computedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({
  row,
  prospectName,
  onDiscover,
  onVerify,
  discovering,
}: {
  row: ApiContactIntelligence;
  prospectName: string;
  onDiscover: (id: string) => void;
  onVerify: (id: string, status: VerificationStatus) => void;
  discovering: boolean;
}) {
  const [auditOpen, setAuditOpen] = useState(false);

  const links: Array<{ icon: React.ElementType; label: string; url: string }> = [];
  if (row.instagramUrl) links.push({ icon: Instagram, label: "Instagram", url: row.instagramUrl });
  if (row.tiktokUrl) links.push({ icon: Phone, label: "TikTok", url: row.tiktokUrl });
  if (row.linkedinUrl) links.push({ icon: Linkedin, label: "LinkedIn", url: row.linkedinUrl });
  if (row.youtubeUrl) links.push({ icon: Youtube, label: "YouTube", url: row.youtubeUrl });
  if (row.contactPageUrl) links.push({ icon: ExternalLink, label: "Contact Page", url: row.contactPageUrl });

  const nextAction = getNextAction(row);

  return (
    <Card
      className={`border transition-shadow hover:shadow-sm ${readinessBg(row.contactReadinessScore)}`}
      data-testid="contact-card"
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{prospectName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {statusBadge(row.verificationStatus)}
              <span className={`text-xs font-bold ${readinessColor(row.contactReadinessScore)}`}>
                Readiness {row.contactReadinessScore}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onDiscover(row.id)}
            disabled={discovering}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${discovering ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Contact fields */}
        <div className="space-y-1.5">
          {row.businessEmail ? (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="font-medium text-foreground truncate">{row.businessEmail}</span>
              <CopyButton value={row.businessEmail} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="italic">No email found</span>
            </div>
          )}

          {row.websiteUrl ? (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <a
                href={row.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline truncate text-xs"
              >
                {row.websiteUrl.replace(/^https?:\/\//, "").slice(0, 40)}
              </a>
            </div>
          ) : null}
        </div>

        {/* Social links */}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map(({ icon: Icon, label, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/70 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <Icon className="w-3 h-3" />
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Recommended action */}
        <div className="flex items-start gap-2 bg-white/50 rounded-lg p-2 text-xs">
          <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{nextAction}</span>
        </div>

        {/* Verify + Audit controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            {row.verificationStatus !== "verified" && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => onVerify(row.id, "verified")}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Mark Verified
              </Button>
            )}
          </div>
          <button
            onClick={() => setAuditOpen((o) => !o)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Audit {auditOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {auditOpen && <AuditPanel row={row} />}
      </CardContent>
    </Card>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  color = "text-primary",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card className="border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: Array<{ key: ContactTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "email", label: "Email Found" },
  { key: "website", label: "Website Found" },
  { key: "social", label: "Social Found" },
  { key: "missing", label: "Missing" },
  { key: "verified", label: "Verified" },
];

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "readiness", label: "Highest Contact Readiness" },
  { key: "email_first", label: "Business Email First" },
  { key: "recent", label: "Recently Updated" },
  { key: "fit_score", label: "Highest Partner Fit Score" },
];

export default function ContactIntelligence() {
  const { products, selectedProductId, setSelectedProductId } = useAppContext();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const [tab, setTab] = useState<ContactTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("readiness");
  const [discoveringIds, setDiscoveringIds] = useState<Set<string>>(new Set());

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["contact-intelligence", selectedProductId, tab],
    queryFn: () =>
      getContactIntelligence({ productId: selectedProductId ?? undefined, tab }),
    staleTime: 15_000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["contact-metrics", selectedProductId],
    queryFn: () => getContactMetrics(selectedProductId ?? undefined),
    staleTime: 15_000,
  });

  const { data: prospects = [] } = useQuery({
    queryKey: ["prospects"],
    queryFn: () => getProspects(),
    staleTime: 60_000,
  });

  const prospectMap = useMemo(
    () => new Map(prospects.map((p) => [p.id, p])),
    [prospects],
  );

  const batchMutation = useMutation({
    mutationFn: () => discoverContactsBatch(selectedProductId!),
    onSuccess: (res) => {
      toast({ title: `Discovered contacts for ${res.succeeded} creators` });
      qc.invalidateQueries({ queryKey: ["contact-intelligence"] });
      qc.invalidateQueries({ queryKey: ["contact-metrics"] });
    },
    onError: () => toast({ title: "Batch discovery failed", variant: "destructive" }),
  });

  const discoverMutation = useMutation({
    mutationFn: ({ prospectId }: { prospectId: string; cardId: string }) =>
      discoverContact(prospectId, selectedProductId ?? undefined),
    onMutate: ({ cardId }) => {
      setDiscoveringIds((s) => new Set(s).add(cardId));
    },
    onSettled: (_d, _e, { cardId }) => {
      setDiscoveringIds((s) => {
        const next = new Set(s);
        next.delete(cardId);
        return next;
      });
      qc.invalidateQueries({ queryKey: ["contact-intelligence"] });
      qc.invalidateQueries({ queryKey: ["contact-metrics"] });
    },
    onSuccess: () => toast({ title: "Contact data refreshed" }),
    onError: () => toast({ title: "Discover failed", variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VerificationStatus }) =>
      verifyContact(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-intelligence"] });
      toast({ title: "Verification status updated" });
    },
  });

  const sorted = useMemo(() => {
    const copy = [...records];
    if (sortKey === "readiness") copy.sort((a, b) => b.contactReadinessScore - a.contactReadinessScore);
    else if (sortKey === "email_first") copy.sort((a, b) => (b.businessEmail ? 1 : 0) - (a.businessEmail ? 1 : 0));
    else if (sortKey === "recent") copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return copy;
  }, [records, sortKey]);

  const exportUrl = exportContactIntelligenceCsv(selectedProductId ?? undefined);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Contact Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Find the best way to reach qualified creators.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/help/contact-intelligence">
            <Button variant="outline" size="sm" className="gap-1.5">
              <HelpCircle className="w-4 h-4" />
              How It Works
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!selectedProductId || batchMutation.isPending}
            onClick={() => batchMutation.mutate()}
          >
            <Search className={`w-4 h-4 ${batchMutation.isPending ? "animate-pulse" : ""}`} />
            {batchMutation.isPending ? "Discovering…" : "Discover All"}
          </Button>
          <a href={exportUrl} download>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Product selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Product:</span>
        <select
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
          value={selectedProductId ?? ""}
          onChange={(e) => setSelectedProductId(e.target.value || null)}
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard label="Qualified Creators" value={metrics.qualifiedCreators} icon={Users} />
          <MetricCard label="Contacts Found" value={metrics.contactsFound} icon={Search} color="text-blue-600" />
          <MetricCard label="Emails Found" value={metrics.emailsFound} icon={Mail} color="text-violet-600" />
          <MetricCard label="High Readiness" value={metrics.highReadiness} icon={CheckCircle2} color="text-emerald-600" />
          <MetricCard label="Missing Info" value={metrics.missing} icon={AlertCircle} color="text-red-500" />
        </div>
      )}

      {/* Filter tabs + sort */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cards */}
      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">Loading contact data…</div>
      )}

      {!isLoading && sorted.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-14 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Mail className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No contact data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProductId
                  ? 'Click "Discover All" to extract contacts from your qualified creators.'
                  : "Select a product and qualify some prospects first, then discover contacts here."}
              </p>
            </div>
            {selectedProductId && (
              <Button
                size="sm"
                onClick={() => batchMutation.mutate()}
                disabled={batchMutation.isPending}
              >
                <Search className="w-4 h-4 mr-2" />
                Discover All Contacts
              </Button>
            )}
            {!selectedProductId && (
              <Button variant="outline" size="sm" onClick={() => setLocation("/qualification")}>
                Go to Qualification →
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && sorted.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((row) => {
            const prospect = prospectMap.get(row.prospectId ?? "");
            return (
              <ContactCard
                key={row.id}
                row={row}
                prospectName={prospect?.name ?? "Unknown"}
                discovering={discoveringIds.has(row.id)}
                onDiscover={(cardId) => {
                  const p = prospectMap.get(row.prospectId ?? "");
                  if (p) discoverMutation.mutate({ prospectId: p.id, cardId });
                }}
                onVerify={(id, status) => verifyMutation.mutate({ id, status })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
