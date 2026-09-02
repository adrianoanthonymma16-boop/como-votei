import Link from 'next/link';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';
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
      <header className="bg-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Como Votei
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 max-w-3xl mb-8">
            Transparência legislativa para todos. Analise votações nominais, discursos e 
            proposições de deputados e senadores brasileiros.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/parlamentares"
              className="inline-flex items-center px-6 py-3 bg-secondary-500 text-white font-medium rounded-lg hover:bg-secondary-600 transition-colors"
            >
              Explorar Parlamentares
            </Link>
            <Link
              href="/sobre"
              className="inline-flex items-center px-6 py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Sobre o Projeto
            </Link>
          </div>
        </div>
      </header>

      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StatsCards />
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Encontre seu parlamentar</h2>
            <p className="text-gray-600">Busque por nome, partido, estado ou casa legislativa</p>
          </div>
          <SearchForm />
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Parlamentares Recentes</h2>
              <p className="text-gray-600 mt-1">Últimos parlamentares atualizados na base</p>
            </div>
            <Link
              href="/parlamentares"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
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

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Como Votei</h3>
              <p className="text-gray-400 text-sm">
                Ferramenta de transparência legislativa gratuita e de código aberto.
                Dados oficiais das APIs da Câmara dos Deputados e Senado Federal.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Módulos</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/parlamentares" className="hover:text-white">Parlamentares</Link></li>
                <li><Link href="/votacoes" className="hover:text-white">Votações</Link></li>
                <li><Link href="/discursos" className="hover:text-white">Discursos</Link></li>
                <li><Link href="/proposicoes" className="hover:text-white">Proposições</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Dados</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Câmara dos Deputados</li>
                <li>Senado Federal</li>
                <li>Últimos 3 anos</li>
                <li>Atualização diária</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Projeto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://github.com" target="_blank" rel="noopener" className="hover:text-white">GitHub</a></li>
                <li><a href="/privacidade" className="hover:text-white">Privacidade</a></li>
                <li><a href="/termos" className="hover:text-white">Termos de Uso</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 Como Votei. Dados públicos dos Poderes Legislativos. Código aberto sob licença MIT.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-12 w-32" />
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