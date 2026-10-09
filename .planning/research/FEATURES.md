# Feature Research — Despesas Parlamentares (Cota/CEAPS)

**Domain:** Transparência legislativa — visualização de gastos por parlamentar (feature "Gastos" no perfil)
**Researched:** 2026-10-09
**Confidence:** MEDIUM-HIGH
*(Fontes oficiais Câmara/Senado = HIGH; comparáveis terceiros = MEDIUM; guias de UX de dashboards = MEDIUM)*

## Feature Landscape

### Contexto competitivo (o que já existe)

| Produto | Escopo | O que entrega |
|---------|--------|---------------|
| **camara.leg.br/transparencia/gastos-parlamentares** (oficial) | Só Câmara | Filtros legislatura/ano/mês/Deputado-UF-Partido; "Quanto da cota foi gasto?" (barras por mês); "Em que tipo de despesa" (Tipo \| Valor \| %, top-5 + Outros); resumo total; tabela comparativa paginada com breakdown por categoria; botão "Baixe dados"; seções paralelas de Verba de Gabinete/Moradia/Remuneração/Viagens |
| **camara.leg.br/cota-parlamentar** (oficial) | Só Câmara | 3 níveis: **Agregada → Sumarizada** (deputado × mês × tipo) **→ Analítica** (documento a documento). Filtros: período, tipo de despesa, fornecedor, CNPJ, nº documento, hóspede, passageiro, UF. Página de detalhe do documento com todos os campos + valores (Despesa, Deduções, Glosas, Restituições, Reembolso) |
| **camara.leg.br/deputados/{id}** (oficial) | Perfil | Card "Gastos e recursos {ano}": Gasto vs Não utilizado (%), tabela mensal, link "Detalhamento →" |
| **comovotou.org** ⚠️ *concorrente mais próximo* | Só Câmara | `/gastos`: filtros ano/mês/tipo, totais, distribuição por UF/partido, top-5 maiores e menores gastos, gráfico por categoria, gráfico mensal, ranking paginado. `/deputado/{slug}/gastos`: total anual + média mensal, **comparação % vs partido/UF/Câmara**, gráficos categoria e mensal, **Principais Fornecedores (top-10)**, tabela de documentos `Data \| Tipo \| Fornecedor \| Valor \| Ver→PDF` com estado "Não disponível", 20/pág |
| **transparenciapolitica.app/senadores/{id}** | Senado | Total Gasto (CEAP), nº de registros, "Evolução Mensal" + "Por Tipo", tabela detalhada `Data \| Tipo \| Fornecedor \| Valor`, atribuição de fonte por dataset. *(Problema visível: `Tipo = N/A` em muitas linhas — falha de qualidade de dado)* |
| **gastoparlamentar.com.br** | Só Câmara | Combina Cota + Verba de Gabinete + Salário como "custo do mandato"; filtros por deputado, tipo de despesa e fornecedor |

> **Nota sobre os exemplos do briefing:** *Congresso em Foco* é veículo jornalístico (cobertura de doações de campanha) e *Quem Patrocina* trata de financiamento político — **nenhum dos dois é tracker de cota parlamentar**. Os comparáveis reais são `comovotou.org`, `transparenciapolitica.app` e os portais oficiais.

---

### Table Stakes (Users Expect These)

