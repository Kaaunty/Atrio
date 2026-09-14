import { Router } from 'express';
import { RbacController } from './controllers/rbac.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Gestão de Perfis & Permissões (Admin)
router.get('/admin/roles', RbacController.listRoles);
router.post('/admin/roles', RbacController.createRole);
router.get('/admin/roles/:id', RbacController.getRoleById);
router.put('/admin/roles/:id', RbacController.updateRole);
router.delete('/admin/roles/:id', RbacController.deleteRole);

router.get('/admin/permissions', RbacController.listPermissions);
router.get('/admin/users', RbacController.listUsers);
router.post('/admin/users/sync-employees', RbacController.syncEmployees);
router.patch('/admin/users/:id/employee', RbacController.updateUserEmployee);
router.post('/admin/users/:id/roles', RbacController.assignUserRoles);
router.delete('/admin/users/:id', authenticate, RbacController.deleteUser);
router.post('/admin/rbac/seed', RbacController.seed);


export { router as rbacRoutes };
