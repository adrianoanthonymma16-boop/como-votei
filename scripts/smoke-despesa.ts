/**
 * Smoke test de banco de dados para o modelo Despesa.
 *
 * Este script escreve e relê as quatro linhas dos pares subcota-split
 * (idDocumento 7869356) e estorno (idDocumento 302649) no banco real,
 * provando:
 *   - Round-trip Decimal ao centavo em ambos os signos (+309.68/+396.24
 *     e ±1967.57)
 *   - Rejeição de idExterno duplicado (P2002)
 *   - Linha líder com parlamentarId null armazenada e lida como null
 *   - Limpeza: remove todos os dados de teste ao final
 *
 * Uso:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/smoke-despesa.ts
 *
 * Variáveis de ambiente necessárias: DATABASE_URL (PostgreSQL alcançável)
 */

import { PrismaClient, Casa, Prisma } from '@prisma/client';
import { derivarIdExternoDespesa } from '../src/lib/sync/despesa-id';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Registros de teste baseados no fixture real
const registrosTeste = [
  {
    // subcota-split 1: valorLiquido +309.68
    caso: 'subcota-split-1',
    registro: {
      nomeParlamentar: 'Lafayette de Andrada',
      cpf: '38105195100',
      idDeputado: 98057,
      numeroCarteiraParlamentar: '256',
      legislatura: 2023,
      siglaUF: 'MG',
      siglaPartido: 'PL',
      codigoLegislatura: 57,
      numeroSubCota: 1,
      descricao: 'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR',
      numeroEspecificacaoSubCota: 0,
      descricaoEspecificacao: '',
      fornecedor: 'CLARO NEXTEL TELECOMUNICAÇÕES S.A',
      cnpjCPF: '669.702.290/0210-0 ',
      numero: '2501952681880',
      tipoDocumento: '0',
      dataEmissao: '2025-01-21T00:00:00',
      valorDocumento: '705.92',
      valorGlosa: '0',
      valorLiquido: '309.68',
      mes: 1,
      ano: 2025,
      parcela: 0,
      passageiro: '',
      trecho: '',
      lote: '2110721',
      ressarcimento: '',
      datPagamentoRestituicao: '',
      restituicao: '',
      numeroDeputadoID: 3420,
      idDocumento: 7869356,
      urlDocumento: 'https://www.camara.leg.br/cota-parlamentar/documentos/publ/3420/2025/7869356.pdf',
    },
    esperado: {
      valorLiquido: 309.68,
      ano: 2025,
      mes: 1,
      parlamentarIdNull: false,
    },
  },
  {
    // subcota-split 2: valorLiquido +396.24
    caso: 'subcota-split-2',
    registro: {
      nomeParlamentar: 'Lafayette de Andrada',
      cpf: '38105195100',
      idDeputado: 98057,
      numeroCarteiraParlamentar: '256',
      legislatura: 2023,
      siglaUF: 'MG',
      siglaPartido: 'PL',
      codigoLegislatura: 57,
      numeroSubCota: 10,
      descricao: 'TELEFONIA',
      numeroEspecificacaoSubCota: 0,
      descricaoEspecificacao: '',
      fornecedor: 'CLARO NEXTEL TELECOMUNICAÇÕES S.A',
      cnpjCPF: '669.702.290/0210-0 ',
      numero: '2501952681880',
      tipoDocumento: '0',
      dataEmissao: '2025-01-21T00:00:00',
      valorDocumento: '705.92',
      valorGlosa: '0',
      valorLiquido: '396.24',
      mes: 1,
      ano: 2025,
      parcela: 0,
      passageiro: '',
      trecho: '',
      lote: '2110721',
      ressarcimento: '',
      datPagamentoRestituicao: '',
      restituicao: '',
      numeroDeputadoID: 3420,
      idDocumento: 7869356,
      urlDocumento: '',
    },
    esperado: {
      valorLiquido: 396.24,
      ano: 2025,
      mes: 1,
      parlamentarIdNull: false,
    },
  },
  {
    // estorno negativo: -1967.57
    caso: 'estorno-negativo',
    registro: {
      nomeParlamentar: 'Danilo Forte',
      cpf: '12133728368',
      idDeputado: 62881,
      numeroCarteiraParlamentar: '91',
      legislatura: 2023,
      siglaUF: 'CE',
      siglaPartido: 'PP',
      codigoLegislatura: 57,
      numeroSubCota: 998,
      descricao: 'PASSAGEM AÉREA - SIGEPA',
      numeroEspecificacaoSubCota: 0,
      descricaoEspecificacao: '',
      fornecedor: 'TAM',
      cnpjCPF: '020.128.620/0016-0 ',
      numero: '9572215776490',
      tipoDocumento: '0',
      dataEmissao: '2025-01-16T12:00:00',
      valorDocumento: '-1967.57',
      valorGlosa: '0',
      valorLiquido: '-1967.57',
      mes: 1,
      ano: 2025,
      parcela: 0,
      passageiro: 'FRANCISCO DANILO BASTOS FORTE',
      trecho: 'FOR/BSB',
      lote: '0',
      ressarcimento: '0',
      datPagamentoRestituicao: '',
      restituicao: '',
      numeroDeputadoID: 2227,
      idDocumento: 302649,
      urlDocumento: '',
    },
    esperado: {
      valorLiquido: -1967.57,
      ano: 2025,
      mes: 1,
      parlamentarIdNull: false,
    },
  },
  {
    // estorno positivo: +1967.57
    caso: 'estorno-positivo',
    registro: {
      nomeParlamentar: 'Danilo Forte',
      cpf: '12133728368',
      idDeputado: 62881,
      numeroCarteiraParlamentar: '91',
      legislatura: 2023,
      siglaUF: 'CE',
      siglaPartido: 'PP',
      codigoLegislatura: 57,
      numeroSubCota: 998,
      descricao: 'PASSAGEM AÉREA - SIGEPA',
      numeroEspecificacaoSubCota: 0,
      descricaoEspecificacao: '',
      fornecedor: 'TAM',
      cnpjCPF: '020.128.620/0016-0 ',
      numero: '9572215776490',
      tipoDocumento: '0',
      dataEmissao: '2025-01-16T12:00:00',
      valorDocumento: '1967.57',
      valorGlosa: '0',
      valorLiquido: '1967.57',
      mes: 1,
      ano: 2025,
      parcela: 0,
      passageiro: 'FRANCISCO DANILO BASTOS FORTE',
      trecho: 'FOR/BSB',
      lote: '0',
      ressarcimento: '0',
      datPagamentoRestituicao: '',
      restituicao: '',
      numeroDeputadoID: 2227,
      idDocumento: 302649,
      urlDocumento: '',
    },
    esperado: {
      valorLiquido: 1967.57,
      ano: 2025,
      mes: 1,
      parlamentarIdNull: false,
    },
  },
];

