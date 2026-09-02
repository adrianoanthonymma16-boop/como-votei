# CONTEXT.md — Como Votei

## Visão Geral
Ferramenta de transparência legislativa que permite analisar como deputados e senadores brasileiros atuam no Congresso: como votam, quais discursos fazem e quais leis propõem.

## Objetivo
Dar visibilidade pública e gratuita ao comportamento parlamentar, cruzando votações nominais, discursos e proposições de autoria de cada parlamentar.

## Escopo do MVP
- **Casas legislativas**: Câmara dos Deputados + Senado Federal (ambas desde o início, não faseado)
- **Autenticação**: nenhuma — produto 100% público, sem login, sem cadastro
- **Recorte temporal**: últimos 3 anos de dados
- **Módulos incluídos**:
  1. Votações — histórico de votos nominais por parlamentar, com % de alinhamento partidário e presença
  2. Discursos — pronunciamentos em ordem do dia e em plenário
  3. Proposições — projetos de lei de autoria do parlamentar, com status de tramitação

## Fontes de Dados
- **Câmara dos Deputados**: Dados Abertos da Câmara (dadosabertos.camara.leg.br) — API REST, sem chave necessária
- **Senado Federal**: Dados Abertos do Senado (legis.senado.leg.br/dadosabertos) — XML/JSON, sem chave necessária
- Ambas as fontes têm schemas diferentes entre si — necessário normalizar para um modelo de dados único

## Stack Técnica
- **Framework**: Next.js (App Router), hospedado na Vercel
- **Backend**: API Routes / Route Handlers do próprio Next.js (sem servidor separado)
- **Banco de dados**: Vercel Postgres (Neon) — free tier
- **ORM**: Prisma
- **Sincronização de dados**: Vercel Cron Jobs e/ou GitHub Actions agendado, populando o banco periodicamente a partir das APIs públicas
- **Princípio geral**: uso exclusivo de ferramentas e tiers gratuitos em toda a stack

## Fluxo de Dados
1. Job periódico busca dados novos/atualizados nas APIs da Câmara e do Senado
2. Dados são normalizados e persistidos no Postgres via Prisma
3. Next.js lê do banco local (não direto da API do governo em tempo real) para performance e resiliência a rate limits

## Pontos de Atenção
- **Volume de texto dos discursos**: considerar guardar apenas metadados/resumo no banco e buscar o texto completo sob demanda direto da API do governo, para não estourar o free tier do Postgres
- **Normalização de schema**: Câmara e Senado têm modelos de dados distintos — precisa de uma camada de adaptação antes de gravar no banco unificado
- **Categorização temática das votações** (economia, saúde, direitos civis etc.) ainda não definida — pendente de decisão

## Fora de Escopo (v1)
- Login, favoritos, alertas personalizados
- Dados de legislaturas anteriores a 3 anos
- Sumarização automática de discursos via LLM (avaliar depois, sem custo)
