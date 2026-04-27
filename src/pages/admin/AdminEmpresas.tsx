import { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  Power,
  PowerOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useAdminCompanies,
  useUpdateCompany,
  useAdminPlans,
} from "@/hooks/useAdminData";
import CreateCompanyDialog from "@/components/admin/CreateCompanyDialog";

const planColors: Record<string, string> = {
  free: "bg-gray-500/15 text-gray-400",
  essential: "bg-blue-500/15 text-blue-400",
  advanced: "bg-primary/15 text-primary",
  enterprise: "bg-amber-500/15 text-amber-400",
};

export default function AdminEmpresas() {
  const navigate = useNavigate();
  const { data: companies, isLoading } = useAdminCompanies();
  const { data: plans } = useAdminPlans();
  const updateCompany = useUpdateCompany();

  const planLabels = Object.fromEntries((plans || []).map((p) => [p.slug, p.name]));

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = companies?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj?.includes(search) ||
      c.plan.toLowerCase().includes(search.toLowerCase())
  );

  function toggleActive(company: (typeof companies)[0]) {
    if (!confirm(`Deseja ${company.is_active ? "desativar" : "ativar"} a empresa "${company.name}"?`))
      return;
    updateCompany.mutate({ id: company.id, is_active: !company.is_active });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie todas as empresas do sistema ({companies?.length || 0})
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Empresa
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CNPJ ou plano..."
          className="w-full rounded-lg border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Create dialog */}
      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Companies grid */}
      {filtered?.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-4">
            {search ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered?.map((company) => (
            <div
              key={company.id}
              className="rounded-xl border bg-card p-5 space-y-4 hover:border-primary/20 transition-all group"
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{company.name}</h3>
                    {company.cnpj && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {company.cnpj}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(company)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    company.is_active
                      ? "text-green-500 hover:bg-green-500/10"
                      : "text-red-500 hover:bg-red-500/10"
                  }`}
                  title={company.is_active ? "Desativar" : "Ativar"}
                >
                  {company.is_active ? (
                    <Power className="h-4 w-4" />
                  ) : (
                    <PowerOff className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                    planColors[company.plan] || planColors.free
                  }`}
                >
                  {planLabels[company.plan] || company.plan}
                </span>
                <span
                  className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                    company.is_active
                      ? "bg-green-500/15 text-green-500"
                      : "bg-red-500/15 text-red-500"
                  }`}
                >
                  {company.is_active ? "Ativa" : "Inativa"}
                </span>
              </div>

              {/* Info */}
              {company.business_area && (
                <p className="text-xs text-muted-foreground truncate">
                  {company.business_area}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-[10px] text-muted-foreground">
                  Criada em {new Date(company.created_at).toLocaleDateString("pt-BR")}
                </span>
                <button
                  onClick={() => navigate(`/admin/empresa/${company.id}`)}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:underline transition-all"
                >
                  Gerenciar
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
