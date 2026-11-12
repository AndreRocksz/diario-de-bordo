# Referências para manter o código compreensível

Esta revisão consultou uma amostra acessível de projetos públicos e chats relacionados.
Não é uma avaliação de capacidade nem uma afirmação de que todo código publicado foi
escrito sem ajuda. A presença de um recurso é evidência de contato, não de domínio.

## Referências consultadas

| Código | Padrões encontrados |
|---|---|
| [CadastroClientes — app.js](https://github.com/AndreRocksz/CadastroClientes/blob/main/js/app.js) | Imports de arquivos próprios, funções nomeadas, eventos, DOM, `if`, `map`, `filter`, `async/await` e JSON |
| [CadastroClientes — utils.js](https://github.com/AndreRocksz/CadastroClientes/blob/main/js/utils.js) | Função exportada para criar um elemento da interface |
| [CatalogoLivros — App.tsx](https://github.com/AndreRocksz/CatalogoLivros/blob/main/book-catalog/src/App.tsx) | Imports, `try/catch`, `async/await`, `filter` e cópia de array com `...` |
| [To-Do-List — useTodos.js](https://github.com/AndreRocksz/To-Do-List/blob/main/to-do-list/src/hooks/useTodos.js) | Funções para adicionar/remover, `map`, `filter` e cópia de objeto com `...` |

Chats consultados: **Configuração De PWA**, **Desenvolvimento Loja Virtual React** e
**Ajuda em projeto TypeScript**. Suas mensagens são contexto histórico; resultados de
testes antigos não validam automaticamente esta versão do Diário.

## Critério para as próximas mudanças

- Preferir funções com uma ação clara, como `moverParaLixeira(id)` e `restaurarEntrada(id)`.
- Usar variáveis intermediárias para evitar muitas decisões dentro da mesma expressão.
- Manter módulos simples, `map`, `filter` e cópias de dados quando ajudam a preservar o histórico.
- Não adicionar bibliotecas, classes ou fábricas apenas para tornar a arquitetura mais sofisticada.
- Não reescrever recursos específicos da PWA como se fossem lógica simples de formulário.
  Mantê-los isolados e comentados, com seu motivo de existência explícito.
- Explicar linha por linha somente os trechos solicitados. Uma refatoração não deve
  exigir uma aula extensa como condição para a pessoa continuar o projeto.

## Trechos prioritários para explicações pontuais

Não foram encontrados equivalentes nos quatro arquivos de referência acima:

| Recurso | Motivo de existir aqui |
|---|---|
| `crypto.randomUUID()` | Identificar registros sem depender do horário em milissegundos |
| `Blob`, `URL.createObjectURL` e `revokeObjectURL` | Preparar e baixar uma cópia JSON |
| Expressão regular e métodos de `Date` em `dataValida` | Rejeitar datas impossíveis ou fora do formato |
| `MessageChannel` e `postMessage` | Conferir os arquivos offline com o service worker |
| Eventos de instalação, `waitUntil` e Cache API | Manter o aplicativo utilizável offline e controlar a atualização |
| Imports com `node:`, `test` e `assert` | Executar e verificar testes fora do navegador |
| `vm`, `Map` e funções simuladas nos testes | Exercitar falhas sem mexer no navegador ou nos dados reais |

Essa lista é uma seleção para estudo sob demanda, não uma lista de pré-requisitos
para avançar. `delete`, usado na restauração, também recebeu comentário no próprio código.

## Um único exemplo de teste

Recorte do teste em `tests/armazenamento.test.js`, com os imports necessários:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { dataValida } from "../armazenamento.js";

test("rejeita 29 de fevereiro em um ano não bissexto", function () {
  const resultado = dataValida("2025-02-29");
  assert.equal(resultado, false);
});
```

- `import ... from ...`: traz algo de outro arquivo ou módulo. `node:` identifica
  ferramentas que já vêm com o Node.js. Não são pacotes que precisamos instalar.
- `{ dataValida }`: pede a função exportada com esse nome no arquivo indicado.
  `../` significa subir uma pasta a partir da pasta `tests`.
- `test(...)`: registra uma verificação. Recebe seu nome e a função com os passos.
- `function () { ... }`: função sem nome, entregue ao executor para ele chamar.
  `() => { ... }` é outra sintaxe de função usada nos demais testes; nesse exemplo
  teria o mesmo efeito. Os parênteses vazios indicam que ela não recebe parâmetros.
- `const resultado = ...`: guarda a resposta da função. Aqui esperamos `false`,
  porque 2025 não tem 29 de fevereiro.
- `assert.equal(resultado, false)`: compara a resposta obtida com a esperada, sem
  converter tipos. Se forem diferentes, o teste falha.
- `});`: fecha o corpo da função (`}`), a chamada de `test` (`)`) e a instrução (`;`).

`import`, `from`, `function` e `const` fazem parte da sintaxe do JavaScript.
`test`, `assert`, `equal` e `dataValida` são nomes de funções ou objetos, não palavras
reservadas. Para executar só esse exemplo:

```sh
node --test --test-name-pattern="rejeita 29" tests/armazenamento.test.js
```
