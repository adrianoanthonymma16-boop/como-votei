-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "parlamentar_id" TEXT,
    "casa" "Casa" NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "data" TIMESTAMP(3),
    "categoria" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "cpf_cnpj" TEXT,
    "documento" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "valor_glosa" DECIMAL(14,2),
    "url_documento" TEXT,
    "nome_parlamentar_raw" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "despesas_id_externo_key" ON "despesas"("id_externo");

-- CreateIndex
CREATE INDEX "despesas_parlamentar_id_ano_data_idx" ON "despesas"("parlamentar_id", "ano", "data");

-- CreateIndex
CREATE INDEX "despesas_casa_ano_idx" ON "despesas"("casa", "ano");

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_parlamentar_id_fkey" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
