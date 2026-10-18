/**
 * Imprime a janela rolante de 3 anos (mais recente primeiro), como lista
 * separada por espaço — no formato consumido pelos loops `for ano in ...` dos
 * workflows de sync. Fonte única: src/lib/ano-padrao.ts (janelaAnos), evitando
 * anos hardcoded que quebrariam na virada do ano.
 *
 * Uso: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/anos-janela.ts
 */
import { janelaAnos } from '../src/lib/ano-padrao';

console.log(janelaAnos(3).join(' '));
