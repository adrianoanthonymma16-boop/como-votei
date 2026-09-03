# Câmara dos Deputados - API Reference

## Deputados

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /deputados | Listagem e busca de deputados, segundo critérios |
| GET | /deputados/{id} | Informações detalhadas sobre um deputado específico |
| GET | /deputados/{id}/despesas | As despesas com exercício parlamentar do deputado |
| GET | /deputados/{id}/discursos | Os discursos feitos por um deputado em eventos diversos |
| GET | /deputados/{id}/eventos | Uma lista de eventos com a participação do parlamentar |
| GET | /deputados/{id}/frentes | As frentes parlamentares das quais um deputado é integrante |
| GET | /deputados/{id}/historico | Lista de mudanças no exercício parlamentar (versão GraphQL otimizada) |
| GET | /deputados/{id}/historico-old | Lista de mudanças no exercício parlamentar |
| GET | /deputados/{id}/mandatosExternos | Outros cargos eletivos já exercidos pelo parlamentar |
| GET | /deputados/{id}/ocupacoes | Os empregos e atividades que o parlamentar já teve |
| GET | /deputados/{id}/orgaos | Os órgãos dos quais um deputado é integrante |
| GET | /deputados/{id}/profissoes | As profissões que o parlamentar declarou à Câmara |
| GET | /legislaturas/{id}/lideres | Lista de líderes, vice-líderes e representantes na legislatura |
| GET | /legislaturas/{id}/mesa | Quais deputados fizeram parte da Mesa Diretora |
| GET | /referencias/deputados/codSituacao | As possíveis situações de exercício parlamentar |
| GET | /referencias/situacoesDeputado | As possíveis situações de exercício parlamentar |

## Proposições

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /proposicoes | Lista configurável de proposições na Câmara |
| GET | /proposicoes/{id} | Informações detalhadas sobre uma proposição específica |
| GET | /proposicoes/{id}/autores | Lista pessoas e/ou entidades autoras de uma proposição |
| GET | /proposicoes/{id}/relacionadas | Uma lista de proposições relacionadas a uma em especial |
| GET | /proposicoes/{id}/temas | Lista de áreas temáticas de uma proposição |
| GET | /proposicoes/{id}/tramitacoes | O histórico de passos na tramitação de uma proposta |
| GET | /proposicoes/{id}/votacoes | Informações detalhadas de votações sobre uma proposição |
| GET | /referencias/proposicoes/codSituacao | Os possíveis estados de tramitação |
| GET | /referencias/proposicoes/codTema | Os vários tipos de temas existentes |
| GET | /referencias/proposicoes/codTipoAutor | Entidades que podem ser autoras de proposições |
| GET | /referencias/proposicoes/codTipoTramitacao | Os vários tipos de tramitação existentes |
| GET | /referencias/proposicoes/siglaTipo | Os vários tipos de proposições existentes |
| GET | /referencias/situacoesProposicao | Os possíveis estados de tramitação |
| GET | /referencias/tiposAutor | Entidades que podem ser autoras de proposições |
| GET | /referencias/tiposProposicao | Os vários tipos de proposições existentes |
| GET | /referencias/tiposTramitacao | Os vários tipos de tramitação existentes |

## Votações

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /votacoes | Lista das votações da Câmara |
| GET | /votacoes/{id} | Informações detalhadas sobre uma votação |
| GET | /votacoes/{id}/orientacoes | O voto recomendado pelas lideranças |
| GET | /votacoes/{id}/votos | Como cada parlamentar votou em uma votação nominal |

## Órgãos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /orgaos | A lista das comissões e outros órgãos legislativos |
| GET | /orgaos/{id} | Informações detalhadas sobre um órgão |
| GET | /orgaos/{id}/eventos | Os eventos ocorridos ou previstos em um órgão |
| GET | /orgaos/{id}/membros | Lista de cargos de um órgão e parlamentares |
| GET | /orgaos/{id}/votacoes | Informações detalhadas sobre votações de um órgão |
| GET | /referencias/orgaos/codSituacao | As situações em que órgãos podem se encontrar |
| GET | /referencias/situacoesOrgao | As situações em que órgãos podem se encontrar |

## Partidos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /partidos | Os partidos políticos com parlamentares na Câmara |
| GET | /partidos/{id} | Informações detalhadas sobre um partido |
| GET | /partidos/{id}/lideres | Deputados que são ou foram líderes do partido |
| GET | /partidos/{id}/membros | Lista dos parlamentares de um partido durante um período |

