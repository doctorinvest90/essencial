import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diagnosticar, OPENS } from "./diagnostico.mjs";
import { textoResultado } from "./resultado.mjs";
import { acumular, liberaOferta, DELTA_MAXIMO_SEGUNDOS } from "./acumulador.mjs";
import { enviarPixel, iniciarPixel } from "./beacon.mjs";

// Every id here is the real option id emitted by index.html (the guard at the
// bottom of this file proves it). Answers chosen so nothing opens.
const ok = { q1: "sei_numero", q2: "mais6", q3: "nenhuma", q4: "seguro_sei_quanto", q5: "nao_tenho_pj",
             q6: "carteira_com_alguem", q7: "todo_mes", q8: "ultimos_3_meses", q9: "tenho_processo",
             q10: "D", q11: "100a300", q12: "tres_meses" };

// tudo em ordem: nenhum degrau aberto
{
  const d = diagnosticar(ok);
  assert.equal(d.real, null);
  assert.equal(d.gap, "emordem");
  assert.deepEqual(d.abertos, []);
}

// o caso que dói: investe (energia C) com a base aberta (real A)
{
  const d = diagnosticar({ ...ok, q2: "menos1", q10: "C" });
  assert.equal(d.real, "A");
  assert.equal(d.energia, "C");
  assert.equal(d.gap, "acima");
  assert.ok(d.motivos.some((m) => /reserva/i.test(m)));
}

// real é sempre o MAIS BAIXO aberto, não o último detectado
{
  const d = diagnosticar({ ...ok, q3: "sim_incomoda", q8: "nunca" });
  assert.equal(d.real, "A");
  assert.deepEqual(d.abertos, ["A", "D"]);
}

// "não tenho PJ" não abre B — mas o bloco ainda abre por outra resposta
{
  const semPj = diagnosticar({ ...ok, q4: "seguro_sei", q5: "nao_tenho_pj" });
  assert.ok(!semPj.abertos.includes("B"), "não aplicável não pode contar como aberto");
  const misturado = diagnosticar({ ...ok, q5: "tudo_misturado" });
  assert.ok(misturado.abertos.includes("B"));
  assert.equal(misturado.real, "B");
}

// energia abaixo do real é caso válido, não erro
{
  const d = diagnosticar({ ...ok, q8: "nunca", q10: "A" });
  assert.equal(d.real, "D");
  assert.equal(d.gap, "abaixo");
}

// resposta faltando não derruba: trata como não respondida, nunca como aberta
{
  const d = diagnosticar({ q10: "C", q11: "ate100" });
  assert.equal(d.gap, "emordem");
  assert.equal(d.energia, "C");
}

// textoResultado: cada um dos 4 degraus reais produz título não vazio
{
  const casosPorDegrau = {
    A: { ...ok, q2: "menos1" },
    B: { ...ok, q5: "tudo_misturado" },
    C: { ...ok, q6: "poupanca" },
    D: { ...ok, q8: "nunca" },
  };
  for (const [degrau, respostas] of Object.entries(casosPorDegrau)) {
    const diag = diagnosticar(respostas);
    assert.equal(diag.real, degrau, `fixture não abriu o degrau ${degrau} esperado`);
    assert.ok(textoResultado(diag).titulo.length > 0, `titulo vazio para degrau ${degrau}`);
  }
}

// textoResultado: o caso em ordem (real === null) também produz título não vazio
{
  const diag = diagnosticar(ok);
  assert.equal(diag.real, null);
  assert.ok(textoResultado(diag).titulo.length > 0);
}

// textoResultado: faixa "acima500" sempre devolve o CTA de consultoria,
// em todos os casos de gap, inclusive o em ordem
{
  const casosPorGap = [
    ok, // emordem
    { ...ok, q2: "menos1", q10: "C" }, // acima
    { ...ok, q5: "tudo_misturado", q10: "B" }, // igual
    { ...ok, q8: "nunca", q10: "A" }, // abaixo
  ];
  const gapsVistos = new Set();
  for (const base of casosPorGap) {
    const diag = diagnosticar({ ...base, q11: "acima500" });
    assert.equal(diag.faixa, "acima500");
    gapsVistos.add(diag.gap);
    const texto = textoResultado(diag);
    assert.equal(texto.cta.label, "Falar sobre a consultoria");
    assert.ok(texto.cta.href.includes("wa.me"));
  }
  assert.deepEqual(gapsVistos, new Set(["emordem", "acima", "igual", "abaixo"]));
}

// Um diag por template de copy (DEGRAUS.A/B/C/D + EM_ORDEM), reusado pelas
// duas guardas abaixo.
const casosCincoTemplates = [
  diagnosticar({ ...ok, q2: "menos1", q10: "C" }),
  diagnosticar({ ...ok, q5: "tudo_misturado", q10: "B" }),
  diagnosticar({ ...ok, q6: "poupanca", q10: "A" }),
  diagnosticar({ ...ok, q8: "nunca" }),
  diagnosticar(ok),
];

