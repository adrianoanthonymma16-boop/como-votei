# Phase 1: Schema e Contratos de Despesas - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-09
**Phase:** 1-Schema e Contratos de Despesas
**Areas discussed:** Campos do schema, Chave natural e namespacing, Categorias entre casas, Contratos puros (name-match + dinheiro/datas)
**Mode:** `--auto` (seleção e escolhas automáticas — recommended default em cada decisão; sem prompts ao usuário)

---

## Campos do schema

| Option | Description | Selected |
|--------|-------------|----------|
| Colunas mostradas pela UI + audit | data, categoria, fornecedor, cpfCnpj, documento, valores, urlDocumento, casa, nomeParlamentarRaw, importedAt; DROP `detalhamento` (~dezenas de MB não exibidas) | ✓ |
| Schema completo da fonte | guarda todos os campos, incluindo `detalhamento` — risco contra o write-block de 0.5 GB do Neon | |
| Só agregado ano×categoria | rejeitado pelo usuário na fase de init (comprovante exigido → granularidade A) | |

**User's choice:** [auto] Option 1 (recommended default — alinhado à decisão "A enxuta" do PROJECT.md e ao orçamento free tier)
**Notes:** Compute-on-read reafirmado (D-02) — sem agregados pré-computados

---

## Chave natural e namespacing

| Option | Description | Selected |
|--------|-------------|----------|
| `idDocumento`/`id` namespaced + gate de colisão zero | `CAMARA:{idDocumento}` / `SENADO:{id}` com `@@unique`; fixture real de 1 ano antes do freeze; fallback `@@unique([casa, idExterno])` se colidir | ✓ |
| `numDocumento` composto (número+ano+mes) | NÃO único — original + estorno compartilham o número (PITFALLS #3) | |
| Sem gate de fixture | congelar direto da documentação — o spec oficial avisa que o bulk não segue convenções do portal | |

**User's choice:** [auto] Option 1 (recommended default)
**Notes:** `importedAt` escolhido sobre `updatedAt` de UI; marca suporte à reconciliação futura

---

## Categorias entre casas

| Option | Description | Selected |
|--------|-------------|----------|
| Label original da fonte (string livre) | fiel à fonte, sem enum unificado, UI agrupa por label vinda da rota | ✓ |
| Enum normalizado unificado | mapeia 19 categorias CEAP + ~30 CEAPS num conjunto comum — tabela de tradução a manter, risco de distorção | |
| Enum por casa (2 enums) | intermédio, mas cria contratos sem ganho de produto na UI | |

**User's choice:** [auto] Option 1 (recommended default — FEATURES.md registrou que concorrentes exibem `Tipo = N/A` justamente por normalização mal feita)
**Notes:** Aberto como research flag no SUMMARY.md; decisão registrada aqui resolve para label original

---

## Contratos puros (name-match + dinheiro/datas)

| Option | Description | Selected |
|--------|-------------|----------|
| Match exato nome+UF, partido só desempate, ambiguidade→null | função pura testável; nunca fuzzy; fixtures reais (partido divergente, acentos, caixa, homônimos) | ✓ |
| Fuzzy match com threshold | aumenta taxa de match mas aceita falso positivo — atribuir gasto a deputado errado é o pior bug possível (Core Value = verificabilidade) | |
| Match exigindo partido obrigatório | troca de partido no meio do mandato gera falso negativo silencioso (totais curtos) | |

**User's choice:** [auto] Option 1 (recommended default — regra "nunca inventar match" do PROJECT.md)
**Notes:** `parseBRL` defensivo + datas signed (estornos) decididos junto; sem `parseFloat` de locale externo

---

## the agent's Discretion

- Local da constante `ANOS_JANELA` (compartilhada scripts/lib) — planner decide
- Tamanho de batch do upsert (500–1000) — planner parametriza

## Deferred Ideas

None — discussão manteve escopo da fase (ingestão/rota/UI = fases 2–4)
