# Entendendo as alterações do Diário de Bordo

Este guia acompanha o código atual. Ele não pressupõe que você já conheça expressões
regulares, módulos, promises ou bibliotecas de teste. Você não precisa decorar o
projeto: precisa conseguir relacionar cada decisão ao problema que ela resolve.

## 1. O problema e o que mudou

O Diário organiza entregas, dificuldades e aprendizados por projeto e data. A pessoa
pode recuperar exemplos de seu trabalho para reuniões e revisões. O foco não é
controlar uma equipe, atribuir tarefas ou substituir um gerenciador de projetos.

As mudanças acrescentaram proteções ao registro, lixeira, cópia exportável e importável,
consulta por projeto/período, funcionamento offline e uma interface mais organizada.
A escolha de HTML, CSS e JavaScript puro preserva a base do projeto. Os arquivos
foram separados por responsabilidade para evitar misturar armazenamento, tela e PWA.

Há três coisas diferentes que você deve distinguir:

1. `entradas`: array JavaScript na memória da página. Desaparece ao fechar a página.
2. `localStorage`: texto guardado pelo navegador. Pode sobreviver ao fechamento.
3. Cache do service worker: arquivos HTML, CSS, JavaScript e ícones para abrir offline.

Salvar no array não salva automaticamente no localStorage. Guardar os arquivos no
cache não cria uma cópia de segurança dos registros. Essa separação explica várias
proteções que parecem complicadas quando vistas isoladamente.

## 2. Como os arquivos conversam

O HTML carrega `script.js` e `pwa.js` com `type="module"`. Um módulo é um arquivo que
pode disponibilizar funções e utilizar funções de outros arquivos.

```js
import { carregarEntradas, salvarEntradas } from "./armazenamento.js";
```

`import` é uma palavra da linguagem. As chaves selecionam os nomes exportados pelo
outro arquivo. `from` indica a origem. `./` significa a pasta atual. Não é necessário
instalar essas funções: elas foram escritas neste próprio projeto.

```js
export function carregarEntradas() { /* ... */ }
```

`export` permite importar essa função. As variáveis internas que não são exportadas,
como `ultimaLeitura`, continuam internas ao módulo. Não confunda esses imports com
`node:test`: este último é um módulo que já vem com o Node.js.

Ao abrir a página, `campoData.value = hoje()` preenche a data local e
`carregarHistorico(true)` lê os registros. Essa função chama `carregarEntradas`,
atualiza o estado e pede a renderização. Renderizar significa montar a tela a partir
dos dados. A interface não é a fonte definitiva dos registros.

## 3. armazenamento.js: a base da proteção

### A chave e as variáveis

```js
export const CHAVE_ENTRADAS = "diario-de-bordo-entradas";
let ultimaLeitura;
let armazenamentoDisponivel = false;
```

A chave é o nome usado para encontrar o texto salvo no navegador. Ela foi preservada
para continuar encontrando os registros antigos. `const` impede reatribuir essa
variável. `let` permite reatribuição. A variável sem valor inicial começa como
`undefined`, que significa ausência de valor definido.

`ultimaLeitura` guarda o texto exato lido anteriormente. Ele será comparado antes de
salvar, para detectar mudanças de outra aba. `armazenamentoDisponivel` só vira true
depois de uma leitura válida; não basta presumir que o navegador permite gravar.

### A linha com barras e símbolos

```js
if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
  return false;
}
```

A parte entre barras é uma **expressão regular**, um padrão para reconhecer texto.
As barras delimitam o padrão; elas não fazem parte da data e não são divisão.

| Parte | Significado aqui |
| --- | --- |
| `/` inicial e final | Início e fim da expressão regular |
| `^` | Começo do texto |
| `\d` | Um algarismo de 0 a 9 |
| `{4}` | Exatamente quatro ocorrências do elemento anterior |
| `-` | Um hífen literal |
| `{2}` | Exatamente duas ocorrências |
| `$` | Fim do texto |
| `.test(valor)` | Verifica se valor corresponde ao padrão |
| `!` | Inverte o resultado da verificação |

