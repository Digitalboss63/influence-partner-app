import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Send,
  MessageSquare,
  Mail,
  Linkedin,
  Globe,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Edit3,
  Trash2,
  Zap,
  Users,
  TrendingUp,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import {
  getOutreachOperations,
  getOutreachMetrics,
  createOutreachOperation,
  updateOutreachOperation,
  deleteOutreachOperation,
  type ApiOutreachOperation,
  type OutreachStatus,
  type OutreachPriority,
  type OutreachContactMethod,
} from "@/lib/api-client";

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_STATUSES: OutreachStatus[] = [
  "draft", "ready", "sent", "replied",
  "interested", "negotiating", "converted", "declined",
];

const STATUS_META: Record<OutreachStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:       { label: "Draft",       color: "text-muted-foreground", bg: "bg-muted",        border: "border-muted-foreground/30" },
  ready:       { label: "Ready",       color: "text-blue-700",         bg: "bg-blue-50",      border: "border-blue-200" },
  sent:        { label: "Sent",        color: "text-violet-700",       bg: "bg-violet-50",    border: "border-violet-200" },
  replied:     { label: "Replied",     color: "text-amber-700",        bg: "bg-amber-50",     border: "border-amber-200" },
  interested:  { label: "Interested",  color: "text-emerald-700",      bg: "bg-emerald-50",   border: "border-emerald-200" },
  negotiating: { label: "Negotiating", color: "text-orange-700",       bg: "bg-orange-50",    border: "border-orange-200" },
  converted:   { label: "Converted",   color: "text-primary",          bg: "bg-primary/10",   border: "border-primary/30" },
  declined:    { label: "Declined",    color: "text-red-600",          bg: "bg-red-50",       border: "border-red-200" },
  inactive:    { label: "Inactive",    color: "text-gray-500",         bg: "bg-gray-50",      border: "border-gray-200" },
};

const PRIORITY_META: Record<OutreachPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-amber-600" },
  high:   { label: "High",   color: "text-red-600" },
};

const METHOD_ICONS: Record<OutreachContactMethod, React.ElementType> = {
  "Email":                Mail,
  "Instagram DM":         MessageSquare,
  "TikTok DM":            Phone,
  "LinkedIn":             Linkedin,
  "Website Contact Form": Globe,
};

const CONTACT_METHODS: OutreachContactMethod[] = [
  "Email", "Instagram DM", "TikTok DM", "LinkedIn", "Website Contact Form",
];

type FilterTab = "all" | OutreachStatus;
type SortKey = "recent" | "followup" | "priority";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString();
}

function dueDateLabel(iso: string | null): { text: string; urgent: boolean } {
  if (!iso) return { text: "—", urgent: false };
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (diff < 0) return { text: `${Math.abs(days)}d overdue`, urgent: true };
  if (days === 0) return { text: "Due today", urgent: true };
  if (days === 1) return { text: "Due tomorrow", urgent: false };
  if (days < 7) return { text: `Due in ${days}d`, urgent: false };
  return { text: d.toLocaleDateString(), urgent: false };
}

