import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Info, BarChart2, DollarSign, TrendingUp, Star } from "lucide-react";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Callout({ variant = "info", children }: { variant?: "info" | "warning" | "success"; children: React.ReactNode }) {
  const s = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  return <div className={`rounded-lg border p-4 text-sm ${s[variant]}`}>{children}</div>;
}

export default function HelpPerformanceIntelligence() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/performance">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Info className="w-6 h-6 text-primary" />
            Performance Intelligence — How It Works
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Understand your outreach ROI, creator performance, and conversion trends.
          </p>
        </div>
      </div>

      {/* TOC */}
      <nav className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
        <p className="font-semibold mb-2">Contents</p>
        {[
          ["#what",        "1. What Performance Intelligence does"],
          ["#metrics",     "2. Understanding the metrics"],
          ["#conversion",  "3. Conversion rates explained"],
          ["#revenue",     "4. Revenue tracking"],
          ["#attribution", "5. Attribution model"],
          ["#insights",    "6. Automated insights"],
          ["#limits",      "7. Current limitations"],
        ].map(([href, label]) => (
          <a key={href as string} href={href as string} className="block text-primary hover:underline text-xs">{label as string}</a>
        ))}
      </nav>

      <Section id="what" title="1. What Performance Intelligence does">
        <p className="text-sm text-muted-foreground">
          Performance Intelligence answers the fundamental question of what's working. It aggregates data from all your Outreach Operations and surfaces patterns so you can allocate effort to the creators, channels, and products that convert.
        </p>
        <Callout variant="info">
          <strong>This is measurement, not automation.</strong> No emails are sent, no sequences run, no AI decisions are made. All analytics are computed directly from your logged outreach activity.
        </Callout>
        <p className="text-sm text-muted-foreground">
          Data updates every time you change an Outreach Operation's status. The more operations you log, the more meaningful the insights become.
        </p>
      </Section>

      <Section id="metrics" title="2. Understanding the metrics">
        <div className="rounded-lg border overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Metric</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">What it means</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Total Operations", "All outreach records, regardless of status (including drafts)"],
                ["Sent", "Operations that reached status: Sent, Replied, Interested, Negotiating, or Converted"],
                ["Reply Rate", "Replied ÷ Sent × 100. Only counts sent operations in the denominator."],
                ["Interested Rate", "Interested ÷ Replied × 100. How many replies turned into real interest."],
                ["Conversion Rate", "Converted ÷ Sent × 100. The core metric: how many sent messages turned into partnerships."],
                ["Overall Conv. Rate", "Converted ÷ Total Operations × 100. Includes drafts in the denominator."],
              ].map(([metric, desc]) => (
                <tr key={metric as string}>
                  <td className="px-4 py-2 font-medium">{metric as string}</td>
                  <td className="px-4 py-2 text-muted-foreground">{desc as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="conversion" title="3. Conversion rates explained">
        <p className="text-sm text-muted-foreground">
          Conversion rates are calculated at each stage of the funnel. Here's how to interpret them:
        </p>
        <div className="space-y-2">
          {[
            { range: "≥ 20%", label: "Excellent", color: "bg-emerald-100 text-emerald-800 border-emerald-200", note: "Your targeting and messaging are well-aligned." },
            { range: "10–19%", label: "Good", color: "bg-blue-100 text-blue-800 border-blue-200", note: "Solid performance. Room to improve follow-up strategy." },
            { range: "5–9%", label: "Average", color: "bg-amber-100 text-amber-700 border-amber-200", note: "Consider revisiting your outreach messaging or creator targeting." },
            { range: "< 5%", label: "Low", color: "bg-muted text-muted-foreground border-muted-foreground/20", note: "Targeting or messaging may need adjustment." },
          ].map(({ range, label, color, note }) => (
            <div key={label} className="flex items-start gap-3 text-sm">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold flex-shrink-0 mt-0.5 ${color}`}>{range}</span>
              <div>
                <span className="font-medium">{label}:</span>{" "}
                <span className="text-muted-foreground">{note}</span>
              </div>
            </div>
          ))}
        </div>
        <Callout variant="warning">
          Conversion rates are only meaningful once you have at least 10 sent operations. With fewer than 10, a single outlier can skew the percentages significantly.
        </Callout>
      </Section>

      <Section id="revenue" title="4. Revenue tracking">
        <p className="text-sm text-muted-foreground">
          Revenue is entered manually — there are no payment integrations or automated tracking. You can set two values for each creator and each product:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside ml-2">
          <li><strong>Estimated revenue</strong> — what you expect a partnership to generate based on commission and traffic estimates.</li>
          <li><strong>Actual revenue</strong> — what the partnership has actually generated once live.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          To enter or edit revenue, click the pencil icon next to any creator or product row. Changes are saved immediately.
        </p>
        <Callout variant="info">
          Revenue is stored separately from outreach records. You can enter estimated revenue before a creator converts, and update it to actual revenue once the partnership is live.
        </Callout>
      </Section>

      <Section id="attribution" title="5. Attribution model">
        <p className="text-sm text-muted-foreground">
          The attribution model is a simple linear funnel — each operation passes through stages and the conversion at each stage is measured:
        </p>
        <div className="flex items-center gap-2 flex-wrap text-sm font-medium">
          {["Discovery", "Qualification", "Outreach Sent", "Replied", "Interested", "Negotiating", "Converted"].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs border border-primary/20">{s}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          The funnel visualization shows the count and conversion percentage at each step. The percentage shown next to each step is relative to the previous step, not to the total.
        </p>
        <p className="text-sm text-muted-foreground">
          All outreach operations contribute to the funnel. There is currently no multi-touch attribution (the last-touch status is used for each operation).
        </p>
      </Section>

      <Section id="insights" title="6. Automated insights">
        <p className="text-sm text-muted-foreground">
          The Insights panel shows rule-based observations derived from your data. Examples:
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside ml-2">
          <li><strong>Channel insight:</strong> Which contact method produces the highest reply rate.</li>
          <li><strong>Creator insight:</strong> Which creator has the highest conversion rate.</li>
          <li><strong>Funnel insight:</strong> Where the biggest drop-off occurs.</li>
          <li><strong>Priority insight:</strong> Whether high-priority operations outperform medium-priority ones.</li>
          <li><strong>Volume insight:</strong> Whether top creators are concentrated or spread across the pipeline.</li>
        </ul>
        <Callout variant="info">
          Insights only appear when enough data is available to be statistically meaningful. With fewer than 5 sent operations, most insights will be empty.
        </Callout>
      </Section>

      <Section id="limits" title="7. Current limitations">
        <Callout variant="warning">
          <ul className="space-y-1 text-sm">
            <li>✗ No cohort analysis or time-series trends.</li>
            <li>✗ No A/B test comparison across outreach message variants.</li>
            <li>✗ Revenue is not linked to actual payment data.</li>
            <li>✗ Creator niche data is not used in performance segmentation (no niche stored in outreach_operations).</li>
            <li>✗ No export of performance data (Phase 5D).</li>
            <li>✗ Multi-touch attribution not supported — only last-touch status counts.</li>
          </ul>
        </Callout>
        <p className="text-sm text-muted-foreground">
          Phase 5D will explore: time-series charts, niche-level segmentation, and CSV export of performance reports.
        </p>
      </Section>

      <div className="flex justify-between pt-4 border-t border-border">
        <Link href="/performance">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Performance
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
