import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  LayoutDashboard,
  Columns3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/kanban", icon: Columns3, label: "Oportunidades" },
  { to: "/contatos", icon: Users, label: "Contatos" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setIsSuperAdmin(data?.role === "super_admin");
      });
  }, [user]);

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
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
          <img
            src="/logo-bescale.png"
            alt="Bescale"
            className={`shrink-0 h-16 w-auto object-contain transition-all duration-300 ${
              collapsed ? "max-w-[44px]" : "max-w-[200px]"
            }`}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
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
          {isSuperAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-amber-500/80 hover:bg-amber-500/10 hover:text-amber-500 transition-all duration-200"
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Super Admin</span>}
            </button>
          )}
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
          <div />
          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(172_66%_50%/0.8)]" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/30">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.full_name || user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
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
