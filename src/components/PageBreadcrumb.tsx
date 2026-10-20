import Link from 'next/link';

interface PageBreadcrumbProps {
  /** Nome do nível atual, exibido como último item. */
  current: string;
}

/** Trilha de navegação padrão das páginas de primeiro nível. */
export function PageBreadcrumb({ current }: PageBreadcrumbProps) {
  return (
    <nav className="mb-6" aria-label="Trilha de navegação">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link href="/" className="-my-2 inline-block py-2 hover:text-foreground transition-colors">
            Início
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="text-foreground font-medium" aria-current="page">
          {current}
        </li>
      </ol>
    </nav>
  );
}
