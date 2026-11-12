# Plano de evolução do Diário de Bordo

## Público e problema

Profissionais que precisam acompanhar atividades de rotina e de diferentes projetos,
recuperar entregas, dificuldades e aprendizados e preparar reuniões de acompanhamento
ou revisões semanais. Não é restrito a estudantes ou pessoas em início de carreira.

Hipótese a validar com o uso: um registro breve e contextualizado reduz a dependência
da memória e de anotações espalhadas. Conversar com duas ou três pessoas desse público
continua sendo uma sugestão de validação, não uma pesquisa já realizada.

## Etapa 1 — Registros confiáveis

- [x] Corrigir estado vazio e contextualizar os textos para acompanhamento profissional.
- [x] Incluir projeto/contexto opcional, sem exigir mudanças nos registros antigos.
- [x] Validar estrutura, datas, campos obrigatórios e identificadores dos dados salvos.
- [x] Tratar falhas de acesso e de cota sem substituir o histórico existente.
- [x] Atualizar memória, tela e formulário somente após gravação bem-sucedida.
- [x] Proteger contra conflitos detectáveis entre abas e manter o formulário ao recarregar o histórico.
- [x] Substituir remoção permanente por lixeira persistente com restauração.
- [x] Oferecer exportação dos dados brutos, inclusive para recuperação de histórico inválido.
- [x] Explicar armazenamento local, ausência de sincronização e risco de limpeza do navegador.
- [x] Adicionar mensagens acessíveis, nomes específicos nas ações e foco após movimentação.
- [x] Proteger títulos e projetos longos contra transbordamento.
- [x] Comentar decisões importantes de JavaScript; manter CSS sem comentários.
- [x] Criar testes de persistência, compatibilidade e situações de falha.

Critério: registrar, recarregar, mover para lixeira e restaurar sem perder dados;
falhas devem preservar formulário e histórico e informar como tentar novamente.

## Etapa 2 — PWA, instalação e atualização

Correções antecipadas por afetarem esta entrega:
- [x] Corrigir `appinstalled` e retirar botão sem evento utilizável após recusa da instalação.
- [x] Incluir o módulo de armazenamento no cache e incrementar sua versão.
- [x] Restringir limpeza aos caches com o prefixo do Diário de Bordo.
- [x] Restringir fallback HTML às navegações.
- [x] Retirar bloqueio de orientação em retrato.

Implementação e verificação:
- [x] Definir e implementar atualização por versões, sem ativação forçada ou recarga durante o preenchimento; publicação exige incremento de versão e envio do conjunto completo.
- [x] Isolar caches por escopo para diferentes instalações no mesmo domínio.
- [x] Orientar instalação alternativa quando não houver `beforeinstallprompt`.
- [x] Informar preparo offline e atualizações de forma acessível.
- [x] Validar primeiro acesso, retorno com servidor desligado, cadastro sem servidor e atualização com dados existentes no navegador integrado.
- [ ] Validar instalação efetiva e uso instalado em navegadores/dispositivos reais; registrar a matriz testada.
- [x] Documentar HTTPS em produção, localhost no desenvolvimento e limites de compatibilidade.
- [ ] Complementar a verificação com modo avião e atualização em hospedagem HTTPS real.

Resultados, limitações e roteiro para validação real: [docs/PWA.md](docs/PWA.md).

## Etapa 3 — Uso, visual, responsividade e acessibilidade

- [x] Facilitar consulta por projeto e período para acompanhamentos e revisões semanais.
- [x] Melhorar hierarquia visual e acesso ao histórico, reduzindo o espaço inicial ocupado pelo formulário.
- [x] Refinar estados vazio, sucesso, erro e indisponibilidade sem depender apenas de cores.
- [ ] Verificar teclado, ordem de foco, leitor de tela, zoom e contraste.
- [ ] Verificar dispositivos reais, telas pequenas, paisagem e textos longos.
- [x] Complementar a exportação com importação validada e recuperação sem sobrescrita silenciosa.
- [ ] Validar utilidade dos textos e fluxo com exemplos reais de rotina, entregas e aprendizados.

