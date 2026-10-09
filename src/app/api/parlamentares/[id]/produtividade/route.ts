import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calcularPontuacao,
  contadoresDeGrupos,
  resumoProdutividade,
} from '@/lib/produtividade';

export const dynamic = 'force-dynamic';

/**
 * Validação individual do parlamentar: os mesmos contadores do ranking
 * (apresentados por grupo/tipo, coautoria, aprovadas, faltas, votos, discursos)
 * + pontuação final. Alimenta a aba "Produtividade" do perfil.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    include: {
      partido: { select: { sigla: true, cor: true } },
      uf: { select: { sigla: true } },
    },
  });

  if (!parlamentar) {
    return NextResponse.json(
      { error: 'Parlamentar não encontrado' },
      { status: 404 }
    );
  }

  const [propGroups, faltas, votosSimNao, discursos] = await Promise.all([
    prisma.proposicao.groupBy({
      by: ['tipo', 'autorPrincipal', 'status'],
      where: { parlamentarId: id },
      _count: { _all: true },
    }),
    prisma.voto.count({ where: { parlamentarId: id, tipo: 'AUSENTE' } }),
    prisma.voto.count({ where: { parlamentarId: id, tipo: { in: ['SIM', 'NAO'] } } }),
    prisma.discurso.count({ where: { parlamentarId: id } }),
  ]);

  const grupos = contadoresDeGrupos(
    (propGroups as any[]).map((g) => ({
      tipo: g.tipo,
      autorPrincipal: g.autorPrincipal,
      status: g.status,
      qtd: g._count._all,
    }))
  );

  const contadores = { ...grupos, faltas, votosSimNao, discursos };
  const pontuacao = calcularPontuacao(contadores);

  return NextResponse.json({
    parlamentar: {
      id: parlamentar.id,
      nome: parlamentar.nome,
      casa: parlamentar.casa,
      partido: parlamentar.partido ? { sigla: parlamentar.partido.sigla, cor: parlamentar.partido.cor } : null,
      uf: parlamentar.uf ? { sigla: parlamentar.uf.sigla } : null,
    },
    pontuacao,
    ...contadores,
    resumo: resumoProdutividade(contadores),
  });
}
