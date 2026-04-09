import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── MAIN ────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    /* ─── 1. ENV ──────────────────────────────────────── */
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    /* ─── 2. AUTH — validate caller JWT ───────────────── */
    const jwt =
      req.headers.get("authorization")?.replace("Bearer ", "") ??
      req.headers.get("Authorization")?.replace("Bearer ", "") ??
      "";

    if (!jwt) return fail("Token ausente", 401);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user: caller },
      error: authErr,
    } = await userClient.auth.getUser();

    if (authErr || !caller) {
      console.error("auth error:", authErr?.message);
      return fail("Token inválido ou expirado", 401);
    }

    /* ─── 3. CALLER PROFILE (company_id) ──────────────── */
    const { data: callerProfile, error: profileErr } = await userClient
      .from("profiles")
      .select("company_id")
      .eq("id", caller.id)
      .single();

    if (profileErr || !callerProfile?.company_id) {
      console.error("profile error:", profileErr?.message);
      return fail("Você não está vinculado a nenhuma empresa");
    }

    const companyId: string = callerProfile.company_id;

    /* ─── 4. PARSE INPUT ──────────────────────────────── */
    const body = await req.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const role = String(body.role ?? "");

    if (!email || !email.includes("@")) return fail("Email inválido");
    if (role !== "agent" && role !== "viewer")
      return fail("Cargo inválido (use agent ou viewer)");

    /* ─── 5. ADMIN CLIENT (bypasses RLS) ──────────────── */
    const admin = createClient(url, serviceKey);

    /* ─── 6. COMPANY INFO ─────────────────────────────── */
    const { data: company } = await admin
      .from("companies")
      .select("name, invite_code")
      .eq("id", companyId)
      .single();

    if (!company) return fail("Empresa não encontrada");

    /* ─── 7. CHECK IF EMAIL ALREADY EXISTS ────────────── */
    //    GoTrue REST API — server-side filter, fast
    let existingUser: { id: string; email: string } | null = null;

    try {
      const listRes = await fetch(
        `${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=50`,
        {
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        },
      );
      if (listRes.ok) {
        const listBody = await listRes.json();
        existingUser =
          (listBody.users ?? []).find(
            (u: { email?: string }) =>
              u.email?.toLowerCase() === email,
          ) ?? null;
      }
    } catch (e) {
      console.error("listUsers fetch error:", e);
      // Continue — will try inviteUserByEmail which will also tell us
    }

    /* ─── 8A. EXISTING USER → add to team directly ───── */
    if (existingUser) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, company_id")
        .eq("id", existingUser.id)
        .maybeSingle();

      if (profile?.company_id === companyId) {
        return fail("Este usuário já faz parte da sua equipe");
      }
      if (profile?.company_id) {
        return fail("Este usuário já pertence a outra empresa");
      }

      // Assign company
      if (profile) {
        const { error: e } = await admin
          .from("profiles")
          .update({ company_id: companyId })
          .eq("id", existingUser.id);
        if (e) return fail("Erro ao vincular à empresa: " + e.message);
      } else {
        // Profile missing (trigger may have failed) — create it
        const { error: e } = await admin
          .from("profiles")
          .insert({ id: existingUser.id, full_name: "", company_id: companyId });
        if (e) return fail("Erro ao criar perfil: " + e.message);
      }

      // Assign role (delete old → insert new)
      await admin.from("user_roles").delete().eq("user_id", existingUser.id);
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: existingUser.id, role });
      if (roleErr) return fail("Erro ao atribuir cargo: " + roleErr.message);

      return ok({
        ok: true,
        message: `${email} foi adicionado à equipe`,
        user_id: existingUser.id,
      });
    }

    /* ─── 8B. NEW USER → invite via Supabase Auth ────── */
    const siteUrl = Deno.env.get("SITE_URL") || "https://app.bescale.ai";
    const redirectTo = `${siteUrl}/accept-invite`;

    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: "",
          invite_company_id: companyId,
          invite_role: role,
        },
        redirectTo,
      });

    // If inviteUserByEmail fails, try generateLink as fallback
    if (inviteErr) {
      console.error("inviteUserByEmail failed:", inviteErr.message);

      const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({
          type: "invite",
          email,
          options: {
            data: {
              full_name: "",
              invite_company_id: companyId,
              invite_role: role,
            },
            redirectTo,
          },
        });

      if (linkErr || !linkData?.user) {
        console.error("generateLink also failed:", linkErr?.message);
        return fail("Erro ao criar convite: " + (inviteErr.message || "erro desconhecido"));
      }

      // generateLink succeeded — user created, assign company + role
      const userId = linkData.user.id;
      await admin.from("profiles").update({ company_id: companyId }).eq("id", userId);
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").insert({ user_id: userId, role });

      // Return the link so admin can share manually
      const inviteLink = linkData.properties?.action_link || "";
      return ok({
        ok: true,
        message: `Usuário criado. O email automático pode não ter sido enviado. Compartilhe o link manualmente.`,
        invite_link: inviteLink,
        user_id: userId,
      });
    }

    // inviteUserByEmail succeeded — assign company + role
    const newUserId = invited.user?.id;
    if (newUserId) {
      await admin
        .from("profiles")
        .update({ company_id: companyId })
        .eq("id", newUserId);

      await admin.from("user_roles").delete().eq("user_id", newUserId);
      await admin
        .from("user_roles")
        .insert({ user_id: newUserId, role });
    }

    return ok({
      ok: true,
      message: `Convite enviado para ${email}`,
      user_id: newUserId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("invite-member unhandled:", msg);
    return fail(msg);
  }
});
