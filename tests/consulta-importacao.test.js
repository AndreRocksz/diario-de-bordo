import test from "node:test";
import assert from "node:assert/strict";
import { filtrarAtividades } from "../consulta.js";
import { prepararImportacao } from "../armazenamento.js";

const antiga = { id: 1, titulo: "Entrega", data: "2026-10-08", descricao: "Resultado", projeto: "Aplicação do cliente" };
const recente = { ...antiga, id: 2, data: "2026-10-16" };

test("consulta combina projeto sem acentos e período inclusivo, excluindo a lixeira", () => {
  const removida = { ...antiga, id: 3, excluidaEm: "2026-10-16T12:00:00Z" };
  const dados = [antiga, recente, removida];
  assert.deepEqual(filtrarAtividades(dados, "APLICACAO", "2026-10-08", "2026-10-16"), [recente, antiga]);
  assert.equal(dados[0], antiga);
});

test("consulta encontra rotina e respeita limites de apenas uma data", () => {
  const rotina = { ...antiga, id: 3, projeto: "" };
  assert.deepEqual(filtrarAtividades([rotina], "rotina", "", ""), [rotina]);
  assert.deepEqual(filtrarAtividades([antiga, recente], "", "2026-10-09", ""), [recente]);
  assert.deepEqual(filtrarAtividades([antiga, recente], "", "", "2026-10-09"), [antiga]);
  assert.deepEqual(filtrarAtividades([antiga], "inexistente", "", ""), []);
});

test("prévia de importação ignora repetidos e mantém novos itens da lixeira", () => {
  const removida = { ...recente, excluidaEm: "2026-10-16T12:00:00Z" };
  const resultado = prepararImportacao(JSON.stringify([antiga, removida]), [antiga]);
  assert.deepEqual(resultado, { novas: [removida], repetidas: 1 });
});

test("conflito de conteúdo ou estado da lixeira rejeita o arquivo sem alterar os atuais", () => {
  const dados = [antiga];
  assert.throws(() => prepararImportacao(JSON.stringify([{ ...antiga, titulo: "Outra entrega" }]), dados), /mesmo identificador/);
  assert.throws(() => prepararImportacao(JSON.stringify([{ ...antiga, excluidaEm: "2026-10-16T12:00:00Z" }]), dados), /mesmo identificador/);
  assert.deepEqual(dados, [antiga]);
});

test("importação rejeita JSON inválido, datas impossíveis e IDs repetidos no arquivo", () => {
  for (const texto of ["{", "{}", "null", JSON.stringify([antiga, antiga]), JSON.stringify([{ ...antiga, data: "2026-02-30" }])]) {
    assert.throws(() => prepararImportacao(texto, []));
  }
});

test("importação aceita cópias antigas sem projeto e conserva IDs numéricos", () => {
  const legado = { id: 1, titulo: "Entrega", data: "2026-10-08", descricao: "Resultado" };
  assert.equal(prepararImportacao(JSON.stringify([legado]), [{ ...legado, projeto: "" }]).repetidas, 1);
  assert.deepEqual(prepararImportacao(JSON.stringify([legado]), []).novas, [legado]);
});
