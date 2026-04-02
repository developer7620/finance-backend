import type { Request, Response } from 'express';

import { catchAsync } from '../../utils/catchAsync';
import * as observabilityService from './observability.service';

export const getHealth = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await observabilityService.getCombinedHealth();
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getLiveness = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await observabilityService.getLiveness();
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getReadiness = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await observabilityService.getReadiness();
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getMetrics = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const metrics = await observabilityService.getMetrics();
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metrics);
});
