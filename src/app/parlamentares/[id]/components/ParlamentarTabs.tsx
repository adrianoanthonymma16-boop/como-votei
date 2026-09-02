'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type TabValue = 'votacoes' | 'proposicoes' | 'discursos' | 'dashboard';

const tabs: { value: TabValue; label: string; href: string }[] = [
  { value: 'votacoes', label: 'Votações', href: '?tab=votacoes' },
  { value: 'proposicoes', label: 'Projetos', href: '?tab=proposicoes' },
  { value: 'discursos', label: 'Discursos', href: '?tab=discursos' },
  { value: 'dashboard', label: 'Dashboard', href: '?tab=dashboard' },
];

export function ParlamentarTabs({ activeTab }: { activeTab: TabValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTabChange = (tab: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <nav className="mb-6" aria-label="Seções do parlamentar">
      <div className="border-b border-border">
        <ul className="flex flex-wrap gap-1 -mb-px" role="tablist">
          {tabs.map((tab) => (
            <li key={tab.value} role="presentation">
              <button
                role="tab"
                aria-selected={activeTab === tab.value}
                aria-controls={`panel-${tab.value}`}
                id={`tab-${tab.value}`}
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  'tab-trigger',
                  activeTab === tab.value ? 'tab-trigger-active' : 'tab-trigger-inactive'
                )}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}