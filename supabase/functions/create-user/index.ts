// =====================================================================
// Edge Function: create-user
// ---------------------------------------------------------------------
// Cria um colaborador novo (auth.users + profiles + acessos_setor).
// É a ÚNICA forma correta de um admin criar usuário: roda no servidor,
// usa a service_role key (nunca sai do ambiente do Supabase) e confirma
// que quem está chamando é, de fato, um super admin autenticado antes
// de fazer qualquer coisa.
//
// Deploy:
//   supabase functions deploy create-user
//
// Chamada do front-end (veja src/pages/AdminUsuarios.jsx):
//   supabase.functions.invoke("create-user", {
//     body: { nome, email, senha, acessos: [{ setor_chave, papel }] },
//     headers: { Authorization: `Bearer ${sessionAccessToken}` }
//   })
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    // 1. Identifica quem está chamando, usando o token JWT do próprio
    //    usuário (não a service_role) — isso garante que estamos
    //    validando a sessão real de quem fez a requisição.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerToken = authHeader.replace("Bearer ", "");
    if (!callerToken) return json({ error: "Não autenticado." }, 401);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
    });
    const { data: callerUser, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerUser?.user) return json({ error: "Sessão inválida." }, 401);

    // 2. Confirma que quem chamou é super admin, consultando profiles
    //    com o client "admin" (service role), já que essa checagem
    //    precisa ser confiável e não depender de RLS do lado do caller.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("is_super_admin, ativo")
      .eq("id", callerUser.user.id)
      .single();

    if (!callerProfile?.is_super_admin || !callerProfile?.ativo) {
      return json({ error: "Apenas administradores podem criar usuários." }, 403);
    }

    // 3. Valida o corpo da requisição.
    const body = await req.json();
    const nome = String(body?.nome ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const senha = String(body?.senha ?? "");
    const acessos = Array.isArray(body?.acessos) ? body.acessos : [];

    if (!nome || !email || senha.length < 6) {
      return json({ error: "Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios." }, 400);
    }
    const setoresValidos = new Set(["eventos", "patrimonio", "rh", "financeiro", "secretaria"]);
    const papeisValidos = new Set(["admin", "colaborador", "leitor"]);
    for (const a of acessos) {
      if (!setoresValidos.has(a.setor_chave) || !papeisValidos.has(a.papel)) {
        return json({ error: `Acesso inválido: ${JSON.stringify(a)}` }, 400);
      }
    }

    // 4. Cria o usuário no Auth já com e-mail confirmado (fluxo interno,
    //    sem necessidade de e-mail de verificação para colaboradores
    //    cadastrados manualmente pelo RH/admin).
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (createErr) return json({ error: createErr.message }, 400);

    const newUserId = created.user.id;

    // 5. Cria o profile e os acessos por setor.
    const { error: profileErr } = await adminClient.from("profiles").insert({
      id: newUserId,
      nome,
      email,
      ativo: true,
      is_super_admin: false,
    });
    if (profileErr) {
      // rollback best-effort: remove o usuário órfão do Auth
      await adminClient.auth.admin.deleteUser(newUserId);
      return json({ error: profileErr.message }, 400);
    }

    if (acessos.length > 0) {
      const rows = acessos.map((a: { setor_chave: string; papel: string }) => ({
        user_id: newUserId,
        setor_chave: a.setor_chave,
        papel: a.papel,
      }));
      const { error: acessosErr } = await adminClient.from("acessos_setor").insert(rows);
      if (acessosErr) return json({ error: acessosErr.message }, 400);
    }

    return json({ ok: true, user_id: newUserId });
  } catch (err) {
    return json({ error: (err as Error).message ?? "Erro inesperado." }, 500);
  }
});
