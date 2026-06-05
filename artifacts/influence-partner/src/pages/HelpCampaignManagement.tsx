import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Megaphone, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-6">
      <h2 className="text-lg font-semibold border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-medium w-36 flex-shrink-0">{k}</span>
      <span className="text-muted-foreground">{v}</span>
    </div>
  );
}

export default function HelpCampaignManagement() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <Link href="/campaigns">
          <Button variant="outline" size="sm" className="gap-1.5 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Megaphone className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Campaign Management — How It Works</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Organise discovery, outreach, and results into trackable campaigns.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Contents
        </p>
        {[
          ["what-campaigns", "1. What campaigns are"],
          ["workflow", "2. The campaign workflow"],
          ["creating", "3. Creating a campaign"],
          ["assigning", "4. Assigning creators"],
          ["deliverables", "5. Tracking deliverables"],
          ["budget", "6. Budget tracking"],
          ["success", "7. Measuring success"],
          ["limits", "8. Current limitations"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="block text-sm text-primary hover:underline"
          >
            {label}
          </a>
        ))}
      </nav>

      <Section id="what-campaigns" title="1. What campaigns are">
        <p className="text-sm text-muted-foreground">
          A campaign is an orchestration layer over your existing workflow. Rather
          than tracking individual creator conversations in isolation, a campaign
          groups them under a shared name, product, objective, and budget — giving
          you a single place to answer:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
          <li>Are we on track to hit our creator target?</li>
          <li>How much of our budget is committed vs spent?</li>
          <li>Which creators are contracted, negotiating, or gone cold?</li>
          <li>What deliverables have we agreed to?</li>
        </ul>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <strong>Campaigns don't replace other sections.</strong> Discovery,
          Qualification, Outreach Operations, and Performance Intelligence all
          continue to work independently. Campaigns read data from those sections
          and surface it in one place.
        </div>
      </Section>

      <Section id="workflow" title="2. The campaign workflow">
        <p className="text-sm text-muted-foreground">
          Campaigns sit at the top of the workflow. Start here for new initiatives
          and use the existing tools for each step:
        </p>
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm font-mono space-y-1">
          {[
            "Campaign (start here)",
            "↓ Discovery / YouTube Discovery",
            "↓ Qualification",
            "↓ Contact Intelligence",
            "↓ Targets",
            "↓ Outreach / Outreach Operations",
            "↓ Pipeline",
            "↓ Performance Intelligence",
            "↓ Executive Reports",
          ].map((line, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "font-bold text-primary"
                  : "text-muted-foreground pl-4"
              }
            >
              {line}
            </p>
          ))}
        </div>
      </Section>

      <Section id="creating" title="3. Creating a campaign">
        <p className="text-sm text-muted-foreground">
          Click <strong>New Campaign</strong> on the Campaigns page and fill in:
        </p>
        <div className="space-y-2 border border-border rounded-lg p-3">
          <KV k="Campaign Name" v="Short, memorable label. e.g. 'Q3 Creator Push'" />
          <KV k="Objective" v="One sentence: what success looks like. Required." />
          <KV k="Product" v="Optional link to a product from your Products page." />
          <KV k="Budget ($)" v="Total planned spend. Used for budget tracking." />
          <KV k="Target Creators" v="How many creators you want to contract." />
          <KV k="Start / End Date" v="Optional campaign window." />
          <KV k="Description" v="Optional strategic notes visible in the Notes section." />
        </div>
        <p className="text-sm text-muted-foreground">
          Status defaults to <strong>Planning</strong>. Change it to{" "}
          <strong>Active</strong> when outreach begins, and to{" "}
          <strong>Completed</strong> when contracts are signed.
        </p>
      </Section>

      <Section id="assigning" title="4. Assigning creators">
        <p className="text-sm text-muted-foreground">
          Open a campaign and click <strong>Assign Creator</strong>. For each
          creator you can:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
          <li>
            Type a name directly, or link to an existing <strong>Target</strong>{" "}
            from your Targets page (auto-fills the name).
          </li>
          <li>Set an assignment status (Identified → Contracted → Completed).</li>
          <li>Tick deliverables (Video, Short, Post, Story, Review, Custom).</li>
          <li>Set an estimated deal value.</li>
          <li>Add notes about this specific assignment.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Once assigned, you can update the status and actual value inline using
          the pencil icon. The assigned creator count on the campaign card syncs
          automatically.
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs w-full border border-border rounded-lg">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
                <th className="text-left px-3 py-2 font-semibold">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Identified", "Found as a potential fit — not yet contacted"],
                ["Contacted", "First outreach sent"],
                ["Interested", "Replied and showed positive interest"],
                ["Negotiating", "Active deal discussion in progress"],
                ["Contracted", "Agreement signed or confirmed"],
                ["Completed", "All deliverables fulfilled"],
                ["Declined", "Creator passed — excluded from counts"],
              ].map(([s, m]) => (
                <tr key={s}>
                  <td className="px-3 py-2 font-medium">{s}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="deliverables" title="5. Tracking deliverables">
        <p className="text-sm text-muted-foreground">
          Deliverables are set per creator when assigning them. The Deliverables
          section on the campaign detail page shows a summary: each type and how
          many creators are contracted for it.
        </p>
        <div className="space-y-1">
          {[
            ["Video", "Long-form YouTube or platform video"],
            ["Short", "YouTube Shorts, Reels, TikTok"],
            ["Post", "Static feed post (Instagram, LinkedIn)"],
            ["Story", "24-hour story format"],
            ["Review", "Dedicated product review (any format)"],
            ["Custom", "Anything else agreed with the creator"],
          ].map(([type, desc]) => (
            <div key={type} className="flex gap-2 text-sm">
              <code className="text-xs bg-muted px-2 py-0.5 rounded w-16 text-center flex-shrink-0">
                {type}
              </code>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="budget" title="6. Budget tracking">
        <p className="text-sm text-muted-foreground">
          The Budget Tracking section on the campaign detail page shows three
          numbers:
        </p>
        <div className="space-y-2 border border-border rounded-lg p-3">
          <KV k="Planned" v="The total budget set when creating the campaign." />
          <KV
            k="Committed"
            v="Sum of estimated values for all non-declined creators."
          />
          <KV
            k="Actual Spent"
            v="Sum of actual values entered per creator (update with the pencil icon)."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Progress bars show committed and actual as a percentage of the planned
          budget. Use <strong>Committed</strong> to forecast spend before deals
          close, and <strong>Actual</strong> once payments are confirmed.
        </p>
      </Section>

      <Section id="success" title="7. Measuring success">
        <p className="text-sm text-muted-foreground">
          The Performance Summary section rolls up data from across the app:
        </p>
        <div className="space-y-2 border border-border rounded-lg p-3">
          <KV
            k="Outreach Status"
            v="Sent / Replied / Interested / Negotiating / Converted — pulled from Outreach Operations for creators in this campaign."
          />
          <KV
            k="Creators Assigned"
            v="Current count vs your target, with a progress bar."
          />
          <KV
            k="Contracted / Completed"
            v="Creators who have reached contracted or completed assignment status."
          />
          <KV
            k="Revenue"
            v="Actual revenue from Performance Intelligence for creator names in this campaign."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          For deeper analysis, use the{" "}
          <Link href="/performance/reports" className="text-primary hover:underline">
            Executive Reports →
          </Link>{" "}
          page which aggregates across all campaigns.
        </p>
      </Section>

      <Section id="assigning" title="8. Assigning creators">
        <p className="text-sm text-muted-foreground">
          Click <strong>+ Assign Creator</strong> on any campaign to open the assignment
          dialog, or use <strong>Bulk Assign</strong> to add multiple targets at once.
        </p>
        <div className="space-y-2 border border-border rounded-lg p-3">
          <KV
            k="Eligible Targets picker"
            v="The dialog searches your Partner Targets, excluding anyone already on the campaign. Shows Partner Fit Score and Contact Readiness Score alongside each name."
          />
          <KV
            k="Deliverable Type"
            v="Set the primary content format: Video, Short, Post, Story, Review, or Custom. Shown as a badge on each creator row."
          />
          <KV
            k="Due Date"
            v="Optional date when the deliverable is expected. Displayed with a clock icon below the creator name."
          />
          <KV
            k="Deliverables"
            v="Tag any additional content formats expected from this creator (checkboxes)."
          />
          <KV
            k="Add to Campaign from Targets"
            v="Each Target card has a Campaign button — click it to assign that target directly to any active campaign without going to the campaign page."
          />
        </div>
      </Section>

      <Section id="statuses" title="9. Assignment statuses">
        <p className="text-sm text-muted-foreground">
          Each creator moves through statuses that track the deal lifecycle:
        </p>
        <div className="space-y-2 border border-border rounded-lg p-3">
          <KV k="Identified" v="Added to the campaign, not yet contacted." />
          <KV k="Contacted" v="Initial outreach sent." />
          <KV k="Interested" v="Creator responded positively." />
          <KV k="Negotiating" v="Terms being discussed." />
          <KV k="Contracted" v="Deal signed." />
          <KV k="Completed" v="All deliverables delivered." />
          <KV k="Declined" v="Creator passed — excluded from creator count." />
        </div>
        <p className="text-sm text-muted-foreground">
          Click the pencil icon on any creator row to update status, deliverable type,
          due date, actual value, or notes.
        </p>
      </Section>

      <Section id="value" title="10. Value tracking">
        <p className="text-sm text-muted-foreground">
          Each creator row tracks two values:
        </p>
        <div className="space-y-2 border border-border rounded-lg p-3">
          <KV k="Estimated Value" v="Set when assigning — used for budget committed." />
          <KV k="Actual Value" v="Updated after delivery — used for budget spent." />
        </div>
        <p className="text-sm text-muted-foreground">
          To remove a creator from a campaign, click the trash icon on their row.
          This updates the assigned creator count automatically.
        </p>
      </Section>

      <Section id="limits" title="11. Current limitations">
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
          <li>
            Outreach rollup matches by creator <em>name</em> — if the same person
            is tracked under different spellings, they won't be linked automatically.
          </li>
          <li>
            Revenue rollup reads from Performance Intelligence{" "}
            <code className="text-xs bg-muted px-1 rounded">actual_revenue</code>{" "}
            — requires values to be entered there first.
          </li>
          <li>Campaigns cannot be linked to specific pipeline stages directly.</li>
        </ul>
      </Section>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Link href="/campaigns">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Campaigns
          </Button>
        </Link>
        <Link href="/performance">
          <Button variant="outline" size="sm" className="gap-1.5">
            Performance
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
