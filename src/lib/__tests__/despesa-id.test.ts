import { derivarIdExternoDespesa } from '@/lib/sync/despesa-id';
import fontesBrutos from '@/lib/__tests__/fixtures/fontes.json';

/**
 * Amostras reais dos arquivos oficiais de despesas — Câmara (`cotas/Ano-{ano}.json.zip`)
 * e Senado (CEAPS `despesas_ceaps/{ano}`) — extraídas sem alteração em 2026-10-09.
 * Fonte autoritativa: `.planning/phases/01-schema-e-contratos-de-despesas/01-fixtures-fonte.json`
 * (cópia byte-a-byte em `src/lib/__tests__/fixtures/fontes.json`).
 */

type Entrada = { ano: string; caso: string; registro: Record<string, unknown> };

const FONTES = fontesBrutos as unknown as {
  camara: Record<string, Array<{ caso: string; registro: Record<string, unknown> }>>;
  senado: Record<string, Array<{ caso: string; registro: Record<string, unknown> }>>;
};

function coletar(casa: Record<string, Array<{ caso: string; registro: Record<string, unknown> }>>): Entrada[] {
  const linhas: Entrada[] = [];
  for (const [ano, entradas] of Object.entries(casa)) {
    for (const entrada of entradas) {
      linhas.push({ ano, caso: entrada.caso, registro: entrada.registro });
    }
  }
  return linhas;
}

const linhasCamara = coletar(FONTES.camara);
const linhasSenado = coletar(FONTES.senado);

const FORMATO_CAMARA = /^CAMARA:(0|[1-9]\d*):[0-9a-f]{16}$/;
const FORMATO_CAMARA_ZERO = /^CAMARA:0:[0-9a-f]{16}$/;

function derivarTodas(linhas: Entrada[]): string[] {
  return linhas.map((linha) => derivarIdExternoDespesa('CAMARA', linha.registro));
}

/** Pares rotulados exigem duas chaves DIFERENTES (a colisão que derruba a chave literal). */
function expectParDiferente(rotulo: string, linhas: Entrada[]): void {
  const selecionadas = linhas.filter((linha) => linha.caso.includes(rotulo));
  expect(selecionadas.length).toBeGreaterThanOrEqual(2);
  const chaves = derivarTodas(selecionadas);
  const distintas = new Set(chaves);
  expect(distintas.size).toBe(chaves.length);
}

describe('derivarIdExternoDespesa (registros reais de despesas da Câmara e do Senado)', () => {
  describe('Câmara', () => {
    it('deriva chaves no formato CAMARA:{idDocumento}:{sha256[:16]} para todas as 16 linhas do fixture', () => {
      expect(linhasCamara).toHaveLength(16);
      for (const linha of linhasCamara) {
        expect(derivarIdExternoDespesa('CAMARA', linha.registro)).toMatch(FORMATO_CAMARA);
      }
    });

    it('produz chaves par a par distintas em todos os anos do fixture', () => {
      const chaves = derivarTodas(linhasCamara);
      expect(new Set(chaves).size).toBe(chaves.length);
    });

    it('distingue o par subcota-split (idDocumento 7869356 em 2 subcotas)', () => {
      const par = linhasCamara.filter((linha) => linha.caso.includes('subcota-split'));
      expect(par).toHaveLength(2);
      expect(par.every((linha) => linha.registro.idDocumento === 7869356)).toBe(true);
      expectParDiferente('subcota-split', linhasCamara);
    });

    it('distingue o par de estorno (idDocumento 302649, valores ±1967.57)', () => {
      const par = linhasCamara.filter((linha) => linha.caso.includes('estorno'));
      expect(par).toHaveLength(2);
      expect(par.every((linha) => linha.registro.idDocumento === 302649)).toBe(true);
      expectParDiferente('estorno', linhasCamara);
    });

    it('distingue o par SIGEPA (idDocumento 268011 com datas/valores diferentes)', () => {
      const par = linhasCamara.filter((linha) => linha.caso.includes('SIGEPA'));
      expect(par).toHaveLength(2);
      expect(par.every((linha) => linha.registro.idDocumento === 268011)).toBe(true);
      expectParDiferente('SIGEPA', linhasCamara);
    });

    it('distingue as linhas de 2026 idênticas exceto fornecedor/cnpjCPF', () => {
      const linhas2026 = linhasCamara.filter((linha) => linha.caso.includes('quebra do composto largo'));
      expect(linhas2026.length).toBeGreaterThanOrEqual(2);
      expect(linhas2026.every((linha) => linha.ano === '2026')).toBe(true);
      const chaves = derivarTodas(linhas2026);
      expect(new Set(chaves).size).toBe(chaves.length);
    });

    it('aceita idDocumento=0 (sentinela válido) e ainda produz chaves distintas', () => {
      const sentinela = linhasCamara.filter((linha) => linha.registro.idDocumento === 0);
      expect(sentinela.length).toBeGreaterThanOrEqual(2);
      const chaves = derivarTodas(sentinela);
      for (const chave of chaves) {
        expect(chave).toMatch(FORMATO_CAMARA_ZERO);
      }
      expect(new Set(chaves).size).toBe(chaves.length);
    });

    it('é determinística: reinvocar sobre o mesmo objeto devolve string idêntica', () => {
      for (const linha of linhasCamara) {
        const primeira = derivarIdExternoDespesa('CAMARA', linha.registro);
        const segunda = derivarIdExternoDespesa('CAMARA', linha.registro);
        expect(segunda).toBe(primeira);
      }
    });

    it('lança quando idDocumento está ausente', () => {
      expect(() => derivarIdExternoDespesa('CAMARA', { numeroSubCota: 1, valorLiquido: '10.00' })).toThrow();
      expect(() => derivarIdExternoDespesa('CAMARA', { idDocumento: null })).toThrow();
      expect(() => derivarIdExternoDespesa('CAMARA', { idDocumento: '' })).toThrow();
    });
  });

  describe('Senado', () => {
    it('deriva SENADO:{id} exato para toda linha do fixture', () => {
      expect(linhasSenado.length).toBeGreaterThanOrEqual(4);
      for (const linha of linhasSenado) {
        expect(derivarIdExternoDespesa('SENADO', linha.registro)).toBe(`SENADO:${String(linha.registro.id)}`);
      }
    });

    it('produz chaves Senado par a par distintas', () => {
      const chaves = linhasSenado.map((linha) => derivarIdExternoDespesa('SENADO', linha.registro));
      expect(new Set(chaves).size).toBe(chaves.length);
    });

    it('lança quando o id do senador está ausente ou vazio', () => {
      expect(() => derivarIdExternoDespesa('SENADO', { codSenador: 22 })).toThrow();
      expect(() => derivarIdExternoDespesa('SENADO', { id: '' })).toThrow();
      expect(() => derivarIdExternoDespesa('SENADO', { id: null })).toThrow();
    });
  });
});
