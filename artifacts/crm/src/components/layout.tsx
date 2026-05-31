import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Building2,
  Inbox,
  FileText,
  CreditCard,
  Settings,
  KeySquare,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";

interface LayoutProps {
  children: React.ReactNode;
  tenantName?: string;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "Leads", href: "/leads", icon: Inbox },
  { name: "Rentals", href: "/rentals", icon: FileText },
  { name: "Payments", href: "/payments", icon: CreditCard },
];

export function Layout({ children, tenantName }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="w-64 flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-bold text-lg text-sidebar-primary-foreground">
            <KeySquare className="h-6 w-6 text-accent" />
            <div className="leading-tight">
              <div>RentTrack</div>
              {tenantName && (
                <div className="text-xs font-normal text-sidebar-foreground/60 truncate max-w-[140px]">
                  {tenantName}
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          <Link href="/settings">
            <span
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location === "/settings"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Settings className="w-4 h-4" />
              Settings
            </span>
          </Link>

          {user && (
            <div className="px-3 py-2 mt-2 border-t border-sidebar-border pt-3">
              <div className="flex items-center gap-2 mb-2">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.firstName ?? "User"}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold">
                    {(user.firstName?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-sidebar-foreground truncate">
                    {user.firstName} {user.lastName}
                  </div>
                  {user.email && (
                    <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-1 py-1 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
