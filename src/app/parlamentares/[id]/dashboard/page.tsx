import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { DashboardTab } from '../components/DashboardTab';
import { Badge } from '@/components/ui/Badge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    select: { nome: true, casa: true, partido: { select: { sigla: true } }, uf: { select: { sigla: true } } },
  });

  if (!parlamentar) {
    return { title: 'Parlamentar não encontrado' };
  }

  return {
    title: `Dashboard - ${parlamentar.nome}`,
    description: `Dashboard completo de ${parlamentar.nome} — ${parlamentar.casa === 'CAMARA' ? 'Deputado' : 'Senador'} ${parlamentar.partido?.sigla}/${parlamentar.uf?.sigla}`,
  };
}

export default async function DashboardPage({ params }: PageProps) {
  const { id } = await params;
  
  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    include: {
      partido: true,
      uf: true,
      _count: {
        select: { votos: true, discursos: true, proposicoes: true },
      },
    },
  });

  if (!parlamentar) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <nav className="mb-4 sm:mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <li><Link href="/" className="hover:text-foreground transition-colors">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/parlamentares" className="hover:text-foreground transition-colors">Parlamentares</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/parlamentares/${id}`} className="hover:text-foreground transition-colors">{parlamentar.nome}</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">Dashboard</li>
        </ol>
      </nav>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xl sm:text-2xl md:text-3xl flex-shrink-0 ring-2 ring-border">
            {parlamentar.fotoUrl ? (
              <img src={parlamentar.fotoUrl} alt={parlamentar.nome} className="w-full h-full rounded-full object-cover" />
            ) : (
              parlamentar.nome.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{parlamentar.nome}</h1>
              {parlamentar.partido && (
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm shrink-0"
                  style={{ borderColor: parlamentar.partido.cor || undefined, color: parlamentar.partido.cor || undefined }}
                >
                  {parlamentar.partido.sigla}
                </Badge>
              )}
              {parlamentar.uf && (
                <Badge variant="secondary" className="text-xs sm:text-sm shrink-0">
                  {parlamentar.uf.sigla}
                </Badge>
              )}
              <Badge variant={parlamentar.casa === 'CAMARA' ? 'info' : 'success'} className="text-xs sm:text-sm shrink-0">
                {parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <DashboardTab parlamentarId={parlamentar.id} />
    </div>
  );
}
