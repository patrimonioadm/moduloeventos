import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { enviarImagem } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { useEventos } from "../context/EventosContext";
import { AREAS_FUNCIONAMENTO } from "../lib/dominio";

function useCampo(inicial) {
  const [v, setV] = useState(inicial);
  return [v, setV];
}

export default function FichaEvento({ onFechar, notify }) {
  const { podeAdministrar } = useAuth();
  const { evento, eventoId, recarregarEventos } = useEventos();

  const [carregado, setCarregado] = useState(false);
  const [horaInicio, setHoraInicio] = useCampo("");
  const [horaFim, setHoraFim] = useCampo("");
  const [descricao, setDescricao] = useCampo("");
  const [publico, setPublico] = useCampo("");
  const [logoEventoUrl, setLogoEventoUrl] = useCampo(null);
  const [funcionamento, setFuncionamento] = useState([]);
  const [patrocinadores, setPatrocinadores] = useState([]);
  const [programacao, setProgramacao] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const somenteLeitura = !podeAdministrar;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("eventos").select("*").eq("id", eventoId).single();
      if (data) {
        setHoraInicio(data.hora_inicio || "");
        setHoraFim(data.hora_fim || "");
        setDescricao(data.descricao || "");
        setPublico(data.publico || "");
        setLogoEventoUrl(data.logo_evento_url || null);
        setFuncionamento(
          AREAS_FUNCIONAMENTO.map((area) => {
            const existente = (data.funcionamento || []).find((f) => f.area === area);
            return existente || { area, horario: "", obs: "" };
          })
        );
        setPatrocinadores(data.patrocinadores || []);
        setProgramacao(data.programacao || []);
        setResponsaveis(data.responsaveis || []);
      }
      setCarregado(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId]);

  async function handleLogoEvento(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    try {
      const url = await enviarImagem(arquivo, `evento/${eventoId}`);
      setLogoEventoUrl(url);
    } catch (err) {
      setErro(err.message || "Falha ao enviar a imagem.");
    }
  }

  async function handleLogoPatrocinador(index, e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    try {
      const url = await enviarImagem(arquivo, `patrocinador/${eventoId}`);
      const copia = [...patrocinadores];
      copia[index] = { ...copia[index], logoUrl: url };
      setPatrocinadores(copia);
    } catch (err) {
      setErro(err.message || "Falha ao enviar a imagem.");
    }
  }

  function addPatrocinador() {
    setPatrocinadores((p) => [...p, { nome: "", logoUrl: null }]);
  }
  function addProgramacao() {
    setProgramacao((p) => [...p, { nome: "", horario: "" }]);
  }
  function addResponsavel() {
    setResponsaveis((p) => [...p, { nome: "", telefone: "", area: "" }]);
  }
  function remover(lista, setLista, index) {
    setLista(lista.filter((_, i) => i !== index));
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const { error } = await supabase
        .from("eventos")
        .update({
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          descricao,
          publico,
          logo_evento_url: logoEventoUrl,
          funcionamento,
          patrocinadores,
          programacao,
          responsaveis,
        })
        .eq("id", eventoId);
      if (error) throw error;
      notify("sucesso", "Ficha do evento salva.");
      await recarregarEventos();
      onFechar();
    } catch (err) {
      setErro(err.message || "Não foi possível salvar a ficha.");
    } finally {
      setSalvando(false);
    }
  }

  if (!carregado) return null;

  return (
    <div className="fundo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="cartao" style={{ maxWidth: 720 }}>
        <div className="topo-cartao">
          <h2>Ficha do evento — {evento?.nome}</h2>
          <button className="icone" onClick={onFechar}>✕</button>
        </div>
        <form onSubmit={salvar} className="conteudo" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {somenteLeitura && (
            <p style={{ fontSize: 12.5, color: "var(--aco)", margin: 0 }}>
              Você tem acesso somente leitura a esta ficha. Peça a um administrador para editar.
            </p>
          )}

          <section>
            <h3 className="secaoFicha">Dados gerais</h3>
            <div className="grade">
              <div className="campo">
                <label>Horário de início</label>
                <input type="time" value={horaInicio} disabled={somenteLeitura} onChange={(e) => setHoraInicio(e.target.value)} />
              </div>
              <div className="campo">
                <label>Horário de término</label>
                <input type="time" value={horaFim} disabled={somenteLeitura} onChange={(e) => setHoraFim(e.target.value)} />
              </div>
              <div className="campo" style={{ gridColumn: "1 / -1" }}>
                <label>Público esperado</label>
                <input value={publico} disabled={somenteLeitura} onChange={(e) => setPublico(e.target.value)} placeholder="Ex.: 300 pessoas" />
              </div>
              <div className="campo" style={{ gridColumn: "1 / -1" }}>
                <label>Descrição</label>
                <textarea rows={3} value={descricao} disabled={somenteLeitura} onChange={(e) => setDescricao(e.target.value)} />
              </div>
            </div>
            {!somenteLeitura && (
              <div className="campo" style={{ marginTop: 10 }}>
                <label>Logomarca do evento</label>
                <input type="file" accept="image/*" onChange={handleLogoEvento} />
                {logoEventoUrl && <div className="logoPreview"><img src={logoEventoUrl} alt="Logo do evento" /></div>}
              </div>
            )}
          </section>

          <section>
            <h3 className="secaoFicha">Funcionamento das áreas do clube</h3>
            {funcionamento.map((f, i) => (
              <div key={f.area} className="linhaFicha">
                <strong>{f.area}</strong>
                <input
                  placeholder="Horário"
                  value={f.horario}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...funcionamento];
                    copia[i] = { ...copia[i], horario: e.target.value };
                    setFuncionamento(copia);
                  }}
                />
                <input
                  placeholder="Observação"
                  value={f.obs}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...funcionamento];
                    copia[i] = { ...copia[i], obs: e.target.value };
                    setFuncionamento(copia);
                  }}
                />
              </div>
            ))}
          </section>

          <section>
            <h3 className="secaoFicha">Patrocinadores</h3>
            {patrocinadores.map((p, i) => (
              <div key={i} className="linhaFicha coluna">
                <div className="grade">
                  <input
                    placeholder="Nome do patrocinador"
                    value={p.nome}
                    disabled={somenteLeitura}
                    onChange={(e) => {
                      const copia = [...patrocinadores];
                      copia[i] = { ...copia[i], nome: e.target.value };
                      setPatrocinadores(copia);
                    }}
                  />
                  {!somenteLeitura && <input type="file" accept="image/*" onChange={(e) => handleLogoPatrocinador(i, e)} />}
                </div>
                {p.logoUrl && <img className="logoMini" src={p.logoUrl} alt={p.nome} />}
                {!somenteLeitura && (
                  <div className="fimLinha">
                    <button type="button" className="btn linha pequeno" onClick={() => remover(patrocinadores, setPatrocinadores, i)}>Remover</button>
                  </div>
                )}
              </div>
            ))}
            {!somenteLeitura && <button type="button" className="btn linha pequeno" onClick={addPatrocinador}>+ Adicionar patrocinador</button>}
          </section>

          <section>
            <h3 className="secaoFicha">Programação</h3>
            {programacao.map((p, i) => (
              <div key={i} className="linhaFicha">
                <input
                  placeholder="Atração / atividade"
                  value={p.nome}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...programacao];
                    copia[i] = { ...copia[i], nome: e.target.value };
                    setProgramacao(copia);
                  }}
                />
                <input
                  placeholder="Horário"
                  value={p.horario}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...programacao];
                    copia[i] = { ...copia[i], horario: e.target.value };
                    setProgramacao(copia);
                  }}
                />
                {!somenteLeitura && <button type="button" className="icone" onClick={() => remover(programacao, setProgramacao, i)}>✕</button>}
              </div>
            ))}
            {!somenteLeitura && <button type="button" className="btn linha pequeno" onClick={addProgramacao}>+ Adicionar item</button>}
          </section>

          <section>
            <h3 className="secaoFicha">Equipe responsável no evento</h3>
            {responsaveis.map((r, i) => (
              <div key={i} className="linhaFicha">
                <input
                  placeholder="Nome"
                  value={r.nome}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...responsaveis];
                    copia[i] = { ...copia[i], nome: e.target.value };
                    setResponsaveis(copia);
                  }}
                />
                <input
                  placeholder="Telefone"
                  value={r.telefone}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...responsaveis];
                    copia[i] = { ...copia[i], telefone: e.target.value };
                    setResponsaveis(copia);
                  }}
                />
                <input
                  placeholder="Área de atuação"
                  value={r.area}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...responsaveis];
                    copia[i] = { ...copia[i], area: e.target.value };
                    setResponsaveis(copia);
                  }}
                />
                {!somenteLeitura && <button type="button" className="icone" onClick={() => remover(responsaveis, setResponsaveis, i)}>✕</button>}
              </div>
            ))}
            {!somenteLeitura && <button type="button" className="btn linha pequeno" onClick={addResponsavel}>+ Adicionar responsável</button>}
          </section>

          {erro && <p className="erroCampo">{erro}</p>}
          <div className="rodapeCartao">
            {!somenteLeitura && <button type="submit" className="btn" disabled={salvando}>{salvando ? "Salvando…" : "Salvar ficha"}</button>}
            <button type="button" className="btn linha" onClick={onFechar}>{somenteLeitura ? "Fechar" : "Cancelar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
