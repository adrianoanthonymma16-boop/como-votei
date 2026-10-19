import { test, expect } from '@playwright/test';

test.describe('Aba Gastos — cota parlamentar', () => {
  test('resumo e lista de despesas aparecem com estado honesto', async ({ page }) => {
    // Descobre um parlamentar pela lista (o id muda entre ambientes/datasets).
    await page.goto('/parlamentares');
    const linkVotacoes = page.locator('a[href^="/parlamentares/"][href$="/votacoes"]').first();
    await expect(linkVotacoes).toBeVisible();
    const href = await linkVotacoes.getAttribute('href');
    const parlamentarId = href?.match(/\/parlamentares\/([^/]+)\/votacoes/)?.[1];
    expect(parlamentarId).toBeTruthy();

    await page.goto(`/parlamentares/${parlamentarId}/gastos`);

    // Resumo financeiro da cota (fonte citada para conferência).
    await expect(page.getByRole('heading', { name: 'Resumo Financeiro' })).toBeVisible();
    await expect(page.getByText('Total gasto')).toBeVisible();
    await expect(page.getByText(/Cota Parlamentar \(CEAP\)|Custeio de Atividade Parlamentar \(CEAPS\)/)).toBeVisible();

    // Sem estimativa: ou há tabela de despesas, ou a ausência é explícita.
    // Escopar por "Fornecedor" evita colidir com a tabela do bloco de emendas.
    const tabela = page.getByRole('table').filter({ hasText: 'Fornecedor' });
    const semDespesas = page.getByText(/Nenhuma despesa encontrada/);
    await expect(tabela.or(semDespesas).first()).toBeVisible();

    if (await tabela.count()) {
      await expect(tabela.getByRole('columnheader', { name: 'Fornecedor' })).toBeVisible();
      // Quando existe comprovante, o link abre em nova aba de forma segura.
      const comprovante = tabela.locator('a[target="_blank"][rel="noopener noreferrer"]').first();
      if (await comprovante.count()) {
        await expect(comprovante).toBeVisible();
      }
    }
  });
});
