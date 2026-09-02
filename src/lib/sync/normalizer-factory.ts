/**
 * Factory para criar adaptadores normalizados
 * Permite adicionar novas casas legislativas facilmente
 */

import { CamaraAdapter } from './camara-adapter';
import { SenadoAdapter } from './senado-adapter';
import type { Casa, SyncStats } from './types';

export type AdapterType = 'camara' | 'senado';

export interface BaseAdapter {
  getStats(): SyncStats;
  resetStats(): void;
}

export class NormalizerFactory {
  private static instances: Map<AdapterType, BaseAdapter> = new Map();

  static create(casa: Casa): BaseAdapter {
    const key: AdapterType = casa === 'CAMARA' ? 'camara' : 'senado';
    
    if (!this.instances.has(key)) {
      const adapter = casa === 'CAMARA' 
        ? new CamaraAdapter() 
        : new SenadoAdapter();
      this.instances.set(key, adapter);
    }
    
    return this.instances.get(key)!;
  }

  static getInstance(casa: Casa): BaseAdapter | undefined {
    const key: AdapterType = casa === 'CAMARA' ? 'camara' : 'senado';
    return this.instances.get(key);
  }

  static clearInstances(): void {
    this.instances.clear();
  }

  // Métodos de conveniência para acesso tipado
  static getCamara(): CamaraAdapter {
    return this.create('CAMARA') as CamaraAdapter;
  }

  static getSenado(): SenadoAdapter {
    return this.create('SENADO') as SenadoAdapter;
  }
}

// Re-export para uso direto
export { CamaraAdapter } from './camara-adapter';
export { SenadoAdapter } from './senado-adapter';