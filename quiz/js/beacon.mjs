// The two funnel sinks shared by quiz.js, vsl.js and plano.html: the Mission
// Control beacon (measures for us) and the Meta Pixel event (measures for
// Meta). They live in the same file because they share the production-domain
// rule, and a second copy of that rule is the thing most likely to drift.
//
// Funnel beacon shared by quiz.js and vsl.js. The 5 steps of the quiz -> VSL
// funnel are 5 (page, event) pairs posted to the same Mission Control
// endpoint the tarifa-lp funnel already uses (POST /api/funnel/events). The
// backend (main.py FunnelEventIn) only accepts event "view" or
// "checkout_click" and returns 422 on anything else, so a renamed step or a
// stray event value would make the backend reject the beacon and the funnel
// would lose a step with no visible error. This file is the only place that
// calls sendBeacon/fetch for funnel events, so that risk only lives once.
//
// Same production-only rule as the lead POST in quiz.js, and for the same
// reason: a local test, a fork or a copy of these files must never write
// into the real funnel. The rule itself is declared once, in config.js —
// see ehProducao below for why it moved there.
const EVENTOS_VALIDOS = new Set(["view", "checkout_click"]);

/**
 * True only on the real domain. The regex behind it lives in config.js, not
 * here: config.js is the classic script every page loads inside <head>, so it
 * is the only file that runs early enough to fire the Pixel on the first round
 * trip — and once it had to know the rule, keeping a second regex in this file
 * would be the copy that drifts. This reads the boolean it computed.
 *
 * Defaults to false when DI_CONFIG is missing, so the failure mode of a page
 * that forgot config.js is "measures nothing", never "pollutes production".
 */
export function ehProducao() {
  return (window.DI_CONFIG || {}).producao === true;
}

export function enviarBeacon(page, event) {
  const cfg = window.DI_CONFIG || {};
  if (!cfg.beaconUrl) return;
  if (!EVENTOS_VALIDOS.has(event)) {
    console.warn(`beacon: evento "${event}" não existe no backend, "${page}" não enviado`);
    return;
  }
  if (!ehProducao()) {
    console.info(
      `beacon: "${page}" não enviado porque "${window.location.hostname}" está fora de drheliobarros.com.br. É de propósito, para teste local não poluir o funil.`
    );
    return;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({
      page,
      event,
      utm_source: params.get("utm_source"),
      utm_campaign: params.get("utm_campaign"),
      // The backend already stores utm_content (main.py FunnelEventIn), and
      // the checkout links carry the quiz degrau in it. Passing it through is
      // what turns the funnel counts into conversion per degrau.
      utm_content: params.get("utm_content"),
    });
    // sendBeacon survives the navigation a checkout click triggers right
    // after it fires; fetch+keepalive is the fallback for browsers without
    // it (same pair tarifa-lp already uses for this endpoint).
    if (navigator.sendBeacon) {
      navigator.sendBeacon(cfg.beaconUrl, new Blob([payload], { type: "application/json" }));
    } else {
      window
        .fetch(cfg.beaconUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        })
        .catch((falha) => console.warn("beacon: envio falhou", falha));
    }
  } catch (falha) {
    console.warn("beacon: envio falhou", falha);
  }
}

// --- Meta Pixel ------------------------------------------------------------
// Loading and PageView are NOT here: they run in config.js, from <head>, which
// is the whole point (see the note there — from the end of this module graph
// the PageView was four round trips deep and Meta undercounted arrivals 3 to
// 1). What stays here is the one event that cannot fire on page load, because
// it marks something the visitor did.
//
// Not here on purpose: a value/currency on the Lead event. The lead is not a
// sale and pricing it would only distort the reporting.

/**
 * Fires a standard Meta event. Same production rule as the beacon.
 *
 * @param {string} evento standard event name, e.g. "Lead"
 */
export function enviarPixel(evento) {
  if (!ehProducao()) {
    console.info(`pixel: "${evento}" não enviado fora de drheliobarros.com.br. É de propósito.`);
    return;
  }
  if (typeof window.fbq !== "function") {
    // An ad blocker, or config.js never ran. The lead is still captured by the
    // beacon and by POST /api/quiz/lead, so this is a reporting loss, not a
    // lost lead — warn and carry on rather than throw inside a submit handler.
    console.warn(`pixel: "${evento}" não enviado, fbq não carregou`);
    return;
  }
  window.fbq("track", evento);
}
