import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DiscursosTab } from '../components/DiscursosTab';
import { ParlamentarHeader } from '../components/ParlamentarHeader';

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
    title: `Discursos - ${parlamentar.nome}`,
    description: `Discursos e pronunciamentos de ${parlamentar.nome} — ${parlamentar.casa === 'CAMARA' ? 'Deputado' : 'Senador'} ${parlamentar.partido?.sigla}/${parlamentar.uf?.sigla}`,
  };
}

export default async function DiscursosPage({ params }: PageProps) {
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
      <ParlamentarHeader parlamentar={parlamentar} activeTab="discursos" />
      <DiscursosTab parlamentarId={parlamentar.id} />
    </div>
  );
}
