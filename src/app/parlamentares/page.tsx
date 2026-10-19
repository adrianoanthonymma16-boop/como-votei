import { Metadata } from 'next';
import { Suspense } from 'react';
import { ParlamentaresPageClient } from './ParlamentaresPageClient';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { ParlamentarCardSkeleton } from '@/components/ParlamentarCardSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';

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
      <PageBreadcrumb current="Parlamentares" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Parlamentares</h1>
        <p className="text-muted-foreground">Busque e filtre deputados e senadores por nome, partido, estado ou casa.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <ParlamentarCardSkeleton key={i} />
        ))}
      </div>

      <div className="flex items-center justify-center py-6">
        <Skeleton className="h-9 w-64" />
      </div>
    </div>
  );
}
