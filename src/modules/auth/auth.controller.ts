import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { ApiResponse } from '../../utils/ApiResponse';
import { catchAsync } from '../../utils/catchAsync';
import type {
  LoginRequestBody,
  LogoutRequestBody,
  RefreshRequestBody,
  RegisterRequestBody,
} from '../../validators/auth.validator';
import * as authService from './auth.service';

export const register = catchAsync(
  async (
    req: Request<ParamsDictionary, unknown, RegisterRequestBody>,
    res: Response,
  ): Promise<void> => {
    const result = await authService.registerUser(req.body);
    res.status(201).json(new ApiResponse(result));
  },
);

export const login = catchAsync(
  async (
    req: Request<ParamsDictionary, unknown, LoginRequestBody>,
    res: Response,
  ): Promise<void> => {
    const result = await authService.loginUser(req.body);
    res.status(200).json(new ApiResponse(result));
  },
);

export const me = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.getCurrentUser(req.user!.id);
  res.status(200).json(new ApiResponse(result));
});

export const refresh = catchAsync(
  async (
    req: Request<ParamsDictionary, unknown, RefreshRequestBody>,
    res: Response,
  ): Promise<void> => {
    const result = await authService.refreshSession(req.body);
    res.status(200).json(new ApiResponse(result));
  },
);

export const logout = catchAsync(
  async (
    req: Request<ParamsDictionary, unknown, LogoutRequestBody>,
    res: Response,
  ): Promise<void> => {
    const result = await authService.logoutSession(req.body);
    res.status(200).json(new ApiResponse(result));
  },
);

export const logoutAll = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.logoutFromAllSessions(req.user!.id);
  res.status(200).json(new ApiResponse(result));
});
