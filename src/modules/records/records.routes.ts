import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createRecordSchema,
  listRecordsSchema,
  recordParamsSchema,
  updateRecordSchema,
} from '../../validators/records.validator';
import * as recordsController from './records.controller';

const router = Router();

router.use(authenticate);

router.post('/', authorize('records:create'), validate(createRecordSchema), recordsController.createRecord);
router.get(
  '/',
  authorize(['records:read:own', 'records:read:all']),
  validate(listRecordsSchema),
  recordsController.getRecords,
);
router.get(
  '/:id',
  authorize(['records:read:own', 'records:read:all']),
  validate(recordParamsSchema),
  recordsController.getRecord,
);
router.patch(
  '/:id',
  authorize('records:update'),
  validate(updateRecordSchema),
  recordsController.updateRecord,
);
router.delete(
  '/:id',
  authorize('records:delete'),
  validate(recordParamsSchema),
  recordsController.deleteRecord,
);

export default router;
