import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HierarchyService } from '../services/hierarchy.service.js';
import { prisma } from '../../../database/prisma.js';

describe('Hierarchy & Management Loop Prevention', () => {
  it('deve detectar auto-gestão direta (colaborador como seu próprio gestor)', async () => {
    const isLoop = await HierarchyService.wouldCreateManagementCycle('emp-123', 'emp-123');
    assert.equal(isLoop, true);
  });

  it('deve permitir gestor nulo ou indefinido', async () => {
    const isLoopNull = await HierarchyService.wouldCreateManagementCycle('emp-123', null);
    const isLoopUndefined = await HierarchyService.wouldCreateManagementCycle('emp-123', undefined);
    assert.equal(isLoopNull, false);
    assert.equal(isLoopUndefined, false);
  });
});
