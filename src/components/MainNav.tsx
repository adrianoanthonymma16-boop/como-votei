'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/parlamentares', label: 'Parlamentares' },
  { href: '/votacoes', label: 'Votações' },
  { href: '/sobre', label: 'Sobre' },
] as const;

function estaAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Navegação principal no header (telas a partir de sm). */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden sm:flex items-center gap-6 text-sm" aria-label="Navegação principal">
      {LINKS.map((link) => {
        const ativo = estaAtivo(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-md px-1 transition-colors hover:text-foreground',
              ativo ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Navegação principal no mobile, em faixa própria abaixo do header. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex sm:hidden items-center gap-1 border-t px-2 py-1 text-sm overflow-x-auto scrollbar-hide"
      aria-label="Navegação principal"
    >
      {LINKS.map((link) => {
        const ativo = estaAtivo(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              'rounded-md px-2 py-2.5 whitespace-nowrap transition-colors',
              ativo ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
