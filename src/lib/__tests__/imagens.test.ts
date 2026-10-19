import { normalizarUrlFoto, fotoRemotaValida } from '@/lib/imagens';

describe('normalizarUrlFoto', () => {
  it('promove http para https (fotos do Senado)', () => {
    expect(normalizarUrlFoto('http://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg')).toBe(
      'https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg'
    );
  });

  it('mantém URLs já em https', () => {
    const url = 'https://www.camara.leg.br/internet/deputado/bandep/204549.jpg';
    expect(normalizarUrlFoto(url)).toBe(url);
  });

  it('retorna undefined para valores vazios', () => {
    expect(normalizarUrlFoto(null)).toBeUndefined();
    expect(normalizarUrlFoto(undefined)).toBeUndefined();
    expect(normalizarUrlFoto('')).toBeUndefined();
  });
});

describe('fotoRemotaValida', () => {
  it('aceita hosts oficiais em https', () => {
    expect(fotoRemotaValida('https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg')).toBe(true);
    expect(fotoRemotaValida('https://legis.senado.leg.br/senadores/fotos-oficiais/5672')).toBe(true);
    expect(fotoRemotaValida('https://www.camara.leg.br/internet/deputado/bandep/204549.jpg')).toBe(true);
  });

  it('recusa http no host oficial (quebraria o next/image)', () => {
    expect(fotoRemotaValida('http://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg')).toBe(false);
  });

  it('recusa hosts não oficiais', () => {
    expect(fotoRemotaValida('https://evil.example.com/foto.jpg')).toBe(false);
    expect(fotoRemotaValida('https://notleg.br/foto.jpg')).toBe(false);
    expect(fotoRemotaValida(null)).toBe(false);
    expect(fotoRemotaValida(undefined)).toBe(false);
  });
});
