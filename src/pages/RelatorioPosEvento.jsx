import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useEventos } from "../context/EventosContext";
import { useEventosConfig } from "../lib/useEventosConfig";
import { dataBR, dinheiro, SITUACOES_POS } from "../lib/dominio";
import "../styles/relatorio.css";

const POS_VAZIO = { publicoReal: "", pontosPositivos: [""], pontosNegativos: [""], opiniaoDiretoria: "", opiniaoSocios: "", npsNota: "" };

export default function RelatorioPosEvento({ onFechar, notify }) {
  const { podeAdministrar } = useAuth();
  const { eventoId, tarefas } = useEventos();
  const { config } = useEventosConfig();
  const [dadosEvento, setDadosEvento] = useState(null);
  const [pos, setPos] = useState(POS_VAZIO);
  const [situacoesProgramacao, setSituacoesProgramacao] = useState([]);
  const [patrociniosPos, setPatrociniosPos] = useState([]); // [{ valorRecebido, obs }]
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("eventos").select("*").eq("id", eventoId).single();
      if (data) {
        setDadosEvento(data);
        setPos({ ...POS_VAZIO, ...(data.pos_evento || {}) });
        setSituacoesProgramacao((data.programacao || []).map((p) => p.situacao || "nao_avaliado"));
        setPatrociniosPos((data.patrocinadores || []).map((p) => ({ valorRecebido: p.valorRecebido || "", obs: p.obsPos || "" })));
      }
    })();
  }, [eventoId]);

  async function salvar() {
    setSalvando(true);
    try {
      const programacaoAtualizada = (dadosEvento.programacao || []).map((p, i) => ({
        ...p, situacao: situacoesProgramacao[i],
      }));
      const patrocinadoresAtualizados = (dadosEvento.patrocinadores || []).map((p, i) => ({
        ...p, valorRecebido: patrociniosPos[i]?.valorRecebido || "", obsPos: patrociniosPos[i]?.obs || "",
      }));
      const { error } = await supabase
        .from("eventos")
        .update({ pos_evento: pos, programacao: programacaoAtualizada, patrocinadores: patrocinadoresAtualizados })
        .eq("id", eventoId);
      if (error) throw error;
      notify("sucesso", "Resultado do pós-evento salvo.");
    } catch (err) {
      notify("ruim", err.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function atualizarLista(campo, index, valor) {
    setPos((p) => {
      const copia = [...p[campo]];
      copia[index] = valor;
      return { ...p, [campo]: copia };
    });
  }
  function addItemLista(campo) {
    setPos((p) => ({ ...p, [campo]: [...p[campo], ""] }));
  }

  if (!dadosEvento) return null;

  const total = tarefas.filter((t) => t.status !== "nao_aprovado").reduce((s, t) => s + (Number(t.valor) || 0), 0);

  return (
    <div className="fundo" style={{ padding: 0, alignItems: "flex-start" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 900, margin: "0 auto", minHeight: "100vh" }}>
        <div className="rel-toolbar naoImprime">
          {podeAdministrar && <button className="btn" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar resultado"}</button>}
          <button className="btn linha" onClick={() => window.print()}>Imprimir / salvar PDF</button>
          <button className="btn linha" onClick={onFechar}>Fechar</button>
        </div>

        <div className="rel-doc rel">
          <div className="barraTopo pos" />
          <div className="rel-header pos">
            {config.logo_clube_url && <img className="logoClube" src={config.logo_clube_url} alt="Logo do clube" />}
            <div className="rel-titulo">
              <div className="ano">{dadosEvento.data ? new Date(dadosEvento.data + "T12:00:00").getFullYear() : ""}</div>
              <h1>{dadosEvento.nome}</h1>
              <div className="subtitulo">Relatório pós-evento</div>
            </div>
          </div>

          <section>
            <div className="tiraInfo">
              <div><span>Data</span><b>{dataBR(dadosEvento.data)}</b></div>
              <div><span>Público esperado</span><b>{dadosEvento.publico || "—"}</b></div>
              <div>
                <span>Público real</span>
                {podeAdministrar && (
                  <input className="campoInline naoImprime" value={pos.publicoReal}
                    onChange={(e) => setPos((p) => ({ ...p, publicoReal: e.target.value }))} />
                )}
                <b>{pos.publicoReal || "—"}</b>
              </div>
            </div>
          </section>

          {(dadosEvento.patrocinadores || []).length > 0 && (
            <section>
              <h2>Patrocínio — previsto × recebido</h2>
              <table>
                <thead><tr><th>Patrocinador</th><th className="dir">Previsto</th><th className="dir">Recebido</th><th>Observação</th></tr></thead>
                <tbody>
                  {dadosEvento.patrocinadores.map((p, i) => (
                    <tr key={i}>
                      <td>{p.nome}</td>
                      <td className="dir">{p.valor ? dinheiro(p.valor) : "—"}</td>
                      <td className="dir">
                        {podeAdministrar ? (
                          <input
                            type="number" step="0.01" min="0" className="campoInline naoImprime"
                            value={patrociniosPos[i]?.valorRecebido || ""}
                            onChange={(e) => {
                              const copia = [...patrociniosPos];
                              copia[i] = { ...copia[i], valorRecebido: e.target.value };
                              setPatrociniosPos(copia);
                            }}
                          />
                        ) : null}
                        <span>{patrociniosPos[i]?.valorRecebido ? dinheiro(patrociniosPos[i].valorRecebido) : "não informado"}</span>
                      </td>
                      <td>
                        {podeAdministrar ? (
                          <input
                            className="campoInline naoImprime"
                            value={patrociniosPos[i]?.obs || ""}
                            onChange={(e) => {
                              const copia = [...patrociniosPos];
                              copia[i] = { ...copia[i], obs: e.target.value };
                              setPatrociniosPos(copia);
                            }}
                          />
                        ) : null}
                        <span>{patrociniosPos[i]?.obs || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {(dadosEvento.programacao || []).length > 0 && (
            <section>
              <h2>Programação — realizado</h2>
              <table>
                <thead><tr><th>Horário</th><th>Atividade</th><th>Situação</th></tr></thead>
                <tbody>
                  {dadosEvento.programacao.map((p, i) => (
                    <tr key={i}>
                      <td>{p.horario}</td>
                      <td>{p.nome}</td>
                      <td>
                        {podeAdministrar && (
                          <select
                            className="naoImprime"
                            value={situacoesProgramacao[i]}
                            onChange={(e) => {
                              const copia = [...situacoesProgramacao];
                              copia[i] = e.target.value;
                              setSituacoesProgramacao(copia);
                            }}
                          >
                            {Object.entries(SITUACOES_POS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        )}
                        <span className={`sit sit-${situacoesProgramacao[i]}`}>{SITUACOES_POS[situacoesProgramacao[i]]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section>
            <h2>Despesas realizadas</h2>
            <table>
              <thead><tr><th>Atividade</th><th>Empresa</th><th className="dir">Valor</th><th>Status</th></tr></thead>
              <tbody>
                {tarefas.map((t) => (
                  <tr key={t.id}>
                    <td>{t.titulo}</td>
                    <td>{t.empresa || "—"}</td>
                    <td className="dir">{t.valor ? dinheiro(t.valor) : "—"}</td>
                    <td>{t.status}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={2}>Total aprovado</td><td className="dir">{dinheiro(total)}</td><td /></tr></tfoot>
            </table>
          </section>

          <section>
            <h2>Avaliação</h2>
            <div className="doisLados">
              <div className="lado positivo">
                <div className="ladoTitulo">Pontos positivos</div>
                <ul>{pos.pontosPositivos.map((v, i) => <li key={i}>{v || <span className="semDado">—</span>}</li>)}</ul>
                {podeAdministrar && (
                  <>
                    {pos.pontosPositivos.map((v, i) => (
                      <input key={i} className="campoInline naoImprime" style={{ marginBottom: 4 }} value={v}
                        onChange={(e) => atualizarLista("pontosPositivos", i, e.target.value)} />
                    ))}
                    <button type="button" className="btn linha pequeno naoImprime" onClick={() => addItemLista("pontosPositivos")}>+ item</button>
                  </>
                )}
              </div>
              <div className="lado negativo">
                <div className="ladoTitulo">Pontos negativos</div>
                <ul>{pos.pontosNegativos.map((v, i) => <li key={i}>{v || <span className="semDado">—</span>}</li>)}</ul>
                {podeAdministrar && (
                  <>
                    {pos.pontosNegativos.map((v, i) => (
                      <input key={i} className="campoInline naoImprime" style={{ marginBottom: 4 }} value={v}
                        onChange={(e) => atualizarLista("pontosNegativos", i, e.target.value)} />
                    ))}
                    <button type="button" className="btn linha pequeno naoImprime" onClick={() => addItemLista("pontosNegativos")}>+ item</button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2>Opinião da diretoria e dos sócios</h2>
            {podeAdministrar && (
              <>
                <textarea className="campoInline naoImprime" rows={2} placeholder="Opinião da diretoria" value={pos.opiniaoDiretoria}
                  onChange={(e) => setPos((p) => ({ ...p, opiniaoDiretoria: e.target.value }))} style={{ marginBottom: 8 }} />
                <textarea className="campoInline naoImprime" rows={2} placeholder="Opinião dos sócios" value={pos.opiniaoSocios}
                  onChange={(e) => setPos((p) => ({ ...p, opiniaoSocios: e.target.value }))} />
              </>
            )}
            <p><strong>Diretoria:</strong> {pos.opiniaoDiretoria || "—"}</p>
            <p><strong>Sócios:</strong> {pos.opiniaoSocios || "—"}</p>
          </section>

          <section>
            <h2>NPS</h2>
            <div className="npsBox">
              {podeAdministrar && (
                <input type="number" min="0" max="10" className="campoInline naoImprime" style={{ maxWidth: 80 }} value={pos.npsNota}
                  onChange={(e) => setPos((p) => ({ ...p, npsNota: e.target.value }))} />
              )}
              <div className="npsNota"><b>{pos.npsNota || "—"}</b><span>nota de 0 a 10</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
