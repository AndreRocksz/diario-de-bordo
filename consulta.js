export function filtrarAtividades(entradas, projeto, inicio, fim) {
  // Ignora diferenças de maiúsculas e acentos na busca pelo projeto.
  const busca = normalizarTexto(projeto.trim());
  const resultado = entradas.filter((entrada) => {
    if (entrada.excluidaEm) return false;
    const contexto = entrada.projeto || "Rotina de trabalho";
    if (!normalizarTexto(contexto).includes(busca)) return false;
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
