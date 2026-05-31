import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import Companies from "@/pages/companies";
import CompanyDetail from "@/pages/company-detail";
import Deals from "@/pages/deals";
import Activities from "@/pages/activities";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/contacts/:id" component={ContactDetail} />
        <Route path="/companies" component={Companies} />
        <Route path="/companies/:id" component={CompanyDetail} />
        <Route path="/deals" component={Deals} />
        <Route path="/activities" component={Activities} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
