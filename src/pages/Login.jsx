import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LogIn, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Field } from "../components/Field";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setLoading(false);
    if (err) {
      // Mensagem genérica de propósito — não revelar se o e-mail existe
      // ou não (evita enumeração de contas).
      setError("E-mail ou senha inválidos.");
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-mark">
          <div className="brand-ring">DKP</div>
          <div>
            <p className="brand-title">Portal DKP</p>
            <p className="brand-sub">Deutscher Klub Pernambuco</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <Field label="E-mail">
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.nome@dkp.org.br"
            />
          </Field>
          <Field label="Senha">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          {error && (
            <p className="form-error">
              <AlertTriangle size={14} /> {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />} Entrar
          </button>
        </form>

        <p className="login-hint">
          Não tem conta? Peça a um administrador do clube para te cadastrar.
        </p>
      </div>
    </div>
  );
}
