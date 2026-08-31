import { ITimeClockProvider } from '../interfaces/integration-provider.interface.js';
import { ControlIdProvider } from '../providers/control-id/control-id.provider.js';
import { DimepProvider } from '../providers/dimep/dimep.provider.js';
import { SecullumProvider } from '../providers/secullum/secullum.provider.js';

export class IntegrationRegistry {
  private static providers: Map<string, ITimeClockProvider> = new Map();

  static {
    // Registra provedores padrão de fábrica
    this.register(new ControlIdProvider());
    this.register(new DimepProvider());
    this.register(new SecullumProvider());
  }

  /**
   * Registra uma nova implementação de provedor no registry
   */
  static register(provider: ITimeClockProvider): void {
    this.providers.set(provider.providerKey.toLowerCase(), provider);
  }

  /**
   * Obtém o provedor pelo seu identificador (ex: 'control_id', 'dimep')
   */
  static get(providerKey: string): ITimeClockProvider | undefined {
    if (!providerKey) return undefined;
    return this.providers.get(providerKey.toLowerCase());
  }

  /**
   * Lista todos os provedores registrados
   */
  static getAll(): ITimeClockProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Verifica se um provedor específico está registrado no sistema
   */
  static has(providerKey: string): boolean {
    return this.providers.has(providerKey.toLowerCase());
  }
}
