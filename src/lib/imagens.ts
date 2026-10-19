/**
 * Utilidades para imagens remotas de parlamentares.
 *
 * As fotos oficiais vêm da Câmara e do Senado. O Senado publica URLs em http
 * (ex.: http://www.senado.leg.br/...), que o `next/image` recusa quando o
 * domínio está configurado apenas com protocolo https — e a recusa derruba a
 * página inteira. Normalizamos para https e, quando a URL não é confiável,
 * caímos nas iniciais em vez de renderizar um `<Image>` inválido.
 */

/** Hosts oficiais permitidos em `next.config.js` (`images.remotePatterns`). */
const URL_FOTO_OFICIAL = /^https:\/\/([a-z0-9-]+\.)*leg\.br\//i;

/** Promove a URL da foto para https. Retorna undefined quando não há URL. */
export function normalizarUrlFoto(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, 'https://');
}

/** Indica se a URL pode ser usada diretamente no `next/image` (host + protocolo permitidos). */
export function fotoRemotaValida(url: string | null | undefined): url is string {
  return typeof url === 'string' && URL_FOTO_OFICIAL.test(url);
}
