import React, { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";

import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Leads from "@/pages/leads";
import Rentals from "@/pages/rentals";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Onboarding from "@/pages/onboarding";

const queryClient = new QueryClient();

interface Tenant {
  id: number;
  name: string;
}

function MainApp() {
  const { isLoading, isAuthenticated, login } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setTenantLoading(false);
      return;
    }
    fetch("/api/tenants/current", { credentials: "include" })
      .then(r => r.json())
      .then((data: { tenant: Tenant | null }) => {
        setTenant(data.tenant ?? null);
      })
      .catch(() => setTenant(null))
      .finally(() => setTenantLoading(false));
  }, [isAuthenticated]);

  if (isLoading || (isAuthenticated && tenantLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  if (!tenant) {
    return <Onboarding onCreated={setTenant} />;
  }

  return (
    <Layout tenantName={tenant.name}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:id" component={ClientDetail} />
        <Route path="/leads" component={Leads} />
        <Route path="/rentals" component={Rentals} />
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
