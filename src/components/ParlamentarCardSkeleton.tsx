import { Skeleton } from '@/components/ui/Skeleton';

/** Placeholder do ParlamentarCard, reutilizado em todas as listas. */
export function ParlamentarCardSkeleton() {
  return (
    <div className="parlamentar-card pointer-events-none" aria-hidden="true">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Skeleton className="size-16 sm:h-20 sm:w-20 shrink-0 rounded-full" />
        <div className="flex-1 min-w-0 w-full space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-24" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
