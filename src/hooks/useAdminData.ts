import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T];

// ── Companies ──────────────────────────────────────────────

export function useAdminCompanies() {
  return useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["admin-company", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; cnpj?: string; plan?: string }) => {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: payload.name,
          cnpj: payload.cnpj || null,
          plan: payload.plan || "free",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success("Empresa criada com sucesso!");
    },
    onError: (err) => toast.error("Erro ao criar empresa: " + (err as Error).message),
  });
}

// Fluxo CLIENT-SIDE: cria empresa + envia link mágico pro admin + dispara webhook
// do checkout. ZERO dependência de edge function — funciona sem deploy.
interface CreateCompanyWithAdminPayload {
  company_name: string;
  cnpj?: string;
  plan_slug: string;
  plan_id?: string;
  admin_email: string;
  admin_name: string;
  // Atributos customizados do plano da empresa (vão criar um plano dedicado)
  custom_plan?: {
    ai_enabled: boolean;
    priority_support: boolean;
    max_whatsapp_sessions: number;
    max_users: number;
    max_agents: number;
    max_contacts: number;
    // outros atributos que vão pro JSON settings do plano
    extra_features?: Record<string, unknown>;
  };
  extras?: Record<string, unknown>;
}

// Cooldown local para evitar requests 429 ao enviar OTP repetido
const _otpCooldown = new Map<string, number>();

