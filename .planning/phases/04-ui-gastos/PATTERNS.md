Phase 04 — Code Patterns

Tab Component Pattern (copy from DiscursosTab):

```typescript
// src/app/parlamentares/[id]/components/GastoTab.tsx
'use client';

import { useState, useEffect, useCallback, useRef, AbortController } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { ANOS_JANELA } from '@/lib/despesas';
import { DespesaNormalizada } from '@/lib/sync/types';

interface GastoTabProps {
  parlamentarId: string;
  casa: 'CAMARA' | 'SENADO';
}

export function GastoTab({ parlamentarId, casa }: GastoTabProps) {
  const [despesas, setDespesas] = useState<DespesaNormalizada[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<{ periodo: string; categoria: string; busca: string }>({
    periodo: 'todos',
    categoria: 'todos',
    busca: '',
  });
  const params = useParams<{ id: string }>();
  const router = useRouter();

  // fetch despesas with AbortController
  const carregarDespesas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    
    try {
      const query = new URLSearchParams({
        pagina: '1',
        itensPorPagina: '20',
        ...(filtros.periodo !== 'todos' && { periodo: filtros.periodo }),
        ...(filtros.categoria !== 'todos' && { categoria: filtros.categoria }),
        ...(filtros.busca && { busca: filtros.busca }),
      });
      
      const res = await fetch(`/api/parlamentares/${params.id}/despesas?${query}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      
      if (!res.ok) throw new Error('Network response was not ok');
      
      const data = await res.json();
      setDespesas(data.data || []);
      setIsLoading(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // request was aborted, ignore
        return;
      }
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      setIsLoading(false);
    } finally {
      // controller doesn't need explicit cleanup here
    }
  }, [params.id, filtros]);

  useEffect(() => {
    carregarDespesas();
    // cleanup on unmount
    return () => controller.abort();
  }, [carregarDespesas]);

  // calculate summary
  const total = despesas.reduce((sum, d) => sum + Number(d.valor) || 0, 0);
  const quantidade = despesas.length;
  const mediaMensal = quantidade > 0 ? total / new Date().getUTCFullYear() : 0; // simplificado

  // handle link click
  const handleVerComprovante = (url: string | undefined) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      // show tooltip: "Sem comprovante disponível (Senado)"
    }
  };

  // ... rest: table rendering, filtros UI, empty/error states
}
```

Table column pattern:
- Data: formatDateBR(d.data) usando Intl.DateTimeFormat
- Categoria: String(d.categoria) label livre
- Fornecedor: String(d.fornecedor)
- Valor: R$ formatNumber(Number(d.valor)) ou Intl.NumberFormat
- Ações: <a href={d.urlDocumento} target="_blank" rel="noopener">Ver comprovante</a>

Resumo pattern:
- Total: R$ {formatNumber(total)}
- Quantidade: {quantidade} despesas
- Média/mês: R$ {formatNumber(mediaMensal / 12)}

Accessibility pattern:
- <table role="table">
- <thead> com <th> com aria-label
- <tbody> com <tr role="row">
- <td role="gridcell" aria-rowindex={rowIndex} aria-colindex={colIndex}>
- Botões com aria-label descriptivo