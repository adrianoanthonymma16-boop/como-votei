/**
 * Classificador temático aprimorado para votações e proposições.
 *
 * Usa keywords por domínio com pesos para classificar textos legislativos
 * em temas significativos, muito mais abrangente que a busca simples anterior.
 */

export interface TemaClassificacao {
  tema: string;
  confianca: number; // 0-1
}

interface TemaRegra {
  nome: string;
  /** Palavras-chave que indicam este tema (case-insensitive) */
  keywords: string[];
  /** Peso de cada keyword encontrada */
  peso: number;
  /** Threshold mínimo de confiança para aceitar */
  threshold: number;
}

const REGRAS: TemaRegra[] = [
  {
    nome: 'saúde',
    keywords: [
      'saúde', 'saude', 'hospitalar', 'hospital', 'médico', 'medico', 'médica', 'medica',
      'enfermagem', 'farmac', 'medicamento', 'doença', 'doenca', 'epidemia', 'pandemia',
      'sus', 'sistema único de saúde', 'vacina', 'vacinação', 'vacinacao', 'publica',
      'odontol', 'ambulat', 'leito', 'internação', 'internacao', 'cirurgi',
      'patolog', 'câncer', 'cancer', 'aids', 'hiv', 'tuberculose', 'dengue',
      'mental', 'psicológ', 'psicolog', 'dependência química', 'saúde mental',
      'transplante', 'hemoderivados', 'laborat', 'diagnóst', 'diagnostic',
      'atenção básica', 'atencao basica', 'urgência', 'urgencia', 'emergênc',
    ],
    peso: 1,
    threshold: 0.15,
  },
  {
    nome: 'educação',
    keywords: [
      'educação', 'educacao', 'escolar', 'escola', 'professor', 'magistério',
      'magisterio', 'ensino', 'pedagog', 'currículo', 'curriculo', 'universidade',
      'federal', 'investigação', 'pesquisa científica', 'ciencia', 'cnpc',
      'mec', 'secretaria de educação', 'estudante', 'aluno', 'bibliotec',
      'creche', 'pré-escola', 'pre-escola', 'eja', 'educação infantil',
      'ensino médio', 'ensino medio', 'ensino superior', 'técnico', 'tecnico',
      'bolsa', 'auxílio', 'auxilio', 'vestibular', 'enem', 'sisu',
    ],
    peso: 1,
    threshold: 0.15,
  },
  {
    nome: 'economia',
    keywords: [
      'economi', 'fiscal', 'tributár', 'tributario', 'imposto', 'impostos',
      'receita', 'despesa', 'orçamento', 'orcamento', 'banco central',
      'câmbio', 'cambio', 'moeda', 'inflação', 'inflacao', 'selic',
      'divida', 'dívida', 'crédito', 'credito', 'financ', 'banco',
      'banco do brasil', 'caixa econômica', 'fazenda', 'ministro da fazenda',
      'cvm', 'b3', 'bolsa', 'ação', 'investimento',
      'poupança', 'poupanca', 'taxa', 'alíquota', 'aliquota', 'irpf',
      'ipva', 'icms', 'pis', 'cofins', 'csll', 'contribuição',
      'regulament', 'concessão', 'concessao', 'monopólio', 'monopolio',
      'mercado', 'comércio', 'comercio', 'importação', 'importacao',
      'exportação', 'exportacao', 'tarif', 'preço', 'preco',
    ],
    peso: 1,
    threshold: 0.12,
  },
  {
    nome: 'meio ambiente',
    keywords: [
      'meio ambiente', 'ambiental', 'ambient', 'desmatamento',
      'amazônia', 'amazonia', 'floresta', 'biodiversidade', 'bioma',
      'sustentá', 'sustenta', 'sustentabilidade', 'reciclagem',
      'poluição', 'poluicao', 'contaminação', 'contaminacao', 'queimada',
      'incêndio florestal', 'incendio florestal', 'hidrelétrica', 'hidreletrica',
      'energia limpa', 'renováve', 'renovave', 'solar', 'eólica', 'eolica',
      'etanol', 'biodiesel', 'caben', 'ibama', 'icmbio', 'mascarenhas',
      'conservação', 'conservacao', 'área de proteção', 'area de protecao',
      'unidade de conservação', 'unidade de conservacao', 'hídric', 'hidric',
      'água', 'agua', 'saneamento', 'saneamento básico', 'saneamento basico',
      'resíduo', 'residuo', 'lixo', 'aproveitamento',
      'carbono', 'emissão', 'emissao', 'gases de efeito estufa',
    ],
    peso: 1,
    threshold: 0.12,
  },
  {
    nome: 'segurança pública',
    keywords: [
      'segurança pública', 'seguranca publica', 'polícia', 'policia',
      'policial', 'militar', 'civil', 'penitenciár', 'penitenciario',
      'prisão', 'prisao', 'encarceramento', 'sistema penal', 'código penal',
      'codigo penal', 'processo penal', 'crime', 'crimes', 'contravenção',
      'contravencao', 'tráfico', 'trafico', 'drogas', 'narcotráfico',
      'narcotrafico', 'homicídio', 'homicidio', 'latrocinio', 'estupro',
      'feminicídio', 'feminicidio', 'violência', 'violencia', 'segurança',
      'pacificação', 'pacificacao', 'operação', 'operacao', 'blitz',
      'inteligência', 'inteligencia', 'delegacia', 'delegado',
      'ministério da justiça', 'ministerio da justica', 'advocacia geral',
      'juiz', 'juíza', 'tribunal', 'justiça', 'justica',
    ],
    peso: 1,
    threshold: 0.12,
  },
  {
    nome: 'direitos sociais',
    keywords: [
      'direitos sociais', 'assistência social', 'assistencia social',
      'cras', 'cadastro único', 'cadastro unico', 'bolsa família',
      'bolsa familia', 'auxílio', 'auxilio', 'benefício', 'beneficio',
      'previdência', 'previdencia', 'inss', 'aposentadoria',
      'pensão', 'pensao', 'loas', 'bpc', 'assistencial', 'vulneráve',
      'vulnerave', 'pobreza', 'extrema pobreza', 'erradicação', 'erradicacao',
      'inclusão', 'inclusao', 'social', 'cidadania', 'dignidade',
      'moradia', 'habitação', 'habitacao', 'minha casa minha vida',
      'assistência', 'assistencia', 'proteção social', 'protecao social',
    ],
    peso: 1,
    threshold: 0.15,
  },
  {
    nome: 'trabalho',
    keywords: [
      'trabalho', 'trabalhador', 'trabalhadora', 'emprego', 'desemprego',
      'clt', 'consolidação das leis do trabalho', 'sindicato', 'sindicais',
      'greve', 'jornada', 'horário', 'horario', 'salário', 'salario',
      'remuneração', 'remuneracao', 'direitos trabalhistas', 'fgts',
      'vale-transporte', 'vale refeição', 'vale-refeição',
      'seguro desemprego', 'abono salarial', 'pis/pasep', 'pis',
      'terceirização', 'terceirizacao', 'intermitente', 'MEI',
      'microempreendedor', 'autônomo', 'autonomo',
      'cooperativa', 'trabalho escravo', 'trabalho infantil',
      'condições de trabalho', 'condicoes de trabalho', 'segurança no trabalho',
      'saúde do trabalhador', 'saude do trabalhador', 'ergonomia',
    ],
    peso: 1,
    threshold: 0.12,
  },
  {
    nome: 'infraestrutura',
    keywords: [
      'infraestrutura', 'rodovia', 'rodoviár', 'rodoviario', 'estrada',
      'pavimentação', 'pavimentacao', 'ponte', 'viaduto', 'túnel', 'tunel',
      'ferrovia', 'ferroá', 'ferroa', 'trem', 'metrô', 'metro',
      'aeroporto', 'porto', 'hidrovia', 'navegação', 'navegacao',
      'saneamento', 'esgoto', 'drenagem', 'urbanismo',
      'urbanístico', 'urbânico', 'construção civil', 'construcao civil',
      'licitação', 'licitacao', 'parceria público-privada', 'ppp',
      'br-', 'transposição', 'transposicao',
      'barragem', 'açude', 'acude', 'reservatório', 'reservatorio',
    ],
    peso: 1,
    threshold: 0.15,
  },
  {
    nome: 'agricultura',
    keywords: [
      'agricultura', 'agrícola', 'agricola', 'agronegócio', 'agronegocio',
      'pecuária', 'pecuaria', 'gado', 'bovino', 'suíno', 'suino',
      'avicultura', 'frango', 'ovos', 'leite', 'leiteiro',
      'plantio', 'safra', 'colheita', 'cultivo', 'irrigação', 'irrigacao',
      'fertilizante', 'defensivo', 'agrotóxico', 'agrotoxico',
      'incra', 'terra', 'reforma agrária', 'reforma agraria',
      'assentamento', 'assentado', 'sem terra', 'mst',
      'cooperativa rural', 'rural', 'ruralidade', 'extensão rural',
      'emater', 'conab', 'cenagr', 'censo agropecuário',
      'carnaval', 'carne', 'soja', 'milho', 'trigo', 'algodão',
      'café', 'cafe', 'cana-de-açúcar', 'cana-de-acucar',
    ],
    peso: 1,
    threshold: 0.12,
  },
  {
    nome: 'tecnologia',
    keywords: [
      'tecnologia', 'digital', 'informática', 'informatica', 'software',
      'hardware', 'internet', 'cibern', 'cyber', 'segurança da informação',
      'seguranca da informacao', 'dados pessoais',
      'proteção de dados', 'protecao de dados', 'lgpd', 'marco civil',
      'neutralidade', 'banda larga', 'conectividade', 'inclusão digital',
      'inclusao digital', 'smart city', 'inteligência artificial',
      'inteligencia artificial', 'blockchain', 'criptomoeda',
      'inovação', 'inovacao', 'startup', 'ecnub', 'fintech',
      'comércio eletrônico', 'comercio eletronico', 'e-commerce',
      'telecomunicação', 'telecomunicacao', 'telefonia', '5g', 'fibra óptica',
      'fibra optica', 'satélite', 'satelite', 'nanotecnologia',
    ],
    peso: 1,
    threshold: 0.15,
  },
  {
    nome: 'cultura',
    keywords: [
      'cultura', 'cultural', 'artístico', 'artistico', 'artes',
      'cinema', 'audiovisual', 'televisão', 'televisao', 'rádio',
      'música', 'musica', 'teatro', 'dança', 'danca', 'literatura',
      'patrimônio', 'patrimonio', 'tombamento', 'register', 'histórico',
      'folclore', 'festas populares', 'artesanato', 'museu', 'galeria',
      'biblioteca', 'livro', 'edição', 'edicao', 'publicação', 'publicacao',
      'radiodifusão', 'radiodifusao', 'emissora', 'programa',
      'incentivo fiscal à cultura', 'leis de incentivo', 'rouanet',
      'funarte', 'icmbio', 'secretaria de cultura',
    ],
    peso: 1,
    threshold: 0.15,
  },
  {
    nome: 'direitos civis',
    keywords: [
      'direitos civis', 'direitos humanos', 'cidadania', 'igualdade',
      'discriminação', 'discriminacao', 'racismo', 'racista', 'xenofobia',
      'homofobia', 'lgbt', 'lgbtq', 'gênero', 'genero', 'feminismo',
      'feminista', 'mulher', 'criança', 'crianca', 'adolescente',
      'idoso', 'idosa', 'pessoa com deficiência', 'pcd', 'deficiência',
      'deficiencia', 'inclusão', 'inclusao', 'accessibilidade',
      'liberdade', 'liberdade de expressão', 'liberdade de imprensa',
      'direito à vida', 'direito a vida', 'tortura', 'desaparecimento',
      'refugiado', 'apátrida', 'apatrida', 'migração', 'migracao',
      'constituição', 'constituicao', 'direito constitucional',
      'habeas corpus', 'mandado de segurança', 'ação popular',
      'comissão de direitos humanos', 'cndh',
    ],
    peso: 1,
    threshold: 0.12,
  },
  {
    nome: 'politica institucional',
    keywords: [
      'política', 'politica', 'partido', 'partidos', 'eleições', 'eleicoes',
      'candidato', 'candidata', 'eleitor', 'eleitoral', 'campaign',
      'senado', 'câmara', 'camara', 'congresso', 'deputado', 'senador',
      'governo', 'ministro', 'ministra', 'presidente', 'vice-presidente',
      'decreto', 'lei', 'projeto de lei', 'projeto de lei complementar',
      'emenda', 'parecer', 'comissão', 'comissao', 'comissões',
      'regimento', 'regulamento', 'protocolo', 'protocolo de intenções',
      'diplomacia', 'internacional', 'tratado', 'acordo', 'convenção',
      'organização internacional', 'onu', 'mercosul', 'brics',
      'estatuto', 'código', 'codigo', 'norma regulamentadora',
    ],
    peso: 0.8,
    threshold: 0.1,
  },
  {
    nome: 'desenvolvimento regional',
    keywords: [
      'desenvolvimento regional', 'região', 'regiao', 'nordeste', 'norte',
      'centro-oeste', 'centro oeste', 'sul', 'sudeste', 'amazônia',
      'amazonia', 'cerrado', 'mata atlântica', 'mata atlantica',
      'semicolonial', 'seminônimo', 'interior', 'litoral', 'fronteira',
      'zona rural', 'zona urbana', 'periferia', 'favela', 'comunidade',
      'território', 'territorio', 'microrregião', 'microrregiao',
      'mesorregião', 'mesorregiao', 'aglomeração', 'aglomeracao',
      'região metropolitana', 'regiao metropolitana',
    ],
    peso: 0.8,
    threshold: 0.1,
  },
];