Lendo: se o texto **não** for quatro algarismos, hífen, dois algarismos, hífen e dois
algarismos, a função devolve false e termina. `2026-10-16` passa; `16/10/2026`,
`2026-1-6` e `abc2026-10-16` não passam. O teste anterior com `typeof` assegura que
recebemos uma string, isto é, texto.

Esse padrão confere o formato, não o calendário. `2026-02-30` tem o formato certo,
mas fevereiro não tem trinta dias. Por isso existem as próximas linhas.

```js
const data = new Date(`${valor}T12:00:00Z`);
```

`new Date` cria um objeto de data. As crases formam um template literal: `${valor}`
é substituído pelo conteúdo da variável. Para `2026-10-16`, o texto final será
`2026-10-16T12:00:00Z`. `T` separa data e horário, e `Z` indica UTC. Usamos uma
representação fixa para conferir a data sem depender do fuso local.

```js
if (Number(valor.slice(0, 4)) === 0 || Number.isNaN(data.getTime())) {
  return false;
}
return data.toISOString().slice(0, 10) === valor;
```

`slice(0, 4)` extrai do índice zero até antes do quatro: o ano. `Number` converte o
texto em número. O ano zero é rejeitado por uma decisão da aplicação. `||` significa
que basta uma das condições ser verdadeira para entrar no if.

`getTime()` devolve o instante numérico da data; numa data inválida devolve `NaN`,
isto é, um resultado que não representa um número válido. `Number.isNaN` verifica
isso antes de chamar `toISOString`, evitando que essa chamada falhe.

`toISOString()` devolve uma representação padronizada em UTC. `slice(0, 10)` pega
apenas ano-mês-dia. O JavaScript pode ajustar uma data impossível para março; se
isso acontecer, o texto devolvido não será igual ao texto recebido. A comparação
com `===` detecta essa diferença. A validação não altera a data do registro.

### Validar a lista inteira

`Array.isArray` verifica se o conteúdo é um array. Um JSON pode conter um objeto,
texto, número ou null e ainda ser JSON válido. Conseguir ler JSON não prova que
recebemos um histórico correto.

```js
for (const entrada of entradasSalvas) {
  // Verifica uma atividade de cada vez.
}
```

`for...of` percorre os valores da lista. Em cada volta, `entrada` representa uma
atividade. A validação exige um objeto, ID utilizável, título e descrição com
conteúdo e uma data real.

- `typeof entrada.id === "number"`: identifica IDs numéricos antigos.
- `Number.isSafeInteger`: exige um inteiro representável com precisão em JavaScript.
- `trim()`: remove espaços das extremidades; um título feito apenas de espaços vira vazio.
- `idsEncontrados.includes(entrada.id)`: verifica se aquele ID já apareceu.
- `push`: acrescenta o ID à lista de identificadores encontrados.
- `entrada.projeto !== undefined`: só exige texto quando o campo opcional existe.
- `Date.parse` e `Number.isFinite`: verificam se a marca de remoção representa um instante interpretável.

```js
throw new Error("Há uma atividade com data inválida.");
```

`new Error` cria um erro com uma mensagem. `throw` interrompe o fluxo normal e envia
o erro para um `catch` que o trate. Não equivale a `return false`: quem chamou deve
capturar o erro, e nenhuma das linhas seguintes desse caminho é executada.

A validação conserva campos desconhecidos dos registros. Isso ajuda a manter
compatibilidade, mas a aplicação só utiliza os campos que conhece.

### Ler sem destruir um histórico ilegível

`getItem(CHAVE_ENTRADAS)` lê texto do localStorage. Se a chave ainda não existir,
retorna null. Nesse primeiro uso, usamos um array vazio na memória, sem gravá-lo.

`JSON.parse(dadosSalvos)` transforma texto JSON em valores JavaScript. Texto
incompleto, como apenas `{`, causa erro. `validarEntradas` verifica a estrutura
resultante. Somente depois dessas duas etapas a leitura é considerada válida.

```js
return { ok: true, entradas: entradasSalvas };
```

Esse objeto comunica dois resultados: a leitura funcionou e esta é a lista lida.
As palavras `ok` e `entradas` são nomes escolhidos pelo projeto, não palavras
reservadas. A interface acessa `resultado.ok` e `resultado.entradas`.

