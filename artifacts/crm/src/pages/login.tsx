import { KeySquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <KeySquare className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">RentTrack</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Washer &amp; dryer rental management for your business
          </p>
        </div>

        <div className="bg-card border rounded-xl p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to access your business account
            </p>
          </div>
          <Button className="w-full" size="lg" onClick={onLogin}>
            Log in
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            New to RentTrack? Log in to create your account.
          </p>
        </div>
      </div>
    </div>
  );
}
