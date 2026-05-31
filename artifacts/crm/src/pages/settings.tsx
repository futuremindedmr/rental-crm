export default function Settings() {
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
            <div className="grid gap-1">
              <label className="text-sm font-medium">Company Name</label>
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md border">RentTrack LLC</div>
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium">Support Email</label>
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md border">support@renttrack.app</div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 space-y-4 bg-card">
          <h3 className="text-lg font-medium">Square Integration</h3>
          <p className="text-sm text-muted-foreground">Manage your connection to Square for payment syncing.</p>
          <div className="bg-muted p-4 rounded-md border flex items-center justify-between">
            <div className="text-sm font-medium text-green-600">Connected</div>
            <button className="text-sm font-medium border rounded px-3 py-1.5 hover:bg-background bg-background text-foreground" disabled>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}