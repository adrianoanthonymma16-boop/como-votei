# Como Votei

[![CI](https://github.com/adrianoanthonymma16-boop/como-votei/actions/workflows/ci.yml/badge.svg)](https://github.com/adrianoanthonymma16-boop/como-votei/actions/workflows/ci.yml)
[![E2E](https://github.com/adrianoanthonymma16-boop/como-votei/actions/workflows/ci.yml/badge.svg?label=e2e)](https://github.com/adrianoanthonymma16-boop/como-votei/actions/workflows/ci.yml)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-F1EFF6?style=flat-square&logo=opensourceinitiative&logoColor=original)](LICENSE)

**No ar:** <https://como-votei.vercel.app>

Ferramenta de transparência legislativa para analisar como deputados e senadores brasileiros atuam no Congresso: votações nominais, discursos e proposições de autoria.

## 🚀 Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: Vercel Postgres (Neon) + Prisma ORM
- **Styling**: Tailwind CSS
- **Sync**: GitHub Actions (diário) + Vercel Cron (incremental)
- **Deploy**: Vercel (free tier)
- **Tudo 100% gratuito**

## 📋 Pré-requisitos

- Node.js 20+
- PostgreSQL (local ou Neon/Vercel Postgres)
- Conta no GitHub (para Actions)
- Conta na Vercel (para deploy)

## 🛠️ Setup Local

```bash
# 1. Clone e instale dependências
git clone <repo>
cd como-votei
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com sua DATABASE_URL

# 3. Setup do banco
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed

# 4. Rode o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`

## 🗄️ Banco de Dados

### Schema Principal

```
Parlamentar (513 deputados + 81 senadores)
  ├── Partido (referência)
  ├── UF (referência)
  ├── Votos (nominais)
  ├── Discursos (metadados + resumo)
  └── Proposições (autoria + tramitação)

Votacao
  ├── Tema (heurística por keywords)
  └── Votos

Views (computed):
  - alinhamento_partidario (por votação)
  - alinhamento_partidario_parlamentar (agregado)
  - alinhamento_partidario_partido (agregado)
```

### Comandos Prisma

```bash
npx prisma studio          # Visualizar dados
npx prisma migrate dev     # Nova migration
npx prisma db seed         # Popular partidos/UFs
npx prisma generate        # Regenerar client
```

## 🔄 Sync de Dados

### GitHub Actions (Diário - Pesado)

```yaml
# .github/workflows/sync-camara.yml
# .github/workflows/sync-senado.yml
# Rodam 03:00 e 04:00 UTC respectivamente
```

### Vercel Cron (Horário - Leve)

```bash
# Chama GitHub Actions via workflow_dispatch
GET /api/cron/sync-incremental
```

### Estrutura dos Syncs

```
scripts/
├── sync-camara.ts    # Deputados + Votações + Discursos + Proposições
├── sync-senado.ts    # Senadores + Votações + Discursos + Proposições
├── gc.ts             # Coleta de lixo (retenção fora da janela de 3 anos)
└── lib/
    ├── camara-normalizer.ts
    ├── senado-normalizer.ts
    └── normalizer-factory.ts
```

### Coleta de lixo (retenção — janela de 3 anos)

O produto cobre apenas os últimos 3 anos (janela rolante). Para o banco não
crescer indefinidamente e estourar o limite do Neon free tier, um job de
retenção ("coleta de lixo") apaga periodicamente tudo que sai da janela.

- **Regra única:** `ano < anoCorte`, onde `anoCorte` = menor ano de `ANOS_JANELA`
  (`src/lib/despesas.ts`) — hoje `2024`. Proposições/frequências/despesas cortam
  pelo campo de ano; votações/discursos, por `data` (`< 1º/jan do anoCorte`).
- **Fonte única:** `src/lib/gc.ts`. Os scripts de sync de despesas
  (`sync-despesas-camara.ts` / `sync-despesas-senado.ts`) usam essa mesma retenção.
- **Tabelas cobertas:** `votos`, `votacoes`, `tramitacoes`, `proposicoes`,
  `discursos`, `frequencias`, `despesas` (`votos` e `tramitacoes` caem por cascade).
- **Nunca apagadas:** `partidos`, `ufs`, `parlamentares`.

```bash
npm run gc           # dry-run (read-only): mostra o que SAIRIA, não apaga nada
npm run gc:apply     # executa os DELETEs (idempotente, em lotes de 5000)
```

Roda sozinho nos workflows diários (`.github/workflows/sync-camara.yml` e
`sync-senado.yml`) após o sync. Como a base só guarda os últimos 3 anos, o
front-end mostra a legenda **"Janela de dados"** (`src/components/NotaPeriodo.tsx`)
para o visitante entender por que registros antigos não aparecem.

## 🎯 Heurística de Temas

Arquivo: `src/lib/temas-keywords.json`

Categorias: economia, saude, educacao, direitos_civis, seguranca_publica, meio_ambiente, trabalho_previdencia, infraestrutura, agricultura, tecnologia, cultura, desenvolvimento_regional, direitos_sociais.

## 📡 API Routes

| Endpoint | Descrição | Cache |
|----------|-----------|-------|
| `GET /api/parlamentares` | Lista paginada com filtros | ISR 1h |
| `GET /api/parlamentares/[id]` | Detalhe do parlamentar | ISR 1h |
| `GET /api/parlamentares/[id]/votos` | Votos com alinhamento | ISR 1h |
| `GET /api/parlamentares/[id]/discursos` | Discursos (metadados) | ISR 1h |
| `GET /api/parlamentares/[id]/proposicoes` | Proposições + tramitação | ISR 1h |
| `GET /api/discursos/[id]/full` | Texto completo (proxy) | ISR 1h |
| `GET /api/votacoes/[id]/alinhamento` | Agregado por partido | ISR 1h |
| `GET /api/busca?q=` | Busca unificada | ISR 1h |
| `GET /api/stats/visao-geral` | Contadores p/ dashboard | ISR 1h |
| `GET /api/partidos` | Lista de partidos | ISR 1h |
| `GET /api/ufs` | Lista de UFs | ISR 1h |

### Parâmetros de Query (Parlamentares)

```
cursor     - Cursor para paginação
limit      - Itens por página (1-100, default 20)
casa       - CAMARA | SENADO
partidoId  - ID do partido
ufId       - ID da UF
legislatura- Número da legislatura
situacao   - EXERCICIO, LICENCA, etc.
search     - Busca por nome/CPF/ID
```

## 🎨 Frontend

### Páginas

- `/` - Home com stats + busca + lista recente
- `/parlamentares` - Lista completa com filtros laterais (URL shareable)
- `/parlamentares/[id]` - Detalhe com 3 tabs: Votos, Discursos, Proposições

### Componentes UI

```
src/components/ui/
├── Button.tsx
├── Table.tsx
├── Badge.tsx
├── Input.tsx
├── Select.tsx
├── Tabs.tsx
├── Pagination.tsx
├── Skeleton.tsx
└── ...
```

### Acessibilidade

- WCAG AA
- Navegação por teclado
- ARIA labels
- Contraste adequado
- `axe-core` 0 violations críticas

## 🚀 Deploy

### Vercel

1. Conecte o repositório na Vercel
2. Adicione `DATABASE_URL` e `CRON_SECRET` nas Environment Variables
3. Deploy automático a cada push na `main`

### GitHub Actions Secrets

```
DATABASE_URL
CRON_SECRET
VERCEL_TOKEN (opcional, para deploy automático)
```

### Cron Secret

```bash
# Gere um secret seguro
openssl rand -hex 32
```

## 📊 Monitoramento

- **Vercel Logs**: API routes + Cron jobs
- **GitHub Actions**: Sync jobs (logs estruturados JSON)
- **Métrica**: `dados_desatualizados_por_fonte` (câmara/senado)

## 🧪 Testes

```bash
npm run test         # Jest unit tests
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright E2E
```

## 📁 Estrutura do Projeto

```
como-votei/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── parlamentares/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── StatsCards.tsx
│   │   ├── SearchForm.tsx
│   │   └── ParlamentaresList.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── utils.ts
│   │   └── temas-keywords.json
│   └── scripts/
│       ├── sync-camara.ts
│       ├── sync-senado.ts
│       └── lib/
├── .github/workflows/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── README.md
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- [Dados Abertos da Câmara](https://dadosabertos.camara.leg.br/)
- [Dados Abertos do Senado](https://legis.senado.leg.br/dadosabertos/)
- [Vercel](https://vercel.com/) pelo free tier generoso
- [Neon](https://neon.tech/) pelo Postgres serverless gratuito