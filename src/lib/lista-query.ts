/**
 * Campos comuns das listagens paginadas das abas de perfil.
 *
 * Suportam dois modos na mesma rota: paginação por `page` (paginador numerado,
 * devolve `total`/`totalPages`) ou por `cursor` (scroll infinito). A rota decide
 * qual usar conforme o parâmetro recebido. Centralizar o schema evita que cada
 * rota redefina — e divirja de — os mesmos limites.
 */
import { z } from 'zod';

export const listaQueryCampos = {
  cursor: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
} as const;
