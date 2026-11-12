import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const codigo = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

// Simulamos o navegador para provocar falhas sem alterar caches ou registros reais.
function ambiente(escopo = "https://exemplo.test/diario/", falharInstalacao = false) {
  const eventos = {};
  const cachesSalvos = new Map();
  let tomouControle = false;
  const caches = {
    keys: async () => [...cachesSalvos.keys()],
    delete: async (nome) => cachesSalvos.delete(nome),
    open: async (nome) => {
      if (!cachesSalvos.has(nome)) cachesSalvos.set(nome, new Map());
      const arquivos = cachesSalvos.get(nome);
      return {
        addAll: async (pedidos) => {
          if (falharInstalacao) throw new Error("Recurso indisponível");
          for (const pedido of pedidos) {
            assert.equal(pedido.cache, "reload");
            arquivos.set(pedido.url, new Response(pedido.url));
          }
        },
        match: async (pedido) => arquivos.get(typeof pedido === "string" ? pedido : pedido.url)?.clone()
      };
    }
  };
  vm.runInNewContext(codigo, {
    self: { registration: { scope: escopo },
      addEventListener: (tipo, acao) => { eventos[tipo] = acao; },
      clients: { claim: async () => { tomouControle = true; } },
      skipWaiting: () => { throw new Error("Não deve forçar atualização"); } },
    caches, URL, Request, Response
  });
  async function ciclo(tipo) {
    let espera;
    eventos[tipo]({ waitUntil: (promessa) => { espera = promessa; } });
    await espera;
  }
  async function pedir(url, mode = "cors", method = "GET") {
    let resposta;
    eventos.fetch({ request: { url, mode, method }, respondWith: (promessa) => { resposta = promessa; } });
    return resposta;
  }
  async function verificar() {
    let resposta;
    let espera;
    eventos.message({ data: { tipo: "VERIFICAR_OFFLINE" },
      ports: [{ postMessage: (valor) => { resposta = valor; } }],
      waitUntil: (valor) => { espera = valor; } });
    await espera;
    return resposta;
  }
  return { cachesSalvos, ciclo, pedir, verificar, tomouControle: () => tomouControle };
}

test("instala todos os arquivos sem forçar ativação e confirma preparo offline", async () => {
  const a = ambiente();
  await a.ciclo("install");
  assert.equal(a.tomouControle(), false);
  assert.equal((await a.verificar()).pronto, true);
  assert.match(await (await a.pedir("https://exemplo.test/diario/pwa.js")).text(), /pwa.js/);
});

test("falha no download rejeita instalação e não apaga cache anterior", async () => {
  const a = ambiente(undefined, true);
  a.cachesSalvos.set("versao-em-uso", new Map());
  await assert.rejects(a.ciclo("install"));
  assert.equal(a.cachesSalvos.has("versao-em-uso"), true);
  assert.equal((await a.verificar()).pronto, false);
});

test("ativação limpa apenas versões do próprio escopo", async () => {
  const a = ambiente();
  const prefixo = `diario-de-bordo:${encodeURIComponent("https://exemplo.test/diario/")}:`;
  a.cachesSalvos.set(`${prefixo}anterior`, new Map());
  a.cachesSalvos.set(`diario-de-bordo:${encodeURIComponent("https://exemplo.test/outro/")}:v1`, new Map());
  a.cachesSalvos.set("outro-aplicativo", new Map());
  a.cachesSalvos.set("diario-de-bordo-v3", new Map());
  await a.ciclo("install");
  await a.ciclo("activate");
  assert.equal(a.cachesSalvos.has(`${prefixo}anterior`), false);
  assert.equal(a.cachesSalvos.size, 4);
  assert.equal(a.tomouControle(), true);
});

test("página inicial com consulta usa a versão completa do cache", async () => {
  const a = ambiente();
  await a.ciclo("install");
  assert.equal(await (await a.pedir("https://exemplo.test/diario/?origem=atalho", "navigate")).text(), "https://exemplo.test/diario/index.html");
});

test("não intercepta terceiros, outros caminhos, POST ou arquivos desconhecidos", async () => {
  const a = ambiente();
  await a.ciclo("install");
  assert.equal(await a.pedir("https://outro.test/diario/script.js"), undefined);
  assert.equal(await a.pedir("https://exemplo.test/outro/index.html", "navigate"), undefined);
  assert.equal(await a.pedir("https://exemplo.test/diario/ausente.png"), undefined);
  assert.equal(await a.pedir("https://exemplo.test/diario/", "navigate", "POST"), undefined);
});

test("cache incompleto não recebe HTML no lugar de JavaScript nem informa offline pronto", async () => {
  const a = ambiente();
  await a.ciclo("install");
  const arquivos = [...a.cachesSalvos.values()][0];
  arquivos.delete("https://exemplo.test/diario/script.js");
  assert.equal((await a.verificar()).pronto, false);
  const resposta = await a.pedir("https://exemplo.test/diario/script.js");
  assert.equal(resposta.status, 503);
  assert.match(resposta.headers.get("Content-Type"), /text\/plain/);
});
