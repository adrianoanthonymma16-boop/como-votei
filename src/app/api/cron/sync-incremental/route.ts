import { NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verificar secret do cron
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tipo = request.nextUrl.searchParams.get('tipo') || 'incremental';
  const casa = request.nextUrl.searchParams.get('casa') || 'ambas';

  try {
    const resultados: Record<string, unknown> = {};

    // Disparar GitHub Actions via workflow_dispatch
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPOSITORY; // owner/repo

    if (githubToken && repo) {
      const [owner, repoName] = repo.split('/');
      
      const workflows: Array<{ name: string; workflow: string; inputs: Record<string, string> }> = [];

      if (casa === 'camara' || casa === 'ambas') {
        workflows.push({
          name: 'Sync Câmara',
          workflow: 'sync-camara.yml',
          inputs: { tipo: 'incremental' },
        });
      }

      if (casa === 'senado' || casa === 'ambas') {
        workflows.push({
          name: 'Sync Senado',
          workflow: 'sync-senado.yml',
          inputs: { tipo: 'incremental' },
        });
      }

      for (const wf of workflows) {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${wf.workflow}/dispatches`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ref: 'main',
                inputs: wf.inputs,
              }),
            }
          );

          if (response.ok) {
            resultados[wf.name] = 'disparado';
          } else {
            const error = await response.text();
            resultados[wf.name] = `erro: ${response.status} - ${error}`;
          }
        } catch (error) {
          resultados[wf.name] = `erro: ${error instanceof Error ? error.message : 'desconhecido'}`;
        }
      }
    } else {
      resultados.warning = 'GitHub Token/Repo não configurado - sync manual necessário';
    }

    return NextResponse.json({
      sucesso: true,
      tipo,
      casa,
      timestamp: new Date().toISOString(),
      resultados,
    });
  } catch (error) {
    console.error('[Cron Sync] Erro:', error);
    return NextResponse.json(
      { 
        sucesso: false, 
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}