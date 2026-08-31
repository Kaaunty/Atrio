import { Router } from 'express';
import { EmployeeController } from './controllers/employee.controller.js';

const router = Router();

// -----------------------------------------------------------------------------
// COLABORADORES (EMPLOYEES)
// -----------------------------------------------------------------------------
router.get('/employees', EmployeeController.list);
router.post('/employees', EmployeeController.create);
router.get('/employees/:id', EmployeeController.getById);
router.put('/employees/:id', EmployeeController.update);
router.delete('/employees/:id', EmployeeController.delete);

// Liderados diretos (Subordinados)
router.get('/employees/:id/subordinates', EmployeeController.getSubordinates);

// Timeline histórica
router.get('/employees/:id/timeline', EmployeeController.getTimeline);
router.post('/employees/:id/timeline', EmployeeController.createTimelineEvent);

export { router as employeeRoutes };
