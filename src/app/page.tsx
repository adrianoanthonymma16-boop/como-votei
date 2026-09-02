import Link from 'next/link';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
import { ParlamentaresRecent } from '@/components/ParlamentaresRecent';

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
      <section className="bg-primary-900 dark:bg-primary-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Como Votei
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-primary-100 max-w-3xl mb-8">
            Transparência legislativa para todos. Analise votações nominais, discursos e 
            proposições de deputados e senadores brasileiros.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Link
              href="/parlamentares"
              className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 bg-white text-primary-900 font-medium rounded-lg hover:bg-primary-50 transition-colors text-sm sm:text-base"
            >
              Explorar Parlamentares
            </Link>
            <Link
              href="/sobre"
              className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20 text-sm sm:text-base"
            >
              Sobre o Projeto
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 sm:py-12 bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StatsCards />
        </div>
      </section>

      {/* Search */}
      <section className="py-8 sm:py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Encontre seu parlamentar</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Busque por nome, partido, estado ou casa legislativa</p>
          </div>
          <SearchForm />
        </div>
      </section>

      {/* Recent */}
      <section className="py-8 sm:py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Parlamentares Recentes</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Últimos parlamentares atualizados na base</p>
            </div>
            <Link
              href="/parlamentares"
              className="text-accent hover:text-accent/80 font-medium text-sm flex items-center gap-1 transition-colors"
            >
              Ver todos
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <ParlamentaresRecent limit={10} />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900 dark:bg-primary-950 text-white py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-bold text-lg mb-3 sm:mb-4">Como Votei</h3>
              <p className="text-primary-200 text-sm">
                Ferramenta de transparência legislativa gratuita e de código aberto.
                Dados oficiais das APIs da Câmara dos Deputados e Senado Federal.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3 sm:mb-4">Módulos</h4>
              <ul className="space-y-2 text-sm text-primary-200">
                <li><Link href="/parlamentares" className="hover:text-white transition-colors">Parlamentares</Link></li>
                <li><Link href="/votacoes" className="hover:text-white transition-colors">Votações</Link></li>
                <li><Link href="/discursos" className="hover:text-white transition-colors">Discursos</Link></li>
                <li><Link href="/proposicoes" className="hover:text-white transition-colors">Proposições</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 sm:mb-4">Dados</h4>
              <ul className="space-y-2 text-sm text-primary-200">
                <li>Câmara dos Deputados</li>
                <li>Senado Federal</li>
                <li>Últimos 3 anos</li>
                <li>Atualização diária</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 sm:mb-4">Projeto</h4>
              <ul className="space-y-2 text-sm text-primary-200">
                <li><a href="https://github.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="/termos" className="hover:text-white transition-colors">Termos de Uso</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-800 pt-6 sm:pt-8 text-center text-sm text-primary-300">
            <p>© 2024 Como Votei. Dados públicos dos Poderes Legislativos. Código aberto sob licença MIT.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat-card animate-pulse pointer-events-none">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function SearchFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}
