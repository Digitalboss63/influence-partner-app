import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";

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

export default function HelpExecutiveReporting() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-start gap-4">
        <Link href="/performance/reports">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Info className="w-6 h-6 text-primary" />
            Executive Reporting — How It Works
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Goal tracking, export, and executive-level summaries of your outreach program.
          </p>
        </div>
      </div>

      <nav className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
        <p className="font-semibold mb-2">Contents</p>
        {[
          ["#what",       "1. What Executive Reporting does"],
          ["#kpis",       "2. Understanding KPIs"],
          ["#goals",      "3. Goal tracking"],
          ["#trends",     "4. Conversion trends"],
          ["#revenue",    "5. Revenue tracking"],
          ["#export",     "6. CSV exports"],
          ["#workflow",   "7. Executive reporting workflow"],
          ["#limits",     "8. Current limitations"],
        ].map(([href, label]) => (
          <a key={href as string} href={href as string} className="block text-primary hover:underline text-xs">{label as string}</a>
        ))}
      </nav>

      <Section id="what" title="1. What Executive Reporting does">
        <p className="text-sm text-muted-foreground">
          Executive Reporting is the top-level view of your influence partner program. It combines data from all other sections — Outreach Operations, Performance Intelligence, Products, and Creators — into a single dashboard that answers the four questions that matter most:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>Are we hitting our goals?</li>
          <li>Which campaigns are performing?</li>
          <li>Which creators generate results?</li>
          <li>Are results improving over time?</li>
        </ul>
        <Callout variant="info">
          <strong>No new data is stored for the summary section.</strong> All KPIs, trends, and insights are computed live from your existing Outreach Operations and Performance data. Only goals require a DB record.
        </Callout>
      </Section>

      <Section id="kpis" title="2. Understanding KPIs">
        <p className="text-sm text-muted-foreground">The Executive Summary shows 8 KPI tiles. Each tile includes a delta indicator comparing the last 30 days to the prior 30 days:</p>
        <div className="rounded-lg border overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">KPI</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">What it measures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Operations", "Total outreach records (all statuses)"],
                ["Sent", "Operations that reached Sent or beyond; delta = last 30 days vs prior 30 days"],
                ["Replies", "Operations that reached Replied or beyond"],
                ["Conversions", "Operations with status = Converted (highlighted tile)"],
                ["Reply Rate", "Replied ÷ Sent × 100; delta = percentage point change"],
                ["Conv. Rate", "Converted ÷ Sent × 100; delta = percentage point change"],
                ["Creators", "Distinct creator names across all outreach operations"],
                ["Revenue", "Actual revenue if available; estimated otherwise"],
              ].map(([k, v]) => (
                <tr key={k as string}>
                  <td className="px-4 py-2 font-medium">{k as string}</td>
                  <td className="px-4 py-2 text-muted-foreground">{v as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Green up-arrows mean improvement; red down-arrows mean decline. Deltas only appear when there is prior-period data to compare against.
        </p>
      </Section>

      <Section id="goals" title="3. Goal tracking">
        <p className="text-sm text-muted-foreground">
          Goals let you set a target for any key metric and track progress automatically. You can create unlimited goals.
        </p>
        <div className="rounded-lg border overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Goal type</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">What is tracked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Creators Contacted", "Operations with Sent or beyond status"],
                ["Replies", "Operations with Replied or beyond status"],
                ["Interested", "Operations with Interested or beyond status"],
                ["Negotiations", "Operations with Negotiating or beyond status"],
                ["Conversions", "Operations with Converted status"],
                ["Estimated Revenue ($)", "Sum of estimated_revenue across all creator performance records"],
                ["Actual Revenue ($)", "Sum of actual_revenue across all creator performance records"],
              ].map(([k, v]) => (
                <tr key={k as string}>
                  <td className="px-4 py-2 font-medium">{k as string}</td>
                  <td className="px-4 py-2 text-muted-foreground">{v as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Goal status is computed automatically every time the page loads:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
          <li><strong>Achieved</strong> — current ≥ target</li>
          <li><strong>On Track</strong> — current ≥ 50% of target</li>
          <li><strong>Behind</strong> — current {"<"} 50% of target</li>
        </ul>
        <Callout variant="warning">
          Goal status thresholds are based on total progress, not time-adjusted progress. A conversion goal of 10 shows "On Track" at 5 conversions regardless of whether the deadline has passed. Add a start and end date (via the PATCH endpoint) if you want time-scoped tracking.
        </Callout>
      </Section>

      <Section id="trends" title="4. Conversion trends">
        <p className="text-sm text-muted-foreground">
          The trend chart shows monthly activity (Sent, Replied, Converted) across the last 6 or 12 months. Outreach operations are bucketed by their <code className="text-xs bg-muted px-1 py-0.5 rounded">created_at</code> date.
        </p>
        <p className="text-sm text-muted-foreground">
          Toggle between 6-month and 12-month views using the buttons above the chart. Months with no data appear as empty bars.
        </p>
        <Callout variant="info">
          Trend data reflects operation <em>creation</em> date, not the date an operation moved to a given status. This means a creator contacted in March but converted in May will appear in the March bucket for "Sent" and also in the March bucket for "Converted" (since the conversion status is attached to the same record).
        </Callout>
      </Section>

      <Section id="revenue" title="5. Revenue tracking">
        <p className="text-sm text-muted-foreground">
          The Revenue Summary shows two figures:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
          <li><strong>Estimated Pipeline Value</strong> — the sum of all <code className="text-xs bg-muted px-1 py-0.5 rounded">estimated_revenue</code> fields entered in Performance Intelligence.</li>
          <li><strong>Actual Revenue Earned</strong> — the sum of all <code className="text-xs bg-muted px-1 py-0.5 rounded">actual_revenue</code> fields entered in Performance Intelligence.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          To update revenue values, go to <Link href="/performance" className="text-primary hover:underline">Performance Intelligence →</Link> and use the pencil icon on any creator or product row.
        </p>
      </Section>

      <Section id="export" title="6. CSV exports">
        <p className="text-sm text-muted-foreground">Four CSV exports are available from the top toolbar:</p>
        <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
          <li><strong>Summary</strong> — All KPI metrics in a two-column (Metric, Value) format.</li>
          <li><strong>Creators</strong> — Full creator leaderboard with sent/replied/converted counts, rates, and revenue.</li>
          <li><strong>Products</strong> — Product-level conversion metrics and revenue.</li>
          <li><strong>Revenue</strong> — Consolidated revenue table: creators then products, with a totals row.</li>
        </ul>
        <Callout variant="info">
          Exports are generated client-side from the data currently loaded on the page. They respect the active product filter. If you want all-product data, clear the product filter before exporting.
        </Callout>
      </Section>

      <Section id="workflow" title="7. Executive reporting workflow">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <p><strong>Set monthly goals</strong> — create goals for creators contacted, replies, and conversions at the start of each month.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <p><strong>Work the funnel</strong> — log outreach operations as you contact creators. Move statuses as responses come in.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <p><strong>Review weekly</strong> — check the trend chart to see if activity is increasing. Check the insights panel for red-priority alerts.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
            <p><strong>Update revenue</strong> — as partnerships go live, enter actual revenue in Performance Intelligence so the Revenue Summary stays current.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
            <p><strong>Export for stakeholders</strong> — at month end, export the Executive Summary and Revenue CSV for reporting to leadership.</p>
          </div>
        </div>
      </Section>

      <Section id="limits" title="8. Current limitations">
        <Callout variant="warning">
          <ul className="space-y-1 text-sm">
            <li>✗ Goal start/end dates cannot be set from the UI (API-only via PATCH).</li>
            <li>✗ Trend data uses creation date, not status-change date.</li>
            <li>✗ No scheduled email delivery of reports.</li>
            <li>✗ No PDF export (CSV only).</li>
            <li>✗ Goal on-track threshold is 50% completion (not time-adjusted).</li>
            <li>✗ No multi-user goal visibility or comments.</li>
          </ul>
        </Callout>
      </Section>

      <div className="flex justify-between pt-4 border-t border-border">
        <Link href="/performance/reports">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Reports
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