// textoResultado: nenhuma string produzida contém travessão (regra de estilo da casa)
{
  for (const diag of casosCincoTemplates) {
    const texto = textoResultado(diag);
    const strings = [texto.titulo, texto.porque, texto.primeiroPasso, texto.cta.label, texto.cta.href, ...texto.abertos];
    for (const s of strings) {
      assert.ok(!s.includes("—"), `travessão encontrado em: "${s}"`);
    }
  }
}

// Blocklist regulatória (§4.9) + o matcher que a aplica. Hoisted pra fora
// do bloco de teste: a guarda precisa de teste próprio (review round 2),
// desacoplado de "a copy de hoje está limpa" — isso não prova que a guarda
// pega uma violação nova.
//
// Cada termo com plural regular ("+s") lista as duas formas: "s" é \w,
// então \btermo\b não fecha fronteira em "termos" ("ganho" não batia em
// "ganhos", achado do round 2). Plural irregular (ação→ações,
// dedutível→dedutíveis, restituição→restituições) também listado por
// extenso: não dá pra derivar de sufixo, e prefixo ingênuo (ex.: "dedut")
// arrisca falso positivo em palavra não relacionada.
//
// Round 3: infinitivo bare de "render"/"valorizar" não pega a conjugação
// que aparece de verdade em copy financeira ("rende 1% ao mês" não batia
// em nada — nem no verbo, nem em "% ao ano", que é frase fixa e só cobria
// uma janela de tempo). Somei presente/passado/futuro na 3ª pessoa (o
// sujeito de copy financeira é sempre o ativo/carteira, nunca "eu"/"tu" —
// não é a conjugação completa de dicionário) e as janelas de tempo mais
// comuns ao lado de "%". `render`/`rende`/`rendem`/etc. usam \b, então não
// colidem com "renda" — a renda do médico é tema central do produto e
// continua livre (ver o teste de falso positivo abaixo).
const termosProibidos = [
  "CDB", "CDBs", "LCI", "LCIs", "LCA", "LCAs", "tesouro", "tesouros",
  "ação", "ações", "ETF", "ETFs", "FII", "FIIs", "fundo", "fundos",
  "previdência", "previdências",
  "render", "rende", "rendem", "rendeu", "renderam", "renderá", "renderão",
  "rendimento", "rendimentos", "rentabilidade", "rentabilidades",
  "retorno", "retornos",
  "valorizar", "valoriza", "valorizam", "valorizou", "valorizaram", "valorizará", "valorizarão",
  "ganho", "ganhos",
  "% ao ano", "% ao mês", "% ao trimestre",
  "isento", "isentos", "dedutível", "dedutíveis", "restituição", "restituições",
];

// Word-boundary pra não pegar "ação" dentro de "organização" nem "render"
// dentro de "renda"; substring simples só pra "% ao ano" ("%" e espaço não
// são caracteres de palavra).
function termoProibidoEncontrado(texto) {
  const lower = texto.toLowerCase();
  return termosProibidos.find((termo) =>
    /^[a-zà-ÿ]+$/i.test(termo)
      ? new RegExp(`\\b${termo.toLowerCase()}\\b`, "i").test(lower)
      : lower.includes(termo.toLowerCase())
  );
}

// termoProibidoEncontrado testada isoladamente: violações no singular E no
// plural, mais as formas verbais de render/valorizar e as janelas de tempo
// (round 3) — "rende 1% ao mês" é a frase que o §4.9 proíbe e é a razão de
// a guarda existir; hoje ela não batia em nada. Prova que a guarda pega a
// edição futura, não só que a copy atual passa.
{
  const violacoes = [
    "considere um CDB", "considere CDBs",
    "essa LCI", "essas LCIs",
    "essa LCA", "essas LCAs",
    "aplique no tesouro", "aplique nos tesouros",
    "compre uma ação", "compre ações",
    "esse ETF", "esses ETFs",
    "esse FII", "esses FIIs",
    "esse fundo", "esses fundos",
    "sua previdência", "suas previdências",
    "isso vai render",
    "rende 1% ao mês",
    "rende 12% ao ano",
    "esse produto paga 3% ao mês",
    "um produto que paga 2% ao trimestre",
    "os investimentos rendem bem",
    "isso rendeu bem",
    "os investimentos renderam bem",
    "isso renderá mais",
    "esses investimentos renderão mais",
    "seu rendimento", "seus rendimentos",
    "a rentabilidade", "as rentabilidades",
    "o retorno", "os retornos",
    "vai valorizar",
    "esse investimento valoriza rápido",
    "esses investimentos valorizam rápido",
    "isso valorizou bem",
    "esses investimentos valorizaram bem",
    "isso valorizará mais",
    "esses investimentos valorizarão mais",
    "esse ganho", "esses ganhos",
    "é isento", "são isentos",
    "é dedutível", "são dedutíveis",
    "peça a restituição", "peça as restituições",
  ];
  for (const texto of violacoes) {
    assert.ok(termoProibidoEncontrado(texto), `guarda não pegou violação: "${texto}"`);
  }

  // Falso positivo que quebraria o produto: "renda" sozinha (a renda do
  // médico é tema central da copy) não pode disparar a guarda. A segunda
  // frase é o trecho real de DEGRAUS.B em resultado.mjs.
  const legitimas = [
    "Sua renda continua a mesma, mesmo com o imprevisto.",
    "deixar a família sem renda ao mesmo tempo",
  ];
  for (const texto of legitimas) {
    assert.equal(termoProibidoEncontrado(texto), undefined, `falso positivo em texto legítimo: "${texto}"`);
  }
}

