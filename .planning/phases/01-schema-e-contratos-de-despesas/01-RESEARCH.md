# Phase 1: Schema e Contratos de Despesas - Research

**Researched:** 2026-10-09
**Domain:** Prisma schema design, natural-key derivation for legislative expense records, money/date conversion contracts, legislator name-matching
**Confidence:** HIGH (schema/key/data findings are first-hand probes on full-year official fixtures; two CONTEXT decisions are contradicted by evidence and flagged for confirmation)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Campos do schema (orçamento de storage)
- **D-01:** Guardar somente colunas mostradas pela UI + audit: `idExterno` (namespaced), `parlamentarId`, `ano`, `mes`, `data`, `categoria` (label original da fonte), `fornecedor`, `cpfCnpj`, `documento` (número/tipo), `valor` (`Decimal(14,2)`, signed), `valorGlosa?`, `urlDocumento?`, `casa`, `nomeParlamentarRaw` (audit do match), `importedAt`. **DROP `detalhamento`** (texto livre Senado ~1 KB × ~71k linhas, não mostrado na UI) e qualquer coluna sem consumo previsto — Neon free é 0.5 GB com write-block. — **Reversibility:** costly — adicionar coluna depois exige re-import dos ~670k documentos pra popular; remover depois exige migration + perda de dado
- **D-02:** Sem colunas agregadas nem tabela de resumo — compute-on-read (decisão de produto já travada no PROJECT.md)

#### Chave natural e namespacing
- **D-03:** Chave = `idDocumento` da Câmara e `id` do Senado, guardada como `idExterno` **namespaced** (`CAMARA:7877589` / `SENADO:12345`) com `@@unique` global. **Gate obrigatório antes do freeze da migração:** teste de colisão zero numa fixture real de 1 ano da Câmara (o spec oficial avisa que o bulk não segue convenções do portal; `numDocumento` sozinho NÃO é único — original + estorno compartilham); se colidir, cair para `@@unique([casa, idExterno])`. — **Reversibility:** one-way — trocar a chave depois exige re-import, reescrita de índices e reprocessamento da retenção
- **D-04:** `importedAt` (não `updatedAt` de UI) marca a última escrita — suporte à retenção/reconciliação futura

#### Categorias entre casas
- **D-05:** Manter o **label original da fonte** (Câmara `descricao`/subcota, Senado `tipoDespesa`) como string livre — **sem enum unificado e sem tabela de mapeamento**. Cada parlamentar pertence a uma casa só, então a UI agrupa por label vindo da rota; fiel à fonte, zero perda, zero distorção de tradução. — **Reversibility:** costly — normalizar depois exige migration de dados sobre 670k linhas

#### Contratos puros (testáveis sem DB)
- **D-06:** `src/lib/sync/camara-name-match.ts` — função pura: normaliza nome (minúsculas, sem acentos, espaços colapsados), **bloqueia por nome + UF**, partido é apenas desempate (nunca predicado obrigatório — troca de partido no meio do mandato é rotina), **match exato (nunca fuzzy/Levenshtein)**, **ambiguidade → `null`** (nunca inventa correspondência). Retorna `{ parlamentarId, metodo } | null`. Testes com fixtures reais: partido divergente, acentos, caixa, homônimos. — **Reversibility:** reversible
- **D-07:** `parseBRL` defensivo em `src/lib/` — aceita string `"1.234,56"` e number da API, **nunca `parseFloat` de locale externo**, devolve string pronta pro `new Prisma.Decimal(...)`; valores **signed** (estornos negativos preservados). Helper de datas: ISO da Câmara / formato Senado → `Date`, com teste. — **Reversibility:** reversible
- **D-08:** `DespesaNormalizada` em `src/lib/sync/types.ts` segue o padrão existente (plain interface + unions espelhando enums Prisma); adapters continuam **DB-free** (invariante do codebase)

### the agent's Discretion
- Local exato das constantes compartilhadas (`ANOS_JANELA`) entre `scripts/` e `src/lib/` — planner decide seguindo o padrão de constantes exportadas do módulo que as possui
- Tamanho de batch do upsert (500–1000, todos seguros sob o cap de 65.535 params) — planner pode parametrizar

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope (captura automática em modo --auto; ingestão, rota e UI pertencem às fases 2–4)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QA-01 | "Toda fase passa `npx tsc --noEmit && npx next lint && npx jest && npx next build` antes de commit/push" [VERIFIED: .planning/REQUIREMENTS.md:25] | Validation Architecture (commands, sampling), Environment Availability (toolchain verified working), migration pitfalls (`migrate deploy || true` masks failure) |
| QA-02 | "Lógica de conversão de dinheiro (`parseBRL`), name-match e agregação tem cobertura de teste unitário (Jest); valores monetários usam `Decimal(14,2)`, nunca float/`parseFloat`" [VERIFIED: .planning/REQUIREMENTS.md:26] | Money-format probe (real fixture formats both houses), name-match empirical stats (3 years, 556k rows), test file inventory + fixture asset `01-fixtures-fonte.json`, Prisma Decimal guidance [CITED: prisma.io] |
| (enables) GAST-04 | Bulk Câmara + API CEAPS sync, 3 years, idempotent upsert [VERIFIED: .planning/REQUIREMENTS.md:18] | Key design decision (S6 recommendation + evidence), source format contracts, `importedAt` reconcile basis (D-04) |
| (enables) GAST-06 | `GET /api/parlamentares/[id]/despesas` route contract [VERIFIED: .planning/REQUIREMENTS.md:13] | Schema indexes mandated by ROADMAP success criterion 1 (roadmap:32) |
| (enables) GAST-08 | Fail-loud ingestion + exact name match, never invents [VERIFIED: .planning/REQUIREMENTS.md:20] | Name-match contract recommendation (id-first amendment flagged), fixture evidence of unmatched classes (leader rows, title-prefix names) |

Roadmap success criteria this research directly feeds [VERIFIED: .planning/ROADMAP.md:31-35]:
1. Migration with `Decimal(14,2)`, namespaced `@@unique` + indexes `(parlamentarId, ano, data)` / `(casa, ano)` — schema pattern research below.
2. **Zero-collision key test on a real full-year Câmara fixture** — THIS RESEARCH RAN THE GATE (3 years, 556,044 rows): primary and fallback candidates both refuted; recommendation + fixture asset provided.
3. `parseBRL` + `camara-name-match` Jest coverage — test map + `01-fixtures-fonte.json` + format/date probes.
4. Full gate green — Environment Availability + Validation Architecture.
</phase_requirements>

## Summary

This phase freezes the data contract for parliamentary expenses before any row reaches the database. I ran the phase's mandatory research flag first-hand: downloaded the **full official bulk files for all 3 years** of the retention window (Câmara: 249/225/125 MB JSON for 2024/2025/2026 = **556,044 rows**; Senado CEAPS: 21,430/23,808/15,098 = **60,336 rows**) and stress-tested the key candidates against them. The result overturns two planning assumptions: **(a) D-03's key `CAMARA:{idDocumento}` collides massively** — 14,541/10,319/46 duplicate keys per year including 7,800+ rows with `idDocumento=0` — and the documented fallback `@@unique([casa, idExterno])` fails too, because the collisions are all within Câmara; hand-picked wide composites also break (2026 has row pairs differing only in `fornecedor`/`cnpjCPF`). The evidence-backed replacement is a **namespaced content-fingerprint key**: `idExterno = "CAMARA:{idDocumento}:{sha256(rawRecord)[0:16]}"` (zero collisions empirically in all 3 years; by-construction for distinct content), keeping `SENADO:{id}` as validated (unique in-year **and** across years). **(b) The PROJECT.md premise that the bulk "does not expose the dadosabertos id" is false** — every expense row carries `idDeputado`, which equals `Parlamentar.idExterno` for 100% of the 562 deputies in the 2025 file; name+UF matching is safe (0 misattribution in 556k rows) but silently drops 0.69% of receipts, so the recommended contract is id-first with name+UF as fallback, still returning `null` on ambiguity.