/**
 * Classifica um texto legislativo em temas com nível de confiança.
 * Retorna os temas ordenados por confiança (maior primeiro).
 */
export function classificarTemas(texto: string): TemaClassificacao[] {
  if (!texto || texto.trim().length === 0) return [];

  const lower = texto.toLowerCase();
  const resultados: TemaClassificacao[] = [];

  for (const regra of REGRAS) {
    let pontuacao = 0;
    let keywordsEncontradas = 0;

    for (const kw of regra.keywords) {
      if (lower.includes(kw)) {
        pontuacao += regra.peso;
        keywordsEncontradas++;
      }
    }

    if (keywordsEncontradas > 0) {
      // Confiança baseada em quantas keywords foram encontradas e tamanho do texto
      const densidade = keywordsEncontradas / regra.keywords.length;
      const cobertura = Math.min(keywordsEncontradas / 3, 1); // 3+ keywords = confiança máxima
      const confianca = Math.min(densidade * 0.4 + cobertura * 0.6, 1);

      if (confianca >= regra.threshold) {
        resultados.push({
          tema: regra.nome,
          confianca: Math.round(confianca * 100) / 100,
        });
      }
    }
  }

  // Ordenar por confiança (maior primeiro)
  resultados.sort((a, b) => b.confianca - a.confianca);

  return resultados;
}

