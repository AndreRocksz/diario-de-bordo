const mensagemConexao = document.querySelector("#status-conexao");
const mensagemOffline = document.querySelector("#status-offline");
const mensagemAtualizacao = document.querySelector("#status-atualizacao");
const mensagemInstalacao = document.querySelector("#status-instalacao");
const botaoVerificar = document.querySelector("#verificar-atualizacao");
const botaoInstalar = document.querySelector("#botao-instalar");
const instrucoes = document.querySelector("#instrucoes-instalacao");
let registro;
let eventoInstalacao;
let instalacaoConfirmada = false;

function atualizarConexao() {
  // onLine informa a conexão do dispositivo; não garante que o servidor esteja acessível.
  mensagemConexao.textContent = navigator.onLine
    ? "O navegador detecta uma conexão. Seus registros continuam salvos apenas neste dispositivo."
    : "Sem conexão detectada. Você pode registrar atividades se a aplicação já estiver preparada para uso offline.";
}

const modoAplicativo = window.matchMedia("(display-mode: standalone)");
function atualizarInstalacao() {
  const instalado = instalacaoConfirmada || modoAplicativo.matches || navigator.standalone === true;
  instrucoes.hidden = instalado;
  botaoInstalar.hidden = instalado || !eventoInstalacao;
  if (instalado) mensagemInstalacao.textContent = "Aplicativo instalado ou aberto em modo aplicativo.";
}

window.addEventListener("beforeinstallprompt", (evento) => {
  evento.preventDefault();
  eventoInstalacao = evento;
  atualizarInstalacao();
});

botaoInstalar.addEventListener("click", async () => {
  if (!eventoInstalacao) return;
  // O convite só pode ser usado uma vez. Um novo convite depende do navegador.
  const convite = eventoInstalacao;
  eventoInstalacao = null;
  botaoInstalar.hidden = true;
  mensagemInstalacao.focus();
  try {
    await convite.prompt();
    const escolha = await convite.userChoice;
    if (!instalacaoConfirmada) {
      mensagemInstalacao.textContent = escolha.outcome === "accepted"
        ? "Pedido de instalação aceito. Aguarde a confirmação do navegador."
        : "Instalação adiada. Você pode continuar usando o Diário aqui ou instalar pelo menu do navegador.";
    }
  } catch {
    mensagemInstalacao.textContent = "Não foi possível abrir a instalação. Consulte as orientações abaixo para usar o menu do navegador.";
  }
});

window.addEventListener("appinstalled", () => {
  instalacaoConfirmada = true;
  eventoInstalacao = null;
  atualizarInstalacao();
});
modoAplicativo.addEventListener("change", atualizarInstalacao);

function mostrarAtualizacao() {
  if (!registro?.waiting) return false;
  mensagemAtualizacao.textContent = "Nova versão pronta. Salve a atividade em preenchimento, feche todas as abas e janelas do Diário de Bordo e abra novamente. A atualização não apaga os registros salvos.";
  return true;
}

function conferirOffline() {
  const trabalhador = registro?.active;
  if (!trabalhador || trabalhador.state !== "activated") return;

  // MessageChannel cria um canal de resposta entre esta página e o service worker.
  const canal = new MessageChannel();
  const tempoLimite = setTimeout(() => {
    mensagemOffline.textContent = "Não foi possível confirmar o preparo offline. Com conexão, use Verificar atualização e preparo offline para tentar novamente.";
    canal.port1.close();
  }, 5000);

  canal.port1.onmessage = (evento) => {
    clearTimeout(tempoLimite);
    canal.port1.close();
    if (evento.data.pronto && navigator.serviceWorker.controller) {
      mensagemOffline.textContent = `Pronto para uso offline (${evento.data.versao}). Você pode reabrir este endereço e registrar atividades sem conexão. Limpar os dados do site remove essa disponibilidade.`;
    } else if (evento.data.pronto) {
      mensagemOffline.textContent = "Arquivos preparados. Salve o que estiver preenchendo e reabra a página para concluir o preparo offline.";
    } else {
      mensagemOffline.textContent = "Os arquivos offline estão incompletos. Mantenha uma conexão e verifique se há uma atualização. Seus registros salvos são independentes desses arquivos.";
    }
  };
  trabalhador.postMessage({ tipo: "VERIFICAR_OFFLINE" }, [canal.port2]);
}

function acompanharInstalacao() {
  const trabalhador = registro.installing;
  if (!trabalhador) return;
  mensagemAtualizacao.textContent = registro.active
    ? "Baixando uma atualização. Você pode continuar preenchendo sua atividade."
    : "Preparando os arquivos para uso offline…";

  trabalhador.addEventListener("statechange", () => {
    if (trabalhador.state === "installed") mostrarAtualizacao();
    if (trabalhador.state === "activated") {
      mensagemAtualizacao.textContent = "Aplicação preparada. As próximas atualizações serão informadas aqui.";
      conferirOffline();
    }
    if (trabalhador.state === "redundant") {
      mensagemAtualizacao.textContent = "Esta tentativa de preparação não foi concluída ou foi substituída. Com conexão, tente verificar novamente.";
    }
  });
}

async function prepararAplicacao() {
  botaoVerificar.disabled = true;
  try {
    // updateViaCache none faz a verificação buscar o service worker no servidor.
    registro = await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" });
    registro.addEventListener("updatefound", acompanharInstalacao);
    acompanharInstalacao();
    mostrarAtualizacao();
    conferirOffline();
  } catch {
    mensagemOffline.textContent = "Não foi possível preparar o uso offline. Confira sua conexão e tente novamente. Você pode continuar registrando atividades nesta página.";
  } finally {
    botaoVerificar.disabled = false;
  }
}

botaoVerificar.addEventListener("click", async () => {
  if (!registro) {
    await prepararAplicacao();
    return;
  }
  botaoVerificar.disabled = true;
  mensagemAtualizacao.textContent = "Verificando atualização…";
  try {
    await registro.update();
    if (!mostrarAtualizacao() && !registro.installing) {
      mensagemAtualizacao.textContent = "Nenhuma nova versão encontrada nesta verificação.";
    }
  } catch {
    if (!mostrarAtualizacao()) mensagemAtualizacao.textContent = "Não foi possível consultar atualizações. Confira sua conexão e tente novamente; seus registros não foram alterados.";
  } finally {
    conferirOffline();
    botaoVerificar.disabled = false;
  }
});

atualizarConexao();
atualizarInstalacao();
window.addEventListener("online", atualizarConexao);
window.addEventListener("offline", atualizarConexao);

if (window.isSecureContext && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Nunca recarregamos automaticamente: o formulário pode ter texto ainda não salvo.
    conferirOffline();
  });
  prepararAplicacao();
} else {
  mensagemOffline.textContent = "O uso offline não está disponível neste acesso. Use um navegador compatível e um endereço HTTPS ou localhost.";
  botaoVerificar.disabled = true;
}
