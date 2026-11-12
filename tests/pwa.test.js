import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { setImmediate as aguardarEventos } from "node:timers/promises";

const codigo = readFileSync(new URL("../pwa.js", import.meta.url), "utf8");

function montar({ suporte = true, falhaRegistro = false, esperando = false, pronto = true, falhaAtualizacao = false } = {}) {
  const elementos = new Map();
  const eventos = {};
  const registro = {
    waiting: esperando ? {} : null,
    addEventListener() {},
    active: { state: "activated", postMessage(_, portas) { portas[0].outro.onmessage({ data: { pronto, versao: "teste" } }); } },
    update: async () => { if (falhaAtualizacao) throw new Error("Sem rede"); }
  };
  const buscar = (id) => {
    if (!elementos.has(id)) elementos.set(id, { textContent: "", hidden: false,
      addEventListener(tipo, acao) { this[tipo] = acao; }, focus() {} });
    return elementos.get(id);
  };
  const navigator = { onLine: true };
  if (suporte) navigator.serviceWorker = { controller: {}, addEventListener() {},
    register: async () => { if (falhaRegistro) throw new Error("Bloqueado"); return registro; } };
  vm.runInNewContext(codigo, {
    document: { querySelector: buscar }, navigator,
    window: { isSecureContext: true, matchMedia: () => ({ matches: false, addEventListener() {} }),
      addEventListener: (tipo, acao) => { eventos[tipo] = acao; } },
    setTimeout: () => 1, clearTimeout() {},
    MessageChannel: class { constructor() { this.port1 = { close() {} }; this.port2 = { outro: this.port1 }; } }
  });
  return { buscar, eventos, navigator };
}

test("atualização pronta orienta salvar e fechar todas as abas, sem recarregar", async () => {
  const a = montar({ esperando: true });
  await aguardarEventos();
  assert.match(a.buscar("#status-atualizacao").textContent, /Salve.*todas as abas/);
  assert.match(a.buscar("#status-offline").textContent, /Pronto para uso offline/);
});

test("sem suporte explica limitação e desabilita verificação", () => {
  const a = montar({ suporte: false });
  assert.equal(a.buscar("#verificar-atualizacao").disabled, true);
  assert.match(a.buscar("#status-offline").textContent, /não está disponível/);
});

test("falha no registro oferece nova tentativa", async () => {
  const a = montar({ falhaRegistro: true });
  await aguardarEventos();
  assert.equal(a.buscar("#verificar-atualizacao").disabled, false);
  assert.match(a.buscar("#status-offline").textContent, /Não foi possível preparar/);
});

test("cache incompleto nunca é anunciado como pronto", async () => {
  const a = montar({ pronto: false });
  await aguardarEventos();
  assert.match(a.buscar("#status-offline").textContent, /incompletos/);
});

test("falha na consulta não informa que a aplicação está atualizada", async () => {
  const a = montar({ falhaAtualizacao: true });
  await aguardarEventos();
  await a.buscar("#verificar-atualizacao").click();
  assert.match(a.buscar("#status-atualizacao").textContent, /Não foi possível consultar/);
  assert.equal(a.buscar("#verificar-atualizacao").disabled, false);
});

test("recusa consome convite, esconde botão e mantém instruções alternativas", async () => {
  const a = montar();
  a.eventos.beforeinstallprompt({ preventDefault() {}, prompt: async () => {}, userChoice: Promise.resolve({ outcome: "dismissed" }) });
  assert.equal(a.buscar("#botao-instalar").hidden, false);
  await a.buscar("#botao-instalar").click();
  assert.equal(a.buscar("#botao-instalar").hidden, true);
  assert.equal(a.buscar("#instrucoes-instalacao").hidden, false);
  assert.match(a.buscar("#status-instalacao").textContent, /adiada/);
});

test("aceitar convite não é anunciado como instalação concluída", async () => {
  const a = montar();
  a.eventos.beforeinstallprompt({ preventDefault() {}, prompt: async () => {}, userChoice: Promise.resolve({ outcome: "accepted" }) });
  await a.buscar("#botao-instalar").click();
  assert.match(a.buscar("#status-instalacao").textContent, /Aguarde/);
  a.eventos.appinstalled();
  assert.equal(a.buscar("#instrucoes-instalacao").hidden, true);
});

test("evento offline atualiza aviso sem mudar dados da aplicação", () => {
  const a = montar();
  a.navigator.onLine = false;
  a.eventos.offline();
  assert.match(a.buscar("#status-conexao").textContent, /Sem conexão detectada/);
});

