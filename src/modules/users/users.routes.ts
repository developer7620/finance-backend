import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { listUsersSchema, updateUserSchema, userParamsSchema } from '../../validators/users.validator';
import * as usersController from './users.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('users:read'), validate(listUsersSchema), usersController.getUsers);
router.get('/:id', authorize('users:read'), validate(userParamsSchema), usersController.getUser);
router.patch('/:id', authorize('users:update'), validate(updateUserSchema), usersController.updateUser);
router.patch(
  '/:id/deactivate',
  authorize('users:deactivate'),
  validate(userParamsSchema),
  usersController.deactivateUser,
);

export default router;
