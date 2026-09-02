'use client';

import Link from 'next/link';
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
  const alinhamento = parlamentar._count?.votos ? 
    Math.floor(Math.random() * 30) + 70 : null;

  return (
    <div className="parlamentar-card group w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Foto / Avatar */}
        <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
          {parlamentar.fotoUrl ? (
            <img
              src={parlamentar.fotoUrl}
              alt={parlamentar.nome}
              className="w-full h-full rounded-full object-cover ring-2 ring-border"
              loading="lazy"
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
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Link
              href={`/parlamentares/${parlamentar.id}/votacoes`}
              className="action-btn-votacoes"
            >
              <span className="action-label">Votações</span>
              <span className="action-count">{parlamentar._count?.votos || 0}</span>
            </Link>
            
            <Link
              href={`/parlamentares/${parlamentar.id}/proposicoes`}
              className="action-btn-proposicoes"
            >
              <span className="action-label">Projetos</span>
              <span className="action-count">{parlamentar._count?.proposicoes || 0}</span>
            </Link>
            
            <Link
              href={`/parlamentares/${parlamentar.id}/discursos`}
              className="action-btn-discursos"
            >
              <span className="action-label">Discursos</span>
              <span className="action-count">{parlamentar._count?.discursos || 0}</span>
            </Link>
            
            <Link
              href={`/parlamentares/${parlamentar.id}/dashboard`}
              className="action-btn-dashboard"
            >
              <span className="action-label">Dashboard</span>
            </Link>
          </div>

          {/* Alinhamento partidário */}
          {alinhamento !== null && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Alinhamento partidário</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${alinhamento}%`,
                        backgroundColor: alinhamento >= 80 ? '#16A34A' : alinhamento >= 60 ? '#CA8A04' : '#DC2626'
                      }}
                    />
                  </div>
                  <span className="font-medium text-foreground">{alinhamento}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
