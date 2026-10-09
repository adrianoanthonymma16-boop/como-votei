/**
 * Adapter para API do Senado Federal (legis.senado.leg.br/dadosabertos + adm.senado.gov.br)
 * Converte dados da API oficial para tipos normalizados
 */

import { senadoClient } from './http-client';
import { createHash } from 'crypto';
import { extrairTemaPrincipal } from '../temas';
import type {
  ParlamentarNormalizado,
  VotacaoNormalizada,
  VotoNormalizado,
  DiscursoNormalizado,
  ProposicaoComTramitacoes,
  TramitacaoNormalizada,
  FrequenciaNormalizada,
  SyncStats,
} from './types';

const SENADO_LEGIS_BASE = 'https://legis.senado.leg.br/dadosabertos';
const SENADO_ADM_BASE = 'https://adm.senado.gov.br/adm-dadosabertos/api/v1';

// Helper para construir URLs com query parameters
function buildUrl(base: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

interface SenadorLegis {
  IdentificacaoParlamentar: {
    CodigoParlamentar: number;
    NomeParlamentar: string;
    NomeCompletoParlamentar?: string;
    SiglaPartidoParlamentar: string;
    UfParlamentar: string;
    UrlFotoParlamentar?: string;
    EmailParlamentar?: string;
    Telefones?: { Telefone: Array<{ NumeroTelefone: string }> | { NumeroTelefone: string } };
  };
  Mandatos?: { Mandato: Array<any> | any };
}

interface VotacaoSenado {
  codigoSessaoVotacao: number;
  codigoSessao: number;
  dataSessao: string;
  identificacao: string;
  descricaoVotacao?: string;
  ementa?: string;
}

interface VotoSenado {
  votos?: Array<{
    siglaVotoParlamentar: string;
  }>;
}

interface DiscursoSenado {
  DataPronunciamento?: string;
  Data?: string;
  TipoPronunciamento?: string;
  Tipo?: string;
  Sumario?: string;
  Resumo?: string;
  Indexacao?: string;
  Transcricao?: string;
  Texto?: string;
  UrlTexto?: string;
  UrlAudio?: string;
  UrlVideo?: string;
}

interface DespesaSenado {
  ano: number;
  mes: number;
  tipoDespesa: string;
  data: string;
  valorReembolsado: number;
  fornecedor: string;
  cpfCnpj: string;
  documento: string;
  tipoDocumento?: string;
  detalhamento?: string;
  nomeSenador: string;
  codSenador: number;
}

function normalizarNome(nome: string): string {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function mapTipoVotoSenado(sigla: string): 'SIM' | 'NAO' | 'ABSTENCAO' | 'ARTICULACAO' | 'OBSTRUCAO' | 'AUSENTE' | 'LICENCA' | 'MISSAO' {
  const siglaNorm = normalizarNome(sigla);
  
  const siglasSim = new Set(['SIM', 'SI', 'VS', 'VOTO DO PRESIDENTE', 'PRESIDENTE (ART. 51 RISF)']);
  const siglasNao = new Set(['NAO', 'NÃO']);
  const siglasAbstencao = new Set(['ABSTENCAO', 'ABSTENÇÃO']);
  const siglasArticulacao = new Set(['ARTICULACAO', 'ARTICULAÇÃO', 'P-NRV', 'P-OD']);
  const siglasObstrucao = new Set(['OB', 'OBSTRUCAO', 'OBSTRUÇÃO']);
  const siglasLicenca = new Set(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'LA', 'LAF', 'LAP', 'LC', 'LCS', 'LEG', 'LG', 'LGA', 'LL', 'LN', 'LP', 'LPA', 'LS', 'LSP', 'AFO', 'AUS', 'AP', 'MIS', 'MER', 'REP', 'DJ', 'GR', 'CAS', 'IL', 'EP', 'EPR', 'RET', 'REN', 'TER', 'PER', 'IMP', 'NA']);
  const siglasMissao = new Set(['MISSAO', 'MISSÃO']);
  
  if (siglasSim.has(siglaNorm)) return 'SIM';
  if (siglasNao.has(siglaNorm)) return 'NAO';
  if (siglasAbstencao.has(siglaNorm)) return 'ABSTENCAO';
  if (siglasArticulacao.has(siglaNorm)) return 'ARTICULACAO';
  if (siglasObstrucao.has(siglaNorm)) return 'OBSTRUCAO';
  if (siglasLicenca.has(siglaNorm)) return 'LICENCA';
  if (siglasMissao.has(siglaNorm)) return 'MISSAO';
  return 'AUSENTE';
}

function mapTipoDiscursoSenado(tipo: string): 'ORDEM_DIA' | 'PLENARIO' | 'COMISSAO' | 'LIDERANCA' | 'OUTRO' {
  const t = normalizarNome(tipo);
  if (t.includes('ORDEM DIA') || t.includes('ORDEM_DO_DIA')) return 'ORDEM_DIA';
  if (t.includes('PLENARIO') || t.includes('PLENÁRIO') || t.includes('PLEN')) return 'PLENARIO';
  if (t.includes('COMISSAO') || t.includes('COMISSÃO')) return 'COMISSAO';
  if (t.includes('LIDERANCA') || t.includes('LIDERANÇA')) return 'LIDERANCA';
  return 'OUTRO';
}

function toDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  // Handle various formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,           // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/,         // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})T/,           // ISO datetime
  ];

  for (const fmt of formats) {
    const match = dateStr.match(fmt);
    if (match) {
      if (fmt === formats[1]) {
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? undefined : d;
    }
  }
  // "YYYY-MM-DD HH:MM:SS" (movimentações do Senado)
  const espacado = dateStr.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(:\d{2})?)$/);
  if (espacado) {
    const d = new Date(`${espacado[1]}T${espacado[2]}`);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function hashString(input: string): string {
  return createHash('md5').update(input).digest('hex').slice(0, 12);
}

/** Normaliza singleton-ou-lista da API do Senado (retorna objeto quando há 1 item). */
function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/** idExterno determinístico para discursos (upsert idempotente, sem duplicatas). */
function makeDiscursoIdExterno(senadorIdExterno: string, data?: string, tipo?: string, resumo?: string): string {
  const base = [data || '', tipo || '', (resumo || '').slice(0, 200)].join('|');
  return `SENADO-${senadorIdExterno}-${hashString(base)}`;
}

/** idExterno determinístico para tramitações do Senado. */
function makeTramitacaoIdExterno(materiaCodigo: string, data: string, sigla: string, descricao: string): string {
  return `SENADO-${materiaCodigo}-TRAM-${hashString([data, sigla, descricao].join('|'))}`;
}

/**
 * Mapeia situação do Senado (DescricaoSituacao de /materia/situacaoatual +
 * flag Tramitando) para o enum local. Mesma semântica do mapa da Câmara:
 * ordem importa — terminais/aprovadas primeiro, genéricos por último.
 */
export function mapStatusProposicaoSenado(
  descricaoSituacao?: string,
  tramitando?: string
): ProposicaoComTramitacoes['status'] {
  const tram = (tramitando || '').toLowerCase();
  const emTramitacao = tram.startsWith('sim') || tram === 's';
  if (!descricaoSituacao) return emTramitacao ? 'EM_TRAMITACAO' : 'APRESENTADA';

  const t = descricaoSituacao
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    t.includes('norma juridica') ||
    t.includes('sancao') ||
    t.includes('sancionada') ||
    t.includes('promulg') ||
    t.includes('transformada em norma')
  ) {
    return 'SANCIONADA';
  }
  if (t.includes('veto') || t.includes('vetad')) return 'VETADA';
  if (t.includes('retirad')) return 'RETIRADA';
  if (t.includes('aprovad')) {
    // "Aprovada e remetida à Câmara" = matéria do Senado aprovada NO Senado
    // (vai à revisão). Só é APROVADA_CAMARA quando aprovada PELA Câmara.
    const remetida =
      t.includes('remet') || t.includes('remessa') || t.includes('enviad') || t.includes('envio');
    if (t.includes('camara') && !remetida) return 'APROVADA_CAMARA';
    return 'APROVADA_SENADO';
  }
  if (
    t.includes('rejeitad') ||
    t.includes('recusad') ||
    t.includes('prejudic') ||
    t.includes('arquiv') ||
    t.includes('tramitacao encerrada') ||
    t.includes('encerrada')
  ) {
    return 'ARQUIVADA';
  }
  if (t.includes('apresentad')) return 'APRESENTADA';
  return emTramitacao ? 'EM_TRAMITACAO' : 'ARQUIVADA';
}

