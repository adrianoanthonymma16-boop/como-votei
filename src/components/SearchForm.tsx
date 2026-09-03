'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';

interface PartidoItem {
  id: string;
  sigla: string;
  nome: string;
}

interface UfItem {
  id: string;
  sigla: string;
  nome: string;
}

export function SearchForm() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [casa, setCasa] = useState('');
  const [partidoId, setPartidoId] = useState('');
  const [ufId, setUfId] = useState('');
  const [partidos, setPartidos] = useState<PartidoItem[]>([]);
  const [ufs, setUfs] = useState<UfItem[]>([]);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [resP, resU] = await Promise.all([fetch('/api/partidos'), fetch('/api/ufs')]);
      if (ativo && resP.ok) setPartidos((await resP.json()).data ?? []);
      if (ativo && resU.ok) setUfs((await resU.json()).data ?? []);
    }
    carregar().catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (casa) params.set('casa', casa);
    if (partidoId) params.set('partidoId', partidoId);
    if (ufId) params.set('ufId', ufId);
    router.push(`/parlamentares?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="busca-inicial" className="sr-only">Buscar parlamentar</label>
          <Input
            id="busca-inicial"
            type="search"
            placeholder="Nome do parlamentar (ex.: Maria, AJ Albuquerque)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11"
          />
        </div>
        <Button type="submit" className="h-11 px-6 shrink-0">
          Buscar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select id="casa-busca" value={casa} onChange={(e) => setCasa(e.target.value)} className="h-11">
          <SelectOption value="">Todas as casas</SelectOption>
          <SelectOption value="CAMARA">Câmara dos Deputados</SelectOption>
          <SelectOption value="SENADO">Senado Federal</SelectOption>
        </Select>
        <Select id="partido-busca" value={partidoId} onChange={(e) => setPartidoId(e.target.value)} className="h-11">
          <SelectOption value="">Todos os partidos</SelectOption>
          {partidos.map((p) => (
            <SelectOption key={p.id} value={p.id}>
              {p.sigla} - {p.nome}
            </SelectOption>
          ))}
        </Select>
        <Select id="uf-busca" value={ufId} onChange={(e) => setUfId(e.target.value)} className="h-11">
          <SelectOption value="">Todos os estados</SelectOption>
          {ufs.map((u) => (
            <SelectOption key={u.id} value={u.id}>
              {u.sigla} - {u.nome}
            </SelectOption>
          ))}
        </Select>
      </div>
    </form>
  );
}
