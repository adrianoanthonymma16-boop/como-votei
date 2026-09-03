import type { Metadata } from 'next';
import Link from 'next/link';
import { LogoMark } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Sobre o Projeto',
  description:
    'Conheça o Como Votei: ferramenta pública e gratuita de transparência legislativa sobre votações, discursos e proposições de deputados e senadores.',
};

const MODULOS = [
  {
    titulo: 'Votações',
    descricao:
      'Histórico de votações nominais de cada parlamentar, com o sentido do voto em cada deliberação e a comparação com a orientação do partido.',
    cor: 'border-blue-200 dark:border-blue-900',
    hover: 'hover:border-blue-400 dark:hover:border-blue-700',
    texto: 'text-blue-700 dark:text-blue-300',
    icone: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    titulo: 'Discursos',
    descricao:
      'Pronunciamentos em plenário e em ordem do dia, com resumo do conteúdo e link direto para o texto oficial na fonte.',
    cor: 'border-purple-200 dark:border-purple-900',
    hover: 'hover:border-purple-400 dark:hover:border-purple-700',
    texto: 'text-purple-700 dark:text-purple-300',
    icone: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h8m-8 4h5m-9 5V7a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4z" />
      </svg>
    ),
  },
  {
    titulo: 'Proposições',
    descricao:
      'Projetos de lei e outras proposições de autoria, com ementa, situação atual da tramitação e link para a ficha oficial.',
    cor: 'border-green-200 dark:border-green-900',
    hover: 'hover:border-green-400 dark:hover:border-green-700',
    texto: 'text-green-700 dark:text-green-300',
    icone: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const PRINCIPIOS = [
  {
    titulo: 'Transparência',
    texto: 'Cada dado exibido aponta para a fonte oficial, para que você possa validar a informação.',
  },
  {
    titulo: 'Gratuito e aberto',
    texto: 'Sem cadastro, sem assinatura e sem muros: código aberto e dados públicos para qualquer pessoa.',
  },
  {
    titulo: 'Baseado em dados oficiais',
    texto: 'Sincronizamos as APIs públicas da Câmara dos Deputados e do Senado Federal.',
  },
  {
    titulo: 'Sem vigilância',
    texto: 'Nenhum login, nenhum rastreamento de comportamento: sua visita é anônima.',
  },
];

export default function SobrePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-950 to-sky-950" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="flex justify-center mb-6">
            <LogoMark className="w-14 h-14" />
          </div>
          <p className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-primary-100 mb-5">
            Ferramenta de transparência legislativa
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Sobre o <span className="text-sky-300">Como Votei</span>
          </h1>
          <p className="mt-6 text-lg text-primary-100 leading-relaxed max-w-2xl mx-auto">
            O Como Votei nasce de uma pergunta simples: como votou quem eu elegi? Reunimos em um só lugar
            as votações, os discursos e as proposições de deputados e senadores brasileiros, com dados
            oficiais e link para a fonte.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/parlamentares"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-400 px-6 py-3 font-semibold text-primary-950 transition-colors hover:bg-sky-300"
            >
              Explorar parlamentares
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="https://github.com/adrianoanthonymma16-boop/como-votei"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-6 py-3 font-medium text-white transition-colors hover:bg-white/20"
            >
              Código aberto no GitHub
            </a>
          </div>
        </div>
      </section>

      {/* O que você encontra */}
      <section className="py-16 sm:py-20 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">O que você encontra aqui</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Três dimensões da atuação parlamentar, navegáveis por deputado ou senador.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {MODULOS.map((m) => (
              <Link
                key={m.titulo}
                href="/parlamentares"
                className={`group rounded-2xl border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${m.cor} ${m.hover}`}
              >
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${m.texto}`}>
                  {m.icone}
                </span>
                <h3 className="mt-4 text-lg font-bold group-hover:underline">{m.titulo}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.descricao}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Como funciona</h2>
            <p className="text-muted-foreground mt-3">Dos dados abertos à sua tela, em três passos.</p>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Coleta', d: 'Um processo diário consulta as APIs públicas da Câmara e do Senado em busca de dados novos e atualizados.' },
              { n: '02', t: 'Normalização', d: 'As duas casas têm formatos diferentes. Unificamos tudo em um modelo único para permitir buscas e comparações.' },
              { n: '03', t: 'Consulta', d: 'O site lê os dados localmente e exibe para você com agilidade, sempre com referência à fonte original.' },
            ].map((s) => (
              <li key={s.n} className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent/40">
                <span className="text-sm font-bold text-accent">{s.n}</span>
                <h3 className="mt-2 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Fontes oficiais */}
      <section className="py-16 sm:py-20 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Fontes de dados oficiais</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Nenhum dado é inventado: tudo vem dos portais de transparência do Poder Legislativo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <a
              href="https://dadosabertos.camara.leg.br"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border bg-background p-6 transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-bold group-hover:underline">Câmara dos Deputados</h3>
                  <p className="text-sm text-muted-foreground">Dados Abertos da Câmara</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Votações nominais, discursos e proposições da Câmara, via API REST aberta.
              </p>
            </a>
            <a
              href="https://legis.senado.leg.br/dadosabertos"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border bg-background p-6 transition-all duration-200 hover:-translate-y-1 hover:border-green-400 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-bold group-hover:underline">Senado Federal</h3>
                  <p className="text-sm text-muted-foreground">Dados Abertos do Senado</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Votações, discursos e proposições do Senado, via API de dados abertos.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Princípios */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Nossos princípios</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRINCIPIOS.map((p) => (
              <div key={p.titulo} className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent/40 hover:bg-accent/5">
                <h3 className="font-bold">{p.titulo}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Escopo / privacidade */}
      <section className="py-14 bg-card border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold">Transparência sobre os limites</h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            O Como Votei é 100% público: sem login, sem cadastro e sem coleta de dados pessoais. A base
            cobre os últimos anos de atividade legislativa das duas casas e é atualizada diariamente. O
            projeto não tem vínculo com partidos, parlamentares ou governo.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden bg-primary-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-950 to-sky-950" aria-hidden="true" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Acompanhe quem representa você</h2>
          <p className="mt-3 text-primary-100">
            Comece pela busca e veja como deputados e senadores se comportam nas votações.
          </p>
          <Link
            href="/parlamentares"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-sky-400 px-6 py-3 font-semibold text-primary-950 transition-colors hover:bg-sky-300"
          >
            Explorar parlamentares
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}
