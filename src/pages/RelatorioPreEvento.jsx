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
                  <p><strong>Valor do patrocínio:</strong> {p.valor ? dinheiro(p.valor) : "a definir"}{p.forma ? ` (${p.forma})` : ""}</p>
                  <p><strong>Ativação:</strong> {p.ativacao || <span className="semDado">a definir</span>}{p.pendencia ? ` — pendência: ${p.pendencia}` : ""}</p>
                  <p><strong>Convidados:</strong> {p.convidados ? `${p.convidados} convidados` : "a definir"}{p.obsConvidados ? ` — ${p.obsConvidados}` : ""}</p>
                </div>
              ))}
              <p className="semDado">
                Soma dos patrocínios registrados: {dinheiro(dadosEvento.patrocinadores.reduce((s, p) => s + (Number(p.valor) || 0), 0))} (controle interno).
              </p>
            </section>
          )}

          {(() => {
            const A = dadosEvento.alimentacao || {};
            const R = A.restaurante || {};
            const gastro = (A.gastro || []).filter((g) => g.parceiro || g.horario || g.destaques);
            const promos = (R.promocoes || []).filter((p) => p.item || p.valor || p.horario);
            const simNao = { sim: "Sim", nao: "Não", nao_definido: <span className="semDado">a definir</span> };
            const dizer = (v) => simNao[v || "nao_definido"];
            const ou = (v, alt) => (v ? v : <span className="semDado">{alt || "a definir"}</span>);
            const linhas = (txt) => String(txt || "").split(/\n+/).filter((l) => l.trim());
            const temAlimentacao = gastro.length || promos.length || R.barHorario || R.cozinhaHorario ||
              R.buffetHorario || R.buffetPratos || R.openBebidas || R.tipoMenu ||
              (R.buffet && R.buffet !== "nao_definido") || (R.openBar && R.openBar !== "nao_definido") || R.menuArquivo;
            if (!temAlimentacao) return null;

            return (
              <section>
                <h2>Alimentação</h2>

                <h3>Praça DKP Gastrô</h3>
                {gastro.length > 0 ? (
                  <table>
                    <thead><tr><th style={{ width: "26%" }}>Parceiro</th><th style={{ width: "20%" }}>Funcionamento</th><th>Promoções e destaques do menu</th></tr></thead>
                    <tbody>
                      {gastro.map((g, i) => (
                        <tr key={i}>
                          <td><strong>{g.parceiro || "—"}</strong></td>
                          <td>{ou(g.horario)}</td>
                          <td>{g.destaques ? linhas(g.destaques).map((l, j) => <div key={j}>{l}</div>) : <span className="semDado">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="semDado">Nenhum parceiro cadastrado na ficha do evento.</p>
                )}

                <h3>Restaurante</h3>
                <p><strong>Bar:</strong> {ou(R.barHorario, "horário a definir")}</p>
                <p><strong>Cozinha:</strong> {ou(R.cozinhaHorario, "horário a definir")}</p>
                <p><strong>Buffet:</strong> {dizer(R.buffet)}{R.buffet === "sim" && <> · {ou(R.buffetHorario, "horário a definir")}</>}</p>
                {R.buffetPratos && (
                  <p><strong>Destaques do buffet:</strong> {linhas(R.buffetPratos).map((l, j) => <div key={j}>{l}</div>)}</p>
                )}

                <h3>Bar e bebidas</h3>
                <p><strong>Open bar:</strong> {dizer(R.openBar)}{R.openBar === "sim" && <> · {ou(R.openBebidas, "bebidas a definir")}</>}</p>
                <p><strong>Promoções:</strong> {dizer(R.promocoesTem)}</p>
                {promos.length > 0 && (
                  <table>
                    <thead><tr><th>Item</th><th style={{ width: "22%" }}>Valor</th><th style={{ width: "26%" }}>Horário disponível</th></tr></thead>
                    <tbody>
                      {promos.map((pr, i) => (
                        <tr key={i}><td>{pr.item || "—"}</td><td>{ou(pr.valor)}</td><td>{ou(pr.horario)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <h3>Menu</h3>
                <p><strong>Tipo de menu:</strong> {ou(R.tipoMenu)}{R.menuObs ? ` · ${R.menuObs}` : ""}</p>
                {R.menuArquivo ? (
                  String(R.menuArquivo.tipo || "").startsWith("image") ? (
                    <img src={R.menuArquivo.url} alt="menu" style={{ maxWidth: "100%", marginTop: 6 }} />
                  ) : (
                    <p><strong>Arquivo:</strong> <a className="mono" href={R.menuArquivo.url} target="_blank" rel="noreferrer">{R.menuArquivo.nome}</a> (anexo em PDF)</p>
                  )
                ) : (
                  <p className="semDado">Nenhum arquivo de menu anexado.</p>
                )}
              </section>
            );
          })()}

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
