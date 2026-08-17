import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { Lock, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { getModulo } from "../config/modulos";

export default function Home() {
  const { temAcesso, papelNoSetor } = useAuth();
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("setores").select("*").order("ordem");
      setSetores(data || []);
      setLoading(false);
    })();
  }, []);

  function abrirSetor(setor) {
    const modulo = getModulo(setor.chave);
    if (!modulo?.url) return; // "em breve" ou sem URL configurada ainda
    if (modulo.tipo === "link-externo") {
      window.location.href = modulo.url;
    } else if (modulo.tipo === "iframe") {
      navigate(`/modulo/${setor.chave}`);
    }
  }

  if (loading) {
    return (
      <div className="view-pad">
        <Loader2 className="spin" />
      </div>
    );
  }

  return (
    <div className="view-pad">
      <h2 className="view-title">Setores</h2>
      <div className="setor-grid">
        {setores.map((setor) => {
          const modulo = getModulo(setor.chave);
          const IconComp = Icons[modulo?.icone] || Icons.Layers;
          const acessoLiberado = temAcesso(setor.chave);
          const disponivel = setor.status === "ativo" && !!modulo?.url;
          const podeAbrir = acessoLiberado && disponivel;

          return (
            <button
              key={setor.chave}
              className="setor-card"
              disabled={!podeAbrir}
              onClick={() => podeAbrir && abrirSetor(setor)}
            >
              <span className="setor-icon">
                <IconComp size={22} />
              </span>
              <span className="setor-info">
                <p className="setor-nome">{setor.nome}</p>
                <p className="setor-desc">{setor.descricao}</p>
              </span>
              {!acessoLiberado ? (
                <span className="setor-badge" title="Você não tem acesso a este setor">
                  <Lock size={12} />
                </span>
              ) : (
                <span className={`setor-badge ${disponivel ? "setor-badge-ativo" : ""}`}>
                  {disponivel ? papelNoSetor(setor.chave) : "em breve"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
