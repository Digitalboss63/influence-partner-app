import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <span className="font-medium text-foreground/80">{k}</span>
      <span className="text-muted-foreground">{v}</span>
    </div>
  );
}

export default function HelpCampaignLaunch() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/campaign-launch">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Wizard
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            Campaign Launch — How It Works
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Everything you need to know about the guided campaign launch workflow.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-8">

          <Section id="overview" title="1. Overview">
            <p className="text-sm text-muted-foreground">
              The Campaign Launch Wizard guides you through every step required to run a
              creator campaign — from product selection to launch. You never need to read
              documentation or navigate pages manually; the wizard shows you exactly where
              to go and what to do at each stage.
            </p>
          </Section>

          <Section id="workflow" title="2. Workflow">
            <p className="text-sm text-muted-foreground">
              The wizard follows this sequence:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground pl-2">
              <li><strong className="text-foreground">Select Product</strong> — choose which product to campaign for.</li>
              <li><strong className="text-foreground">Run Discovery</strong> — add creators and prospects in the Discovery Workspace.</li>
              <li><strong className="text-foreground">Review Qualifications</strong> — score and qualify prospects. Run batch qualification from inside the wizard.</li>
              <li><strong className="text-foreground">Run Contact Intelligence</strong> — discover email addresses and contact readiness. Run batch contact discovery from inside the wizard.</li>
              <li><strong className="text-foreground">Select Targets</strong> — confirm Partner Targets for the campaign. Approve qualified creators in the Qualification Engine.</li>
              <li><strong className="text-foreground">Generate Research Letters</strong> — create personalised research letters. Optional but recommended before outreach.</li>
              <li><strong className="text-foreground">Create Campaign</strong> — create a new campaign or select an existing one for the product.</li>
              <li><strong className="text-foreground">Launch</strong> — review the summary and launch. This sets the campaign status to Active and redirects you to the campaign page.</li>
            </ol>
          </Section>

          <Section id="progress" title="3. Progress indicator">
            <p className="text-sm text-muted-foreground">
              The progress bar at the top of the wizard shows all seven phases:
            </p>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <KV k="Green (✓)" v="Phase complete — data exists for this step." />
              <KV k="Amber (⚠)" v="Phase incomplete — data is missing. A warning is shown in the step." />
              <KV k="Grey" v="Phase not started — product not yet selected or step not reached." />
              <KV k="Blue (active)" v="Current step." />
            </div>
            <p className="text-sm text-muted-foreground">
              All statuses update automatically as you complete each step. You can always
              go back to an earlier step using the Back button.
            </p>
          </Section>

          <Section id="required" title="4. Required steps">
            <p className="text-sm text-muted-foreground">
              The wizard requires:
            </p>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <KV k="Product" v="You must select a product to proceed. All data is scoped to the selected product." />
              <KV k="Campaign" v="A campaign must be created or selected before you can launch. The wizard includes an inline campaign creation form." />
            </div>
            <p className="text-sm text-muted-foreground">
              All other steps (Discovery, Qualification, Contact Intelligence, Targets,
              Research Letters) are optional in the wizard. You can skip them and add data
              later. However, warnings are shown to remind you of missing data before launch.
            </p>
          </Section>

          <Section id="quick-actions" title="5. Quick actions">
            <p className="text-sm text-muted-foreground">
              Some steps include quick action buttons that run operations without leaving
              the wizard:
            </p>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <KV
                k="Run Qualification"
                v="Runs batch qualification scoring for all prospects linked to the selected product. Available on Step 3."
              />
              <KV
                k="Run Contact Intelligence"
                v="Runs batch contact discovery for all qualified creators. Available on Step 4."
              />
              <KV
                k="Create Campaign"
                v="Creates a new campaign inline without navigating away. Available on Step 7."
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Other actions — adding prospects, approving targets, generating research
              letters — open the relevant page. The wizard remembers your product selection
              when you return.
            </p>
          </Section>

          <Section id="launch" title="6. Launch action">
            <p className="text-sm text-muted-foreground">
              The Launch button on Step 8:
            </p>
            <div className="border border-border rounded-lg p-3 space-y-2">
              <KV k="Sets status to Active" v="The selected campaign's status is updated from Planning to Active." />
              <KV k="Redirects to campaign" v="You are taken directly to the Campaign Detail page." />
              <KV k="No campaign = disabled" v="The Launch button is disabled until a campaign is created or selected." />
            </div>
          </Section>

          <Section id="troubleshooting" title="7. Troubleshooting">
            <div className="border border-border rounded-lg p-3 space-y-2">
              <KV
                k="'No products found'"
                v="Create at least one product in the Products page before using the wizard."
              />
              <KV
                k="'No prospects found'"
                v="Use Discovery Workspace or YouTube Discovery to add creators for the selected product."
              />
              <KV
                k="'No qualified creators'"
                v="Click 'Run Qualification' on Step 3. Prospects must exist first."
              />
              <KV
                k="'Contact Intelligence not run'"
                v="Click 'Run Contact Intelligence' on Step 4. Qualified creators must exist first."
              />
              <KV
                k="'No targets found'"
                v="Open the Qualification Engine and approve creators. Approved creators become Partner Targets."
              />
              <KV
                k="'No campaign created'"
                v="Fill in the campaign name and objective on Step 7, then click Create Campaign."
              />
              <KV
                k="Launch button disabled"
                v="A campaign must be created or selected on Step 7 before launching."
              />
              <KV
                k="Run Qualification disabled"
                v="Prospects must exist before qualification can run. Complete Discovery first."
              />
              <KV
                k="Run Contact Intelligence disabled"
                v="Qualified creators must exist before contact discovery can run. Run Qualification first."
              />
            </div>
          </Section>

          <Section id="tips" title="8. Tips">
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 pl-2">
              <li>
                You can navigate back and forth freely using the Back button. No data is
                lost when you navigate.
              </li>
              <li>
                Steps 2–6 can be skipped if you want to create the campaign first and
                fill in data later.
              </li>
              <li>
                After launching, you can assign creators to the campaign directly from
                the Campaign Detail page.
              </li>
              <li>
                The wizard does not reset between sessions. Selecting the same product
                will show up-to-date data from the database.
              </li>
            </ul>
          </Section>

        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Link href="/campaign-launch">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to Wizard
          </Button>
        </Link>
        <Link href="/campaigns">
          <Button variant="outline" size="sm" className="gap-1.5">
            Campaigns <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
