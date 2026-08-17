import { useState } from "react";
import { enviarImagem } from "../lib/storage";
import { useEventosConfig } from "../lib/useEventosConfig";

export default function Logomarcas({ onFechar, notify }) {
  const { config, salvar, recarregar } = useEventosConfig();
  const [equipe, setEquipe] = useState(config.equipe_operacao);
  const [enviando, setEnviando] = useState(false);

  async function handleLogoClube(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviando(true);
    try {
      const url = await enviarImagem(arquivo, "clube");
      await salvar("logo_clube_url", url);
      notify("sucesso", "Logo do clube atualizada.");
    } catch (err) {
      notify("ruim", err.message || "Falha ao enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  function atualizarLinha(i, campo, valor) {
    const copia = [...equipe];
    copia[i] = { ...copia[i], [campo]: valor };
    setEquipe(copia);
  }
  function addLinha() {
    setEquipe((e) => [...e, { nome: "", telefone: "", area: "" }]);
  }
  function removerLinha(i) {
    setEquipe(equipe.filter((_, idx) => idx !== i));
  }

  async function salvarEquipe() {
    try {
      await salvar("equipe_operacao", equipe);
      await recarregar();
      notify("sucesso", "Equipe de operação atualizada.");
    } catch (err) {
      notify("ruim", err.message || "Não foi possível salvar.");
    }
  }

  return (
    <div className="fundo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="cartao" style={{ maxWidth: 640 }}>
        <div className="topo-cartao">
          <h2>Logomarcas e equipe de operação</h2>
          <button className="icone" onClick={onFechar}>✕</button>
        </div>
        <div className="conteudo" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section>
            <h3 className="secaoFicha">Logo do clube</h3>
            <p style={{ fontSize: 12.5, color: "var(--aco)" }}>
              Usada como padrão nos relatórios pré e pós-evento, quando o evento não tiver logo própria.
            </p>
            <input type="file" accept="image/*" onChange={handleLogoClube} disabled={enviando} />
            {config.logo_clube_url && <div className="logoPreview"><img src={config.logo_clube_url} alt="Logo do clube" /></div>}
          </section>

          <section>
            <h3 className="secaoFicha">Equipe de operação do clube</h3>
            <p style={{ fontSize: 12.5, color: "var(--aco)" }}>
              Lista padrão de contatos operacionais (portaria, manutenção, cozinha etc.) usada como sugestão
              na Ficha do evento.
            </p>
            {equipe.map((r, i) => (
              <div key={i} className="linhaFicha">
                <input placeholder="Nome" value={r.nome} onChange={(e) => atualizarLinha(i, "nome", e.target.value)} />
                <input placeholder="Telefone" value={r.telefone} onChange={(e) => atualizarLinha(i, "telefone", e.target.value)} />
                <input placeholder="Área" value={r.area} onChange={(e) => atualizarLinha(i, "area", e.target.value)} />
                <button type="button" className="icone" onClick={() => removerLinha(i)}>✕</button>
              </div>
            ))}
            <div className="fimLinha">
              <button type="button" className="btn linha pequeno" onClick={addLinha}>+ Adicionar</button>
              <button type="button" className="btn pequeno" onClick={salvarEquipe}>Salvar equipe</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
