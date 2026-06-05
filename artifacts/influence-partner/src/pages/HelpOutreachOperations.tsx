import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Send,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertCircle,
  Zap,
  TrendingUp,
} from "lucide-react";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Callout({ variant = "info", children }: { variant?: "info" | "warning" | "success"; children: React.ReactNode }) {
  const s = { info: "bg-blue-50 border-blue-200 text-blue-800", warning: "bg-amber-50 border-amber-200 text-amber-800", success: "bg-emerald-50 border-emerald-200 text-emerald-800" };
  return <div className={`rounded-lg border p-4 text-sm ${s[variant]}`}>{children}</div>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{n}</div>
      <div className="space-y-1">
        <p className="font-medium text-sm">{title}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function HelpOutreachOperations() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/outreach-operations">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Info className="w-6 h-6 text-primary" />
            Outreach Operations — How It Works
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your complete guide to managing outreach activity end-to-end.
          </p>
        </div>
      </div>

      {/* TOC */}
      <nav className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
        <p className="font-semibold mb-2">Contents</p>
        {[
          ["#what", "1. What Outreach Operations does"],
          ["#statuses", "2. Understanding statuses"],
          ["#followups", "3. Managing follow-ups"],
          ["#replies", "4. Tracking replies"],
          ["#stages", "5. Moving creators through stages"],
          ["#practices", "6. Best practices"],
          ["#workflow", "7. Recommended workflow"],
          ["#roadmap", "8. Future automation roadmap"],
        ].map(([href, label]) => (
          <a key={href as string} href={href as string} className="block text-primary hover:underline text-xs">{label as string}</a>
        ))}
      </nav>

      <Section id="what" title="1. What Outreach Operations does">
        <p className="text-sm text-muted-foreground">
          Outreach Operations is the management layer for everything that happens after you generate a message. It tracks who you've contacted, when, through which channel, whether they replied, and when to follow up.
        </p>
        <Callout variant="info">
          <strong>This is not an automation tool.</strong> Outreach Operations helps you manage the human side of partner recruiting — it does not send messages, create sequences, or run on a schedule.
        </Callout>
        <p className="text-sm text-muted-foreground">
          Think of it as your outreach CRM: every creator you reach out to gets an operation record that tracks the full lifecycle from draft to converted partner.
        </p>
      </Section>

      <Section id="statuses" title="2. Understanding statuses">
        <div className="space-y-2">
          {[
            { status: "Draft",       cls: "bg-muted text-muted-foreground border-muted-foreground/30",  desc: "Message written but not yet sent. Use this to queue up outreach." },
            { status: "Ready",       cls: "bg-blue-50 text-blue-700 border-blue-200",                    desc: "Reviewed and ready to send. This is your to-do queue." },
            { status: "Sent",        cls: "bg-violet-50 text-violet-700 border-violet-200",              desc: "Message sent. Waiting for a response." },
            { status: "Replied",     cls: "bg-amber-50 text-amber-700 border-amber-200",                 desc: "Creator responded. Review and decide next step." },
            { status: "Interested",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200",           desc: "Creator expressed interest. Schedule a call or send a proposal." },
            { status: "Negotiating", cls: "bg-orange-50 text-orange-700 border-orange-200",              desc: "Deal terms being discussed. Close the partnership." },
            { status: "Converted",   cls: "bg-primary/10 text-primary border-primary/30",               desc: "Partnership confirmed. Target status updated to Active Partner." },
            { status: "Declined",    cls: "bg-red-50 text-red-600 border-red-200",                       desc: "Creator said no. Keep on record for future re-engagement." },
            { status: "Inactive",    cls: "bg-gray-50 text-gray-500 border-gray-200",                    desc: "No response after follow-ups. Move on for now." },
          ].map(({ status, cls, desc }) => (
            <div key={status} className="flex items-start gap-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium mt-0.5 flex-shrink-0 ${cls}`}>{status}</span>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <Callout variant="info">
          Status transitions are sequential — a Sent operation can only move to Replied, Declined, or Inactive. This keeps your data clean and prevents skipping steps.
        </Callout>
      </Section>

      <Section id="followups" title="3. Managing follow-ups">
        <p className="text-sm text-muted-foreground">
          The Follow-Up Queue is your daily action center. It shows three buckets:
        </p>
        <ul className="space-y-2 mt-2">
          {[
            ["Overdue", "text-red-600", "Follow-up was due in the past. Action required immediately."],
            ["Due Today", "text-amber-700", "Should follow up today. Clear this before moving on."],
            ["Due This Week", "text-muted-foreground", "Upcoming follow-ups so you can plan ahead."],
          ].map(([label, color, desc]) => (
            <li key={label as string} className="flex items-start gap-2 text-sm">
              <span className={`font-semibold ${color} flex-shrink-0`}>{label as string}:</span>
              <span className="text-muted-foreground">{desc as string}</span>
            </li>
          ))}
        </ul>
        <Callout variant="warning">
          Set a follow-up date when you mark an operation as <strong>Sent</strong> — a good rule is 3–5 business days for email, 2–3 days for DM.
        </Callout>
        <p className="text-sm text-muted-foreground">
          To set or change a follow-up date, expand any card and click <strong>Set</strong> next to "Follow-up Date". The queue updates automatically.
        </p>
      </Section>

      <Section id="replies" title="4. Tracking replies">
        <p className="text-sm text-muted-foreground">
          When a creator responds, mark the operation as <strong>Replied</strong>. This records the reply timestamp automatically and moves the operation into your reply queue.
        </p>
        <div className="space-y-3">
          <Step n={1} title="Mark as Replied">
            Click the <em>Mark Replied</em> button on the operation card. A timestamp is saved automatically.
          </Step>
          <Step n={2} title="Review the response">
            Open the card, update the Notes field with key points from their reply.
          </Step>
          <Step n={3} title="Move to Interested or Declined">
            Based on their reply, progress to Interested or mark as Declined to keep the record clean.
          </Step>
        </div>
      </Section>

      <Section id="stages" title="5. Moving creators through stages">
        <p className="text-sm text-muted-foreground">
          As a creator moves through stages, their linked <strong>Partner Target</strong> record is automatically updated:
        </p>
        <div className="rounded-lg border overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Outreach Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Target Status Updated To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Sent",        "Contacted"],
                ["Replied",     "Replied"],
                ["Interested",  "Meeting Scheduled"],
                ["Negotiating", "Negotiating"],
                ["Converted",   "Active Partner"],
                ["Declined",    "Rejected"],
              ].map(([from, to]) => (
                <tr key={from}>
                  <td className="px-4 py-2">{from}</td>
                  <td className="px-4 py-2 text-muted-foreground">{to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          This only applies when the operation was created from a target record (has a Target ID linked). Manual operations without a target link do not update targets automatically.
        </p>
      </Section>

      <Section id="practices" title="6. Best practices">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside ml-2">
          <li>Set a follow-up date every time you mark an operation <strong>Sent</strong>.</li>
          <li>Write a brief note when a creator replies — even "not interested, open later" is useful data.</li>
          <li>Use <strong>High Priority</strong> for your top 3 targets this week and <strong>Low</strong> for warm-up creators.</li>
          <li>Check the Follow-Up Queue every morning as your first task.</li>
          <li>Mark <strong>Inactive</strong> (not Declined) when there's no response after 2 follow-ups — you may re-engage later.</li>
          <li>Generate your message in the Outreach Generator first, then save it as an operation with <em>Create Operation</em>.</li>
        </ul>
      </Section>

      <Section id="workflow" title="7. Recommended workflow">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap text-sm font-medium">
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-200">Generate (Outreach Generator)</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs border">Save as Draft (Operations)</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-200">Mark Ready</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded text-xs border border-violet-200">Send + Set Follow-up</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-sm font-medium">
            <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded text-xs border border-violet-200">Sent</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs border border-amber-200">Replied</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs border border-emerald-200">Interested</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs border border-orange-200">Negotiating</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs border border-primary/30">Converted</span>
          </div>
        </div>
      </Section>

      <Section id="roadmap" title="8. Future automation roadmap">
        <Callout variant="warning">
          <ul className="space-y-1 text-sm">
            <li>✗ This version does not send emails or DMs automatically.</li>
            <li>✗ No follow-up sequence automation.</li>
            <li>✗ No AI reply analysis or response scoring.</li>
            <li>✗ No calendar integration for follow-up scheduling.</li>
          </ul>
        </Callout>
        <p className="text-sm text-muted-foreground">
          Phase 5C will explore: Gmail integration for outreach copy-to-clipboard with open tracking, calendar sync for follow-up scheduling, and bulk status updates from pipeline movements.
        </p>
      </Section>

      {/* Footer */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Link href="/outreach-operations">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Outreach Operations
          </Button>
        </Link>
        <Link href="/pipeline">
          <Button variant="outline" size="sm" className="gap-1.5">
            Go to Pipeline
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
