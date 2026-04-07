import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  Building,
  ChevronDown,
  X,
  Users,
  Smartphone,
} from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useWhatsAppSessions } from "@/hooks/useWhatsAppSessions";

function getScoreColor(score: number) {
  if (score >= 70) return "text-crm-success";
  if (score >= 40) return "text-crm-warning";
  return "text-destructive";
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Há ${days}d`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

const SCORE_OPTIONS = [
  { label: "Todos os scores", value: "all" },
  { label: "Alto (≥70)", value: "high" },
  { label: "Médio (40–69)", value: "medium" },
  { label: "Baixo (<40)", value: "low" },
];

export default function Contatos() {
  const { data: sessions = [] } = useWhatsAppSessions();

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [originFilter, setOriginFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const filterRef = useRef<HTMLDivElement>(null);

  const activeSessionId = sessionFilter !== "all" ? sessionFilter : null;
  const { data: contacts = [], isLoading } = useContacts(activeSessionId);

  // Close filter panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  // Collect unique origins from data
  const originOptions = useMemo(() => {
    const set = new Set(contacts.map((c) => c.origin).filter(Boolean) as string[]);
    return ["all", ...Array.from(set).sort()];
  }, [contacts]);

  const activeFiltersCount =
    (originFilter !== "all" ? 1 : 0) +
    (scoreFilter !== "all" ? 1 : 0) +
    (sessionFilter !== "all" ? 1 : 0);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        (c.email ?? "").toLowerCase().includes(term) ||
        (c.company_name ?? "").toLowerCase().includes(term) ||
        (c.phone ?? "").includes(term);

      const matchesOrigin =
        originFilter === "all" || c.origin === originFilter;

      const matchesScore =
        scoreFilter === "all" ||
        (scoreFilter === "high" && c.score >= 70) ||
        (scoreFilter === "medium" && c.score >= 40 && c.score < 70) ||
        (scoreFilter === "low" && c.score < 40);

      return matchesSearch && matchesOrigin && matchesScore;
    });
  }, [contacts, search, originFilter, scoreFilter]);

  function clearFilters() {
    setOriginFilter("all");
    setScoreFilter("all");
    setSessionFilter("all");
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? "Carregando..."
              : sessionFilter !== "all"
              ? `${contacts.length} contato${contacts.length !== 1 ? "s" : ""} · instância: ${sessions.find((s) => s.id === sessionFilter)?.name ?? ""}`
              : `${contacts.length} contato${contacts.length !== 1 ? "s" : ""} na base`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary transition-colors">
            <Upload className="h-4 w-4" /> Importar
          </button>
          <button className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary transition-colors">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Novo Contato
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail, empresa ou telefone..."
            className="w-full rounded-lg border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter button + panel */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors
              ${filterOpen || activeFiltersCount > 0 ? "border-primary bg-primary/5 text-primary" : "hover:bg-secondary"}`}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
          </button>

          {filterOpen && (
            <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border bg-card shadow-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Filtros</span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Limpar filtros
                  </button>
                )}
              </div>

              {/* Instance (session) filter */}
              {sessions.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Instância WhatsApp
                  </label>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setSessionFilter("all")}
                      className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2
                        ${sessionFilter === "all" ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary"}`}
                    >
                      Todas as instâncias
                    </button>
                    {sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSessionFilter(s.id)}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2
                          ${sessionFilter === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary"}`}
                      >
                        <Smartphone className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">{s.name}</span>
                        {s.status === "connected" && (
                          <span className="h-2 w-2 rounded-full bg-crm-success shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Origin filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Origem
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {originOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setOriginFilter(opt)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                        ${originFilter === opt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-secondary"
                        }`}
                    >
                      {opt === "all" ? "Todas" : opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Score filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Score
                </label>
                <div className="flex flex-col gap-1">
                  {SCORE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setScoreFilter(opt.value)}
                      className={`text-left px-3 py-2 rounded-lg text-sm transition-colors
                        ${scoreFilter === opt.value
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-secondary"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {sessionFilter !== "all" && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
                <Smartphone className="h-3 w-3" />
                {sessions.find((s) => s.id === sessionFilter)?.name ?? "Instância"}
                <button onClick={() => setSessionFilter("all")}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {originFilter !== "all" && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
                {originFilter}
                <button onClick={() => setOriginFilter("all")}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {scoreFilter !== "all" && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
                {SCORE_OPTIONS.find((o) => o.value === scoreFilter)?.label}
                <button onClick={() => setScoreFilter("all")}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50 text-muted-foreground">
                <th className="text-left p-4 font-medium">Contato</th>
                <th className="text-left p-4 font-medium">Empresa</th>
                <th className="text-center p-4 font-medium">Score</th>
                <th className="text-left p-4 font-medium">Origem</th>
                <th className="text-left p-4 font-medium">Etiquetas</th>
                <th className="text-left p-4 font-medium">Responsável</th>
                <th className="text-left p-4 font-medium">Última Interação</th>
                <th className="text-center p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-secondary animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-32 rounded bg-secondary animate-pulse" />
                          <div className="h-3 w-48 rounded bg-secondary animate-pulse" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-3.5 w-20 rounded bg-secondary animate-pulse" />
                      </td>
                    ))}
                    <td className="p-4" />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8 opacity-40" />
                      <p className="font-medium">Nenhum contato encontrado</p>
                      <p className="text-xs">
                        {sessionFilter !== "all"
                          ? "Esta instância ainda não possui contatos vinculados"
                          : search || activeFiltersCount > 0
                          ? "Tente ajustar sua busca ou filtros"
                          : "Adicione seu primeiro contato clicando em Novo Contato"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const tags = c.contact_tags
                    ?.map((ct) => ct.tags)
                    .filter(Boolean) ?? [];
                  const responsibleName = c.profiles?.full_name ?? "—";
                  const initials = c.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("");

                  return (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {c.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />{c.phone}
                                </span>
                              )}
                              {c.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />{c.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {c.company_name ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Building className="h-3.5 w-3.5" /> {c.company_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-bold ${getScoreColor(c.score)}`}>
                          {c.score}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {c.origin ?? "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {tags.map((tag) => (
                            <span
                              key={tag!.id}
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: `${tag!.color}20`,
                                color: tag!.color,
                              }}
                            >
                              {tag!.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {responsibleName}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {formatRelativeTime(c.updated_at)}
                      </td>
                      <td className="p-4 text-center">
                        <button className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground bg-secondary/20">
            Mostrando {filtered.length} de {contacts.length} contato{contacts.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
