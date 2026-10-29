import { Router } from 'express';
import multer from 'multer';
import { EmployeeController } from './controllers/employee.controller.js';

const router = Router();
const uploadMemory = multer({ storage: multer.memoryStorage() });

// -----------------------------------------------------------------------------
// COLABORADORES (EMPLOYEES)
// -----------------------------------------------------------------------------
router.get('/employees', EmployeeController.list);
router.get('/employees/stats', EmployeeController.getStats);
router.post('/employees', EmployeeController.create);

// Importação em lote via Excel (Preview & Confirm)
router.post('/employees/import/preview', uploadMemory.single('file'), EmployeeController.importPreview);
router.post('/employees/import/confirm', EmployeeController.importConfirm);

router.get('/employees/:id', EmployeeController.getById);
router.put('/employees/:id', EmployeeController.update);
router.delete('/employees/:id', EmployeeController.delete);

// Liderados diretos (Subordinados)
router.get('/employees/:id/subordinates', EmployeeController.getSubordinates);

// Timeline histórica
router.get('/employees/:id/timeline', EmployeeController.getTimeline);
router.post('/employees/:id/timeline', EmployeeController.createTimelineEvent);

export { router as employeeRoutes };
