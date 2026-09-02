import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const partidos = [
  { sigla: 'PL', nome: 'Partido Liberal', ideologia: 'DIREITA', cor: '#0033A0' },
  { sigla: 'PT', nome: 'Partido dos Trabalhadores', ideologia: 'ESQUERDA', cor: '#D90B1E' },
  { sigla: 'MDB', nome: 'Movimento Democrático Brasileiro', ideologia: 'CENTRO', cor: '#007A33' },
  { sigla: 'PSD', nome: 'Partido Social Democrático', ideologia: 'CENTRO', cor: '#E52E2E' },
  { sigla: 'UNIÃO', nome: 'União Brasil', ideologia: 'CENTRO_DIREITA', cor: '#0056A0' },
  { sigla: 'PP', nome: 'Progressistas', ideologia: 'CENTRO_DIREITA', cor: '#009639' },
  { sigla: 'REPUBLICANOS', nome: 'Republicanos', ideologia: 'DIREITA', cor: '#0033A0' },
  { sigla: 'PSB', nome: 'Partido Socialista Brasileiro', ideologia: 'ESQUERDA', cor: '#ED1C24' },
  { sigla: 'PSDB', nome: 'Partido da Social Democracia Brasileira', ideologia: 'CENTRO_DIREITA', cor: '#0072C6' },
  { sigla: 'PDT', nome: 'Partido Democrático Trabalhista', ideologia: 'ESQUERDA', cor: '#E4002B' },
  { sigla: 'PSOL', nome: 'Partido Socialismo e Liberdade', ideologia: 'ESQUERDA', cor: '#E60012' },
  { sigla: 'PODE', nome: 'Podemos', ideologia: 'CENTRO', cor: '#00A651' },
  { sigla: 'AVANTE', nome: 'Avante', ideologia: 'CENTRO', cor: '#0033A0' },
  { sigla: 'PSC', nome: 'Partido Social Cristão', ideologia: 'DIREITA', cor: '#007A33' },
  { sigla: 'SOLIDARIEDADE', nome: 'Solidariedade', ideologia: 'CENTRO', cor: '#E60012' },
  { sigla: 'PROS', nome: 'Partido Republicano da Ordem Social', ideologia: 'CENTRO', cor: '#0033A0' },
  { sigla: 'PATRIOTA', nome: 'Patriota', ideologia: 'DIREITA', cor: '#009639' },
  { sigla: 'NOVO', nome: 'Partido Novo', ideologia: 'DIREITA', cor: '#FFD700' },
  { sigla: 'PCdoB', nome: 'Partido Comunista do Brasil', ideologia: 'ESQUERDA', cor: '#CC0000' },
  { sigla: 'PV', nome: 'Partido Verde', ideologia: 'CENTRO_ESQUERDA', cor: '#009639' },
  { sigla: 'REDE', nome: 'Rede Sustentabilidade', ideologia: 'ESQUERDA', cor: '#00A651' },
  { sigla: 'AGIR', nome: 'Agir', ideologia: 'DIREITA', cor: '#0033A0' },
  { sigla: 'DC', nome: 'Democracia Cristã', ideologia: 'DIREITA', cor: '#007A33' },
  { sigla: 'PMN', nome: 'Partido da Mobilização Nacional', ideologia: 'CENTRO', cor: '#E60012' },
  { sigla: 'UP', nome: 'Unidade Popular', ideologia: 'ESQUERDA', cor: '#CC0000' },
  { sigla: 'PCO', nome: 'Partido da Causa Operária', ideologia: 'ESQUERDA', cor: '#CC0000' },
]

const ufs = [
  { sigla: 'AC', nome: 'Acre', regiao: 'NORTE' },
  { sigla: 'AL', nome: 'Alagoas', regiao: 'NORDESTE' },
  { sigla: 'AP', nome: 'Amapá', regiao: 'NORTE' },
  { sigla: 'AM', nome: 'Amazonas', regiao: 'NORTE' },
  { sigla: 'BA', nome: 'Bahia', regiao: 'NORDESTE' },
  { sigla: 'CE', nome: 'Ceará', regiao: 'NORDESTE' },
  { sigla: 'DF', nome: 'Distrito Federal', regiao: 'CENTRO_OESTE' },
  { sigla: 'ES', nome: 'Espírito Santo', regiao: 'SUDESTE' },
  { sigla: 'GO', nome: 'Goiás', regiao: 'CENTRO_OESTE' },
  { sigla: 'MA', nome: 'Maranhão', regiao: 'NORDESTE' },
  { sigla: 'MT', nome: 'Mato Grosso', regiao: 'CENTRO_OESTE' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'CENTRO_OESTE' },
  { sigla: 'MG', nome: 'Minas Gerais', regiao: 'SUDESTE' },
  { sigla: 'PA', nome: 'Pará', regiao: 'NORTE' },
  { sigla: 'PB', nome: 'Paraíba', regiao: 'NORDESTE' },
  { sigla: 'PR', nome: 'Paraná', regiao: 'SUL' },
  { sigla: 'PE', nome: 'Pernambuco', regiao: 'NORDESTE' },
  { sigla: 'PI', nome: 'Piauí', regiao: 'NORDESTE' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'SUDESTE' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'NORDESTE' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'SUL' },
  { sigla: 'RO', nome: 'Rondônia', regiao: 'NORTE' },
  { sigla: 'RR', nome: 'Roraima', regiao: 'NORTE' },
  { sigla: 'SC', nome: 'Santa Catarina', regiao: 'SUL' },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'SUDESTE' },
  { sigla: 'SE', nome: 'Sergipe', regiao: 'NORDESTE' },
  { sigla: 'TO', nome: 'Tocantins', regiao: 'NORTE' },
]

async function main() {
  console.log('🌱 Iniciando seed de dados de referência...')

  for (const partido of partidos) {
    await prisma.partido.upsert({
      where: { sigla: partido.sigla },
      update: partido,
      create: partido,
    })
  }
  console.log(`✅ ${partidos.length} partidos criados/atualizados`)

  for (const uf of ufs) {
    await prisma.uf.upsert({
      where: { sigla: uf.sigla },
      update: uf,
      create: uf,
    })
  }
  console.log(`✅ ${ufs.length} UFs criadas/atualizadas`)

  console.log('🎉 Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })