import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  calcularPontuacao,
  contadoresDeGrupos,
  resumoProdutividade,
} from '@/lib/produtividade';
import { anosComDados } from '@/lib/parlamentar-anos';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
});

/**
 * Validação individual do parlamentar: os mesmos contadores do ranking
 * (apresentados por grupo/tipo, coautoria, aprovadas, faltas, votos, discursos)
 * + pontuação final. Alimenta a aba "Produtividade" do perfil.
 * Com ?ano=, restringe votos/discursos/proposições ao ano.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { ano } = parsed.data;

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

  const [anos, propGroups, faltas, votosSimNao, discursos] = await Promise.all([
    anosComDados(id),
    prisma.proposicao.groupBy({
      by: ['tipo', 'autorPrincipal', 'status'],
      where: {
        parlamentarId: id,
        ...(ano ? { dataApresentacao: { gte: new Date(`${ano}-01-01`), lte: new Date(`${ano}-12-31`) } } : {}),
      },
      _count: { _all: true },
    }),
    prisma.voto.count({
      where: {
        parlamentarId: id,
        tipo: 'AUSENTE',
        ...(ano ? { votacao: { data: { gte: new Date(`${ano}-01-01`), lte: new Date(`${ano}-12-31`) } } } : {}),
      },
    }),
    prisma.voto.count({
      where: {
        parlamentarId: id,
        tipo: { in: ['SIM', 'NAO'] },
        ...(ano ? { votacao: { data: { gte: new Date(`${ano}-01-01`), lte: new Date(`${ano}-12-31`) } } } : {}),
      },
    }),
    prisma.discurso.count({
      where: {
        parlamentarId: id,
        ...(ano ? { data: { gte: new Date(`${ano}-01-01`), lte: new Date(`${ano}-12-31`) } } : {}),
      },
    }),
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
    ano: ano ?? null,
    anos,
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
