import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

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
    title: parlamentar.nome,
    description: `${parlamentar.nome} — ${parlamentar.casa === 'CAMARA' ? 'Deputado' : 'Senador'} ${parlamentar.partido?.sigla}/${parlamentar.uf?.sigla}. Votações, discursos e proposições.`,
    openGraph: {
      title: parlamentar.nome,
      description: `${parlamentar.casa === 'CAMARA' ? 'Deputado' : 'Senador'} ${parlamentar.partido?.sigla}/${parlamentar.uf?.sigla}`,
      type: 'article',
    },
  };
}

export default async function ParlamentarPage({ params }: PageProps) {
  const { id } = await params;
  
  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
  });

  if (!parlamentar) {
    redirect('/parlamentares');
  }

  // Redirect to votacoes page as default
  redirect(`/parlamentares/${id}/votacoes`);
}