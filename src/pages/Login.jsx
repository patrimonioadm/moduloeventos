import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  // Segunda camada de segurança: se a pessoa já tem sessão válida (ex.:
  // voltou pra /login manualmente, ou o signIn resolveu antes do
  // navigate() abaixo terminar de disparar), manda pro painel direto.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
  }, [navigate]);

  async function entrar(e) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="marca" style={{ color: "var(--tinta)", marginBottom: 20 }}>
          Painel de Produção
          <span>Eventos · Deutscher Klub Pernambuco</span>
        </div>
        <form onSubmit={entrar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="campo">
            <label>E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="campo">
            <label>Senha</label>
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </div>
          {erro && <p className="erroCampo">{erro}</p>}
          <button className="btn" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
        </form>
        <p style={{ fontSize: 12.5, color: "var(--aco)", marginTop: 18, textAlign: "center" }}>
          Acesso liberado apenas para colaboradores do clube, cadastrados pelo administrador do portal.
        </p>
      </div>
    </div>
  );
}
