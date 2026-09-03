/**
 * Adapter para API da Câmara dos Deputados (dadosabertos.camara.leg.br)
 * Converte dados da API oficial para tipos normalizados
 */

import { camaraClient } from './http-client';
import { createHash } from 'crypto';
import { extrairTemaPrincipal } from '../temas';
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
  id?: number;
  dataHoraInicio?: string;
  dataHoraFim?: string;
  uriEvento?: string;
  faseEvento?: {
    titulo?: string;
    dataHoraInicio?: string | null;
    dataHoraFim?: string | null;
  };
  tipoDiscurso?: string;
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

function mapTipoDiscurso(camaraTipo?: string, faseTitulo?: string): DiscursoNormalizado['tipo'] {
  const texto = `${faseTitulo || ''} ${camaraTipo || ''}`.toLowerCase();
  if (texto.includes('ordem do dia')) return 'ORDEM_DIA';
  if (texto.includes('comiss')) return 'COMISSAO';
  if (texto.includes('liderança') || texto.includes('lideranca')) return 'LIDERANCA';
  if (texto.includes('plenário') || texto.includes('plenario')) return 'PLENARIO';
  return 'OUTRO';
}

function hashString(input: string): string {
  return createHash('md5').update(input).digest('hex').slice(0, 12);
}

// A API de discursos por deputado não expõe um id único. Montamos uma chave
// determinística a partir dos campos disponíveis para permitir upsert idempotente.
function makeDiscursoIdExterno(deputadoIdExterno: string, d: CamaraDiscurso): string {
  const base = [
    d.dataHoraInicio || '',
    d.tipoDiscurso || '',
    d.urlTexto || '',
    (d.sumario || '').slice(0, 200),
  ].join('|');
  return `CAMARA-${deputadoIdExterno}-${hashString(base)}`;
}

/**
 * Mapeia `statusProposicao.descricaoSituacao` da API da Câmara para o enum local.
 * Fundamentado em CAMARA_API_REFERENCE.md (/referencias/situacoesProposicao,
 * 99 estados oficiais) + amostragem de 100 proposições reais.
 *
 * Ordem importa: estados terminais e específicos primeiro, genéricos por último.
 * "Aguardando Sanção/Remessa à Sanção" conta como SANCIONADA: a proposição já
 * foi aprovada nas duas Casas (é o que alimenta o peso de PL aprovado).
 */
export function mapStatusProposicao(camaraStatus?: string): ProposicaoNormalizada['status'] {
  if (!camaraStatus) return 'APRESENTADA';
  const t = camaraStatus
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Convertida em norma / aguardando sanção ou promulgação
  if (t.includes('norma juridica')) return 'SANCIONADA';
  if (t.includes('sancao') || t.includes('sancionada')) return 'SANCIONADA';
  if (t.includes('promulgacao') || t.includes('promulgada')) return 'SANCIONADA';
  // Vetadas
  if (t.includes('veto') || t.includes('vetad')) return 'VETADA';
  // Aprovada na Câmara, aguardando o Senado
  if (
    t.includes('aprovada na camara') ||
    t.includes('apreciacao pelo senado') ||
    t.includes('enviada ao senado') ||
    t.includes('envio ao senado') ||
    t.includes('remessa ao senado')
  ) {
    return 'APROVADA_CAMARA';
  }
  if (t.includes('aprovada no senado')) return 'APROVADA_SENADO';
  // Arquivadas
  if (t.includes('arquiv') || t.includes('inativa sinopse')) return 'ARQUIVADA';
  // Retiradas pelo autor
  if (t.includes('retirad')) return 'RETIRADA';
  // Encerradas sem aprovação
  if (
    t.includes('recusad') ||
    t.includes('rejeitad') ||
    t.includes('prejudicialidade') ||
    t.includes('perdeu a eficacia') ||
    t.includes('devolvida')
  ) {
    return 'ARQUIVADA';
  }
  if (t.includes('apresentada')) return 'APRESENTADA';
  return 'EM_TRAMITACAO';
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
  
  /**
   * Normaliza `ultimoStatus.situacao` do detalhe do deputado para o mesmo
   * vocabulário usado no Senado (ex.: "Exercício" -> "EXERCICIO").
   * Referência: GET /referencias/situacoesDeputado (E=Exercício, L=Licença…).
   */
  private normalizarSituacao(situacao?: string): string | undefined {
    if (!situacao) return undefined;
    return situacao
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

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

    // A listagem /deputados NÃO retorna `situacao` — ela só existe no detalhe
    // /deputados/{id} (campo ultimoStatus.situacao). Enriquece em lotes para
    // não estourar rate limit; falha individual não derruba o sync.
    const lote = 5;
    for (let i = 0; i < deputados.length; i += lote) {
      await Promise.all(
        deputados.slice(i, i + lote).map(async (dep) => {
          try {
            const response = await camaraClient.get(`${CAMARA_API_BASE}/deputados/${dep.idExterno}`);
            if (!response.ok) return;
            const data = await response.json();
            const situacao = data?.dados?.ultimoStatus?.situacao;
            const normalizada = this.normalizarSituacao(situacao);
            if (normalizada) dep.situacao = normalizada;
          } catch {
            // mantém dados da listagem
          }
        })
      );
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
            tema: extrairTemaPrincipal(v.descricao || prop?.ementa || ''),
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
          idExterno: makeDiscursoIdExterno(deputadoIdExterno, d),
          parlamentarIdExterno: deputadoIdExterno,
          casa: 'CAMARA',
          tipo: mapTipoDiscurso(d.tipoDiscurso, d.faseEvento?.titulo),
          data: toDate(d.dataHoraInicio)!,
          hora: d.dataHoraInicio ? d.dataHoraInicio.substring(11, 16) : undefined,
          resumo: textoCompleto.substring(0, 1000),
          urlOriginal: d.urlTexto || `https://www.camara.leg.br/deputados/${deputadoIdExterno}/discursos/${d.id || ''}`,
          tema: extrairTemaPrincipal(textoCompleto),
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
      ordenarPor: 'id',
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
          tema: extrairTemaPrincipal(p.ementa),
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
        // Tolerante a <td> com atributos e valores em <strong>/percentuais:
        // pega o primeiro número inteiro da célula seguinte ao rótulo.
        const trecho = html.slice(i, i + 800);
        const m = trecho.match(/<td[^>]*>\s*(?:<strong>)?\s*([\d.]+)\s*(?:<\/strong>)?/);
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