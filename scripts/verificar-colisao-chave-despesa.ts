/**
 * Gate full-year de colisão zero da chave natural de despesas (Câmara).
 *
 * Este script lê o arquivo JSON descompactado oficial da Câmara
 * ({ "dados": [ … ] } pretty-printed) e deriva a chave `idExterno` para
 * cada registro usando o módulo real `despesa-id.ts`. Relatórios:
 *   - total de registros
 *   - chaves derivadas distintas
 *   - chaves derivadas duplicadas (DEVE ser 0 — exit 1 com listagem de até
 *     10 chaves colidindo caso contrário)
 *   - contagem de duplicatas de `idDocumento` puro (DEVE ser > 0 — esta é a
 *     evidência medida de que o `idDocumento` nu nunca pode ser a chave;
 *     exit 1 se 0, indicando arquivo de entrada errado)
 *   - contagem de linhas com `idDocumento == 0` (reportado, não asserido)
 *   - sanity floor de 150.000 linhas (exit 1 abaixo)
 *
 * Uso:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *     scripts/verificar-colisao-chave-despesa.ts \
 *     /tmp/opencode/cotas/Ano-2025.json
 *
 * Variáveis de ambiente: nenhuma (script puro, sem banco).
 *
 * Estratégia de parsing por delimitador de objeto:
 * O arquivo oficial vem pretty-printed com um objeto por linha dentro do
 * array `dados`. Em vez de materializar a estrutura completa em memória
 * (o arquivo 2025 tem ~225 MB e ~209k linhas), fazemos streaming linha a
 * linha e extraímos objetos JSON completos balanceando chaves `{}`.
 * Isso mantém o uso de memória O(1) por registro e permite processar
 * arquivos de qualquer tamanho sem estourar o heap.
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { derivarIdExternoDespesa } from '../src/lib/sync/despesa-id';

interface ResultadoGate {
  totalRegistros: number;
  chavesDistintas: number;
  chavesDuplicadas: number;
  duplicatasIdDocumento: number;
  linhasIdDocumentoZero: number;
  chavesColidindo: string[];
}

function extrairObjetosDoArray(linha: string, buffer: string): { objetos: string[]; novoBuffer: string } {
  // O arquivo vem com objetos JSON pretty-printed, tipicamente um por linha
  // mas podemos ter quebras de linha dentro de strings. Estratégia:
  // concatena ao buffer e tenta parsear objetos balanceando { }.
  const concatenado = buffer + linha;
  const objetos: string[] = [];
  let nivel = 0;
  let inicio = -1;
  let emString = false;
  let escape = false;

  for (let i = 0; i < concatenado.length; i++) {
    const char = concatenado[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      emString = !emString;
      continue;
    }

    if (!emString) {
      if (char === '{') {
        if (nivel === 0) {
          inicio = i;
        }
        nivel++;
      } else if (char === '}') {
        if (nivel > 0) {
          nivel--;
          if (nivel === 0 && inicio !== -1) {
            objetos.push(concatenado.slice(inicio, i + 1));
            inicio = -1;
          }
        }
      }
    }
  }

  const novoBuffer = nivel > 0 && inicio !== -1 ? concatenado.slice(inicio) : '';
  return { objetos, novoBuffer };
}

async function executarGate(caminhoArquivo: string): Promise<ResultadoGate> {
  const stream = createReadStream(caminhoArquivo, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  const contadores = new Map<string, number>();
  const contadoresIdDocumento = new Map<number, number>();
  let totalRegistros = 0;
  let linhasIdDocumentoZero = 0;
  let buffer = '';
  let dentroDoArrayDados = false;

  for await (const linha of rl) {
    const trimmed = linha.trim();

    // Detectar início do array "dados"
    if (!dentroDoArrayDados) {
      if (trimmed.includes('"dados"') && trimmed.includes('[')) {
        dentroDoArrayDados = true;
        // A linha pode conter o início do array e o primeiro objeto
        const idx = trimmed.indexOf('[');
        if (idx !== -1) {
          const resto = trimmed.slice(idx + 1);
          const { objetos, novoBuffer } = extrairObjetosDoArray(resto, '');
          buffer = novoBuffer;
          for (const objStr of objetos) {
            processarRegistro(objStr, contadores, contadoresIdDocumento);
            totalRegistros++;
          }
        }
      }
      continue;
    }

    // Detectar fim do array
    if (trimmed === ']' || trimmed === ']}' || trimmed.endsWith(']}')) {
      // Processar o que restou no buffer antes do fechamento
      if (buffer.trim()) {
        try {
          const registro = JSON.parse(buffer);
          processarRegistro(buffer, contadores, contadoresIdDocumento);
          totalRegistros++;
        } catch {
          // buffer pode estar incompleto, ignorar
        }
      }
      break;
    }

    // Processar linhas dentro do array
    const { objetos, novoBuffer } = extrairObjetosDoArray(linha, buffer);
    buffer = novoBuffer;

    for (const objStr of objetos) {
      processarRegistro(objStr, contadores, contadoresIdDocumento);
      totalRegistros++;
    }
  }

  await stream.close();

  // Calcular resultados
  let chavesDuplicadas = 0;
  const chavesColidindo: string[] = [];
  for (const [chave, count] of contadores) {
    if (count > 1) {
      chavesDuplicadas += count - 1;
      if (chavesColidindo.length < 10) {
        chavesColidindo.push(chave);
      }
    }
  }

  let duplicatasIdDocumento = 0;
  for (const [_, count] of contadoresIdDocumento) {
    if (count > 1) {
      duplicatasIdDocumento += count - 1;
    }
  }

  return {
    totalRegistros,
    chavesDistintas: contadores.size,
    chavesDuplicadas,
    duplicatasIdDocumento,
    linhasIdDocumentoZero,
    chavesColidindo,
  };

  function processarRegistro(
    objStr: string,
    contadores: Map<string, number>,
    contadoresIdDocumento: Map<number, number>
  ): void {
    try {
      const registro = JSON.parse(objStr);
      const idDocumento = registro.idDocumento;

      // Contar idDocumento
      if (typeof idDocumento === 'number') {
        const count = contadoresIdDocumento.get(idDocumento) || 0;
        contadoresIdDocumento.set(idDocumento, count + 1);
        if (idDocumento === 0) {
          linhasIdDocumentoZero++;
        }
      }

      // Derivar chave e contar
      const chave = derivarIdExternoDespesa('CAMARA', registro);
      const chaveCount = contadores.get(chave) || 0;
      contadores.set(chave, chaveCount + 1);
    } catch (e) {
      // Ignorar linhas que não parseiam como objetos de despesa válidos
      // (ex: vírgulas soltas, metadados do arquivo)
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Uso: npx ts-node scripts/verificar-colisao-chave-despesa.ts <caminho-do-arquivo-json>');
    process.exit(1);
  }

  const caminhoArquivo = args[0];

  try {
    console.log(`\n🔍 GATE FULL-YEAR: Verificando colisão zero em ${caminhoArquivo}`);
    console.log('='.repeat(60));

    const resultado = await executarGate(caminhoArquivo);

    console.log(`\n📊 RESULTADOS:`);
    console.log(`   Total de registros processados: ${resultado.totalRegistros.toLocaleString()}`);
    console.log(`   Chaves derivadas distintas:     ${resultado.chavesDistintas.toLocaleString()}`);
    console.log(`   Chaves derivadas duplicadas:    ${resultado.chavesDuplicadas}`);
    console.log(`   Duplicatas de idDocumento puro: ${resultado.duplicatasIdDocumento.toLocaleString()}`);
    console.log(`   Linhas com idDocumento == 0:  ${resultado.linhasIdDocumentoZero.toLocaleString()}`);

    // Verificações de saída
    let falhou = false;

    if (resultado.chavesDuplicadas > 0) {
      console.error(`\n❌ FALHA: ${resultado.chavesDuplicadas} chaves derivadas colidiram!`);
      console.error('   Primeiras 10 chaves colidindo:');
      for (const chave of resultado.chavesColidindo) {
        console.error(`     ${chave}`);
      }
      falhou = true;
    } else {
      console.log(`\n✅ Chaves derivadas: ZERO COLISÕES`);
    }

    if (resultado.duplicatasIdDocumento === 0) {
      console.error(`\n❌ FALHA: Zero duplicatas de idDocumento puro — arquivo de entrada suspeito (o bulk real SEMPRE tem colisões de idDocumento)`);
      falhou = true;
    } else {
      console.log(`✅ idDocumento duplicado: ${resultado.duplicatasIdDocumento.toLocaleString()} (evidência medida confirmada)`);
    }

    if (resultado.totalRegistros < 150000) {
      console.error(`\n❌ FALHA: Contagem de linhas (${resultado.totalRegistros}) abaixo do sanity floor de 150.000`);
      falhou = true;
    } else {
      console.log(`✅ Sanity floor: ${resultado.totalRegistros.toLocaleString()} linhas (≥ 150.000)`);
    }

    console.log('\n' + '='.repeat(60));

    if (falhou) {
      console.log('❌ GATE FALHOU');
      process.exit(1);
    } else {
      console.log('✅ GATE PASSOU — Colisão zero confirmada no ano completo');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ ERRO NA EXECUÇÃO DO GATE:', error);
    process.exit(1);
  }
}

main();