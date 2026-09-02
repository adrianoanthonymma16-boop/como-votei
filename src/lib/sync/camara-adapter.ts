/**
 * Adapter para API da Câmara dos Deputados (dadosabertos.camara.leg.br)
 * Converte dados da API oficial para tipos normalizados
 */

import { camaraClient } from './http-client';
import type {
  ParlamentarNormalizado,
  PartidoNormalizado,
  UfNormalizada,
  VotacaoNormalizada,
  VotoNormalizado,
  DiscursoNormalizado,
  ProposicaoNormalizada,
  TramitacaoNormalizada,
  FrequenciaNormalizada,
  SyncStats,
} from './types';

const CAMARA_API_BASE = process.env.CAMARA_API_BASE || 'https://dadosabertos.camara.leg.br/api/v2';
const ITENS_POR_PAGINA = 100;

interface CamaraDeputado {
  id: number;
  nome: string;
  nomeCivil?: string;
  cpf?: string;
  siglaPartido: string;
  siglaUf: string;
  urlFoto?: string;
  email?: string;
  telefone?: string;
  situacao?: string;
  dataNascimento?: string;
  naturalidade?: string;
  ufNaturalidade?: string;
  idLegislatura?: number;
}

interface CamaraVotacao {
  id: number;
  data: string;
  descricao: string;
  ementa?: string;
  siglaOrgao: string;
  aprovacao?: number;
  proposicaoObjeto?: string;
  objetosPossiveis?: Array<{
    id: number;
    siglaTipo: string;
    numero: number;
    ano: number;
    ementa: string;
  }>;
}

interface CamaraVoto {
  deputado_: { id: number };
  tipoVoto: string;
}

interface CamaraDiscurso {
  id: number;
  dataHoraInicio: string;
  tipoDiscurso: string;
  sumario?: string;
  transcricao?: string;
  urlTexto?: string;
  urlAudio?: string;
  urlVideo?: string;
  keywords?: string;
}

interface CamaraProposicao {
  id: number;
  siglaTipo: string;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao: string;
  autor?: { nome: string; id: number };
  autores?: Array<{ nome: string; id: number }>;
  statusProposicao?: { descricaoSituacao: string; descricaoTramitacao: string };
  tramitacoes?: Array<{
    data: string;
    descricao: string;
    orgao?: string;
    situacao: string;
  }>;
}

interface CamaraPartido {
  id: number;
  sigla: string;
  nome: string;
}

function mapTipoVoto(camaraVoto: string): VotoNormalizado['tipo'] {
  const mapa: Record<string, VotoNormalizado['tipo']> = {
    'Sim': 'SIM',
    'Não': 'NAO',
    'Abstenção': 'ABSTENCAO',
    'Articulação': 'ARTICULACAO',
    'Obstrução': 'OBSTRUCAO',
    'Ausente': 'AUSENTE',
    'Licença': 'LICENCA',
    'Missão': 'MISSAO',
  };
  return mapa[camaraVoto] || 'AUSENTE';
}

function mapTipoDiscurso(camaraTipo: string): DiscursoNormalizado['tipo'] {
  const mapa: Record<string, DiscursoNormalizado['tipo']> = {
    'Discurso em Ordem do Dia': 'ORDEM_DIA',
    'Discurso em Plenário': 'PLENARIO',
    'Discurso em Comissão': 'COMISSAO',
    'Pronunciamento de Liderança': 'LIDERANCA',
  };
  return mapa[camaraTipo] || 'OUTRO';
}

function mapStatusProposicao(camaraStatus?: string): ProposicaoNormalizada['status'] {
  if (!camaraStatus) return 'APRESENTADA';
  const mapa: Record<string, ProposicaoNormalizada['status']> = {
    'Apresentada': 'APRESENTADA',
    'Em Tramitação': 'EM_TRAMITACAO',
    'Aprovada na Câmara': 'APROVADA_CAMARA',
    'Aprovada no Senado': 'APROVADA_SENADO',
    'Sancionada': 'SANCIONADA',
    'Vetada': 'VETADA',
    'Arquivada': 'ARQUIVADA',
    'Retirada': 'RETIRADA',
  };
  return mapa[camaraStatus] || 'EM_TRAMITACAO';
}

