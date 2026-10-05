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

// --- Session and test marks -------------------------------------------------
// Until 05/10/2026 every beacon was an island: a reload counted as a second
// visitor, quiz-done could not be joined to the /vsl that followed, and the
// owner's own checks (the deploy-day `?offer=` runs, the 23/09 burst) sat in
// the same denominator as real leads.
//
// `sid` is a random id per browser TAB (sessionStorage dies with the tab). It
// never goes with the lead POST, so the funnel file stays free of personal data
// (CLAUDE.md §4.4); the backend also drops anything that is not this shape.
export const CHAVE_SESSAO = "di_sid";
export const CHAVE_TESTE = "di_teste";

// randomUUID is missing on Safari < 15.4; the fallback is the same 128 bits as hex.
function idAleatorio() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

// Reading window.sessionStorage itself throws when the browser blocks storage,
// and that throw would sink the whole beacon, not just the id.
function armazem(nome) {
  try {
    return window[nome];
  } catch {
    return null;
  }
}

/**
 * The tab's session id, created on first use. Null when storage is blocked
 * (private mode on some browsers): the beacon still goes, just unjoinable.
 */
export function sessao(storage, gerar = idAleatorio) {
  try {
    let sid = storage.getItem(CHAVE_SESSAO);
    if (!sid) {
      sid = gerar();
      storage.setItem(CHAVE_SESSAO, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

/**
 * Whether this visit is the owner testing. `?teste=1` marks the browser for
 * good (localStorage), `?teste=0` clears it; the offer/strip overrides only
 * exist for manual checks, so they mark the visit on their own.
 */
export function ehTeste(params, storage) {
  try {
    if (params.get("teste") === "1") storage.setItem(CHAVE_TESTE, "1");
    if (params.get("teste") === "0") storage.removeItem(CHAVE_TESTE);
    if (storage.getItem(CHAVE_TESTE) === "1") return true;
  } catch {
    // storage blocked: fall through to the URL-only rule
  }
  return params.has("offer") || params.has("preco");
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
    const corpo = {
      page,
      event,
      utm_source: params.get("utm_source"),
      utm_campaign: params.get("utm_campaign"),
      // The backend already stores utm_content (main.py FunnelEventIn), and
      // the checkout links carry the quiz degrau in it. Passing it through is
      // what turns the funnel counts into conversion per degrau.
      utm_content: params.get("utm_content"),
      sid: sessao(armazem("sessionStorage")),
    };
    if (ehTeste(params, armazem("localStorage"))) corpo.teste = true;
    // --- arrival reported server-side too ------------------------------------
    // Only on "view", and only these two fields, which the backend uses to
    // build the Meta PageView and then DROPS — they are never written to
    // funnel_tarifa.jsonl, whose whole set of keys is PII-free by design
    // (CLAUDE.md §4.4). See the LGPD block in track_funnel_event.
    //
    // `event_id` is the id config.js already gave the browser PageView: Meta
    // dedups the two paths by it, so without it the same arrival counts twice.
    // `fbclid` is the only matching key the server gets — no personal data.
    // A visit with no fbclid is organic; the backend skips it rather than
    // substituting anything.
    if (event === "view") {
      corpo.event_id = (window.DI_CONFIG || {}).pageViewEventId || null;
      corpo.fbclid = params.get("fbclid");
    }
    const payload = JSON.stringify(corpo);
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
 * @param {string} [eventId] the SAME id sent to the server as `event_id`. Meta
 *   dedups this browser event against the Conversions API event by it. Without
 *   it the two paths count the same lead twice and every cost-per-lead in the
 *   account halves on paper — the number the campaign optimises against. The
 *   server refuses to report a lead that has no id, for the same reason.
 */
export function enviarPixel(evento, eventId) {
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
  // The 4th argument is the dedup key. Passing it only when we have one keeps
  // the call shape identical to before for any event that has no server twin.
  if (eventId) window.fbq("track", evento, {}, { eventID: eventId });
  else window.fbq("track", evento);
}
