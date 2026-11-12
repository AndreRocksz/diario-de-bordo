# Etapa 3 — Consulta, recuperação e interface

Verificação em 16/10/2026 no navegador integrado, com dados fictícios na origem
127.0.0.1:4176, separada da porta padrão para preservar o histórico de uso.

## Implementado

- Consulta combinada por projeto e período; limites inclusivos e busca sem acentos/maiúsculas.
- Histórico em destaque e formulário ao lado no desktop, abaixo em telas pequenas.
- Atalho de registro, títulos semânticos, foco visível e mensagens textuais.
- Lixeira recolhida que abre ao remover; foco no destino após remover/restaurar.
- Importação JSON com limite de 2 MB, validação, prévia, confirmação e cancelamento.
- Repetições ignoradas e conflitos bloqueados; nova prévia se o histórico mudar.
- Módulo de consulta incluído no cache v9.

## Evidências

| Verificação | Resultado |
| --- | --- |
| npm test | 47 testes passaram |
| Importação de três registros fictícios | Prévia antes da gravação; três cartões após confirmar |
| Projeto portal combinado com data inicial | Um de três registros na data esperada |
| Limpar filtros | Três registros novamente |
| Remover e restaurar | Lixeira aberta, foco no título e retorno ao histórico |
| Atalho Registrar atividade | Foco no campo de título |
| Link Pular para o conteúdo acionado com Enter | Foco no conteúdo principal |
| Recarga e atualização v8 para v9 após fechar aba | Três registros preservados |
| Servidor desligado e reabertura | Histórico e filtro funcionando pelo cache v9 |
| Console no fluxo offline verificado | Nenhum erro capturado |
| Viewports 320×740, 390×844, 844×390 e 1280×900 | Layout adaptável, sem transbordamento horizontal observado |

Os testes automatizados incluem falhas de importação, cancelamento, prévia desatualizada,
datas inválidas, conflitos e compatibilidade. As capturas estão no README.
O servidor foi desligado após o teste offline; npm start inicia o ambiente padrão.

## Pendências preservadas

Viewport estreito simula dimensões, não aparelho real. Faltam dispositivos reais,
leitor de tela, percurso completo por teclado, zoom e auditoria completa de contraste.
Também faltam instalação efetiva, modo avião e publicação HTTPS. Os exemplos orientam
o fluxo profissional, mas não substituem pesquisa com usuários.

A explicação final deverá detalhar especialmente expressões regulares, normalização
de texto, métodos de arrays, operador ??, leitura assíncrona de arquivos, fluxo de
armazenamento/importação e um teste representativo com sua sintaxe.
