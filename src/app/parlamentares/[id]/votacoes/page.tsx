import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { VotacoesTab } from './components/VotacoesTab';
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
    title: `Votações - ${parlamentar.nome}`,
    description: `Histórico de votações de ${parlamentar.nome} — ${parlamentar.casa === 'CAMARA' ? 'Deputado' : 'Senador'} ${parlamentar.partido?.sigla}/${parlamentar.uf?.sigla}`,
  };
}

export default async function VotacoesPage({ params }: PageProps) {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-foreground">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/parlamentares" className="hover:text-foreground">Parlamentares</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/parlamentares/${id}`} className="hover:text-foreground">{parlamentar.nome}</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium" aria-current="page">Votações</li>
        </ol>
      </nav>

      <ParlamentarHeader parlamentar={parlamentar} />
      <VotacoesTab parlamentarId={parlamentar.id} />
    </div>
  );
}

function ParlamentarHeader({ parlamentar }: { parlamentar: any }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl md:text-3xl flex-shrink-0">
          {parlamentar.fotoUrl ? (
            <img src={parlamentar.fotoUrl} alt={parlamentar.nome} className="w-full h-full rounded-full object-cover" />
          ) : (
            parlamentar.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{parlamentar.nome}</h1>
            {parlamentar.partido && (
              <Badge
                variant="outline"
                className="text-sm"
                style={{ borderColor: parlamentar.partido.cor || undefined, color: parlamentar.partido.cor || undefined }}
              >
                {parlamentar.partido.sigla}
              </Badge>
            )}
            {parlamentar.uf && (
              <Badge variant="secondary" className="text-sm">
                {parlamentar.uf.sigla}
              </Badge>
            )}
            <Badge variant={parlamentar.casa === 'CAMARA' ? 'info' : 'success'} className="text-sm">
              {parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}