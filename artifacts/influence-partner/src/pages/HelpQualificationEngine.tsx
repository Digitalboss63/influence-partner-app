import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  Target,
  Users,
  Shield,
  Handshake,
  Activity,
  FileText,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Youtube,
  ArrowRight,
  Zap,
} from "lucide-react";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Callout({
  variant = "info",
  children,
}: {
  variant?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  return (
    <div className={`rounded-lg border p-4 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}

// ─── Label badge ──────────────────────────────────────────────────────────────

function LabelBadge({ label }: { label: string }) {
  const styles: Record<string, string> = {
    "Ready to Pitch": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Promising": "bg-blue-100 text-blue-800 border-blue-200",
    "Needs Review": "bg-amber-100 text-amber-800 border-amber-200",
    "Not Qualified": "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${styles[label] ?? ""}`}>
      {label}
    </span>
  );
}

// ─── Pillar card ──────────────────────────────────────────────────────────────

function PillarCard({
  icon: Icon,
  name,
  weight,
  description,
  example,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  weight: string;
  description: string;
  example: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{weight} of final score</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-xs bg-muted/40 rounded px-2 py-1.5 italic text-muted-foreground">
        Example: {example}
      </p>
    </div>
  );
}

// ─── Workflow step ────────────────────────────────────────────────────────────

function WorkflowStep({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
        {step}
      </div>
      <div className="pb-4 border-l border-border pl-4 -ml-3.5 pt-0.5">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpQualificationEngine() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/qualification" className="hover:text-foreground transition-colors">Qualification Engine</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Help</span>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          Partner Qualification Engine — Help &amp; Guide
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          Everything you need to understand scores, take action, and move the right creators into your outreach pipeline.
        </p>
        <Link href="/qualification">
          <Button className="mt-4 gap-2">
            <Zap className="w-4 h-4" />
            Go to Qualification Engine
          </Button>
        </Link>
      </div>

      {/* Table of contents */}
      <div className="bg-muted/40 rounded-xl p-5">
        <p className="text-sm font-semibold mb-3">On this page</p>
        <ul className="space-y-1 text-sm text-primary">
          {[
            ["#what", "1. What is the Qualification Engine?"],
            ["#how-scores-work", "2. How the Partner Fit Score works"],
            ["#audience-match", "3. Audience Match"],
            ["#brand-safety", "4. Brand Safety"],
            ["#partnership-readiness", "5. Partnership Readiness"],
            ["#response-probability", "6. Response Probability"],
            ["#content-relevance", "7. Content Relevance"],
            ["#labels", "8. What the labels mean"],
            ["#workflow", "9. How to use the workflow"],
            ["#wrong-score", "10. When a score looks wrong"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* 1. What is it */}
      <Section id="what" title="1. What is the Qualification Engine?">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Qualification Engine reviews the YouTube channels you've added to your Discovery Workspace and
          gives each one a <strong>Partner Fit Score</strong> — a number from 0 to 100 that tells you how well
          that creator matches your product and how likely they are to become a successful partner.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Instead of guessing which creators to contact, you can sort by score, read the plain-English explanation
          for each one, and move the best matches directly to Targets — all in one place.
        </p>
        <Callout variant="success">
          <strong>First-time user tip:</strong> Start by running a YouTube Discovery search, then come back here.
          Click "Qualify All" to score every prospect at once — it only takes a few seconds.
        </Callout>
      </Section>

      {/* 2. How scores work */}
      <Section id="how-scores-work" title="2. How the Partner Fit Score works">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Partner Fit Score is built from five pillars. Each pillar looks at a different aspect
          of whether this creator is right for your product. The pillars are combined into a
          single score from 0 to 100.
        </p>
        <div className="rounded-lg border bg-card p-4 text-sm">
          <div className="space-y-2">
            {[
              { name: "Audience Match", weight: "25%", color: "bg-violet-500" },
              { name: "Brand Safety", weight: "20%", color: "bg-green-500" },
              { name: "Partnership Readiness", weight: "20%", color: "bg-blue-500" },
              { name: "Response Probability", weight: "20%", color: "bg-amber-500" },
              { name: "Content Relevance", weight: "15%", color: "bg-rose-500" },
            ].map(({ name, weight, color }) => (
              <div key={name} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                <div className="flex-1 flex items-center justify-between">
                  <span>{name}</span>
                  <span className="font-semibold">{weight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Scoring is rule-based — no AI black box. Every point is explained in the "Why This Score" panel on each card.
        </p>
      </Section>

      {/* 3–7. Pillars */}
      <Section id="audience-match" title="3. Audience Match (25%)">
        <PillarCard
          icon={Users}
          name="Audience Match"
          weight="25%"
          description="Measures how closely this creator's audience aligns with the customers your product is trying to reach. It looks at subscriber count, platform fit, and whether the channel's content contains terms relevant to your product category."
          example="A Finance product gains a high Audience Match score from a 'Personal Finance Tips' YouTube channel with 80k subscribers — the audience actively seeks financial tools."
          color="bg-violet-100 text-violet-700"
        />
        <SubSection title="What raises it">
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Subscriber count in the 10k–200k sweet spot (most engaged for affiliate deals)</li>
            <li>YouTube platform (highest conversion for SaaS/D2C products)</li>
            <li>Channel name or description contains product-relevant keywords</li>
            <li>Creator category matches your product vertical</li>
          </ul>
        </SubSection>
        <SubSection title="What lowers it">
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Very large channels (&gt;1M) — audience breadth reduces specificity</li>
            <li>No keyword overlap with product category</li>
            <li>Unknown subscriber count (scored conservatively)</li>
          </ul>
        </SubSection>
      </Section>

      <Section id="brand-safety" title="4. Brand Safety (20%)">
        <PillarCard
          icon={Shield}
          name="Brand Safety"
          weight="20%"
          description="Checks whether this creator appears safe for your brand to partner with. It scans for keywords and signals that could create brand risk — such as adult content, gambling promotion, MLM indicators, or extremist language."
          example="A health product channel with no red flags scores 85/100 on Brand Safety. A channel with 'sponsored casino' in its description is flagged immediately."
          color="bg-green-100 text-green-700"
        />
        <SubSection title="Hard flags">
          <div className="grid grid-cols-2 gap-2">
            {[
              { flag: "nsfw-content", label: "NSFW / Adult Content" },
              { flag: "gambling-content", label: "Gambling / Betting" },
              { flag: "mlm-indicators", label: "MLM / Pyramid Scheme" },
              { flag: "hate-extremist", label: "Hate / Extremist" },
              { flag: "controversial-content", label: "Controversial Content" },
            ].map(({ flag, label }) => (
              <div key={flag} className="flex items-center gap-1.5 text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 rounded">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </SubSection>
        <Callout variant="warning">
          Hard-flagged creators are <strong>not deleted</strong>. They stay in the queue so you can review the flag
          and override manually if it's a false positive.
        </Callout>
      </Section>

      <Section id="partnership-readiness" title="5. Partnership Readiness (20%)">
        <PillarCard
          icon={Handshake}
          name="Partnership Readiness"
          weight="20%"
          description="Looks for signs the creator accepts sponsorships, affiliate deals, reviews, or business inquiries. It checks for contact information, sponsor language in their description, and creator category signals."
          example="A channel with a business email and 'business inquiries welcome' in its About section scores high — they're clearly open to brand partnerships."
          color="bg-blue-100 text-blue-700"
        />
        <SubSection title="Signals that raise it">
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Business email address detected</li>
            <li>Sponsorship, affiliate, or collaboration language in channel description</li>
            <li>Discount code or promo code references</li>
            <li>Source is YouTube (YouTube creators commonly monetise via brand deals)</li>
          </ul>
        </SubSection>
      </Section>

      <Section id="response-probability" title="6. Response Probability (20%)">
        <PillarCard
          icon={Activity}
          name="Response Probability"
          weight="20%"
          description="Estimates how likely this creator is to actually reply to your outreach, based on their channel size, contact availability, and platform. Smaller channels respond at much higher rates than mega-creators."
          example="A 25k-subscriber YouTuber with a business email has a very high response probability. A 5M-subscriber channel with no email has a very low one."
          color="bg-amber-100 text-amber-700"
        />
        <SubSection title="Sweet spot">
          <Callout variant="info">
            Creators with <strong>10k–200k subscribers</strong> have the highest response rates for
            commission-based partnerships. They check their DMs, value new income sources, and can deliver
            meaningful results without celebrity pricing.
          </Callout>
        </SubSection>
      </Section>

      <Section id="content-relevance" title="7. Content Relevance (15%)">
        <PillarCard
          icon={FileText}
          name="Content Relevance"
          weight="15%"
          description="Checks how closely the creator's actual content matches your product topic. It looks for keyword overlap between the channel description and your product's category, as well as platform-vertical alignment."
          example="A Productivity SaaS product finds high content relevance in a 'Notion Templates & Workflow' channel — the topics are directly aligned."
          color="bg-rose-100 text-rose-700"
        />
      </Section>

      {/* 8. Labels */}
      <Section id="labels" title="8. What the labels mean">
        <div className="space-y-3">
          {[
            {
              label: "Ready to Pitch",
              range: "Score 80–100",
              meaning: "This creator is a strong match. Their audience, content, and accessibility all line up. Move them to Targets and send outreach.",
              action: "Move to Targets → Generate Outreach",
              variant: "emerald",
            },
            {
              label: "Promising",
              range: "Score 60–79",
              meaning: "A good fit but missing one or two signals. Review their recent videos manually before making a decision.",
              action: "Review manually → Approve or Reject",
              variant: "blue",
            },
            {
              label: "Needs Review",
              range: "Score 40–59",
              meaning: "There are gaps in the scoring data or mixed signals. More context is needed before qualifying.",
              action: "Check recent videos and description → Re-score",
              variant: "amber",
            },
            {
              label: "Not Qualified",
              range: "Score 0–39",
              meaning: "This creator doesn't meet the qualification threshold based on available data. Reject or archive unless you have a specific reason to keep them.",
              action: "Reject or Archive",
              variant: "gray",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <LabelBadge label={item.label} />
                <span className="text-xs text-muted-foreground font-medium">{item.range}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.meaning}</p>
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <ArrowRight className="w-3 h-3" />
                {item.action}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. Workflow */}
      <Section id="workflow" title="9. How to use the workflow">
        <div className="space-y-0">
          <WorkflowStep
            step={1}
            title="Run YouTube Discovery"
            description="Search for channels using the YouTube Discovery page. Add the best results to your Discovery Workspace."
          />
          <WorkflowStep
            step={2}
            title="Open the Qualification Engine"
            description="Come back here and click 'Qualify All' to score every prospect against your selected product. This takes a few seconds."
          />
          <WorkflowStep
            step={3}
            title="Read each score explanation"
            description="Expand 'Why This Score' on any card to see exactly why it scored that way — no guessing required."
          />
          <WorkflowStep
            step={4}
            title="Approve the best creators"
            description="Click 'Approve to Targets' on Ready to Pitch and Promising creators. They move to your Targets list automatically."
          />
          <WorkflowStep
            step={5}
            title="Generate outreach"
            description="Go to Targets or Outreach and generate personalised messages for each approved creator."
          />
          <WorkflowStep
            step={6}
            title="Track responses in Pipeline"
            description="As creators respond, move them through your CRM Pipeline — Contacted → Interested → Negotiating → Active."
          />
        </div>
      </Section>

      {/* 10. Wrong score */}
      <Section id="wrong-score" title="10. When a score looks wrong">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The scoring engine works from the data available in each prospect record. If a score seems too low or too high:
        </p>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
          <li>
            <strong>Check the "Why This Score" panel.</strong> It lists every reason, positive and negative.
            If a signal is missing (e.g., no email), adding it to the prospect record and re-scoring will
            update the result.
          </li>
          <li>
            <strong>Brand safety false positives</strong> can happen when a channel discusses a topic
            (e.g., "gambling addiction recovery") that contains a flagged keyword. Review the flag,
            and if it's safe, reject only that flag — then re-score.
          </li>
          <li>
            <strong>Low audience match?</strong> The engine may not have enough channel description data.
            If the channel's notes are thin, try adding the channel description manually to the prospect notes.
          </li>
          <li>
            <strong>Override is always available.</strong> You can manually star a creator and approve them to
            Targets regardless of their score — the engine is advisory, not a hard gate.
          </li>
        </ul>
        <Callout variant="info">
          The qualification system is a starting point, not the final word. Human judgment always wins.
          Use the scores to prioritise your time, not to replace your instincts.
        </Callout>
      </Section>

      {/* CTA */}
      <div className="rounded-xl border bg-muted/30 p-6 text-center space-y-3">
        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
        <p className="font-semibold text-lg">Ready to start qualifying?</p>
        <p className="text-sm text-muted-foreground">
          Head to the Qualification Engine to score your discovered creators and move the best ones into outreach.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/qualification">
            <Button className="gap-2">
              <Target className="w-4 h-4" />
              Go to Qualification Engine
            </Button>
          </Link>
          <Link href="/youtube-discovery">
            <Button variant="outline" className="gap-2">
              <Youtube className="w-4 h-4" />
              Run YouTube Discovery
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
