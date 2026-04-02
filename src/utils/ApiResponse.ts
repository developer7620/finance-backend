export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse<T> {
  public readonly success = true;
  public readonly data: T;
  public readonly meta?: PaginationMeta;

  constructor(data: T, meta?: PaginationMeta) {
    this.data = data;

    if (meta) {
      this.meta = meta;
    }
  }
}
