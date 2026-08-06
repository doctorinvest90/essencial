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

// textoResultado: nenhuma string produzida cita ativo, promete rentabilidade
// ou afirma interpretação tributária (regra regulatória, §4.9). Blocklist,
// não NLP: word-boundary pra não pegar "ação" dentro de "organização" nem
// "render" dentro de "renda".
{
  const termosProibidos = [
    "CDB", "LCI", "LCA", "tesouro", "ação", "ações", "ETF", "FII", "fundo", "fundos", "previdência",
    "render", "rendimento", "rentabilidade", "retorno", "valorizar", "ganho", "% ao ano",
    "isento", "dedutível", "restituição",
  ];
  const termoProibidoEncontrado = (texto) => {
    const lower = texto.toLowerCase();
    return termosProibidos.find((termo) =>
      /^[a-zà-ÿ]+$/i.test(termo)
        ? new RegExp(`\\b${termo.toLowerCase()}\\b`, "i").test(lower)
        : lower.includes(termo.toLowerCase())
    );
  };
  for (const diag of casosCincoTemplates) {
    const texto = textoResultado(diag);
    const strings = [texto.titulo, texto.porque, texto.primeiroPasso, texto.cta.label, ...texto.abertos];
    for (const s of strings) {
      const achado = termoProibidoEncontrado(s);
      assert.ok(!achado, `termo proibido "${achado}" encontrado em: "${s}"`);
    }
  }
}

console.log("diagnostico.selftest ok");
