import { useState } from "react";
import { AlertTriangle, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Field } from "../components/Field";

export default function MinhaConta() {
  const { profile, trocarSenha } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setOk(false);

    if (novaSenha.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError("A confirmação não bate com a nova senha.");
      return;
    }
    if (novaSenha === senhaAtual) {
      setError("A nova senha precisa ser diferente da atual.");
      return;
    }

    setSaving(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      setOk(true);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err) {
      setError(err.message || "Não foi possível trocar a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-pad">
      <h2 className="view-title">Minha conta</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <p><strong>Nome:</strong> {profile?.nome}</p>
        <p><strong>E-mail:</strong> {profile?.email}</p>
        <p><strong>Perfil:</strong> {profile?.is_super_admin ? "Administrador do portal" : "Colaborador"}</p>
      </div>

      <h3 className="subtitle" style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 10px" }}>
        <Lock size={16} /> Trocar senha
      </h3>
      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Senha atual">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
          />
        </Field>
        <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
        </Field>
        <Field label="Confirmar nova senha">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
          />
        </Field>
        {error && <p className="form-error"><AlertTriangle size={14} /> {error}</p>}
        {ok && <p style={{ color: "var(--forest-dark)", fontSize: "0.85rem", margin: 0 }}>Senha alterada com sucesso.</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : <Lock size={16} />} Salvar nova senha
        </button>
      </form>
    </div>
  );
}