/**
 * Retorna o tema principal (maior confiança) ou undefined.
 */
export function extrairTemaPrincipal(texto: string): string | undefined {
  const temas = classificarTemas(texto);
  return temas[0]?.tema;
}

/**
 * Retorna tags de tema para exibição (máx 2 temas principais).
 */
export function extrairTags(texto: string): string[] {
  const temas = classificarTemas(texto);
  return temas.slice(0, 2).map((t) => t.tema);
}

/**
 * Mapeia temas para cores de badge (compatível com o design system atual).
 */
export function temaCor(tema: string): string {
  const mapa: Record<string, string> = {
    'saúde': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    'educação': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    'economia': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    'meio ambiente': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
    'segurança pública': 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800',
    'direitos sociais': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    'trabalho': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    'infraestrutura': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    'agricultura': 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-800',
    'tecnologia': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
    'cultura': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-800',
    'direitos civis': 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800',
    'politica institucional': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    'desenvolvimento regional': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  };
  return mapa[tema] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-300 dark:border-gray-800';
}

/**
 * Gera uma descrição amigável do tipo de proposição a partir da sigla.
 * Fundamentado em CAMARA_API_REFERENCE.md (/referencias/proposicoes/siglaTipo).
 * Siglas fora do mapa retornam a própria sigla (sem inventar significado).
 */
