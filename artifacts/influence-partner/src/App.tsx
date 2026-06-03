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