// textoResultado: nenhuma string produzida cita ativo, promete rentabilidade
// ou afirma interpretação tributária. Inclui cta.href (carrega a mensagem do
// WhatsApp url-encoded, texto que o usuário vê no compositor) — mesma
// cobertura da guarda de travessão acima, sem assimetria.
{
  for (const diag of casosCincoTemplates) {
    const texto = textoResultado(diag);
    const strings = [texto.titulo, texto.porque, texto.primeiroPasso, texto.cta.label, texto.cta.href, ...texto.abertos];
    for (const s of strings) {
      const achado = termoProibidoEncontrado(s);
      assert.ok(!achado, `termo proibido "${achado}" encontrado em: "${s}"`);
    }
  }
}

// index.html <-> OPENS contract.
//
// The silent coupling in this feature: the `value` of each question's inputs
// ARE the keys of OPENS. A diverging id breaks nothing visible, the question
// just stops opening its degrau and the diagnosis comes out wrong with no
// signal at all. This block is the only test that catches it.
{
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

  // One input per option: name="qN" plus value="...", attributes in any order.
  // Fields without a qN name (nome, e-mail, opt-in) are left out on purpose.
  const opcoesPorPergunta = {};
  for (const [tag, pergunta] of html.matchAll(/<input\b[^>]*\bname="(q\d+)"[^>]*>/g)) {
    const achado = /\bvalue="([^"]*)"/.exec(tag);
    assert.ok(achado, `input de ${pergunta} sem value: ${tag}`);
    assert.ok(achado[1].length > 0, `input de ${pergunta} com value vazio: ${tag}`);
    (opcoesPorPergunta[pergunta] ??= []).push(achado[1]);
  }

  // The quiz is 12 questions. One more or one less here means either a
  // question the engine never reads, or an engine question gone from screen.
  const esperadas = Array.from({ length: 12 }, (_, i) => `q${i + 1}`);
  assert.deepEqual(
    new Set(Object.keys(opcoesPorPergunta)),
    new Set(esperadas),
    "index.html tem que emitir exatamente q1..q12"
  );

  for (const [pergunta, ids] of Object.entries(opcoesPorPergunta)) {
    assert.equal(new Set(ids).size, ids.length, `${pergunta} tem value repetido no HTML`);
  }

  // Forward: every OPENS rule must find its value in the HTML, otherwise it
  // is a dead rule (the degrau never opens through that answer).
  for (const [pergunta, regra] of Object.entries(OPENS)) {
    const noHtml = opcoesPorPergunta[pergunta] ?? [];
    for (const id of regra.ids) {
      assert.ok(
        noHtml.includes(id),
        `OPENS.${pergunta} abre em "${id}", mas index.html não emite esse value`
      );
    }
  }

  // Backward: an id OPENS knows must not show up under another question in
  // the HTML (copy-paste between screens would open the wrong degrau).
  const donoDoId = new Map();
  for (const [pergunta, regra] of Object.entries(OPENS)) {
    for (const id of regra.ids) donoDoId.set(id, pergunta);
  }
  for (const [pergunta, ids] of Object.entries(opcoesPorPergunta)) {
    for (const id of ids) {
      const dono = donoDoId.get(id);
      assert.ok(
        dono === undefined || dono === pergunta,
        `"${id}" está em ${pergunta} no HTML, mas em OPENS pertence a ${dono}`
      );
    }
  }

  // q10 (energia), q11 (faixa) and q12 (urgência) never go through OPENS: the
  // first two land raw in the diagnosis, the third only in the lead record.
  // They need a consistency check of their own.
  assert.deepEqual(new Set(opcoesPorPergunta.q10), new Set(["A", "B", "C", "D"]));
  assert.deepEqual(
    new Set(opcoesPorPergunta.q11),
    new Set(["ate100", "100a300", "300a500", "acima500"])
  );
  assert.equal(opcoesPorPergunta.q12.length, 4, "q12 tem que ter as 4 opções de urgência");

  for (const energia of opcoesPorPergunta.q10) {
    assert.equal(
      diagnosticar({ ...ok, q10: energia }).energia,
      energia,
      `value "${energia}" de q10 não vira o degrau de energia`
    );
  }
  const trocamOCta = opcoesPorPergunta.q11.filter((faixa) =>
    textoResultado(diagnosticar({ ...ok, q11: faixa })).cta.href.includes("wa.me")
  );
  assert.deepEqual(trocamOCta, ["acima500"], "só a faixa acima500 pode virar o CTA de consultoria");

  // The top-exit line does not exist in resultado.mjs: the screen owns it. If
  // it disappears from the HTML, the consultoria button loses its explanation.
  assert.ok(
    html.includes("Seu caso passou do Essencial."),
    "a frase da saída de cima sumiu do index.html"
  );
}

