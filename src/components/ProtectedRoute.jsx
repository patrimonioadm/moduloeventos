import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }) {
  const { loading, session, papel, profile } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <p>Carregando…</p>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.ativo === false) return <Navigate to="/login" replace />;
  if (!papel) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p>
            Sua conta não tem acesso ao setor de Eventos. Peça a um administrador do portal para
            liberar seu acesso em <strong>Usuários</strong>.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
