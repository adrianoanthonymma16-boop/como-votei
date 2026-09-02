-- CreateEnum
CREATE TYPE "Casa" AS ENUM ('CAMARA', 'SENADO');

-- CreateEnum
CREATE TYPE "TipoVoto" AS ENUM ('SIM', 'NAO', 'ABSTENCAO', 'ARTICULACAO', 'OBSTRUCAO', 'AUSENTE', 'LICENCA', 'MISSAO');

-- CreateEnum
CREATE TYPE "TipoDiscurso" AS ENUM ('ORDEM_DIA', 'PLENARIO', 'COMISSAO', 'LIDERANCA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusProposicao" AS ENUM ('APRESENTADA', 'EM_TRAMITACAO', 'APROVADA_CAMARA', 'APROVADA_SENADO', 'SANCIONADA', 'VETADA', 'ARQUIVADA', 'RETIRADA');

-- CreateTable
CREATE TABLE "Partido" (
    "id" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ideologia" TEXT,
    "cor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uf" (
    "id" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "regiao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Uf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parlamentares" (
    "id" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "cpf" TEXT,
    "nome" TEXT NOT NULL,
    "nome_civil" TEXT,
    "casa" "Casa" NOT NULL,
    "partido_id" TEXT NOT NULL,
    "uf_id" TEXT NOT NULL,
    "legislatura" INTEGER NOT NULL DEFAULT 57,
    "foto_url" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "gabinetes" JSONB,
    "situacao" TEXT,
    "data_nascimento" TIMESTAMP(3),
    "naturalidade" TEXT,
    "uf_naturalidade" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parlamentares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votacoes" (
    "id" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "casa" "Casa" NOT NULL,
    "legislatura" INTEGER NOT NULL,
    "sessao" INTEGER,
    "numero" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "ementa" TEXT,
    "tema" TEXT,
    "resultado" TEXT,
    "quorum" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votos" (
    "id" TEXT NOT NULL,
    "parlamentar_id" TEXT NOT NULL,
    "votacao_id" TEXT NOT NULL,
    "tipo" "TipoVoto" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discursos" (
    "id" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "parlamentar_id" TEXT NOT NULL,
    "casa" "Casa" NOT NULL,
    "tipo" "TipoDiscurso" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "hora" TEXT,
    "resumo" TEXT NOT NULL,
    "url_original" TEXT NOT NULL,
    "tema" TEXT,
    "duracao_segundos" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposicoes" (
    "id" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "parlamentar_id" TEXT NOT NULL,
    "casa" "Casa" NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "ementa" TEXT NOT NULL,
    "autor_principal" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusProposicao" NOT NULL DEFAULT 'APRESENTADA',
    "data_apresentacao" TIMESTAMP(3) NOT NULL,
    "url_original" TEXT NOT NULL,
    "tema" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tramitacoes" (
    "id" TEXT NOT NULL,
    "proposicao_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "orgao" TEXT,
    "situacao" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tramitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequencias" (
    "id" TEXT NOT NULL,
    "parlamentar_id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "total_sessoes" INTEGER NOT NULL,
    "presencas" INTEGER NOT NULL,
    "faltas_justificadas" INTEGER NOT NULL,
    "faltas_injustificadas" INTEGER NOT NULL,
    "taxa_presenca" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "frequencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partido_sigla_key" ON "Partido"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "Uf_sigla_key" ON "Uf"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "parlamentares_id_externo_key" ON "parlamentares"("id_externo");

-- CreateIndex
CREATE UNIQUE INDEX "parlamentares_cpf_key" ON "parlamentares"("cpf");

-- CreateIndex
CREATE INDEX "parlamentares_casa_partido_id_idx" ON "parlamentares"("casa", "partido_id");

-- CreateIndex
CREATE INDEX "parlamentares_casa_uf_id_idx" ON "parlamentares"("casa", "uf_id");

-- CreateIndex
CREATE INDEX "parlamentares_legislatura_idx" ON "parlamentares"("legislatura");

-- CreateIndex
CREATE INDEX "parlamentares_situacao_idx" ON "parlamentares"("situacao");

-- CreateIndex
CREATE UNIQUE INDEX "votacoes_id_externo_key" ON "votacoes"("id_externo");

-- CreateIndex
CREATE INDEX "votacoes_casa_data_idx" ON "votacoes"("casa", "data");

-- CreateIndex
CREATE INDEX "votacoes_tema_idx" ON "votacoes"("tema");

-- CreateIndex
CREATE INDEX "votacoes_legislatura_idx" ON "votacoes"("legislatura");

-- CreateIndex
CREATE INDEX "votos_parlamentar_id_tipo_idx" ON "votos"("parlamentar_id", "tipo");

-- CreateIndex
CREATE INDEX "votos_votacao_id_idx" ON "votos"("votacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "votos_parlamentar_id_votacao_id_key" ON "votos"("parlamentar_id", "votacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "discursos_id_externo_key" ON "discursos"("id_externo");

-- CreateIndex
CREATE INDEX "discursos_parlamentar_id_data_idx" ON "discursos"("parlamentar_id", "data");

-- CreateIndex
CREATE INDEX "discursos_casa_data_idx" ON "discursos"("casa", "data");

-- CreateIndex
CREATE INDEX "discursos_tema_idx" ON "discursos"("tema");

-- CreateIndex
CREATE UNIQUE INDEX "proposicoes_id_externo_key" ON "proposicoes"("id_externo");

-- CreateIndex
CREATE INDEX "proposicoes_parlamentar_id_status_idx" ON "proposicoes"("parlamentar_id", "status");

-- CreateIndex
CREATE INDEX "proposicoes_casa_tipo_ano_idx" ON "proposicoes"("casa", "tipo", "ano");

-- CreateIndex
CREATE INDEX "proposicoes_tema_idx" ON "proposicoes"("tema");

-- CreateIndex
CREATE INDEX "tramitacoes_proposicao_id_data_idx" ON "tramitacoes"("proposicao_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "frequencias_parlamentar_id_ano_key" ON "frequencias"("parlamentar_id", "ano");

-- AddForeignKey
ALTER TABLE "parlamentares" ADD CONSTRAINT "parlamentares_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parlamentares" ADD CONSTRAINT "parlamentares_uf_id_fkey" FOREIGN KEY ("uf_id") REFERENCES "Uf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_parlamentar_id_fkey" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_votacao_id_fkey" FOREIGN KEY ("votacao_id") REFERENCES "votacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discursos" ADD CONSTRAINT "discursos_parlamentar_id_fkey" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposicoes" ADD CONSTRAINT "proposicoes_parlamentar_id_fkey" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramitacoes" ADD CONSTRAINT "tramitacoes_proposicao_id_fkey" FOREIGN KEY ("proposicao_id") REFERENCES "proposicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencias" ADD CONSTRAINT "frequencias_parlamentar_id_fkey" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
