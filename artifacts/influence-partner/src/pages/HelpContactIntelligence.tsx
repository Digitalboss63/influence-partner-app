import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Globe,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowLeft,
  ArrowRight,
  Info,
  ShieldCheck,
  Zap,
  ExternalLink,
} from "lucide-react";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
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
    <div className={`rounded-lg border p-4 text-sm ${styles[variant]}`}>{children}</div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
        {n}
      </div>
      <div className="space-y-1">
        <p className="font-medium text-sm">{title}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function HelpContactIntelligence() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/contact-intelligence">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Info className="w-6 h-6 text-primary" />
            Contact Intelligence — How It Works
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Everything you need to know about finding and verifying creator contact info.
          </p>
        </div>
      </div>

      {/* TOC */}
      <nav className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
        <p className="font-semibold mb-2">Contents</p>
        {[
          ["#what", "1. What is Contact Intelligence?"],
          ["#sources", "2. Where contact data comes from"],
          ["#readiness", "3. What the Contact Readiness Score means"],
          ["#status", "4. What verification status means"],
          ["#missing", "5. How to handle missing contact warnings"],
          ["#copy", "6. How to copy and verify contact info"],
          ["#integration", "7. How this connects to Targets and Outreach"],
          ["#limits", "8. What the system does not do yet"],
        ].map(([href, label]) => (
          <a key={href as string} href={href as string} className="block text-primary hover:underline text-xs">
            {label as string}
          </a>
        ))}
      </nav>

      {/* 1 */}
      <Section id="what" title="1. What is Contact Intelligence?">
        <p className="text-sm text-muted-foreground">
          Contact Intelligence is the step between Qualification and Targets. After you qualify a
          prospect as worth pitching, this tool automatically scans all available metadata —
          prospect notes, social URLs, YouTube channel descriptions, and qualification data — to
          extract the best way to reach them.
        </p>
        <Callout variant="info">
          <strong>No scraping or third-party enrichment services are used.</strong> All data is
          extracted deterministically from what you've already captured in the tool.
        </Callout>
        <p className="text-sm text-muted-foreground">
          For each qualified creator, Contact Intelligence surfaces: business email, website, social
          profiles (Instagram, TikTok, LinkedIn), YouTube channel, and a contact page link.
        </p>
      </Section>

      {/* 2 */}
      <Section id="sources" title="2. Where contact data comes from">
        <p className="text-sm text-muted-foreground">
          The extraction engine checks these sources in order of trust:
        </p>
        <ol className="space-y-3 mt-2">
          <Step n={1} title="Qualification contact email field">
            If you manually entered a contact email during qualification, it is used first.
          </Step>
          <Step n={2} title="Prospect email / website / social URL fields">
            Anything you entered when adding the prospect to the Discovery Workspace is parsed.
          </Step>
          <Step n={3} title="Prospect notes">
            Free-text notes are scanned for email patterns (regex), website URLs, and social
            profile links.
          </Step>
          <Step n={4} title="YouTube channel description">
            If a YouTube channel is linked to the prospect, its description text is parsed for
            email addresses and URLs.
          </Step>
          <Step n={5} title="Contact page inference">
            If a website is found, a{" "}
            <code className="bg-muted px-1 rounded text-xs">/contact</code> path is automatically
            inferred and added.
          </Step>
          <Step n={6} title="Creator handle">
            If no YouTube URL is found, the creator's handle is used to construct one.
          </Step>
        </ol>
        <Callout variant="warning">
          Email addresses from personal providers (gmail, yahoo, hotmail, etc.) are deprioritised.
          Business-domain emails appear first.
        </Callout>
      </Section>

      {/* 3 */}
      <Section id="readiness" title="3. What the Contact Readiness Score means">
        <p className="text-sm text-muted-foreground">
          The Contact Readiness Score (0–100) tells you how reachable a creator is right now. Higher
          is better.
        </p>
        <div className="rounded-lg border overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Signal found</th>
                <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Business email", "+35"],
                ["Website URL", "+15"],
                ["Contact page URL", "+15"],
                ["Instagram profile", "+10"],
                ["TikTok profile", "+10"],
                ["LinkedIn profile", "+10"],
                ["YouTube channel / recent activity", "+5"],
              ].map(([label, pts]) => (
                <tr key={label}>
                  <td className="px-4 py-2 text-sm">{label}</td>
                  <td className="px-4 py-2 text-right font-mono text-emerald-700 font-semibold text-sm">{pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-xs mt-2">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="font-bold text-emerald-700 text-lg">70–100</p>
            <p className="text-emerald-700">High — ready to outreach</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="font-bold text-amber-700 text-lg">40–69</p>
            <p className="text-amber-700">Medium — some contacts available</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="font-bold text-red-500 text-lg">0–39</p>
            <p className="text-red-500">Low — needs manual research</p>
          </div>
        </div>
      </Section>

      {/* 4 */}
      <Section id="status" title="4. What verification status means">
        <div className="space-y-2">
          {[
            {
              status: "Verified",
              cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
              icon: CheckCircle2,
              desc: "You manually confirmed this contact info is accurate.",
            },
            {
              status: "Likely",
              cls: "bg-blue-100 text-blue-700 border-blue-200",
              icon: CheckCircle2,
              desc: "Contact Readiness ≥ 60 and data found from multiple sources. Not yet manually confirmed.",
            },
            {
              status: "Unverified",
              cls: "bg-amber-100 text-amber-700 border-amber-200",
              icon: AlertCircle,
              desc: "Data was found but confidence is low or only one source matched.",
            },
            {
              status: "Missing",
              cls: "bg-red-100 text-red-700 border-red-200",
              icon: AlertCircle,
              desc: "Almost no contact signals found. Manual research required.",
            },
          ].map(({ status, cls, icon: Icon, desc }) => (
            <div key={status} className="flex items-start gap-3">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium mt-0.5 flex-shrink-0 ${cls}`}>
                <Icon className="w-3 h-3" />
                {status}
              </span>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 */}
      <Section id="missing" title="5. How to use missing contact warnings">
        <p className="text-sm text-muted-foreground">
          When a creator shows <strong>Missing</strong> status or a low readiness score:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside ml-2">
          <li>Open the creator's social profile manually and look for a business email in their bio.</li>
          <li>Visit their website's contact or about page.</li>
          <li>Check YouTube "About" tab → "View email address".</li>
          <li>Return to the prospect in Discovery Workspace and update the email / social URL fields.</li>
          <li>Click <strong>Refresh</strong> on the contact card to re-run extraction with the new data.</li>
        </ul>
        <Callout variant="warning">
          Adding the email directly to the prospect record is the most reliable way to ensure it
          shows up here and flows through to Targets.
        </Callout>
      </Section>

      {/* 6 */}
      <Section id="copy" title="6. How to copy and verify contact info">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Click the <strong>copy icon</strong> next to any email address to copy it to your
              clipboard.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Click <strong>Mark Verified</strong> on a card after you've confirmed the contact
              details are accurate. This changes the badge to Verified and signals the email is
              ready for outreach.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Click <strong>Audit</strong> on any card to see exactly which source each field came
              from, the score breakdown, and which fields are still missing.
            </p>
          </div>
        </div>
      </Section>

      {/* 7 */}
      <Section id="integration" title="7. How this connects to Targets and Outreach">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded text-xs">Qualification</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Contact Intelligence</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded text-xs">Targets</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs">Outreach</span>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside ml-2">
            <li>
              When you <strong>approve a qualified prospect to Targets</strong>, the email and
              website from Contact Intelligence are automatically carried over to the target record.
            </li>
            <li>
              When you <strong>generate outreach</strong> for a target, the available business
              email and social profiles are surfaced so you can choose the right channel.
            </li>
            <li>
              Running <strong>Discover All</strong> before approving to Targets ensures the most
              complete contact data flows downstream.
            </li>
          </ul>
        </div>
      </Section>

      {/* 8 */}
      <Section id="limits" title="8. What the system does not do yet">
        <Callout variant="warning">
          <ul className="space-y-1 text-sm">
            <li>✗ Does not send emails or DMs on your behalf.</li>
            <li>✗ Does not scrape third-party sites or use paid enrichment APIs.</li>
            <li>✗ Does not verify email deliverability (e.g. MX record checks).</li>
            <li>✗ Does not pull data from creator management platforms (Grin, Creator.co, etc.).</li>
            <li>✗ Does not automatically update when prospect data changes — click Refresh manually.</li>
          </ul>
        </Callout>
        <p className="text-sm text-muted-foreground">
          Future Phase 5B may add: live YouTube About-tab parsing, email validation (MX), and bulk
          enrichment from public channel metadata APIs.
        </p>
      </Section>

      {/* Footer nav */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Link href="/contact-intelligence">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Contact Intelligence
          </Button>
        </Link>
        <Link href="/targets">
          <Button variant="outline" size="sm" className="gap-1.5">
            Go to Targets
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