function extractTema(texto: string): string | undefined {
  const temas = [
    'economia', 'saúde', 'educação', 'direitos civis', 'segurança pública',
    'meio ambiente', 'trabalho', 'previdência', 'infraestrutura', 'agricultura',
    'tecnologia', 'cultura', 'desenvolvimento regional', 'direitos sociais'
  ];
  const lower = texto.toLowerCase();
  for (const tema of temas) {
    if (lower.includes(tema)) return tema;
  }
  return undefined;
}

function toDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d;
}

function toDateOnly(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  // Handle "YYYY-MM-DD" or "DD/MM/YYYY"
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  }
  return toDate(dateStr);
}

export class CamaraAdapter {
  private stats: SyncStats = {
    parlamentares: 0,
    votacoes: 0,
    votos: 0,
    discursos: 0,
    proposicoes: 0,
    tramitacoes: 0,
    frequencias: 0,
  };

  getStats(): SyncStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      parlamentares: 0,
      votacoes: 0,
      votos: 0,
      discursos: 0,
      proposicoes: 0,
      tramitacoes: 0,
      frequencias: 0,
    };
  }

  async *paginate<T>(endpoint: string, params: Record<string, string | number> = {}): AsyncGenerator<T[]> {
    let pagina = 1;
    const baseParams = { itens: ITENS_POR_PAGINA, ordenarPor: 'id', ordem: 'ASC', ...params };

    while (true) {
      const queryParams = new URLSearchParams();
      Object.entries({ ...baseParams, pagina }).forEach(([k, v]) => queryParams.set(k, String(v)));
      
      const response = await camaraClient.get(`${CAMARA_API_BASE}/${endpoint}?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar ${endpoint}: ${response.status}`);
      }

      const data = await response.json();
      const items = data.dados || [];
      
      if (items.length === 0) break;
      
      yield items;
      
      const links = data.links || [];
      const hasNext = links.some((l: any) => l.rel === 'next');
      if (!hasNext) break;
      
      pagina++;
    }
  }

  // ============ PARLAMENTARES ============
  
  async fetchDeputados(legislatura = 57): Promise<ParlamentarNormalizado[]> {
    const deputados: ParlamentarNormalizado[] = [];
    
    for await (const page of this.paginate('deputados', { 
      idLegislatura: legislatura,
      ordenarPor: 'nome',
    })) {
      for (const dep of page as CamaraDeputado[]) {
        deputados.push({
          idExterno: String(dep.id),
          cpf: dep.cpf,
          nome: dep.nome,
          nomeCivil: dep.nomeCivil,
          casa: 'CAMARA',
          partidoSigla: dep.siglaPartido,
          ufSigla: dep.siglaUf,
          legislatura: dep.idLegislatura || legislatura,
          fotoUrl: dep.urlFoto,
          email: dep.email,
          telefone: dep.telefone,
          situacao: dep.situacao,
          dataNascimento: toDate(dep.dataNascimento),
          naturalidade: dep.naturalidade,
          ufNaturalidade: dep.ufNaturalidade,
        });
      }
    }
    
    this.stats.parlamentares += deputados.length;
    return deputados;
  }

  async fetchPartidos(): Promise<PartidoNormalizado[]> {
    const response = await camaraClient.get(`${CAMARA_API_BASE}/partidos?itens=100&ordenarPor=sigla`);
    if (!response.ok) throw new Error('Erro ao buscar partidos');
    const data = await response.json();
    return (data.dados || []).map((p: CamaraPartido) => ({
      sigla: p.sigla,
      nome: p.nome,
    }));
  }

  // ============ VOTAÇÕES ============

  async *fetchVotacoes(ano: number): AsyncGenerator<VotacaoNormalizada[]> {
    const fatias = this.getTrimestres(ano);
    
    for (const fatia of fatias) {
      const votacoes: VotacaoNormalizada[] = [];
      
      for await (const page of this.paginate('votacoes', {
        dataInicio: fatia.inicio,
        dataFim: fatia.fim,
        ordem: 'DESC',
        ordenarPor: 'dataHoraRegistro',
      })) {
        for (const v of page as CamaraVotacao[]) {
          // Só votações de Plenário
          if (v.siglaOrgao !== 'PLEN') continue;
          
          const prop = v.objetosPossiveis?.[0];
          votacoes.push({
            idExterno: String(v.id),
            casa: 'CAMARA',
            legislatura: 57,
            sessao: undefined,
            numero: 0, // Não disponível direto
            data: toDate(v.data)!,
            descricao: v.descricao,
            ementa: v.ementa || prop?.ementa,
            tema: extractTema(v.descricao || prop?.ementa || ''),
            resultado: v.aprovacao === 1 ? 'APROVADA' : v.aprovacao === 0 ? 'REJEITADA' : undefined,
            quorum: undefined,
          });
        }
      }
      
      if (votacoes.length > 0) {
        this.stats.votacoes += votacoes.length;
        yield votacoes;
      }
    }
  }

  async fetchVotosVotacao(votacaoIdExterno: string): Promise<VotoNormalizado[]> {
    const response = await camaraClient.get(`${CAMARA_API_BASE}/votacoes/${votacaoIdExterno}/votos`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.dados || []).map((v: CamaraVoto) => ({
      parlamentarIdExterno: String(v.deputado_.id),
      votacaoIdExterno,
      tipo: mapTipoVoto(v.tipoVoto),
    }));
  }

  // ============ DISCURSOS ============

  async *fetchDiscursosDeputado(deputadoIdExterno: string, ano: number): AsyncGenerator<DiscursoNormalizado[]> {
    const discursos: DiscursoNormalizado[] = [];
    
    for await (const page of this.paginate(`deputados/${deputadoIdExterno}/discursos`, {
      dataInicio: `${ano}-01-01`,
      dataFim: `${ano}-12-31`,
      itens: ITENS_POR_PAGINA,
      ordenarPor: 'dataHoraInicio',
      ordem: 'DESC',
    })) {
      for (const d of page as CamaraDiscurso[]) {
        const textoCompleto = d.transcricao || d.sumario || '';
        discursos.push({
          idExterno: String(d.id),
          parlamentarIdExterno: deputadoIdExterno,
          casa: 'CAMARA',
          tipo: mapTipoDiscurso(d.tipoDiscurso),
          data: toDate(d.dataHoraInicio)!,
          hora: d.dataHoraInicio ? d.dataHoraInicio.substring(11, 19) : undefined,
          resumo: textoCompleto.substring(0, 1000),
          urlOriginal: d.urlTexto || `https://www.camara.leg.br/deputados/${deputadoIdExterno}/discursos/${d.id}`,
          tema: extractTema(textoCompleto),
          duracaoSegundos: undefined, // Não disponível na API
        });
      }
    }
    
    if (discursos.length > 0) {
      this.stats.discursos += discursos.length;
      yield discursos;
    }
  }

  // ============ PROPOSIÇÕES ============

  async *fetchProposicoesDeputado(deputadoIdExterno: string, ano: number): AsyncGenerator<ProposicaoNormalizada[]> {
    const proposicoes: ProposicaoNormalizada[] = [];
    
    // Buscar proposições onde o deputado é autor
    for await (const page of this.paginate('proposicoes', {
      idDeputadoAutor: deputadoIdExterno,
      ano,
      itens: ITENS_POR_PAGINA,
      ordenarPor: 'dataApresentacao',
      ordem: 'DESC',
    })) {
      for (const p of page as CamaraProposicao[]) {
        const autores = p.autores || (p.autor ? [p.autor] : []);
        const autorPrincipal = autores.some((a: any) => String(a.id) === deputadoIdExterno);
        
        proposicoes.push({
          idExterno: String(p.id),
          parlamentarIdExterno: deputadoIdExterno,
          casa: 'CAMARA',
          tipo: p.siglaTipo,
          numero: p.numero,
          ano: p.ano,
          ementa: p.ementa,
          autorPrincipal,
          status: mapStatusProposicao(p.statusProposicao?.descricaoSituacao),
          dataApresentacao: toDate(p.dataApresentacao)!,
          urlOriginal: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
          tema: extractTema(p.ementa),
        });

        // Tramitações
        if (p.tramitacoes) {
          for (const t of p.tramitacoes) {
            this.stats.tramitacoes++;
          }
        }
      }
    }
    
    if (proposicoes.length > 0) {
      this.stats.proposicoes += proposicoes.length;
      yield proposicoes;
    }
  }

  // ============ FREQUÊNCIA ============

  async fetchFrequencia(deputadoIdExterno: string, ano: number): Promise<FrequenciaNormalizada | null> {
    // A API da Câmara não expõe frequência direta
    // Fazer scraping da página de presença (conforme 5_seuPolitico)
    try {
      const url = `https://www.camara.leg.br/deputados/${deputadoIdExterno}/presenca-plenario/${ano}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ComoVotei/1.0' },
        signal: AbortSignal.timeout(30_000),
      });
      
      if (!response.ok) return null;
      
      const html = await response.text();
      
      const extrair = (rotulo: string) => {
        const i = html.indexOf(rotulo);
        if (i < 0) return null;
        const m = html.slice(i, i + 500).match(/<td>\s*([\d.,]+)/);
        return m ? parseInt(m[1].replace(/\./g, ''), 10) : null;
      };
      
      const presencas = extrair('Total de dias com presença nas sessões deliberativas');
      const faltasJustificadas = extrair('Total de dias com ausências justificadas em sessões deliberativas');
      const faltasInjustificadas = extrair('Total de dias com ausências não justificadas em sessões deliberativas');
      const totalSessoes = extrair('Total de dias com sessões deliberativas realizadas no período');
      
      if (presencas === null && faltasJustificadas === null && faltasInjustificadas === null) {
        return null;
      }
      
      const somatorio = (presencas || 0) + (faltasJustificadas || 0) + (faltasInjustificadas || 0);
      const total = totalSessoes ?? somatorio;
      
      this.stats.frequencias++;
      
      return {
        parlamentarIdExterno: deputadoIdExterno,
        ano,
        totalSessoes: total,
        presencas: presencas || 0,
        faltasJustificadas: faltasJustificadas || 0,
        faltasInjustificadas: faltasInjustificadas || 0,
        taxaPresenca: total > 0 ? Math.round(((presencas || 0) / total) * 10000) / 100 : 0,
      };
    } catch (error) {
      console.warn(`[CamaraAdapter] Erro ao buscar frequência ${deputadoIdExterno}:`, error);
      return null;
    }
  }

  // ============ UTILITÁRIOS ============

  private getTrimestres(ano: number): Array<{ inicio: string; fim: string }> {
    const hoje = new Date();
    const trimestres = [
      [1, 3], [4, 6], [7, 9], [10, 12],
    ];
    const fatias = [];
    
    for (const [ini, fim] of trimestres) {
      const dataInicio = new Date(ano, ini - 1, 1);
      const dataFim = new Date(ano, fim, 0);
      if (dataInicio > hoje) continue;
      const fimEfetivo = dataFim > hoje ? hoje : dataFim;
      if (fimEfetivo < dataInicio) continue;
      fatias.push({
        inicio: `${ano}-${String(ini).padStart(2, '0')}-01`,
        fim: `${ano}-${String(fimEfetivo.getMonth() + 1).padStart(2, '0')}-${String(fimEfetivo.getDate()).padStart(2, '0')}`,
      });
    }
    
    return fatias.reverse();
  }
}