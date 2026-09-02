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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-foreground">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/parlamentares" className="hover:text-foreground">Parlamentares</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium" aria-current="page">{parlamentar.nome}</li>
        </ol>
      </nav>

      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl md:text-3xl flex-shrink-0 ring-2 ring-border">
            {parlamentar.fotoUrl ? (
              <img src={parlamentar.fotoUrl} alt={parlamentar.nome} className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(parlamentar.nome)
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{parlamentar.nome}</h1>
              {parlamentar.partido && (
                <Badge
                  variant="outline"
                  className="text-sm"
                  style={{ borderColor: parlamentar.partido.cor || undefined, color: parlamentar.partido.cor || undefined }}
                >
                  {parlamentar.partido.sigla}
                </Badge>
              )}
              {parlamentar.uf && (
                <Badge variant="secondary" className="text-sm">
                  {parlamentar.uf.sigla}
                </Badge>
              )}
              <Badge variant={parlamentar.casa === 'CAMARA' ? 'info' : 'success'} className="text-sm">
                {parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'}
              </Badge>
            </div>
            {parlamentar.nomeCivil && (
              <p className="text-muted-foreground">Nome civil: {parlamentar.nomeCivil}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              {parlamentar.email && <span>📧 {parlamentar.email}</span>}
              {parlamentar.telefone && <span>📞 {parlamentar.telefone}</span>}
              <span>Legislatura {parlamentar.legislatura}</span>
              <span>Situação: {parlamentar.situacao || 'EXERCICIO'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href={`/parlamentares/${parlamentar.id}/votacoes`} className="stat-card group">
          <p className="text-sm text-muted-foreground mb-1">Votações</p>
          <p className="text-3xl font-bold text-foreground group-hover:text-blue-600 transition-colors">{parlamentar._count.votos.toLocaleString('pt-BR')}</p>
        </Link>
        <Link href={`/parlamentares/${parlamentar.id}/discursos`} className="stat-card group">
          <p className="text-sm text-muted-foreground mb-1">Discursos</p>
          <p className="text-3xl font-bold text-foreground group-hover:text-purple-600 transition-colors">{parlamentar._count.discursos.toLocaleString('pt-BR')}</p>
        </Link>
        <Link href={`/parlamentares/${parlamentar.id}/proposicoes`} className="stat-card group">
          <p className="text-sm text-muted-foreground mb-1">Proposições</p>
          <p className="text-3xl font-bold text-foreground group-hover:text-green-600 transition-colors">{parlamentar._count.proposicoes.toLocaleString('pt-BR')}</p>
        </Link>
      </div>

      <nav className="mb-6" aria-label="Navegação entre seções">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-muted/50 text-muted-foreground">
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