import assert from "node:assert/strict";
import { diagnosticar } from "./diagnostico.mjs";
import { textoResultado } from "./resultado.mjs";

const ok = { q1: "sei", q2: "6mais", q3: "nenhuma", q4: "seguro_sei", q5: "nao_tenho_pj",
             q6: "carteira_junto", q7: "todo_mes", q8: "3meses", q9: "processo",
             q10: "D", q11: "100a300", q12: "3meses" };

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

console.log("diagnostico.selftest ok");
