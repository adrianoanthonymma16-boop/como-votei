import type { Metadata } from 'next';
import Link from 'next/link';
import { LogoMark } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Página não encontrada',
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <LogoMark className="size-12 text-accent" />
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Erro 404
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Página não encontrada
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        O endereço acessado não existe ou pode ter sido movido. Você pode voltar ao início
        ou procurar um parlamentar diretamente.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Voltar ao início
        </Link>
        <Link
          href="/parlamentares"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Ver parlamentares
        </Link>
      </div>
    </div>
  );
}
