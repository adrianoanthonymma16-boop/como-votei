-- Voto registrado sem direção divulgada (ex.: escolha secreta).
-- Conta como presença, mas fica fora do cálculo de alinhamento.
ALTER TYPE "TipoVoto" ADD VALUE IF NOT EXISTS 'VOTOU';