`try` delimita as operações que podem falhar. `catch` trata a falha e devolve um
resultado com `ok: false` e uma mensagem. Ele não apaga o armazenamento. Salvar uma
lista vazia no catch esconderia o erro destruindo os dados que talvez fossem recuperáveis.

### Gravar antes de informar sucesso

`salvarEntradas` primeiro exige uma leitura válida e valida a lista proposta.
Depois relê o conteúdo persistido e compara com `ultimaLeitura`.

```js
if (dadosAtuais !== ultimaLeitura) {
  armazenamentoDisponivel = false;
  return { ok: false, mensagem: "..." };
}
```

Se outra aba mudou o texto desde nossa leitura, não gravamos por cima dele. A pessoa
pode recarregar o histórico mantendo o formulário. Isso reduz conflitos, mas não é
uma transação: duas abas que leem e gravam exatamente ao mesmo tempo ainda podem
conflitar. Esse limite está documentado e não deve ser apresentado como sincronização.

`JSON.stringify(proximasEntradas)` converte o array para texto. `setItem` grava o
texto. Essa operação pode falhar por bloqueio ou falta de espaço. Só depois dela
atualizamos `ultimaLeitura` e retornamos sucesso.

`exportarEntradas` lê o texto bruto sem passar por parse/validação. Isso permite
baixar inclusive um histórico danificado para tentar recuperá-lo manualmente.

### Importar sem sobrescrever

`prepararImportacao` transforma o arquivo em dados e valida a lista inteira. Depois
separa os registros novos das repetições, sem gravar nada.

```js
const existente = atuais.find((atual) => atual.id === entrada.id);
```

`find` percorre a lista até encontrar um item que satisfaça a condição. A expressão
`(atual) => atual.id === entrada.id` é uma arrow function: recebe um item e devolve
se o ID dele corresponde ao procurado. Sem chaves no corpo, o retorno é implícito.
Se não encontrar, `find` devolve undefined.

Quando não existe um registro com esse ID, `novas.push(entrada)` o separa para
importação, e `continue` pula para o próximo item do laço.

```js
const campos = ["titulo", "data", "descricao", "projeto", "excluidaEm"];
const igual = campos.every((campo) => (existente[campo] ?? "") === (entrada[campo] ?? ""));
```

`every` só retorna true quando **todos** os campos passam na comparação. `campo`
recebe cada nome da lista. Os colchetes acessam uma propriedade cujo nome está numa
variável: se campo vale `titulo`, `existente[campo]` lê o título.

`??` usa o valor à direita somente se o da esquerda for null ou undefined. Assim,
um projeto ausente num registro antigo pode ser comparado com um projeto vazio.
Ele é diferente de `||`, que também substitui valores como zero e false.

Mesmo ID e mesmos campos conhecidos: repetição, contabilizada e ignorada. Mesmo ID e
conteúdo diferente: erro, sem importar sequer os outros registros daquele arquivo.
IDs diferentes com textos iguais são tratados como atividades distintas; não há
adivinhação de duplicidade pelo título. Campos desconhecidos não participam da comparação.

## 4. A interface: copiar, salvar e só então mostrar

O formulário usa `preventDefault()` para impedir a navegação normal do envio HTML.
Os campos são lidos, espaços externos removidos e conteúdo/data conferidos.
`crypto.randomUUID()` fornece um novo identificador com probabilidade extremamente
baixa de colisão; não é um número sequencial nem uma credencial.

`entradas.slice()` cria outro array. `push(novaEntrada)` altera esse novo array.
`salvarAlteracoes` tenta persistir a lista e só em caso de sucesso substitui
`entradas`, renderiza e informa sucesso. O formulário só é limpo depois disso.

Para mover ou restaurar usamos `map`: ele produz um array, retornando um item para
cada posição original. Itens não escolhidos são devolvidos como estão.

```js
const atividadeRemovida = { ...entrada };
atividadeRemovida.excluidaEm = new Date().toISOString();
```

