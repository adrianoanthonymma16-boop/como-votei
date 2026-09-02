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
    <Link
      href={`/parlamentares/${parlamentar.id}`}
      className="parlamentar-card group block"
      aria-label={`Ver detalhes de ${parlamentar.nome}`}
    >
      <div className="flex items-start gap-4">
        {/* Foto / Avatar */}
        <div className="relative flex-shrink-0">
          {parlamentar.fotoUrl ? (
            <img
              src={parlamentar.fotoUrl}
              alt={parlamentar.nome}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg ring-2 ring-border">
              {getInitials(parlamentar.nome)}
            </div>
          )}
          {/* Casa badge pequeno no canto da foto */}
          <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 text-xs font-medium rounded-full ring-2 ring-background ${
            parlamentar.casa === 'CAMARA' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {parlamentar.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
          </span>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline flex-wrap gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-lg group-hover:text-accent transition-colors">
              {parlamentar.nome}
            </h3>
            {parlamentar.partido && (
              <Badge 
                variant="outline" 
                className="gap-1 text-sm"
                style={{ borderColor: parlamentar.partido.cor || 'var(--color-border)', color: parlamentar.partido.cor || 'var(--color-foreground)' }}
              >
                {parlamentar.partido.sigla}
              </Badge>
            )}
            {parlamentar.uf && (
              <Badge variant="secondary" className="text-sm">
                {parlamentar.uf.sigla}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-2 truncate">
            {parlamentar.nomeCivil || parlamentar.cpf || 'Nome civil não informado'}
          </p>

          {/* Actions row - 4 funcionalidades */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Link
              href={`/parlamentares/${parlamentar.id}?tab=votacoes`}
              className="action-btn"
              onClick={(e) => e.preventDefault()}
            >
              <span className="action-label">Votações</span>
              <span className="action-count">{parlamentar._count?.votos || 0}</span>
            </Link>
            <Link
              href={`/parlamentares/${parlamentar.id}?tab=proposicoes`}
              className="action-btn"
              onClick={(e) => e.preventDefault()}
            >
              <span className="action-label">Projetos</span>
              <span className="action-count">{parlamentar._count?.proposicoes || 0}</span>
            </Link>
            <Link
              href={`/parlamentares/${parlamentar.id}?tab=discursos`}
              className="action-btn"
              onClick={(e) => e.preventDefault()}
            >
              <span className="action-label">Discursos</span>
              <span className="action-count">{parlamentar._count?.discursos || 0}</span>
            </Link>
            <Link
              href={`/parlamentares/${parlamentar.id}?tab=dashboard`}
              className="action-btn action-btn-primary"
              onClick={(e) => e.preventDefault()}
            >
              <span className="action-label">Dashboard</span>
            </Link>
          </div>

          {/* Alinhamento partidário (se disponível) */}
          {alinhamento !== null && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Alinhamento partidário</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
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
    </Link>
  );
}

// Estilos inline para os botões de ação
const actionBtnStyles = `
  .action-btn {
    @apply flex-1 min-w-[80px] flex flex-col items-center gap-0.5 px-3 py-2.5 
           rounded-lg bg-muted/50 text-muted-foreground 
           hover:bg-accent/10 hover:text-accent 
           transition-all duration-200 text-center;
  }
  .action-btn-primary {
    @apply bg-accent/10 text-accent hover:bg-accent/20;
  }
  .action-label {
    @apply text-xs font-medium;
  }
  .action-count {
    @apply text-lg font-semibold text-foreground;
  }
`;

// Injetar estilos no documento (apenas uma vez)
if (typeof document !== 'undefined' && !document.getElementById('parlamentar-card-styles')) {
  const style = document.createElement('style');
  style.id = 'parlamentar-card-styles';
  style.textContent = actionBtnStyles;
  document.head.appendChild(style);
}