interface FonteOficialProps {
  casa: 'CAMARA' | 'SENADO';
  children?: React.ReactNode;
}

const FONTES: Record<'CAMARA' | 'SENADO', { nome: string; portal: string; api: string }> = {
  CAMARA: {
    nome: 'Câmara dos Deputados',
    portal: 'https://www.camara.leg.br',
    api: 'https://dadosabertos.camara.leg.br',
  },
  SENADO: {
    nome: 'Senado Federal',
    portal: 'https://www12.senado.leg.br',
    api: 'https://legis.senado.leg.br/dadosabertos',
  },
};

/**
 * Rodapé de atribuição da fonte oficial dos dados exibidos,
 * permitindo que o usuário valide a informação diretamente na origem.
 */
export function FonteOficial({ casa, children }: FonteOficialProps) {
  const fonte = FONTES[casa];

  return (
    <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 mt-0.5 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>
          <strong className="text-foreground font-medium">Fonte oficial:</strong> dados públicos fornecidos pela{' '}
          {fonte.nome}. Consulte a página original ou a API de dados abertos para validar.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <a
          href={fonte.portal}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:text-accent/80 hover:underline font-medium transition-colors"
        >
          Portal {casa === 'CAMARA' ? 'da Câmara' : 'do Senado'}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href={fonte.api}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:text-accent/80 hover:underline font-medium transition-colors"
        >
          API de dados abertos
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
      {children}
    </div>
  );
}
