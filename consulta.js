export function filtrarAtividades(entradas, termo, inicio, fim) {
  // Ignora diferenças de maiúsculas e acentos nos campos pesquisados.
  const busca = normalizarTexto(termo.trim());
  const resultado = entradas.filter((entrada) => {
    if (entrada.excluidaEm) return false;
    const contexto = entrada.projeto || "Rotina de trabalho";
    // Procura o trecho digitado em qualquer um dos três campos da atividade.
    const noTitulo = normalizarTexto(entrada.titulo).includes(busca);
    const noProjeto = normalizarTexto(contexto).includes(busca);
    const naDescricao = normalizarTexto(entrada.descricao).includes(busca);
    if (!noTitulo && !noProjeto && !naDescricao) return false;
    // Datas no formato AAAA-MM-DD podem ser comparadas como texto, incluindo os limites.
    if (inicio && entrada.data < inicio) return false;
    if (fim && entrada.data > fim) return false;
    return true;
  });

  // Ordena a lista filtrada, sem mudar a ordem dos registros no armazenamento.
  return resultado.sort((primeira, segunda) => segunda.data.localeCompare(primeira.data));
}

function normalizarTexto(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
