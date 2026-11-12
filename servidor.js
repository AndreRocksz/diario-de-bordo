import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = fileURLToPath(new URL(".", import.meta.url));
const permitidos = new Set(["index.html", "style.css", "script.js", "armazenamento.js", "pwa.js", "consulta.js", "manifest.json", "service-worker.js", "icons/icon-192.png", "icons/icon-512.png"]);
const tipos = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const porta = Number(process.env.PORT || 4174);

createServer(async (req, res) => {
  try {
    const nome = decodeURIComponent(new URL(req.url, "http://localhost").pathname).slice(1) || "index.html";
    // A lista explícita impede que o servidor exponha arquivos internos do projeto.
    if (!permitidos.has(nome) || !["GET", "HEAD"].includes(req.method)) {
      res.writeHead(404).end();
      return;
    }
    const conteudo = await readFile(path.join(raiz, nome));
    res.writeHead(200, { "Content-Type": tipos[path.extname(nome)], "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : conteudo);
  } catch {
    res.writeHead(404).end();
  }
}).listen(porta, "127.0.0.1", () => console.log(`Diário de Bordo: http://127.0.0.1:${porta}`));