Sem isso o usuário acha que a feature está quebrada e volta pro portal oficial.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Total anual de gastos** do parlamentar no ano selecionado | É a primeira pergunta ("quanto gastou?"). Todo comparável abre com um número grande | **LOW** | `groupBy` em Prisma sobre documentos do ano; já existe padrão no dashboard |
| **Seletor de ano** (reutiliza o filtro anual das demais tabs) | Consistência com Votações/Discursos/Proposições/Presença — quebra de padrão = sensação de feature "colada" | **LOW** | Reaproveitar o componente de ano já usado nas tabs; anos derivados dos dados (janela de 3 anos) |
| **Breakdown por categoria com valor + percentual** (barras) | É o "Em que tipo de despesa a cota foi gasto?" do portal oficial — sem isso não se responde "gastou com o quê?" | **LOW–MED** | Agregar no cliente a partir dos documentos do ano; agrupar categorias raras em "Outros" (>6–8 fatias é anti-pattern); **mostrar também a tabela por trás da barra** (acessibilidade, guia UK Gov Analysis Function) |
| **Lista de documentos: data, categoria, fornecedor, valor** | O coração da prestação de contas — o portal oficial e todos os comparáveis têm essa tabela | **MEDIUM** | Paginação (20/pág, mesmo `parsePaginacao` das demais rotas); skeleton + estado de erro padrão da casa |
| **Link do comprovante oficial (`urlDocumento` → PDF)** + **estado "Não disponível"** | Sem comprovante clicável não há verificabilidade — é o Core Value do produto. E o dado **não existe** para todo documento (ex.: passagens SIGEPA), então o estado ausente é obrigatório, não opcional | **LOW** | `comovotou.org` já ensina o padrão: célula "Ver →" ou texto "Não disponível". Abrir em nova aba + `rel="noopener"` |
| **Link para o dado oficial da fonte** (linha/página de origem na Câmara ou Senado) | Trilha de auditoria: se o PDF sumir, o usuário ainda tem onde conferir. É o que separa agregador de blog | **LOW** | Rodapé com fonte + link por documento (página analítica da Câmara / portal CEAPS) |
| **Rota `GET /api/parlamentares/[id]/despesas?ano=&pagina=`** | A UI consome API própria (padrão de todas as tabs); sem ela a tab não existe | **LOW** | Zod + `force-dynamic` + envelope de paginação — copiar o molde de `/votacoes` |
| **Sync das duas casas com upsert idempotente** | Sem dados não há feature; e falha silenciosa de sync = "0 gastos" enganoso (bug já vivido em Votações, commits `660f01f`) | **HIGH** | Bulk da Câmara (225 MB JSON/ano) + API CEAPS; match por nome (Câmara) e `codSenador` (Senado); log de unmatched; retomável |
| **Retenção de 3 anos (limpeza no sync)** | Não é visível ao usuário, mas é pré-requisito de sobrevivência no free tier (Neon 0.5 GB; +160 MB estimados) | **MEDIUM** | Janela idêntica ao recorte do produto — coerência de produto + orçamento |
| **Nota de limitações do dado junto do dado** | GAO/USAspending: usuários não encontram as ressalvas e tiram conclusões erradas (ex.: "não gastei nada" × "documento ainda no prazo de 90 dias") | **LOW** | Texto curto: competência declarada × data da despesa, atraso de publicação, "sem comprovante publicado" ≠ "gasto irregular" |
| **Estados de loading/vazio/erro** | Produto já tem padrão; tab sem eles parece quebrada | **LOW** | Skeleton, mensagem "Sem despesas registradas neste ano", `catch → "Erro ao carregar"` |

---

### Differentiators (Competitive Advantage)

Onde o "Como Votei" ganha do portal oficial e dos concorrentes.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Despesas integradas ao perfil, ao lado de Votações/Discursos/Presença** | Ninguém no mercado cruza **quanto gastou** com **como votou** no mesmo perfil. O portal oficial só tem gastos; `comovotou` só tem gastos. É a tese do produto | **LOW** (UI) / **MED** (dados) | Basta a tab "Gastos" existir no shell de tabs já pronto — o diferencial é o contexto, não a complexidade |
| **Câmara + Senado normalizadas num mesmo modelo** | `comovotou` é só Câmara; `transparenciapolitica` é Senado com `Tipo = N/A`. Nossas duas casas no mesmo esquema, com labels de categoria consistentes = comparação legível entre casas | **MEDIUM** | Camada de adaptação obrigatória (mesma exigência dos demais módulos). Cuidado: categorias CEAP ≠ CEAPS |
| **Comprovante clicável por documento na própria lista** | O portal oficial enterra o comprovante em 3 cliques de navegação (Agregada→Sumarizada→Analítica→Documento). Nós põe o PDF a 1 clique da linha | **LOW** | Já coberto por GAST-03; é diferencial *em relação ao oficial*, não a `comovotou` |
| **Estado honesto "Não disponível"** para comprovante ausente | `transparenciapolitica` mostra `Tipo = N/A` sem explicar; ninguém diz "esse documento não tem PDF publicado". Transparência sobre a própria lacuna = confiança | **LOW** | Pareado com a nota de limitações |
| **Top fornecedores do parlamentar no ano** | É onde aparecem os achados jornalísticos ("R$ 72 mil para uma pessoa física"). Barato de calcular (agrupa por fornecedor) e muito citado por usuários | **MEDIUM** | Top 10 com total por fornecedor; agrupar por nome normalizado; **não** expor CNPJ como coluna principal (ruído) — manter no detalhe |
| **Evolução mensal (12 barras)** | Responde "foi uniforme ou teve pico em dezembro?" — presente no portal oficial e em todos os comparáveis | **LOW** | Já agrega por mês a partir dos documentos; sem eixo Y duplo, sem 30 linhas |
| **Filtro por categoria/tipo de despesa na lista** | Quer só "Divulgação da atividade parlamentar"? É o filtro mais usado do portal analítico | **LOW–MED** | Dropdown populado a partir das categorias presentes no ano do parlamentar |
| **Download dos dados exibidos (CSV)** | Padrão do portal oficial ("Baixe dados") e exigência de pesquisadores/jornalistas | **MEDIUM** | **Deferir para v1.x** — não está em GAST-01..06; gerar CSV de 200k linhas em serverless free é armadilha |

