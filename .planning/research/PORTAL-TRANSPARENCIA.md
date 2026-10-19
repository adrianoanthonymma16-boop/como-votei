# Portal da Transparência: o que serve para parlamentares

Pesquisa feita em 2026-10-19, com a chave de API do usuário, contra a API real (não só a documentação).

## Pergunta

Quais dados do Portal da Transparência Federal podem enriquecer as páginas atuais de deputados e senadores, e a que custo de ingestão?

## Veredito

| Conjunto | Cobre parlamentares? | Decisão |
|---|---|---|
| **Emendas parlamentares** | Sim — deputados e senadores, individuais, de bancada e de comissão | **Ingerir** |
| **Viagens a serviço** | Não — orçamento do Executivo Federal | Descartar (viagem já vem de CEAP/CEAPS) |
| **Servidores / remuneração** | Não — Executivo Federal; exige CPF/idServidor | Descartar |
| **Remuneração de parlamentar** | Não existe por parlamentar: subsídio é fixo e uniforme | Descartar |

## Host e autenticação

- Host correto: **`api.portaldatransparencia.gov.br`**. `api.portaltransparencia.gov.br` **não tem registro DNS**.
- Header: `chave-api-dados: <CHAVE_API_PORTAL>`.
- OpenAPI: `GET /v3/api-docs` (200, ~171 KB, 109 paths).
- Limites: 700 req/min (00:00–06:00), 400 req/min no resto do dia, 180 req/min nas APIs restritas (`despesas/documentos-por-favorecido`, `bolsa-familia*`, `auxilio-emergencial*`, `seguro-defeso-codigo`). Emendas **não** é restrita.

## Emendas parlamentares

`GET /api-de-dados/emendas?ano=YYYY&pagina=N` — **15 registros por página, sem header de total**.

Campos: `codigoEmenda, ano, tipoEmenda, autor, nomeAutor, numeroEmenda, localidadeDoGasto, funcao, subfuncao, valorEmpenhado, valorLiquidado, valorPago, valorRestoInscrito, valorRestoCancelado, valorRestoPago`.

### Volume real (varredura completa)

| Ano | Emendas | Páginas | Autores distintos | Casados com os 733 parlamentares | Ambíguos | Sem match |
|---|---|---|---|---|---|---|
| 2024 | 6.990 | 466 | 642 | 586 (91%) | 0 | 56 |
| 2025 | 6.310 | 421 | 628 | 581 (93%) | 0 | 47 |
| 2026 | 5.670 | 378 | 632 | 584 (92%) | 0 | 48 |

Custo de ingestão para os 3 anos: **~1.265 requisições**, ≈4 min a 400 req/min. Cabe folgado em um step de workflow.

Valor pago em 2025: R$ 31,54 bi no total; R$ 19,46 bi nos autores casados.

### Match por nome é viável

- `nomeAutor` é o nome parlamentar; normalização (maiúsculas, sem acento, sem parênteses) casa **exatamente** com `Parlamentar.nome` em 92% dos autores.
- **Zero ambiguidade** nos 3 anos — o par (nome normalizado) é único na base.
- Os ~50 sem match por ano são ex-parlamentares, variações de nome e autores institucionais; devem ser **ignorados, não adivinhados** (mesma regra do `camara-name-match`).
- `autor` traz ruído entre parênteses (ex.: `RODRIGO DA ZAELI (EX-PARLAMENTAR ABILIO BRUNINI...)`) — usar `nomeAutor`, nunca `autor`.

### Documentos

`GET /api-de-dados/emendas/documentos/{codigoEmenda}?pagina=N` devolve fases (`Empenho`, `Liquidação`, `Pagamento`) com `data`, `codigoDocumento`, `especieTipo`. Serve para comprovação, mas exige **1 requisição por emenda** (~19k para 3 anos) — só vale se houver demanda de UI.

### Tipos de emenda observados

`Emenda Individual - Transferências com Finalidade Definida`, `Emenda de Bancada`, além de individuais de outra espécie e de comissão. O campo é texto livre — não modelar como enum fechado.

## Viagens a serviço — descartado

- `GET /api-de-dados/viagens` filtra por `codigoOrgao` e período de no máximo 1 mês; órgãos são do Executivo.
- `GET /api-de-dados/viagens-por-cpf?cpf=` exigiria CPF, que **não existe** em `parlamentares` (0 de 648 deputados e 0 de 85 senadores têm `cpf` preenchido).
- Viagem parlamentar já está coberta por **CEAP/CEAPS** nas categorias de passagens e diárias, que o produto já ingere.

## Remuneração e benefícios — descartado

- `GET /api-de-dados/servidores/remuneracao` exige `cpf` ou `idServidor` de servidor do **Executivo Federal**.
- Subsídio de deputado federal é fixo: **R$ 46.366,19** desde 01/02/2023 (Decreto Legislativo 172/2022). Não é dado por parlamentar, é tabela única.
- Senado tem dados próprios, sem chave: `adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/{codigo}/recursos-utilizados`, `.../senadores/auxilio-moradia-imoveis-funcionais` e `.../senadores/despesas_ceaps/{ano}`. Se "benefícios" for prioridade, a fonte é o Senado, não o Portal.

## Recomendação

1. Ingerir **somente emendas**, via API do Portal, na janela de 3 anos, com `codigoEmenda` como chave natural e `parlamentarId` resolvido por nome normalizado (match único ou nulo).
2. Enriquecer a **aba Gastos** existente com um bloco de emendas (total pago no ano, por função, por localidade) em vez de criar rota nova.
3. Não ingerir viagens nem remuneração pelo Portal. Se "benefícios" continuar no escopo, abrir frente separada para o endpoint do Senado.

## Riscos

- **Janela de 3 anos** já está definida no produto; emendas seguem a mesma retention.
- **Sem total de páginas**: a sincronização deve parar na primeira página vazia e guardar a contagem para sanity gate (evita truncar silenciosamente).
- **Mudança de `codigoEmenda` entre anos**: o código carrega o ano, então a chave é estável dentro do ano, mas emendas plurianuais podem reaparecer — validar colisão antes de congelar o `@@unique`.
- **Valores em pt-BR** (`1.234,56`): reutilizar `parseBRL` já existente.
- **Chave de API**: vai em `.env` (git-ignored) e em secret do GH Actions; nunca no repositório.
