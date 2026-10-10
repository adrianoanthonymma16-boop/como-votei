/**
 * Tipos unificados para normalização de dados Câmara/Senado
 * Ambos os adaptadores devem retornar estes shapes
 */

export type Casa = 'CAMARA' | 'SENADO';

export interface ParlamentarNormalizado {
  idExterno: string;
  cpf?: string;
  nome: string;
  nomeCivil?: string;
  casa: Casa;
  partidoSigla: string;
  ufSigla: string;
  legislatura: number;
  fotoUrl?: string;
  email?: string;
  telefone?: string;
  situacao?: string;
  dataNascimento?: Date;
  naturalidade?: string;
  ufNaturalidade?: string;
}

export interface PartidoNormalizado {
  sigla: string;
  nome: string;
  ideologia?: string;
  cor?: string;
}

export interface UfNormalizada {
  sigla: string;
  nome: string;
  regiao: string;
}

export interface VotacaoNormalizada {
  idExterno: string;
  casa: Casa;
  legislatura: number;
  sessao?: number;
  numero: number;
  data: Date;
  descricao: string;
  ementa?: string;
  tema?: string;
  resultado?: string;
  quorum?: number;
}

export interface VotoNormalizado {
  parlamentarIdExterno: string;
  votacaoIdExterno: string;
  tipo: 'SIM' | 'NAO' | 'ABSTENCAO' | 'ARTICULACAO' | 'OBSTRUCAO' | 'AUSENTE' | 'LICENCA' | 'MISSAO';
}

export interface DiscursoNormalizado {
  idExterno: string;
  parlamentarIdExterno: string;
  casa: Casa;
  tipo: 'ORDEM_DIA' | 'PLENARIO' | 'COMISSAO' | 'LIDERANCA' | 'OUTRO';
  data: Date;
  hora?: string;
  resumo: string;
  urlOriginal: string;
  tema?: string;
  duracaoSegundos?: number;
}

export interface ProposicaoNormalizada {
  idExterno: string;
  parlamentarIdExterno: string;
  casa: Casa;
  tipo: string;
  numero: number;
  ano: number;
  ementa: string;
  autorPrincipal: boolean;
  status: 'APRESENTADA' | 'EM_TRAMITACAO' | 'APROVADA_CAMARA' | 'APROVADA_SENADO' | 'SANCIONADA' | 'VETADA' | 'ARQUIVADA' | 'RETIRADA';
  dataApresentacao: Date;
  urlOriginal: string;
  tema?: string;
}

/** Proposição já com o histórico de tramitação (evita segunda passada no sync). */
export interface ProposicaoComTramitacoes extends ProposicaoNormalizada {
  tramitacoes: TramitacaoNormalizada[];
}

export interface TramitacaoNormalizada {
  proposicaoIdExterno: string;
  data: Date;
  descricao: string;
  orgao?: string;
  situacao: string;
}

export interface FrequenciaNormalizada {
  parlamentarIdExterno: string;
  ano: number;
  totalSessoes: number;
  presencas: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
  taxaPresenca: number;
}

/**
 * Contrato único de despesa normalizada entre adapters (Phase 2) e upsert.
 * Invariante DB-free: zero imports, plain interface + string-literal unions.
 * D-01: campos de auditoria (nomeParlamentarRaw) + namespaced idExterno.
 * D-07: valor/valorGlosa são strings canônicas dot-decimal (output de parseBRL),
 *       nunca number — new Prisma.Decimal(valor) é lossless.
 * D-05: categoria é label livre da fonte (Câmara descricao/subcota, Senado tipoDespesa).
 * D-08: casa espelha enum Prisma Casa como string-literal union (sem import @prisma/client).
 */
export interface DespesaNormalizada {
  idExterno: string;                    // namespaced: "CAMARA:{idDocumento}:{fp16}" | "SENADO:{id}"
  parlamentarIdExterno?: string;         // source id — Câmara idDeputado / Senado codSenador (matcher Phase 2)
  nomeParlamentarRaw: string;           // audit do match (D-01) — nome bruto da linha da despesa
  casa: 'CAMARA' | 'SENADO';
  ano: number;
  mes: number;
  data?: Date;                          // nullable — bulk tem linhas sem dataEmissao
  categoria: string;                    // label livre da fonte (D-05)
  fornecedor: string;
  cpfCnpj?: string;
  documento?: string;                   // número/tipo do documento
  valor: string;                        // signed canonical dot-decimal (D-07) — string, never number
  valorGlosa?: string;                  // same convention
  urlDocumento?: string;                // Senado nunca emite (0/3 anos)
}

export interface SyncResult {
  sucessos: number;
  erros: number;
  detalhes: string[];
  tempoExecucaoMs: number;
}

export interface SyncStats {
  parlamentares: number;
  votacoes: number;
  votos: number;
  discursos: number;
  proposicoes: number;
  tramitacoes: number;
  frequencias: number;
}