---

### Anti-Features (deliberately NOT build)

Alinhados com **PROJECT.md → Out of Scope** e com anti-patterns observados.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Ranking / comparação de gastos entre parlamentares** (maiores, menores, "% vs média do partido/UF") | `comovotou` faz, dá clique, parece "jornalístico" | **PROJECT.md já coloca em Out of Scope**: estatística derivada, futura. Exige agregados pré-computados por partidos/UFs e vira disputa metodológica ("média de quem?") | Manter o recorte **por parlamentar**. Se um dia for fazer, virar milestone próprio com ADR de metodologia |
| **Agregados pré-computados (ano × categoria)** | "A UI fica mais rápida" | **PROJECT.md já coloca em Out of Scope**: a UI agrega a partir dos documentos. Tabela extra = escrita dupla no sync, risco de divergência, +espaço no Neon | `groupBy` na query ou agregação no cliente; só se profiling provar lentidão, aí um índice resolve |
| **Espelhar/baixar os PDFs de comprovante** | Medo de link rot (real: ~81% de URIs em corpus acadêmico sofrem rot) | Dezenas de GB contra 500 MB de Neon; responsabilidade de preservação e acessibilidade de PDF de terceiros; PII de fornecedores pessoas físicas sob nossa custódia | Guardar **metadados + `urlDocumento` + link da fonte oficial + data de captura**. Estado "Não disponível" quando a fonte não publica. Se o link morrer, a trilha oficial ainda existe |
| **Verba de gabinete, salário, diárias, passagens fora da cota, imóveis funcionais** | "Custo total do mandato" (`gastoparlamentar.com.br` faz) | **PROJECT.md já coloca em Out of Scope**: fontes diferentes, escopo é a cota CEAP/CEAPS. Misturar quebra a coerência do recorte e doçobra o sync | Limitar a CEAP/CEAPS; se algum dia for "custo do mandato", milestone separado |
| **Filtros avançados do portal analítico** (hóspede, passageiro, CNPJ, nº de documento, UF) | Paridade com o portal oficial | Superfície de UI enorme, uso residencial, e alguns campos (hóspede/passageiro) **não vêm no bulk** — prometeria filtro que não filtra | Filtros de v1: **ano** (+ opcionalmente categoria). O resto é backlog |
| **Download/exportação CSV em tempo real na API** | "Jornalistas querem" | Gerar CSV de ~200k linhas numa lambda free tier = timeout e cold start; é feature de infra, não de UI | Deferir; quando vier, exportar via job, não na request |
| **Sumarização LLM de despesas / "descrição inteligente" dos documentos** | Parece inovador | **PROJECT.md Out of Scope**: custo, e o PDF oficial já é a fonte | Link para o comprovante — o documento é a descrição |
| **Dashboard analítico avançado / app mobile / API pública para terceiros** | Ambição de produto | **PROJECT.md Out of Scope / backlog v1** | Não tocar neste milestone |
| **Gauges, velocímetros, painéis de 8 KPIs, mapa de calor** | "Bonito" | Anti-pattern documentado (GovEx, Northeastern): ruído visual, usuário não sabe onde olhar, e torna o dado ilegível em leitor de tela | Um número grande (total) + uma barra de categorias + a tabela. Pronto |
| **Gráfico de pizza com 19 categorias CEAP** | "Visual" | 19 fatias é ilegível; portal oficial já reduz a top-5 + Outros | Barras horizontais ordenadas, top 6 + "Outros", com tabela equivalente ao lado/abaixo |
| **Mostrar "gasto zero" como se fosse falta de informação** | Simplicidade | Confunde "não gastou" com "documento ainda no prazo de 90 dias" com "sync não rodou" — já foi fonte de bug em Votações | Distinguir os três estados explicitamente (nota de limitações) |

