import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Search,
  MessageSquare,
  KanbanSquare,
  Zap,
  Menu,
  X,
  Compass,
  Crosshair,
  Telescope,
  Youtube,
  Filter,
  ContactRound,
  Send,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: Package },
  { label: "Discover Creators", href: "/discover", icon: Search },
  { label: "Partner Strategy", href: "/partner-strategy", icon: Compass },
  { label: "Discovery Workspace", href: "/discovery-workspace", icon: Telescope },
  { label: "YouTube Discovery", href: "/youtube-discovery", icon: Youtube },
  { label: "Qualification", href: "/qualification", icon: Filter },
  { label: "Contact Intelligence", href: "/contact-intelligence", icon: ContactRound },
  { label: "Targets", href: "/targets", icon: Crosshair },
  { label: "Outreach", href: "/outreach", icon: MessageSquare },
  { label: "Outreach Operations", href: "/outreach-operations", icon: Send },
  { label: "Performance", href: "/performance", icon: TrendingUp },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sidebar-foreground font-semibold text-base tracking-tight">
          InfluencePartner
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground"
            data-testid="button-close-sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? location === "/"
              : location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="rounded-lg bg-sidebar-accent p-3">
          <p className="text-sidebar-foreground/80 text-xs leading-relaxed">
            "We can afford a higher commission because distribution is the
            bottleneck. High-fit creators are treated as partners, not just
            affiliates."
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-open-sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm">InfluencePartner</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
