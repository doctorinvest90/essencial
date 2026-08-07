// Logic for /vsl: gates the offer behind accumulated video play time, tags
// the checkout with the quiz degrau when a session exists, and beacons the
// 3 funnel steps that happen on this page. Loaded as a module (like quiz.js)
// so it can import the shared beacon from beacon.mjs instead of duplicating
// it; the script tag still sits at the end of body after config.js, so
// timing is unchanged.
import { enviarBeacon } from "./beacon.mjs";
import { acumular, liberaOferta } from "./acumulador.mjs";

const cfg = window.DI_CONFIG || {};

const video = document.getElementById("video-vsl");
const avisoVideo = document.getElementById("aviso-video");
const oferta = document.getElementById("oferta");
const ctaAnual = document.getElementById("cta-anual");
const ctaTrimestral = document.getElementById("cta-trimestral");

enviarBeacon("essencial-vsl", "view");

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
  enviarBeacon("essencial-vsl-offer", "view");
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
  // The arithmetic itself lives in acumulador.mjs, where a Node self-check can
  // reach it: which deltas count, which are scrubs, and what a missing
  // threshold means are the rules that unlock a R$997 button, and they are not
  // provable from inside this file (it needs a DOM to even load).
  acumulado = acumular(acumulado, ultimoTempo, video.currentTime);
  ultimoTempo = video.currentTime;
  if (liberaOferta(acumulado, delaySeconds)) revelarOferta();
});

// Fallback that keeps a misconfigured delay from hiding the offer forever: a
// video that reached the end was, by definition, watched enough. Without it,
// an offerDelaySeconds larger than what the cut can accumulate (bad
// measurement, a shorter re-cut, one digit too many) means the visitor
// watches the whole thing and never sees a price or a button, with no error
// and no beacon, and the funnel reads it as "the video loses people early".
video.addEventListener("ended", revelarOferta);

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

// Mirrors the Degrau domain of diagnostico.mjs (the OPENS keys A/B/C/D),
// which is where these four letters are defined and where a fifth one would
// be born. Not imported because this page must not pull the diagnosis engine
// just to validate a session value; if that domain ever changes, change it
// here too.
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

// Both checkout options are the same funnel step. sendBeacon (inside
// enviarBeacon) is what makes this survive the navigation the click
// triggers right after, so no preventDefault/delay is needed here.
function onCheckoutClick() {
  enviarBeacon("essencial", "checkout_click");
}
ctaAnual.addEventListener("click", onCheckoutClick);
ctaTrimestral.addEventListener("click", onCheckoutClick);
