// =====================================================================
// Registro de módulos do Portal DKP
// ---------------------------------------------------------------------
// Este arquivo é o ÚNICO lugar que precisa mudar quando um módulo novo
// fica pronto. O resto do portal (Home, navegação, permissões) lê
// essa lista e a tabela "setores" do Supabase — nunca precisa de código
// específico por setor.
//
// tipo:
//   "link-externo" -> abre a URL do módulo (mesmo domínio via rewrite
//                      do Vercel, ideal, ou domínio próprio)
//   "iframe"        -> embute a página do módulo dentro do portal
//                      (bom para protótipos estáticos, como o de Eventos)
//   "interno"       -> componente React importado direto deste
//                      repositório (import lazy abaixo)
// =====================================================================

export const MODULOS = [
  {
    chave: "eventos",
    tipo: "link-externo",
    url: import.meta.env.VITE_URL_EVENTOS || null,
    icone: "CalendarDays",
  },
  {
    chave: "patrimonio",
    tipo: "link-externo",
    url: import.meta.env.VITE_URL_PATRIMONIO || null,
    icone: "Archive",
  },
  {
    chave: "rh",
    tipo: "link-externo",
    url: import.meta.env.VITE_URL_RH || null,
    icone: "Users",
  },
  {
    chave: "financeiro",
    tipo: "link-externo",
    url: import.meta.env.VITE_URL_FINANCEIRO || null,
    icone: "Wallet",
  },
  {
    chave: "secretaria",
    tipo: "link-externo",
    url: import.meta.env.VITE_URL_SECRETARIA || null,
    icone: "NotebookPen",
  },
];

export function getModulo(chave) {
  return MODULOS.find((m) => m.chave === chave) || null;
}
