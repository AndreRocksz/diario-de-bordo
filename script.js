import { carregarEntradas, salvarEntradas, exportarEntradas, prepararImportacao, dataValida, CHAVE_ENTRADAS } from "./armazenamento.js";
import { filtrarAtividades } from "./consulta.js";

const formulario = document.querySelector("#formulario-entrada");
const campoTitulo = document.querySelector("#titulo");
const campoData = document.querySelector("#data");
const campoDescricao = document.querySelector("#descricao");
const campoProjeto = document.querySelector("#projeto");
const listaEntradas = document.querySelector("#lista-entradas");
const listaLixeira = document.querySelector("#lista-lixeira");
const status = document.querySelector("#status");
const alerta = document.querySelector("#alerta");
const filtroProjeto = document.querySelector("#filtro-projeto");
const filtroInicio = document.querySelector("#filtro-inicio");
const filtroFim = document.querySelector("#filtro-fim");
const erroFiltros = document.querySelector("#erro-filtros");
const resumoConsulta = document.querySelector("#resumo-consulta");
const arquivoImportacao = document.querySelector("#arquivo-importacao");
const previaImportacao = document.querySelector("#previa-importacao");
const mensagemImportacao = document.querySelector("#mensagem-importacao");
let importacaoPendente = null;
let entradas = [];
let carregado = false;

function avisar(mensagem, erro = false) {
  if (erro) {
    status.textContent = "";
    alerta.textContent = mensagem;
  } else {
    status.textContent = mensagem;
    alerta.textContent = "";
  }
}

function carregarHistorico(inicial = false) {
  const resultado = carregarEntradas();
  carregado = resultado.ok;
  document.querySelector("#salvar").disabled = !carregado;
  if (carregado) {
    entradas = resultado.entradas;
    if (inicial) {
      avisar("");
    } else {
      avisar("Histórico recarregado. O conteúdo do formulário foi mantido.");
    }
  } else {
    avisar(resultado.mensagem, true);
  }
  if (importacaoPendente) {
    mensagemImportacao.textContent = "Histórico recarregado. Selecione a cópia novamente para conferir uma nova prévia.";
    arquivoImportacao.value = "";
  }
  cancelarImportacao();
  renderizarEntradas();
}

function salvarAlteracoes(proximasEntradas, mensagem) {
  const resultado = salvarEntradas(proximasEntradas);
  if (!resultado.ok) {
    avisar(resultado.mensagem, true);
    return false;
  }
  // Só atualizamos a tela e a memória depois de confirmar a gravação.
  entradas = proximasEntradas;
  renderizarEntradas();
  avisar(mensagem);
  return true;
}

function formatarData(data) {
  return data.split("-").reverse().join("/");
}

