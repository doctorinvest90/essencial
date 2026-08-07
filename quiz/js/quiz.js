// Screen flow, answer collection and result rendering for the quiz.
// The diagnosis itself lives in diagnostico.mjs; the result copy in
// resultado.mjs. This file owns the DOM and nothing else.
//
// Answer ids are NOT declared here on purpose: they are the `value` attributes
// in index.html, which copy the OPENS table of diagnostico.mjs. Two copies of
// the same id list would be a third place to drift.
import { diagnosticar } from "./diagnostico.mjs";
import { textoResultado } from "./resultado.mjs";
// DOMINIO_DE_PRODUCAO guards both the lead POST below and the funnel beacon
// in beacon.mjs: one regex, imported by both, instead of two copies that can
// drift out of sync.
import { DOMINIO_DE_PRODUCAO, enviarBeacon } from "./beacon.mjs";

const ESPERA_MS = 2500; // "analisando" screen, per copy.md
const AVANCO_MS = 220; // pause after a tap, so the selection is visible before the screen turns
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/; // same rule the backend validator applies

const cfg = window.DI_CONFIG || {};
const telas = Array.from(document.querySelectorAll(".tela"));
// Only screens carrying a block name count towards the progress bar: the hook,
// the waiting screen and the result are outside the 18.
const contadas = telas.filter((tela) => tela.dataset.bloco);
const respostas = {};
let indice = 0;
let avancoAgendado = null; // id of the pending auto-advance, so mostrar() can cancel it

const progresso = document.getElementById("progresso");
const progressoBloco = document.getElementById("progresso-bloco");
const progressoPasso = document.getElementById("progresso-passo");
const progressoBarra = document.getElementById("progresso-barra");

const form = document.getElementById("form-captura");
const campoNome = document.getElementById("campo-nome");
const campoEmail = document.getElementById("campo-email");
const campoOptin = document.getElementById("campo-optin");
const botaoDiagnostico = document.getElementById("botao-diagnostico");
const erro = document.getElementById("erro-captura");

function indiceDe(id) {
  return telas.findIndex((tela) => tela.id === id);
}

function mostrar(alvo) {
  const proxima = telas[alvo];
  if (!proxima) return;
  // Any navigation cancels a pending auto-advance, so one gesture never turns
  // two screens. Picking an option schedules an advance AVANCO_MS out; on a
  // screen the visitor already answered the button is enabled, so changing the
  // answer and tapping "Continuar" inside that window used to fire twice and
  // skip a screen. Past q12 the skipped screen is the capture form and the
  // visitor lands on "analisando", which has no way out: no diagnosis, no lead,
  // no error. Clearing here (instead of inside avancar) covers Voltar too,
  // which had the same double-navigation in a milder form.
  window.clearTimeout(avancoAgendado);
  telas[indice].classList.remove("ativa");
  indice = alvo;
  proxima.classList.add("ativa");
  sincronizarAvanco(proxima);
  atualizarProgresso(proxima);
  window.scrollTo(0, 0);
  proxima.focus({ preventScroll: true });
}

// Question screens ship their "Continuar" button disabled and it only unlocks
// once that question has an answer. Without it the Back button is a dead end:
// re-picking the SAME option fires no `change` (the checkedness does not move),
// so the only way forward would be recording an answer the visitor does not
// mean. The question name is read off the screen's own radios instead of a
// list here, for the same reason the option ids are not declared in this file.
function sincronizarAvanco(tela) {
  const botao = tela.querySelector("[data-avancar]");
  if (!botao) return;
  const radio = tela.querySelector('input[type="radio"]');
  if (!radio) return; // content screens have nothing to answer
  botao.disabled = respostas[radio.name] === undefined;
}

function atualizarProgresso(tela) {
  const bloco = tela.dataset.bloco;
  progresso.hidden = !bloco;
  if (!bloco) return;
  const passo = contadas.indexOf(tela) + 1;
  progressoBloco.textContent = bloco;
  progressoPasso.textContent = `${passo} de ${contadas.length}`;
  progressoBarra.style.width = `${(passo / contadas.length) * 100}%`;
}

function avancar() {
  mostrar(indice + 1);
}

function voltar() {
  mostrar(indice - 1);
}

