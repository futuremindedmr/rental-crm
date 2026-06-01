import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentTenant,
  useUpdateCurrentTenant,
  getGetCurrentTenantQueryKey,
  useGetSquareStatus,
  useSyncSquare,
  useStartSquareOAuth,
  useDisconnectSquare,
  getGetSquareStatusQueryKey,
} from "@workspace/api-client-react";
import { RefreshCw, Link2, Link2Off, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Settings() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Detect OAuth callback result from query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("squareConnected");
    const error = params.get("squareError");
    if (connected === "1") {
      toast({ title: "Square connected", description: "Your Square account is now linked." });
      qc.invalidateQueries({ queryKey: getGetSquareStatusQueryKey() });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      const messages: Record<string, string> = {
        not_configured: "Square credentials are not configured on the server.",
        token_exchange_failed: "Could not exchange authorization code. Check your Square app settings.",
        invalid_state: "Invalid OAuth state — please try again.",
        server_error: "A server error occurred during Square authorization.",
        access_denied: "Square authorization was denied.",
      };
      toast({
        title: "Square connection failed",
        description: messages[error] ?? `Error: ${error}`,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: tenantEnvelope, isLoading } = useGetCurrentTenant();
  const tenant = tenantEnvelope?.tenant ?? null;
  const updateTenant = useUpdateCurrentTenant();
  const [name, setName] = useState("");

  useEffect(() => {
    if (tenant?.name) setName(tenant.name);
  }, [tenant?.name]);

  const dirty = tenant ? name.trim() !== tenant.name : false;

  const { data: squareStatus, isLoading: squareLoading } = useGetSquareStatus();
  const syncSquare = useSyncSquare();
  const startOAuth = useStartSquareOAuth();
  const disconnectSquare = useDisconnectSquare();

  const handleConnect = () => {
    startOAuth.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: (err) => {
        toast({
          title: "Cannot start Square connection",
          description: err instanceof Error ? err.message : "Server error — check SQUARE_CLIENT_ID is set.",
          variant: "destructive",
        });
      },
    });
  };

  const handleDisconnect = () => {
    disconnectSquare.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSquareStatusQueryKey() });
        toast({ title: "Square disconnected", description: "Your Square account has been unlinked." });
      },
      onError: (err) =>
        toast({
          title: "Disconnect failed",
          description: err instanceof Error ? err.message : "Could not disconnect",
          variant: "destructive",
        }),
    });
  };

  const handleSyncSquare = () => {
    syncSquare.mutate(undefined, {
      onSuccess: (result) => {
        qc.invalidateQueries({ queryKey: getGetSquareStatusQueryKey() });
        toast({
          title: "Sync complete",
          description: `${result.paymentsImported} payments · ${result.invoicesImported} invoices · ${result.customersImported} customers matched`,
        });
      },
      onError: (err) =>
        toast({
          title: "Sync failed",
          description: err instanceof Error ? err.message : "Could not sync Square",
          variant: "destructive",
        }),
    });
  };

  const handleSave = () => {
    if (!name.trim() || !dirty) return;
    updateTenant.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: (env) => {
          qc.setQueryData(getGetCurrentTenantQueryKey(), env);
          toast({ title: "Saved", description: "Business name updated." });
        },
        onError: (err) =>
          toast({
            title: "Error",
            description: err instanceof Error ? err.message : "Failed to update",
            variant: "destructive",
          }),
      }
    );
  };

  const connected = squareStatus?.connected ?? false;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and app preferences.</p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-6 space-y-4 bg-card">
          <h3 className="text-lg font-medium">Company Profile</h3>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your business name"
                disabled={isLoading || updateTenant.isPending}
              />
              <p className="text-xs text-muted-foreground">
                This name appears across RentTrack, including the sidebar.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!dirty || !name.trim() || updateTenant.isPending}
              >
                {updateTenant.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 space-y-4 bg-card">
          <div>
            <h3 className="text-lg font-medium">Square Integration</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your Square account to automatically sync customers, payments, and invoices.
              The app works fully without Square — this is optional.
            </p>
          </div>

          {/* Status row */}
          <div className="rounded-md border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              {squareLoading ? (
                <span className="text-sm text-muted-foreground">Checking connection…</span>
              ) : connected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-700">Connected</span>
                  {squareStatus?.merchantId && (
                    <span className="text-xs text-muted-foreground ml-1">· Merchant {squareStatus.merchantId}</span>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">Not connected</span>
                </>
              )}
            </div>

            {connected && squareStatus?.lastSyncAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last synced {format(new Date(squareStatus.lastSyncAt), "MMM d, yyyy 'at' h:mm a")}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {!connected ? (
              <Button onClick={handleConnect} disabled={startOAuth.isPending}>
                <Link2 className="h-4 w-4 mr-2" />
                {startOAuth.isPending ? "Redirecting…" : "Connect Square"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleSyncSquare}
                  disabled={syncSquare.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncSquare.isPending ? "animate-spin" : ""}`} />
                  {syncSquare.isPending ? "Syncing…" : "Sync now"}
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDisconnect}
                  disabled={disconnectSquare.isPending}
                >
                  <Link2Off className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
            <p className="font-medium text-foreground/70">Setup instructions</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a Square app at <a href="https://developer.squareup.com" target="_blank" rel="noopener noreferrer" className="underline">developer.squareup.com</a></li>
              <li>Add your callback URL as a redirect URI: <code className="bg-muted px-1 rounded text-xs">/api/square/oauth/callback</code></li>
              <li>Add <code className="bg-muted px-1 rounded text-xs">SQUARE_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-xs">SQUARE_CLIENT_SECRET</code> to Replit Secrets</li>
              <li>Click "Connect Square" above</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