function hoje() {
  // Usa a data local: converter para UTC pode trocar o dia perto da meia-noite.
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function moverParaLixeira(id) {
  const proximasEntradas = entradas.map((entrada) => {
    if (entrada.id !== id) {
      return entrada;
    }

    // Copiamos a atividade para não mudar o histórico antes de confirmar a gravação.
    const atividadeRemovida = { ...entrada };
    atividadeRemovida.excluidaEm = new Date().toISOString();
    return atividadeRemovida;
  });

  const salvou = salvarAlteracoes(proximasEntradas, "Atividade movida para a lixeira. Você pode restaurá-la abaixo.");
  if (salvou) {
    // O botão sai da tela; o foco vai para a região onde a atividade pode ser recuperada.
    document.querySelector("#painel-lixeira").open = true;
    document.querySelector("#titulo-lixeira").focus();
  }
}

function restaurarEntrada(id) {
  const proximasEntradas = entradas.map((entrada) => {
    if (entrada.id !== id) {
      return entrada;
    }

    const atividadeRestaurada = { ...entrada };
    // delete retira somente a marca de remoção, não a atividade.
    delete atividadeRestaurada.excluidaEm;
    return atividadeRestaurada;
  });

  const salvou = salvarAlteracoes(proximasEntradas, "Atividade restaurada.");
  if (salvou) {
    limparFiltros();
    document.querySelector("#titulo-entradas").focus();
  }
}

function criarCartao(entrada) {
  const artigo = document.createElement("article");
  artigo.className = "entrada";
  const titulo = document.createElement("h3");
  titulo.textContent = entrada.titulo;
  const data = document.createElement("time");
  data.className = "entrada-data";
  data.dateTime = entrada.data;
  data.textContent = formatarData(entrada.data);
  const projeto = document.createElement("p");
  projeto.className = "entrada-projeto";
  projeto.textContent = entrada.projeto ? `Projeto: ${entrada.projeto}` : "Rotina de trabalho";
  const descricao = document.createElement("p");
  descricao.className = "entrada-descricao";
  // Texto escrito pelo usuário nunca é interpretado como HTML.
  descricao.textContent = entrada.descricao;
  const botao = document.createElement("button");
  const removida = Boolean(entrada.excluidaEm);
  botao.type = "button";
  botao.className = removida ? "" : "botao-remover";
  botao.textContent = removida ? "Restaurar" : "Mover para lixeira";
  botao.setAttribute("aria-label", `${botao.textContent}: ${entrada.titulo}`);
  botao.disabled = !carregado;
  botao.addEventListener("click", () => {
    if (removida) {
      restaurarEntrada(entrada.id);
    } else {
      moverParaLixeira(entrada.id);
    }
  });
  artigo.append(titulo, data, projeto, descricao, botao);
  return artigo;
}

function preencherLista(lista, itens, mensagem) {
  lista.replaceChildren();
  if (itens.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "mensagem-vazia";
    vazio.textContent = mensagem;
    lista.append(vazio);
  } else {
    itens.forEach((entrada) => lista.append(criarCartao(entrada)));
  }
}

function renderizarEntradas() {
  const atividadesAtivas = entradas.filter((entrada) => !entrada.excluidaEm);
  const atividadesNaLixeira = entradas.filter((entrada) => entrada.excluidaEm);
  let visiveis = filtrarAtividades(entradas, filtroProjeto.value, filtroInicio.value, filtroFim.value);
  erroFiltros.textContent = "";
  filtroInicio.setAttribute("aria-invalid", "false");
  filtroFim.setAttribute("aria-invalid", "false");

  const inicioInvalido = Boolean(filtroInicio.value && !dataValida(filtroInicio.value));
  const fimInvalido = Boolean(filtroFim.value && !dataValida(filtroFim.value));
  const periodoInvertido = Boolean(filtroInicio.value && filtroFim.value && filtroInicio.value > filtroFim.value);
  if (inicioInvalido || fimInvalido || periodoInvertido) {
    erroFiltros.textContent = "Informe datas válidas. A data final deve ser igual ou posterior à inicial.";
    // Identifica o campo com erro também para tecnologias assistivas.
    filtroInicio.setAttribute("aria-invalid", String(inicioInvalido));
    filtroFim.setAttribute("aria-invalid", String(fimInvalido || periodoInvertido));
    visiveis = [];
  }

  let mensagemVazia = "Nenhuma atividade registrada. Comece por uma entrega ou aprendizado de hoje.";
  if (!carregado) {
    mensagemVazia = "Histórico indisponível. Tente recarregar antes de fazer alterações.";
  } else if (erroFiltros.textContent) {
    mensagemVazia = "Corrija o período para consultar as atividades.";
  } else if (atividadesAtivas.length > 0) {
    mensagemVazia = "Nenhuma atividade corresponde aos filtros. Tente outro projeto ou limpe o período.";
  }

  resumoConsulta.textContent = carregado ? `${visiveis.length} de ${atividadesAtivas.length} atividades · mais recentes primeiro` : "Histórico indisponível";
  document.querySelector("#total-lixeira").textContent = String(atividadesNaLixeira.length);
  preencherLista(listaEntradas, visiveis, mensagemVazia);
  preencherLista(listaLixeira, atividadesNaLixeira, "A lixeira está vazia.");
}

function criarEntrada(titulo, data, descricao, projeto) {
  const novaEntrada = {
    id: crypto.randomUUID(),
    titulo: titulo,
    data: data,
    descricao: descricao,
    projeto: projeto,
  };

  // Prepara uma lista separada para não alterar o histórico antes de conseguir salvar.
  const proximasEntradas = entradas.slice();
  proximasEntradas.push(novaEntrada);

  return salvarAlteracoes(proximasEntradas, "Atividade salva neste navegador.");
}

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const titulo = campoTitulo.value.trim();
  const descricao = campoDescricao.value.trim();
  const data = campoData.value;
  const projeto = campoProjeto.value.trim();

  if (!titulo) {
    avisar("Preencha o título da atividade. Apenas espaços não são aceitos.", true);
    campoTitulo.focus();
    return;
  }

  if (!dataValida(data)) {
    avisar("Preencha uma data válida para a atividade.", true);
    campoData.focus();
    return;
  }

  if (!descricao) {
    avisar("Preencha a descrição da atividade. Apenas espaços não são aceitos.", true);
    campoDescricao.focus();
    return;
  }

  const salvou = criarEntrada(titulo, data, descricao, projeto);
  if (!salvou) {
    return;
  }

  // Em caso de erro, o retorno acima mantém o preenchimento para uma nova tentativa.
  formulario.reset();
  campoData.value = hoje();
  limparFiltros();
  campoTitulo.focus();
});

