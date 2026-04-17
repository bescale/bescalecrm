import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Building, Upload, Copy, Check, Loader2, MapPin, Briefcase, FileText, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyPlan } from "@/hooks/usePlanLimits";

interface CompanyData {
  id: string;
  name: string;
  cnpj: string | null;
  logo_url: string | null;
  invite_code: string | null;
  plan: string;
  is_active: boolean;
  settings: Record<string, unknown> | null;
  address: string | null;
  business_area: string | null;
  description: string | null;
  products_services: string | null;
}

export default function ConfigEmpresa() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: companyPlan } = useCompanyPlan();

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [businessArea, setBusinessArea] = useState("");
  const [description, setDescription] = useState("");
  const [productsServices, setProductsServices] = useState("");

  useEffect(() => {
    fetchCompany();
  }, [profile?.company_id]);

  async function fetchCompany() {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    // Try with all columns first; fall back to base columns if extras don't exist yet
    let data: any;
    let error: any;

    ({ data, error } = await supabase
      .from("companies")
      .select("id, name, cnpj, logo_url, invite_code, plan, is_active, settings, address, business_area, description, products_services")
      .eq("id", profile.company_id)
      .single());

    if (error?.message?.includes("does not exist")) {
      ({ data, error } = await supabase
        .from("companies")
        .select("id, name, cnpj, logo_url, invite_code, plan, is_active, settings")
        .eq("id", profile.company_id)
        .single());
    }

    if (error) {
      toast.error("Erro ao carregar dados da empresa");
      setLoading(false);
      return;
    }

    setCompany(data as CompanyData);
    setName(data.name || "");
    setCnpj(data.cnpj || "");
    setAddress(data.address || "");
    setBusinessArea(data.business_area || "");
    setDescription(data.description || "");
    setProductsServices(data.products_services || "");
    setLoading(false);
  }

  async function handleSave() {
    if (!company) return;
    if (!name.trim()) {
      toast.error("O nome da empresa é obrigatório");
      return;
    }

    setSaving(true);
    const baseData: Record<string, unknown> = {
      name: name.trim(),
      cnpj: cnpj.trim() || null,
    };

    const extraData: Record<string, unknown> = {
      address: address.trim() || null,
      business_area: businessArea.trim() || null,
      description: description.trim() || null,
      products_services: productsServices.trim() || null,
    };

    // Try full update; fall back to base fields if extra columns don't exist
    let updateData = { ...baseData, ...extraData };
    let { error } = await supabase
      .from("companies")
      .update(updateData)
      .eq("id", company.id);

    if (error?.message?.includes("does not exist")) {
      updateData = baseData;
      ({ error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", company.id));
    }

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Dados da empresa atualizados!");
      setCompany({ ...company, ...updateData });
    }
    setSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (!file.type.startsWith("image/")) {
      toast.error("O arquivo deve ser uma imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `logos/${company.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao fazer upload: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("company-assets")
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("companies")
      .update({ logo_url: logoUrl })
      .eq("id", company.id);

    if (updateError) {
      toast.error("Erro ao atualizar logo");
    } else {
      toast.success("Logo atualizado!");
      setCompany({ ...company, logo_url: logoUrl });
    }
    setUploading(false);
  }

  function handleCopyInviteCode() {
    if (!company?.invite_code) return;
    navigator.clipboard.writeText(company.invite_code);
    setCopied(true);
    toast.success("Código de convite copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  function formatCnpj(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }


  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/configuracoes")}
            className="rounded-lg p-2 hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Dados da Empresa</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Nenhuma empresa vinculada à sua conta.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/configuracoes")}
          className="rounded-lg p-2 hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Dados da Empresa</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as informações da sua empresa
          </p>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Logo da empresa</h3>
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-border">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Building className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Formato JPG, PNG ou SVG. Tamanho máximo de 2MB.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : "Alterar logo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
      </div>

      {/* Company info form */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Informações gerais</h3>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Nome da empresa *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da sua empresa"
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              CNPJ
            </label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Endereço
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF"
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Área de atuação
            </label>
            <input
              value={businessArea}
              onChange={(e) => setBusinessArea(e.target.value)}
              placeholder="Ex: Tecnologia, Saúde, Educação, Varejo..."
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente sua empresa, sua missão e o que ela faz..."
              rows={3}
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Produtos e serviços
            </label>
            <textarea
              value={productsServices}
              onChange={(e) => setProductsServices(e.target.value)}
              placeholder="Liste os principais produtos e serviços oferecidos pela empresa..."
              rows={3}
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      {/* Invite code */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">Código de convite</h3>
        <p className="text-xs text-muted-foreground">
          Compartilhe este código para novos membros ingressarem na empresa.
        </p>
        {company.invite_code ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm font-mono tracking-wider">
              {company.invite_code}
            </code>
            <button
              onClick={handleCopyInviteCode}
              className="rounded-lg border p-2.5 hover:bg-secondary transition-colors"
              title="Copiar código"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nenhum código de convite gerado.
          </p>
        )}
      </div>

      {/* Plan info */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">Plano atual</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
            {companyPlan?.name || company.plan}
          </span>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              company.is_active
                ? "bg-green-500/15 text-green-600"
                : "bg-red-500/15 text-red-600"
            }`}
          >
            {company.is_active ? "Ativa" : "Inativa"}
          </span>
        </div>
      </div>
    </div>
  );
}
