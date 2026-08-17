import { useParams, Navigate } from "react-router-dom";
import { getModulo } from "../config/modulos";
import { useAuth } from "../context/AuthContext";

// Embuti via <iframe sandbox> para isolar o módulo estático do resto do
// portal: ele não recebe acesso ao DOM/JS do portal e vice-versa. Se o
// módulo precisar saber quem é o usuário logado, passe isso de forma
// explícita por querystring/postMessage — nunca via window global
// compartilhado.
export default function ModuloIframe() {
  const { chave } = useParams();
  const { temAcesso } = useAuth();
  const modulo = getModulo(chave);

  if (!modulo || modulo.tipo !== "iframe" || !modulo.url) return <Navigate to="/" replace />;
  if (!temAcesso(chave)) return <Navigate to="/" replace />;

  return (
    <div className="iframe-wrap">
      <iframe
        src={modulo.url}
        title={chave}
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
        loading="lazy"
      />
    </div>
  );
}
