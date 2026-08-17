import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useEventos } from "../context/EventosContext";
import { useEventosConfig } from "../lib/useEventosConfig";
import { dataBR, dinheiro } from "../lib/dominio";
import "../styles/relatorio.css";

export default function RelatorioPreEvento({ onFechar }) {
  const { evento, eventoId, tarefas } = useEventos();
  const { config } = useEventosConfig();
  const [dadosEvento, setDadosEvento] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("eventos").select("*").eq("id", eventoId).single();
      setDadosEvento(data);
    })();
  }, [eventoId]);

  if (!dadosEvento) return null;

  const aprovadas = tarefas.filter((t) => t.status !== "nao_aprovado");
  const total = aprovadas.reduce((s, t) => s + (Number(t.valor) || 0), 0);
  const pendentes = tarefas.filter((t) => t.status !== "feito" && t.status !== "nao_aprovado");

  return (
    <div className="fundo" style={{ padding: 0, alignItems: "flex-start" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 900, margin: "0 auto", minHeight: "100vh" }}>
        <div className="rel-toolbar naoImprime">
          <button className="btn" onClick={() => window.print()}>Imprimir / salvar PDF</button>
          <button className="btn linha" onClick={onFechar}>Fechar</button>
        </div>

        <div className="rel-doc rel">
          <div className="barraTopo" />
          <div className="rel-header">
            {config.logo_clube_url && <img className="logoClube" src={config.logo_clube_url} alt="Logo do clube" />}
            <div className="rel-titulo">
              <div className="ano">{dadosEvento.data ? new Date(dadosEvento.data + "T12:00:00").getFullYear() : ""}</div>
              <h1>{dadosEvento.nome}</h1>
              <div className="subtitulo">Relatório pré-evento</div>
            </div>
            {dadosEvento.logo_evento_url && <img className="logoEvento" src={dadosEvento.logo_evento_url} alt="Logo do evento" />}
          </div>

          <section>
            <div className="tiraInfo">
              <div><span>Data</span><b>{dataBR(dadosEvento.data)}</b></div>
              <div><span>Horário</span><b>{dadosEvento.hora_inicio || "—"}{dadosEvento.hora_fim ? ` às ${dadosEvento.hora_fim}` : ""}</b></div>
              <div><span>Local</span><b>{dadosEvento.local || "—"}</b></div>
              <div><span>Público esperado</span><b>{dadosEvento.publico || "—"}</b></div>
            </div>
            {dadosEvento.descricao && <p>{dadosEvento.descricao}</p>}
          </section>

          <section>
            <h2>Funcionamento das áreas do clube</h2>
            <div className="funcionamento">
              {(dadosEvento.funcionamento || []).map((f) => (
                <div className="fl" key={f.area}>
                  <div className="fh">{f.area}</div>
                  <div className="ft">{f.horario || <span className="semDado">a definir</span>}{f.obs ? ` — ${f.obs}` : ""}</div>
                </div>
              ))}
            </div>
          </section>

          {(dadosEvento.programacao || []).length > 0 && (
            <section>
              <h2>Programação</h2>
              <div className="programa">
                {dadosEvento.programacao.map((p, i) => (
                  <div className="pl" key={i}>
                    <div className="pn">{p.horario}</div>
                    <div>{p.nome}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(dadosEvento.patrocinadores || []).length > 0 && (
            <section>
              <h2>Patrocinadores</h2>
              {dadosEvento.patrocinadores.map((p, i) => (
                <div className="patro" key={i}>
                  <div className="patroTopo">
                    {p.logoUrl && <img src={p.logoUrl} alt={p.nome} />}
                    <div className="patroNome">{p.nome}</div>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section>
            <h2>Fornecedores e despesas</h2>
            <table>
              <thead>
                <tr><th>Atividade</th><th>Tipo</th><th>Empresa</th><th className="dir">Valor</th><th>Status</th></tr>
              </thead>
              <tbody>
                {tarefas.map((t) => (
                  <tr key={t.id}>
                    <td>{t.titulo}</td>
                    <td>{t.tipo}</td>
                    <td>{t.empresa || "—"}</td>
                    <td className="dir">{t.valor ? dinheiro(t.valor) : "—"}</td>
                    <td>{t.status === "nao_aprovado" ? "Não aprovado (fora do total)" : t.status}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Total aprovado</td><td className="dir">{dinheiro(total)}</td><td /></tr>
              </tfoot>
            </table>
          </section>

          {pendentes.length > 0 && (
            <section>
              <h2>Pendências no fechamento deste relatório</h2>
              <ul>
                {pendentes.map((t) => <li key={t.id}>{t.titulo} — {t.status}</li>)}
              </ul>
            </section>
          )}

          {(dadosEvento.responsaveis || []).length > 0 && (
            <section>
              <h2>Equipe responsável no evento</h2>
              <div className="resps">
                {dadosEvento.responsaveis.map((r, i) => (
                  <div className="resp" key={i}>
                    <div className="rn">{r.nome}</div>
                    <div className="rt">{r.telefone}</div>
                    <div className="ra">{r.area}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
