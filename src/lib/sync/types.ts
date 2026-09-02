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