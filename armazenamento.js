export const CHAVE_ENTRADAS = "diario-de-bordo-entradas";

let ultimaLeitura;
let armazenamentoDisponivel = false;

export function dataValida(valor) {
  if (typeof valor !== "string") {
    return false;
  }

  // O campo de data usa o formato ano-mês-dia, como 2026-10-09.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const data = new Date(`${valor}T12:00:00Z`);
  if (Number(valor.slice(0, 4)) === 0 || Number.isNaN(data.getTime())) {
    return false;
  }

  // Impede datas inexistentes, como 30 de fevereiro, que o JavaScript ajustaria sozinho.
  return data.toISOString().slice(0, 10) === valor;
}

export function validarEntradas(entradasSalvas) {
  if (!Array.isArray(entradasSalvas)) {
    throw new Error("O histórico deve ser uma lista.");
  }

  const idsEncontrados = [];

  for (const entrada of entradasSalvas) {
    if (!entrada || typeof entrada !== "object") {
      throw new Error("Há uma atividade inválida no histórico.");
    }

    // IDs numéricos dos registros antigos continuam aceitos.
    let idValido = false;
    if (typeof entrada.id === "number") {
      idValido = Number.isSafeInteger(entrada.id);
    } else if (typeof entrada.id === "string") {
      idValido = entrada.id.trim() !== "";
    }

    if (!idValido || idsEncontrados.includes(entrada.id)) {
      throw new Error("Há identificadores inválidos ou repetidos no histórico.");
    }
    idsEncontrados.push(entrada.id);

    if (typeof entrada.titulo !== "string" || entrada.titulo.trim() === "") {
      throw new Error("Há uma atividade sem título válido.");
    }
    if (typeof entrada.descricao !== "string" || entrada.descricao.trim() === "") {
      throw new Error("Há uma atividade sem descrição válida.");
    }
    if (!dataValida(entrada.data)) {
      throw new Error("Há uma atividade com data inválida.");
    }
    if (entrada.projeto !== undefined && typeof entrada.projeto !== "string") {
      throw new Error("Há uma atividade com projeto inválido.");
    }
    if (entrada.excluidaEm !== undefined) {
      if (typeof entrada.excluidaEm !== "string" || !Number.isFinite(Date.parse(entrada.excluidaEm))) {
        throw new Error("Há uma atividade com data de remoção inválida.");
      }
    }
  }

  return entradasSalvas;
}

export function carregarEntradas() {
  armazenamentoDisponivel = false;

  try {
    const dadosSalvos = window.localStorage.getItem(CHAVE_ENTRADAS);
    let entradasSalvas = [];

    if (dadosSalvos !== null) {
      entradasSalvas = JSON.parse(dadosSalvos);
    }

    validarEntradas(entradasSalvas);
    ultimaLeitura = dadosSalvos;
    armazenamentoDisponivel = true;
    return { ok: true, entradas: entradasSalvas };
  } catch {
    // Um histórico ilegível fica intacto; não salvamos uma lista vazia por cima dele.
    return { ok: false, mensagem: "Não foi possível ler seu histórico. Os dados salvos não foram alterados. Exporte uma cópia para recuperação ou tente carregar novamente." };
  }
}

export function salvarEntradas(proximasEntradas) {
  if (!armazenamentoDisponivel) {
    return { ok: false, mensagem: "Carregue o histórico com sucesso antes de salvar alterações." };
  }

  try {
    validarEntradas(proximasEntradas);
    const dadosAtuais = window.localStorage.getItem(CHAVE_ENTRADAS);

    // Não sobrescreve uma mudança de outra aba detectada desde a última leitura.
    // Duas gravações exatamente simultâneas ainda são uma limitação do localStorage.
    if (dadosAtuais !== ultimaLeitura) {
      armazenamentoDisponivel = false;
      return { ok: false, mensagem: "O histórico mudou em outra aba. Seu formulário foi mantido. Clique em Recarregar histórico antes de tentar novamente." };
    }

    const dadosParaSalvar = JSON.stringify(proximasEntradas);
    window.localStorage.setItem(CHAVE_ENTRADAS, dadosParaSalvar);
    ultimaLeitura = dadosParaSalvar;
    return { ok: true };
  } catch {
    return { ok: false, mensagem: "Não foi possível salvar. O armazenamento pode estar cheio ou bloqueado. Sua alteração não foi concluída; mantenha esta página aberta e tente novamente." };
  }
}

export function exportarEntradas() {
  // Exporta também o texto original de um histórico inválido, para permitir recuperação.
  const dadosSalvos = window.localStorage.getItem(CHAVE_ENTRADAS);
  if (dadosSalvos === null) {
    return "[]";
  }
  return dadosSalvos;
}

export function prepararImportacao(texto, atuais) {
  const recebidas = validarEntradas(JSON.parse(texto));
  const novas = [];
  let repetidas = 0;

  for (const entrada of recebidas) {
    const existente = atuais.find((atual) => atual.id === entrada.id);
    if (!existente) {
      novas.push(entrada);
      continue;
    }

    // Mesmo ID com conteúdo diferente é conflito, não autorização para substituir.
    const campos = ["titulo", "data", "descricao", "projeto", "excluidaEm"];
    const igual = campos.every((campo) => (existente[campo] ?? "") === (entrada[campo] ?? ""));
    if (!igual) {
      throw new Error(`A atividade “${entrada.titulo}” tem o mesmo identificador de uma atividade local, mas conteúdo diferente. Nenhum registro foi importado.`);
    }
    repetidas += 1;
  }

  return { novas, repetidas };
}
