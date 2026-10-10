/**
 * Derivação determinística da chave natural (`idExterno`) de despesas.
 *
 * Forma pesquisada (01-RESEARCH.md, Padrão 1 / S6):
 *   - Câmara: `CAMARA:{idDocumento}:{sha256(JSON do registro bruto)[0:16]}`
 *   - Senado: `SENADO:{id}`
 *
 * A chave é a única fonte de `idExterno` para upsert idempotente de despesas:
 * o mesmo registro bruto sempre produz a mesma chave (determinismo) e registros
 * distintos produzem chaves distintas (fingerprint de conteúdo). `idDocumento`
 * sozinho NÃO é único no bulk da Câmara (pares subcota-split, estornos e o
 * sentinela `idDocumento == 0` colidem — ver 01-RESEARCH P1), por isso o
 * sufixo hash é obrigatório. O sentinela `0` é um valor VÁLIDO de idDocumento.
 *
 * Função pura: sem Prisma, sem I/O, sem relógio — testável sem banco.
 */
import { createHash } from 'crypto';

export function derivarIdExternoDespesa(casa: 'CAMARA' | 'SENADO', raw: Record<string, unknown>): string {
  if (casa === 'SENADO') {
    if (raw.id === undefined || raw.id === null || String(raw.id) === '') {
      throw new Error('derivarIdExternoDespesa: registro Senado sem id');
    }
    return `SENADO:${String(raw.id)}`;
  }

  // `idDocumento` ausente (undefined/null/vazio) é erro — mas o sentinela 0 é válido.
  if (raw.idDocumento === undefined || raw.idDocumento === null || String(raw.idDocumento) === '') {
    throw new Error('derivarIdExternoDespesa: registro Câmara sem idDocumento');
  }

  const fingerprint = createHash('sha256').update(JSON.stringify(raw)).digest('hex').slice(0, 16);
  return `CAMARA:${String(raw.idDocumento)}:${fingerprint}`;
}
