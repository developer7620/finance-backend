import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import type { RequestUser } from '../../types/express';
import { ApiResponse } from '../../utils/ApiResponse';
import { catchAsync } from '../../utils/catchAsync';
import type {
  CreateRecordBody,
  ListRecordsQuery,
  RecordParams,
  UpdateRecordBody,
} from '../../validators/records.validator';
import * as recordsService from './records.service';

export const createRecord = catchAsync(
  async (
    req: Request<ParamsDictionary, unknown, CreateRecordBody>,
    res: Response,
  ): Promise<void> => {
    const result = await recordsService.createRecord(req.body, req.user!.id);
    res.status(201).json(new ApiResponse(result));
  },
);

export const getRecords = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const result = await recordsService.listRecords(
      req.query as unknown as ListRecordsQuery,
      req.user as RequestUser,
    );
    res.status(200).json(new ApiResponse(result.records, result.meta));
  },
);

export const getRecord = catchAsync(
  async (req: Request<RecordParams>, res: Response): Promise<void> => {
    const result = await recordsService.getRecordById(req.params.id, req.user as RequestUser);
    res.status(200).json(new ApiResponse(result));
  },
);

export const updateRecord = catchAsync(
  async (req: Request<RecordParams, unknown, UpdateRecordBody>, res: Response): Promise<void> => {
    const result = await recordsService.updateRecordById(req.params.id, req.body, req.user!.id);
    res.status(200).json(new ApiResponse(result));
  },
);

export const deleteRecord = catchAsync(
  async (req: Request<RecordParams>, res: Response): Promise<void> => {
    const result = await recordsService.softDeleteRecordById(req.params.id, req.user!.id);
    res.status(200).json(new ApiResponse(result));
  },
);
