import {
  ErrorGroup,
  ErrorLog,
  PagedResult,
  ProcessingFlow,
  Severity,
  TransactionErrorQueueItem,
  TransactionErrorQueueStatus,
} from '../../types';
import { ErrorLogPayload } from './logsService';
import { apiClient } from './apiClient';

export type TransactionErrorQueueQuery = {
  status?: TransactionErrorQueueStatus;
  boothCode?: string;
  transactionStatus?: number | string;
  pageIndex?: number;
  pageSize?: number;
};

export type ConvertTransactionErrorQueuePayload = {
  receivedDate: string;
  store: string;
  booth?: string;
  errorGroup: ErrorGroup;
  description: string;
  processingFlow: ProcessingFlow;
  preliminaryCause?: string;
  solution?: string;
  severity: Severity;
  assignedToId?: string;
  note?: string;
};

export type ConvertTransactionErrorQueueResponse = {
  queue: TransactionErrorQueueItem;
  errorLog: ErrorLog;
};

function buildQuery(params: TransactionErrorQueueQuery = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const transactionErrorQueueService = {
  getAll: (query?: TransactionErrorQueueQuery) =>
    apiClient.get<PagedResult<TransactionErrorQueueItem>>(`/api/transaction-error-queue${buildQuery(query)}`),

  getById: (id: string) =>
    apiClient.get<TransactionErrorQueueItem>(`/api/transaction-error-queue/${encodeURIComponent(id)}`),

  convertToErrorLog: (id: string, payload: ConvertTransactionErrorQueuePayload | ErrorLogPayload) =>
    apiClient.post<ConvertTransactionErrorQueueResponse>(
      `/api/transaction-error-queue/${encodeURIComponent(id)}/convert-to-error-log`,
      payload,
    ),

  ignore: (id: string) =>
    apiClient.post<TransactionErrorQueueItem>(`/api/transaction-error-queue/${encodeURIComponent(id)}/ignore`),
};
