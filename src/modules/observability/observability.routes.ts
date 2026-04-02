import { Router } from 'express';

import * as observabilityController from './observability.controller';

const router = Router();

router.get('/health', observabilityController.getHealth);
router.get('/health/live', observabilityController.getLiveness);
router.get('/health/ready', observabilityController.getReadiness);
router.get('/metrics', observabilityController.getMetrics);

export default router;
