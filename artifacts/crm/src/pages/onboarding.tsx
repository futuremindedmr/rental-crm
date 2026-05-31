import React, { useState } from "react";
import { KeySquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface OnboardingProps {
  onCreated: (tenant: { id: number; name: string }) => void;
}

export default function Onboarding({ onCreated }: OnboardingProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create account");
      }

      const data = await res.json();
      onCreated(data.tenant);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <KeySquare className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">RentTrack</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Let's set up your business account
          </p>
        </div>

        <div className="bg-card border rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-1">Create your business</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your business name will appear across RentTrack.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                placeholder="e.g. Acme Appliance Rentals"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create business account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
