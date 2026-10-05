// The arithmetic that decides whether the offer appears on /vsl.
//
// It lives here, apart from vsl.js, for one reason: vsl.js touches the DOM at module
// scope (getElementById, addEventListener), so importing it from a Node self-check
// throws before a single assertion runs. Same reason beacon.mjs exists. This module
// imports nothing and touches nothing, so the check can call it directly.
//
// This is the only business logic on the page that unlocks a R$997 button, and until
// now it was proven only by watching a browser. The rules it encodes:
//
//   * only forward movement of the playhead counts, and only in playback-sized steps;
//   * a scrub (dragging the bar) is a jump, never watched time;
//   * a missing or malformed threshold hides the offer instead of guessing one.

// A timeupdate tick during real playback is a fraction of a second (browsers fire it
// roughly 4x/s). Anything at or beyond this is a seek, not viewing. Kept generous so a
// stalled buffer that resumes does not get counted as a scrub-sized jump either way:
// the cost of discarding a legitimate delta is a slightly later offer, and late is the
// safe direction for a purchase gate.
export const DELTA_MAXIMO_SEGUNDOS = 2;

/**
 * Accumulated play time after one timeupdate tick.
 *
 * @param {number} acumulado seconds counted so far
 * @param {number|null} ultimoTempo playhead at the previous tick; null right after a
 *   pause, when there is no trustworthy baseline to measure against
 * @param {number} tempoAtual playhead now
 * @returns {number} the new accumulated total
 */
export function acumular(acumulado, ultimoTempo, tempoAtual) {
  if (ultimoTempo === null) return acumulado;
  const delta = tempoAtual - ultimoTempo;
  if (delta > 0 && delta < DELTA_MAXIMO_SEGUNDOS) return acumulado + delta;
  return acumulado;
}

/**
 * Whether the offer may be revealed.
 *
 * Fails closed on purpose: if config.js failed to load, or offerDelaySeconds was removed
 * or left as text, the answer is no. Hiding the offer on a broken config is recoverable;
 * showing a price the visitor was never meant to see yet is not.
 *
 * @param {number} acumulado seconds of play time counted
 * @param {unknown} limiar the configured delay
 */
export function liberaOferta(acumulado, limiar) {
  return typeof limiar === "number" && Number.isFinite(limiar) && acumulado >= limiar;
}

// --- Drop-off marks on /vsl ------------------------------------------------
// The marks used to read the playhead (currentTime / duration). Measured on
// 05/10/2026, that let a scrub count as watching: twice a visitor dragged the
// bar and 25/50/75 all fired 8–12 s after the page opened. They now read the
// same accumulated time that gates the offer, so a scrub moves nothing.
export const MARCOS_VSL = [25, 50, 75];

// `ended` alone also fires on a scrub to the end. Finishing means having
// actually watched almost all of it; the 5% slack absorbs the tick lost after
// every pause (acumular has no baseline then) and a short buffering skip.
export const FRACAO_TERMINOU = 0.95;

/**
 * Marks (percent of the cut) covered by the time actually watched.
 *
 * @param {number} acumulado seconds watched, scrubs excluded
 * @param {number} duracao video.duration; NaN/Infinity before metadata loads
 * @returns {number[]} subset of MARCOS_VSL, ascending
 */
export function marcosAssistidos(acumulado, duracao) {
  if (!(duracao > 0) || !Number.isFinite(duracao)) return [];
  return MARCOS_VSL.filter((m) => acumulado >= (duracao * m) / 100);
}

/** Whether an `ended` counts as a finished view, not a scrub to the end. */
export function terminou(acumulado, duracao) {
  return duracao > 0 && Number.isFinite(duracao) && acumulado >= duracao * FRACAO_TERMINOU;
}
