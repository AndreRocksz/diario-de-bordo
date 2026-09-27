const formulario = document.querySelector("#formulario-entrada");
const campoTitulo = document.querySelector("#titulo");
const campoData = document.querySelector("#data");
const campoDescricao = document.querySelector("#descricao");
const listaEntradas = document.querySelector("#lista-entradas");

const CHAVE_LOCAL_STORAGE = "diario-de-bordo-entradas";

let entradas = carregarEntradas();

function carregarEntradas() {
    const dadosSalvos = localStorage.getItem(CHAVE_LOCAL_STORAGE);

    if(!dadosSalvos) {
        return[];
    }

    try {
        return JSON.parse(dadosSalvos);
    } catch (erro) {
        console.error("Não foi possível carregar", erro);
        return[];
    }
}

function salvarEntradas() {
    localStorage.setItem(CHAVE_LOCAL_STORAGE, JSON.stringify(entradas));
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
}

function criarEntrada(titulo, data, descricao) {
    const novaEntrada = {
        id: Date.now(),
        titulo,
        data,
        descricao,
    };

    entradas.push(novaEntrada);
    salvarEntradas();
    renderizarEntradas();
}

function removerEntrada(id) {
    entradas = entradas.filter((entrada) => entrada.id !== id);

    salvarEntradas();
    renderizarEntradas();
}

function renderizarEntradas() {
    listaEntradas.innerHTML = "";

    if (entradas.lenght === 0) {
        const mensagem = document.createElement("p");

        mensagem.classList.add("mensagem-vazia");
        mensagem.textContent = "Nenhuma entrada registrada ainda.";

        listaEntradas.appendChild(mensagem);

        return;
    }

    entradas.forEach((entrada) => {
        const elementoEntrada = document.createElement("article"); 
        elementoEntrada.classList.add("entrada");

        const titulo = document.createElement("h3");
        titulo.textContent = entrada.titulo;

        const data = document.createElement("p");
        data.classList.add("entrada-data");
        data.textContent = formatarData(entrada.data);

        const descricao = document.createElement("p");
        descricao.classList.add("entrada-descricao");
        descricao.textContent = entrada.descricao;

        const botaoRemover = document.createElement("button");
        botaoRemover.classList.add("botao-remover");
        botaoRemover.type = "button";
        botaoRemover.textContent = "Remover";

        botaoRemover.addEventListener("click", () => {
            removerEntrada(entrada.id);
        });

        elementoEntrada.appendChild(titulo);
        elementoEntrada.appendChild(data);
        elementoEntrada.appendChild(descricao);
        elementoEntrada.appendChild(botaoRemover);

        listaEntradas.appendChild(elementoEntrada);
    });
}

formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const titulo = campoTitulo.value.trim();
    const data = campoData.value;
    const descricao = campoDescricao.value.trim();

    if (!titulo || !data || !descricao) {
        return;
    }

    criarEntrada(titulo, data, descricao);

    formulario.reset();
});

renderizarEntradas();

let eventoInstalacao;

const secaoInstalacao = document.querySelector("#secao-instalacao");
const botaoInstalar = document.querySelector("#botao-instalar");

window.addEventListener("beforeinstallprompt", (evento) => {
  console.log("beforeinstallprompt DISPAROU");

  evento.preventDefault();

  eventoInstalacao = evento;
  secaoInstalacao.hidden = false;
});

botaoInstalar.addEventListener("click", async () => {
    if (!eventoInstalacao) {
        return;
    }

    eventoInstalacao.prompt();

    const resultado = await eventoInstalacao.userChoice;

    if (resultado.outcome === "accepted") {
        secaoInstalacao.hidden = true;
    }

    eventoInstalacao = null;
});

window.addEventListener("appInstalled", () =>{
    secaoInstalacao.hidden = true;
    eventoInstalacao = null;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registro) => {
        console.log("Service Worker registrado com sucesso.", registro);
      })
      .catch((erro) => {
        console.error("Erro ao registrar o Service Worker:", erro);
      });
  });
}