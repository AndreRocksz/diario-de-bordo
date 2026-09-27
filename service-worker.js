const CACHE_NAME = "diario-de-bordo-v2";

const ARQUIVOS_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARQUIVOS_CACHE);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomesDosCaches) => {
        return Promise.all(
          nomesDosCaches
            .filter((nomeDoCache) => nomeDoCache !== CACHE_NAME)
            .map((nomeDoCache) => caches.delete(nomeDoCache))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") {
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then((respostaDoCache) => {
      if (respostaDoCache) {
        return respostaDoCache;
      }

      return fetch(evento.request)
        .then((respostaDaRede) => {
          if (
            !respostaDaRede ||
            respostaDaRede.status !== 200 ||
            respostaDaRede.type === "opaque"
          ) {
            return respostaDaRede;
          }

          const respostaParaCache = respostaDaRede.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(evento.request, respostaParaCache);
          });

          return respostaDaRede;
        })
        .catch(() => {
          return caches.match("./index.html");
        });
    })
  );
});