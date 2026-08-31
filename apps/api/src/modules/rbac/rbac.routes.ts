import { Router } from 'express';
import { RbacController } from './controllers/rbac.controller.js';

const router = Router();

// Gestão de Perfis & Permissões (Admin)
router.get('/admin/roles', RbacController.listRoles);
router.post('/admin/roles', RbacController.createRole);
router.get('/admin/roles/:id', RbacController.getRoleById);
router.put('/admin/roles/:id', RbacController.updateRole);
router.delete('/admin/roles/:id', RbacController.deleteRole);

router.get('/admin/permissions', RbacController.listPermissions);
router.post('/admin/users/:id/roles', RbacController.assignUserRoles);
router.post('/admin/rbac/seed', RbacController.seed);

export { router as rbacRoutes };
