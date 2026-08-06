// Logic for /vsl: gates the offer behind accumulated video play time, and
// tags the checkout with the quiz degrau when a session exists. Plain script
// (no imports needed), loaded after config.js, same pattern as quiz.js.

const cfg = window.DI_CONFIG || {};

const video = document.getElementById("video-vsl");
const avisoVideo = document.getElementById("aviso-video");
const oferta = document.getElementById("oferta");
const ctaAnual = document.getElementById("cta-anual");
const ctaTrimestral = document.getElementById("cta-trimestral");

// --- Offer reveal: accumulated play time, never wall time -----------------
// `?offer=N` overrides the configured delay for manual testing. The 128 in
// config.js is a writing-time estimate (Task 11 replaces it with the real
// cut); nothing here duplicates that number, everything reads
// cfg.offerDelaySeconds so a config change is the only place to touch.
const params = new URLSearchParams(window.location.search);
const overrideParam = params.get("offer");
const overrideValido = overrideParam !== null && !Number.isNaN(Number(overrideParam));
const delaySeconds = overrideValido ? Number(overrideParam) : cfg.offerDelaySeconds;

let acumulado = 0;
let ultimoTempo = null;
let ofertaVisivel = false;

function revelarOferta() {
  if (ofertaVisivel) return;
  ofertaVisivel = true;
  oferta.hidden = false;
  // Two steps so the browser paints the hidden->block change before the
  // opacity transition starts; flipping both in the same frame skips the
  // animation instead of playing it.
  requestAnimationFrame(() => oferta.classList.add("visivel"));
}

// timeupdate only fires while currentTime is actually advancing (playback or
// a seek), never on a wall-clock interval. That is what makes "paused for 3
// minutes" and "play, pause, wait, resume" behave correctly with no extra
// bookkeeping: no ticks arrive while paused, so nothing accumulates.
video.addEventListener("timeupdate", () => {
  if (ultimoTempo !== null) {
    const delta = video.currentTime - ultimoTempo;
    // A real playback tick is a fraction of a second. Anything bigger is a
    // seek (dragging the scrubber forward), never counted as watched time.
    if (delta > 0 && delta < 2) acumulado += delta;
  }
  ultimoTempo = video.currentTime;
  // delaySeconds is undefined only if config.js failed to load or the field
  // was removed; acumulado >= undefined is always false, so this fails
  // closed on purpose instead of guessing a number.
  if (acumulado >= delaySeconds) revelarOferta();
});

// Reset the baseline on pause and on seek so neither a resume nor a scrub
// while paused computes a delta against a stale position.
video.addEventListener("pause", () => { ultimoTempo = null; });
video.addEventListener("seeking", () => { ultimoTempo = video.currentTime; });

// Missing file (Task 10/11 land assets/vsl-essencial.mp4 later) or a real
// playback failure: either way, do not leave the visitor stuck looking at a
// dead player with no path forward. Hide the broken element, say so, and let
// the offer stand on its own since there is nothing left to gate it on.
video.addEventListener("error", () => {
  video.hidden = true;
  avisoVideo.hidden = false;
  revelarOferta();
});

// --- Checkout links ---------------------------------------------------
// Base URLs live only in config.js; a price or SKU change never touches this
// file. utm_content carries the quiz degrau when a session exists; without
// one (email, e-book bridge, ad) the links are just the bare checkout.
const DEGRAUS_VALIDOS = ["A", "B", "C", "D"];

function lerDegrauDoQuiz() {
  try {
    const bruto = sessionStorage.getItem("essencial.diag");
    if (!bruto) return null;
    const diag = JSON.parse(bruto);
    return DEGRAUS_VALIDOS.includes(diag.real) ? diag.real : null;
  } catch (falha) {
    console.warn("vsl: sessionStorage indisponível ou diagnóstico inválido", falha);
    return null;
  }
}

function comDegrau(checkoutUrl, degrau) {
  try {
    const alvo = new URL(checkoutUrl);
    if (degrau) alvo.searchParams.set("utm_content", `degrau-${degrau}`);
    return alvo.toString();
  } catch (falha) {
    return checkoutUrl;
  }
}

const degrau = lerDegrauDoQuiz();
if (cfg.checkoutAnual) ctaAnual.href = comDegrau(cfg.checkoutAnual, degrau);
if (cfg.checkoutTrimestral) ctaTrimestral.href = comDegrau(cfg.checkoutTrimestral, degrau);
