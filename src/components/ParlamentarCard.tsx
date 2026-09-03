'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { getInitials } from '@/lib/utils';
import type { Parlamentar } from '@prisma/client';

interface ParlamentarWithCounts extends Parlamentar {
  _count?: {
    votos: number;
    discursos: number;
    proposicoes: number;
  };
  partido?: { sigla: string; nome: string; cor: string | null } | null;
  uf?: { sigla: string; nome: string; regiao: string } | null;
}

interface ParlamentarCardProps {
  parlamentar: ParlamentarWithCounts;
}

export function ParlamentarCard({ parlamentar }: ParlamentarCardProps) {
  return (
    <div className="parlamentar-card group w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Foto / Avatar */}
        <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
          {parlamentar.fotoUrl ? (
            <Image
              src={parlamentar.fotoUrl}
              alt={parlamentar.nome}
              width={80}
              height={80}
              sizes="80px"
              className="w-full h-full rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-lg ring-2 ring-border">
              {getInitials(parlamentar.nome)}
            </div>
          )}
          {/* Casa badge */}
          <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full ring-2 ring-background ${
            parlamentar.casa === 'CAMARA' 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-300' 
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300'
          }`}>
            {parlamentar.casa === 'CAMARA' ? 'CD' : 'SF'}
          </span>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          {/* Nome e badges */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-base sm:text-lg group-hover:text-accent transition-colors truncate">
              {parlamentar.nome}
            </h3>
            {parlamentar.partido && (
              <Badge 
                variant="outline" 
                className="text-xs shrink-0"
                style={{ borderColor: parlamentar.partido.cor || undefined, color: parlamentar.partido.cor || undefined }}
              >
                {parlamentar.partido.sigla}
              </Badge>
            )}
            {parlamentar.uf && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {parlamentar.uf.sigla}
              </Badge>
            )}
          </div>

          {/* Nome civil */}
          <p className="text-xs text-muted-foreground truncate mb-3">
            {parlamentar.nomeCivil || parlamentar.cpf || ''}
          </p>

          {/* Action buttons - 4 funcionalidades */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href={`/parlamentares/${parlamentar.id}/votacoes`}
              className="action-btn-votacoes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="action-label">Votações</span>
            </Link>
            
            <Link
              href={`/parlamentares/${parlamentar.id}/proposicoes`}
              className="action-btn-proposicoes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="action-label">Projetos</span>
            </Link>
            
            <Link
              href={`/parlamentares/${parlamentar.id}/discursos`}
              className="action-btn-discursos"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="action-label">Discursos</span>
            </Link>
            
            <Link
              href={`/parlamentares/${parlamentar.id}/dashboard`}
              className="action-btn-dashboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="action-label">Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