---

## Feature Dependencies

```
[GAST-04 Sync Câmara bulk + Senado CEAPS, 3 anos, upsert idempotente]
    │ (escreve documentos com urlDocumento + regra de retenção)
    ├──requires──> [GAST-05 Retenção/janela de 3 anos]   (mesma fase de sync)
    │
    └──requires──> [Schema Prisma Despesa + camada de adaptação Câmara/Senado]
                        │
                        └──requires──> [GAST-06 API GET /despesas (ano, paginação)]
                                            │
                                            ├──requires──> [GAST-01 Total anual + barras por categoria + seletor de ano]
                                            ├──requires──> [GAST-02 Lista paginada de documentos]
                                            │        └──requires──> [GAST-03 Link comprovante (urlDocumento) + link fonte + "Não disponível"]
                                            └──requires──> [Tab "Gastos" no shell de tabs do perfil]

[Nota de limitações do dado] ──enhances──> [GAST-01, GAST-02, GAST-03]
[Estados skeleton/erro/vazio] ──enhances──> [GAST-01, GAST-02]

[Evolução mensal] ──enhances──> [GAST-01]   (mesmo aggregate, custo marginal ~0)
[Top fornecedores] ──enhances──> [GAST-02]  (mesmos rows, agrupamento no cliente)

[Ranking entre parlamentares] ──conflicts──> [GAST-01..06]   (Out of Scope — não misturar neste milestone)
[Agregados pré-computados]    ──conflicts──> [GAST-01]       (Out of Scope — agregação sob demanda)
[Espelhar PDFs]               ──conflicts──> [GAST-03]       (orçamento: 500 MB Neon)
```

### Dependency Notes

- **GAST-06 requires GAST-04:** sem linhas no banco, a rota devolve 200 vazio — que é exatamente o bug de percepção ("0 votos") já corrigido em `660f01f`. A rota só tem sentido com dados sincronizados.
- **GAST-01 and GAST-02 both require GAST-06:** os dois blocos da tab leem o mesmo endpoint; total e lista devem vir do **mesmo** snapshot de dados (senão a soma das linhas ≠ total exibido).
- **GAST-03 requires GAST-02:** o comprovante é renderizado **por linha**; a coluna só existe porque a granularidade é documento-a-documento (Key Decision "A enxuta"). Se a granularidade fosse agregada, GAST-03 seria impossível.
- **GAST-05 must ship in the same phase as GAST-04:** retenção aplicada depois da primeira carga vira migração destrutiva; é mais barato ligar a limpeza desde o primeiro sync.
- **Evolução mensal não é dependência nova:** é o mesmo `groupBy` de GAST-01 com chave adicional (mês) — custo marginal ~0, então pode entrar junto sem virar requisito separado.
- **Conflict:** qualquer coisa de ranking/comparação entre parlamentares deve ser **rejeitada neste milestone** — não é "mais um bloco na tab", é mudança de escopo documentada em Out of Scope.

---

## MVP Definition

### Launch With (v1) — mapeia 1:1 para GAST-01..06

