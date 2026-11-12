import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const codigoArmazenamento = readFileSync(new URL("../armazenamento.js", import.meta.url), "utf8").replace(/^export /gm, "");
// O teste executa os dois arquivos com uma tela e um armazenamento simulados.
// Nenhum dado do navegador real é acessado.
const codigoConsulta = readFileSync(new URL("../consulta.js", import.meta.url), "utf8").replace(/^export /gm, "");
const codigo = readFileSync(new URL("../script.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");

function montar(bruto = null) {
  let falha = false;
  const elementos = new Map();
  const criarElemento = () => ({
    value: "", textContent: "", children: [], eventos: {},
    addEventListener(tipo, funcao) { this.eventos[tipo] = funcao; },
    append(...filhos) { this.children.push(...filhos); },
    replaceChildren() { this.children = []; },
    atributos: {},
    setAttribute(nome, valor) { this.atributos[nome] = valor; }, focus() { this.focado = true; }
  });
  const buscar = (id) => {
    if (!elementos.has(id)) elementos.set(id, criarElemento());
    return elementos.get(id);
  };
  const storage = { getItem: () => bruto, setItem(_, valor) { if (falha) throw new Error("QuotaExceededError"); bruto = valor; } };
  const contexto = {
    document: { querySelector: buscar, createElement: criarElemento },
    window: { localStorage: storage, addEventListener() {} }, navigator: {}, crypto: { randomUUID: () => "id-teste" },
  };
  buscar("#formulario-entrada").reset = () => {
    for (const id of ["#titulo", "#projeto", "#descricao", "#data"]) buscar(id).value = "";
  };
  vm.runInNewContext(codigoArmazenamento + "\n" + codigoConsulta + "\n" + codigo, contexto);
  return { buscar, valor: () => bruto, falhar() { falha = true; },
    enviar() { buscar("#formulario-entrada").eventos.submit({ preventDefault() {} }); } };
}

function preencher(a) {
  a.buscar("#titulo").value = "Entrega";
  a.buscar("#descricao").value = "Resultado";
  a.buscar("#data").value = "2026-10-08";
}

test("título apenas com espaços não é salvo e recebe o foco", () => {
  const a = montar();
  preencher(a);
  a.buscar("#titulo").value = "   ";
  a.enviar();
  assert.equal(a.valor(), null);
  assert.equal(a.buscar("#titulo").focado, true);
  assert.match(a.buscar("#alerta").textContent, /título/);
});

test("data inexistente não é salva e recebe o foco", () => {
  const a = montar();
  preencher(a);
  a.buscar("#data").value = "2026-02-30";
  a.enviar();
  assert.equal(a.valor(), null);
  assert.equal(a.buscar("#data").focado, true);
  assert.match(a.buscar("#alerta").textContent, /data válida/);
});

test("descrição apenas com espaços mantém o preenchimento para correção", () => {
  const a = montar();
  preencher(a);
  a.buscar("#descricao").value = "   ";
  a.enviar();
  assert.equal(a.valor(), null);
  assert.equal(a.buscar("#titulo").value, "Entrega");
  assert.equal(a.buscar("#descricao").focado, true);
});

test("falha ao salvar mantém formulário, histórico e mensagem de erro", () => {
  const a = montar();
  preencher(a);
  a.falhar();
  a.enviar();
  assert.equal(a.buscar("#titulo").value, "Entrega");
  assert.equal(a.valor(), null);
  assert.match(a.buscar("#lista-entradas").children[0].textContent, /Nenhuma atividade/);
  assert.match(a.buscar("#alerta").textContent, /Não foi possível salvar/);
});

test("sucesso salva antes de limpar o formulário e mostra a atividade", () => {
  const a = montar();
  preencher(a);
  a.enviar();
  assert.equal(JSON.parse(a.valor())[0].titulo, "Entrega");
  assert.equal(a.buscar("#titulo").value, "");
  assert.equal(a.buscar("#lista-entradas").children[0].children[0].textContent, "Entrega");
  assert.match(a.buscar("#status").textContent, /salva/);
});

test("histórico corrompido não é apresentado como vazio e bloqueia salvar", () => {
  const a = montar("{");
  assert.equal(a.buscar("#salvar").disabled, true);
  assert.match(a.buscar("#lista-entradas").children[0].textContent, /indisponível/);
  assert.equal(a.valor(), "{");
});

test("falha ao mover para lixeira mantém a atividade na lista", () => {
  const registro = { id: 1, titulo: "Entrega", descricao: "Resultado", data: "2026-10-08" };
  const a = montar(JSON.stringify([registro]));
  a.falhar();
  a.buscar("#lista-entradas").children[0].children[4].eventos.click();
  assert.deepEqual(JSON.parse(a.valor()), [registro]);
  assert.equal(a.buscar("#lista-entradas").children[0].children[0].textContent, "Entrega");
  assert.match(a.buscar("#alerta").textContent, /Não foi possível salvar/);
});

test("mover e restaurar pelos botões preserva a atividade e direciona o foco", () => {
  const registro = { id: 1, titulo: "Entrega", descricao: "Resultado", data: "2026-10-08" };
  const a = montar(JSON.stringify([registro]));

  a.buscar("#lista-entradas").children[0].children[4].eventos.click();
  assert.ok(JSON.parse(a.valor())[0].excluidaEm);
  assert.equal(a.buscar("#titulo-lixeira").focado, true);
  assert.match(a.buscar("#lista-entradas").children[0].textContent, /Nenhuma atividade/);

  a.buscar("#lista-lixeira").children[0].children[4].eventos.click();
  assert.deepEqual(JSON.parse(a.valor()), [registro]);
  assert.equal(a.buscar("#titulo-entradas").focado, true);
  assert.equal(a.buscar("#lista-lixeira").children[0].textContent, "A lixeira está vazia.");
});

test("falha ao restaurar mantém a atividade na lixeira", () => {
  const registro = { id: 1, titulo: "Entrega", descricao: "Resultado", data: "2026-10-08", excluidaEm: "2026-10-09T12:00:00Z" };
  const a = montar(JSON.stringify([registro]));
  a.falhar();
  a.buscar("#lista-lixeira").children[0].children[4].eventos.click();
  assert.deepEqual(JSON.parse(a.valor()), [registro]);
  assert.equal(a.buscar("#lista-lixeira").children[0].children[0].textContent, "Entrega");
  assert.match(a.buscar("#alerta").textContent, /Não foi possível salvar/);
});

test("período invertido informa erro e limpar filtros recupera o histórico", () => {
  const registro = { id: 1, titulo: "Entrega", descricao: "Resultado", data: "2026-10-08" };
  const a = montar(JSON.stringify([registro]));
  a.buscar("#filtro-inicio").value = "2026-10-16";
  a.buscar("#filtro-fim").value = "2026-10-08";
  a.buscar("#filtro-fim").eventos.input();
  assert.match(a.buscar("#erro-filtros").textContent, /posterior/);
  assert.match(a.buscar("#lista-entradas").children[0].textContent, /Corrija/);
  a.buscar("#limpar-filtros").eventos.click();
  assert.equal(a.buscar("#erro-filtros").textContent, "");
  assert.equal(a.buscar("#lista-entradas").children[0].children[0].textContent, "Entrega");
});

test("importação só grava após confirmar a prévia", async () => {
  const a = montar();
  const registro = { id: 5, titulo: "Cópia", descricao: "Resultado", data: "2026-10-08" };
  a.buscar("#arquivo-importacao").files = [{ size: 200, text: async () => JSON.stringify([registro]) }];
  await a.buscar("#arquivo-importacao").eventos.change();
  assert.equal(a.valor(), null);
  assert.equal(a.buscar("#previa-importacao").hidden, false);
  a.buscar("#confirmar-importacao").eventos.click();
  assert.deepEqual(JSON.parse(a.valor()), [registro]);
  assert.equal(a.buscar("#previa-importacao").hidden, true);
});

test("cancelar importação não grava e falha na gravação mantém a prévia", async () => {
  const a = montar();
  const registro = { id: 5, titulo: "Cópia", descricao: "Resultado", data: "2026-10-08" };
  a.buscar("#arquivo-importacao").files = [{ size: 200, text: async () => JSON.stringify([registro]) }];
  await a.buscar("#arquivo-importacao").eventos.change();
  a.buscar("#cancelar-importacao").eventos.click();
  assert.equal(a.valor(), null);
  await a.buscar("#arquivo-importacao").eventos.change();
  a.falhar();
  a.buscar("#confirmar-importacao").eventos.click();
  assert.equal(a.valor(), null);
  assert.equal(a.buscar("#previa-importacao").hidden, false);
});

test("alterar histórico depois da prévia exige nova conferência", async () => {
  const a = montar();
  a.buscar("#arquivo-importacao").files = [{ size: 200, text: async () => JSON.stringify([{ id: 5, titulo: "Cópia", descricao: "Resultado", data: "2026-10-08" }]) }];
  await a.buscar("#arquivo-importacao").eventos.change();
  preencher(a);
  a.enviar();
  a.buscar("#confirmar-importacao").eventos.click();
  assert.equal(JSON.parse(a.valor()).length, 1);
  assert.match(a.buscar("#mensagem-importacao").textContent, /mudou/);
  assert.equal(a.buscar("#arquivo-importacao").focado, true);
});

test("data inicial inválida identifica o campo correto e limpa a indicação após correção", () => {
  const a = montar();
  a.buscar("#filtro-inicio").value = "2026-02-30";
  a.buscar("#filtro-inicio").eventos.input();
  assert.equal(a.buscar("#filtro-inicio").atributos["aria-invalid"], "true");
  assert.equal(a.buscar("#filtro-fim").atributos["aria-invalid"], "false");
  a.buscar("#filtro-inicio").value = "2026-02-28";
  a.buscar("#filtro-inicio").eventos.input();
  assert.equal(a.buscar("#filtro-inicio").atributos["aria-invalid"], "false");
  assert.equal(a.buscar("#erro-filtros").textContent, "");
});

