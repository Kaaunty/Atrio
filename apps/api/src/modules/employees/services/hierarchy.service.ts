import { prisma } from '../../../database/prisma.js';

export class HierarchyService {
  /**
   * Verifica se a atribuição de candidateManagerId como gestor de employeeId
   * criaria um ciclo/loop na árvore hierárquica ou auto-gestão.
   */
  static async wouldCreateManagementCycle(
    employeeId: string,
    candidateManagerId?: string | null
  ): Promise<boolean> {
    if (!candidateManagerId) {
      return false;
    }

    // Auto-gestão direta (A gestor de A)
    if (employeeId === candidateManagerId) {
      return true;
    }

    // Percorre a árvore de gestores a partir do candidato subindo até a raiz
    const visited = new Set<string>();
    let currentManagerId: string | null = candidateManagerId;

    while (currentManagerId) {
      if (currentManagerId === employeeId) {
        return true; // Ciclo detectado: o candidato está abaixo do colaborador na cadeia
      }

      if (visited.has(currentManagerId)) {
        // Previne loop infinito caso já exista anomalia
        return true;
      }
      visited.add(currentManagerId);

      const managerRecord: { managerId: string | null } | null = await prisma.employee.findUnique({
        where: { id: currentManagerId },
        select: { managerId: true },
      });

      if (!managerRecord) {
        break;
      }

      currentManagerId = managerRecord.managerId;
    }

    return false;
  }
}
