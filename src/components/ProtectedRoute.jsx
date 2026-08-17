import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * requireSetor: se passado, exige que o usuário tenha ALGUM papel
 * nesse setor (via acessos_setor ou is_super_admin).
 * requireSuperAdmin: exige is_super_admin=true (tela de Usuários).
 */
export function ProtectedRoute({ children, requireSetor, requireSuperAdmin }) {
  const { loading, session, profile, temAcesso, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <Loader2 className="spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (profile && profile.ativo === false) return <Navigate to="/login" replace />;
  if (requireSuperAdmin && !isSuperAdmin) return <Navigate to="/" replace />;
  if (requireSetor && !temAcesso(requireSetor)) return <Navigate to="/" replace />;

  return children;
}
