import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CircleDollarSign, 
  CalendarDays, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Deals", href: "/deals", icon: CircleDollarSign },
  { name: "Activities", href: "/activities", icon: CalendarDays },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="w-64 flex-shrink-0 border-r bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground">
              N
            </div>
            Nexus CRM
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
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t">
          <Link href="/settings">
            <span
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="w-4 h-4" />
              Settings
            </span>
          </Link>
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