- [ ] **GAST-04 + GAST-05** — sync das duas casas (bulk Câmara + CEAPS Senado) com upsert idempotente e limpeza da janela de 3 anos — *sem dados, nada existe*
- [ ] **GAST-06** — `GET /api/parlamentares/[id]/despesas` com filtro de ano e paginação no padrão das demais rotas — *contrato da tab*
- [ ] **GAST-01** — total anual + barras de categoria + seletor de ano na aba "Gastos" — *responde "quanto/gastou com o quê"*
- [ ] **GAST-02** — lista paginada de documentos (data, categoria, fornecedor, valor) — *prestação de contas*
- [ ] **GAST-03** — link do comprovante (`urlDocumento`) + link da fonte oficial por documento — *verificabilidade = Core Value*
- [ ] **Estado "Não disponível"** + **nota de limitações do dado** — *barato e separa de "gasto zero"*

### Add After Validation (v1.x)

- [ ] **Evolução mensal (12 barras)** — trigger: total e categorias já estarem estáveis; custo marginal ~0
- [ ] **Top fornecedores do ano** — trigger: usuários perguntarem "quem recebeu"; agrupamento por nome normalizado
- [ ] **Filtro por categoria na lista** — trigger: lista do parlamentar passar de ~100 docs/ano (já acontece)
- [ ] **Download CSV** — trigger: pedido real de jornalista/pesquisador; implementar como job, não na request

### Future Consideration (v2+)

- [ ] **Ranking/comparação entre parlamentares** — *só com ADR de metodologia; sai de Out of Scope por decisão explícita*
- [ ] **Custo total do mandato (cota + gabinete + salário)** — *fontes diferentes, milestone próprio*
- [ ] **Filtros analíticos avançados (CNPJ, nº documento, hóspede/passageiro)** — *se e quando o bulk trouxer os campos*
- [ ] **API pública de despesas** — *backlog v1 do ROADMAP*

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Sync Câmara bulk + Senado CEAPS (GAST-04) | HIGH | HIGH | **P1** |
| Retenção de 3 anos (GAST-05) | MEDIUM | MEDIUM | **P1** *(bloqueia orçamento)* |
| Rota `/despesas` (GAST-06) | HIGH | LOW | **P1** |
| Total anual + barras por categoria + ano (GAST-01) | HIGH | LOW-MED | **P1** |
| Lista de documentos paginada (GAST-02) | HIGH | MEDIUM | **P1** |
| Link comprovante + link fonte (GAST-03) | HIGH | LOW | **P1** |
| Estado "Não disponível" + nota de limitações | HIGH | LOW | **P1** |
| Evolução mensal | MEDIUM | LOW | **P2** |
| Filtro por categoria | MEDIUM | LOW-MED | **P2** |
| Top fornecedores | MEDIUM | MEDIUM | **P2** |
| Download CSV | MEDIUM | MEDIUM-HIGH | **P3** |
| Ranking entre parlamentares | HIGH | HIGH | **P3** *(fora de escopo hoje)* |

**Priority key:**
- **P1:** must have for launch (=GAST-01..06 + os estados honestos)
- **P2:** should have, add when possible (custo marginal baixo, mesmo aggregate)
- **P3:** nice to have / futuro (ou explicitamente fora de escopo)

---

## Competitor Feature Analysis