`...entrada` dentro do objeto copia suas propriedades. É uma cópia superficial:
objetos internos continuariam compartilhados, mas os campos usados aqui são valores
simples. O original não recebe a marca antes de a gravação ter sucesso.

Na restauração, `delete atividadeRestaurada.excluidaEm` remove só a propriedade da
cópia. Não apaga o registro inteiro. A lista ativa contém os itens sem essa marca.

`document.createElement` cria os elementos dos cartões. `textContent` insere texto
literal: mesmo que alguém escreva uma tag, ela aparece como texto e não é executada
como HTML. `append` encaixa elementos na página. `replaceChildren` limpa o conteúdo
da região antes de remontá-la; não remove registros do localStorage.

O botão que move um registro desaparece daquela lista. Por isso o foco vai para o
título da lixeira, que é aberta. `tabindex="-1"` permite focar esse título por código
sem torná-lo mais uma parada em cada uso de Tab. Na restauração, o foco vai ao histórico.

## 5. Consulta e normalização de texto

`filter` cria uma lista apenas com os itens cujo teste retorna true. A consulta exclui
a lixeira, compara o projeto e aplica os limites de data. Valores vazios deixam aquele
filtro livre. Datas já validadas em AAAA-MM-DD podem ser comparadas como texto porque
ano, mês e dia estão em ordem e têm larguras fixas.

```js
texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
```

Esta sequência facilita encontrar `Aplicação` digitando `aplicacao`:

1. `normalize("NFD")` decompõe letras acentuadas quando há uma representação decomposta.
2. `[\u0300-\u036f]` representa um intervalo de marcas combinantes Unicode.
3. `g` manda substituir todas as ocorrências encontradas, não apenas a primeira.
4. `replace(..., "")` remove essas marcas; `toLowerCase()` converte para minúsculas.

Isso atende a busca em português, não é uma solução universal para todos os alfabetos.
O texto original permanece no registro. `includes(busca)` procura o trecho digitado.

`sort` ordena o array filtrado. A função que compara segunda data com primeira usando
`localeCompare` produz a ordem decrescente. `sort` altera o array em que é chamado,
mas aqui é o novo array criado por filter: a lista persistida continua intacta.

## 6. Arquivos, async e confirmação

A seleção de arquivo dispara o evento `change`. `files[0]` é o primeiro arquivo
escolhido. `size` mede bytes, e `2 * 1024 * 1024` é o limite adotado pela aplicação.

```js
const texto = await arquivo.text();
```

`text()` devolve uma Promise: um resultado que pode ficar pronto depois. `await`
espera esse resultado dentro da função marcada como `async`, sem bloquear toda a
interface. Se a leitura falhar, a execução vai ao catch. `finally` roda depois do
sucesso ou da falha, inclusive quando há um return dentro do try; aqui ele reabilita
o campo de arquivo.

A prévia guarda os itens novos e o histórico de referência serializado. Confirmar
compara novamente esse histórico; se mudou, exige nova seleção. O botão é ocultado
e o foco retorna ao campo de arquivo. Se tudo continua válido, `concat` cria a lista
com os registros atuais e os novos, e a gravação usa a mesma proteção das outras ações.

No download, `Blob` representa o conteúdo do arquivo, `URL.createObjectURL` cria um
endereço temporário local e um link com `download` solicita o salvamento. Depois,
`URL.revokeObjectURL` libera esse endereço. Isso não apaga os registros. Solicitar o
download não prova que a pessoa guardou o arquivo; a mensagem pede para conferir.

## 7. PWA: o que cada API faz

O manifesto descreve nome, ícones, cores e modo de abertura. Ele sozinho não faz a
aplicação funcionar offline. O service worker é um script que o navegador executa
separadamente da página para, entre outras coisas, responder a pedidos de arquivos.
Ele não tem acesso ao DOM nem usa nosso localStorage diretamente.

`navigator.serviceWorker.register` registra o script. HTTPS ou localhost é necessário
para esse recurso. `updateViaCache: "none"` evita usar cache HTTP na consulta dos
scripts do worker. Não significa desativar o cache offline da aplicação.