export function useCreateCompanyWithAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCompanyWithAdminPayload) => {
      /* ─── 1. Autenticação do super admin ──────────── */
      const { data: sessionData } = await supabase.auth.getSession();
      const caller = sessionData.session?.user;
      if (!caller) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      /* ─── 2. Cria empresa (sem plan_id ainda — vai apontar pro custom plan) */
      const { data: newCompany, error: companyErr } = await supabase
        .from("companies")
        .insert({
          name: payload.company_name,
          cnpj: payload.cnpj || null,
          plan: payload.plan_slug,
          is_active: true,
        })
        .select()
        .single();

      if (companyErr || !newCompany) {
        throw new Error(
          "Erro ao criar empresa: " +
            (companyErr?.message ?? "resposta vazia do banco"),
        );
      }
      const companyId = newCompany.id as string;
      const inviteCode = (newCompany as { invite_code?: string | null })
        .invite_code;

      /* ─── 2.1 Busca plano-template (origem dos atributos default) ── */
      let templatePlan: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        price: number;
        price_label: string;
        max_whatsapp_sessions: number;
        max_users: number;
        max_agents: number;
        max_contacts: number;
        ai_enabled: boolean;
        priority_support: boolean;
        custom_branding: boolean;
        api_access: boolean;
      } | null = null;

      if (payload.plan_id) {
        const { data: templateRow } = await supabase
          .from("plans")
          .select("*")
          .eq("id", payload.plan_id)
          .maybeSingle();
        if (templateRow) templatePlan = templateRow;
      }

      /* ─── 2.2 Cria plano CUSTOMIZADO vinculado à empresa ─────────── */
      const c = payload.custom_plan;
      const slugUnique = `${payload.plan_slug}-${companyId.slice(0, 8)}`;
      const customPlanInsert = {
        slug: slugUnique,
        name: `${templatePlan?.name ?? payload.plan_slug} — ${payload.company_name}`,
        description: templatePlan?.description ?? null,
        price: templatePlan?.price ?? 0,
        price_label: templatePlan?.price_label ?? "Personalizado",
        max_whatsapp_sessions:
          c?.max_whatsapp_sessions ?? templatePlan?.max_whatsapp_sessions ?? 1,
        max_users: c?.max_users ?? templatePlan?.max_users ?? 1,
        max_agents: c?.max_agents ?? templatePlan?.max_agents ?? 0,
        max_contacts: c?.max_contacts ?? templatePlan?.max_contacts ?? 100,
        ai_enabled: c?.ai_enabled ?? templatePlan?.ai_enabled ?? false,
        priority_support:
          c?.priority_support ?? templatePlan?.priority_support ?? false,
        custom_branding: templatePlan?.custom_branding ?? false,
        api_access: templatePlan?.api_access ?? false,
        is_active: true,
        sort_order: 999,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        company_id: companyId,
      } as Tables<"plans">["Insert"];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: customPlan, error: planErr } = await (supabase as any)
        .from("plans")
        .insert(customPlanInsert)
        .select()
        .single();

      if (planErr || !customPlan) {
        // Rollback empresa
        await supabase.from("companies").delete().eq("id", companyId);
        throw new Error(
          "Erro ao criar plano customizado: " +
            (planErr?.message ?? "desconhecido"),
        );
      }

      /* ─── 2.3 Vincula empresa ao plano customizado ───────────── */
      const { error: linkErr } = await supabase
        .from("companies")
        .update({
          plan_id: customPlan.id,
          plan: customPlan.slug,
        })
        .eq("id", companyId);
      if (linkErr) {
        console.warn(
          "[create-company] erro ao vincular plano customizado:",
          linkErr,
        );
      }

      /* ─── 3. Envia link mágico pro admin ──────────── */
      // signInWithOtp com shouldCreateUser cria o usuário se não existir
      // e envia magic link. Não altera a sessão do super admin.
      let inviteLink: string | null = null;
      let otpError: string | null = null;
      let otpRateLimited = false;

      // Cooldown local de 60s por email — evita o request 429 no console
      const now = Date.now();
      const lastSent = _otpCooldown.get(payload.admin_email) ?? 0;
      const OTP_COOLDOWN_MS = 60_000;

      if (now - lastSent < OTP_COOLDOWN_MS) {
        // Ainda dentro do cooldown — pula o request
        otpRateLimited = true;
      } else {
        try {
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: payload.admin_email,
            options: {
              shouldCreateUser: true,
              data: {
                full_name: payload.admin_name,
                invite_company_id: companyId,
                invite_role: "admin",
                must_set_password: true,
              },
              emailRedirectTo: `${window.location.origin}/accept-invite`,
            },
          });
          if (otpErr) {
            const isRateLimit =
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (otpErr as any).status === 429 ||
              /security purposes.*seconds/i.test(otpErr.message) ||
              /rate limit/i.test(otpErr.message);
            if (isRateLimit) {
              otpRateLimited = true;
            } else {
              otpError = otpErr.message;
              console.error("[create-company] signInWithOtp error:", otpErr);
            }
          } else {
            // Sucesso — registra o cooldown
            _otpCooldown.set(payload.admin_email, Date.now());
          }
        } catch (e) {
          const msg = (e as Error).message ?? "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const status = (e as any).status ?? (e as any).statusCode;
          const isRateLimit =
            status === 429 ||
            /security purposes.*seconds/i.test(msg) ||
            /rate.?limit/i.test(msg) ||
            /too many requests/i.test(msg) ||
            /429/i.test(msg);
          if (isRateLimit) {
            otpRateLimited = true;
          } else {
            otpError = msg;
            console.error("[create-company] signInWithOtp exception:", e);
          }
        }
      }

      // Link manual pro caso do email não ter sido enviado
      if (inviteCode) {
        inviteLink = `${window.location.origin}/signup?invite_code=${inviteCode}&email=${encodeURIComponent(payload.admin_email)}`;
      }

      return {
        ok: true,
        company_id: companyId,
        invite_code: inviteCode ?? null,
        invite_link: inviteLink,
        otp_error: otpError,
        message: otpError
          ? `Empresa "${payload.company_name}" criada. O email automático falhou — compartilhe o link manualmente.`
          : otpRateLimited
            ? `Empresa "${payload.company_name}" criada. Um link já havia sido enviado há pouco para ${payload.admin_email} — peça para o admin verificar a caixa de entrada.`
            : `Empresa "${payload.company_name}" criada. Link enviado para ${payload.admin_email}.`,
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success(data.message);
      if (data.invite_link && navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(data.invite_link)
          .then(() =>
            toast.info("Link de convite copiado para a área de transferência"),
          )
          .catch(() => {});
      }
    },
    onError: (err) =>
      toast.error("Erro ao criar empresa: " + (err as Error).message),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      cnpj?: string | null;
      plan?: string;
      plan_id?: string;
      is_active?: boolean;
      address?: string | null;
      business_area?: string | null;
      description?: string | null;
      products_services?: string | null;
    }) => {
      const { error } = await supabase.from("companies").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["admin-company"] });
      toast.success("Empresa atualizada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

// ── Company Members ────────────────────────────────────────

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["admin-company-members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // Use SECURITY DEFINER RPC to bypass RLS (super_admin only)
      const { data: profiles, error } = await supabase
        .rpc("get_company_profiles", { _company_id: companyId! });
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const memberIds = profiles.map((p: any) => p.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", memberIds);

      const roleMap = new Map<string, string>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role));

      return profiles.map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) || null,
      }));
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: role as any })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: role as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-members"] });
      toast.success("Cargo atualizado!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: null })
        .eq("id", userId);
      if (error) throw error;
      await supabase.from("user_roles").delete().eq("user_id", userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-members"] });
      toast.success("Membro removido!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

// ── Company WhatsApp Sessions ──────────────────────────────

export function useCompanySessions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["admin-company-sessions", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSessionAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, name }: { companyId: string; name: string }) => {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .insert({ company_id: companyId, name, status: "disconnected" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-sessions"] });
      toast.success("Instância criada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      webhook_url?: string;
      prompt?: string;
    }) => {
      // 1. Se webhook_url mudou, lê o estado atual para flag edit
      let previousRow: { webhook_url?: string; waha_instance_id?: string } | null = null;
      if (payload.webhook_url !== undefined) {
        const { data: row } = await supabase
          .from("whatsapp_sessions")
          .select("webhook_url, waha_instance_id")
          .eq("id", id)
          .single();
        previousRow = row as any;
      }

      // 2. Salva no banco
      const { error } = await supabase.from("whatsapp_sessions").update(payload).eq("id", id);
      if (error) throw error;

      // 3. Notifica webhook Bescale (mesmo fluxo do useUpdateSessionWebhook)
      if (payload.webhook_url && payload.webhook_url.trim()) {
        const alreadyHasWebhook = !!previousRow?.webhook_url;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await fetch(
            "https://webhook.bescale.ai/webhook/ea9822ac-9e4b-4a9c-82e9-8ecdba88c1d4",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instance_name: previousRow?.waha_instance_id,
                user_id: user?.id,
                webhook_url: payload.webhook_url,
                edit: alreadyHasWebhook,
              }),
            }
          );
        } catch { /* non-blocking */ }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-sessions"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast.success("Instância atualizada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-sessions"] });
      toast.success("Instância deletada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

// ── Subscription Links ─────────────────────────────────────

export function useSubscriptionLinks() {
  return useQuery({
    queryKey: ["admin-subscription-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_links")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubscriptionLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      company_id: string;
      plan: string;
      plan_name: string;
      plan_price: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("subscription_links")
        .insert({
          company_id: payload.company_id,
          plan: payload.plan,
          plan_name: payload.plan_name,
          plan_price: payload.plan_price,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-links"] });
      toast.success("Link de assinatura gerado!");
    },
    onError: (err) => toast.error("Erro ao gerar link: " + (err as Error).message),
  });
}

// ═══════════════════════════════════════════════════════════════
// Gera link externo de assinatura (Asaas) via webhook.
// POSTa dados da empresa + admin + plano e aguarda o retorno.
// Salva customer_id, subscription_id e subscription_link na empresa.
// ═══════════════════════════════════════════════════════════════

const GENERATE_LINK_WEBHOOK =
  "https://webhook.bescale.ai/webhook/931aae4e-47bf-4b0a-8cdc-4b889fde798a";

interface GenerateLinkPayload {
  company_id: string;
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  plan_price: string;
}

interface GenerateLinkResult {
  link: string;
  customer_id: string | null;
  subscription_id: string | null;
  raw: unknown;
}

export function useGenerateExternalSubscriptionLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GenerateLinkPayload): Promise<GenerateLinkResult> => {
      /* 1. Busca dados completos da empresa */
      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .select("id, name, cnpj, address, business_area, plan, plan_id")
        .eq("id", payload.company_id)
        .single();
      if (companyErr || !company) {
        throw new Error("Empresa não encontrada: " + (companyErr?.message ?? ""));
      }

      /* 2. Busca o admin da empresa (primeiro user com role=admin) */
      let adminUserId: string | null = null;
      let adminUserEmail: string | null = null;
      let adminUserName: string | null = null;
      try {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("company_id", payload.company_id);
        if (profiles && profiles.length > 0) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in(
              "user_id",
              profiles.map((p) => p.id),
            );
          const adminRole = (roles ?? []).find(
            (r: { role: string }) => r.role === "admin",
          );
          const pick =
            profiles.find((p) => p.id === adminRole?.user_id) ?? profiles[0];
          adminUserId = pick.id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          adminUserEmail = (pick as any).email ?? null;
          adminUserName = pick.full_name ?? null;
        }
      } catch (e) {
        console.warn("[generate-link] falha ao buscar admin:", e);
      }

      /* 3. POSTa no webhook e aguarda resposta */
      const body = {
        plan_id: payload.plan_id,
        plan_slug: payload.plan_slug,
        plan_name: payload.plan_name,
        plan_price: payload.plan_price,
        company_id: company.id,
        company_name: company.name,
        cnpj: company.cnpj,
        address: company.address,
        business_area: company.business_area,
        current_plan_id: company.plan_id,
        current_plan_slug: company.plan,
        admin_user_id: adminUserId,
        admin_user_email: adminUserEmail,
        admin_user_name: adminUserName,
      };

      const resp = await fetch(GENERATE_LINK_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        throw new Error(`Webhook retornou HTTP ${resp.status}`);
      }

      const raw = await resp.json();
      console.log("[generate-link] webhook response:", raw);

      // Resposta pode vir como array ou objeto. Normaliza.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payloadResp: any = Array.isArray(raw) ? raw[0] : raw;

      // Normaliza chaves (case-insensitive, remove espaços/underscores)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const norm: Record<string, any> = {};
      for (const [k, v] of Object.entries(payloadResp ?? {})) {
        norm[k.toLowerCase().replace(/[\s_-]+/g, "")] = v;
      }

      const link: string | null = norm["link"] ?? null;
      const customerId: string | null = norm["clienteid"] ?? norm["customerid"] ?? null;
      const subscriptionId: string | null =
        norm["assinaturaid"] ?? norm["subscriptionid"] ?? null;
      const linkGerado = norm["linkgerado"];
      const retorno = String(norm["retorno"] ?? "").toLowerCase();

      const success =
        !!link &&
        (linkGerado === true ||
          linkGerado === "true" ||
          retorno === "sucesso" ||
          retorno === "success");

      if (!success || !link) {
        throw new Error(
          `Webhook não gerou link. Resposta: ${JSON.stringify(payloadResp).slice(0, 300)}`,
        );
      }

      /* 4. Salva no banco: atualiza plano + IDs + link */
      const { error: updateErr } = await supabase
        .from("companies")
        .update({
          plan: payload.plan_slug,
          plan_id: payload.plan_id,
          customer_id: customerId,
          subscription_id: subscriptionId,
          subscription_link: link,
        })
        .eq("id", payload.company_id);

      if (updateErr) {
        console.error("[generate-link] UPDATE companies failed:", updateErr);
        throw new Error("Link gerado mas falha ao salvar: " + updateErr.message);
      }

      return {
        link,
        customer_id: customerId,
        subscription_id: subscriptionId,
        raw: payloadResp,
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["admin-company"] });
      toast.success("Link de assinatura gerado e salvo!");
      navigator.clipboard
        .writeText(data.link)
        .then(() =>
          toast.info("Link copiado para a área de transferência"),
        )
        .catch(() => {});
    },
    onError: (err) =>
      toast.error("Erro ao gerar link: " + (err as Error).message),
  });
}