| Feature | Portal oficial (Câmara) | comovotou.org | transparenciapolitica.app | **Nossa abordagem** |
|---------|------------------------|---------------|---------------------------|---------------------|
| Total anual por parlamentar | ✅ (card "Gastos e recursos") | ✅ | ✅ | ✅ **P1** — GAST-01 |
| Breakdown por categoria (valor + %) | ✅ top-5 + Outros | ✅ gráfico | ✅ "Por Tipo" | ✅ **P1** — barras **com tabela por trás** |
| Lista de documentos (data/tipo/fornecedor/valor) | ✅ nível Analítica, 3 cliques | ✅ 1 clique, 20/pág | ✅ mas `Tipo = N/A` | ✅ **P1** — GAST-02, 1 clique do perfil |
| Link do comprovante PDF | ✅ (embutido na página de documento) | ✅ "Ver" + "Não disponível" | ❌ não mostra | ✅ **P1** — GAST-03, 1 clique da linha |
| Link da fonte oficial por linha | ✅ é a fonte | ⚠️ só crédito no rodapé | ✅ atribuição por dataset | ✅ **P1** — por documento **e** rodapé |
| Filtro por ano | ✅ | ✅ | ✅ | ✅ **P1** — reutiliza filtro das tabs |
| Filtro por mês | ✅ | ✅ | ❌ | ⏸️ **P2** |
| Filtro por categoria | ✅ | ✅ | ❌ | ⏸️ **P2** |
| Evolução mensal | ✅ | ✅ | ✅ | ⏸️ **P2** (custo ~0) |
| Câmara **e** Senado no mesmo produto | ❌ (só Câmara) | ❌ (só Câmara) | ⚠️ Senado com dados faltantes | ✅ **diferencial** — normalização única |
| Gastos + votações + discursos no mesmo perfil | ❌ | ❌ | ❌ | ✅ **diferencial central** |
| Top fornecedores | ❌ | ✅ top-10 | ❌ | ⏸️ **P2** |
| Comparação % vs partido/UF | ✅ tabela comparativa | ✅ | ❌ | ❌ **não** (conflito com Out of Scope) |
| Ranking de maiores/menores gastos | ✅ | ✅ | ❌ | ❌ **não** (Out of Scope) |
| Download de dados | ✅ "Baixe dados" | ❌ | ❌ | ⏸️ **P3** |
| Custo total do mandato (cota+gabinete+salário) | ✅ (separado) | ❌ | ❌ | ❌ **não** (Out of Scope) |
| Nota de limitações do dado | ⚠️ textos espalhados | ⚠️ genérica | ✅ fonte por dataset | ✅ **P1** — junto do dado |
| Estado honesto p/ dado ausente | ⚠️ "Ainda não há dados" | ✅ "Não disponível" | ❌ `N/A` sem explicar | ✅ **P1** |

---

## Sources

- **Fontes oficiais (HIGH):**
  - Portal da Câmara — Gastos dos deputados federais: https://www.camara.leg.br/transparencia/gastos-parlamentares
  - Portal Cota Parlamentar (Agregada/Sumarizada/Analítica + detalhe de documento): https://www.camara.leg.br/cota-parlamentar
  - Perfil de deputado — card "Gastos e recursos": https://www.camara.leg.br/deputados/178897
  - Dados Abertos — bulk `cotas/Ano-{ano}.json.zip` e dicionário de campos: https://dadosabertos.camara.leg.br/swagger/api.html (staticfile)
  - Ato da Mesa nº 43/2009 (categorias e limites da CEAP): https://www2.camara.leg.br/legin/int/atomes/...
  - Guia da Cota Parlamentar (90 dias p/ comprovante, 3 meses p/ reembolso): https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/cota-parlamentar
  - API Dados Abertos Administrativos do Senado (CEAPS, JSON/CSV, sem chave): https://adm.senado.gov.br/adm-dadosabertos/v3/api-docs
  - Senado — Transparência / Dados Abertos CEAPS: https://www12.senado.leg.br/transparencia/sen/senadores
- **Comparáveis terceiros (MEDIUM):**
  - https://www.comovotou.org/gastos e https://www.comovotou.org/deputado/robinson-faria/gastos *(concorrente mais próximo, inspecionado em 2026-10-09)*
  - https://transparenciapolitica.app/senadores/581
  - https://gastoparlamentar.com.br/
- **Guia de UX/visualização de dashboards públicos (MEDIUM):**
  - GAO-22-104127 — USAspending.gov: divulgar limitações dos dados junto dos dados, personas de usuário
  - UK Government Analysis Function — testing dashboards for design and accessibility (tabela por trás do gráfico, evitar scroll horizontal, paginar tabelas)
  - GovEx (Johns Hopkins) — 4 Tips to a Clear and Friendly Dashboard (simplicidade, poucos gráficos, rótulos precisos)
- **Link rot / espelhamento de PDFs (MEDIUM):**
  - Open Preservation Foundation — link rot (~81% de URIs com algum grau de rot em corpus scholarly) e estratégias de auditoria de links
  - Digital.gov — Reduce, remove, remediate: PDFs and government websites

---
*Feature research for: despesas parlamentares (CEAP/CEAPS) — feature "Gastos" do perfil*
*Researched: 2026-10-09*