// Registro líder (sem idDeputado válido → parlamentarId null)
const registroLider = {
  caso: 'linha-lider-sem-parlamentar',
  registro: {
    nomeParlamentar: 'LID.GOV-CD',
    cpf: '',
    numeroCarteiraParlamentar: '',
    legislatura: 2023,
    siglaUF: 'NA',
    siglaPartido: '',
    codigoLegislatura: 57,
    numeroSubCota: 1,
    descricao: 'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR',
    numeroEspecificacaoSubCota: 0,
    descricaoEspecificacao: '',
    fornecedor: 'AMORETTO CAFES EXPRESSO LTDA',
    cnpjCPF: '085.324.290/0013-1 ',
    numero: '1984',
    tipoDocumento: '0',
    dataEmissao: '2025-02-07T00:00:00',
    valorDocumento: '1467',
    valorGlosa: '0',
    valorLiquido: '1467',
    mes: 2,
    ano: 2025,
    parcela: 0,
    passageiro: '',
    trecho: '',
    lote: '2115566',
    ressarcimento: '',
    datPagamentoRestituicao: '',
    restituicao: '',
    numeroDeputadoID: 2812,
    idDocumento: 7877589,
    urlDocumento: 'https://www.camara.leg.br/cota-parlamentar/documentos/publ/2812/2025/7877589.pdf',
  },
  esperado: {
    valorLiquido: 1467,
    ano: 2025,
    mes: 2,
    parlamentarIdNull: true,
  },
};