// Picking an option records the answer and turns the screen on its own: no
// "next" button on question screens.
document.addEventListener("change", (evento) => {
  const campo = evento.target;
  if (!(campo instanceof HTMLInputElement) || campo.type !== "radio") return;
  respostas[campo.name] = campo.value;
  avancoAgendado = window.setTimeout(avancar, AVANCO_MS);
});

document.addEventListener("click", (evento) => {
  if (!(evento.target instanceof Element)) return;
  if (evento.target.closest("[data-avancar]")) {
    evento.preventDefault();
    avancar();
    return;
  }
  if (evento.target.closest("[data-voltar]")) {
    evento.preventDefault();
    voltar();
  }
});

function validarCaptura() {
  const pronto =
    campoNome.value.trim().length > 0 &&
    EMAIL_RE.test(campoEmail.value.trim()) &&
    campoOptin.checked;
  botaoDiagnostico.disabled = !pronto;
  return pronto;
}

form.addEventListener("input", validarCaptura);
form.addEventListener("change", validarCaptura);

form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  if (!validarCaptura()) {
    erro.textContent = "Preencha nome, um e-mail válido e marque a autorização.";
    return;
  }
  erro.textContent = "";
  const diag = diagnosticar(respostas);
  guardarDiag(diag);
  enviarLead(diag); // fire and forget: the network never holds the result back
  enviarBeacon("essencial-quiz-done", "view");
  renderResultado(diag);
  mostrar(indiceDe("tela-analisando"));
  window.setTimeout(() => mostrar(indiceDe("tela-resultado")), ESPERA_MS);
});

// Read by /vsl to keep the degrau across the jump and push it down to the
// checkout as utm_content.
function guardarDiag(diag) {
  try {
    sessionStorage.setItem(
      "essencial.diag",
      JSON.stringify({
        real: diag.real,
        energia: diag.energia,
        gap: diag.gap,
        faixa: diag.faixa,
        ts: new Date().toISOString(),
      })
    );
  } catch (falha) {
    console.warn("quiz: sessionStorage indisponível", falha);
  }
}

// Field names are the QuizLeadIn model (dashboard backend). A wrong name is
// dropped silently by Pydantic, so this object is copied from the model, not
// invented here.
function enviarLead(diag) {
  if (!cfg.leadUrl) return;
  if (!DOMINIO_DE_PRODUCAO.test(window.location.hostname)) {
    console.info(
      `quiz: lead não enviado porque "${window.location.hostname}" está fora de drheliobarros.com.br. É de propósito, para teste local não gravar lead de verdade. O diagnóstico aparece normalmente.`
    );
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const corpo = {
    nome: campoNome.value.trim(),
    email: campoEmail.value.trim(),
    degrau_real: diag.real, // null when nothing is open; the model accepts null
    degrau_energia: diag.energia,
    gap: diag.gap,
    faixa: diag.faixa,
    respostas,
    utm_source: params.get("utm_source"),
    utm_campaign: params.get("utm_campaign"),
  };
  try {
    window
      .fetch(cfg.leadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
        keepalive: true,
      })
      .catch((falha) => console.warn("quiz: POST do lead falhou", falha));
  } catch (falha) {
    console.warn("quiz: POST do lead falhou", falha);
  }
}

function renderResultado(diag) {
  const texto = textoResultado(diag);
  document.getElementById("res-titulo").textContent = texto.titulo;

  const lista = document.getElementById("res-abertos");
  lista.textContent = "";
  for (const motivo of texto.abertos) {
    const item = document.createElement("li");
    item.textContent = motivo;
    lista.appendChild(item);
  }
  document.getElementById("res-abertos-bloco").hidden = texto.abertos.length === 0;

  document.getElementById("res-porque").textContent = texto.porque;
  document.getElementById("res-primeiro-passo").textContent = texto.primeiroPasso;
  // resultado.mjs returns only label and href for the CTA, so the line that
  // explains the consultoria exit lives in index.html and the page decides when
  // to show it.
  document.getElementById("res-saida-de-cima").hidden = diag.faixa !== "acima500";

  const cta = document.getElementById("res-cta");
  cta.textContent = `${texto.cta.label} →`;
  cta.href = texto.cta.href;
}

enviarBeacon("essencial-quiz", "view");
mostrar(0);
