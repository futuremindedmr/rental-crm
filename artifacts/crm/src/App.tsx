import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetCurrentTenant, getGetCurrentTenantQueryKey } from "@workspace/api-client-react";

import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Properties from "@/pages/properties";
import Leads from "@/pages/leads";
import Rentals from "@/pages/rentals";
import Inventory from "@/pages/inventory";
import Payments from "@/pages/payments";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Onboarding from "@/pages/onboarding";

const queryClient = new QueryClient();

function MainApp() {
  const { isLoading, isAuthenticated, refetch } = useAuth();
  const qc = useQueryClient();
  const { data: tenantEnvelope, isLoading: tenantLoading } = useGetCurrentTenant({
    query: { enabled: isAuthenticated, queryKey: getGetCurrentTenantQueryKey() },
  });
  const tenant = tenantEnvelope?.tenant ?? null;

  if (isLoading || (isAuthenticated && tenantLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onAuthSuccess={refetch} />;
  }

  if (!tenant) {
    return (
      <Onboarding
        onCreated={(t) => qc.setQueryData(getGetCurrentTenantQueryKey(), { tenant: t })}
      />
    );
  }

  return (
    <Layout tenantName={tenant.name}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:id" component={ClientDetail} />
        <Route path="/properties" component={Properties} />
        <Route path="/leads" component={Leads} />
        <Route path="/rentals" component={Rentals} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/payments" component={Payments} />
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
          <MainApp />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
