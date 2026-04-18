import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Smartphone,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const adminNav = [
  { to: "/admin", icon: Building2, label: "Empresas", end: true },
  { to: "/admin/planos", icon: CreditCard, label: "Planos", end: false },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-crm-sidebar-bg transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
      >
        {/* Logo / Title */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
          <Shield className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-foreground tracking-wide">
              Super Admin
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(172_66%_50%/0.2)]"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <button
            onClick={() => navigate("/")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Voltar ao CRM</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Recolher</span>
              </>
            )}
          </button>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/30">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground">{profile?.full_name || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