No evento `install`, `caches.open` abre um cache com nome próprio e `addAll` tenta
obter todos os arquivos essenciais. `waitUntil` informa ao navegador que o trabalho
assíncrono precisa terminar antes de considerar a instalação concluída. Se falhar,
não declaramos a nova instalação pronta.

Uma Promise pode ser acompanhada com `.then` ou com `await`. O callback passado a
`then` recebe o resultado quando pronto. `async () => { ... }` cria uma função
assíncrona; a forma `(async () => { ... })()` a cria e executa imediatamente.
Ela aparece dentro de waitUntil para entregar a Promise daquela sequência.

A versão entra no nome do cache. O escopo também entra, convertido por
`encodeURIComponent` para compor o nome. Isso evita limpar arquivos de outra pasta.
A versão antiga continua servindo as abas abertas: não usamos `skipWaiting`.
No evento `activate`, removemos somente caches antigos do mesmo escopo e usamos
`clients.claim()` para controlar as páginas elegíveis.

O evento `fetch` representa um pedido da página. `respondWith` fornece a resposta.
A aplicação só intercepta GET de recursos conhecidos no próprio escopo ou a navegação
inicial. Ela consulta seu cache e devolve o arquivo. Um JavaScript ausente recebe erro
503, não um HTML disfarçado de sucesso. Isso evita misturar versões, mas um cache
removido externamente pode exigir uma nova publicação ou intervenção específica.

`MessageChannel` cria duas pontas para trocar mensagens. A página envia uma ao worker
e aguarda a resposta na outra. `Promise.all` espera todas as verificações dos arquivos.
`every` exige que todos existam. Um temporizador impede esperar indefinidamente.
Somente essa resposta, junto do controle da página, permite informar preparo offline.

`registro?.active` usa encadeamento opcional: se registro não existir, produz undefined
sem tentar acessar uma propriedade de um valor ausente. Não confirma que há um worker.

`navigator.onLine` só indica a conexão detectada; pode existir rede e o servidor estar
fora do ar. `beforeinstallprompt` é um convite fornecido por alguns navegadores, usado
uma vez. Aceitar o convite não confirma instalação; `appinstalled` informa a confirmação.
`matchMedia` observa, entre outras condições, abertura no modo standalone.

O usuário precisa salvar antes de fechar abas para atualizar: formulário não enviado
não é rascunho persistente. PWA instalada não significa backup ou sincronização.

## 8. HTML, CSS e acessibilidade

Labels vinculados com `for` e `id` dão nome aos campos. `aria-describedby` associa
uma explicação adicional, como o resumo da importação. `aria-invalid` identifica um
campo com erro. `role="status"` disponibiliza atualizações sem exigir mover o foco;
`role="alert"` indica uma mensagem urgente. A leitura concreta depende da tecnologia
assistiva, por isso inspecionar atributos não substitui testar um leitor de tela.

O histórico vem primeiro no HTML e na leitura visual. Grid cria duas colunas no
desktop, e as media queries mudam para uma coluna em telas menores. Em até 420 pixels,
os filtros também ficam empilhados, evitando apertar o campo nativo de data.

`minmax(0, 1fr)` permite que uma coluna encolha abaixo do tamanho mínimo sugerido pelo
conteúdo. `min-width: 0` e `overflow-wrap: anywhere` ajudam textos longos a quebrar
linha sem estourar cartões. `:focus-visible` desenha o indicador de foco. As variáveis
CSS concentram cores e facilitam manter contraste consistente. O CSS não recebeu comentários,
conforme a preferência do projeto.

## 9. Um teste explicado, incluindo os nomes que parecem palavras reservadas

Este exemplo testa a mesma função usada na consulta e pode ser lido sem conhecer a
simulação de navegador:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { filtrarAtividades } from "../consulta.js";

