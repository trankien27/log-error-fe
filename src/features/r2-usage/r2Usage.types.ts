/**
 * Contract kem theo `R2UsageDto` cua backend (`GET /api/r2-usage`).
 *
 * Luu y ve dat ten: `storage` dung `usedBytes`/`limitBytes`, con `classA`/`classB`
 * dung `used`/`limit`. Su bat doi xung nay la co chu y va khop verbatim voi DTO
 * phia backend - khong "sua lai" cho dong bo.
 */
export type R2UsageStatus = 'Normal' | 'Info' | 'Warning' | 'Critical' | 'Block';

export interface R2StorageMetric {
  usedBytes: number;
  limitBytes: number;
  percent: number;
  status: R2UsageStatus;
}

export interface R2UsageMetric {
  used: number;
  limit: number;
  percent: number;
  status: R2UsageStatus;
}

export interface R2Usage {
  enabled: boolean;
  year: number;
  month: number;
  objectCount: number;
  freeRequests: number;
  /** ISO-8601 */
  updatedAt: string;
  storage: R2StorageMetric;
  classA: R2UsageMetric;
  classB: R2UsageMetric;
}
