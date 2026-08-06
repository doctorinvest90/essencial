import assert from "node:assert/strict";
import { diagnosticar } from "./diagnostico.mjs";

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

console.log("diagnostico.selftest ok");
