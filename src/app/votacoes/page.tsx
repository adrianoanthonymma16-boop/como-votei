import type { Metadata } from 'next';
import { VotacoesPageClient } from './VotacoesPageClient';

export const metadata: Metadata = {
  title: 'Votações — Como Votei',
  description: 'Acompanhe todas as votações nominais da Câmara e do Senado. Pesquise por PL, filtre por Casa, ano, resultado e tema.',
};

export default function VotacoesPage() {
  return <VotacoesPageClient />;
}