function parseDataEmissao(valor: string): Date | null {
  if (!valor || valor.trim() === '') return null;
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
}

function parseDecimal(valor: string): Prisma.Decimal {
  return new Prisma.Decimal(valor);
}

function buildDespesaData(item: typeof registrosTeste[0] | typeof registroLider, casa: Casa = Casa.CAMARA) {
  const r = item.registro;
  const idExterno = derivarIdExternoDespesa(casa, r as Record<string, unknown>);
  const data = parseDataEmissao(r.dataEmissao);

  return {
    idExterno,
    casa,
    ano: r.ano,
    mes: r.mes,
    data,
    categoria: r.descricao,
    fornecedor: r.fornecedor,
    cpfCnpj: r.cnpjCPF?.trim() || null,
    documento: r.numero || null,
    valor: parseDecimal(r.valorLiquido),
    valorGlosa: r.valorGlosa && r.valorGlosa !== '0' ? parseDecimal(r.valorGlosa) : null,
    urlDocumento: r.urlDocumento || null,
    nomeParlamentarRaw: r.nomeParlamentar,
    parlamentarId: item.esperado.parlamentarIdNull ? null : undefined, // será resolvido via name-match em produção; aqui null explícito para líder
  };
}

async function main() {
  console.log('\n🧪 SMOKE TEST: Modelo Despesa — Round-trip Decimal, Unique, Null FK');
  console.log('='.repeat(60));

  let falhou = false;
  const idsCriados: string[] = [];

  try {
    // 1. Verificar conexão
    console.log('\n📡 Testando conexão com o banco...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexão OK');

    // 2. Inserir os 4 registros do par subcota-split + estorno
    console.log('\n📝 Inserindo 4 registros de teste (2 subcota-split + 2 estorno)...');
    for (const item of registrosTeste) {
      const data = buildDespesaData(item);
      const criado = await prisma.despesa.create({ data });
      idsCriados.push(criado.id);
      console.log(`   ✅ ${item.caso}: idExterno=${criado.idExterno}, valor=${criado.valor}`);
    }

    // 3. Inserir registro líder (parlamentarId null)
    console.log('\n👑 Inserindo registro líder (parlamentarId = null)...');
    const dataLider = buildDespesaData(registroLider);
    const liderCriado = await prisma.despesa.create({ data: dataLider });
    idsCriados.push(liderCriado.id);
    console.log(`   ✅ ${registroLider.caso}: idExterno=${liderCriado.idExterno}, parlamentarId=${liderCriado.parlamentarId}`);

    // 4. Verificar round-trip Decimal ao centavo
    console.log('\n🔄 Verificando round-trip Decimal (precisão ao centavo)...');
    for (const item of registrosTeste) {
      const idExterno = derivarIdExternoDespesa(Casa.CAMARA, item.registro as Record<string, unknown>);
      const lido = await prisma.despesa.findUnique({ where: { idExterno } });
      if (!lido) {
        console.error(`   ❌ ${item.caso}: registro não encontrado após insert`);
        falhou = true;
        continue;
      }
      const lidoValor = Number(lido.valor);
      const esperado = item.esperado.valorLiquido;
      if (Math.abs(lidoValor - esperado) > 0.005) {
        console.error(`   ❌ ${item.caso}: valor divergente — lido=${lidoValor}, esperado=${esperado}`);
        falhou = true;
      } else {
        console.log(`   ✅ ${item.caso}: ${lidoValor} === ${esperado} (centavo OK)`);
      }
    }

    // 5. Verificar registro líder com parlamentarId null
    console.log('\n👑 Verificando registro líder (parlamentarId = null)...');
    const idExternoLider = derivarIdExternoDespesa(Casa.CAMARA, registroLider.registro as Record<string, unknown>);
    const lidoLider = await prisma.despesa.findUnique({ where: { idExterno: idExternoLider } });
    if (!lidoLider) {
      console.error('   ❌ Registro líder não encontrado');
      falhou = true;
    } else if (lidoLider.parlamentarId !== null) {
      console.error(`   ❌ parlamentarId deveria ser null, mas é: ${lidoLider.parlamentarId}`);
      falhou = true;
    } else {
      console.log(`   ✅ parlamentarId = null confirmado`);
      const lidoValor = Number(lidoLider.valor);
      if (Math.abs(lidoValor - registroLider.esperado.valorLiquido) > 0.005) {
        console.error(`   ❌ Valor líder divergente: ${lidoValor} !== ${registroLider.esperado.valorLiquido}`);
        falhou = true;
      } else {
        console.log(`   ✅ Valor líder: ${lidoValor} (centavo OK)`);
      }
    }

    // 6. Verificar distinção de chaves dentro de cada par
    console.log('\n🔑 Verificando distinção de chaves (subcota-split e estorno)...');
    const chavesSubcota = [
      derivarIdExternoDespesa(Casa.CAMARA, registrosTeste[0].registro as Record<string, unknown>),
      derivarIdExternoDespesa(Casa.CAMARA, registrosTeste[1].registro as Record<string, unknown>),
    ];
    const chavesEstorno = [
      derivarIdExternoDespesa(Casa.CAMARA, registrosTeste[2].registro as Record<string, unknown>),
      derivarIdExternoDespesa(Casa.CAMARA, registrosTeste[3].registro as Record<string, unknown>),
    ];

    if (chavesSubcota[0] === chavesSubcota[1]) {
      console.error('   ❌ Par subcota-split produziu chaves IDÊNTICAS (colisão!)');
      falhou = true;
    } else {
      console.log(`   ✅ Subcota-split: chaves distintas`);
      console.log(`      ${chavesSubcota[0]}`);
      console.log(`      ${chavesSubcota[1]}`);
    }

    if (chavesEstorno[0] === chavesEstorno[1]) {
      console.error('   ❌ Par estorno produziu chaves IDÊNTICAS (colisão!)');
      falhou = true;
    } else {
      console.log(`   ✅ Estorno: chaves distintas`);
      console.log(`      ${chavesEstorno[0]}`);
      console.log(`      ${chavesEstorno[1]}`);
    }

    // 7. Testar rejeição de idExterno duplicado (P2002)
    console.log('\n🚫 Testando constraint @@unique(idExterno) — tentativa de duplicate insert...');
    const itemParaDuplicar = registrosTeste[0];
    const dataDuplicada = buildDespesaData(itemParaDuplicar);
    try {
      await prisma.despesa.create({ data: dataDuplicada });
      console.error('   ❌ Insert duplicado NÃO foi rejeitado (constraint unique falhou)');
      falhou = true;
    } catch (e: any) {
      if (e.code === 'P2002' && e.meta?.target?.includes('id_externo')) {
        console.log('   ✅ P2002 lançado corretamente em idExterno duplicado');
      } else {
        console.error(`   ❌ Erro inesperado no duplicate insert: ${e.code} — ${e.message}`);
        falhou = true;
      }
    }

    // 8. Limpeza: remover todos os registros de teste
    console.log('\n🧹 Limpando dados de teste...');
    const deleted = await prisma.despesa.deleteMany({
      where: { id: { in: idsCriados } },
    });
    console.log(`   ✅ ${deleted.count} registros de teste removidos`);

    // 9. Verificar que limpeza funcionou
    const restantes = await prisma.despesa.findMany({
      where: { id: { in: idsCriados } },
    });
    if (restantes.length > 0) {
      console.error(`   ❌ ${restantes.length} registros permaneceram após limpeza`);
      falhou = true;
    } else {
      console.log('   ✅ Limpeza verificada — zero registros restantes');
    }

  } catch (error: any) {
    console.error('\n❌ ERRO INESPERADO NO SMOKE TEST:', error);
    falhou = true;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '='.repeat(60));
  if (falhou) {
    console.log('❌ SMOKE TEST FALHOU');
    process.exit(1);
  } else {
    console.log('✅ SMOKE TEST PASSOU — Todos os checks OK');
    process.exit(0);
  }
}

main();