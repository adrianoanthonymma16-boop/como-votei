import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
import { ParlamentaresAtivos } from '@/components/ParlamentaresAtivos';
import { MetricaProdutividadeInfo } from '@/components/MetricaProdutividadeInfo';
import { LogoMark } from '@/components/Logo';

const StatsCards = dynamic(() => import('@/components/StatsCards').then((mod) => mod.StatsCards), {
  ssr: true,
  loading: () => <StatsCardsSkeleton />,
});

const SearchForm = dynamic(() => import('@/components/SearchForm').then((mod) => mod.SearchForm), {
  ssr: false,
  loading: () => <SearchFormSkeleton />,
});

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-950 to-primary-900" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="inline-flex items-center gap-3 mb-6 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-primary-100">
            <LogoMark className="w-6 h-6" />
            <span>Dados oficiais da Câmara dos Deputados e do Senado Federal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance max-w-3xl">
            Saiba <span className="text-sky-300">como</span> deputados e senadores votaram.
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-primary-100 max-w-2xl mt-6 leading-relaxed">
            Transparência legislativa gratuita: votações nominais, discursos e proposições de cada parlamentar,
            cruzados com partido, estado e presença. Tudo com link para a fonte oficial.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 mt-8">
            <Link
              href="/parlamentares"
              className="inline-flex items-center gap-2 px-6 py-3 bg-sky-400 text-primary-950 font-semibold rounded-lg hover:bg-sky-300 transition-colors"
            >
              Explorar parlamentares
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/sobre"
              className="inline-flex items-center px-6 py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Sobre o projeto
            </Link>
          </div>
        </div>
      </section>

      {/* Números reais */}
      <section className="py-10 sm:py-14 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">O que há na base</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Contagens reais sincronizadas das APIs oficiais — atualizadas diariamente.
              </p>
            </div>
            <Link href="/parlamentares" className="text-accent hover:text-accent/80 text-sm font-medium transition-colors">
              Ver todos os parlamentares
            </Link>
          </div>
          <StatsCards />
        </div>
      </section>

      {/* Busca */}
      <section className="py-10 sm:py-14 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Encontre seu parlamentar</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Busque por nome, partido, estado ou casa legislativa.
            </p>
          </div>
          <SearchForm />
        </div>
      </section>

      {/* Parlamentares Mais Produtivos */}
      <section className="py-10 sm:py-14 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Parlamentares Mais Produtivos</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Top 5 pelo ranking de produtividade — pontuação somada na base.
              </p>
            </div>
            <Link
              href="/parlamentares?sort=produtivos"
              className="hidden sm:inline-flex text-accent hover:text-accent/80 font-medium text-sm items-center gap-1 transition-colors"
            >
              Ver ranking completo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <MetricaProdutividadeInfo />
          <div className="mt-6">
            <ParlamentaresAtivos limit={5} />
          </div>
          <div className="mt-4 sm:hidden">
            <Link
              href="/parlamentares?sort=produtivos"
              className="inline-flex text-accent hover:text-accent/80 font-medium text-sm items-center gap-1 transition-colors"
            >
              Ver ranking completo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat-card animate-pulse pointer-events-none">
          <Skeleton className="h-4 w-28 mb-4" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function SearchFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full max-w-md" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    </div>
  );
}