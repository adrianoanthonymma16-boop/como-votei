import { test, expect } from '@playwright/test';

test.describe('Emendas na aba Gastos', () => {
  test('bloco de emendas aparece com dados oficiais ou mensagem explícita', async ({ page }) => {
    // Descobre um parlamentar pela lista (o id muda entre ambientes/datasets).
    await page.goto('/parlamentares');
    const linkVotacoes = page.locator('a[href^="/parlamentares/"][href$="/votacoes"]').first();
    await expect(linkVotacoes).toBeVisible();
    const href = await linkVotacoes.getAttribute('href');
    const parlamentarId = href?.match(/\/parlamentares\/([^/]+)\/votacoes/)?.[1];
    expect(parlamentarId).toBeTruthy();

    await page.goto(`/parlamentares/${parlamentarId}/gastos`);

    const bloco = page.locator('section', { hasText: 'Emendas parlamentares' });
    await expect(bloco).toBeVisible();

    // A fonte é citada para o usuário conferir.
    await expect(bloco.getByText('Portal da Transparência').first()).toBeVisible();

    const tabela = bloco.locator('table');
    const semDados = bloco.getByText('Sem dados oficiais de emendas');

    // Sem estimativa: ou há tabela de emendas, ou a ausência é explícita.
    await expect(tabela.or(semDados)).toBeVisible();

    if (await tabela.isVisible()) {
      // A tabela tem variantes mobile e desktop; só uma está visível no
      // viewport do teste (a outra vive num container com display:none).
      const linkFonte = tabela
        .locator('a[href*="portaldatransparencia.gov.br/emendas"]:visible')
        .first();
      await expect(linkFonte).toBeVisible();
      await expect(linkFonte).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(linkFonte).toHaveAttribute('target', '_blank');
    }
  });
});
