import { test, expect } from '@playwright/test';

test.describe('Votações educacionais', () => {
  test('votações mostram contexto educacional ao expandir', async ({ page }) => {
    // Ir para um parlamentar com votações
    await page.goto('/parlamentares/cmtjl8hum002nwod5zhw6h2ny/votacoes');

    // Esperar carregar
    await page.waitForSelector('ol[aria-label="Votações do parlamentar"]');

    // Verificar que há votações
    const itens = page.locator('ol[aria-label="Votações do parlamentar"] > li');
    await expect(itens.first()).toBeVisible();

    // Expandir primeira votação
    const primeiroAccordion = itens.first().locator('button[aria-expanded]');
    await expect(primeiroAccordion).toBeVisible();
    await primeiroAccordion.click();

    // Verificar que o painel expandido aparece
    const painelExpandido = itens.first().locator('[id^="votacao-"]');
    await expect(painelExpandido).toBeVisible();

    // Verificar seção "O que foi votado"
    const secaoVotado = painelExpandido.locator('h4:has-text("O que foi votado")');
    await expect(secaoVotado).toBeVisible();

    // Verificar texto educacional (ementa ou descrição)
    const textoVotacao = painelExpandido.locator('h4:has-text("O que foi votado") + p');
    await expect(textoVotacao).toBeVisible();
    const conteudo = await textoVotacao.textContent();
    expect(conteudo?.length).toBeGreaterThan(10);

    // Verificar contexto do voto
    const contextoVoto = painelExpandido.locator('.rounded-lg:has-text("votou")');
    await expect(contextoVoto).toBeVisible();
  });

  test('banner anti-polarização está presente', async ({ page }) => {
    await page.goto('/');

    // Verificar que o banner existe
    const banner = page.locator('text=Diga não à polarização');
    await expect(banner).toBeVisible();

    // Verificar botão de fechar
    const botaoFechar = page.locator('button[aria-label="Fechar aviso"]');
    await expect(botaoFechar).toBeVisible();

    // Fechar banner
    await botaoFechar.click();

    // Verificar que desapareceu
    await expect(banner).not.toBeVisible();
  });

  test('métrica de produtividade expande e mostra pesos', async ({ page }) => {
    await page.goto('/');

    // Scroll para a seção de produtivos
    await page.locator('text=Parlamentares Mais Produtivos').scrollIntoViewIfNeeded();

    // Clicar no accordion "Como calculamos"
    const botaoCalc = page.locator('button:has-text("Como calculamos a pontuação")');
    await expect(botaoCalc).toBeVisible();
    await botaoCalc.click();

    // Verificar que os pesos aparecem
    await expect(page.locator('text=PL apresentado')).toBeVisible();
    await expect(page.locator('text=PL aprovado')).toBeVisible();
    await expect(page.locator('text=Falta (ausência)')).toBeVisible();

    // Verificar aviso do desenvolvedor
    await expect(page.locator('text=Idealização do desenvolvedor')).toBeVisible();
  });

  test('card de presença mostra fonte oficial (com ou sem dados)', async ({ page }) => {
    await page.goto('/parlamentares/cmtjl8hum002nwod5zhw6h2ny/votacoes');

    // O card existe no header com o rótulo
    const card = page.locator('text=Presença em votações').first();
    await expect(card).toBeVisible();

    // Ou há a barra empilhada com os 3 números, ou o estado "sem dados oficiais"
    const barra = page.locator('[role="img"][aria-label*="sessões de"]');
    const vazio = page.locator('text=Sem dados oficiais de presença');
    await expect(barra.or(vazio).first()).toBeVisible({ timeout: 15000 });
  });

  test('badges de voto são exibidos corretamente', async ({ page }) => {
    await page.goto('/parlamentares/cmtjl8hum002nwod5zhw6h2ny/votacoes');

    await page.waitForSelector('ol[aria-label="Votações do parlamentar"]');

    // Verificar que badges de voto existem (SIM, NÃO, etc)
    const badges = page.locator('ol[aria-label="Votações do parlamentar"] [class*="badge"]');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });
});
