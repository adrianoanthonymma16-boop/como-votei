/**
 * Unidades da Federação — fonte única para seed do banco e para o parser de
 * localidade de emendas (que recebe o nome do estado e precisa da sigla).
 */

export const UFS = [
  { sigla: 'AC', nome: 'Acre', regiao: 'NORTE' },
  { sigla: 'AL', nome: 'Alagoas', regiao: 'NORDESTE' },
  { sigla: 'AP', nome: 'Amapá', regiao: 'NORTE' },
  { sigla: 'AM', nome: 'Amazonas', regiao: 'NORTE' },
  { sigla: 'BA', nome: 'Bahia', regiao: 'NORDESTE' },
  { sigla: 'CE', nome: 'Ceará', regiao: 'NORDESTE' },
  { sigla: 'DF', nome: 'Distrito Federal', regiao: 'CENTRO_OESTE' },
  { sigla: 'ES', nome: 'Espírito Santo', regiao: 'SUDESTE' },
  { sigla: 'GO', nome: 'Goiás', regiao: 'CENTRO_OESTE' },
  { sigla: 'MA', nome: 'Maranhão', regiao: 'NORDESTE' },
  { sigla: 'MT', nome: 'Mato Grosso', regiao: 'CENTRO_OESTE' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'CENTRO_OESTE' },
  { sigla: 'MG', nome: 'Minas Gerais', regiao: 'SUDESTE' },
  { sigla: 'PA', nome: 'Pará', regiao: 'NORTE' },
  { sigla: 'PB', nome: 'Paraíba', regiao: 'NORDESTE' },
  { sigla: 'PR', nome: 'Paraná', regiao: 'SUL' },
  { sigla: 'PE', nome: 'Pernambuco', regiao: 'NORDESTE' },
  { sigla: 'PI', nome: 'Piauí', regiao: 'NORDESTE' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'SUDESTE' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'NORDESTE' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'SUL' },
  { sigla: 'RO', nome: 'Rondônia', regiao: 'NORTE' },
  { sigla: 'RR', nome: 'Roraima', regiao: 'NORTE' },
  { sigla: 'SC', nome: 'Santa Catarina', regiao: 'SUL' },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'SUDESTE' },
  { sigla: 'SE', nome: 'Sergipe', regiao: 'NORDESTE' },
  { sigla: 'TO', nome: 'Tocantins', regiao: 'NORTE' },
] as const;

/** Maiúsculas, sem acento e espaços colapsados — a mesma normalização do match. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const SIGLA_POR_NOME = new Map(UFS.map((uf) => [normalizar(uf.nome), uf.sigla]));

/** Nome do estado (com ou sem acento) → sigla; `null` se não for uma UF. */
export function siglaPorNomeUf(nome: string): string | null {
  return SIGLA_POR_NOME.get(normalizar(nome)) ?? null;
}

/** Sigla de 2 letras válida (rejeita lixo como "NA"). */
export function ehSiglaUf(sigla: string): boolean {
  return UFS.some((uf) => uf.sigla === sigla.toUpperCase());
}