## Legislaturas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /legislaturas | Os períodos de mandatos e atividades parlamentares |
| GET | /legislaturas/{id} | Informações extras sobre uma legislatura |
| GET | /legislaturas/{id}/lideres | Lista de líderes, vice-líderes e representantes |
| GET | /legislaturas/{id}/mesa | Quais deputados fizeram parte da Mesa Diretora |

## Blocos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /blocos | Lista de dados sobre os blocos partidários |
| GET | /blocos/{id} | Informações sobre um bloco partidário |
| GET | /blocos/{id}/partidos | Lista de partidos do bloco |

## Frentes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /frentes | Lista de frentes parlamentares |
| GET | /frentes/{id} | Informações detalhadas sobre uma frente parlamentar |
| GET | /frentes/{id}/membros | Os deputados que participam de uma frente |

## Grupos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /grupos | Grupos de cooperação entre parlamentares brasileiros e de outros países |
| GET | /grupos/{id} | Informações detalhadas sobre um grupo interparlamentar |
| GET | /grupos/{id}/historico | As variações de estado do grupo ao longo do tempo |
| GET | /grupos/{id}/membros | Lista de parlamentares integrantes de um grupo |

## Eventos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /eventos | Lista de eventos ocorridos ou previstos |
| GET | /eventos/{id} | Informações detalhadas sobre um evento |
| GET | /eventos/{id}/deputados | Os deputados participantes de um evento |
| GET | /eventos/{id}/orgaos | Lista de órgãos organizadores do evento |
| GET | /eventos/{id}/pauta | Lista de proposições que serão avaliadas em evento |
| GET | /eventos/{id}/votacoes | Votações sobre um evento |
| GET | /referencias/eventos/codSituacaoEvento | Possíveis situações para eventos |
| GET | /referencias/eventos/codTipoEvento | Tipos de eventos realizados |

## Referências

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /referencias/deputados | Valores válidos para parâmetros do endpoint /deputados |
| GET | /referencias/deputados/codSituacao | Possíveis situações de exercício parlamentar |
| GET | /referencias/deputados/codTipoProfissao | Códigos e títulos de atividades profissionais |
| GET | /referencias/deputados/siglaUF | Siglas e nomes dos estados e DF |
| GET | /referencias/deputados/tipoDespesa | Tipos de despesas da Cota Parlamentar |
| GET | /referencias/eventos | Valores válidos para /eventos |
| GET | /referencias/eventos/codSituacaoEvento | Possíveis situações para eventos |
| GET | /referencias/eventos/codTipoEvento | Tipos de eventos realizados |
| GET | /referencias/orgaos | Valores válidos para parâmetros de órgãos |
| GET | /referencias/orgaos/codSituacao | Situações em que órgãos podem se encontrar |
| GET | /referencias/orgaos/codTipoOrgao | Tipos de órgãos que existem |
| GET | /referencias/proposicoes | Valores válidos para parâmetros de proposições |
| GET | /referencias/proposicoes/codSituacao | Estados de tramitação de proposição |
| GET | /referencias/proposicoes/codTema | Tipos de temas existentes |
| GET | /referencias/proposicoes/codTipoAutor | Entidades que podem ser autoras |
| GET | /referencias/proposicoes/codTipoTramitacao | Tipos de tramitação existentes |
| GET | /referencias/proposicoes/siglaTipo | Tipos de proposições existentes |
| GET | /referencias/situacoesDeputado | Situações de exercício parlamentar |
| GET | /referencias/situacoesEvento | Situações para eventos |
| GET | /referencias/situacoesOrgao | Situações para órgãos |
| GET | /referencias/situacoesProposicao | Estados de tramitação de proposição |
| GET | /referencias/tiposAutor | Entidades que podem ser autoras |
| GET | /referencias/tiposEvento | Tipos de eventos realizados |
| GET | /referencias/tiposOrgao | Tipos de órgãos existentes |
| GET | /referencias/tiposProposicao | Tipos de proposições existentes |
| GET | /referencias/tiposTramitacao | Tipos de tramitação existentes |
| GET | /referencias/uf | Siglas e nomes dos estados e DF |

## Lideres

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /legislaturas/{id}/lideres | Líderes, vice-líderes e representantes |
| GET | /partidos/{id}/lideres | Líderes e vice-líderes de um partido |

---

**Base URL:** `https://dadosabertos.camara.leg.br/api/v2`

**Note:** This documentation was saved from the API reference. The .env file should only contain environment variables (like DATABASE_URL, API keys, etc.). This reference file is for development reference.