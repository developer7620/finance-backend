import type { Request, Response } from 'express';

import { ApiResponse } from '../../utils/ApiResponse';
import { catchAsync } from '../../utils/catchAsync';
import type { ListUsersQuery, UpdateUserBody, UserParams } from '../../validators/users.validator';
import * as usersService from './users.service';

export const getUsers = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const result = await usersService.listUsers(req.query as unknown as ListUsersQuery);
    res.status(200).json(new ApiResponse(result.users, result.meta));
  },
);

export const getUser = catchAsync(
  async (req: Request<UserParams>, res: Response): Promise<void> => {
    const result = await usersService.getUserById(req.params.id);
    res.status(200).json(new ApiResponse(result));
  },
);

export const updateUser = catchAsync(
  async (req: Request<UserParams, unknown, UpdateUserBody>, res: Response): Promise<void> => {
    const result = await usersService.updateUserById(req.params.id, req.body, req.user!.id);
    res.status(200).json(new ApiResponse(result));
  },
);

export const deactivateUser = catchAsync(
  async (req: Request<UserParams>, res: Response): Promise<void> => {
    const result = await usersService.deactivateUserById(req.params.id, req.user!.id);
    res.status(200).json(new ApiResponse(result));
  },
);
