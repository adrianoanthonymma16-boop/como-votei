'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { useDebounce } from '@/lib/utils';

export function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [casa, setCasa] = useState(searchParams.get('casa') || '');
  const [partidoId, setPartidoId] = useState(searchParams.get('partidoId') || '');
  const [ufId, setUfId] = useState(searchParams.get('ufId') || '');
  
  const debouncedQuery = useDebounce(query, 300);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('search', debouncedQuery);
    if (casa) params.set('casa', casa);
    if (partidoId) params.set('partidoId', partidoId);
    if (ufId) params.set('ufId', ufId);
    router.push(`/parlamentares?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">Buscar parlamentar</label>
          <Input
            id="search"
            type="search"
            placeholder="Nome, CPF ou ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Select
          id="casa"
          value={casa}
          onChange={(e) => setCasa(e.target.value)}
          className="w-full sm:w-48"
        >
          <SelectOption value="">Todas as Casas</SelectOption>
          <SelectOption value="CAMARA">Câmara dos Deputados</SelectOption>
          <SelectOption value="SENADO">Senado Federal</SelectOption>
        </Select>
        <Select
          id="partido"
          value={partidoId}
          onChange={(e) => setPartidoId(e.target.value)}
          className="w-full sm:w-56"
        >
          <SelectOption value="">Todos os Partidos</SelectOption>
          {/* Options loaded dynamically */}
        </Select>
        <Select
          id="uf"
          value={ufId}
          onChange={(e) => setUfId(e.target.value)}
          className="w-full sm:w-40"
        >
          <SelectOption value="">Todos os Estados</SelectOption>
          {/* Options loaded dynamically */}
        </Select>
        <Button type="submit" className="whitespace-nowrap">
          Buscar
        </Button>
      </div>
    </form>
  );
}