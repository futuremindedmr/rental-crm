export default function Settings() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and preferences.</p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium">Profile</h3>
          <div className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Name</label>
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md">Jane Doe</div>
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium">Email</label>
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md">jane@example.com</div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium">Notifications</h3>
          <p className="text-sm text-muted-foreground">Preferences are synced automatically.</p>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email digest</span>
              <div className="w-10 h-6 bg-primary rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Desktop notifications</span>
              <div className="w-10 h-6 bg-muted rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
