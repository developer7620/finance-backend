import type { Request, Response } from 'express';

import type { RequestUser } from '../../types/express';
import { ApiResponse } from '../../utils/ApiResponse';
import { catchAsync } from '../../utils/catchAsync';
import * as dashboardService from './dashboard.service';

export const getSummary = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await dashboardService.getSummary(req.user as RequestUser);
  res.status(200).json(new ApiResponse(result));
});

export const getByCategory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await dashboardService.getCategoryTotals(req.user as RequestUser);
  res.status(200).json(new ApiResponse(result));
});

export const getTrends = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await dashboardService.getMonthlyTrends(req.user as RequestUser);
  res.status(200).json(new ApiResponse(result));
});

export const getRecent = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await dashboardService.getRecentTransactions(req.user as RequestUser);
  res.status(200).json(new ApiResponse(result));
});
