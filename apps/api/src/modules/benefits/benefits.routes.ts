import { Router } from 'express';
import { ensureAuthenticated, checkRole } from '../../middlewares/auth.middleware';
import { BenefitsController } from './controllers/benefits.controller';

const router = Router();

router.use(ensureAuthenticated);

router.get('/benefits/me', BenefitsController.getMyBenefits);
router.get('/benefits', checkRole('ADMIN', 'RH'), BenefitsController.getAllBenefits);
router.post('/benefits', checkRole('ADMIN', 'RH'), BenefitsController.createBenefit);
router.post('/employees/:employeeId/benefits', checkRole('ADMIN', 'RH'), BenefitsController.assignEmployeeBenefit);
router.put('/employees/benefits/:id', checkRole('ADMIN', 'RH'), BenefitsController.updateEmployeeBenefit);

export const benefitsRoutes = router;