export function descreverTipoProposicao(siglaTipo: string): string {
  const mapa: Record<string, string> = {
    'PL': 'Projeto de Lei',
    'PLP': 'Projeto de Lei Complementar',
    'PEC': 'Proposta de Emenda à Constituição',
    'MPV': 'Medida Provisória',
    'PLV': 'Projeto de Lei de Conversão',
    'PDL': 'Projeto de Decreto Legislativo',
    'PDC': 'Projeto de Decreto Legislativo',
    'PRC': 'Projeto de Resolução',
    'MSC': 'Mensagem',
    'REQ': 'Requerimento',
    'RIC': 'Requerimento de Informação',
    'RCP': 'Requerimento de Instituição de CPI',
    'RQC': 'Requerimento de Convocação',
    'INC': 'Indicação',
    'REC': 'Recurso',
    'PFC': 'Proposta de Fiscalização e Controle',
    'SUG': 'Sugestão',
    'EMC': 'Emenda na Comissão',
    'EMP': 'Emenda de Plenário',
    'EMS': 'Emenda/Substitutivo do Senado',
    'EMD': 'Emenda',
    'SBT': 'Substitutivo',
    'TVR': 'Ato de Concessão de Rádio/TV',
    'PRL': 'Parecer do Relator',
    'PAR': 'Parecer de Comissão',
    'OF': 'Ofício',
    'OFE': 'Ofício',
    'PET': 'Petição',
    'REM': 'Reclamação',
    'REP': 'Representação',
    'DEN': 'Denúncia',
    'DEC': 'Decisão',
  };
  return mapa[siglaTipo] || siglaTipo;
}
