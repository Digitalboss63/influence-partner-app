import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ProductIntake from "@/pages/ProductIntake";
import CreatorDiscovery from "@/pages/CreatorDiscovery";
import CreatorDetail from "@/pages/CreatorDetail";
import OutreachGenerator from "@/pages/OutreachGenerator";
import CRMPipeline from "@/pages/CRMPipeline";
import PartnerStrategy from "@/pages/PartnerStrategy";
import PartnerOutreachPlan from "@/pages/PartnerOutreachPlan";
import PartnerTargets from "@/pages/PartnerTargets";
import DiscoveryWorkspace from "@/pages/DiscoveryWorkspace";
import YoutubeDiscovery from "@/pages/YoutubeDiscovery";
import QualificationEngine from "@/pages/QualificationEngine";
import HelpQualificationEngine from "@/pages/HelpQualificationEngine";
import ContactIntelligence from "@/pages/ContactIntelligence";
import HelpContactIntelligence from "@/pages/HelpContactIntelligence";
import OutreachOperations from "@/pages/OutreachOperations";
import HelpOutreachOperations from "@/pages/HelpOutreachOperations";
import PerformanceIntelligence from "@/pages/PerformanceIntelligence";
import HelpPerformanceIntelligence from "@/pages/HelpPerformanceIntelligence";
import ExecutiveReports from "@/pages/ExecutiveReports";
import HelpExecutiveReporting from "@/pages/HelpExecutiveReporting";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import HelpCampaignManagement from "@/pages/HelpCampaignManagement";
import ResearchOutreach from "@/pages/ResearchOutreach";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/products" component={ProductIntake} />
        <Route path="/discover" component={CreatorDiscovery} />
        <Route path="/creator/:id" component={CreatorDetail} />
        <Route path="/outreach" component={OutreachGenerator} />
        <Route path="/pipeline" component={CRMPipeline} />
        <Route path="/partner-strategy" component={PartnerStrategy} />
        <Route path="/partner-outreach" component={PartnerOutreachPlan} />
        <Route path="/targets" component={PartnerTargets} />
        <Route path="/discovery-workspace" component={DiscoveryWorkspace} />
        <Route path="/youtube-discovery" component={YoutubeDiscovery} />
        <Route path="/qualification" component={QualificationEngine} />
        <Route path="/help/qualification-engine" component={HelpQualificationEngine} />
        <Route path="/contact-intelligence" component={ContactIntelligence} />
        <Route path="/help/contact-intelligence" component={HelpContactIntelligence} />
        <Route path="/outreach-operations" component={OutreachOperations} />
        <Route path="/help/outreach-operations" component={HelpOutreachOperations} />
        <Route path="/performance/reports" component={ExecutiveReports} />
        <Route path="/performance" component={PerformanceIntelligence} />
        <Route path="/help/performance-intelligence" component={HelpPerformanceIntelligence} />
        <Route path="/help/executive-reporting" component={HelpExecutiveReporting} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/help/campaign-management" component={HelpCampaignManagement} />
        <Route path="/research-outreach" component={ResearchOutreach} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
