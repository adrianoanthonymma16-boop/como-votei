import { classificarTemas, extrairTemaPrincipal, extrairTags, temaCor, descreverTipoProposicao } from '../temas';

describe('temas', () => {
  describe('classificarTemas', () => {
    it('classifica texto de saúde corretamente', () => {
      const texto = 'Projeto de Lei que dispõe sobre o Sistema Único de Saúde e regulamenta a assistência hospitalar';
      const temas = classificarTemas(texto);
      expect(temas.length).toBeGreaterThan(0);
      expect(temas[0].tema).toBe('saúde');
    });

    it('classifica texto de economia', () => {
      const texto = 'Projeto que altera o imposto sobre circulação de mercadorias e serviços';
      const temas = classificarTemas(texto);
      expect(temas.some(t => t.tema === 'economia')).toBe(true);
    });

    it('classifica texto de educação', () => {
      const texto = 'Dispõe sobre o ensino médio e a formação de professores da educação básica';
      const temas = classificarTemas(texto);
      expect(temas.some(t => t.tema === 'educação')).toBe(true);
    });

    it('classifica texto de meio ambiente', () => {
      const texto = 'Projeto de proteção da biodiversidade no cerrado e na amazônia';
      const temas = classificarTemas(texto);
      expect(temas.some(t => t.tema === 'meio ambiente')).toBe(true);
    });

    it('retorna array vazio para texto vazio', () => {
      expect(classificarTemas('')).toEqual([]);
      expect(classificarTemas('   ')).toEqual([]);
    });

    it('retorna múltiplos temas quando aplicável', () => {
      const texto = 'Projeto de saúde pública que regulamenta o trabalho médico no SUS';
      const temas = classificarTemas(texto);
      expect(temas.length).toBeGreaterThanOrEqual(2);
      expect(temas.some(t => t.tema === 'saúde')).toBe(true);
      expect(temas.some(t => t.tema === 'trabalho')).toBe(true);
    });
  });

  describe('extrairTemaPrincipal', () => {
    it('retorna tema principal ou undefined', () => {
      expect(extrairTemaPrincipal('Projeto de lei sobre segurança pública')).toBe('segurança pública');
      expect(extrairTemaPrincipal('')).toBeUndefined();
    });
  });

  describe('extrairTags',  () => {
    it('retorna no máximo 2 tags', () => {
      const tags = extrairTags('Projeto de saúde pública e trabalho médico no SUS');
      expect(tags.length).toBeLessThanOrEqual(2);
    });
  });

  describe('temaCor', () => {
    it('retorna classe CSS para tema conhecido', () => {
      const cor = temaCor('saúde');
      expect(cor).toContain('rose');
    });

    it('retorna classe padrão para tema desconhecido', () => {
      const cor = temaCor('tema-inexistente');
      expect(cor).toContain('gray');
    });
  });

  describe('descreverTipoProposicao', () => {
    it('traduz siglas conhecidas', () => {
      expect(descreverTipoProposicao('PL')).toBe('Projeto de Lei');
      expect(descreverTipoProposicao('PEC')).toBe('Proposta de Emenda Constitucional');
      expect(descreverTipoProposicao('PLP')).toBe('Projeto de Lei Complementar');
    });

    it('retorna sigla original para desconhecida', () => {
      expect(descreverTipoProposicao('XYZ')).toBe('XYZ');
    });
  });
});
