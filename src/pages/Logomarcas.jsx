import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { enviarImagem } from "../lib/storage";
import { useEventosConfig } from "../context/EventosConfigContext";

const chaveNome = (nome) => String(nome || "").trim().toLowerCase();

export default function Logomarcas({ onFechar, notify }) {
  const { config, loading, salvar, recarregar } = useEventosConfig();
  const [equipe, setEquipe] = useState(config.equipe_operacao);
  const [enviando, setEnviando] = useState(false);
  const [salvandoEquipe, setSalvandoEquipe] = useState(false);
  // nomes removidos NESTA sessão de edição — para distinguir uma remoção
  // intencional (clicou em "✕") de uma pessoa que só ainda não tinha
  // chegado no estado local (ver comentário em salvarEquipe).
  const [removidos, setRemovidos] = useState(() => new Set());
  const primeiraCargaFeita = useRef(false);

  // Sincroniza a lista local com o banco só na carga inicial (quando o
  // loading termina pela primeira vez) — nunca de novo depois disso.
  // Sem esse controle, qualquer outro salvamento nesta mesma tela (ex.:
  // trocar a logo do clube) recarrega toda a config e, como o array de
  // equipe_operacao vem sempre como uma referência nova do banco, o
  // efeito disparava de novo no meio da edição e apagava silenciosamente
  // qualquer pessoa que você tivesse acabado de digitar e ainda não
  // salvo.
  useEffect(() => {
    if (!loading && !primeiraCargaFeita.current) {
      setEquipe(config.equipe_operacao);
      primeiraCargaFeita.current = true;
    }
  }, [loading, config.equipe_operacao]);

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
    const pessoa = equipe[i];
    if (pessoa?.nome) setRemovidos((prev) => new Set(prev).add(chaveNome(pessoa.nome)));
    setEquipe(equipe.filter((_, idx) => idx !== i));
  }

  async function salvarEquipe() {
    setSalvandoEquipe(true);
    try {
      // Salvar aqui não pode ser um "substituir tudo" ingênuo: como
      // "Salvar equipe" reaproveita o mesmo endpoint de "salvar" da
      // logo (que sempre recarrega toda a config), e como é comum
      // ter mais de uma aba/sessão do Logomarcas aberta ao mesmo
      // tempo, o estado local desta tela pode ficar um passo atrás do
      // banco. Por isso, buscamos o que está salvo AGORA no banco e
      // mesclamos: quem já existe lá mas não está na lista local (e
      // não foi removido de propósito nesta sessão) é adicionado de
      // volta, em vez de simplesmente sobrescrito.
      const { data, error: leituraErr } = await supabase
        .from("eventos_config")
        .select("valor")
        .eq("chave", "equipe_operacao")
        .single();
      if (leituraErr) throw leituraErr;

      const atualNoBanco = Array.isArray(data?.valor) ? data.valor : [];
      const nomesLocais = new Set(equipe.map((p) => chaveNome(p.nome)).filter(Boolean));
      const faltantes = atualNoBanco.filter(
        (p) => p.nome && !nomesLocais.has(chaveNome(p.nome)) && !removidos.has(chaveNome(p.nome))
      );
      const mesclado = [...equipe, ...faltantes];

      await salvar("equipe_operacao", mesclado);
      setEquipe(mesclado);
      setRemovidos(new Set());
      await recarregar();
      notify(
        "sucesso",
        faltantes.length > 0
          ? `Equipe atualizada (${faltantes.length} pessoa(s) de outra sessão foram mantidas).`
          : "Equipe de operação atualizada."
      );
    } catch (err) {
      notify("ruim", err.message || "Não foi possível salvar.");
    } finally {
      setSalvandoEquipe(false);
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
              na Ficha do evento e como opções de Responsável nas tarefas do Painel.
            </p>
            {loading ? (
              <p style={{ fontSize: 13, color: "var(--aco)" }}>Carregando…</p>
            ) : (
              <>
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
                  <button type="button" className="btn pequeno" onClick={salvarEquipe} disabled={loading || salvandoEquipe}>
                    {salvandoEquipe ? "Salvando…" : "Salvar equipe"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
