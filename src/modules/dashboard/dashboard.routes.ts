import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  dashboardByCategorySchema,
  dashboardRecentSchema,
  dashboardSummarySchema,
  dashboardTrendsSchema,
} from '../../validators/dashboard.validator';
import * as dashboardController from './dashboard.controller';

const router = Router();

router.use(authenticate);

router.get(
  '/summary',
  authorize('dashboard:read'),
  validate(dashboardSummarySchema),
  dashboardController.getSummary,
);
router.get(
  '/by-category',
  authorize('dashboard:read'),
  validate(dashboardByCategorySchema),
  dashboardController.getByCategory,
);
router.get(
  '/trends',
  authorize('dashboard:read'),
  validate(dashboardTrendsSchema),
  dashboardController.getTrends,
);
router.get(
  '/recent',
  authorize('dashboard:read'),
  validate(dashboardRecentSchema),
  dashboardController.getRecent,
);

export default router;
