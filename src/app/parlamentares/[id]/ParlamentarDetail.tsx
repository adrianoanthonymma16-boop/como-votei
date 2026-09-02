'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { getInitials } from '@/lib/utils';
import type { Parlamentar } from '@prisma/client';

interface ParlamentarDetailProps {
  parlamentar: Parlamentar & {
    partido: { sigla: string; nome: string; cor: string | null } | null;
    uf: { sigla: string; nome: string; regiao: string } | null;
    _count: { votos: number; discursos: number; proposicoes: number };
  };
}

export function ParlamentarDetail({ parlamentar }: ParlamentarDetailProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'votacoes' | 'proposicoes' | 'discursos' | 'dashboard') || 'votacoes';

  const tabs = [
    { id: 'votacoes', label: 'Votações', count: parlamentar._count.votos, href: `/parlamentares/${parlamentar.id}/votacoes`, color: 'blue' },
    { id: 'proposicoes', label: 'Projetos', count: parlamentar._count.proposicoes, href: `/parlamentares/${parlamentar.id}/proposicoes`, color: 'green' },
    { id: 'discursos', label: 'Discursos', count: parlamentar._count.discursos, href: `/parlamentares/${parlamentar.id}/discursos`, color: 'purple' },
    { id: 'dashboard', label: 'Dashboard', count: null, href: `/parlamentares/${parlamentar.id}/dashboard`, color: 'amber' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <nav className="mb-4 sm:mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <li><Link href="/" className="hover:text-foreground transition-colors">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/parlamentares" className="hover:text-foreground transition-colors">Parlamentares</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">{parlamentar.nome}</li>
        </ol>
      </nav>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xl sm:text-2xl md:text-3xl flex-shrink-0 ring-2 ring-border">
            {parlamentar.fotoUrl ? (
              <img src={parlamentar.fotoUrl} alt={parlamentar.nome} className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(parlamentar.nome)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{parlamentar.nome}</h1>
              {parlamentar.partido && (
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm shrink-0"
                  style={{ borderColor: parlamentar.partido.cor || undefined, color: parlamentar.partido.cor || undefined }}
                >
                  {parlamentar.partido.sigla}
                </Badge>
              )}
              {parlamentar.uf && (
                <Badge variant="secondary" className="text-xs sm:text-sm shrink-0">
                  {parlamentar.uf.sigla}
                </Badge>
              )}
              <Badge variant={parlamentar.casa === 'CAMARA' ? 'info' : 'success'} className="text-xs sm:text-sm shrink-0">
                {parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'}
              </Badge>
            </div>
            {parlamentar.nomeCivil && (
              <p className="text-sm text-muted-foreground mb-2">Nome civil: {parlamentar.nomeCivil}</p>
            )}
            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              {parlamentar.email && <span className="truncate">{parlamentar.email}</span>}
              {parlamentar.telefone && <span>{parlamentar.telefone}</span>}
              <span>Legislatura {parlamentar.legislatura}</span>
              <span>Situação: {parlamentar.situacao || 'EXERCÍCIO'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link href={`/parlamentares/${parlamentar.id}/votacoes`} className="stat-card group text-center sm:text-left">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Votações</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{parlamentar._count.votos.toLocaleString('pt-BR')}</p>
        </Link>
        <Link href={`/parlamentares/${parlamentar.id}/discursos`} className="stat-card group text-center sm:text-left">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Discursos</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{parlamentar._count.discursos.toLocaleString('pt-BR')}</p>
        </Link>
        <Link href={`/parlamentares/${parlamentar.id}/proposicoes`} className="stat-card group text-center sm:text-left">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Proposições</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{parlamentar._count.proposicoes.toLocaleString('pt-BR')}</p>
        </Link>
      </div>

      {/* Tab navigation - mobile scrollable, desktop flex */}
      <nav className="mb-6" aria-label="Navegação entre seções">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`tab-trigger whitespace-nowrap shrink-0 ${
                activeTab === tab.id ? 'tab-trigger-active' : 'tab-trigger-inactive'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                  activeTab === tab.id 
                    ? 'bg-accent-foreground/20 text-accent-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count.toLocaleString('pt-BR')}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