Supporting contracts were probed the same way: **money** arrives as dot-decimal strings from Câmara (regex-clean in all 556k rows, 0 pt-BR commas) and as JSON numbers from Senado (≤2 decimals) — `parseBRL` must accept both plus the pt-BR decision case and never `parseFloat`; **dates** need a nullable `data` column (empty `dataEmissao` in 10,313/8,675/2,554 rows per year), UTC-midnight normalization (Câmara ISO strings have no `Z` → local-time hazard; Senado has year-typo dates like `0202-07-04` that must parse without exploding); **Senado never emits `urlDocumento`** (0/3 years — the known Phase-4 research flag, now confirmed structurally). Migration mechanics are verified working against Neon (`prisma migrate dev --create-only` probe OK), but `package.json:7` masks `migrate deploy` failures with `|| true`. A curated 20-row fixture extract (`01-fixtures-fonte.json`) is committed alongside this research so plans 01-01/01-02/01-03 can test the collision, estorno, leader-row and date edge cases without re-downloading 600 MB.

**Primary recommendation:** plan 01-02 around the content-fingerprint key (S6, with ordinal fallback S2) and put the two decision amendments — key format vs D-03's literal example, id-first matching vs D-06/GAST-08 wording — in front of the user before the migration is frozen (both are flagged in Assumptions Log + Open Questions; the key is "one-way" per D-03's own reversibility note).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `Despesa` model + migration + indexes | Prisma/DB layer (`prisma/schema.prisma`, `prisma/migrations/`) | Prisma CLI (`migrate dev --create-only` verified against Neon) | Schema is the canonical contract; all tiers read types generated from it |
| Money/date conversion (`parseBRL`, date helper) | Pure domain layer (`src/lib/`) | — | QA-02 demands unit-testable purity; no I/O, no Prisma, callable from adapters and routes |
| Natural-key derivation (`idExterno`) | Pure sync layer (`src/lib/sync/`) | Adapter tier (`fetchDespesas` in Phase 2) | Derivation needs only the raw source record — must stay DB-free per D-08/codebase invariant |
| Name-match (`camara-name-match`) | Pure sync layer (`src/lib/sync/camara-name-match.ts`) | Persistence in `scripts/` (Phase 2 writes `parlamentarId` + `nomeParlamentarRaw`) | D-06 fixes it as a pure function; write path owns the DB call |
| `DespesaNormalizada` contract | Type layer (`src/lib/sync/types.ts`) | — | D-08: next to the existing `*Normalizado` interfaces |
| `ANOS_JANELA` constant | Shared constant module under `src/lib/` | Consumed by `scripts/` (Phase 2 loop) | CONTEXT discretion item: "padrão de constantes exportadas do módulo que as possui"; single source feeds import loop **and** retention (GAST-05) |
| Collision-gate evidence | Test tier (Jest `src/lib/__tests__/`) | Fixture asset `01-fixtures-fonte.json` | ROADMAP criterion 2; unit tests on committed extracts, full-year re-run optional script |
| Storage budget compliance | Schema design (D-01 column set) | — | Neon 0.5 GB write-block; ~616k docs × row ≈ +160 MB budget already researched |

## Standard Stack

### Core

No new packages for this phase — the contract layer is built entirely on the locked stack (Prisma + Jest + Node built-ins). Verified against npm registry 2026-10-09: `prisma` latest stable line moves fast (registry head is `8.0.0-rc.22`), but the project pins `^5.12.0` and is on Next 14 — **do not upgrade in this phase**.

| Library | Version (project) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `prisma` + `@prisma/client` | `^5.12.0` [VERIFIED: package.json:47,22] | `Despesa` model, migration, `Decimal(14,2)` money, `@@unique` | Single ORM across all 9 existing models; singleton at `src/lib/prisma.ts` |
| `jest` | `^29.7.0` [VERIFIED: package.json:43] | Unit tests for key/money/match | Locked by QA-02; 93+ existing specs |
| `ts-jest` | `^29.1.0` [VERIFIED: package.json:49] | TS transform (`preset: 'ts-jest'`) [VERIFIED: jest.config.js:4] | Existing config, zero changes needed |
| Node `crypto` (built-in) | Local runtime v22.22.1 [VERIFIED: first-hand `node --version` probe 2026-10-09]; repo baseline Node 20+ [CITED: .planning/codebase/STACK.md] | `createHash('sha256')` for content-fingerprint key | No dependency; vetted — never hand-roll a hash |
| Prisma `Decimal` (decimal.js transitively) | via `@prisma/client` | Money storage/safe arithmetic | QA-02 mandates `Decimal(14,2)`, never float |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^3.23.0` [VERIFIED: package.json:32] | Already the API query validator | Not needed in Phase 1 (no route); Phase 3 |
| `ts-node` | `^10.9.2` [VERIFIED: package.json:50] | Running optional full-year re-check scripts | Plan 01-02's optional verification script (`npm run` pattern like `sync:camara`, package.json:14-16) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma `Decimal` column | `@db.Money` native type | **Rejected** — Prisma docs explicitly advise against `money` (locale-dependent serialization) [CITED: prisma.io/docs/postgres/postgres-type-mapping#avoiding-the-money-type / prisma/docs "avoid-db-money"] |
| Prisma `Decimal` column | `Float` (existing `taxaPresenca Float` precedent, schema.prisma:215) | **Rejected** — QA-02 bans float for money; binary float rounds 0.1+0.2-style artifacts (probe: `String(0.1+0.2)` → `"0.30000000000000004"`) [VERIFIED: first-hand node probe 2026-10-09] |
| `number` math in helpers | `bignumber.js` / direct `decimal.js` | Not needed this phase — helpers only validate + stringify; arithmetic happens in Prisma/Postgres. Keep deps zero |
| Hand-rolled base64/hex hash | `node:crypto` | Never — crypto is in the standard library |
| Fuzzy match lib (Levenshtein/similarity) | — | **Banned by D-06/GAST-08** ("nunca fuzzy/Levenshtein") |

**Installation:**

```bash
# NENHUMA dependência nova nesta fase — stack já instalada (prisma, jest, ts-jest, zod)
npm ci   # apenas reproduzir o lockfile existente
```

**Version verification:** `npm view` run 2026-10-09 — `prisma` head `8.0.0-rc.22`, `jest` head `30.5.2`, `ts-jest` head `29.4.14`, `@prisma/client` head `7.10.0`; project pins (`^5.12.0`, `^29.7.0`, `^29.1.0`) resolve fine and are intentionally NOT bumped (Next 14 + 93-spec suite are calibrated to them) [VERIFIED: npm registry 2026-10-09 + package.json:22,43,47,49].

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages** (see Installation above). There is nothing to run the legitimacy gate against; if a future plan attempts to add e.g. a money-parsing library, re-run `gsd_run query package-legitimacy check` first and gate on human-verify.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
                    FONTE OFICIAL (dados abertos, sem API key)
  ┌──────────────────────────────────────┐  ┌─────────────────────────────────────┐
  │ Câmara: cotas/Ano-{ano}.json.zip      │  │ Senado: despesas_ceaps/{ano} (JSON) │
  │ ~232k/209k/114k linhas (2024/25/26)  │  │ ~21k/24k/15k linhas                 │
  └───────────────────┬──────────────────┘  └──────────────────┬──────────────────┘
                      │ registros brutos (32 keys / 13 keys)   │
                      ▼                                        ▼
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║ PHASE 1 — CONTRATOS PUROS (sem I/O, sem DB, 100% cobertos por Jest)          ║
  ║  • derivação de idExterno  "CAMARA:{idDoc}:{sha256[:16]}" / "SENADO:{id}"    ║
  ║  • parseBRL(valor)          → string Decimal segura (signed)                 ║
  ║  • parseDataFonte(data,casa) → Date (UTC-midnight) | null                    ║
  ║  • camaraNameMatch(nome,uf)  → { parlamentarId, metodo } | null              ║
  ║  • DespesaNormalizada        (src/lib/sync/types.ts)                         ║
  ╚════════════════════┬═════════════════════════════════════════════════════════╝
                       ▼
        ┌──────────────────────────────────────────┐
        │ prisma/schema.prisma — model Despesa     │
        │  valor  Decimal @db.Decimal(14,2)        │
        │  idExterno String @unique (namespaced)   │
        │  @@index([parlamentarId, ano, data])     │
        │  @@index([casa, ano])                    │
        │  migração aplicada ANTES de qualquer dado│
        └──────────────────┬───────────────────────┘
                           │  (Phase 2 — fora desta fase)
              adapters → upsert em lotes → Postgres (Neon)
```