function StatusBadge({ status }: { status: OutreachStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${m.bg} ${m.color} ${m.border}`}>
      {m.label}
    </span>
  );
}

// ─── Create Operation Dialog ──────────────────────────────────────────────────

function CreateOperationForm({
  productId,
  onCreated,
  onCancel,
  prefill,
}: {
  productId: string | null;
  onCreated: () => void;
  onCancel: () => void;
  prefill?: Partial<{
    creatorName: string;
    contactMethod: OutreachContactMethod;
    outreachMessage: string;
    outreachSubject: string;
    contactDestination: string;
  }>;
}) {
  const [creatorName, setCreatorName] = useState(prefill?.creatorName ?? "");
  const [contactMethod, setContactMethod] = useState<OutreachContactMethod>(
    prefill?.contactMethod ?? "Email",
  );
  const [contactDest, setContactDest] = useState(prefill?.contactDestination ?? "");
  const [subject, setSubject] = useState(prefill?.outreachSubject ?? "");
  const [message, setMessage] = useState(prefill?.outreachMessage ?? "");
  const [priority, setPriority] = useState<OutreachPriority>("medium");
  const [followUp, setFollowUp] = useState("");
  const [notes, setNotes] = useState("");

  const { products } = useAppContext();
  const [selProductId, setSelProductId] = useState(productId ?? "");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createOutreachOperation({
        creatorName,
        contactMethod,
        contactDestination: contactDest || undefined,
        outreachSubject: subject || undefined,
        outreachMessage: message || undefined,
        priority,
        productId: selProductId || undefined,
        followUpDue: followUp || undefined,
        notes: notes || undefined,
        outreachStatus: "draft",
      }),
    onSuccess: () => {
      toast({ title: "Outreach operation created" });
      qc.invalidateQueries({ queryKey: ["outreach-operations"] });
      qc.invalidateQueries({ queryKey: ["outreach-metrics"] });
      onCreated();
    },
    onError: (e) => toast({ title: String(e), variant: "destructive" }),
  });

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          New Outreach Operation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Creator Name *</label>
            <input
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g. Elena Fit"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Contact Method *</label>
            <select
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value as OutreachContactMethod)}
            >
              {CONTACT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Contact Destination</label>
            <input
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              value={contactDest}
              onChange={(e) => setContactDest(e.target.value)}
              placeholder="email@example.com or @handle"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Product</label>
            <select
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              value={selProductId}
              onChange={(e) => setSelProductId(e.target.value)}
            >
              <option value="">No product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1">Subject Line</label>
          <input
            className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Partnership opportunity for..."
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Paste or write your outreach message..."
            className="text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Priority</label>
            <select
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              value={priority}
              onChange={(e) => setPriority(e.target.value as OutreachPriority)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Follow-up Due</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Notes</label>
            <input
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes..."
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!creatorName || mutation.isPending}
          >
            {mutation.isPending ? "Creating…" : "Create Draft"}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Edit Notes inline ────────────────────────────────────────────────────────

function NotesEditor({
  id,
  initialNotes,
  onClose,
}: {
  id: string;
  initialNotes: string | null;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => updateOutreachOperation(id, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-operations"] });
      toast({ title: "Notes saved" });
      onClose();
    },
  });

  return (
    <div className="mt-2 space-y-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="text-sm"
        placeholder="Add notes..."
      />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Save</Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Follow-up Date picker ────────────────────────────────────────────────────

function FollowUpPicker({
  id,
  current,
  onClose,
}: {
  id: string;
  current: string | null;
  onClose: () => void;
}) {
  const [date, setDate] = useState(current ? current.slice(0, 10) : "");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      updateOutreachOperation(id, { followUpDue: date || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-operations"] });
      qc.invalidateQueries({ queryKey: ["outreach-metrics"] });
      toast({ title: "Follow-up date set" });
      onClose();
    },
  });

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="date"
        className="border rounded-md px-2 py-1 text-sm bg-background"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Set</Button>
      <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
    </div>
  );
}

// ─── Outreach Card ────────────────────────────────────────────────────────────

function OutreachCard({
  op,
  onStatusChange,
  onDelete,
}: {
  op: ApiOutreachOperation;
  onStatusChange: (id: string, status: OutreachStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(false);

  const MethodIcon = METHOD_ICONS[op.contactMethod] ?? Mail;
  const { text: dueText, urgent: dueUrgent } = dueDateLabel(op.followUpDue);
  const priorityMeta = PRIORITY_META[op.priority];

  const nextStatuses: OutreachStatus[] = {
    draft:       ["ready", "sent", "declined"],
    ready:       ["sent", "declined"],
    sent:        ["replied", "declined", "inactive"],
    replied:     ["interested", "declined"],
    interested:  ["negotiating", "declined"],
    negotiating: ["converted", "declined"],
    converted:   [],
    declined:    [],
    inactive:    ["sent"],
  }[op.outreachStatus] as OutreachStatus[];

  const ACTION_LABELS: Partial<Record<OutreachStatus, string>> = {
    ready: "Mark Ready",
    sent: "Mark Sent",
    replied: "Mark Replied",
    interested: "Mark Interested",
    negotiating: "Mark Negotiating",
    converted: "Mark Converted",
    declined: "Mark Declined",
  };

  return (
    <Card className="border transition-shadow hover:shadow-sm" data-testid="outreach-card">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{op.creatorName}</span>
              <StatusBadge status={op.outreachStatus} />
              {op.priority !== "medium" && (
                <span className={`text-xs font-medium ${priorityMeta.color}`}>
                  {priorityMeta.label} Priority
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <MethodIcon className="w-3 h-3 flex-shrink-0" />
              <span>{op.contactMethod}</span>
              {op.contactDestination && (
                <span className="font-mono truncate max-w-[160px]">{op.contactDestination}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded((o) => !o)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Activity row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {relativeDate(op.lastActivityAt ?? op.updatedAt)}
          </span>
          {op.followUpDue && (
            <span className={`flex items-center gap-1 ${dueUrgent ? "text-red-600 font-medium" : ""}`}>
              <Calendar className="w-3 h-3" />
              {dueText}
            </span>
          )}
          {op.sentAt && (
            <span className="flex items-center gap-1">
              <Send className="w-3 h-3" />
              Sent {relativeDate(op.sentAt)}
            </span>
          )}
          {op.repliedAt && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              Replied {relativeDate(op.repliedAt)}
            </span>
          )}
        </div>

        {/* Notes preview */}
        {op.notes && !editingNotes && (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5 line-clamp-2">
            {op.notes}
          </p>
        )}

        {/* Status action buttons */}
        {nextStatuses.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "declined" ? "outline" : "default"}
                className={`h-7 text-xs ${s === "declined" ? "text-red-600 border-red-200 hover:bg-red-50" : ""}`}
                onClick={() => onStatusChange(op.id, s)}
              >
                {ACTION_LABELS[s] ?? s}
              </Button>
            ))}
          </div>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="pt-2 border-t border-border space-y-3">
            {op.outreachSubject && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                <p className="text-sm">{op.outreachSubject}</p>
              </div>
            )}
            {op.outreachMessage && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                  {op.outreachMessage}
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                {!editingNotes && (
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={() => setEditingNotes(true)}
                  >
                    <Edit3 className="w-3 h-3" />
                    {op.notes ? "Edit" : "Add"}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <NotesEditor
                  id={op.id}
                  initialNotes={op.notes}
                  onClose={() => setEditingNotes(false)}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {op.notes ?? <em>No notes</em>}
                </p>
              )}
            </div>

            {/* Follow-up */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">Follow-up Date</p>
                {!editingFollowUp && (
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={() => setEditingFollowUp(true)}
                  >
                    <Calendar className="w-3 h-3" />
                    {op.followUpDue ? "Change" : "Set"}
                  </button>
                )}
              </div>
              {editingFollowUp ? (
                <FollowUpPicker
                  id={op.id}
                  current={op.followUpDue}
                  onClose={() => setEditingFollowUp(false)}
                />
              ) : (
                <p className={`text-xs ${dueUrgent ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                  {dueText}
                </p>
              )}
            </div>

            {/* Delete */}
            <div className="flex justify-end pt-1">
              <button
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                onClick={() => onDelete(op.id)}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Metric tile ──────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  sub,
  color = "text-foreground",
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors min-w-[80px]"
    >
      <span className={`text-2xl font-bold ${value > 0 ? color : "text-muted-foreground/30"}`}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      {sub && <span className="text-xs text-muted-foreground/60">{sub}</span>}
    </button>
  );
}