export class SenadoAdapter {
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

  async *paginate<T>(url: string, params: Record<string, string> = {}): AsyncGenerator<T[]> {
    const queryParams = new URLSearchParams(params);
    let currentUrl = `${url}?${queryParams.toString()}`;
    
    while (currentUrl) {
      const response = await senadoClient.get(currentUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar ${currentUrl}: ${response.status}`);
      }

      const data = await response.json();
      
      // Diferentes APIs retornam estruturas diferentes
      let items: T[] = [];
      let nextUrl: string | null = null;
      
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
        nextUrl = data.links?.next || data.next || null;
      } else if (data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar) {
        const parl = data.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
        items = Array.isArray(parl) ? parl : [parl];
      } else if (data.DetalheParlamentar?.Parlamentar) {
        items = [data.DetalheParlamentar.Parlamentar];
      }
      
      if (items.length > 0) {
        yield items;
      }
      
      if (!nextUrl || items.length === 0) break;
      currentUrl = nextUrl;
    }
  }

  // ============ PARLAMENTARES ============

  async fetchSenadores(): Promise<ParlamentarNormalizado[]> {
    const response = await senadoClient.get(`${SENADO_LEGIS_BASE}/senador/lista/atual`);
    if (!response.ok) throw new Error('Erro ao buscar senadores');
    
    const data = await response.json();
    const parl = data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar;
    const listaRaw = Array.isArray(parl) ? parl : (parl ? [parl] : []);
    
    const senadores: ParlamentarNormalizado[] = listaRaw.map((p: SenadorLegis) => {
      const id = p.IdentificacaoParlamentar;
      const telefone = id.Telefones?.Telefone 
        ? (Array.isArray(id.Telefones.Telefone) ? id.Telefones.Telefone[0] : id.Telefones.Telefone).NumeroTelefone
        : '';
      
      return {
        idExterno: String(id.CodigoParlamentar),
        nome: id.NomeParlamentar,
        nomeCivil: id.NomeCompletoParlamentar || id.NomeParlamentar,
        casa: 'SENADO',
        partidoSigla: id.SiglaPartidoParlamentar,
        ufSigla: id.UfParlamentar,
        legislatura: 57, // Senado não tem legislatura como Câmara
        fotoUrl: id.UrlFotoParlamentar,
        email: id.EmailParlamentar,
        telefone,
        situacao: 'EXERCICIO',
      };
    });
    
    this.stats.parlamentares += senadores.length;
    return senadores;
  }

  async fetchSenador(id: string): Promise<ParlamentarNormalizado | null> {
    try {
      const response = await senadoClient.get(`${SENADO_LEGIS_BASE}/senador/${id}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      const p = data.DetalheParlamentar?.Parlamentar;
      if (!p) return null;
      
      const idObj = p.IdentificacaoParlamentar;
      const telefone = idObj.Telefones?.Telefone 
        ? (Array.isArray(idObj.Telefones.Telefone) ? idObj.Telefones.Telefone[0] : idObj.Telefones.Telefone).NumeroTelefone
        : '';
      
      return {
        idExterno: String(idObj.CodigoParlamentar),
        nome: idObj.NomeParlamentar,
        nomeCivil: idObj.NomeCompletoParlamentar || idObj.NomeParlamentar,
        casa: 'SENADO',
        partidoSigla: idObj.SiglaPartidoParlamentar,
        ufSigla: idObj.UfParlamentar,
        legislatura: 57,
        fotoUrl: idObj.UrlFotoParlamentar,
        email: idObj.EmailParlamentar,
        telefone,
        situacao: 'EXERCICIO',
      };
    } catch {
      return null;
    }
  }

  // ============ VOTAÇÕES ============

  private getTrimestres(ano: number): Array<{ inicio: string; fim: string }> {
    const hoje = new Date();
    const trimestres = [[1, 3], [4, 6], [7, 9], [10, 12]];
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

  async *fetchVotacoesSenador(senadorIdExterno: string, ano: number): AsyncGenerator<VotacaoNormalizada[]> {
    const votacoes: VotacaoNormalizada[] = [];
    
    for await (const page of this.paginate(`${SENADO_LEGIS_BASE}/votacao`, {
      codigoParlamentar: senadorIdExterno,
      dataInicio: `${ano}-01-01`,
      dataFim: `${ano}-12-31`,
    })) {
      for (const v of page as VotacaoSenado[]) {
        votacoes.push({
          idExterno: String(v.codigoSessaoVotacao),
          casa: 'SENADO',
          legislatura: 57,
          sessao: v.codigoSessao,
          numero: 0,
          data: toDate(v.dataSessao)!,
          descricao: v.identificacao || 'Votação',
          ementa: v.descricaoVotacao || v.ementa,
          tema: extrairTemaPrincipal(v.descricaoVotacao || v.ementa || ''),
          resultado: undefined,
          quorum: undefined,
        });
      }
    }
    
    if (votacoes.length > 0) {
      this.stats.votacoes += votacoes.length;
      yield votacoes;
    }
  }

  async fetchVotosVotacao(senadorIdExterno: string, votacaoIdExterno: string): Promise<VotoNormalizado[]> {
    try {
      const url = buildUrl(`${SENADO_LEGIS_BASE}/votacao`, {
        codigoParlamentar: senadorIdExterno,
        codigoSessaoVotacao: votacaoIdExterno,
      });
      const response = await senadoClient.get(url);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const registros = Array.isArray(data) ? data : (data.data || []);
      const rec = registros.find((r: any) => String(r.codigoSessaoVotacao) === votacaoIdExterno);
      
      if (!rec?.votos) return [];
      
      return rec.votos.map((v: any) => ({
        parlamentarIdExterno: senadorIdExterno,
        votacaoIdExterno,
        tipo: mapTipoVotoSenado(v.siglaVotoParlamentar),
      }));
    } catch {
      return [];
    }
  }

  // ============ DISCURSOS ============

  async *fetchDiscursosSenador(senadorIdExterno: string, ano: number): AsyncGenerator<DiscursoNormalizado[]> {
    const discursos: DiscursoNormalizado[] = [];
    
    try {
      const url = buildUrl(`${SENADO_LEGIS_BASE}/senador/${senadorIdExterno}/discursos`, {
        dataInicio: `${ano}-01-01`,
        dataFim: `${ano}-12-31`,
      });
      const response = await senadoClient.get(url);
      
      if (!response.ok) {
        if (discursos.length > 0) yield discursos;
        return;
      }
      
      const data = await response.json();
      const raiz = data.DiscursosParlamentar || data || {};
      const brutos: DiscursoSenado[] = [];
      
      const diretos = raiz.Discursos?.Discurso;
      if (Array.isArray(diretos)) brutos.push(...diretos);
      else if (diretos) brutos.push(diretos);
      
      const pron = raiz.Parlamentar?.Pronunciamentos;
      if (Array.isArray(pron)) brutos.push(...pron);
      else if (pron?.Pronunciamento) {
        if (Array.isArray(pron.Pronunciamento)) brutos.push(...pron.Pronunciamento);
        else brutos.push(pron.Pronunciamento);
      }
      
      for (const d of brutos) {
        const textoCompleto = d.Transcricao || d.Texto || d.Sumario || d.Resumo || d.Indexacao || '';
        const dataStr = d.DataPronunciamento || d.Data;
        discursos.push({
          idExterno: makeDiscursoIdExterno(senadorIdExterno, dataStr, d.TipoPronunciamento || d.Tipo, textoCompleto),
          parlamentarIdExterno: senadorIdExterno,
          casa: 'SENADO',
          tipo: mapTipoDiscursoSenado(d.TipoPronunciamento || d.Tipo || ''),
          data: toDate(dataStr)!,
          hora: undefined,
          resumo: textoCompleto.substring(0, 1000),
          urlOriginal: d.UrlTexto || '',
          tema: extrairTemaPrincipal(textoCompleto),
          duracaoSegundos: undefined,
        });
      }
    } catch (error) {
      console.warn(`[SenadoAdapter] Erro ao buscar discursos ${senadorIdExterno}:`, error);
    }
    
    if (discursos.length > 0) {
      this.stats.discursos += discursos.length;
      yield discursos;
    }
  }

  // ============ PROPOSIÇÕES (Autoria) ============
  //
  // Fontes oficiais (verificadas em 2026-10-08, respostas JSON ativas):
  //  - Lista: GET /senador/{codigo}/autorias → MateriasAutoriaParlamentar.
  //    Parlamentar.Autorias.Autoria[] { Materia: {Codigo, Sigla, Numero, Ano,
  //    Ementa, Data}, IndicadorAutorPrincipal: 'Sim'|'Não' }
  //  - Status: GET /materia/situacaoatual/{codigo} → SituacaoAtualMateria.
  //    Materias.Materia[].SituacaoAtual.Autuacoes.Autuacao[].Situacoes.
  //    Situacao[] {DataSituacao, CodigoSituacao, SiglaSituacao,
  //    DescricaoSituacao} + flag Tramitando ('Sim'|'Nao')
  //  - Trâmites: GET /materia/movimentacoes/{codigo} → MovimentacaoMateria.
  //    Materia.Autuacoes.Autuacao[].HistoricoSituacoes.Situacao[]
  //
  // RISCO (reuse-first, documentado): os serviços v3/v7 acima estão marcados
  // como depreciados (DataDesativacaoCompleta 2026-02-01, substituto
  // /dadosabertos/processo/{idProcesso}) mas respondem normalmente hoje. Se
  // retornarem 404/410, migrar para o substituto usando IdentificacaoProcesso.
  // Rate limit Senado: 10 req/s (429). O enriquecimento usa fetch direto com
  // concorrência limitada (lote de 8) e backoff em 429 — fora da fila serial.

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchJsonDireto(url: string, tentativas = 3): Promise<any | null> {
    for (let t = 0; t <= tentativas; t++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'ComoVotei/1.0 (Transparência Legislativa; +https://comovotei.vercel.app)',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(30_000),
        });
        if (response.status === 429) {
          await this.sleep(2000 * (t + 1));
          continue;
        }
        if (response.status === 404 || response.status === 410) {
          console.warn(`[SenadoAdapter] Serviço depreciado sem substituto direto: ${url} (${response.status})`);
          return null;
        }
        if (!response.ok) return null;
        return await response.json();
      } catch {
        if (t === tentativas) return null;
        await this.sleep(1000 * (t + 1));
      }
    }
    return null;
  }

  /** Situação atual de uma matéria (público p/ backfill e jobs). */
  async fetchSituacaoMateria(
    codigo: string
  ): Promise<{ descricao?: string; sigla?: string; tramitando?: string }> {
    const data = await this.fetchJsonDireto(`${SENADO_LEGIS_BASE}/materia/situacaoatual/${codigo}`);
    try {
      const materias = asArray<any>(data?.SituacaoAtualMateria?.Materias?.Materia);
      const mat = materias.find((m) => String(m?.Codigo) === codigo) || materias[0];
      const autuacoes = asArray<any>(mat?.SituacaoAtual?.Autuacoes?.Autuacao);
      const situacoes = autuacoes.flatMap((a) => asArray<any>(a?.Situacoes?.Situacao));
      const atual = situacoes[situacoes.length - 1];
      return {
        descricao: atual?.DescricaoSituacao,
        sigla: atual?.SiglaSituacao,
        tramitando: mat?.Tramitando,
      };
    } catch {
      return {};
    }
  }

  private async fetchMovimentacoesMateria(codigo: string): Promise<TramitacaoNormalizada[]> {
    const data = await this.fetchJsonDireto(`${SENADO_LEGIS_BASE}/materia/movimentacoes/${codigo}`);
    const tramitacoes: TramitacaoNormalizada[] = [];
    try {
      const autuacoes = asArray<any>(data?.MovimentacaoMateria?.Materia?.Autuacoes?.Autuacao);
      for (const aut of autuacoes) {
        for (const s of asArray<any>(aut?.HistoricoSituacoes?.Situacao)) {
          const dataSit = toDate(s?.DataSituacao);
          if (!dataSit) continue;
          tramitacoes.push({
            proposicaoIdExterno: `SENADO-${codigo}`,
            data: dataSit,
            descricao: s.DescricaoSituacao || s.SiglaSituacao || 'Movimentação',
            orgao: undefined,
            situacao: s.SiglaSituacao || 'OUTRA',
          });
          if (tramitacoes.length >= 100) break;
        }
        if (tramitacoes.length >= 100) break;
      }
    } catch (error) {
      console.warn(`[SenadoAdapter] Erro ao parsear movimentações ${codigo}:`, error);
    }
    return tramitacoes;
  }

  async *fetchProposicoesSenador(
    senadorIdExterno: string,
    ano: number
  ): AsyncGenerator<ProposicaoComTramitacoes[]> {
    const response = await senadoClient.get(`${SENADO_LEGIS_BASE}/senador/${senadorIdExterno}/autorias`);
    if (!response.ok) return;

    let lista: any[] = [];
    try {
      const data = await response.json();
      lista = asArray<any>(data?.MateriasAutoriaParlamentar?.Parlamentar?.Autorias?.Autoria);
    } catch (error) {
      console.warn(`[SenadoAdapter] Erro ao buscar autorias ${senadorIdExterno}:`, error);
      return;
    }

    // A listagem retorna TODO o histórico — filtra o ano do sync (recorte 3 anos do MVP).
    const doAno = lista.filter((a) => String(a?.Materia?.Ano) === String(ano));
    if (doAno.length === 0) return;

    const proposicoes: ProposicaoComTramitacoes[] = [];
    const LOTE = 8; // concorrência limitada (rate limit 10 req/s + backoff em 429)
    for (let i = 0; i < doAno.length; i += LOTE) {
      await Promise.all(
        doAno.slice(i, i + LOTE).map(async (a) => {
          const m = a?.Materia || {};
          const codigo = String(m.Codigo || '');
          if (!codigo) return;
          const autorPrincipal = normalizarNome(a.IndicadorAutorPrincipal || '').startsWith('SIM');

          const [sit, movs] = await Promise.all([
            this.fetchSituacaoMateria(codigo),
            this.fetchMovimentacoesMateria(codigo),
          ]);

          const ementa = m.Ementa || '';
          proposicoes.push({
            idExterno: `SENADO-${codigo}`,
            parlamentarIdExterno: senadorIdExterno,
            casa: 'SENADO',
            tipo: m.Sigla || 'MAT',
            numero: parseInt(m.Numero, 10) || 0,
            ano: parseInt(m.Ano, 10) || ano,
            ementa,
            autorPrincipal,
            status: mapStatusProposicaoSenado(sit.descricao, sit.tramitando),
            dataApresentacao: toDate(m.Data) || new Date(`${ano}-01-01`),
            urlOriginal: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigo}`,
            tema: extrairTemaPrincipal(ementa),
            tramitacoes: movs,
          });
        })
      );
    }

    if (proposicoes.length > 0) {
      this.stats.proposicoes += proposicoes.length;
      this.stats.tramitacoes += proposicoes.reduce((n, p) => n + p.tramitacoes.length, 0);
      yield proposicoes;
    }
  }

  // ============ FREQUÊNCIA ============

  async fetchFrequencia(senadorIdExterno: string, ano: number): Promise<FrequenciaNormalizada | null> {
    try {
      const url = buildUrl(`${SENADO_LEGIS_BASE}/votacao`, {
        codigoParlamentar: senadorIdExterno,
        dataInicio: `${ano}-01-01`,
        dataFim: `${ano}-12-31`,
      });
      const response = await senadoClient.get(url);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const registros = Array.isArray(data) ? data : (data.data || []);
      
      const SIGLA_PRESENCA = new Set([
        'VOTOU', 'VO', 'SIM', 'NAO', 'ABSTENCAO', 'P-NRV', 'P-OD', 'OB', 'SF', 'PSF', 'PR', 'PS',
        'SI', 'VS', 'VOTO DO PRESIDENTE', 'PRESIDENTE (ART. 51 RISF)',
      ]);
      const SIGLA_FALTA_JUSTIFICADA = new Set([
        'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'LA', 'LAF', 'LAP', 'LC', 'LCS', 'LEG', 'LG',
        'LGA', 'LL', 'LN', 'LP', 'LPA', 'LS', 'LSP', 'AFO', 'AUS', 'AP', 'MIS', 'MER', 'REP',
        'DJ', 'GR', 'CAS', 'IL', 'EP', 'EPR', 'RET', 'REN', 'TER', 'PER', 'IMP', 'NA',
      ]);
const SIGLA_FALTA_INJUSTIFICADA = new Set(['NCOM', 'NR']);
       
      const normalizarSigla = (sigla: string) => {
        return String(sigla || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .trim();
      }
      
      let presencas = 0;
      let faltasJustificadas = 0;
      let faltasInjustificadas = 0;
      let outras = 0;
      
      for (const rec of registros) {
        const voto = rec.votos && rec.votos[0] ? rec.votos[0].siglaVotoParlamentar : null;
        const sigla = normalizarSigla(voto);
        if (!sigla) { outras++; continue; }
        if (SIGLA_PRESENCA.has(sigla)) presencas++;
        else if (SIGLA_FALTA_JUSTIFICADA.has(sigla)) faltasJustificadas++;
        else if (SIGLA_FALTA_INJUSTIFICADA.has(sigla)) faltasInjustificadas++;
        else outras++;
      }
      
      const total = presencas + faltasJustificadas + faltasInjustificadas + outras;
      
      this.stats.frequencias++;
      
      return {
        parlamentarIdExterno: senadorIdExterno,
        ano,
        totalSessoes: registros.length,
        presencas,
        faltasJustificadas,
        faltasInjustificadas,
        taxaPresenca: total > 0 ? Math.round((presencas / total) * 10000) / 100 : 0,
      };
    } catch (error) {
      console.warn(`[SenadoAdapter] Erro ao buscar frequência ${senadorIdExterno}:`, error);
      return null;
    }
  }
}