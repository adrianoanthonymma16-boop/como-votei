'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { getInitials } from '@/lib/utils';
import { ParlamentarTabs } from './components/ParlamentarTabs';
import { VotacoesTab } from './components/VotacoesTab';
import { ProposicoesTab } from './components/ProposicoesTab';
import { DiscursosTab } from './components/DiscursosTab';
import { DashboardTab } from './components/DashboardTab';
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
        <div className="stat-card">
          <p className="text-sm text-muted-foreground mb-1">Votações</p>
          <p className="text-3xl font-bold text-foreground">{parlamentar._count.votos.toLocaleString('pt-BR')}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground mb-1">Discursos</p>
          <p className="text-3xl font-bold text-foreground">{parlamentar._count.discursos.toLocaleString('pt-BR')}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground mb-1">Proposições</p>
          <p className="text-3xl font-bold text-foreground">{parlamentar._count.proposicoes.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <ParlamentarTabs activeTab={activeTab} />

      {activeTab === 'votacoes' && <VotacoesTab parlamentarId={parlamentar.id} />}
      {activeTab === 'proposicoes' && <ProposicoesTab parlamentarId={parlamentar.id} />}
      {activeTab === 'discursos' && <DiscursosTab parlamentarId={parlamentar.id} />}
      {activeTab === 'dashboard' && <DashboardTab parlamentarId={parlamentar.id} />}
    </div>
  );
}