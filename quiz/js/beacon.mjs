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
// into the real funnel. One regex, one owner, imported by both callers.
// Two copies of the same rule drift, and when they do either production
// silently stops measuring or a test silently starts polluting it.
// The leading (^|\.) is what keeps a lookalike host out.
export const DOMINIO_DE_PRODUCAO = /(^|\.)drheliobarros\.com\.br$/;

// Mirrors the backend's own whitelist (main.py: `if ev.event not in
// ("view", "checkout_click")`). Checked here too so a typo at a call site
// shows up as a console warning during development instead of a silent 422
// in production.
const EVENTOS_VALIDOS = new Set(["view", "checkout_click"]);

export function enviarBeacon(page, event) {
  const cfg = window.DI_CONFIG || {};
  if (!cfg.beaconUrl) return;
  if (!EVENTOS_VALIDOS.has(event)) {
    console.warn(`beacon: evento "${event}" não existe no backend, "${page}" não enviado`);
    return;
  }
  if (!DOMINIO_DE_PRODUCAO.test(window.location.hostname)) {
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