test("não mostra atividades fora do projeto consultado", () => {
  const atividade = {
    id: 1, titulo: "Entrega", data: "2026-10-16",
    descricao: "Resultado", projeto: "Portal"
  };
  const resultado = filtrarAtividades([atividade], "Loja", "", "");
  assert.deepEqual(resultado, []);
});
```

- `import` e `const` são palavras da linguagem. `test`, `assert`, `atividade` e
  `resultado` são nomes; test e assert foram importados, não são palavras reservadas.
- `node:` indica módulos nativos do Node. `../` sobe uma pasta para encontrar o arquivo.
- `test` registra o nome do cenário e a função que será executada. O texto descreve
  o comportamento esperado e aparece no relatório de execução.
- `() => { ... }` é uma função sem parâmetros passada como argumento. O executor
  de testes a chama; as chaves delimitam seu corpo.
- O objeto atividade prepara um exemplo isolado. `[atividade]` cria uma lista com ele.
- A função é chamada com projeto Loja e datas vazias. Como o registro pertence ao
  Portal, esperamos que nenhuma atividade seja devolvida.
- `assert.deepEqual(resultado, [])` compara a estrutura do resultado com um array vazio.
  Se forem diferentes, lança um erro e o teste falha. Em node:assert/strict, essa
  comparação profunda também é estrita quanto aos tipos.
- `assert.equal` serve para igualdade estrita de valores, e `assert.match` confere um
  texto com uma expressão regular. Arrays distintos exigem comparação profunda para
  comparar conteúdo, não apenas se são o mesmo objeto na memória.

O padrão é preparar dados, executar uma ação e conferir o resultado. Um teste não
conserta a aplicação: revela quando o comportamento observado difere do esperado.
`npm test` executa `node --test`, conforme package.json. Se um teste usa await,
a função do teste precisa ser async para o executor acompanhar seu término.

### Por que os testes da interface têm código diferente?

Node não fornece uma página HTML real. Os testes de interface usam objetos que
imitam os métodos necessários: querySelector, addEventListener, focus e localStorage.
`montar()` cria um ambiente novo para cada cenário. O método `falhar()` faz a gravação
lançar um erro de propósito, permitindo verificar que o formulário permanece intacto.

`node:fs` lê os arquivos; `readFileSync` faz essa leitura de forma síncrona no teste.
`new URL(..., import.meta.url)` localiza os arquivos a partir do próprio teste, não
da pasta em que o terminal foi aberto. `node:vm` executa o código num contexto JavaScript
separado com os objetos simulados. Não é uma barreira de segurança para código hostil.

As expressões regulares no início dos testes retiram export/import dos textos dos
arquivos para executá-los juntos nesse contexto. `^` indica início, `m` aplica esse
início a cada linha, `g` procura todas as ocorrências e `\r?\n` aceita quebra de linha
com ou sem retorno de carro. Esse arranjo evita uma dependência, mas é sensível a
mudanças no formato dos imports. Uma evolução poderia usar um ambiente DOM de testes
se a complexidade justificar essa dependência.

O ambiente simulado não desenha a tela, não mede contraste e não executa leitores de
tela. Por isso os testes automatizados precisam ser complementados com o navegador
real. Passar em 48 testes é evidência dos cenários cobertos, não prova de ausência de bugs.

## 10. Como explicar numa entrevista

Uma apresentação honesta pode seguir esta sequência:

1. Problema: recuperar entregas e aprendizados sem depender da memória.
2. Público: profissionais que acompanham rotina e diferentes projetos.
3. Decisão: manter a aplicação simples, local e sem conta; reconhecer o limite de sincronização.
4. Maior cuidado: validar e confirmar gravação antes de atualizar memória e tela.
5. Recuperação: lixeira e exportação/importação com prévia e conflitos explícitos.
6. Offline: cache dos arquivos separado do armazenamento dos registros.
7. Qualidade: testes de falha, revisão de foco, contraste e responsividade; listar o que falta testar.

Não é necessário afirmar que escreveu tudo sem ajuda. Você pode explicar que usou
assistência na refatoração, revisou as decisões, verificou o funcionamento e estudou
as partes novas. O objetivo é conseguir argumentar sobre o código que está entregando.

Para conferir entendimento, tente prever o que acontece quando salvar falha, quando
uma cópia contém um ID conflitante e quando existe uma atualização com uma aba aberta.
Depois siga as funções neste guia e compare a previsão. Isso avalia compreensão do
fluxo, sem exigir decorar todas as APIs.
