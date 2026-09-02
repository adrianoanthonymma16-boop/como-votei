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
    Math.floor(Math.random() * 30) + 70 : null; // Mock - será substituído por dado real

  return (
    <div className="parlamentar-card group w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 sm:p-6">
        {/* Foto / Avatar */}
        <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
          {parlamentar.fotoUrl ? (
            <img
              src={parlamentar.fotoUrl}
              alt={parlamentar.nome}
              className="w-full h-full rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xl ring-2 ring-border">
              {getInitials(parlamentar.nome)}
            </div>
          )}
          {/* Casa badge pequeno no canto da foto */}
          <span className={`absolute -bottom-1 -right-1 px-2 py-0.5 text-xs font-medium rounded-full ring-2 ring-background ${
            parlamentar.casa === 'CAMARA' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {parlamentar.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
          </span>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Nome e badges */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <h3 className="font-semibold text-foreground text-lg sm:text-xl group-hover:text-accent transition-colors truncate">
              {parlamentar.nome}
            </h3>
            {parlamentar.partido && (
              <Badge 
                variant="outline" 
                className="gap-1 text-sm whitespace-nowrap shrink-0"
                style={{ borderColor: parlamentar.partido.cor || 'var(--color-border)', color: parlamentar.partido.cor || 'var(--color-foreground)' }}
              >
                {parlamentar.partido.sigla}
              </Badge>
            )}
            {parlamentar.uf && (
              <Badge variant="secondary" className="text-sm whitespace-nowrap shrink-0">
                {parlamentar.uf.sigla}
              </Badge>
            )}
          </div>

          {/* Nome civil */}
          <p className="text-sm text-muted-foreground truncate sm:hidden">
            {parlamentar.nomeCivil || parlamentar.cpf || 'Nome civil não informado'}
          </p>

          {/* Actions row - 4 funcionalidades com hover individual */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border w-full sm:w-auto sm:border-t-0 sm:border-l sm:pl-4 sm:ml-auto">
            {/* Votações - Azul */}
            <Link
              href={`/parlamentares/${parlamentar.id}?tab=votacoes`}
              className="action-btn-votacoes"
            >
              <span className="action-label">Votações</span>
              <span className="action-count">{parlamentar._count?.votos || 0}</span>
            </Link>
            
            {/* Projetos - Verde */}
            <Link
              href={`/parlamentares/${parlamentar.id}?tab=proposicoes`}
              className="action-btn-proposicoes"
            >
              <span className="action-label">Projetos</span>
              <span className="action-count">{parlamentar._count?.proposicoes || 0}</span>
            </Link>
            
            {/* Discursos - Roxo */}
            <Link
              href={`/parlamentares/${parlamentar.id}?tab=discursos`}
              className="action-btn-discursos"
            >
              <span className="action-label">Discursos</span>
              <span className="action-count">{parlamentar._count?.discursos || 0}</span>
            </Link>
            
            {/* Dashboard - Laranja/Amarelo */}
            <Link
              href={`/parlamentares/${parlamentar.id}?tab=dashboard`}
              className="action-btn-dashboard"
            >
              <span className="action-label">Dashboard</span>
            </Link>
          </div>

          {/* Nome civil visível apenas no mobile */}
          <p className="text-sm text-muted-foreground truncate hidden sm:block">
            {parlamentar.nomeCivil || parlamentar.cpf || 'Nome civil não informado'}
          </p>

          {/* Alinhamento partidário (se disponível) */}
          {alinhamento !== null && (
            <div className="mt-3 pt-3 border-t border-border w-full sm:w-auto sm:ml-4 sm:border-l sm:pl-4 sm:border-t-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Alinhamento partidário</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
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

// Estilos inline para os botões de ação com hover individual
const actionBtnStyles = `
  /* Base compartilhada */
  .action-btn-votacoes,
  .action-btn-proposicoes,
  .action-btn-discursos,
  .action-btn-dashboard {
    @apply flex-1 min-w-[80px] flex flex-col items-center gap-0.5 px-3 py-2.5 
           rounded-lg text-xs font-medium transition-all duration-200 text-center;
  }

  /* Votações - Azul */
  .action-btn-votacoes {
    @apply bg-blue-50 text-blue-700 border border-blue-200
           hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300
           hover:shadow-md hover:shadow-blue-100
           transition-all duration-200;
  }
  .action-btn-votacoes:hover .action-count {
    @apply text-blue-600;
  }

  /* Projetos - Verde */
  .action-btn-proposicoes {
    @apply bg-green-50 text-green-700 border border-green-200
           hover:bg-green-100 hover:text-green-800 hover:border-green-300
           hover:shadow-md hover:shadow-green-100
           transition-all duration-200;
  }
  .action-btn-proposicoes:hover .action-count {
    @apply text-green-600;
  }

  /* Discursos - Roxo */
  .action-btn-discursos {
    @apply bg-purple-50 text-purple-700 border border-purple-200
           hover:bg-purple-100 hover:text-purple-800 hover:border-purple-300
           hover:shadow-md hover:shadow-purple-100
           transition-all duration-200;
  }
  .action-btn-discursos:hover .action-count {
    @apply text-purple-600;
  }

  /* Dashboard - Laranja/Âmbar */
  .action-btn-dashboard {
    @apply bg-amber-50 text-amber-700 border border-amber-200
           hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300
           hover:shadow-md hover:shadow-amber-100
           transition-all duration-200;
  }
  .action-btn-dashboard:hover .action-label {
    @apply font-semibold;
  }

  /* Estilos comuns dos elementos internos */
  .action-label {
    @apply text-xs font-medium;
  }
  .action-count {
    @apply text-lg font-semibold text-foreground;
  }

  /* Focus states para acessibilidade */
  .action-btn-votacoes:focus-visible,
  .action-btn-proposicoes:focus-visible,
  .action-btn-discursos:focus-visible,
  .action-btn-dashboard:focus-visible {
    @apply outline-none ring-2 ring-offset-2;
  }
  .action-btn-votacoes:focus-visible { @apply ring-blue-500; }
  .action-btn-proposicoes:focus-visible { @apply ring-green-500; }
  .action-btn-discursos:focus-visible { @apply ring-purple-500; }
  .action-btn-dashboard:focus-visible { @apply ring-amber-500; }
`;

// Injetar estilos no documento (apenas uma vez)
if (typeof document !== 'undefined' && !document.getElementById('parlamentar-card-styles')) {
  const style = document.createElement('style');
  style.id = 'parlamentar-card-styles';
  style.textContent = actionBtnStyles;
  document.head.appendChild(style);
}