// ─── Follow-up Queue ──────────────────────────────────────────────────────────

function FollowUpQueue({ ops }: { ops: ApiOutreachOperation[] }) {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const overdueOps = ops.filter(
    (o) =>
      o.followUpDue &&
      new Date(o.followUpDue) < now &&
      !["converted", "declined", "inactive"].includes(o.outreachStatus),
  );

  const todayOps = ops.filter(
    (o) =>
      o.followUpDue &&
      new Date(o.followUpDue) >= now &&
      new Date(o.followUpDue) <= todayEnd &&
      !["converted", "declined", "inactive"].includes(o.outreachStatus),
  );

  const weekOps = ops.filter(
    (o) =>
      o.followUpDue &&
      new Date(o.followUpDue) > todayEnd &&
      new Date(o.followUpDue) <= weekEnd &&
      !["converted", "declined", "inactive"].includes(o.outreachStatus),
  );

  if (overdueOps.length + todayOps.length + weekOps.length === 0) return null;

  function QueueItem({ op }: { op: ApiOutreachOperation }) {
    const { text, urgent } = dueDateLabel(op.followUpDue);
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
        <div>
          <span className="text-sm font-medium">{op.creatorName}</span>
          <span className="text-xs text-muted-foreground ml-2">{op.contactMethod}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={op.outreachStatus} />
          <span className={`text-xs font-medium ${urgent ? "text-red-600" : "text-muted-foreground"}`}>
            {text}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50" data-testid="follow-up-queue">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          Follow-Up Queue
          <span className="text-xs font-normal text-muted-foreground ml-1">Your daily action center</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {overdueOps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Overdue ({overdueOps.length})
            </p>
            {overdueOps.map((op) => <QueueItem key={op.id} op={op} />)}
          </div>
        )}
        {todayOps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due Today ({todayOps.length})
            </p>
            {todayOps.map((op) => <QueueItem key={op.id} op={op} />)}
          </div>
        )}
        {weekOps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due This Week ({weekOps.length})
            </p>
            {weekOps.map((op) => <QueueItem key={op.id} op={op} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "all",        label: "All" },
  { key: "draft",      label: "Draft" },
  { key: "ready",      label: "Ready" },
  { key: "sent",       label: "Sent" },
  { key: "replied",    label: "Replied" },
  { key: "interested", label: "Interested" },
  { key: "negotiating",label: "Negotiating" },
  { key: "converted",  label: "Converted" },
  { key: "declined",   label: "Declined" },
];

export default function OutreachOperations() {
  const { products, selectedProductId, setSelectedProductId } = useAppContext();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const [tab, setTab] = useState<FilterTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [showCreate, setShowCreate] = useState(false);

  const { data: ops = [], isLoading } = useQuery({
    queryKey: ["outreach-operations", selectedProductId, tab],
    queryFn: () =>
      getOutreachOperations({
        productId: selectedProductId ?? undefined,
        status: tab === "all" ? undefined : tab,
      }),
    staleTime: 15_000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["outreach-metrics", selectedProductId],
    queryFn: () => getOutreachMetrics(selectedProductId ?? undefined),
    staleTime: 15_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OutreachStatus }) =>
      updateOutreachOperation(id, { outreachStatus: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-operations"] });
      qc.invalidateQueries({ queryKey: ["outreach-metrics"] });
    },
    onError: (e) => toast({ title: String(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOutreachOperation(id),
    onSuccess: () => {
      toast({ title: "Operation deleted" });
      qc.invalidateQueries({ queryKey: ["outreach-operations"] });
      qc.invalidateQueries({ queryKey: ["outreach-metrics"] });
    },
    onError: (e) => toast({ title: String(e), variant: "destructive" }),
  });

  const sorted = useMemo(() => {
    const copy = [...ops];
    if (sortKey === "recent") {
      copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortKey === "followup") {
      copy.sort((a, b) => {
        if (!a.followUpDue) return 1;
        if (!b.followUpDue) return -1;
        return new Date(a.followUpDue).getTime() - new Date(b.followUpDue).getTime();
      });
    } else if (sortKey === "priority") {
      const order: Record<OutreachPriority, number> = { high: 0, medium: 1, low: 2 };
      copy.sort((a, b) => order[a.priority] - order[b.priority]);
    }
    return copy;
  }, [ops, sortKey]);

  const allOps = useQuery({
    queryKey: ["outreach-operations-all", selectedProductId],
    queryFn: () => getOutreachOperations({ productId: selectedProductId ?? undefined }),
    staleTime: 15_000,
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Outreach Operations</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track outreach activity, follow-ups, responses, and partnership progress.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/help/outreach-operations">
            <Button variant="outline" size="sm" className="gap-1.5">
              <HelpCircle className="w-4 h-4" />
              How It Works
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowCreate((o) => !o)}
          >
            <Plus className="w-4 h-4" />
            New Operation
          </Button>
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
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateOperationForm
          productId={selectedProductId}
          onCreated={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Metrics row */}
      {metrics && (
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "drafts",      label: "Drafts",       value: metrics.drafts,       color: "text-muted-foreground",  status: "draft" as FilterTab },
            { key: "ready",       label: "Ready",        value: metrics.ready,        color: "text-blue-700",          status: "ready" as FilterTab },
            { key: "sent",        label: "Sent",         value: metrics.sent,         color: "text-violet-700",        status: "sent" as FilterTab },
            { key: "replied",     label: "Replied",      value: metrics.replied,      color: "text-amber-700",         status: "replied" as FilterTab },
            { key: "interested",  label: "Interested",   value: metrics.interested,   color: "text-emerald-700",       status: "interested" as FilterTab },
            { key: "negotiating", label: "Negotiating",  value: metrics.negotiating,  color: "text-orange-700",        status: "negotiating" as FilterTab },
            { key: "converted",   label: "Converted",    value: metrics.converted,    color: "text-primary",           status: "converted" as FilterTab },
          ].map(({ key, label, value, color, status }) => (
            <MetricTile
              key={key}
              label={label}
              value={value}
              color={color}
              onClick={() => setTab(status)}
            />
          ))}
          {metrics.followUp.overdue > 0 && (
            <MetricTile
              label="Overdue"
              value={metrics.followUp.overdue}
              color="text-red-600"
            />
          )}
        </div>
      )}

      {/* Follow-up Queue */}
      {allOps.data && <FollowUpQueue ops={allOps.data} />}

      {/* Filter tabs + sort */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map((t) => (
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
          <option value="recent">Most Recent</option>
          <option value="followup">Follow-up Due</option>
          <option value="priority">Highest Priority</option>
        </select>
      </div>

      {/* Cards */}
      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">Loading outreach operations…</div>
      )}

      {!isLoading && sorted.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-14 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Send className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No outreach operations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create an operation manually, or generate outreach copy from the Outreach Generator and save it as a draft.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Create Operation
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation("/outreach")}>
                Outreach Generator →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && sorted.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((op) => (
            <OutreachCard
              key={op.id}
              op={op}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
