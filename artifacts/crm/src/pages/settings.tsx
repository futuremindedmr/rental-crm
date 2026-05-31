import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentTenant,
  useUpdateCurrentTenant,
  getGetCurrentTenantQueryKey,
  useGetSquareStatus,
  useSyncSquare,
  getGetSquareStatusQueryKey,
} from "@workspace/api-client-react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const qc = useQueryClient();
  const { data: tenantEnvelope, isLoading } = useGetCurrentTenant();
  const tenant = tenantEnvelope?.tenant ?? null;
  const updateTenant = useUpdateCurrentTenant();
  const { toast } = useToast();
  const [name, setName] = useState("");

  useEffect(() => {
    if (tenant?.name) setName(tenant.name);
  }, [tenant?.name]);

  const dirty = tenant ? name.trim() !== tenant.name : false;

  const { data: squareStatus, isLoading: squareLoading } = useGetSquareStatus();
  const syncSquare = useSyncSquare();

  const handleSyncSquare = () => {
    syncSquare.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSquareStatusQueryKey() });
        toast({ title: "Synced", description: "Square data refreshed." });
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
          <h3 className="text-lg font-medium">Square Integration</h3>
          <p className="text-sm text-muted-foreground">Manage your connection to Square for payment syncing.</p>
          <div className="bg-muted p-4 rounded-md border flex items-center justify-between">
            <div className="text-sm">
              Status:{" "}
              {squareLoading ? (
                <span className="text-muted-foreground">Checking...</span>
              ) : squareStatus?.connected ? (
                <span className="text-green-600 font-medium">Connected</span>
              ) : (
                <span className="text-muted-foreground font-medium">Disconnected</span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleSyncSquare} disabled={syncSquare.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncSquare.isPending ? "animate-spin" : ""}`} />
              Sync Square
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