// Every question screen needs a way forward that is not "change your answer".
//
// Picking an option advances on its own, but that is a `change` listener, and
// `change` does not fire when a visitor comes back and clicks the SAME option
// (the checkedness does not move). Without a button on the screen, Back is a
// dead end whose only exit is recording an answer the visitor does not mean.
// Reading the real HTML is what catches a 13th question added later without
// one.
{
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const telas = [...html.matchAll(/<section\b[^>]*\bclass="tela[^"]*"[^>]*>([\s\S]*?)<\/section>/g)]
    .map((m) => m[1]);

  const comPergunta = telas.filter((corpo) => /\bname="q\d+"/.test(corpo));
  assert.equal(
    comPergunta.length,
    12,
    `esperava 12 telas de pergunta no index.html, achou ${comPergunta.length}`
  );
  for (const corpo of comPergunta) {
    const pergunta = /\bname="(q\d+)"/.exec(corpo)[1];
    const botao = /<button\b[^>]*\bdata-avancar\b[^>]*>/.exec(corpo);
    assert.ok(botao, `a tela de ${pergunta} não tem botão de avançar: quem volta nela fica preso`);
    assert.ok(
      /\bdisabled\b/.test(botao[0]),
      `o botão de avançar de ${pergunta} nasce habilitado, então dá para pular a pergunta sem responder`
    );
  }

  // The capture screen already has its own submit; a second forward button
  // there would jump over the form (and over the lead).
  const captura = telas.find((corpo) => corpo.includes('id="form-captura"'));
  assert.ok(captura, "tela de captura não encontrada no index.html");
  assert.ok(
    !/data-avancar/.test(captura),
    "a tela de captura ganhou um botão de avançar além do submit"
  );

  // The button only unlocks through mostrar(). If that call goes away the
  // screens keep their buttons and they stay disabled forever, which is the
  // same dead end with extra steps. Textual check: it anchors the two names
  // that have to keep existing together, not the flow itself.
  const fonteQuiz = readFileSync(new URL("./quiz.js", import.meta.url), "utf8");
  assert.ok(
    /function sincronizarAvanco\(/.test(fonteQuiz) && /sincronizarAvanco\(proxima\)/.test(fonteQuiz),
    "mostrar() não sincroniza mais o botão de avançar: pergunta respondida ficaria com o botão desabilitado para sempre"
  );

  // The auto-advance timer has to stay cancellable, and something has to
  // cancel it. Enabling the button opened a race: on an answered screen,
  // changing the answer schedules an advance and tapping "Continuar" inside
  // that window fires a second one, skipping a screen. After q12 the skipped
  // screen is the capture form and the visitor is stranded on "analisando"
  // forever, with no diagnosis and no lead. There is no DOM here, so the
  // timing itself is covered by manual verification (see the report); what
  // this asserts is that the two halves of the fix still exist together.
  const agendamentos = fonteQuiz.match(/setTimeout\(avancar\b/g) ?? [];
  assert.equal(agendamentos.length, 1, "há mais de um lugar agendando avancar: cada um precisaria do próprio cancelamento");
  const agenda = /(\w+)\s*=\s*window\.setTimeout\(avancar\b/.exec(fonteQuiz);
  assert.ok(agenda, "o auto-avanço não guarda mais o id do setTimeout, então ninguém consegue cancelá-lo");
  assert.ok(
    new RegExp(`window\\.clearTimeout\\(${agenda[1]}\\)`).test(fonteQuiz),
    `ninguém cancela ${agenda[1]}: trocar a resposta e tocar em Continuar dentro da janela avança duas vezes e pula uma tela`
  );
}

// The lead POST and the funnel beacon only fire on the live domain, so a page
// opened on localhost, in a fork or from a copied file never writes a real
// person into the production funnel (Task 13b subscribes these leads to a
// real list) nor counts a fake step. The guard now lives once in beacon.mjs
// and is imported by quiz.js (lead POST + its own beacon calls) and vsl.js
// (its beacon calls); a second copy in either file would keep this test
// passing while production quietly drifted between the two rules.
{
  const fonteBeacon = readFileSync(new URL("./beacon.mjs", import.meta.url), "utf8");
  const achado = /const DOMINIO_DE_PRODUCAO = \/(.*)\/;/.exec(fonteBeacon);
  assert.ok(achado, "beacon.mjs não declara mais DOMINIO_DE_PRODUCAO numa linha só");
  assert.ok(
    fonteBeacon.includes("DOMINIO_DE_PRODUCAO.test("),
    "DOMINIO_DE_PRODUCAO existe em beacon.mjs mas ninguém aplica a guarda lá dentro"
  );
  const dominio = new RegExp(achado[1]);

  for (const host of ["essencial.drheliobarros.com.br", "drheliobarros.com.br", "www.drheliobarros.com.br"]) {
    assert.ok(dominio.test(host), `"${host}" é produção e tem que enviar lead e beacon`);
  }
  for (const host of ["localhost", "127.0.0.1", "", "essencial-lp.github.io",
                      "naodrheliobarros.com.br", "drheliobarros.com.br.exemplo.com"]) {
    assert.ok(!dominio.test(host), `"${host}" não pode gravar lead nem beacon em produção`);
  }

  // Neither caller may declare its own copy of the regex; both have to pull
  // it (directly or via enviarBeacon) from beacon.mjs.
  const fonteQuiz = readFileSync(new URL("./quiz.js", import.meta.url), "utf8");
  const fonteVsl = readFileSync(new URL("./vsl.js", import.meta.url), "utf8");
  for (const [nome, fonte] of [["quiz.js", fonteQuiz], ["vsl.js", fonteVsl]]) {
    assert.ok(
      !/const DOMINIO_DE_PRODUCAO\s*=/.test(fonte),
      `${nome} declara uma cópia própria de DOMINIO_DE_PRODUCAO em vez de importar de beacon.mjs`
    );
    assert.ok(
      /from\s+["']\.\/beacon\.mjs["']/.test(fonte),
      `${nome} não importa de beacon.mjs`
    );
  }
  assert.ok(
    fonteQuiz.includes("DOMINIO_DE_PRODUCAO.test("),
    "quiz.js não aplica mais a guarda no envio do lead"
  );
}

// The Meta Pixel obeys the same production-domain rule as the beacon, and the
// "Lead" event is what an ad campaign optimises against. Two ways this breaks
// silently and neither shows on screen: the pixel firing from a local test or
// a fork (poisoning the very audience the campaign will target), and the Lead
// event getting dropped in a refactor while the beacon survives — which reads
// downstream as "the traffic does not convert" when in fact nobody counted.
{
  const janelaOriginal = Object.getOwnPropertyDescriptor(globalThis, "window");
  const comJanela = (janela, corpo) => {
    globalThis.window = janela;
    try {
      corpo();
    } finally {
      if (janelaOriginal) Object.defineProperty(globalThis, "window", janelaOriginal);
      else delete globalThis.window;
    }
  };
  const chamadas = [];
  const fbqFalso = (...args) => chamadas.push(args);

  // Off production: nothing loads, nothing fires, and nothing throws.
  comJanela({ location: { hostname: "localhost" }, DI_CONFIG: { pixelId: "123" } }, () => {
    iniciarPixel();
    assert.equal(window.fbq, undefined, "iniciarPixel carregou o pixel fora de produção");
  });
  chamadas.length = 0;
  comJanela({ location: { hostname: "localhost" }, fbq: fbqFalso }, () => enviarPixel("Lead"));
  assert.deepEqual(chamadas, [], 'enviarPixel disparou "Lead" fora de produção');

  // In production, with fbq already installed: no second init, no double
  // PageView. This is also the only iniciarPixel path Node can run — the real
  // loader touches document, which is exactly why it is guarded behind this.
  chamadas.length = 0;
  comJanela(
    { location: { hostname: "essencial.drheliobarros.com.br" }, DI_CONFIG: { pixelId: "123" }, fbq: fbqFalso },
    () => iniciarPixel()
  );
  assert.deepEqual(chamadas, [], "iniciarPixel repetiu init/PageView numa página que já tinha fbq");

  // In production, the event that the campaign optimises for.
  chamadas.length = 0;
  comJanela({ location: { hostname: "essencial.drheliobarros.com.br" }, fbq: fbqFalso }, () =>
    enviarPixel("Lead")
  );
  assert.deepEqual(chamadas, [["track", "Lead"]], 'enviarPixel não disparou track/"Lead" em produção');

  // Ad blocker, or iniciarPixel never ran: a reporting loss, never an exception
  // thrown from inside the submit handler that is showing the diagnosis.
  comJanela({ location: { hostname: "essencial.drheliobarros.com.br" } }, () =>
    assert.doesNotThrow(() => enviarPixel("Lead"), "enviarPixel explodiu sem fbq em vez de avisar")
  );

  // The Lead fires from the same handler as the quiz-done beacon, between it
  // and the diagnosis. Together they are comparable: a gap between the two
  // counts is ad blockers, not a missing funnel step.
  const fonteQuizPixel = readFileSync(new URL("./quiz.js", import.meta.url), "utf8");
  const posBeacon = fonteQuizPixel.indexOf('enviarBeacon("essencial-quiz-done", "view")');
  const posLead = fonteQuizPixel.indexOf('enviarPixel("Lead")');
  const posResultado = fonteQuizPixel.indexOf("renderResultado(diag)");
  assert.ok(posLead > 0, 'quiz.js não dispara mais enviarPixel("Lead") na captura');
  assert.ok(
    posBeacon < posLead && posLead < posResultado,
    'enviarPixel("Lead") saiu de dentro do handler de captura do quiz'
  );

  // Every checkout link on /plano has to be one of the two in config.js. The page
  // hardcodes four anchors (hero, the two in the price card, closing CTA) while the
  // quiz and /vsl read config, and on 11/08 that split cost a real incident: the Eduzz
  // products were rebuilt to carry the member-area lessons, config.js was updated, and
  // four anchors on /plano kept selling the old SKUs with no course attached, while
  // paid traffic was already running. Static hrefs are kept on purpose (a page whose
  // buy button depends on JS is worse), so the invariant is enforced here instead.
  const fontePlano = readFileSync(new URL("../../plano.html", import.meta.url), "utf8");
  const fonteConfigCheckout = readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const doConfig = [...fonteConfigCheckout.matchAll(/checkout\w+:\s*"https:\/\/chk\.eduzz\.com\/(\w+)"/g)].map((m) => m[1]);
  assert.equal(doConfig.length, 2, `config.js tem ${doConfig.length} checkouts, esperado 2 (anual e trimestral)`);
  for (const [, id] of fontePlano.matchAll(/https:\/\/chk\.eduzz\.com\/(\w+)/g)) {
    assert.ok(
      doConfig.includes(id),
      `plano.html aponta para o checkout ${id}, que não está em config.js: a página vende um SKU que o quiz e a VSL não vendem`
    );
  }

  // One id, in config.js, next to the checkout links. A copy hardcoded in a
  // page is how two pixels end up half-populated and neither can optimise.
  const fonteConfigPixel = readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const achadoId = /pixelId:\s*"(\d{15,16})"/.exec(fonteConfigPixel);
  assert.ok(achadoId, "config.js não declara mais pixelId com um id numérico");
  for (const [nome, url] of [
    ["quiz.js", "./quiz.js"],
    ["vsl.js", "./vsl.js"],
    ["beacon.mjs", "./beacon.mjs"],
    ["plano.html", "../../plano.html"],
  ]) {
    const fonte = readFileSync(new URL(url, import.meta.url), "utf8");
    assert.ok(
      !fonte.includes(achadoId[1]),
      `${nome} tem o id do pixel escrito na mão em vez de ler de config.js`
    );
    assert.ok(
      nome === "beacon.mjs" || /iniciarPixel\(\)/.test(fonte),
      `${nome} não chama iniciarPixel(): a página fica invisível para o pixel`
    );
  }
}

// The funnel steps (task-7-brief.md) are literal (page, event) pairs passed to
// enviarBeacon at the call sites in quiz.js, vsl.js and plano.html. The
// backend only accepts event "view" or "checkout_click" (main.py
// FunnelEventIn) and returns 422 on anything else, so a renamed page or a
// stray event would make the backend reject the beacon and a step would go
// missing with no visible error, the failure mode this test exists to catch.
// This reads the real call sites instead of a copy of the table, so a future
// edit that drifts from the table breaks this test, not the funnel.
{
  const PASSOS_ESPERADOS = {
    "essencial-quiz": "view",
    "essencial-quiz-done": "view",
    "essencial-vsl": "view",
    "essencial-vsl-offer": "view",
    "essencial-plano": "view",
    essencial: "checkout_click",
  };
  const EVENTOS_VALIDOS_BACKEND = new Set(["view", "checkout_click"]);

  const fontes = [
    ["quiz.js", readFileSync(new URL("./quiz.js", import.meta.url), "utf8")],
    ["vsl.js", readFileSync(new URL("./vsl.js", import.meta.url), "utf8")],
    ["plano.html", readFileSync(new URL("../../plano.html", import.meta.url), "utf8")],
  ];

  const chamadas = [];
  const CHAMADA_RE = /enviarBeacon\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;
  for (const [arquivo, fonte] of fontes) {
    for (const m of fonte.matchAll(CHAMADA_RE)) {
      chamadas.push({ arquivo, page: m[1], event: m[2] });
    }
  }

  assert.equal(
    chamadas.length,
    7,
    `esperava 7 chamadas a enviarBeacon no total (quiz.js + vsl.js + plano.html), achou ${chamadas.length}`
  );

  const pagesVistas = new Set();
  const paresVistos = new Set();
  for (const { arquivo, page, event } of chamadas) {
    assert.ok(
      EVENTOS_VALIDOS_BACKEND.has(event),
      `${arquivo} manda event "${event}" pra page "${page}", mas o backend só aceita view/checkout_click (422 em produção)`
    );
    assert.ok(
      Object.prototype.hasOwnProperty.call(PASSOS_ESPERADOS, page),
      `${arquivo} manda page "${page}", que não está na tabela de passos`
    );
    assert.equal(
      event,
      PASSOS_ESPERADOS[page],
      `page "${page}" tem que mandar event "${PASSOS_ESPERADOS[page]}", ${arquivo} manda "${event}"`
    );
    // "essencial"/checkout_click is the same funnel step reached from two
    // pages (/vsl and /plano), so it is the one page allowed in two files.
    // Twice inside the SAME file would be double counting.
    const par = `${arquivo}:${page}`;
    assert.ok(!paresVistos.has(par), `page "${page}" chamada mais de uma vez em ${arquivo}`);
    paresVistos.add(par);
    pagesVistas.add(page);
  }
  assert.deepEqual(
    pagesVistas,
    new Set(Object.keys(PASSOS_ESPERADOS)),
    "todos os passos da tabela têm que aparecer pelo menos uma vez"
  );
  // /plano only reaches production through the shared module: an inline copy
  // of the sendBeacon call there would skip the domain guard.
  const fontePlano = fontes.find(([nome]) => nome === "plano.html")[1];
  assert.ok(
    /from\s+["'][^"']*beacon\.mjs["']/.test(fontePlano),
    "plano.html não importa o beacon compartilhado de beacon.mjs"
  );
  assert.ok(
    !/navigator\.sendBeacon/.test(fontePlano),
    "plano.html chama sendBeacon direto, fora da guarda de domínio de beacon.mjs"
  );
}

// The offer gate on /vsl: accumulated play time, and what it takes to cross it.
//
// This is the only logic on the funnel that turns a R$997 button visible, and until
// Task 11 it was proven only by watching a browser. The arithmetic now lives in
// acumulador.mjs precisely so it can be exercised here without a DOM.
{
  // Playback: browsers fire timeupdate roughly 4x/s, so deltas are fractions.
  {
    let acc = 0;
    let ultimo = null;
    for (const t of [0, 0.25, 0.5, 0.75, 1.0]) {
      acc = acumular(acc, ultimo, t);
      ultimo = t;
    }
    // The first tick has no baseline, so the offer clock starts at the second one.
    assert.ok(Math.abs(acc - 1.0) < 1e-9, `1s de play tinha que contar 1s, contou ${acc}`);
  }

  // Paused: timeupdate does not fire at all, and even if it did with the playhead
  // standing still, a zero delta adds nothing. Three minutes parked at 0:00 buys zero.
  {
    let acc = 0;
    for (let i = 0; i < 720; i++) acc = acumular(acc, 12.5, 12.5);
    assert.equal(acc, 0, "vídeo parado não pode acumular tempo assistido");
  }

  // Dragging the scrubber is a jump, never watched time. This is the attack: land on
  // /vsl, drag to the end, buy the offer without watching. It has to fail.
  {
    let acc = 0;
    let ultimo = 0;
    for (const t of [40, 90, 140, 165]) {
      acc = acumular(acc, ultimo, t);
      ultimo = t;
    }
    assert.equal(acc, 0, "arrastar a barra não pode comprar segundos assistidos");
    assert.equal(
      liberaOferta(acc, 111.199),
      false,
      "scrub até o fim liberou a oferta sem o vídeo ter sido assistido"
    );
  }

  // Boundary: exactly DELTA_MAXIMO_SEGUNDOS is already a seek, not a tick.
  assert.equal(acumular(0, 0, DELTA_MAXIMO_SEGUNDOS), 0, "delta igual ao teto tem que ser descartado");
  assert.ok(acumular(0, 0, DELTA_MAXIMO_SEGUNDOS - 0.001) > 0, "delta abaixo do teto tem que contar");

  // Seeking backwards produces a negative delta, which must never subtract either.
  assert.equal(acumular(30, 50, 10), 30, "voltar a barra não pode mexer no acumulado");

  // Right after a pause there is no trustworthy baseline, so that tick is dropped. The
  // accumulator therefore loses a fraction on every resume and always runs BEHIND real
  // watch time: the offer can only be born later than deserved, never earlier. For a
  // purchase gate, late is the only safe direction.
  assert.equal(acumular(9, null, 40), 9, "sem baseline (pós-pausa) nada pode ser somado");
  // Deliberately with the playhead still near the start: `null` coerces to 0, so a
  // resume late in the video is discarded anyway by the scrub ceiling and would let a
  // missing null-guard pass unnoticed. Under 2s it is not, and this is the assertion
  // that actually holds the guard in place.
  assert.equal(
    acumular(0, null, 1.5),
    0,
    "retomada a 1,5s somou tempo que ninguém assistiu: a guarda de baseline nulo sumiu"
  );

  // The full browser scenario from the Task 6 verification, as arithmetic: play, pause,
  // wait parked, resume, play. Only the two playing stretches count.
  {
    let acc = 0;
    let ultimo = null;
    for (const t of [10, 10.3, 10.6, 10.9]) { acc = acumular(acc, ultimo, t); ultimo = t; }
    ultimo = null;                                   // pause resets the baseline
    for (let i = 0; i < 10; i++) acc = acumular(acc, ultimo, 10.9);
    for (const t of [10.9, 11.2, 11.5]) { acc = acumular(acc, ultimo, t); ultimo = t; }
    assert.ok(Math.abs(acc - 1.5) < 1e-9, `esperava 1,5s de play acumulado, deu ${acc}`);
  }

  // Fails closed. A config that failed to load, lost the field or carries it as text
  // hides the offer; it never guesses a number and never shows a price early.
  for (const ruim of [undefined, null, NaN, Infinity, "111.199", {}]) {
    assert.equal(
      liberaOferta(999999, ruim),
      false,
      `limiar inválido (${String(ruim)}) tem que esconder a oferta, não liberá-la`
    );
  }
  assert.equal(liberaOferta(111.199, 111.199), true, "no limiar exato a oferta nasce");
  assert.equal(liberaOferta(111.198, 111.199), false, "um milissegundo antes ela ainda não nasce");

  // Anti-drift, same shape as the beacon guard above: vsl.js has to pull the arithmetic
  // from this module. A second copy inlined there would keep every assertion above green
  // while production drifted.
  const fonteVsl = readFileSync(new URL("./vsl.js", import.meta.url), "utf8");
  assert.ok(
    /from\s+["']\.\/acumulador\.mjs["']/.test(fonteVsl),
    "vsl.js não importa mais de acumulador.mjs: a aritmética da oferta voltou a ficar sem teste"
  );
  for (const [nome, chamada] of [["acumular", /\bacumular\(/], ["liberaOferta", /\bliberaOferta\(/]]) {
    assert.ok(chamada.test(fonteVsl), `vsl.js importa ${nome} mas não chama`);
  }
  assert.ok(
    !/acumulado\s*\+=/.test(fonteVsl),
    "vsl.js voltou a somar o acumulado por conta própria, fora da função testada"
  );
  assert.ok(
    !/acumulado\s*>=/.test(fonteVsl),
    "vsl.js voltou a comparar o acumulado com o limiar por conta própria, fora da função testada"
  );

  // offerDelaySeconds is the one number Task 11 measures and writes by hand. As text, or
  // absent, liberaOferta hides the offer forever with no error anywhere: the fail-closed
  // behaviour proved above is exactly what would swallow the mistake.
  const fonteConfig = readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const achadoDelay = /offerDelaySeconds:\s*([^,\n]+)/.exec(fonteConfig);
  assert.ok(achadoDelay, "config.js não declara mais offerDelaySeconds");
  const delayConfigurado = Number(achadoDelay[1].trim());
  assert.ok(
    Number.isFinite(delayConfigurado) && !/["']/.test(achadoDelay[1]),
    `offerDelaySeconds tem que ser número, config.js traz ${achadoDelay[1].trim()}`
  );
  // No upper bound is asserted here on purpose: the video's duration is not readable from
  // Node without a dependency, and a delay longer than the cut is already caught at
  // runtime by the 'ended' fallback in vsl.js. Duplicating the measured length as a
  // constant would just be one more number to drift on the next re-render.
  assert.ok(delayConfigurado > 0, `offerDelaySeconds tem que ser positivo, está ${delayConfigurado}`);

  // The video starts on its own, muted, and the overlay is what turns sound on.
  // Three things have to stay true together or the page breaks in ways that look
  // fine on screen: autoplay without muted is blocked by every browser (a video
  // that never starts), the overlay has to exist for sound to be reachable at
  // all, and turning sound on has to zero the accumulator, or the silent preview
  // buys seconds towards a R$997 button the visitor never heard justified.
  const fonteHtml = readFileSync(new URL("../../vsl.html", import.meta.url), "utf8");
  const tagVideo = /<video\b[^>]*id="video-vsl"[^>]*>/.exec(fonteHtml);
  assert.ok(tagVideo, "vsl.html não tem mais o elemento #video-vsl");
  for (const attr of ["autoplay", "muted", "playsinline"]) {
    assert.ok(
      new RegExp(`\\b${attr}\\b`).test(tagVideo[0]),
      `<video> perdeu "${attr}": sem os três juntos o autoplay é bloqueado e o vídeo nunca começa`
    );
  }
  assert.ok(
    /id="video-som"/.test(fonteHtml),
    "a camada de som sumiu do vsl.html: o vídeo ficaria mudo sem caminho para ligar o áudio"
  );
  assert.ok(
    /botaoSom\.addEventListener\("click"/.test(fonteVsl),
    "ninguém escuta o clique da camada de som"
  );
  const ligar = /function ligarSom\(\)[\s\S]*?\n}/.exec(fonteVsl);
  assert.ok(ligar, "vsl.js não tem mais ligarSom()");
  assert.ok(
    /acumulado\s*=\s*0/.test(ligar[0]) && /video\.currentTime\s*=\s*0/.test(ligar[0]),
    "ligar o som tem que voltar o vídeo ao início E zerar o acumulado: senão a prévia muda compra segundos"
  );
}

console.log("diagnostico.selftest ok");