Resultados da implementação e verificações parciais: [docs/ETAPA-3.md](docs/ETAPA-3.md). As validações em aparelhos reais e a auditoria completa permanecem pendentes.

## Etapa 4 — Entrega profissional

- [x] Na entrega final, preparar uma explicação BEM DETALHADA das alterações, conceitos, fluxo de dados e decisões, incluindo a sintaxe dos testes com exemplos. Durante a refatoração, explicar apenas decisões muito importantes para agilizar o trabalho, conforme pedido de 16/10/2026.

- [x] Consultar projetos públicos e chats relacionados para orientar o nível de abstração, sem presumir domínio de cada recurso encontrado. Referências e um único exemplo de teste em [docs/REFERENCIAS-DE-CODIGO.md](docs/REFERENCIAS-DE-CODIGO.md).

## Orientação de implementação e comunicação

O objetivo é poupar tempo e retrabalho sem produzir código que a pessoa não consiga
defender no portfólio. Priorizar funções diretas, nomes claros e `if` explícitos,
tomando como referências o Diário original e os códigos públicos consultados de
CadastroClientes, CatalogoLivros e To-Do-List. A presença de um recurso num exercício não prova
domínio dele. Evitar fábricas de funções e abstrações para facilitar testes no código
da aplicação quando funções comuns resolvem o problema. Manter as proteções de dados.

Não reintroduzir explicações extensas como condição para avançar. Entregar mudanças
pequenas com resumo objetivo e preservar as funcionalidades já aprovadas. PWA e testes
possuem APIs específicas e permanecem separados do fluxo de cadastro.

- [x] Finalizar README com problema, público, funcionamento e limitações.
- [x] Registrar tecnologias, versões verificadas e ambiente de testes.
- [x] Documentar execução local, publicação e decisões técnicas.
- [x] Relatar dificuldades reais e soluções adotadas.
- [x] Adicionar imagens ou GIFs da aplicação final, incluindo experiência móvel.
- [ ] Executar os critérios das etapas anteriores e registrar resultados e pendências sem afirmar testes não realizados.

Manter HTML, CSS e JavaScript puro enquanto atenderem ao escopo; novas dependências
precisam resolver uma necessidade concreta. Este plano reúne todas as propostas da
análise inicial; itens antecipados não eliminam a validação das etapas seguintes.


## Revisão de entrega

Guia detalhado: [docs/GUIA-DO-CODIGO.md](docs/GUIA-DO-CODIGO.md). Evidências, correções e roteiro das validações externas: [docs/REVISAO-FINAL.md](docs/REVISAO-FINAL.md). Foram executados 48 testes automatizados. As listas pendentes acima permanecem abertas: viewport, testes simulados e medições parciais não substituem aparelhos reais, leitor de tela, zoom ou validação com o público.

## Encerramento da refatoração

A refatoração da versão atual está concluída. Não há novas funcionalidades ou mudanças
estruturais previstas para fechar esta entrega. Cadastro confiável, lixeira, cópias,
filtros, interface responsiva, PWA, README e guia detalhado estão implementados.

Na conferência de encerramento passaram 48 testes. Também foram verificados a sintaxe
dos 11 arquivos JavaScript, 17 links locais da documentação, as dimensões dos dois
ícones e a presença dos 10 recursos listados para uso offline.

Os itens ainda desmarcados acima são validações externas ou de uso: dispositivos reais,
instalação, modo avião, HTTPS, zoom, leitor de tela e retorno do público. Continuam
registrados e não são considerados aprovados. Se revelarem defeitos, estes serão
tratados como correções específicas, sem reabrir uma refatoração geral.

A entrega está nos arquivos locais. Publicação e envio ao GitHub não foram realizados.
