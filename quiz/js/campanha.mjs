// A janela da campanha Essencial (26/10 a 16/11 de 2026), em um lugar só.
//
// Três páginas dependem destas duas datas e cada uma faria a conta de um jeito:
// /oferta fecha o botão quando a janela termina, /vsl e /plano escondem o
// trimestral de R$ 297 enquanto ela corre (o Diário de Campanha tira o
// trimestral da comunicação, porque numa campanha de validação R$ 297 compra um
// "vou testar" e polui o sinal). Escrita três vezes, a data escorrega numa
// delas e ninguém percebe até o dia 17.
//
// As datas em si moram em config.js, com o resto da configuração de runtime.
// Este arquivo só sabe compará-las, e por isso a lógica cabe num self-check de
// node (campanha.selftest.mjs) que roda sem DOM.

/** Os três estados possíveis. "aberta" = dentro da janela da campanha. */
export const ANTES = "antes";
export const ABERTA = "aberta";
export const FECHADA = "fechada";

/**
 * Converte um ISO-8601 com offset em milissegundos, ou NaN se não der.
 * Data.parse aceita a forma "2026-11-16T23:59:59-03:00" em todos os
 * navegadores que interessam; o offset explícito é o que faz o fechamento
 * acontecer às 23:59 de Brasília e não do fuso de quem está lendo.
 */
export function instante(iso) {
  if (typeof iso !== "string") return NaN;
  return Date.parse(iso);
}

/**
 * O estado da campanha em `agora` (ms).
 *
 * Falha ABERTA de propósito. Se a configuração sumir ou vier quebrada, a
 * alternativa seria uma página de oferta que não vende durante a única janela
 * em que ela existe, e isso acontece em silêncio. Aberta demais é um erro que
 * o vigia de 16/11 e a desativação do checkout na Eduzz pegam; fechada demais
 * é uma campanha inteira perdida sem ninguém saber. O console.warn é o que
 * transforma o erro de deploy em coisa visível no preview.
 */
export function estadoDaCampanha(agoraMs, abreIso, fechaIso) {
  const abre = instante(abreIso);
  const fecha = instante(fechaIso);
  if (Number.isNaN(abre) || Number.isNaN(fecha) || abre > fecha) {
    console.warn(
      `campanha: janela inválida (abre="${abreIso}", fecha="${fechaIso}"). Assumindo aberta.`
    );
    return ABERTA;
  }
  if (agoraMs < abre) return ANTES;
  if (agoraMs > fecha) return FECHADA;
  return ABERTA;
}

/** Atalho para as páginas: lê as datas do DI_CONFIG e devolve o estado agora. */
export function estadoAgora(cfg = (typeof window !== "undefined" && window.DI_CONFIG) || {}) {
  return estadoDaCampanha(Date.now(), cfg.campanhaAbre, cfg.campanhaFecha);
}
