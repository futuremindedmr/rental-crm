import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Building2,
  Inbox,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  WashingMachine,
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
  { name: "Inventory", href: "/inventory", icon: WashingMachine },
  { name: "Payments", href: "/payments", icon: CreditCard },
];

export function Layout({ children, tenantName }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div
        className={cn(
          "flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200",
          collapsed ? "w-14" : "w-64"
        )}
      >
        <div className="h-16 flex items-center border-b border-sidebar-border relative px-3">
          {!collapsed && (
            <div className="flex items-center gap-2 font-bold text-lg text-sidebar-primary-foreground flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="56 48 88 104" width="36" height="36" className="flex-shrink-0">
                <polygon points="100,52 140,75 140,125 100,148 60,125 60,75" fill="#f5a623"/>
                <rect x="78" y="80" width="44" height="9" rx="3" fill="#0f1c2e"/>
                <rect x="96" y="80" width="9" height="42" rx="3" fill="#0f1c2e"/>
              </svg>
              <div className="leading-tight min-w-0">
                <div>Trackable</div>
                {tenantName && (
                  <div className="text-xs font-normal text-sidebar-foreground/60 truncate max-w-[120px]">
                    {tenantName}
                  </div>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex items-center justify-center w-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="56 48 88 104" width="28" height="28">
                <polygon points="100,52 140,75 140,125 100,148 60,125 60,75" fill="#f5a623"/>
                <rect x="78" y="80" width="44" height="9" rx="3" fill="#0f1c2e"/>
                <rect x="96" y="80" width="9" height="42" rx="3" fill="#0f1c2e"/>
              </svg>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 z-10",
              "w-6 h-6 rounded-full border bg-sidebar border-sidebar-border flex items-center justify-center",
              "text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors shadow-sm"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/" ? location === "/" : location.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <span
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    collapsed ? "justify-center" : "",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Link href="/settings">
            <span
              title={collapsed ? "Settings" : undefined}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                collapsed ? "justify-center" : "",
                location === "/settings"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!collapsed && "Settings"}
            </span>
          </Link>

          {user && (
            <div
              className={cn(
                "mt-2 border-t border-sidebar-border pt-3",
                collapsed ? "px-0" : "px-1"
              )}
            >
              {!collapsed && (
                <div className="flex items-center gap-2 mb-2 px-2">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user.firstName ?? "User"}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {(user.firstName?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-sidebar-foreground truncate">
                      {user.firstName} {user.lastName}
                    </div>
                    {user.email && (
                      <div className="text-xs text-sidebar-foreground/60 truncate">
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={logout}
                title={collapsed ? "Log out" : undefined}
                className={cn(
                  "flex items-center gap-2 w-full py-1 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors rounded-md",
                  collapsed ? "justify-center px-0" : "px-2"
                )}
              >
                <LogOut className="w-3 h-3 flex-shrink-0" />
                {!collapsed && "Log out"}
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
