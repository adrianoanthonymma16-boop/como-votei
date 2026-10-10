## Checkpoint Task 1 - Human Sign-off Recorded

**Decision:** Option A — id-first with name+UF fallback (metodo='idExterno' then 'nomeUf')

**Timestamp:** 2026-10-10T03:37:04Z

**Rationale:** 556k rows probed, 100% idDeputado=Parlamentar.idExterno, 0 misattribution, 0.69% silent-drop recovered.

**Evidence attached:**
- idDeputado equals Parlamentar.idExterno for 100% of the 562 deputies probed in the 2025 bulk
- 0 misattribution across 556k rows
- Measured silent-drop rate of the name-only path: 3,823 rows = 0.69% (official names carrying title prefixes etc.)
- GAST-08 amendment note queued for phase SUMMARY / Phase 2 reconciliation

**Outcome:** The matcher will implement id-first resolution with fallback to exact normalized name+UF. Ambiguity returns null on both paths. The `metodo` field reports which path matched, feeding the `nomeParlamentarRaw` audit column (D-01).
