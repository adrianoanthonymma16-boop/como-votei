'use client';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface FiltroDisponivel {
  tipo: string;
  total: number;
}

interface FiltrosDisponiveis {
  tipoVoto: FiltroDisponivel[];
  tipoDiscurso: FiltroDisponivel[];
}

interface DashboardFiltersProps {
  filtros: { tipoVoto: string[]; tipoDiscurso: string[] };
  disponiveis: FiltrosDisponiveis | null;
  onFilterChange: (tipo: 'tipoVoto' | 'tipoDiscurso', valores: string[]) => void;
}

const TIPO_VOTO_LABEL: Record<string, string> = {
  SIM: 'Sim',
  NAO: 'Não',
  ABSTENCAO: 'Abstenção',
  ARTICULACAO: 'Articulação',
  OBSTRUCAO: 'Obstrução',
  LICENCA: 'Licença',
  MISSAO: 'Missa',
  AUSENTE: 'Ausente',
};

const TIPO_DISCURSO_LABEL: Record<string, string> = {
  ORDEM_DIA: 'Ordem do Dia',
  PLENARIO: 'Plenário',
  COMISSAO: 'Comissão',
  LIDERANCA: 'Liderança',
  OUTRO: 'Outro',
};

const TIPO_VOTO_COR: Record<string, string> = {
  SIM: 'bg-green-600',
  NAO: 'bg-red-600',
  ABSTENCAO: 'bg-amber-600',
  ARTICULACAO: 'bg-blue-600',
  OBSTRUCAO: 'bg-violet-600',
  LICENCA: 'bg-slate-500',
  MISSAO: 'bg-slate-400',
  AUSENTE: 'bg-slate-600',
};

const TIPO_DISCURSO_COR: Record<string, string> = {
  ORDEM_DIA: 'bg-blue-600',
  PLENARIO: 'bg-amber-600',
  COMISSAO: 'bg-purple-600',
  LIDERANCA: 'bg-teal-600',
  OUTRO: 'bg-slate-500',
};

export function DashboardFilters({ filtros, disponiveis, onFilterChange }: DashboardFiltersProps) {
  const temFiltro = filtros.tipoVoto.length > 0 || filtros.tipoDiscurso.length > 0;

  if (!disponiveis) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtros</span>

      {/* Tipo de voto */}
      <div className="flex flex-wrap gap-1.5">
        {disponiveis.tipoVoto.map((v) => {
          const ativo = filtros.tipoVoto.includes(v.tipo);
          return (
            <button
              key={v.tipo}
              type="button"
              onClick={() => {
                const next = ativo
                  ? filtros.tipoVoto.filter((t) => t !== v.tipo)
                  : [...filtros.tipoVoto, v.tipo];
                onFilterChange('tipoVoto', next);
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border ${
                ativo
                  ? `${TIPO_VOTO_COR[v.tipo]} text-white border-transparent`
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
              aria-pressed={ativo}
            >
              {TIPO_VOTO_LABEL[v.tipo] ?? v.tipo}
              <span className="opacity-60">{v.total}</span>
            </button>
          );
        })}
      </div>

      {/* Tipo de discurso */}
      <div className="flex flex-wrap gap-1.5">
        {disponiveis.tipoDiscurso.map((v) => {
          const ativo = filtros.tipoDiscurso.includes(v.tipo);
          return (
            <button
              key={v.tipo}
              type="button"
              onClick={() => {
                const next = ativo
                  ? filtros.tipoDiscurso.filter((t) => t !== v.tipo)
                  : [...filtros.tipoDiscurso, v.tipo];
                onFilterChange('tipoDiscurso', next);
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border ${
                ativo
                  ? `${TIPO_DISCURSO_COR[v.tipo]} text-white border-transparent`
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
              aria-pressed={ativo}
            >
              {TIPO_DISCURSO_LABEL[v.tipo] ?? v.tipo}
              <span className="opacity-60">{v.total}</span>
            </button>
          );
        })}
      </div>

      {temFiltro && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { onFilterChange('tipoVoto', []); onFilterChange('tipoDiscurso', []); }}
          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <IconX className="h-3 w-3 mr-1" aria-hidden="true" /> Limpar
        </Button>
      )}
    </div>
  );
}