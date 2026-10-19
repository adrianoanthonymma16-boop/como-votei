-- CreateTable
CREATE TABLE "emendas" (
    "id" TEXT NOT NULL,
    "codigo_emenda" TEXT NOT NULL,
    "parlamentar_id" TEXT,
    "ano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero_emenda" TEXT,
    "nome_autor_raw" TEXT NOT NULL,
    "funcao" TEXT,
    "subfuncao" TEXT,
    "localidade_raw" TEXT,
    "uf" TEXT,
    "municipio" TEXT,
    "localidade_tipo" TEXT,
    "valor_empenhado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valor_liquidado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valor_pago" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valor_resto_inscrito" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valor_resto_cancelado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valor_resto_pago" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emendas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emendas_codigo_emenda_key" ON "emendas"("codigo_emenda");

-- CreateIndex
CREATE INDEX "emendas_parlamentar_id_ano_idx" ON "emendas"("parlamentar_id", "ano");

-- CreateIndex
CREATE INDEX "emendas_ano_idx" ON "emendas"("ano");

-- CreateIndex
CREATE INDEX "emendas_funcao_idx" ON "emendas"("funcao");

-- CreateIndex
CREATE INDEX "emendas_uf_idx" ON "emendas"("uf");

-- AddForeignKey
ALTER TABLE "emendas" ADD CONSTRAINT "emendas_parlamentar_id_fkey" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

