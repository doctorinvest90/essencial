// The two funnel sinks shared by quiz.js, vsl.js and plano.html: the Mission
// Control beacon (measures for us) and the Meta Pixel (measures for Meta).
// They live in the same file because they share DOMINIO_DE_PRODUCAO, and a
// second copy of that rule is the thing most likely to drift.
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
// Why a pixel at all, when the beacon above already counts the same steps: the
// beacon is ours and Meta cannot read it. Without a conversion event on this
// domain, the only signal an ad campaign can optimise against is the click —
// which is how R$86 bought 482 clicks and zero leads on the consultoria page
// in August. "Lead" on quiz completion is the event a campaign optimises for;
// "PageView" is what makes the visitors retargetable later.
//
// Not here on purpose: a value/currency on the Lead event (the lead is not a
// sale and pricing it would only distort the reporting) and the server-side
// CAPI. CAPI is the upgrade path if the pixel undercounts against
// quiz_essencial.jsonl — the endpoint that would send it already receives the
// lead (POST /api/quiz/lead), so nothing here has to change for it.

/**
 * Loads fbevents.js and fires PageView. Safe to call more than once per page.
 * No-op off production, and no-op if config.js carries no pixelId.
 */
export function iniciarPixel() {
  const cfg = window.DI_CONFIG || {};
  if (!cfg.pixelId) return;
  if (!DOMINIO_DE_PRODUCAO.test(window.location.hostname)) {
    console.info(
      `pixel: não carregado porque "${window.location.hostname}" está fora de drheliobarros.com.br. É de propósito, para teste local não poluir o pixel.`
    );
    return;
  }
  // Already initialised: a second init here would double-count PageView.
  if (typeof window.fbq === "function") return;
  carregarFbevents();
  window.fbq("init", cfg.pixelId);
  window.fbq("track", "PageView");
}

/**
 * Fires a standard Meta event. Same production-domain rule as the beacon.
 *
 * @param {string} evento standard event name, e.g. "Lead"
 */
export function enviarPixel(evento) {
  if (!DOMINIO_DE_PRODUCAO.test(window.location.hostname)) {
    console.info(`pixel: "${evento}" não enviado fora de drheliobarros.com.br. É de propósito.`);
    return;
  }
  if (typeof window.fbq !== "function") {
    // An ad blocker, or iniciarPixel() never ran. The lead is still captured by
    // the beacon and by POST /api/quiz/lead, so this is a reporting loss, not a
    // lost lead — warn and carry on rather than throw inside a submit handler.
    console.warn(`pixel: "${evento}" não enviado, fbq não carregou`);
    return;
  }
  window.fbq("track", evento);
}

/* eslint-disable */
// Vendor snippet, kept byte-for-byte as Meta publishes it. What earns the
// ugliness is the stub queue: it makes an fbq() call that happens before
// fbevents.js finishes downloading still arrive instead of throwing. Rewriting
// this prettier is exactly how that queue gets dropped.
function carregarFbevents() {
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
}
/* eslint-enable */
