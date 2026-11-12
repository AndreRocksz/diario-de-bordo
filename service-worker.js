// Ao publicar arquivos alterados, aumente esta versão junto com a aplicação inteira.
const VERSAO = "v12";
const ESCOPO = self.registration.scope;
const PREFIXO_CACHE = `diario-de-bordo:${encodeURIComponent(ESCOPO)}:`;
const NOME_CACHE = `${PREFIXO_CACHE}${VERSAO}`;
const ARQUIVOS = [
  "./", "./index.html", "./style.css", "./script.js", "./armazenamento.js",
  "./pwa.js", "./consulta.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"
].map((arquivo) => new URL(arquivo, ESCOPO).href);

self.addEventListener("install", (evento) => {
  // addAll só termina com sucesso quando todos os arquivos foram obtidos.
  // A opção reload evita reutilizar uma cópia antiga do cache HTTP do navegador.
  evento.waitUntil(caches.open(NOME_CACHE).then((cache) => {
    return cache.addAll(ARQUIVOS.map((url) => new Request(url, { cache: "reload" })));
  }));
  // Não usamos skipWaiting: a versão anterior continua atendendo as abas abertas.
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    // Cada pasta publicada tem seu prefixo. Caches de outros aplicativos ficam intactos.
    for (const nome of nomes) {
      if (nome.startsWith(PREFIXO_CACHE) && nome !== NOME_CACHE) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", (evento) => {
  if (evento.data?.tipo !== "VERIFICAR_OFFLINE" || !evento.ports[0]) return;
  evento.waitUntil((async () => {
    let pronto = false;
    try {
      const cache = await caches.open(NOME_CACHE);
      const respostas = await Promise.all(ARQUIVOS.map((url) => cache.match(url)));
      pronto = respostas.every((resposta) => Boolean(resposta));
    } catch {
      pronto = false;
    }
    // A página só anuncia preparo offline depois desta conferência dos arquivos.
    evento.ports[0].postMessage({ pronto, versao: VERSAO });
  })());
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== "GET" || !url.href.startsWith(ESCOPO)) return;
  const paginaInicial = new URL("./index.html", ESCOPO).href;
  const semConsulta = `${url.origin}${url.pathname}`;
  const navegacaoInicial = pedido.mode === "navigate" &&
    (semConsulta === ESCOPO || semConsulta === paginaInicial);
  const arquivoConhecido = ARQUIVOS.includes(url.href);
  if (!navegacaoInicial && !arquivoConhecido) return;

  evento.respondWith((async () => {
    const cache = await caches.open(NOME_CACHE);
    const resposta = await cache.match(navegacaoInicial ? paginaInicial : pedido);
    if (resposta) return resposta;
    // Um recurso ausente não é substituído por HTML nem por outra versão do arquivo.
    // Instalações completas sempre têm estes recursos; remoção externa do cache é uma falha.
    return new Response("Os arquivos desta versão não estão disponíveis no cache.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  })());
});