### Recommended Project Structure

```text
prisma/
├── schema.prisma                    # + model Despesa (primeiro Decimal do schema)
└── migrations/
    └── <ts>_add_despesa/migration.sql  # criada via migrate dev --create-only
src/lib/
├── despesas.ts                      # ANOS_JANELA + helpers de conversão (parseBRL, datas) — nome do módulo é decisão do planner
├── sync/
│   ├── types.ts                     # + DespesaNormalizada (ao lado dos demais *Normalizado)
│   ├── despesa-id.ts                # derivação de idExterno (pura) — nome livre
│   └── camara-name-match.ts         # D-06 (nome fixado pelo contexto)
src/lib/__tests__/
├── fixtures/fontes.json             # extraído de .planning/phases/01-.../01-fixtures-fonte.json (ou importado direto)
├── parse-brl.test.ts                # QA-02
├── despesa-id.test.ts               # critério 2 do roadmap (colisão zero)
├── camara-name-match.test.ts        # D-06 / QA-02
└── datas-despesa.test.ts            # D-07 helper de datas
.planning/phases/01-schema-e-contratos-de-despesas/
└── 01-fixtures-fonte.json            # 20 registros reais rotulados (asset desta pesquisa)
```

### Pattern 1: Namespaced content-fingerprint natural key (RECOMMENDED — amends D-03)
**What:** `idExterno = "CAMARA:{idDocumento}:{sha256(rawRecordJSON)[0:16]}"`; Senado keeps `"SENADO:{id}"`. Global `@@unique` preserved exactly as D-03 requires.
**When to use:** the ONLY shape that passed the gate on all 3 real years (0 collisions on sha256[:12] and [:16]; note sha256[:8] collides 4× in 2025 — never truncate below 12 hex chars).
**Example:**
```ts
// Source: gate evidence in this document (3 anos reais) — ver "Common Pitfalls / P1"
import { createHash } from 'node:crypto';

export function derivarIdExternoDespesa(casa: 'CAMARA' | 'SENADO', raw: Record<string, unknown>): string {
  if (casa === 'SENADO') return `SENADO:${String(raw.id)}`;
  const fp = createHash('sha256').update(JSON.stringify(raw)).digest('hex').slice(0, 16);
  return `CAMARA:${String(raw.idDocumento)}:${fp}`;
}
```
**Why by-construction:** identical content ⇒ identical hash ⇒ same key ⇒ upsert dedupes (empirically zero such pairs in 556,044 rows); distinct content ⇒ distinct key (same document's split subcatas, estorno pairs and adjustment legs all survive as separate rows — exactly what a receipt list needs).
**Consequence to plan for:** corrections/amendments change content ⇒ new key ⇒ old row must be reconciled away — this is precisely what **D-04 `importedAt`** already exists for ("suporte à retenção/reconciliação futura") and prior research already schedules (`STACK.md`: upsert applies corrections from the daily snapshot).

**Alternative (documented, not recommended): S2 ordinal** `CAMARA:{ano}:{idDocumento}:{ordinal-dentro-do-grupo}` — convergent under amendments without reconcile and keeps byte-identical duplicate rows, but needs a second pass/buffer over the file (conflicts with Phase 2's single-pass `stream-json` design). Prefer S6.

### Pattern 2: Money contract — string in, string out, Decimal at the edge (D-07/QA-02)
**What:** `parseBRL(valor: string | number): string` validates and normalizes to a plain dot-decimal signed string that `new Prisma.Decimal(...)` accepts. Never returns `number`.
**When to use:** every write of `valor`/`valorGlosa` (Phase 2 adapters) and any display math later (Phase 3 computes in SQL/Prisma, not JS floats).
**Example:**
```ts
// Source: D-07 (.planning/phases/01-.../01-CONTEXT.md:29) + format probe (ver "Common Pitfalls / P4")
const RE_Decimal = /^-?\d{1,12}(\.\d{1,2})?$/; // 12 dígitos inteiros + 2 decimais = capacidade de Decimal(14,2)
export function parseBRL(v: unknown): string {
  if (typeof v === 'number') { /* rejeita não-finito ou >2 decimais; retorna String(v) */ }
  if (typeof v !== 'string') throw new Error('parseBRL: entrada inválida');
  // aceita "705.92" (formato real do bulk), "1.234,56" (pt-BR do enunciado), opcional "R$ "
  // normaliza para "1234.56" e valida contra RE_Decimal → senão lança
}
```

### Pattern 3: Id-first name match with name+UF fallback (RECOMMENDED — amends D-06/GAST-08 wording)
**What:** resolution order `idDeputado → Parlamentar.idExterno` (exact), fallback to normalized `nome + UF` exact match; partido only as tie-break; ambiguity/leader rows → `null`; returns `{ parlamentarId, metodo: 'idExterno' | 'nomeUf' } | null` plus the raw name is always persisted to `nomeParlamentarRaw` (D-01).
**When to use:** Phase 2's match step. Evidence: id path covers every row carrying `idDeputado` (208,143/209,080 in 2025) and is 100% consistent with name+UF where both resolve (549,845 agree / 0 disagree); name-only path silently drops 3,823 rows (0.69%) whose official name carries title prefixes etc.
**Example:**
```ts
// Source: D-06 return-shape (.planning/phases/01-.../01-CONTEXT.md:28) — verbatim contract kept
export type ResultadoMatch = { parlamentarId: string; metodo: 'idExterno' | 'nomeUf' } | null;
export function camaraNameMatch(
  entrada: { idDeputado?: number | string; nomeParlamentar: string; uf: string; partidoSigla?: string },
  diretorio: DiretorioParlamentares, // índice pronto: idExterno → id, e nomeNormalizado+UF → id[]
): ResultadoMatch; // ambiguidade → null; nunca fuzzy; partido nunca é predicado
```

### Pattern 4: Date helper — UTC-midnight normalization, null-safe (D-07)
**What:** `parseDataFonte(valor: string, casa: 'CAMARA' | 'SENADO'): Date | null` — takes the first 10 chars (`YYYY-MM-DD`), builds `Date.UTC(y, m-1, d)`; empty/unparseable → `null`.
**When to use:** every `data` write. Why not plain `new Date(s)`: probe shows `new Date('2025-01-21T00:00:00')` parses as **local time** (BRT → `2025-01-21T03:00:00.000Z`) while `new Date('2025-01-21')` parses as **UTC** — results would differ between CI (UTC) and local (BRT), shifting displayed days. `new Date('')` → `Invalid Date` (must guard). `0202-07-04` (Senado typo years) parses fine as year 202 — keep it, it's real source data; grouping uses the `ano`/`mes` columns, not the date [VERIFIED: first-hand node probe 2026-10-09].

### Anti-Patterns to Avoid
- **Asserting uniqueness from one year or from portal docs:** the gate itself exists because "o spec oficial avisa que o bulk não segue convenções do portal" (D-03); evidence shows cross-year `idDocumento` overlap too (24∩25 = 122 ids).
- **Hand-picked column composites as a key:** refuted twice (D-03's own warning about `numDocumento`, and the 2026 fornecedor-only pair) — composites are an empirical lottery and each extra column bloats the unique index.
- **`@@unique([casa, idExterno])` as "fix":** D-03's fallback doesn't address same-casa collisions — all observed collisions are inside CAMARA.
- **`parseFloat`/`Number` on source strings:** QA-02 ban; `parseFloat('1.234,56')` silently yields `1.234`.
- **Non-null `data`:** 2,554–10,313 rows/year have empty `dataEmissao` → NOT NULL violation on day one.
- **`updatedAt` instead of `importedAt`:** D-04 explicitly forbids UI timestamps on this table.
- **Enum/tabela para `categoria`:** D-05 bans it (labels livres da fonte).
- **Storing pt-BR formatted money:** DB stores `Decimal(14,2)` canonical values; formatting is display-only (Phase 3/4).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Money parse/serialize | Custom float math, locale `parseFloat`, `toFixed` | `parseBRL` (string→string validation) + Prisma `Decimal @db.Decimal(14,2)` | QA-02 ban on float; `Decimal` is Prisma's standard (decimal.js) with Postgres `numeric(14,2)` backing |
| Cryptographic fingerprint for the key | Homemade hash/FNV/djb2 | `node:crypto` `createHash('sha256')` | Correctness/security of the key derivation rides on it; stdlib is free |
| Zip decompression / streaming JSON of the bulk | `JSON.parse` of 225 MB or custom unzip | **Phase 2 scope:** `yauzl@3.4.0` + `stream-json@2.1.0` (pin 2.x CJS) [CITED: .planning/research/STACK.md] | GAST-04 mandates streaming, never `JSON.parse`; do not start it early |
| Idempotent batch upsert | DIY delete-then-insert loops | **Phase 2 scope:** batched `INSERT … ON CONFLICT (id_externo) DO UPDATE` via `$executeRaw` with `$1` placeholders [CITED: .planning/research/STACK.md; Prisma has no upsertMany] | 65,535-param cap → batch 500–1000 rows (CONTEXT discretion item) |
| Fuzzy legislator matching | Levenshtein/similarity scoring | Exact normalized `nome + UF` (D-06) — **never** fuzzy | D-06/GAST-08 explicitly ban it; wrong-deputy attribution is a Core-Value failure |
| Year window duplication | Copy `const ANOS = [2026, 2025, 2024, 2023]` pattern ad hoc | Single exported `ANOS_JANELA` constant consumed by import loop **and** retention (GAST-05) | Prior pitfall 5: two year constants drift apart and retention deletes what sync just wrote |

**Key insight:** every item above has a documented, already-researched library or a framework primitive — Phase 1's own scope (helpers + schema) is deliberately small enough that adding *any* new dependency would be scope creep.

## Runtime State Inventory

> Phase 1 is additive schema work on a live database — inventory run to confirm nothing in flight breaks.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Neon Postgres reachable; existing 9 tables contain no expense data; **no `Despesa` model exists** (schema read this session) | New migration is purely additive (`CREATE TABLE`) — no backfill, no destructive change |
| Live service config | None affected — no new env vars in Phase 1 (`DATABASE_URL` already consumed by `prisma/schema.prisma:7`) | none |
| OS-registered state | None (no cron/systemd touches schema) | none |
| Secrets/env vars | None new; `.env` exists locally but is never read (AGENTS.md + repo convention) | none |
| Build artifacts | `node_modules/.prisma/client` regenerated on any schema change (`prisma generate` — CI runs it before `tsc`, `.github/workflows/ci.yml`); `prisma/migrations/20261009034942_temp/migration.sql` exists = 30 bytes `-- This is an empty migration.` (already applied, harmless) | Run `npx prisma generate` as first step of task 01-01; **do not edit or delete applied migrations** |

**Nothing else found** — verified by schema read (this session), `ls prisma/migrations/`, and earlier `prisma migrate status` probe against Neon.

## Common Pitfalls

### P1: `idDocumento` is NOT a globally unique key (D-03's primary candidate fails the gate)
**What goes wrong:** `@@unique` on `CAMARA:{idDocumento}` rejects real bulk rows — or, worse, a pre-freeze "test" that samples one year/file misses it and ingestion dies at first estorno batch.
**Why it happens:** one invoice/protocol number spans multiple subcota lines (Lafayette `7869356`: subcota 1 "MANUTENÇÃO…" R$309,68 *with* URL + subcota 10 "TELEFONIA" R$396,24 *without* URL, same `numero` `2501952681880`), estorno/adjustment pairs share ids (Danilo Forte `302649`: +1967,57 / −1967,57), and the sentinel `idDocumento == 0` block is huge (7,841 rows in 2025 — all TELEFONIA, empty `dataEmissao`/URL). Cross-year reuse exists too.
**Evidence (first-hand, full files, 2026-10-09):** duplicate keys / rows in id — 2024: **14,541 / 41,312**; 2025: **10,319 / 30,317**; 2026: **46 / 2,153**. `idDocumento==0` rows — 9,780 / 7,841 / 2,063. Cross-year overlap of `idDocumento` — 2024∩2025: 122, 2025∩2026: 1, 2024∩2026: 1. Exact full-content duplicates: **0** in all years (so the rows are *distinct expenses sharing an id*, never copies).
**How to avoid:** adopt the content-fingerprint key (Pattern 1, S6) — empirically 0 collisions in 556,044 rows at sha256[:12]/[:16], and uniqueness holds by construction for distinct content.
**Warning signs:** any plan text that says "`idDocumento` é sequência global única" (that claim exists in prior research ARCHITECTURE.md:313 and is now refuted); zero-collision test that only checks one composite you picked by hand.

### P2: D-03's documented fallback doesn't help
**What goes wrong:** plan executes "se colidir → `@@unique([casa, idExterno])`" and still collides.
**Why it happens:** every collision observed is *within* `Casa = CAMARA` — adding `casa` to the unique key is a no-op.
**How to avoid:** treat both pre-decided branches as refuted; escalate the replacement (S6 primary / S2 ordinal) as a decision amendment — D-03 itself marks the key as **one-way**, so it needs the user's sign-off, not silent substitution.
**Warning signs:** a plan task rewording the fallback as "fix" without new evidence.

### P3: Hand-picked wide composites also fail (and bloat the index)
**What goes wrong:** a "safe" composite like `[idDeputado, idDocumento, numeroSubCota, dataEmissao, numero, valorLiquido, mes, trecho]` passes 2024/2025 and breaks on 2026.
**Why it happens:** source rows can differ in fields *outside* any preset list — 2026 has 3 key-groups × 2 rows identical on all 8 fields, differing only in `fornecedor`/`cnpjCPF` (Acácio Favacho TELEFONIA, `CELULAR FUNCIONAL` vs `LINHA DIRETA`, placeholder CNPJs `000.000.000/0000-1/2`). Second-order cost: each composite column widens the unique index (~616k rows on Neon's 0.5 GB).
**How to avoid:** derive the key from the whole record (hash), not a subset; if ordinal (S2) is chosen instead, it is construction-proof rather than field-list-proof.

### P4: Float/locale money corruption
**What goes wrong:** silent 3-decimal truncation or pt-BR misparse — `parseFloat('1.234,56')` → `1.234`; binary-float artifacts (`String(0.1+0.2)` → `"0.30000000000000004"`) baked into `Decimal`.
**Why it happens:** QA-02 exists because this is the classic bug; real fixture formats are narrower than the docs suggest — Câmara `valorLiquido` across all 3 years matches `^-?\d+(\.\d+)?$` (0 commas, 0 empties, 0 non-numerics) and Senado `valorReembolsado` is a JSON number with ≤2 decimals (negatives: 57/72/9 per year) [VERIFIED: first-hand probe 2026-10-09].
**How to avoid:** `parseBRL` as in Pattern 2 — accept the two real formats + pt-BR decision case, reject everything else loudly, return a string for `new Prisma.Decimal(...)`; tests on `01-fixtures-fonte.json` rows (estorno pairs prove sign preservation).
**Warning signs:** `parseFloat(` or `Number(` appearing anywhere on a `valor*` field; column typed `Float` (existing `taxaPresenca Float` at schema.prisma:215 is a *rate*, not money — don't copy it).

### P5: Date/timezone skew + empty dates
**What goes wrong:** NOT NULL violation on import (empty `dataEmissao`), or dates shifting one day between CI (UTC) and local runs.
**Why it happens:** 10,313/8,675/2,554 rows per year (2024/25/26) have `dataEmissao: ""` (the whole `idDocumento==0` block); Câmara ISO strings carry no `Z` → `new Date()` parses local time; Senado has `data`≠`ano` rows (425/321/102 — legit: competência vs emissão) and pre-1900 typo years (`"0202-07-04"`, `"0204-05-29"`, `"0202-02-24"`).
**How to avoid:** `data DateTime?` (nullable) + `parseDataFonte` Pattern 4 (slice 10 chars → `Date.UTC`); group/filter by the `ano`/`mes` Int columns (always present, `ano` constant per file), never by extracting from `data`; tests include the `0202` row and the empty string.
**Warning signs:** `data DateTime` without `?`; `new Date(field)` used directly in the adapter; UI deriving year from `data`.

### P6: Name-match without the id path loses receipts (and party-as-predicate corrupts them)
**What goes wrong:** 0.69% of receipts never land (understated spend — Core-Value failure), or deputies flip mid-match because partido changed.
**Why it happens:** 3,823/556,044 rows have official names that don't normalize into the DB (title prefixes like `Dr. Ismael Alexandrino`, variants); 2,376 rows are collective leader rows with **no** `idDeputado` at all (`LID.GOV-CD` 284×, `LIDERANÇA DO PT` 254× in 2025 — correctly unmatched); among the 549,845 name+UF agrees, **90 have a different party in the file than in the DB** (party drift is routine — exactly why D-06 says partido is only tie-break). Good news: db has **0 homonym groups** (nome+UF) and 0 disagree/0 ambiguous in 3 years — name matching itself is sound.
**How to avoid:** Pattern 3 (id-first, name+UF fallback, `metodo` auditable, leader rows → `null`, `nomeParlamentarRaw` always stored). Requires the flagged D-06/GAST-08 wording amendment ("match é exato por nome normalizado + UF" → "id direto quando disponível; nome+UF exato como fallback; nunca inventa"). **Also:** the payload's `numeroDeputadoID` is a *different id space* (Lafayette: `numeroDeputadoID=3420` vs `idDeputado=98057`; leader row has `numeroDeputadoID=2812` with no `idDeputado` at all) — only `idDeputado` equals `Parlamentar.idExterno`; never match on `numeroDeputadoID` [VERIFIED: first-hand probe of fixture rows 2026-10-09].
**Warning signs:** match implemented as name-only while `idDeputado` sits unused in the payload; `partidoSigla ===` inside the matcher's predicate.

### P7: `migrate deploy` failures are masked at build
**What goes wrong:** schema drifts, gate stays green, `Despesa` table never appears in some environment.
**Why it happens:** `"build": "prisma generate && (prisma migrate deploy || true) && next build"` [VERIFIED: package.json:7] — migration failure is deliberately tolerated; CI runs `prisma generate` only before `tsc`.
**How to avoid:** apply/verify migrations explicitly in task 01-01 (`npx prisma migrate dev --name add_despesa` locally — **verified working against Neon this session**, or `--create-only` then review) and confirm with `npx prisma migrate status` before the gate; never rely on build output for migration truth.
**Warning signs:** build log showing a migration error followed by success; table absent in `prisma studio`.

### P8: Hash truncation collisions
**What goes wrong:** 6-char hex fingerprints collide inside the file.
**Why it happens:** sha256[:8] on 2025 produces **4 duplicate keys** (birthday collisions are real at 8 hex chars / ~209k rows); [:12] and [:16] are clean on all 3 years.
**How to avoid:** slice(0, 16) in Pattern 1; unit-test the derivation against `01-fixtures-fonte.json` expecting distinct ids for the estorno pair, subcota-split pair, and the 2026 fornecedor-only pair.

### P9: Content-key vs snapshot corrections
**What goes wrong:** an amended row (new content → new key) leaves the old row behind → double-counted receipt.
**Why it happens:** any content-derived key changes on amendment — by design.
**How to avoid:** Phase 2 reconcile on `importedAt` (D-04 already reserves it; prior research already plans "upsert que aplica correções do snapshot diário" — GAST-04). Phase 1 only has to *not* block it: keep `importedAt` in the schema (D-01) and document the reconciliation expectation in the migration comment. (If the team wants zero reconcile burden, choose S2 ordinal instead — decision is Open Question 1.)

## Code Examples

Verified patterns from official sources and this repo:

### Despesa model skeleton (follows existing schema conventions)
```prisma
// Conventions quoted verbatim from prisma/schema.prisma (read this session):
//   enum Casa { CAMARA SENADO }                       ← schema.prisma:10-13
//   idExterno String @unique @map("id_externo")       ← schema.prisma:70 (Parlamentar)
//   @@index([parlamentarId, data])                    ← schema.prisma:160 (Discurso)
//   @@map("discursos")                                ← schema.prisma:163 (snake_case plural)
// Money type mandated verbatim by QA-02: "valores monetários usam `Decimal(14,2)`" ← REQUIREMENTS.md:26
model Despesa {
  id                String   @id @default(cuid())
  idExterno         String   @unique @map("id_externo")   // "CAMARA:{idDoc}:{fp16}" | "SENADO:{id}"
  parlamentarId     String?  @map("parlamentar_id")       // nullable? — decisão: linhas de liderança nunca casam (ver P6); se NOT NULL, descartá-las no Phase 2 é a alternativa
  casa              Casa
  ano               Int
  mes               Int
  data              DateTime?                             // nullable por P5 (dataEmissao vazia)
  categoria         String                                // label livre da fonte (D-05)
  fornecedor        String
  cpfCnpj           String?
  documento         String?
  valor             Decimal  @db.Decimal(14,2)            // signed (estornos negativos)
  valorGlosa        Decimal? @db.Decimal(14,2) @map("valor_glosa")
  urlDocumento      String?  @map("url_documento")        // Senado nunca emite (0/3 anos)
  nomeParlamentarRaw String  @map("nome_parlamentar_raw") // audit do match (D-01)
  importedAt        DateTime @default(now()) @map("imported_at") // D-04 — NÃO updatedAt
  createdAt         DateTime @default(now()) @map("created_at")

  parlamentar       Parlamentar? @relation(fields: [parlamentarId], references: [id])

  @@index([parlamentarId, ano, data])
  @@index([casa, ano])
  @@map("despesas")
}
```
Field set is exactly D-01's list — nothing beyond it (DROP `detalhamento` is explicit). Nullable-vs-not decisions inside the skeleton are marked for the planner (see Open Questions 3).

### parseBRL contract tests (extract)
```typescript
// Source: format probe on real fixtures (2026-10-09) + D-07 decision
// Real bulk format (556k rows, all 3 years):   '-1967.57', '705.92', '116.56'
// Decision-document format:                     '1.234,56'
// Both must round-trip into new Prisma.Decimal(v)
expect(parseBRL('-1967.57')).toBe('-1967.57');   // estorno preservado
expect(parseBRL('1.234,56')).toBe('1234.56');    // pt-BR normalizado
expect(() => parseBRL('abc')).toThrow();          // falha ruidosa (GAST-08 espírito)
```

### Match fixture rows (from 01-fixtures-fonte.json)
```jsonc
// Subcota-split — 2 linhas, mesmo idDocumento e mesmo numero (a colisão que derruba D-03):
// { "idDocumento": 7869356, "numeroSubCota": 1, "descricao": "MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR",
//   "numero": 2501952681880, "valorLiquido": "309.68", "urlDocumento": "https://www.camara..." }
// { "idDocumento": 7869356, "numeroSubCota": 10, "descricao": "TELEFONIA",
//   "numero": 2501952681880, "valorLiquido": "396.24", "urlDocumento": "" }
// Liderança — SEM campo "idDeputado"; siglaUF é "NA"; numeroDeputadoID (2812) é OUTRO espaço de id — nunca casar por ele:
// { "nomeParlamentar": "LID.GOV-CD", "siglaUF": "NA", "numeroDeputadoID": 2812, ... }
// Estorno Senado — valor negativo chega como JSON number, não string:
// { "id": 2253369, "nomeSenador": "ASTRONAUTA MARCOS PONTES", "valorReembolsado": -1541.7, "data": "2025-01-10" }
```

## State of the Art

| Old Approach / Prior Claim | Current Approach / Finding | When Changed | Impact |
|---|---|---|---|
| "`idDocumento` é uma sequência global (única)" — prior research ARCHITECTURE.md:313 / D-03 primary key | **REFUTED by 3-year gate:** 14,541 / 10,319 / 46 duplicate keys per year + `idDocumento==0` sentinel block (2,063–9,780 rows/yr) + 124 cross-year overlaps | 2026-10-09, full-file probe | Key must be content-fingerprinted (S6) before the migration freezes (D-03 = one-way) |
| Fallback `@@unique([casa, idExterno])` (D-03 branch 2) | **REFUTED:** collisions are within CAMARA | 2026-10-09 | Branch 2 is not a safety net — escalate replacement as decision amendment |
| "O bulk não traz o id oficial do parlamentar" (PROJECT.md Key Decision premise behind D-06 name-match) | **REFUTED:** `idDeputado` present on 232,015 (2024), 208,143 (2025), 113,510 (2026) rows = dadosabertos id = `Parlamentar.idExterno` (100% ∩ db, 0 bulk-only; spot-check `98057` = "Lafayette de Andrada") | 2026-10-09, full-file probe + Neon export | Match can be id-first (covers the 0.69% name-only misses) — amendment to D-06/GAST-08 wording |
| Candidate key ideas from prior pitfalls (`codLote`/`tipoLinha`, "which name column") | Those columns don't exist in the 32-key payload; correct questions were: does the id repeat (yes), can content fingerprint disambiguate (yes) | corrected 2026-10-09 | Plan 01-02 implements S6, not field-guessing |
| Prisma `@db.Money` for money | Prisma docs advise **against** `money` (locale-dependent); use `Decimal @db.Decimal(14,2)` | official docs [CITED: prisma.io docs type-mapping / avoid-db-money] | D-01/QA-02 confirmed, no deviation |
| `JSON.parse` of the bulk / non-streaming unzip | Streaming `yauzl` + `stream-json` (GAST-04) [CITED: .planning/research/STACK.md] | prior research (unchanged) | Phase 2 — Phase 1 tests use committed extracts instead of loading 225 MB |

**Deprecated/outdated:**
- Any plan text asserting global uniqueness of `idDocumento` — delete or rephrase after this research.
- Name-only match as the *sole* resolution path — keep it as fallback (it proved safe: 0 misattribution), but not as the only path.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Content-fingerprint key (S6) is acceptable in place of D-03's literal `CAMARA:{idDocumento}` format — evidence forces it, but D-03 is marked one-way and says to fall back only to `@@unique([casa, idExterno])`, which is refuted | Pattern 1 / Open Q1 | Wrong key shape after freeze = full re-import + index rewrite (D-03 reversibility note). **Needs user confirmation before migration freeze** |
| A2 | Id-first + name+UF fallback amends D-06/GAST-08 without violating "nunca inventa" (both paths stay exact; ambiguity → null) | Pattern 3 / Open Q2 | If user insists on literal D-06 wording, 0.69% of receipts (3,823 rows/3y) are dropped — understated spend. **Needs user confirmation** |
| A3 | `data` column nullable (`DateTime?`) because of empty `dataEmissao` | Despesa skeleton / Open Q3 | NOT NULL fails on import day one (2,554–10,313 rows/yr); alternative = sentinel date (worse for honest UI states) |
| A4 | Hash input = full raw source record (`JSON.stringify(raw)`), canonicalized at ingest | Pattern 1 | If adapters preprocess before hashing, key changes → but hashing happens once at ingest (Phase 2); tests pin the helper's contract |
| A5 | `ANOS_JANELA` for the rolling window is `[2024, 2025, 2026]` as of today (currentYear−2..currentYear); existing precedent is the static tuple `const ANOS = [2026, 2025, 2024, 2023] as const` [VERIFIED: src/app/votacoes/VotacoesPageClient.tsx:31] | Standard Stack / discretion | Static tuple drifts next year (pitfall 5 of prior research) — recommend computed-from-constant-anchor; planner decides (CONTEXT discretion) |
| A6 | Committing gov open-data extracts under `.planning/` (and copying into `src/lib/__tests__/fixtures/`) for Jest is acceptable — 20 rows, ~24 KB, public domain | Recommended Project Structure | If repo policy rejects it, regenerate extracts from download in the test setup (adds network dependency — worse) |
| A7 | Doc-count scale ~616,380 rows (Câmara 556,044 + Senado 60,336, measured 2026-10-09) — close to prior "~670k" estimate | Summary / storage budget | Budget math (+160 MB) holds at measured scale; 2026 bulk keeps growing daily (~114k mid-year) — full year may add ~15-20% |
| A8 | No package is added this phase → no legitimacy audit needed | Package Legitimacy Audit | If a plan adds a dep (e.g. money lib), audit must run first |

## Open Questions

1. **Key shape — S6 (content-fingerprint) vs S2 (ordinal) vs literal D-03?**
   - What we know: literal D-03 and its documented fallback are both refuted (P1/P2); S6 = 0 collisions in 556k rows empirically + by-construction for distinct content; S2 = reconcile-free amendments but two-pass ingest.
   - What's unclear: whether the user accepts the amended `CAMARA:{idDocumento}:{fp16}` format (D-03 example says `CAMARA:7877589`) and the `importedAt` reconcile burden it implies (Phase 2).
   - Recommendation: **S6 primary**, document S2 as fallback in the plan; put the amendment in front of the user before task 01-01 executes (checkpoint:human-verify on the key decision). Evidence tables + fixture for re-running the gate are in this document.

2. **Name-match wording — id-first amendment?**
   - What we know: name+UF is safe (0 disagree/0 ambiguous/0 homonyms in 556k rows) but misses 0.69%; `idDeputado` covers ~99.6% of rows and matches name+UF 100% where both resolve; GAST-08's literal wording says "match é exato por nome normalizado + UF".
   - What's unclear: whether the requirement text is amended ("id direto quando disponível; nome+UF exato como fallback") or id-first ships *without* the wording change (traceability drift).
   - Recommendation: amend the wording in the same PR that adds the matcher; keep `metodo` in the return shape so audits can split id vs name matches (Core Value: `nomeParlamentarRaw` always stored).

3. **`data` nullability + leader-row disposition**
   - What we know: empty `dataEmissao` exists at scale; leader rows have no `idDeputado` (and `siglaUF="NA"`).
   - What's unclear: (a) `data DateTime?` vs NOT NULL + sentinel; (b) `parlamentarId` nullable (store leader rows unlinked) vs NOT NULL (skip leader rows at ingest — but then their spend vanishes from totals...). Note: leader-row spend belongs to collective budgets, not a single deputy — product decision territory.
   - Recommendation: `data DateTime?`; leave `parlamentarId` decision to the planner with the tradeoff spelled out (nullable keeps data for honest house-level views later; NOT NULL simplifies Phase 3 queries). Flag both in the plan.

4. **`ANOS_JANELA` shape** (CONTEXT discretion — no user needed): recommend a computed tuple from an anchor constant, exported from the module that owns it, consumed by both Phase 2's import loop and retention (GAST-05).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/tests (`package.json` scripts) | ✓ | v22.22.1 (repo/CI require 20) | — |
| npm | `npm ci`/scripts | ✓ | 9.2.0 | — |
| `npx prisma` (local CLI) | migration + generate | ✓ | `^5.12.0` (installed) | — |
| PostgreSQL server/`psql` (local) | direct DB inspection | ✗ | — | **Use Prisma against Neon** — `prisma migrate status` + `prisma migrate dev --create-only` probes **succeeded against Neon this session** (shadow DB works); probe migration created and deleted |
| Neon via `DATABASE_URL` | migration target | ✓ | reachable | — (this *is* the target; `.env` never read directly per repo rules) |
| `unzip`/`funzip` | re-running the full-year gate | ✓ | present | python3 zipfile (used in this research) |
| `jq` | ad-hoc JSON checks | ✓ | 1.8.1 | python3 |
| `python3` | fixture extraction during research (tooling only — NOT part of product toolchain) | ✓ | 3.14.5 | — |
| Network: `dadosabertos.camara.leg.br` | fixture download (research flag) | ✓ | bulk zips 2024/25/26 fetched | committed `01-fixtures-fonte.json` for tests |
| Network: `adm.senado.gov.br` (CEAPS) | Senado fixture | ✓ | 3 years fetched | committed extract |
| Disk in work dir | holding ~600 MB fixtures | ✓ | ~4.6 GB free observed | delete zips after re-runs |
| Docker | none | ✗ (no daemon) | — | not needed |
| Playwright browsers | e2e (QA-03) | not exercised this phase | — | Phase 4 concern; QA-01 gate is tsc/lint/jest/build only |

**Missing dependencies with no fallback:** none.
**Notes for the planner:** first command of task 01-01 must be `npx prisma generate` after the schema edit (CI relies on it before `tsc`); apply migration explicitly with `prisma migrate dev` and verify `prisma migrate status` — never trust `next build` output for migration truth (P7).

## Validation Architecture

> `.planning/config.json`: `workflow.nyquist_validation: true` [VERIFIED: .planning/config.json:24]; `security_enforcement: true` [VERIFIED: .planning/config.json:47], `security_asvs_level: 1` [VERIFIED: .planning/config.json:48], `security_block_on: "high"` [VERIFIED: .planning/config.json:49].

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest `^29.7.0` + `ts-jest` `^29.1.0` [VERIFIED: package.json:43,49] |
| Config file | `jest.config.js` — `testEnvironment: 'node'`, `preset: 'ts-jest'`, `testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts']`, alias `@/ → <rootDir>/src/`, coverage from `src/lib/**/*.ts` excluding `prisma.ts` [VERIFIED: jest.config.js:1-16] |
| Quick run command | `npx jest src/lib/__tests__/<arquivo>.test.ts` (or `npx jest -t "nome do teste"`) |
| Full suite command | `npx jest` (repo: `npm test`, package.json:17) |
| Phase gate command | `npx tsc --noEmit && npx next lint && npx jest && npx next build` (QA-01 verbatim, REQUIREMENTS.md:25) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| QA-02 (parseBRL) | string/number → canonical dot-decimal signed string; pt-BR + real formats; rejects garbage; never `parseFloat` | unit | `npx jest src/lib/__tests__/parse-brl.test.ts` | ❌ Wave 0 |
| QA-02 (name-match) | id-first resolution; nome+UF exact after normalize (acentos/caixa/espaços); partido só desempate; ambiguidade → null; leader rows → null; `metodo` reported | unit | `npx jest src/lib/__tests__/camara-name-match.test.ts` | ❌ Wave 0 |
| ROADMAP c2 (chave) | Derivation produces distinct `idExterno` for: subcota-split pair (7869356), estorno pair (302649), SIGEPA pair (268011), 2026 fornecedor-only pair, `idDocumento=0` sample; stable across re-invocation; SENADO ids stable | unit | `npx jest src/lib/__tests__/despesa-id.test.ts` | ❌ Wave 0 |
| D-07 (datas) | ISO-without-Z → UTC-midnight; `''` → null; `0202-07-04` parses (year 202) without throwing; Senado `YYYY-MM-DD` | unit | `npx jest src/lib/__tests__/datas-despesa.test.ts` | ❌ Wave 0 |
| ROADMAP c1 (migração) | `Despesa` model applies cleanly; indexes present; `prisma generate` + build pass | integration/CI | `npx prisma migrate dev` then gate chain | ❌ Wave 0 (task 01-01) |
| QA-01 (gate) | Whole chain green | CI/manual gate | `npx tsc --noEmit && npx next lint && npx jest && npx next build` | ✅ `.github/workflows/ci.yml` runs tsc→lint→jest→build |
| QA-02 (agregação) | *Not in this phase* — completada na Phase 3 (ROADMAP:9) | — | — | — |

### Sampling Rate

- **Per task commit:** quick run `npx jest <novo-teste>` + `npx tsc --noEmit`
- **Per wave merge:** full `npx jest`
- **Phase gate:** full QA-01 chain green before `/gsd-verify-work`; migration verified with `npx prisma migrate status` beforehand

### Wave 0 Gaps

- [ ] `src/lib/__tests__/parse-brl.test.ts` — covers QA-02 money (cases: real bulk `-1967.57`/`705.92`, pt-BR `1.234,56`, signed estorno, rejects `abc`/NaN/`>2` decimals)
- [ ] `src/lib/__tests__/camara-name-match.test.ts` — covers D-06/QA-02 (normalize acentos/caixa, partido divergente ainda casa, ambiguidade → null, líder → null, id-first com prioridade)
- [ ] `src/lib/__tests__/despesa-id.test.ts` — covers ROADMAP criterion 2 (fixture-driven distinctness + format assertions)
- [ ] `src/lib/__tests__/datas-despesa.test.ts` — covers D-07 date helper (P5 cases)
- [ ] Fixture placement: copy/reference `.planning/phases/01-schema-e-contratos-de-despesas/01-fixtures-fonte.json` → `src/lib/__tests__/fixtures/fontes.json` (or import directly; A6)
- [ ] Framework install: **none** (Jest already configured)
- [ ] Schema change: `npx prisma generate` before first `tsc` (task 01-01 step 1)

*(No test framework gaps — existing `jest.config.js` covers the new files automatically via `testMatch`.)*

## Security Domain

> `security_enforcement: true`, ASVS level 1 (from `.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V1 Architecture | minimal | Existing layering kept (lib → api → scripts); no new trust boundaries this phase |
| V2 Authentication | no | Product is 100% public, no auth (PROJECT.md) — only cron route auth exists (Phase 2 scope) |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Public read-only product; no user data |
| V5 Input Validation | **yes** | `parseBRL`/`parseDataFonte` validate-and-fail-loud (throw on malformed); zod remains the API-boundary validator in Phase 3; ingestion sanity gates in Phase 2 (GAST-08) |
| V6 Cryptography | conditional | If key derivation (Pattern 1) ships: `node:crypto` `createHash('sha256')` — **never** a hand-rolled hash; no secrets, no password/encryption work in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed/hostile source records (wrong types, huge strings, `__proto__` keys) | Tampering | Helpers reject non-string/non-number inputs loudly; Phase 2 parses streaming JSON and never `eval`s/merges untrusted keys into prototypes (use `Object.create(null)`-style handling at ingest) |
| Money precision loss / silent rounding | Tampering | `Decimal(14,2)` end-to-end; QA-02 bans float/`parseFloat`; parse layer rejects >2 decimals |
| Wrong-deputy attribution (integrity of transparency data) | Repudiation | Exact matching only (D-06), ambiguity → null, `nomeParlamentarRaw` + `metodo` audit columns |
| Fixture/zip resource exhaustion in tests | DoS (availability) | Jest never loads the 225 MB originals — committed 24 KB extract only; full-year gate is an optional offline script |
| SQL injection (future upsert) | Tampering | Existing convention: parameterized `$1` placeholders in `$queryRawUnsafe` — keep for Phase 2's `ON CONFLICT` batches; no raw SQL in Phase 1 |
| Comprovante URL abuse (future UI) | Spoofing | GAST-03 already mandates `rel="noopener"`; `urlDocumento` is nullable (Senado) — UI honest-state, Phase 4 |

## Sources

### Primary (HIGH confidence)
- First-hand full-file probes, 2026-10-09 — all three retention years of both official sources (Câmara `cotas/Ano-{2024,2025,2026}.json.zip`; Senado `despesas_ceaps/{2024,2025,2026}`): key-collision gate, content-hash distinctness, `idDeputado`/name-match statistics, money/date format scans, subcota/sentinel counts — all numbers in this document come from these runs (scripts `/tmp/opencode/{keytest,yearstats}.py`, extracts committed as `01-fixtures-fonte.json`)
- `prisma/schema.prisma` (read in full this session) — conventions, enums, index patterns, absence of `Decimal`
- `src/lib/sync/types.ts` (read in full) — `*Normalizado` contract pattern, `Casa` union
- `jest.config.js`, `package.json` (read in full) — test/gate scripts
- `.planning/phases/01-.../01-CONTEXT.md`, `.planning/ROADMAP.md:1-45`, `.planning/REQUIREMENTS.md` (read in full) — locked decisions and criteria quoted verbatim
- Live probes: Neon `prisma migrate status`/`migrate dev --create-only` (shadow DB OK), bulk URL behavior (`/api/v2/arquivos/...` → 405, `/arquivos/cotas/Ano-*.zip` → 200), Node `Date`/`String` semantics

### Secondary (MEDIUM confidence)
- Prior curated research re-used, not re-derived: `.planning/research/STACK.md` (streaming deps, `Decimal @db.Decimal(14,2)`, batched `ON CONFLICT`), `PITFALLS.md` (money/key/name-match/year-constant pitfalls), `ARCHITECTURE.md` — except its `idDocumento` global-sequence claim, which this session's probes **refute**
- Prisma official documentation on money/numeric mapping [CITED: prisma.io docs — "avoid money type", `Decimal @db.Decimal(14,2)` guidance] — retrieved via websearch fallback (Context7 MCP unavailable this session; research-plan seam digests cached under keys `aa256e91…`/`ed06e0e6…`)

### Tertiary (LOW confidence)
- `classify-confidence --provider websearch` returned LOW (unverified echo) — no load-bearing claim in this document rests on untagged web results; anything not marked [VERIFIED]/[CITED] is [ASSUMED] and listed in Assumptions Log

## Metadata

**Confidence breakdown:**
- Standard Stack: **HIGH** — locked versions read from `package.json` this session + registry heads verified via `npm view`; no new deps to research
- Key/collision findings: **HIGH** — first-hand, full-year, three-year evidence with committed reproducible extracts; the *recommendation* (S6) itself is MEDIUM-until-confirmed because it amends a one-way locked decision (A1)
- Architecture patterns: **HIGH** — schema/types conventions quoted verbatim from files read this session
- Pitfalls: **HIGH** — each has measured counts or executed probes
- Name-match amendment: **MEDIUM** — statistics are first-hand, but the wording change needs product/requirement sign-off (A2)
- Security: **MEDIUM-HIGH** — ASVS mapping is reasoning over verified constraints; no live attack-surface this phase (no route, no user input)

**Research date:** 2026-10-09
**Valid until:** 2026-11-08 (30 days — bulk files regenerate daily; key-collision conclusions are robust to row growth, but re-run the gate script if the 2026 file changes materially before Phase 2 starts)