function limparFiltros() {
  filtroProjeto.value = "";
  filtroInicio.value = "";
  filtroFim.value = "";
  renderizarEntradas();
}

document.querySelector("#formulario-filtros").addEventListener("submit", (evento) => evento.preventDefault());
for (const campo of [filtroProjeto, filtroInicio, filtroFim]) {
  campo.addEventListener("input", renderizarEntradas);
}
document.querySelector("#limpar-filtros").addEventListener("click", () => {
  limparFiltros();
  filtroProjeto.focus();
});

function cancelarImportacao() {
  importacaoPendente = null;
  previaImportacao.hidden = true;
}

arquivoImportacao.addEventListener("change", async () => {
  cancelarImportacao();
  mensagemImportacao.textContent = "";
  const arquivo = arquivoImportacao.files[0];
  if (!arquivo) return;
  if (!carregado) {
    mensagemImportacao.textContent = "Carregue o histórico antes de importar. Um histórico ilegível não será sobrescrito.";
    return;
  }
  if (arquivo.size > 2 * 1024 * 1024) {
    mensagemImportacao.textContent = "Escolha um arquivo JSON de até 2 MB.";
    return;
  }

  arquivoImportacao.disabled = true;
  try {
    const texto = await arquivo.text();
    const resumo = prepararImportacao(texto, entradas);
    if (!resumo.novas.length) {
      mensagemImportacao.textContent = `Nenhuma atividade nova. ${resumo.repetidas} já presentes neste navegador.`;
      return;
    }
    // A prévia não grava nada. Guardamos o histórico de referência para detectar mudanças.
    importacaoPendente = { novas: resumo.novas, historico: JSON.stringify(entradas) };
    document.querySelector("#resumo-importacao").textContent = `${resumo.novas.length} atividades serão adicionadas (incluindo itens da lixeira, se houver). ${resumo.repetidas} repetidas serão ignoradas. Nenhuma atividade existente será substituída.`;
    previaImportacao.hidden = false;
    document.querySelector("#confirmar-importacao").focus();
  } catch (erro) {
    mensagemImportacao.textContent = `Não foi possível importar esta cópia. ${erro.message}`;
  } finally {
    arquivoImportacao.disabled = false;
  }
});

document.querySelector("#confirmar-importacao").addEventListener("click", () => {
  if (!importacaoPendente) return;
  if (JSON.stringify(entradas) !== importacaoPendente.historico) {
    cancelarImportacao();
    mensagemImportacao.textContent = "O histórico mudou depois da prévia. Selecione o arquivo novamente para conferir a importação.";
    arquivoImportacao.value = "";
    // O botão de confirmação foi ocultado; devolvemos o foco a um controle visível.
    arquivoImportacao.focus();
    return;
  }
  const proximas = entradas.concat(importacaoPendente.novas);
  if (salvarAlteracoes(proximas, "Cópia importada. As atividades existentes foram preservadas.")) {
    cancelarImportacao();
    arquivoImportacao.value = "";
    mensagemImportacao.textContent = "Importação concluída. Confira o histórico e, se necessário, a lixeira.";
    limparFiltros();
    document.querySelector("#titulo-entradas").focus();
  }
});
document.querySelector("#cancelar-importacao").addEventListener("click", () => {
  cancelarImportacao();
  arquivoImportacao.value = "";
  mensagemImportacao.textContent = "Importação cancelada. Nenhum registro foi alterado.";
  arquivoImportacao.focus();
});

document.querySelector("#recarregar").addEventListener("click", () => carregarHistorico());
document.querySelector("#exportar").addEventListener("click", () => {
  try {
    const copia = new Blob([exportarEntradas()], { type: "application/json" });
    const url = URL.createObjectURL(copia);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diario-de-bordo-${hoje()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    avisar("Download da cópia solicitado. Confira o arquivo na pasta de downloads.");
  } catch {
    avisar("Não foi possível exportar. O acesso aos dados pode estar bloqueado pelo navegador.", true);
  }
});

window.addEventListener("storage", (evento) => {
  if (evento.key === CHAVE_ENTRADAS || evento.key === null) carregarHistorico();
});

campoData.value = hoje();
carregarHistorico(true);
