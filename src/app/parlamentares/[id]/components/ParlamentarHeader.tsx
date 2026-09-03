import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { PresencaCard } from '@/components/PresencaCard';

export type SecaoId = 'votacoes' | 'proposicoes' | 'discursos' | 'dashboard';

interface ParlamentarHeaderData {
  id: string;
  nome: string;
  nomeCivil?: string | null;
  casa: string;
  fotoUrl?: string | null;
  email?: string | null;
  telefone?: string | null;
  legislatura: number;
  situacao?: string | null;
  partido?: { sigla: string; nome: string; cor: string | null } | null;
  uf?: { sigla: string; nome: string; regiao: string } | null;
  _count?: { votos: number; discursos: number; proposicoes: number };
}

const secoes: { id: SecaoId; label: string }[] = [
  { id: 'votacoes', label: 'Votações' },
  { id: 'proposicoes', label: 'Projetos' },
  { id: 'discursos', label: 'Discursos' },
  { id: 'dashboard', label: 'Dashboard' },
];

const coresSecao: Record<SecaoId, string> = {
  votacoes: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
  proposicoes: 'group-hover:text-green-600 dark:group-hover:text-green-400',
  discursos: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
  dashboard: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
};

export function ParlamentarHeader({
  parlamentar,
  activeTab,
}: {
  parlamentar: ParlamentarHeaderData;
  activeTab: SecaoId;
}) {
  const count = parlamentar._count ?? { votos: 0, discursos: 0, proposicoes: 0 };
  const iniciais = parlamentar.nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <nav className="mb-4 sm:mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/parlamentares" className="hover:text-foreground transition-colors">
              Parlamentares
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">
            {parlamentar.nome}
          </li>
        </ol>
      </nav>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xl sm:text-2xl md:text-3xl flex-shrink-0 ring-2 ring-border overflow-hidden">
            {parlamentar.fotoUrl ? (
              <Image
                src={parlamentar.fotoUrl}
                alt={parlamentar.nome}
                width={112}
                height={112}
                sizes="112px"
                className="w-full h-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              iniciais
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
                {parlamentar.nome}
              </h1>
              {parlamentar.partido && (
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm shrink-0"
                  style={{
                    borderColor: parlamentar.partido.cor || undefined,
                    color: parlamentar.partido.cor || undefined,
                  }}
                >
                  {parlamentar.partido.sigla}
                </Badge>
              )}
              {parlamentar.uf && (
                <Badge variant="secondary" className="text-xs sm:text-sm shrink-0">
                  {parlamentar.uf.sigla}
                </Badge>
              )}
              <Badge
                variant={parlamentar.casa === 'CAMARA' ? 'info' : 'success'}
                className="text-xs sm:text-sm shrink-0"
              >
                {parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'}
              </Badge>
            </div>
            {parlamentar.nomeCivil && (
              <p className="text-sm text-muted-foreground mb-2">Nome civil: {parlamentar.nomeCivil}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <span>Legislatura {parlamentar.legislatura}</span>
              <span>Situação: {parlamentar.situacao || 'Exercício'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link
          href={`/parlamentares/${parlamentar.id}/votacoes`}
          className={`stat-card group text-center sm:text-left ${coresSecao.votacoes}`}
        >
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Votações</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground transition-colors">
            {count.votos.toLocaleString('pt-BR')}
          </p>
        </Link>
        <Link
          href={`/parlamentares/${parlamentar.id}/discursos`}
          className={`stat-card group text-center sm:text-left ${coresSecao.discursos}`}
        >
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Discursos</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground transition-colors">
            {count.discursos.toLocaleString('pt-BR')}
          </p>
        </Link>
        <Link
          href={`/parlamentares/${parlamentar.id}/proposicoes`}
          className={`stat-card group text-center sm:text-left ${coresSecao.proposicoes}`}
        >
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Proposições</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground transition-colors">
            {count.proposicoes.toLocaleString('pt-BR')}
          </p>
        </Link>
        <PresencaCard parlamentarId={parlamentar.id} />
      </div>

      {/* Navegação entre seções */}
      <nav className="mb-6" aria-label="Navegação entre seções">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide border-b border-border">
          {secoes.map((secao) => (
            <Link
              key={secao.id}
              href={`/parlamentares/${parlamentar.id}/${secao.id}`}
              aria-current={activeTab === secao.id ? 'page' : undefined}
              className={`tab-trigger whitespace-nowrap shrink-0 ${
                activeTab === secao.id ? 'tab-trigger-active' : 'tab-trigger-inactive'
              }`}
            >
              {secao.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
