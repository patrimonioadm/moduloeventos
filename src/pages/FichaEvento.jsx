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
  const [gastro, setGastro] = useState([]);
  const [restaurante, setRestaurante] = useState({
    barHorario: "", cozinhaHorario: "", buffet: "nao_definido", buffetHorario: "", buffetPratos: "",
    openBar: "nao_definido", openBebidas: "", promocoesTem: "nao_definido", promocoes: [],
    tipoMenu: "", menuObs: "", menuArquivo: null,
  });
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
        const A = data.alimentacao || {};
        setGastro(A.gastro || []);
        setRestaurante({
          barHorario: "", cozinhaHorario: "", buffet: "nao_definido", buffetHorario: "", buffetPratos: "",
          openBar: "nao_definido", openBebidas: "", promocoesTem: "nao_definido", promocoes: [],
          tipoMenu: "", menuObs: "", menuArquivo: null,
          ...(A.restaurante || {}),
        });
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
    setPatrocinadores((p) => [...p, { nome: "", logoUrl: null, valor: "", forma: "", ativacao: "", pendencia: "", convidados: "", obsConvidados: "" }]);
  }
  function addProgramacao() {
    setProgramacao((p) => [...p, { nome: "", horario: "" }]);
  }
  function addResponsavel() {
    setResponsaveis((p) => [...p, { nome: "", telefone: "", area: "" }]);
  }
  function addGastro() {
    setGastro((g) => [...g, { parceiro: "", horario: "", destaques: "" }]);
  }
  function addPromocao() {
    setRestaurante((r) => ({ ...r, promocoes: [...r.promocoes, { item: "", valor: "", horario: "" }] }));
  }
  function removerPromocao(index) {
    setRestaurante((r) => ({ ...r, promocoes: r.promocoes.filter((_, i) => i !== index) }));
  }
  function remover(lista, setLista, index) {
    setLista(lista.filter((_, i) => i !== index));
  }

  async function handleMenuArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    try {
      const url = await enviarImagem(arquivo, `menu/${eventoId}`);
      setRestaurante((r) => ({ ...r, menuArquivo: { nome: arquivo.name, tipo: arquivo.type, url } }));
    } catch (err) {
      setErro(err.message || "Falha ao enviar o arquivo do menu.");
    }
  }
  function removerMenuArquivo() {
    setRestaurante((r) => ({ ...r, menuArquivo: null }));
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
          alimentacao: { gastro, restaurante },
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
            <h3 className="secaoFicha">Praça DKP Gastrô — parceiros</h3>
            <p style={{ fontSize: 12, color: "var(--aco)", margin: "0 0 8px" }}>
              Um parceiro por linha, com o horário de funcionamento e as promoções ou destaques do menu dele.
            </p>
            {gastro.map((g, i) => (
              <div key={i} className="linhaFicha coluna">
                <div className="grade">
                  <input
                    placeholder="Ex.: Flávio Sushi"
                    value={g.parceiro || ""}
                    disabled={somenteLeitura}
                    onChange={(e) => {
                      const copia = [...gastro];
                      copia[i] = { ...copia[i], parceiro: e.target.value };
                      setGastro(copia);
                    }}
                  />
                  <input
                    placeholder="Horário de funcionamento"
                    value={g.horario || ""}
                    disabled={somenteLeitura}
                    onChange={(e) => {
                      const copia = [...gastro];
                      copia[i] = { ...copia[i], horario: e.target.value };
                      setGastro(copia);
                    }}
                  />
                </div>
                <div className="campo">
                  <label>Promoções e destaques do menu</label>
                  <textarea
                    rows={2}
                    placeholder="Um item por linha: prato, promoção, valor…"
                    value={g.destaques || ""}
                    disabled={somenteLeitura}
                    onChange={(e) => {
                      const copia = [...gastro];
                      copia[i] = { ...copia[i], destaques: e.target.value };
                      setGastro(copia);
                    }}
                  />
                </div>
                {!somenteLeitura && (
                  <div className="fimLinha">
                    <button type="button" className="btn linha pequeno" onClick={() => remover(gastro, setGastro, i)}>Remover parceiro</button>
                  </div>
                )}
              </div>
            ))}
            {!somenteLeitura && <button type="button" className="btn linha pequeno" onClick={addGastro}>+ parceiro da praça</button>}

            <h3 className="secaoFicha" style={{ marginTop: 18 }}>Restaurante</h3>
            <div className="grade">
              <div className="campo">
                <label>Horário de funcionamento do bar</label>
                <input
                  placeholder="11h às 23h"
                  value={restaurante.barHorario}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, barHorario: e.target.value }))}
                />
              </div>
              <div className="campo">
                <label>Horário de funcionamento da cozinha</label>
                <input
                  placeholder="11h30 às 22h"
                  value={restaurante.cozinhaHorario}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, cozinhaHorario: e.target.value }))}
                />
              </div>
              <div className="campo">
                <label>Terá buffet?</label>
                <select
                  value={restaurante.buffet}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, buffet: e.target.value }))}
                >
                  <option value="nao_definido">A definir</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div className="campo">
                <label>Horário do buffet</label>
                <input
                  placeholder="12h às 16h"
                  value={restaurante.buffetHorario}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, buffetHorario: e.target.value }))}
                />
              </div>
              <div className="campo" style={{ gridColumn: "1 / -1" }}>
                <label>Pratos destaques do buffet</label>
                <textarea
                  rows={3}
                  placeholder="Um prato por linha"
                  value={restaurante.buffetPratos}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, buffetPratos: e.target.value }))}
                />
              </div>
            </div>

            <h3 className="secaoFicha" style={{ marginTop: 18 }}>Bar</h3>
            <div className="grade">
              <div className="campo">
                <label>Haverá open bar?</label>
                <select
                  value={restaurante.openBar}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, openBar: e.target.value }))}
                >
                  <option value="nao_definido">A definir</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              <div className="campo" style={{ gridColumn: "2 / -1" }}>
                <label>Bebidas do open</label>
                <input
                  placeholder="Chopp, whisky, água e refrigerante"
                  value={restaurante.openBebidas}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, openBebidas: e.target.value }))}
                />
              </div>
              <div className="campo">
                <label>Haverá promoções?</label>
                <select
                  value={restaurante.promocoesTem}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, promocoesTem: e.target.value }))}
                >
                  <option value="nao_definido">A definir</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
            </div>
            {restaurante.promocoes.map((pr, i) => (
              <div key={i} className="linhaFicha">
                <input
                  placeholder="Balde de long neck"
                  value={pr.item}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...restaurante.promocoes];
                    copia[i] = { ...copia[i], item: e.target.value };
                    setRestaurante((r) => ({ ...r, promocoes: copia }));
                  }}
                />
                <input
                  placeholder="R$ 60,00"
                  value={pr.valor}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...restaurante.promocoes];
                    copia[i] = { ...copia[i], valor: e.target.value };
                    setRestaurante((r) => ({ ...r, promocoes: copia }));
                  }}
                />
                <input
                  placeholder="14h às 18h"
                  value={pr.horario}
                  disabled={somenteLeitura}
                  onChange={(e) => {
                    const copia = [...restaurante.promocoes];
                    copia[i] = { ...copia[i], horario: e.target.value };
                    setRestaurante((r) => ({ ...r, promocoes: copia }));
                  }}
                />
                {!somenteLeitura && <button type="button" className="icone" onClick={() => removerPromocao(i)}>✕</button>}
              </div>
            ))}
            {!somenteLeitura && <button type="button" className="btn linha pequeno" onClick={addPromocao}>+ promoção</button>}

            <h3 className="secaoFicha" style={{ marginTop: 18 }}>Menu</h3>
            <div className="grade">
              <div className="campo">
                <label>Tipo de menu oferecido</label>
                <input
                  placeholder="À la carte, executivo, festivo, petiscos…"
                  value={restaurante.tipoMenu}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, tipoMenu: e.target.value }))}
                />
              </div>
              <div className="campo">
                <label>Observações do menu</label>
                <input
                  placeholder="Ex.: menu reduzido no dia do evento"
                  value={restaurante.menuObs}
                  disabled={somenteLeitura}
                  onChange={(e) => setRestaurante((r) => ({ ...r, menuObs: e.target.value }))}
                />
              </div>
            </div>
            <div className="campo" style={{ marginTop: 10 }}>
              <label>Arquivo do menu — imagem ou PDF</label>
              {restaurante.menuArquivo ? (
                <div className="logoPreview" style={{ alignItems: "center" }}>
                  {String(restaurante.menuArquivo.tipo || "").startsWith("image") ? (
                    <img src={restaurante.menuArquivo.url} alt={restaurante.menuArquivo.nome} />
                  ) : (
                    <span className="mono">📄 {restaurante.menuArquivo.nome}</span>
                  )}
                  {!somenteLeitura && (
                    <button type="button" className="btn linha pequeno" style={{ borderColor: "var(--alerta)", color: "var(--alerta)" }} onClick={removerMenuArquivo}>
                      Remover
                    </button>
                  )}
                </div>
              ) : (
                <span className="vazioCampo">nenhum arquivo anexado</span>
              )}
              {!somenteLeitura && (
                <>
                  <input type="file" accept="image/*,application/pdf" onChange={handleMenuArquivo} style={{ marginTop: 8 }} />
                  <span style={{ fontSize: 11.5, color: "var(--aco)", display: "block", marginTop: 4 }}>
                    salvo na hora · imagem sai impressa no relatório, PDF entra como anexo para download
                  </span>
                </>
              )}
            </div>
          </section>

          <section>
            <h3 className="secaoFicha">Patrocinadores</h3>
            {patrocinadores.map((p, i) => (
              <div key={i} className="linhaFicha coluna">
                <div className="grade">
                  <input
                    placeholder="Nome do patrocinador"
                    value={p.nome || ""}
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

                <div className="grade">
                  <div className="campo">
                    <label>Cota (R$)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={p.valor ?? ""}
                      disabled={somenteLeitura}
                      onChange={(e) => {
                        const copia = [...patrocinadores];
                        copia[i] = { ...copia[i], valor: e.target.value };
                        setPatrocinadores(copia);
                      }}
                    />
                  </div>
                  <div className="campo">
                    <label>Forma</label>
                    <input
                      placeholder="R$ 10.000 em produto e R$ 15.000 em dinheiro"
                      value={p.forma || ""}
                      disabled={somenteLeitura}
                      onChange={(e) => {
                        const copia = [...patrocinadores];
                        copia[i] = { ...copia[i], forma: e.target.value };
                        setPatrocinadores(copia);
                      }}
                    />
                  </div>
                  <div className="campo">
                    <label>Convidados</label>
                    <input
                      type="number" min="0"
                      value={p.convidados ?? ""}
                      disabled={somenteLeitura}
                      onChange={(e) => {
                        const copia = [...patrocinadores];
                        copia[i] = { ...copia[i], convidados: e.target.value };
                        setPatrocinadores(copia);
                      }}
                    />
                  </div>
                  <div className="campo">
                    <label>Observação sobre convidados</label>
                    <input
                      value={p.obsConvidados || ""}
                      disabled={somenteLeitura}
                      onChange={(e) => {
                        const copia = [...patrocinadores];
                        copia[i] = { ...copia[i], obsConvidados: e.target.value };
                        setPatrocinadores(copia);
                      }}
                    />
                  </div>
                </div>
                <div className="campo">
                  <label>Ativação</label>
                  <textarea
                    rows={2}
                    placeholder="Uma ação por linha…"
                    value={p.ativacao || ""}
                    disabled={somenteLeitura}
                    onChange={(e) => {
                      const copia = [...patrocinadores];
                      copia[i] = { ...copia[i], ativacao: e.target.value };
                      setPatrocinadores(copia);
                    }}
                  />
                </div>
                <div className="campo">
                  <label>Pendência</label>
                  <input
                    placeholder="Ex.: falta enviar a arte do banner"
                    value={p.pendencia || ""}
                    disabled={somenteLeitura}
                    onChange={(e) => {
                      const copia = [...patrocinadores];
                      copia[i] = { ...copia[i], pendencia: e.target.value };
                      setPatrocinadores(copia);
                    }}
                  />
                </div>
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
