import test from "node:test";
import assert from "node:assert/strict";
import { carregarEntradas, salvarEntradas, exportarEntradas, dataValida, validarEntradas } from "../armazenamento.js";

const antiga = { id: 123, titulo: "Entrega", data: "2026-10-08", descricao: "Resultado" };
function ambiente(inicial = null) {
  let bruto = inicial;
  let falhar = false;
  const storage = {
    getItem: () => bruto,
    setItem: (_, valor) => { if (falhar) throw new Error("QuotaExceededError"); bruto = valor; }
  };
  globalThis.window = { localStorage: storage };
  return { storage,
    valor: () => bruto, falhar: (valor) => { falhar = valor; } };
}

test("histórico antigo carrega e preserva campos desconhecidos ao salvar", () => {
  const registro = { ...antiga, anotacaoAntiga: "preservar" };
  const a = ambiente(JSON.stringify([registro]));
  assert.deepEqual(carregarEntradas().entradas, [registro]);
  assert.equal(salvarEntradas([registro, { ...antiga, id: "novo", projeto: "Site" }]).ok, true);
  assert.equal(JSON.parse(a.valor())[0].anotacaoAntiga, "preservar");
});

test("primeiro uso não grava uma lista vazia automaticamente", () => {
  const a = ambiente();
  assert.deepEqual(carregarEntradas(), { ok: true, entradas: [] });
  assert.equal(a.valor(), null);
});

for (const bruto of ["{", "null", "{}", '[{"id":1}]', JSON.stringify([antiga, antiga]), JSON.stringify([{ ...antiga, data: "2026-02-30" }])]) {
  test(`histórico inválido permanece intacto: ${bruto}`, () => {
    const a = ambiente(bruto);
    assert.equal(carregarEntradas().ok, false);
    assert.equal(salvarEntradas([]).ok, false);
    assert.equal(exportarEntradas(), bruto);
    assert.equal(a.valor(), bruto);
  });
}

test("bloqueio do acesso ao storage retorna erro controlado", () => {
  globalThis.window = { get localStorage() { throw new Error("SecurityError"); } };
  assert.equal(carregarEntradas().ok, false);
  assert.equal(salvarEntradas([]).ok, false);
});

test("falha de gravação preserva dados e permite tentar novamente", () => {
  const a = ambiente(JSON.stringify([antiga]));
  carregarEntradas();
  a.falhar(true);
  assert.equal(salvarEntradas([]).ok, false);
  assert.deepEqual(JSON.parse(a.valor()), [antiga]);
  a.falhar(false);
  assert.equal(salvarEntradas([]).ok, true);
});

test("mudança detectada de outra aba não é sobrescrita", () => {
  const a = ambiente();
  carregarEntradas();
  a.storage.setItem("", JSON.stringify([antiga]));
  assert.equal(salvarEntradas([]).ok, false);
  assert.deepEqual(JSON.parse(a.valor()), [antiga]);
  assert.equal(carregarEntradas().ok, true);
  assert.equal(salvarEntradas([antiga]).ok, true);
});

test("lixeira sobrevive à reabertura e permite restauração", () => {
  const a = ambiente(JSON.stringify([antiga]));
  carregarEntradas();
  salvarEntradas([{ ...antiga, excluidaEm: "2026-10-08T12:00:00Z" }]);
  assert.ok(carregarEntradas().entradas[0].excluidaEm);
  assert.equal(salvarEntradas([antiga]).ok, true);
  assert.deepEqual(JSON.parse(a.valor()), [antiga]);
});

// Exemplo pequeno: chamamos a função e comparamos a resposta com o valor esperado.
test("rejeita 29 de fevereiro em um ano não bissexto", function () {
  const resultado = dataValida("2025-02-29");
  assert.equal(resultado, false);
});

test("datas reais, conteúdo obrigatório e projetos são validados", () => {
  assert.equal(dataValida("2024-02-29"), true);
  assert.equal(dataValida("0000-01-01"), false);
  assert.throws(() => validarEntradas([{ ...antiga, titulo: "   " }]));
  assert.throws(() => validarEntradas([{ ...antiga, projeto: 4 }]));
});

