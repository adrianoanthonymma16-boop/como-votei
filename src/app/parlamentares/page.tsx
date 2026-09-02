import { Metadata } from 'next';
import { Suspense } from 'react';
import { ParlamentaresPageClient } from './ParlamentaresPageClient';
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export const metadata: Metadata = {
  title: 'Parlamentares',
  description: 'Lista de deputados e senadores brasileiros com filtros por casa, partido, UF e legislatura.',
};

export default function ParlamentaresPage() {
  return (
    <Suspense fallback={<ParlamentaresPageSkeleton />}>
      <ParlamentaresPageClient />
    </Suspense>
  );
}

function ParlamentaresPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><a href="/" className="hover:text-foreground">Início</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium" aria-current="page">Parlamentares</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Parlamentares</h1>
        <p className="text-muted-foreground">Busque e filtre deputados e senadores</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Buscar parlamentar</label>
            <input type="search" className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50" id="search" placeholder="Nome, CPF ou ID..." value="" disabled />
          </div>
          <select className="flex h-10 appearance-none rounded-md border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-56" disabled>
            <option value="" selected={true}>Todas as Casas</option>
            <option value="CAMARA">Câmara dos Deputados</option>
            <option value="SENADO">Senado Federal</option>
          </select>
          <select className="flex h-10 appearance-none rounded-md border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-56" disabled>
            <option value="" selected={true}>Todos os Partidos</option>
          </select>
          <select className="flex h-10 appearance-none rounded-md border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-40" disabled>
            <option value="" selected={true}>Todos os Estados</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          0 parlamentar<span className="sr-only">es</span> encontrado<span className="sr-only">s</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-16">Foto</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Nome</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 hidden md:table-cell">Partido</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 hidden lg:table-cell">UF</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 hidden lg:table-cell">Casa</th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-32 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0"></tbody>
        </table>
      </div>
      <div className="flex items-center justify-center py-4">
        <button className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border border-border bg-background text-foreground hover:bg-muted focus:ring-ring px-4 py-2 text-base gap-2 min-w-[200px]" disabled>
          Carregando...
        </button>
      </div>
      <div className="py-4"><div className="flex justify-center">Carregando...</div></div>
    </div>
  );
}