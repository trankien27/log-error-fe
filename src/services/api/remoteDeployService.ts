import { apiClient } from './apiClient';

export type RemoteDeployTaskType =
  | 'update-version'
  | 'fs-async-transaction'
  | 'fs-update-sync'
  | 'app-form';

export interface RemoteMachine {
  machineCode: string;
  connectionId?: string;
  agentVersion?: string;
  connectedAt?: string;
  status?: string;
}

export interface RemoteMachinesResponse {
  machines: RemoteMachine[];
  onlineMachines?: string[];
  recentTasks?: unknown[];
}

interface RemoteMachinesApiResponse {
  machines?: RemoteMachine[];
  onlineMachines?: string[];
  recentTasks?: unknown[];
}

export interface RemoteDeployRequest {
  downloadUrl: string;
  waitForResult: boolean;
  waitTimeoutSeconds?: number;
  timeoutSeconds?: number;
  cleanTargetBeforeExtract?: boolean;
}

export type RemotePowerShellRunAs = 'admin' | 'user';
export type RemotePowerShellMode = 'inline' | 'file';

export interface RemotePowerShellInlineRequest {
  script: string;
  workingDirectory?: string;
  environmentVariables?: Record<string, string> | null;
  timeoutSeconds?: number;
  waitTimeoutSeconds?: number;
  waitForResult: boolean;
}

export interface RemotePowerShellFileRequest {
  scriptPath: string;
  arguments?: string;
  workingDirectory?: string;
  environmentVariables?: Record<string, string> | null;
  timeoutSeconds?: number;
  waitTimeoutSeconds?: number;
  waitForResult: boolean;
}

export interface RemoteTransactionListItem {
  transactionId: string;
  code: string;
  values: Record<string, unknown>;
}

export interface RemotePrintImageRequest {
  transactionId: string;
  layoutId: number;
  numberOfImage: number;
  waitTimeoutSeconds?: number;
  waitForResult: boolean;
}

export interface RemoteDeployResponse {
  taskId?: string;
  taskType?: string;
  machineCode?: string;
  id?: string;
  status?: string;
  message?: string;
  completed?: {
    taskId?: string;
    status?: string;
    exitCode?: number;
    stdOut?: string;
    stdErr?: string;
    startedAt?: string;
    finishedAt?: string;
    [key: string]: unknown;
  };
  state?: RemoteTaskStatusResponse;
  result?: unknown;
  [key: string]: unknown;
}

export interface RemoteTaskStatusResponse {
  taskId?: string;
  id?: string;
  machineCode?: string;
  taskType?: string;
  status?: string;
  message?: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  logs?: unknown[];
  result?: unknown;
  [key: string]: unknown;
}

const deployPathByType: Record<RemoteDeployTaskType, string> = {
  'update-version': 'update-version',
  'fs-async-transaction': 'fs-async-transaction',
  'fs-update-sync': 'fs-update-sync',
  'app-form': 'app-form',
};

const deploy = (machineCode: string, taskType: RemoteDeployTaskType, body: RemoteDeployRequest) =>
  apiClient.post<RemoteDeployResponse>(
    `/api/remote-deploy/machines/${encodeURIComponent(machineCode)}/${deployPathByType[taskType]}`,
    body,
  );

const runPowerShellInline = (
  machineCode: string,
  runAs: RemotePowerShellRunAs,
  body: RemotePowerShellInlineRequest,
) =>
  apiClient.post<RemoteDeployResponse>(
    `/api/remote-deploy/machines/${encodeURIComponent(machineCode)}/powershell/${runAs}`,
    body,
  );

const runPowerShellFile = (
  machineCode: string,
  runAs: RemotePowerShellRunAs,
  body: RemotePowerShellFileRequest,
) =>
  apiClient.post<RemoteDeployResponse>(
    `/api/remote-deploy/machines/${encodeURIComponent(machineCode)}/powershell/file/${runAs}`,
    body,
  );

const getTransactions = (machineCode: string, waitTimeoutSeconds = 60) =>
  apiClient.get<RemoteDeployResponse>(
    `/api/remote-deploy/machines/${encodeURIComponent(machineCode)}/transactions?waitTimeoutSeconds=${waitTimeoutSeconds}&waitForResult=true`,
  );

const printImage = (machineCode: string, body: RemotePrintImageRequest) =>
  apiClient.post<RemoteDeployResponse>(
    `/api/remote-deploy/machines/${encodeURIComponent(machineCode)}/print-image`,
    body,
  );

export const remoteDeployService = {
  getMachines: async (): Promise<RemoteMachinesResponse> => {
    const response = await apiClient.get<RemoteMachinesApiResponse>('/api/remote-deploy/machines');
    const machines = response.machines?.length
      ? response.machines
      : (response.onlineMachines ?? []).map(machineCode => ({
          machineCode,
          connectionId: '',
          agentVersion: '',
          connectedAt: '',
        }));

    return {
      ...response,
      machines,
    };
  },

  getTaskStatus: (taskId: string) =>
    apiClient.get<RemoteTaskStatusResponse>(`/api/remote-deploy/tasks/${encodeURIComponent(taskId)}`),

  deployUpdateVersion: (machineCode: string, body: RemoteDeployRequest) =>
    deploy(machineCode, 'update-version', body),

  deployFsAsyncTransaction: (machineCode: string, body: RemoteDeployRequest) =>
    deploy(machineCode, 'fs-async-transaction', body),

  deployFsUpdateSync: (machineCode: string, body: RemoteDeployRequest) =>
    deploy(machineCode, 'fs-update-sync', body),

  deployAppForm: (machineCode: string, body: RemoteDeployRequest) =>
    deploy(machineCode, 'app-form', body),

  runPowerShellInline,

  runPowerShellFile,

  getTransactions,

  printImage,
};
