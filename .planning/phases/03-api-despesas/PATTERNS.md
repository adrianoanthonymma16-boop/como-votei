Phase 03 — Code Patterns

API Route Pattern (copy from existing routes):

```typescript
// src/app/api/parlamentares/[id]/despesas/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Query params validation
const querySchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  itensPorPagina: z.coerce.number().int().positive().max(50).default(20),
});

// Path param validation
const parlamentarIdSchema = z.string().uuid();

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }) {
  // Validate path param
  const pathResult = parlamentarIdSchema.safeParse(params.id);
  if (!pathResult.success) {
    return NextResponse.json({ error: 'parlamentar inválido' }, { status: 400 });
  }
  const parlamentarId = pathResult.data;

  // Validate query params
  const { searchParams } = new URL(request.url);
  const queryResult = querySchema.safeParse({
    pagina: searchParams.get('pagina'),
    itensPorPagina: searchParams.get('itensPorPagina'),
  });
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Parâmetros de consulta inválidos', details: queryResult.error.format() },
      { status: 400 }
    );
  }

  const { pagina, itensPorPagina } = queryResult.data;

  // Check parlamentar exists (404 if not)
  const parlamentarExists = await prisma.parlamentar.findFirst({
    where: { idExterno: parlamentarId },
  });
  if (!parlamentarExists) {
    return NextResponse.json(
      { error: 'parlamentar não encontrado' },
      { status: 404 }
    );
  }

  // Query despesas with pagination
  const [despesas, total] = await Promise.all([
    prisma.despesa.findMany({
      where: { parlamentarId },
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
      orderBy: { data: 'desc' },
    }),
    prisma.despesa.count({ where: { parlamentarId } }),
  ]);

  const totalPaginas = Math.ceil(total / itensPorPagina);

  return NextResponse.json({
    data: despesas,
    meta: { pagina, totalPaginas, totalItens: total },
  });
}
```

Pure helpers pattern (reuse existing):
- computeFrequencia, calcularPontuacao from src/lib/
- parseBRL, parseDataFonte from src/lib/despesas
- No Prisma client in pure functions — take plain data arrays

Import organization:
- Prefer @/ alias: import { calcularPontuacao } from '@/lib/produtividade'
- Inline type imports: import { type ClassValue, clsx } from 'clsx'
- Named function declarations, never default exports