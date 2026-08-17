import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Field } from "../components/Field";

const SETORES_DISPONIVEIS = [
  { chave: "eventos", nome: "Eventos" },
  { chave: "patrimonio", nome: "Patrimônio" },
  { chave: "rh", nome: "RH" },
  { chave: "financeiro", nome: "Financeiro" },
  { chave: "secretaria", nome: "Secretaria" },
];
const PAPEIS = ["leitor", "colaborador", "admin"];

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [acessosSelecionados, setAcessosSelecionados] = useState({}); // { setor_chave: papel|"" }
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function carregarUsuarios() {
    setLoadingLista(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, email, ativo, is_super_admin")
      .order("nome");
    setUsuarios(data || []);
    setLoadingLista(false);
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  function toggleSetor(chave, papel) {
    setAcessosSelecionados((prev) => {
      const next = { ...prev };
      if (papel === "") delete next[chave];
      else next[chave] = papel;
      return next;
    });
  }

  async function handleCriarUsuario(e) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || senha.length < 6) return;
    setSaving(true);
    setFormError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const acessos = Object.entries(acessosSelecionados).map(([setor_chave, papel]) => ({
        setor_chave,
        papel,
      }));

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { nome: nome.trim(), email: email.trim(), senha, acessos },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (error) throw new Error(error.message || "Erro ao criar usuário.");
      if (data?.error) throw new Error(data.error);

      setNome("");
      setEmail("");
      setSenha("");
      setAcessosSelecionados({});
      await carregarUsuarios();
    } catch (err) {
      setFormError(err.message || "Não foi possível criar o usuário.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(id, ativoAtual) {
    const { error } = await supabase.from("profiles").update({ ativo: !ativoAtual }).eq("id", id);
    if (!error) carregarUsuarios();
  }

  return (
    <div className="view-pad">
      <h2 className="view-title">Usuários</h2>

      {loadingLista ? (
        <Loader2 className="spin" />
      ) : (
        <ul style={{ listStyle: "none", margin: "0 0 20px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {usuarios.map((u) => (
            <li
              key={u.id}
              className="card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", opacity: u.ativo ? 1 : 0.55 }}
            >
              <div>
                <strong>{u.nome}</strong>
                <div style={{ fontSize: "0.75rem", color: "#7c8a80" }}>{u.email}</div>
              </div>
              <button
                className={`btn btn-sm ${u.ativo ? "btn-ghost" : "btn-primary"}`}
                onClick={() => handleToggleAtivo(u.id, u.ativo)}
              >
                {u.ativo ? "Desativar" : "Reativar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 10px" }}>
        <UserPlus size={16} /> Novo usuário
      </h3>
      <form onSubmit={handleCriarUsuario} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome">
          <input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Field>
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Senha provisória" hint="O usuário poderá trocá-la depois do primeiro login, em Minha Conta.">
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
        </Field>

        <div className="field">
          <span className="field-label">Acesso por setor</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {SETORES_DISPONIVEIS.map((s) => (
              <div key={s.chave} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: "0.85rem" }}>{s.nome}</span>
                <select
                  value={acessosSelecionados[s.chave] || ""}
                  onChange={(e) => toggleSetor(s.chave, e.target.value)}
                >
                  <option value="">Sem acesso</option>
                  {PAPEIS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {formError && <p className="form-error"><AlertTriangle size={14} /> {formError}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />} Criar usuário
        </button>
      </form>
    </div>
  );
}