export function useExpireSubscriptionLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_links")
        .update({ status: "expired" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-links"] });
      toast.success("Link expirado!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

// ── Public: fetch link by token & sign ─────────────────────

export function useSubscriptionByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["subscription-link", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_links")
        .select("*, companies(name, logo_url)")
        .eq("token", token!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSignSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId }: { linkId: string }) => {
      const { data, error } = await supabase.rpc("accept_subscription_link", {
        _link_id: linkId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Erro ao aceitar link");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription-link"] });
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["company-plan"] });
      toast.success("Assinatura confirmada!");
    },
    onError: (err) => toast.error("Erro ao assinar: " + (err as Error).message),
  });
}

// ── Plans CRUD ────────────────────────────────────────────

// Retorna apenas planos TEMPLATE (sem company_id) — os modelos do sistema.
// Planos personalizados de empresas têm company_id setado e ficam invisíveis aqui.
export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .is("company_id", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// Plano personalizado de uma empresa específica (se houver).
// Usado pra mostrar/editar o plano vinculado a ela.
export function useCompanyCustomPlan(companyId: string | undefined) {
  return useQuery({
    queryKey: ["admin-company-custom-plan", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      description?: string | null;
      price?: number;
      price_label?: string;
      max_whatsapp_sessions?: number;
      max_users?: number;
      max_agents?: number;
      max_contacts?: number;
      ai_enabled?: boolean;
      priority_support?: boolean;
      custom_branding?: boolean;
      api_access?: boolean;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      const { error } = await supabase
        .from("plans")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["company-plan"] });
      toast.success("Plano atualizado!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

export function useUpdateCompanyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, planId, planSlug }: { companyId: string; planId: string; planSlug: string }) => {
      const { error } = await supabase
        .from("companies")
        .update({ plan: planSlug, plan_id: planId } as any)
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["company-plan"] });
      toast.success("Plano da empresa atualizado!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}
