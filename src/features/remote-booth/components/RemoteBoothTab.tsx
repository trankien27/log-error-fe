import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ClipboardList, FileCode2, History, Images, Loader2, Play, Printer, RefreshCw, RadioTower, Search, SearchCheck, Terminal, WifiOff, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  RemoteDeployRequest,
  RemoteDeployResponse,
  RemoteDeployTaskType,
  RemoteMachine,
  RemotePowerShellMode,
  RemotePowerShellRunAs,
  RemoteTaskHistoryItem,
  RemoteTransactionListItem,
  remoteDeployService,
} from '../../../services/api/remoteDeployService';
import { boothsService } from '../../../services/api/boothsService';
import { EmptyState, FilterBar, PageHeader, Skeleton, TableSkeletonRows, confirmAction } from '../../../components/ui';

type TaskOption = {
  value: RemoteDeployTaskType;
  label: string;
};

type RemotePanelMode = 'deploy' | 'powershell' | 'print';

type MultiDeployResult = {
  machineCode: string;
  boothName?: string;
  ok: boolean;
  response?: RemoteDeployResponse;
  error?: string;
};

const taskOptions: TaskOption[] = [
  { value: 'update-version', label: 'Cập nhật phiên bản' },
  { value: 'fs-async-transaction', label: 'Triển khai FSAsyncTransaction' },
  { value: 'fs-update-sync', label: 'Triển khai FSUpdateSync' },
  { value: 'app-form', label: 'Triển khai AppForm' },
];

// URL goi cai dat agent moi (GitHub Release). Task UPDATE_AGENT_SERVICE se tai ban nay,
// stage ra thu muc tam roi mot tien trinh updater tach roi se stop -> swap -> start lai service agent.
const DEFAULT_AGENT_RELEASE_URL = 'https://github.com/trankien27/fun-agent/releases/download/Fun-agent/agent.zip';
const MACHINE_PAGE_SIZE = 30;

const endpointLabels: Record<RemoteDeployTaskType, string> = {
  'update-version': 'Cập nhật phiên bản',
  'fs-async-transaction': 'FSAsyncTransaction',
  'fs-update-sync': 'FSUpdateSync',
  'app-form': 'AppForm',
};

const taskTypeLabels: Record<string, string> = {
  UPDATE_VERSION: 'Cập nhật phiên bản',
  DEPLOY_FS_ASYNC_TRANSACTION: 'Triển khai FSAsyncTransaction',
  DEPLOY_FS_UPDATE_SYNC: 'Triển khai FSUpdateSync',
  DEPLOY_APP_FORM: 'Triển khai AppForm',
  RUN_POWERSHELL_ADMIN: 'PowerShell Admin',
  RUN_POWERSHELL_USER: 'PowerShell User',
  RUN_POWERSHELL_FILE_ADMIN: 'PowerShell File Admin',
  RUN_POWERSHELL_FILE_USER: 'PowerShell File User',
  GET_TRANSACTIONS: 'Lấy giao dịch',
  PRINT_IMAGE: 'In ảnh',
  UPDATE_AGENT_SERVICE: 'Cập nhật agent',
};

const priorityTransactionColumns = [
  'RecordAt',
  'Id',
  'LayoutId',
  'FrameId',
  'ThemeId',
  'PrintNumber',
  'LayoutAmount',
  'PrintAmount',
  'Deposit',
  'PaymentMethod',
  'Status',
  'CreatedTime',
  'UpdatedTime',
  'UploadTime',
  'Pincode',
  'IsSelfBooth',
  'OrderId',
  'PhoneNumber',
];

const sendDeployTask = (machineCode: string, type: RemoteDeployTaskType, body: RemoteDeployRequest) => {
  if (type === 'update-version') return remoteDeployService.deployUpdateVersion(machineCode, body);
  if (type === 'fs-async-transaction') return remoteDeployService.deployFsAsyncTransaction(machineCode, body);
  if (type === 'fs-update-sync') return remoteDeployService.deployFsUpdateSync(machineCode, body);
  return remoteDeployService.deployAppForm(machineCode, body);
};

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const isMachineOnline = (machine: RemoteMachine) => (
  String(machine.status || '').toLowerCase() === 'online'
);

const getMachineStatusLabel = (machine: RemoteMachine) => (
  isMachineOnline(machine) ? 'Online' : 'Offline'
);

const getMachineStatusClass = (machine: RemoteMachine) => (
  isMachineOnline(machine)
    ? 'bg-success-container text-on-success-container'
    : 'bg-error-container text-on-error-container'
);

const getMachineLastSeenLabel = (machine: RemoteMachine) => (
  formatDateTime(machine.lastSeenAt || machine.connectedAt)
);

const getHistoryStatusClass = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === 'SUCCESS' || normalized === 'COMPLETED') return 'bg-success-container text-on-success-container';
  if (normalized === 'FAILED' || normalized === 'TIMED_OUT') return 'bg-error-container text-on-error-container';
  return 'bg-secondary-container text-on-secondary-container';
};

const getHistoryTaskLabel = (item: RemoteTaskHistoryItem) => (
  taskTypeLabels[item.taskType] || item.taskType
);

const getTaskId = (response?: RemoteDeployResponse | null) => {
  if (!response) return '';
  return String(response.taskId || response.id || '');
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  return fallback;
};

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const parseEnvironmentVariables = (value: string) => {
  const lines = value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return undefined;

  return lines.reduce<Record<string, string>>((acc, line) => {
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      throw new Error('Environment variables nhập mỗi dòng theo dạng KEY=VALUE.');
    }

    const key = line.slice(0, separatorIndex).trim();
    const envValue = line.slice(separatorIndex + 1);
    if (!key) {
      throw new Error('Environment variable key không được để trống.');
    }

    acc[key] = envValue;
    return acc;
  }, {});
};

const getCompletedStdOut = (response?: RemoteDeployResponse | null) => {
  if (!response) return '';
  const completed = response.completed;
  const stateResult = response.state?.result;
  const directResult = response.result;

  if (completed?.stdOut) return completed.stdOut;
  if (stateResult && typeof stateResult === 'object' && 'stdOut' in stateResult) {
    return String((stateResult as { stdOut?: unknown }).stdOut ?? '');
  }
  if (directResult && typeof directResult === 'object' && 'stdOut' in directResult) {
    return String((directResult as { stdOut?: unknown }).stdOut ?? '');
  }

  return '';
};

const getCompletedStdErr = (response?: RemoteDeployResponse | null) => {
  if (!response) return '';
  const completed = response.completed;
  const stateResult = response.state?.result;
  const directResult = response.result;

  if (completed?.stdErr) return completed.stdErr;
  if (stateResult && typeof stateResult === 'object' && 'stdErr' in stateResult) {
    return String((stateResult as { stdErr?: unknown }).stdErr ?? '');
  }
  if (directResult && typeof directResult === 'object' && 'stdErr' in directResult) {
    return String((directResult as { stdErr?: unknown }).stdErr ?? '');
  }

  return '';
};

const getCompletedStatus = (response?: RemoteDeployResponse | null) => {
  if (!response) return '';
  const stateResult = response.state?.result;
  const directResult = response.result;

  if (response.completed?.status) return response.completed.status;
  if (response.state?.status) return response.state.status;
  if (response.status) return response.status;
  if (stateResult && typeof stateResult === 'object' && 'status' in stateResult) {
    return String((stateResult as { status?: unknown }).status ?? '');
  }
  if (directResult && typeof directResult === 'object' && 'status' in directResult) {
    return String((directResult as { status?: unknown }).status ?? '');
  }

  return '';
};

const parseTransactionsFromResponse = (response: RemoteDeployResponse): RemoteTransactionListItem[] => {
  const status = getCompletedStatus(response).toUpperCase();
  const stderr = getCompletedStdErr(response);
  if (status === 'FAILED' || status === 'TIMED_OUT' || stderr) {
    throw new Error(stderr || `Task lấy giao dịch thất bại: ${status}`);
  }

  const stdout = getCompletedStdOut(response);
  if (!stdout) return [];

  const parsed = JSON.parse(stdout) as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const record = item as {
        transactionId?: unknown;
        TransactionId?: unknown;
        values?: unknown;
        Values?: unknown;
      };
      const rawValues = record.values ?? record.Values;
      const values = rawValues && typeof rawValues === 'object'
        ? rawValues as Record<string, unknown>
        : {};
      const code = String(record.transactionId ?? record.TransactionId ?? values.Code ?? '');
      const transactionId = String(values.Id ?? values.TransactionId ?? record.transactionId ?? record.TransactionId ?? '');

      return {
        transactionId,
        code,
        values,
      };
    })
    .filter((item): item is RemoteTransactionListItem => Boolean(item?.transactionId));
};

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const formatTableCellValue = (value: unknown) => {
  const text = formatCellValue(value);
  if (!text) return '';
  if ((text.startsWith('{') || text.startsWith('[')) && text.length > 80) {
    return `${text.slice(0, 80)}...`;
  }
  return text;
};

const getTransactionValue = (item: RemoteTransactionListItem, key: string) => item.values?.[key];

const toNumberOrDefault = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const getTransactionLabel = (item: RemoteTransactionListItem) => {
  const recordAt = formatCellValue(getTransactionValue(item, 'RecordAt') ?? getTransactionValue(item, 'CreatedTime'));
  const layoutId = formatCellValue(getTransactionValue(item, 'LayoutId'));
  const printNumber = formatCellValue(getTransactionValue(item, 'PrintNumber'));
  const suffix = [
    recordAt,
    layoutId ? `Layout ${layoutId}` : '',
    printNumber ? `${printNumber} ảnh` : '',
  ].filter(Boolean).join(' · ');

  return suffix ? `${item.code} · ${suffix}` : item.code || item.transactionId || 'Không có Code';
};

const applyPrintDefaultsFromTransaction = (
  item: RemoteTransactionListItem | undefined,
  setLayoutId: (value: number) => void,
  setNumberOfImage: (value: number) => void,
) => {
  if (!item) return;

  setLayoutId(toNumberOrDefault(getTransactionValue(item, 'LayoutId'), 0));
  setNumberOfImage(toNumberOrDefault(getTransactionValue(item, 'PrintNumber'), 1));
};

export default function RemoteBoothTab() {
  const [selectedMachine, setSelectedMachine] = useState<RemoteMachine | null>(null);
  const [multiDeployMachines, setMultiDeployMachines] = useState<RemoteMachine[]>([]);
  const [selectedMachineCodes, setSelectedMachineCodes] = useState<string[]>([]);
  const [machineSearch, setMachineSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [panelMode, setPanelMode] = useState<RemotePanelMode>('deploy');
  const [taskType, setTaskType] = useState<RemoteDeployTaskType>('update-version');
  const [updateVersionMode, setUpdateVersionMode] = useState<'api' | 'manual'>('api');
  const [selectedUpdateVersionId, setSelectedUpdateVersionId] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [waitForResult, setWaitForResult] = useState(true);
  const [waitTimeoutSeconds, setWaitTimeoutSeconds] = useState(600);
  const [timeoutSeconds, setTimeoutSeconds] = useState(300);
  const [cleanTargetBeforeExtract, setCleanTargetBeforeExtract] = useState(false);
  const [powerShellMode, setPowerShellMode] = useState<RemotePowerShellMode>('inline');
  const [powerShellRunAs, setPowerShellRunAs] = useState<RemotePowerShellRunAs>('admin');
  const [powerShellScript, setPowerShellScript] = useState('whoami; Get-Date');
  const [powerShellScriptPath, setPowerShellScriptPath] = useState('');
  const [powerShellArguments, setPowerShellArguments] = useState('');
  const [powerShellWorkingDirectory, setPowerShellWorkingDirectory] = useState('');
  const [powerShellEnvironmentText, setPowerShellEnvironmentText] = useState('');
  const [powerShellTimeoutSeconds, setPowerShellTimeoutSeconds] = useState(60);
  const [transactions, setTransactions] = useState<RemoteTransactionListItem[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [printLayoutId, setPrintLayoutId] = useState(0);
  const [printNumberOfImage, setPrintNumberOfImage] = useState(1);
  const [deployResult, setDeployResult] = useState<RemoteDeployResponse | null>(null);
  const [multiDeployResults, setMultiDeployResults] = useState<MultiDeployResult[]>([]);
  const [deployError, setDeployError] = useState('');
  const [isResolvingVersionUrl, setIsResolvingVersionUrl] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [machinePageIndex, setMachinePageIndex] = useState(1);

  const machinesQuery = useQuery({
    queryKey: ['remote-deploy', 'machines'],
    queryFn: remoteDeployService.getMachines,
  });

  const boothsQuery = useQuery({
    queryKey: ['remote-booth', 'booths'],
    queryFn: () => boothsService.getAll(),
  });

  const updateVersionsQuery = useQuery({
    queryKey: ['remote-deploy', 'file-versions', 2],
    queryFn: () => remoteDeployService.getFileVersions(2),
    enabled: panelMode === 'deploy' && taskType === 'update-version' && updateVersionMode === 'api',
  });

  const historyQuery = useQuery({
    queryKey: ['remote-deploy', 'history'],
    queryFn: () => remoteDeployService.getHistory({ pageSize: 100 }),
    // Tu refresh de theo doi ket qua cuoi cua cac task chay bat dong bo (vd. update agent).
    refetchInterval: 10000,
  });

  const boothsByCode = useMemo(() => {
    const map = new Map<string, string>();
    (boothsQuery.data ?? []).forEach(booth => {
      if (booth.id) map.set(String(booth.id).toLowerCase(), booth.name);
      if (booth.code) map.set(String(booth.code).toLowerCase(), booth.name);
      if (booth.ultraviewId) map.set(String(booth.ultraviewId).toLowerCase(), booth.name);
    });
    return map;
  }, [boothsQuery.data]);

  const getMachineBoothName = (machine: RemoteMachine) => (
    machine.boothName || boothsByCode.get(machine.machineCode.toLowerCase()) || ''
  );

  const boothsByMachineCode = useMemo(() => {
    const map = new Map<string, NonNullable<typeof boothsQuery.data>[number]>();
    (boothsQuery.data ?? []).forEach(booth => {
      if (booth.id) map.set(String(booth.id).toLowerCase(), booth);
      if (booth.code) map.set(String(booth.code).toLowerCase(), booth);
      if (booth.ultraviewId) map.set(String(booth.ultraviewId).toLowerCase(), booth);
    });
    return map;
  }, [boothsQuery.data]);

  const storeOptions = useMemo(() => {
    const values = new Map<string, string>();
    (boothsQuery.data ?? []).forEach(booth => {
      const storeValue = booth.storeId ?? booth.relatedStores;
      const storeLabel = booth.storeName || booth.relatedStores || String(storeValue ?? '');
      if (storeValue !== null && storeValue !== undefined && String(storeValue).trim()) {
        values.set(String(storeValue).trim(), storeLabel.trim());
      }
    });
    return Array.from(values, ([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, 'vi'));
  }, [boothsQuery.data]);

  const machines = useMemo(() => machinesQuery.data?.machines ?? [], [machinesQuery.data]);
  const getMachineBooth = (machine: RemoteMachine) => boothsByMachineCode.get(machine.machineCode.toLowerCase());
  const filteredMachines = useMemo(() => {
    const keyword = machineSearch.trim().toLowerCase();

    return machines.filter(machine => {
      const booth = getMachineBooth(machine);
      if (storeFilter) {
        const boothStore = machine.storeId ?? booth?.storeId ?? booth?.relatedStores ?? '';
        if (String(boothStore) !== storeFilter) {
          return false;
        }
      }

      if (!keyword) return true;

      const boothName = getMachineBoothName(machine).toLowerCase();
      return [
        machine.machineCode,
        machine.agentVersion,
        machine.connectionId,
        machine.status,
        boothName,
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(keyword));
    });
  }, [boothsByCode, boothsByMachineCode, machineSearch, machines, storeFilter]);
  const onlineFilteredMachines = useMemo(() => filteredMachines.filter(isMachineOnline), [filteredMachines]);
  const machineTotalPages = Math.max(1, Math.ceil(filteredMachines.length / MACHINE_PAGE_SIZE));
  const safeMachinePageIndex = Math.min(machinePageIndex, machineTotalPages);
  const pagedMachines = useMemo(() => {
    const startIndex = (safeMachinePageIndex - 1) * MACHINE_PAGE_SIZE;
    return filteredMachines.slice(startIndex, startIndex + MACHINE_PAGE_SIZE);
  }, [filteredMachines, safeMachinePageIndex]);
  const machinePageStart = filteredMachines.length === 0 ? 0 : (safeMachinePageIndex - 1) * MACHINE_PAGE_SIZE + 1;
  const machinePageEnd = Math.min(safeMachinePageIndex * MACHINE_PAGE_SIZE, filteredMachines.length);
  const selectedMachineCodeSet = useMemo(() => new Set(selectedMachineCodes), [selectedMachineCodes]);
  const selectedMachines = useMemo(
    () => machines.filter(machine => selectedMachineCodeSet.has(machine.machineCode) && isMachineOnline(machine)),
    [machines, selectedMachineCodeSet],
  );
  const allFilteredSelected = onlineFilteredMachines.length > 0
    && onlineFilteredMachines.every(machine => selectedMachineCodeSet.has(machine.machineCode));
  const activeMachines = multiDeployMachines.length > 0
    ? multiDeployMachines
    : selectedMachine
      ? [selectedMachine]
      : [];
  const isMultiDeploy = panelMode === 'deploy' && multiDeployMachines.length > 1;
  const transactionColumns = useMemo(() => {
    const columns = new Set<string>();
    transactions.forEach(item => Object.keys(item.values ?? {}).forEach(key => columns.add(key)));
    columns.delete('TransactionId');
    columns.delete('Code');
    const priorityColumns = priorityTransactionColumns.filter(column => columns.has(column));
    const otherColumns = Array.from(columns)
      .filter(column => !priorityTransactionColumns.includes(column))
      .sort((left, right) => left.localeCompare(right));

    return [...priorityColumns, ...otherColumns];
  }, [transactions]);

  const deployMutation = useMutation({
    mutationFn: ({ machineCode, body, type }: { machineCode: string; body: RemoteDeployRequest; type: RemoteDeployTaskType }) => {
      return sendDeployTask(machineCode, type, body);
    },
    onSuccess: result => {
      setDeployResult(result);
      setDeployError('');
      historyQuery.refetch();
      toast.success('Đã gửi tác vụ triển khai.');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể gửi tác vụ triển khai.');
      setDeployError(message);
      setDeployResult(null);
      toast.error(message);
    },
  });

  const updateAgentServiceMutation = useMutation({
    mutationFn: ({ machineCode, body }: { machineCode: string; body: RemoteDeployRequest }) =>
      remoteDeployService.deployUpdateAgentService(machineCode, body),
    onSuccess: result => {
      setDeployResult(result);
      setDeployError('');
      historyQuery.refetch();
      toast.success('Đã gửi lệnh cập nhật agent. Theo dõi kết quả trong Lịch sử tác vụ.');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể gửi task cập nhật agent.');
      setDeployError(message);
      setDeployResult(null);
      toast.error(message);
    },
  });

  const multiDeployMutation = useMutation({
    mutationFn: async ({
      targetMachines,
      body,
      type,
    }: {
      targetMachines: RemoteMachine[];
      body: RemoteDeployRequest;
      type: RemoteDeployTaskType;
    }) => {
      return Promise.all(
        targetMachines.map(async machine => {
          try {
            const response = await sendDeployTask(machine.machineCode, type, body);
            return {
              machineCode: machine.machineCode,
              boothName: getMachineBoothName(machine),
              ok: true,
              response,
            } satisfies MultiDeployResult;
          } catch (error) {
            return {
              machineCode: machine.machineCode,
              boothName: getMachineBoothName(machine),
              ok: false,
              error: getErrorMessage(error, 'Không thể gửi tác vụ triển khai.'),
            } satisfies MultiDeployResult;
          }
        }),
      );
    },
    onSuccess: results => {
      setMultiDeployResults(results);
      setDeployResult(null);
      setDeployError('');
      historyQuery.refetch();
      const okCount = results.filter(result => result.ok).length;
      toast.success(`Đã gửi tới ${okCount}/${results.length} booth.`);
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể triển khai hàng loạt.');
      setDeployError(message);
      setMultiDeployResults([]);
      toast.error(message);
    },
  });

  const powerShellMutation = useMutation({
    mutationFn: ({
      machineCode,
      mode,
      runAs,
      body,
    }: {
      machineCode: string;
      mode: RemotePowerShellMode;
      runAs: RemotePowerShellRunAs;
      body:
        | Parameters<typeof remoteDeployService.runPowerShellInline>[2]
        | Parameters<typeof remoteDeployService.runPowerShellFile>[2];
    }) => {
      if (mode === 'inline') {
        return remoteDeployService.runPowerShellInline(
          machineCode,
          runAs,
          body as Parameters<typeof remoteDeployService.runPowerShellInline>[2],
        );
      }

      return remoteDeployService.runPowerShellFile(
        machineCode,
        runAs,
        body as Parameters<typeof remoteDeployService.runPowerShellFile>[2],
      );
    },
    onSuccess: result => {
      setDeployResult(result);
      setDeployError('');
      historyQuery.refetch();
      toast.success('Đã gửi lệnh PowerShell.');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể gửi task PowerShell.');
      setDeployError(message);
      setDeployResult(null);
      toast.error(message);
    },
  });

  const transactionsMutation = useMutation({
    mutationFn: ({ machineCode, waitSeconds }: { machineCode: string; waitSeconds: number }) =>
      remoteDeployService.getTransactions(machineCode, waitSeconds),
    onSuccess: result => {
      try {
        const parsedTransactions = parseTransactionsFromResponse(result);
        setTransactions(parsedTransactions);
        setSelectedTransactionId(parsedTransactions[0]?.transactionId ?? '');
        applyPrintDefaultsFromTransaction(parsedTransactions[0], setPrintLayoutId, setPrintNumberOfImage);
        setDeployResult(result);
        setDeployError('');
        historyQuery.refetch();
        toast.success(`Đã tải ${parsedTransactions.length} giao dịch.`);
      } catch (error) {
        const message = getErrorMessage(error, 'Không thể parse danh sách giao dịch.');
        setDeployError(message);
        setTransactions([]);
        toast.error(message);
      }
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể tải danh sách giao dịch.');
      setDeployError(message);
      setTransactions([]);
      toast.error(message);
    },
  });

  const printImageMutation = useMutation({
    mutationFn: ({
      machineCode,
      transactionId,
      layoutId,
      numberOfImage,
    }: {
      machineCode: string;
      transactionId: string;
      layoutId: number;
      numberOfImage: number;
    }) =>
      remoteDeployService.printImage(machineCode, {
        transactionId,
        layoutId,
        numberOfImage,
        waitTimeoutSeconds,
        waitForResult: true,
      }),
    onSuccess: result => {
      setDeployResult(result);
      setDeployError('');
      historyQuery.refetch();
      toast.success('Đã gửi lệnh in ảnh.');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể gửi lệnh in ảnh.');
      setDeployError(message);
      setDeployResult(null);
      toast.error(message);
    },
  });

  const taskStatusMutation = useMutation({
    mutationFn: remoteDeployService.getTaskStatus,
    onSuccess: result => {
      setDeployResult(result);
      toast.success('Đã cập nhật trạng thái.');
    },
    onError: error => {
      toast.error(getErrorMessage(error, 'Không thể kiểm tra trạng thái task.'));
    },
  });

  const resetPowerShellForm = () => {
    setPowerShellMode('inline');
    setPowerShellRunAs('admin');
    setPowerShellScript('whoami; Get-Date');
    setPowerShellScriptPath('');
    setPowerShellArguments('');
    setPowerShellWorkingDirectory('');
    setPowerShellEnvironmentText('');
    setPowerShellTimeoutSeconds(60);
  };

  const resetPrintForm = () => {
    setTransactions([]);
    setSelectedTransactionId('');
    setPrintLayoutId(0);
    setPrintNumberOfImage(1);
  };

  const resetDeployForm = () => {
    setTaskType('update-version');
    setUpdateVersionMode('api');
    setSelectedUpdateVersionId('');
    setDownloadUrl('');
    setWaitForResult(true);
    setWaitTimeoutSeconds(600);
    setTimeoutSeconds(300);
    setCleanTargetBeforeExtract(false);
    setMultiDeployResults([]);
  };

  const openRemotePanel = (machine: RemoteMachine, mode: RemotePanelMode) => {
    setSelectedMachine(machine);
    setMultiDeployMachines([]);
    setPanelMode(mode);
    resetDeployForm();
    resetPowerShellForm();
    resetPrintForm();
    setDeployResult(null);
    setDeployError('');
    if (mode === 'print') {
      transactionsMutation.mutate({ machineCode: machine.machineCode, waitSeconds: 60 });
    }
  };

  const confirmUpdateAgentService = async (machine: RemoteMachine) => {
    if (updateAgentServiceMutation.isPending) return;

    const boothLabel = getMachineBoothName(machine) || machine.machineCode;
    const confirmed = await confirmAction({
      title: `Cập nhật agent trên "${boothLabel}"?`,
      content:
        'Agent sẽ tải bản mới, tự dừng service, thay file rồi khởi động lại sau vài giây. ' +
        'Bạn có thể kiểm tra phiên bản agent mới trong danh sách booth.',
      okText: 'Cập nhật',
      danger: false,
    });
    if (!confirmed) return;

    setSelectedMachine(machine);
    setMultiDeployMachines([]);
    setDeployResult(null);
    setDeployError('');

    updateAgentServiceMutation.mutate({
      machineCode: machine.machineCode,
      body: {
        downloadUrl: DEFAULT_AGENT_RELEASE_URL,
        // Chờ agent xác nhận "đã khởi động update" (hoặc lỗi tiền xử lý). Kết quả SUCCESS/FAILED
        // cuối cùng do updater báo về sau khi swap + restart -> theo dõi ở bảng Lịch sử.
        waitForResult: true,
        waitTimeoutSeconds: 90,
        timeoutSeconds: 600,
      },
    });
  };

  const handleMachineAction = (machine: RemoteMachine, action: string) => {
    if (!action) return;
    if (!isMachineOnline(machine)) {
      toast.error('Booth đang offline, không thể gửi task.');
      return;
    }

    if (action === 'deploy') {
      openRemotePanel(machine, 'deploy');
      return;
    }

    if (action === 'powershell') {
      openRemotePanel(machine, 'powershell');
      return;
    }

    if (action === 'update-agent') {
      void confirmUpdateAgentService(machine);
      return;
    }

    if (action === 'print') {
      openRemotePanel(machine, 'print');
    }
  };

  const openMultiDeployPanel = () => {
    if (selectedMachines.length === 0) {
      toast.error('Vui lòng chọn ít nhất một booth.');
      return;
    }

    setSelectedMachine(null);
    setMultiDeployMachines(selectedMachines);
    setPanelMode('deploy');
    resetDeployForm();
    resetPowerShellForm();
    resetPrintForm();
    setDeployResult(null);
    setDeployError('');
  };

  const closeDeployPanel = () => {
    if (deployMutation.isPending || multiDeployMutation.isPending || powerShellMutation.isPending || transactionsMutation.isPending || printImageMutation.isPending || isResolvingVersionUrl) return;
    setSelectedMachine(null);
    setMultiDeployMachines([]);
  };

  const toggleMachineSelection = (machineCode: string) => {
    const machine = machines.find(item => item.machineCode === machineCode);
    if (machine && !isMachineOnline(machine)) {
      toast.error('Booth đang offline, không thể chọn.');
      return;
    }

    setSelectedMachineCodes(current => (
      current.includes(machineCode)
        ? current.filter(code => code !== machineCode)
        : [...current, machineCode]
    ));
  };

  const toggleAllFilteredMachines = () => {
    const filteredCodes = onlineFilteredMachines.map(machine => machine.machineCode);
    if (allFilteredSelected) {
      setSelectedMachineCodes(current => current.filter(code => !filteredCodes.includes(code)));
      return;
    }

    setSelectedMachineCodes(current => Array.from(new Set([...current, ...filteredCodes])));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    let normalizedUrl = downloadUrl.trim();
    const useVersionApi = panelMode === 'deploy' && taskType === 'update-version' && updateVersionMode === 'api';

    const targets = multiDeployMachines.length > 0 ? multiDeployMachines : selectedMachine ? [selectedMachine] : [];
    if (targets.length === 0) return;

    if (useVersionApi) {
      const versionId = Number(selectedUpdateVersionId);
      if (!Number.isFinite(versionId) || versionId <= 0) {
        setDeployError('Vui lòng chọn version cần update.');
        return;
      }

      try {
        setIsResolvingVersionUrl(true);
        const versionDetail = await remoteDeployService.getFileVersion(versionId);
        normalizedUrl = versionDetail.fileUrl?.trim() ?? '';
        if (versionDetail.fileType !== 2) {
          setDeployError('Version đã chọn không phải fileType 2.');
          return;
        }
      } catch (error) {
        setDeployError(getErrorMessage(error, 'Không thể lấy fileUrl của version đã chọn.'));
        return;
      } finally {
        setIsResolvingVersionUrl(false);
      }
    } else {
      if (!normalizedUrl) {
        setDeployError('DownloadUrl là bắt buộc.');
        return;
      }
      if (!isValidUrl(normalizedUrl)) {
        setDeployError('DownloadUrl phải là URL http/https hợp lệ.');
        return;
      }
    }

    if (!normalizedUrl || !isValidUrl(normalizedUrl)) {
      setDeployError('FileUrl từ version không hợp lệ.');
      return;
    }
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
      setDeployError('TimeoutSeconds phải lớn hơn 0.');
      return;
    }
    if (!Number.isFinite(waitTimeoutSeconds) || waitTimeoutSeconds <= 0) {
      setDeployError('WaitTimeoutSeconds phải lớn hơn 0.');
      return;
    }

    const body = {
      downloadUrl: normalizedUrl,
      waitForResult,
      waitTimeoutSeconds,
      timeoutSeconds,
      cleanTargetBeforeExtract,
    };

    if (targets.length > 1) {
      multiDeployMutation.mutate({
        targetMachines: targets,
        type: taskType,
        body,
      });
      return;
    }

    deployMutation.mutate({
      machineCode: targets[0].machineCode,
      type: taskType,
      body,
    });
  };

  const handlePowerShellSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMachine) return;

    if (!Number.isFinite(powerShellTimeoutSeconds) || powerShellTimeoutSeconds <= 0) {
      setDeployError('TimeoutSeconds phải lớn hơn 0.');
      return;
    }
    if (!Number.isFinite(waitTimeoutSeconds) || waitTimeoutSeconds <= 0) {
      setDeployError('WaitTimeoutSeconds phải lớn hơn 0.');
      return;
    }

    let environmentVariables: Record<string, string> | undefined;
    try {
      environmentVariables = parseEnvironmentVariables(powerShellEnvironmentText);
    } catch (error) {
      setDeployError(getErrorMessage(error, 'Environment variables không hợp lệ.'));
      return;
    }

    const commonBody = {
      workingDirectory: powerShellWorkingDirectory.trim() || undefined,
      environmentVariables: environmentVariables ?? null,
      timeoutSeconds: powerShellTimeoutSeconds,
      waitTimeoutSeconds,
      waitForResult,
    };

    if (powerShellMode === 'inline') {
      const script = powerShellScript.trim();
      if (!script) {
        setDeployError('Script là bắt buộc.');
        return;
      }

      powerShellMutation.mutate({
        machineCode: selectedMachine.machineCode,
        mode: powerShellMode,
        runAs: powerShellRunAs,
        body: {
          ...commonBody,
          script,
        },
      });
      return;
    }

    const scriptPath = powerShellScriptPath.trim();
    if (!scriptPath) {
      setDeployError('ScriptPath là bắt buộc.');
      return;
    }

    powerShellMutation.mutate({
      machineCode: selectedMachine.machineCode,
      mode: powerShellMode,
      runAs: powerShellRunAs,
      body: {
        ...commonBody,
        scriptPath,
        arguments: powerShellArguments.trim() || undefined,
      },
    });
  };

  const handleRefreshTransactions = () => {
    if (!selectedMachine) return;
    setDeployError('');
    transactionsMutation.mutate({ machineCode: selectedMachine.machineCode, waitSeconds: 60 });
  };

  const handlePrintSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMachine) return;

    const transactionId = selectedTransactionId.trim();
    if (!transactionId) {
      setDeployError('Vui lòng chọn giao dịch cần in.');
      return;
    }

    if (!Number.isFinite(printLayoutId) || printLayoutId < 0) {
      setDeployError('LayoutId phải lớn hơn hoặc bằng 0.');
      return;
    }

    if (!Number.isFinite(printNumberOfImage) || printNumberOfImage <= 0) {
      setDeployError('NumberOfImage phải lớn hơn 0.');
      return;
    }

    printImageMutation.mutate({
      machineCode: selectedMachine.machineCode,
      transactionId,
      layoutId: printLayoutId,
      numberOfImage: printNumberOfImage,
    });
  };

  const currentTaskId = getTaskId(deployResult);
  const resultStatus = deployResult?.completed?.status || deployResult?.state?.status || deployResult?.status;
  const resultPayload = deployResult?.completed || deployResult?.state || deployResult?.result || deployResult;

  const selectClass =
    'h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface cursor-pointer disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-on-surface-variant';
  const thClass = 'px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60';

  return (
    <div className="space-y-5 text-left animate-fadeIn">
      <PageHeader
        title="Điều khiển từ xa"
        icon={RadioTower}
        description="Theo dõi agent tại booth và gửi tác vụ từ xa."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setIsHistoryModalOpen(true);
                historyQuery.refetch();
              }}
              className="btn-secondary"
            >
              <History className="w-4 h-4" />
              Lịch sử tác vụ
            </button>
            <button
              type="button"
              onClick={openMultiDeployPanel}
              disabled={selectedMachines.length === 0}
              className="btn-primary"
            >
              <ClipboardList className="w-4 h-4" />
              Triển khai ({selectedMachines.length})
            </button>
          </>
        }
      />

      <FilterBar>
        <label className="relative block w-full sm:w-96">
          <span className="sr-only">Tìm booth</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            value={machineSearch}
            onChange={event => {
              setMachineSearch(event.target.value);
              setMachinePageIndex(1);
            }}
            placeholder="Tìm tên booth hoặc mã máy..."
            className="w-full h-9 pl-9 pr-9 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant"
          />
          {machineSearch && (
            <button
              type="button"
              onClick={() => {
                setMachineSearch('');
                setMachinePageIndex(1);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-2 inline-flex items-center justify-center"
              aria-label="Xóa tìm kiếm"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>
        <select
          value={storeFilter}
          onChange={event => {
            setStoreFilter(event.target.value);
            setMachinePageIndex(1);
          }}
          className={`${selectClass} w-full sm:w-60`}
          aria-label="Lọc booth theo cửa hàng"
        >
          <option value="">Tất cả cửa hàng</option>
          {storeOptions.map(store => (
            <option key={store.value} value={store.value}>
              {store.label}
            </option>
          ))}
        </select>
      </FilterBar>

      {selectedMachines.length > 0 && (
        <div className="bg-primary-subtle rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
          <span className="font-medium text-on-surface">Đã chọn {selectedMachines.length} booth để triển khai hàng loạt.</span>
          <button
            type="button"
            onClick={() => setSelectedMachineCodes([])}
            className="btn-ghost h-8 px-3"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      <div className="card-surface overflow-hidden">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant select-none">
                <th className={`${thClass} w-12`}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFilteredMachines}
                    disabled={onlineFilteredMachines.length === 0}
                    className="h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Chọn tất cả booth đang lọc"
                  />
                </th>
                <th className={thClass}>Mã máy</th>
                <th className={thClass}>Tên booth</th>
                <th className={thClass}>Phiên bản agent</th>
                <th className={thClass}>Kết nối lúc</th>
                <th className={thClass}>Connection ID</th>
                <th className={thClass}>Trạng thái</th>
                <th className={`${thClass} text-right w-56`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {machinesQuery.isLoading ? (
                <TableSkeletonRows rows={6} columns={8} />
              ) : machinesQuery.isError ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      compact
                      icon={AlertCircle}
                      title="Không thể tải danh sách booth"
                      description={getErrorMessage(machinesQuery.error, 'Vui lòng thử lại.')}
                    />
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      compact
                      icon={RadioTower}
                      title="Chưa có booth nào"
                      description="Hãy đồng bộ booth hoặc kiểm tra cấu hình agent."
                    />
                  </td>
                </tr>
              ) : filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      compact
                      icon={Search}
                      title="Không tìm thấy booth phù hợp"
                      description="Thử tìm theo tên booth, mã máy hoặc phiên bản agent."
                    />
                  </td>
                </tr>
              ) : (
                pagedMachines.map(machine => (
                  <tr key={machine.connectionId || machine.machineCode} className="hover:bg-surface-2/50 transition-colors group">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedMachineCodeSet.has(machine.machineCode)}
                        onChange={() => toggleMachineSelection(machine.machineCode)}
                        disabled={!isMachineOnline(machine)}
                        className="h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Chọn booth ${machine.machineCode}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-primary">{machine.machineCode}</td>
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {getMachineBoothName(machine) || <span className="text-on-surface-variant font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{machine.agentVersion || '—'}</td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">{getMachineLastSeenLabel(machine)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant max-w-[260px] truncate" title={machine.connectionId}>
                      {machine.connectionId}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getMachineStatusClass(machine)}`}>
                        {isMachineOnline(machine) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        {getMachineStatusLabel(machine)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value=""
                        onChange={event => {
                          handleMachineAction(machine, event.target.value);
                          event.currentTarget.value = '';
                        }}
                        disabled={!isMachineOnline(machine)}
                        className={`${selectClass} w-full`}
                        aria-label={`Chọn thao tác cho booth ${machine.machineCode}`}
                      >
                        <option value="">{isMachineOnline(machine) ? 'Chọn thao tác' : 'Booth offline'}</option>
                        <option value="deploy">Triển khai</option>
                        <option value="powershell">PowerShell</option>
                        <option value="update-agent">Cập nhật agent</option>
                        <option value="print">In ảnh</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-outline-variant bg-surface-2/60">
            <label className="flex items-center gap-2 text-sm font-medium text-on-surface">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAllFilteredMachines}
                disabled={onlineFilteredMachines.length === 0}
                className="h-5 w-5 accent-primary cursor-pointer disabled:cursor-not-allowed"
                aria-label="Chọn tất cả booth đang lọc"
              />
              Chọn tất cả
            </label>
            <span className="text-xs text-on-surface-variant">{filteredMachines.length}/{machines.length} booth</span>
          </div>

          {machinesQuery.isLoading ? (
            <div className="p-4 space-y-4" aria-busy="true" aria-label="Đang tải">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : machinesQuery.isError ? (
            <EmptyState
              compact
              icon={AlertCircle}
              title="Không thể tải danh sách booth"
              description={getErrorMessage(machinesQuery.error, 'Vui lòng thử lại.')}
            />
          ) : machines.length === 0 ? (
            <EmptyState
              compact
              icon={RadioTower}
              title="Chưa có booth nào"
              description="Hãy đồng bộ booth hoặc kiểm tra cấu hình agent."
            />
          ) : filteredMachines.length === 0 ? (
            <EmptyState
              compact
              icon={Search}
              title="Không tìm thấy booth phù hợp"
              description="Thử tìm theo tên booth, mã máy hoặc phiên bản agent."
            />
          ) : (
            <div className="divide-y divide-outline-variant">
              {pagedMachines.map(machine => (
                <article key={machine.connectionId || machine.machineCode} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedMachineCodeSet.has(machine.machineCode)}
                        onChange={() => toggleMachineSelection(machine.machineCode)}
                        disabled={!isMachineOnline(machine)}
                        className="h-5 w-5 mt-0.5 accent-primary cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Chọn booth ${machine.machineCode}`}
                      />
                      <span className="min-w-0">
                        <span className="block font-mono font-medium text-primary text-sm truncate">{machine.machineCode}</span>
                        <span className="block text-sm font-medium text-on-surface truncate">
                          {getMachineBoothName(machine) || '—'}
                        </span>
                      </span>
                    </label>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium text-xs shrink-0 ${getMachineStatusClass(machine)}`}>
                      {isMachineOnline(machine) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                      {getMachineStatusLabel(machine)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-surface-2 p-2 min-w-0">
                      <p className="text-on-surface-variant">Phiên bản</p>
                      <p className="font-mono font-medium text-on-surface truncate">{machine.agentVersion || '—'}</p>
                    </div>
                    <div className="rounded-lg bg-surface-2 p-2 min-w-0">
                      <p className="text-on-surface-variant">Kết nối lúc</p>
                      <p className="font-medium text-on-surface truncate">{getMachineLastSeenLabel(machine)}</p>
                    </div>
                  </div>

                  <select
                    value=""
                    onChange={event => {
                      handleMachineAction(machine, event.target.value);
                      event.currentTarget.value = '';
                    }}
                    disabled={!isMachineOnline(machine)}
                    className={`${selectClass} h-10 w-full`}
                    aria-label={`Chọn thao tác cho booth ${machine.machineCode}`}
                  >
                    <option value="">{isMachineOnline(machine) ? 'Chọn thao tác' : 'Booth offline'}</option>
                    <option value="deploy">Triển khai</option>
                    <option value="powershell">PowerShell</option>
                    <option value="update-agent">Cập nhật agent</option>
                    <option value="print">In ảnh</option>
                  </select>
                </article>
              ))}
            </div>
          )}
        </div>

        {!machinesQuery.isLoading && !machinesQuery.isError && filteredMachines.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-outline-variant px-4 py-3 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
            <span>
              {machinePageStart}–{machinePageEnd} / {filteredMachines.length} booth
              {onlineFilteredMachines.length !== filteredMachines.length
                ? ` · ${onlineFilteredMachines.length} đang online`
                : ''}
            </span>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setMachinePageIndex(page => Math.max(1, page - 1))}
                disabled={safeMachinePageIndex <= 1}
                className="h-8 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface hover:bg-surface-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Trang booth trước"
              >
                Trước
              </button>
              <span className="min-w-20 text-center tabular-nums">
                Trang {safeMachinePageIndex}/{machineTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setMachinePageIndex(page => Math.min(machineTotalPages, page + 1))}
                disabled={safeMachinePageIndex >= machineTotalPages}
                className="h-8 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface hover:bg-surface-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Trang booth sau"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/55 backdrop-blur-sm p-2 sm:p-6">
          <button
            type="button"
            aria-label="Đóng lịch sử tác vụ"
            onClick={() => setIsHistoryModalOpen(false)}
            className="absolute inset-0 cursor-default"
          />

          <section className="relative z-10 flex h-[92dvh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-elevated">
            <div className="flex flex-col gap-3 border-b border-outline-variant px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                  <History className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-on-surface">Lịch sử tác vụ</h3>
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    Ai đã chạy tác vụ gì, trên máy nào.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => historyQuery.refetch()}
                  disabled={historyQuery.isFetching}
                  className="btn-secondary h-9"
                >
                  <RefreshCw className={`h-4 w-4 ${historyQuery.isFetching ? 'animate-spin' : ''}`} />
                  Làm mới
                </button>
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[980px] text-left text-sm border-collapse">
                <thead className="sticky top-0 z-[1]">
                  <tr className="border-b border-outline-variant bg-surface">
                    <th className={thClass}>Thời gian</th>
                    <th className={thClass}>Người thao tác</th>
                    <th className={thClass}>Tác vụ</th>
                    <th className={thClass}>Máy / booth</th>
                    <th className={thClass}>Trạng thái</th>
                    <th className={thClass}>Task ID</th>
                    <th className={thClass}>Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {historyQuery.isLoading ? (
                    <TableSkeletonRows rows={8} columns={7} />
                  ) : historyQuery.isError ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          compact
                          icon={AlertCircle}
                          title="Không thể tải lịch sử tác vụ"
                          description={getErrorMessage(historyQuery.error, 'Vui lòng thử lại.')}
                        />
                      </td>
                    </tr>
                  ) : (historyQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState compact icon={History} title="Chưa có lịch sử tác vụ" />
                      </td>
                    </tr>
                  ) : (
                    (historyQuery.data ?? []).map(item => (
                      <tr key={item.id} className="hover:bg-surface-2/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant tabular-nums">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="block font-medium text-on-surface">{item.actorName || 'Không rõ'}</span>
                          {item.actorEmail && <span className="block text-xs text-on-surface-variant">{item.actorEmail}</span>}
                        </td>
                        <td className="px-4 py-3 font-medium text-on-surface">{getHistoryTaskLabel(item)}</td>
                        <td className="px-4 py-3">
                          <span className="block font-mono font-medium text-primary">{item.machineCode}</span>
                          <span className="block text-xs text-on-surface-variant">
                            {item.boothName || '—'}{item.storeName ? ` · ${item.storeName}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getHistoryStatusClass(item.status)}`}>
                            {item.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[180px] truncate font-mono text-[11px] text-on-surface-variant" title={item.taskId || ''}>
                          {item.taskId || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-[280px] truncate text-xs text-on-surface-variant" title={item.resultSummary || item.payloadJson}>
                          {item.resultSummary || item.payloadJson}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeMachines.length > 0 && (
        <div
          className={`fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex animate-fadeIn ${
            panelMode === 'powershell'
              ? 'items-center justify-center p-2 sm:p-6'
              : 'items-end sm:items-stretch sm:justify-end'
          }`}
        >
          <button
            type="button"
            aria-label="Đóng form deploy"
            onClick={closeDeployPanel}
            className={panelMode === 'powershell' ? 'absolute inset-0 cursor-default' : 'hidden sm:block flex-1 cursor-default'}
          />
          <aside
            className={
              panelMode === 'powershell'
                ? 'relative z-10 h-[92dvh] w-full max-w-6xl overflow-hidden rounded-xl border border-on-surface-variant/40 bg-on-surface text-surface shadow-elevated'
                : `bg-surface h-[92dvh] sm:h-full w-full shadow-elevated border-t sm:border-t-0 sm:border-l border-outline-variant overflow-y-auto rounded-t-2xl sm:rounded-none ${panelMode === 'print' ? 'sm:max-w-5xl' : 'sm:max-w-xl'}`
            }
          >
            {panelMode === 'powershell' ? (
              <div className="bg-on-surface border-b border-surface/15">
                <div className="flex h-11 items-center justify-between gap-3 px-3">
                  <div className="flex h-8 min-w-0 items-center gap-2 rounded-t-md bg-surface/10 px-3 text-surface">
                    <Terminal className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-mono text-xs font-medium">
                      PowerShell · {isMultiDeploy ? `${activeMachines.length} booth` : activeMachines[0].machineCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={closeDeployPanel}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-surface/70 hover:bg-error hover:text-on-primary transition-colors cursor-pointer"
                    aria-label="Đóng"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
            <div className="sticky top-0 bg-surface border-b border-outline-variant p-4 sm:p-5 flex items-start justify-between gap-4 z-20">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-on-surface truncate">
                  {panelMode === 'deploy' ? 'Triển khai tới' : 'In ảnh tại'}{' '}
                  {isMultiDeploy ? `${activeMachines.length} booth` : activeMachines[0].machineCode}
                </h3>
                <p className="text-sm text-on-surface-variant mt-0.5 line-clamp-2">
                  {isMultiDeploy
                    ? activeMachines.map(machine => getMachineBoothName(machine) || machine.machineCode).join(', ')
                    : `Agent ${activeMachines[0].agentVersion || 'N/A'} · ${formatDateTime(activeMachines[0].connectedAt)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeployPanel}
                className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
                aria-label="Đóng"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            )}

            <form
              onSubmit={panelMode === 'deploy' ? handleSubmit : panelMode === 'powershell' ? handlePowerShellSubmit : handlePrintSubmit}
              className={
                panelMode === 'powershell'
                  ? 'flex h-[calc(92dvh-45px)] flex-col gap-4 overflow-y-auto bg-on-surface p-3 sm:p-4 pb-0 text-sm text-surface'
                  : 'p-4 sm:p-5 pb-6 space-y-5 text-sm'
              }
            >
              {panelMode !== 'powershell' && (
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode('deploy');
                    setDeployError('');
                    setDeployResult(null);
                  }}
                  className={`h-9 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    panelMode === 'deploy' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Triển khai
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isMultiDeploy) return;
                    setPanelMode('powershell');
                    setDeployError('');
                    setDeployResult(null);
                  }}
                  disabled={isMultiDeploy}
                  className={`h-9 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-on-surface-variant hover:text-on-surface ${
                    isMultiDeploy ? 'opacity-40 cursor-not-allowed hover:text-on-surface-variant' : ''
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  PowerShell
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isMultiDeploy) return;
                    setPanelMode('print');
                    setDeployError('');
                    setDeployResult(null);
                    if (selectedMachine && transactions.length === 0) {
                      transactionsMutation.mutate({ machineCode: selectedMachine.machineCode, waitSeconds: 60 });
                    }
                  }}
                  disabled={isMultiDeploy}
                  className={`h-9 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    panelMode === 'print' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  } ${isMultiDeploy ? 'opacity-40 cursor-not-allowed hover:text-on-surface-variant' : ''
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  In ảnh
                </button>
              </div>
              )}

              {panelMode === 'deploy' ? (
              <>
                {isMultiDeploy && (
                  <div className="rounded-xl bg-surface-2 p-3">
                    <p className="text-xs font-medium text-on-surface-variant mb-2">Triển khai tới ({activeMachines.length} booth)</p>
                    <div className="flex flex-wrap gap-2">
                      {activeMachines.map(machine => (
                        <span key={machine.machineCode} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-outline-variant text-xs text-on-surface-variant">
                          <span className="font-mono text-primary">{machine.machineCode}</span>
                          {getMachineBoothName(machine) && <span className="text-on-surface-variant">· {getMachineBoothName(machine)}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Loại tác vụ</label>
                <select
                  value={taskType}
                  onChange={event => {
                    const nextTaskType = event.target.value as RemoteDeployTaskType;
                    setTaskType(nextTaskType);
                    setDeployError('');
                    if (nextTaskType !== 'update-version') {
                      setUpdateVersionMode('manual');
                      setSelectedUpdateVersionId('');
                    } else {
                      setUpdateVersionMode('api');
                    }
                  }}
                  className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant"
                >
                  {taskOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {taskType === 'update-version' && (
                <div className="rounded-xl bg-surface-2 p-3 space-y-3">
                  <div className="inline-flex rounded-lg border border-outline-variant bg-surface p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUpdateVersionMode('api');
                        setDeployError('');
                      }}
                      className={`h-8 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        updateVersionMode === 'api' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-2'
                      }`}
                    >
                      Chọn phiên bản
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUpdateVersionMode('manual');
                        setDeployError('');
                      }}
                      className={`h-8 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        updateVersionMode === 'manual' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-2'
                      }`}
                    >
                      Thủ công
                    </button>
                  </div>

                  {updateVersionMode === 'api' && (
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-1.5">Phiên bản <span className="text-error">*</span></label>
                      <select
                        required
                        value={selectedUpdateVersionId}
                        onChange={event => {
                          setSelectedUpdateVersionId(event.target.value);
                          setDeployError('');
                        }}
                        disabled={updateVersionsQuery.isLoading}
                        className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant"
                      >
                        <option value="">
                          {updateVersionsQuery.isLoading ? 'Đang tải phiên bản...' : 'Chọn phiên bản'}
                        </option>
                        {(updateVersionsQuery.data ?? []).map(version => (
                          <option key={version.id} value={version.id}>
                            {version.version} - {version.name}
                          </option>
                        ))}
                      </select>
                      {updateVersionsQuery.isError && (
                        <p className="mt-1.5 text-[11px] font-medium text-error">Không thể tải danh sách phiên bản từ FunStudio.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(taskType !== 'update-version' || updateVersionMode === 'manual') && (
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">
                    {taskType === 'update-version' ? 'Download URL (thủ công)' : 'Download URL'} <span className="text-error">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://domain/file.zip"
                    value={downloadUrl}
                    onChange={event => {
                      setDownloadUrl(event.target.value);
                      setDeployError('');
                    }}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-xs text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant font-mono"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 min-h-10 text-sm text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={waitForResult}
                  onChange={event => setWaitForResult(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Chờ kết quả
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Timeout (giây)</label>
                  <input
                    type="number"
                    min={1}
                    value={timeoutSeconds}
                    onChange={event => setTimeoutSeconds(Number(event.target.value))}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Thời gian chờ kết quả (giây)</label>
                  <input
                    type="number"
                    min={1}
                    value={waitTimeoutSeconds}
                    onChange={event => setWaitTimeoutSeconds(Number(event.target.value))}
                    disabled={!waitForResult}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 min-h-10 text-sm text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanTargetBeforeExtract}
                  onChange={event => setCleanTargetBeforeExtract(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Xóa thư mục đích trước khi giải nén
              </label>
              </>
              ) : panelMode === 'powershell' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-surface/70">
                    Kiểu chạy
                    <select
                      value={powerShellMode}
                      onChange={event => setPowerShellMode(event.target.value as RemotePowerShellMode)}
                      className="mt-1.5 w-full h-10 px-3 rounded-lg border border-surface/20 bg-on-surface text-xs text-surface placeholder:text-surface/40 disabled:opacity-50"
                    >
                      <option value="inline">Lệnh trực tiếp</option>
                      <option value="file">File .ps1</option>
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-surface/70">
                    Chạy với quyền
                    <select
                      value={powerShellRunAs}
                      onChange={event => setPowerShellRunAs(event.target.value as RemotePowerShellRunAs)}
                      className="mt-1.5 w-full h-10 px-3 rounded-lg border border-surface/20 bg-on-surface text-xs text-surface placeholder:text-surface/40 disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </label>
                </div>

                {powerShellMode === 'inline' ? (
                  <label className="block text-xs font-medium text-surface/70">
                    Lệnh
                    <textarea
                      required
                      value={powerShellScript}
                      onChange={event => {
                        setPowerShellScript(event.target.value);
                        setDeployError('');
                      }}
                      className="mt-1.5 min-h-72 w-full resize-y rounded-lg border border-surface/20 bg-on-surface px-3 py-2 font-mono text-xs leading-relaxed text-surface placeholder:text-surface/40"
                      spellCheck={false}
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-surface/70">
                      Đường dẫn script
                      <input
                        required
                        placeholder="D:\\FunStudio\\scripts\\test.ps1"
                        value={powerShellScriptPath}
                        onChange={event => {
                          setPowerShellScriptPath(event.target.value);
                          setDeployError('');
                        }}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-surface/20 bg-on-surface text-xs text-surface placeholder:text-surface/40 disabled:opacity-50 font-mono"
                      />
                    </label>
                    <label className="block text-xs font-medium text-surface/70">
                      Tham số
                      <input
                        placeholder="-Name booth01"
                        value={powerShellArguments}
                        onChange={event => setPowerShellArguments(event.target.value)}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-surface/20 bg-on-surface text-xs text-surface placeholder:text-surface/40 disabled:opacity-50 font-mono"
                      />
                    </label>
                  </div>
                )}

                <label className="block text-xs font-medium text-surface/70">
                  Thư mục làm việc
                  <input
                    placeholder="D:\\FunStudio"
                    value={powerShellWorkingDirectory}
                    onChange={event => setPowerShellWorkingDirectory(event.target.value)}
                    className="mt-1.5 w-full h-10 px-3 rounded-lg border border-surface/20 bg-on-surface text-xs text-surface placeholder:text-surface/40 disabled:opacity-50 font-mono"
                  />
                </label>

                <label className="block text-xs font-medium text-surface/70">
                  Biến môi trường
                  <textarea
                    placeholder={'KEY=VALUE\nTEST=123'}
                    value={powerShellEnvironmentText}
                    onChange={event => {
                      setPowerShellEnvironmentText(event.target.value);
                      setDeployError('');
                    }}
                    className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-surface/20 bg-on-surface px-3 py-2 font-mono text-xs text-surface placeholder:text-surface/40"
                    spellCheck={false}
                  />
                </label>

                <label className="flex items-center gap-2 min-h-10 text-sm text-surface/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waitForResult}
                    onChange={event => setWaitForResult(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Chờ kết quả
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-surface/70 mb-1.5">Timeout (giây)</label>
                    <input
                      type="number"
                      min={1}
                      value={powerShellTimeoutSeconds}
                      onChange={event => setPowerShellTimeoutSeconds(Number(event.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-surface/20 bg-on-surface text-xs text-surface placeholder:text-surface/40 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface/70 mb-1.5">Thời gian chờ kết quả (giây)</label>
                    <input
                      type="number"
                      min={1}
                      value={waitTimeoutSeconds}
                      onChange={event => setWaitTimeoutSeconds(Number(event.target.value))}
                      disabled={!waitForResult}
                      className="w-full h-10 px-3 rounded-lg border border-surface/20 bg-on-surface text-xs text-surface placeholder:text-surface/40 disabled:opacity-50"
                    />
                  </div>
                </div>
              </>
              ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-1.5">Layout ID</label>
                      <input
                        type="number"
                        min={0}
                        value={printLayoutId}
                        onChange={event => setPrintLayoutId(Number(event.target.value))}
                        className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-1.5">Số ảnh</label>
                      <input
                        type="number"
                        min={1}
                        value={printNumberOfImage}
                        onChange={event => setPrintNumberOfImage(Number(event.target.value))}
                        className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshTransactions}
                    disabled={transactionsMutation.isPending}
                    className="btn-secondary"
                  >
                    {transactionsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Tải lại giao dịch
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Code giao dịch</label>
                  <select
                    value={selectedTransactionId}
                    onChange={event => {
                      const nextTransactionId = event.target.value;
                      const nextTransaction = transactions.find(item => item.transactionId === nextTransactionId);
                      setSelectedTransactionId(nextTransactionId);
                      applyPrintDefaultsFromTransaction(nextTransaction, setPrintLayoutId, setPrintNumberOfImage);
                    }}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-xs text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant font-mono"
                  >
                    <option value="">Chọn code giao dịch</option>
                    {transactions.map(item => (
                      <option key={item.transactionId || item.code || JSON.stringify(item.values)} value={item.transactionId}>
                        {getTransactionLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border border-outline-variant rounded-xl overflow-hidden">
                  <div className="bg-surface-2/60 border-b border-outline-variant px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-on-surface">Danh sách giao dịch</p>
                      <p className="text-[11px] text-on-surface-variant">{transactions.length} giao dịch từ booth</p>
                    </div>
                    {transactionsMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />}
                  </div>
                  <div className="max-h-[420px] overflow-auto">
                    {transactionsMutation.isPending ? (
                      <div className="p-4 space-y-3" aria-busy="true" aria-label="Đang tải giao dịch">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Skeleton key={index} className="h-8 w-full" />
                        ))}
                      </div>
                    ) : transactions.length === 0 ? (
                      <EmptyState compact icon={Images} title="Chưa có giao dịch" description="Nhấn Tải lại giao dịch để lấy dữ liệu từ booth." />
                    ) : (
                      <>
                        <div className="sm:hidden divide-y divide-outline-variant">
                          {transactions.map(item => {
                            const selected = selectedTransactionId === item.transactionId;
                            return (
                              <button
                                type="button"
                                key={item.transactionId || item.code}
                                onClick={() => {
                                  setSelectedTransactionId(item.transactionId);
                                  applyPrintDefaultsFromTransaction(item, setPrintLayoutId, setPrintNumberOfImage);
                                }}
                                className={`w-full text-left p-3 space-y-2 ${selected ? 'bg-secondary-container' : 'bg-surface hover:bg-surface-2'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <span className="font-mono font-medium text-primary text-xs break-all">{item.code || item.transactionId}</span>
                                  {selected && (
                                    <span className="shrink-0 rounded-full bg-primary text-on-primary px-2 py-0.5 text-[11px] font-medium">Đang chọn</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant">
                                  <span>
                                    <span className="block text-on-surface-variant">Layout</span>
                                    <span className="font-medium text-on-surface">{formatCellValue(getTransactionValue(item, 'LayoutId')) || '—'}</span>
                                  </span>
                                  <span>
                                    <span className="block text-on-surface-variant">Số ảnh</span>
                                    <span className="font-medium text-on-surface">{formatCellValue(getTransactionValue(item, 'PrintNumber')) || '—'}</span>
                                  </span>
                                  <span className="col-span-2">
                                    <span className="block text-on-surface-variant">Thời gian</span>
                                    <span className="font-medium text-on-surface">{formatCellValue(getTransactionValue(item, 'RecordAt') ?? getTransactionValue(item, 'CreatedTime')) || '—'}</span>
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <table className="hidden sm:table w-max min-w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-surface-2 text-on-surface-variant font-medium sticky top-0 z-10">
                              <th className="py-2.5 px-3 border-b border-r border-outline-variant whitespace-nowrap">Code</th>
                              {transactionColumns.map(column => (
                                <th key={column} className="py-2.5 px-3 border-b border-r border-outline-variant whitespace-nowrap">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.map((item, index) => (
                              <tr
                                key={`${item.transactionId || item.code}-${index}`}
                                onClick={() => {
                                  setSelectedTransactionId(item.transactionId);
                                  applyPrintDefaultsFromTransaction(item, setPrintLayoutId, setPrintNumberOfImage);
                                }}
                                className={`cursor-pointer hover:bg-surface-2 ${selectedTransactionId === item.transactionId ? 'bg-secondary-container' : ''}`}
                              >
                                <td className="py-2 px-3 border-b border-r border-outline-variant font-mono font-medium text-primary whitespace-nowrap">
                                  {item.code || item.transactionId}
                                </td>
                                {transactionColumns.map(column => (
                                  <td
                                    key={column}
                                    className="py-2 px-3 border-b border-r border-outline-variant max-w-[260px] truncate whitespace-nowrap"
                                    title={formatCellValue(item.values?.[column])}
                                  >
                                    {formatTableCellValue(item.values?.[column])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                </div>
              </>
              )}

              {deployError && (
                <div className="rounded-xl border border-error/30 bg-error-container p-3 text-sm text-on-error-container flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deployError}</span>
                </div>
              )}

              <div
                className={
                  panelMode === 'powershell'
                    ? 'sticky bottom-0 -mx-3 sm:-mx-4 mt-auto border-t border-surface/15 bg-on-surface/95 px-3 py-3 backdrop-blur sm:px-4 z-10'
                    : 'sticky bottom-0 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 bg-surface/95 backdrop-blur border-t border-outline-variant z-10'
                }
              >
                <button
                  type="submit"
                  disabled={deployMutation.isPending || multiDeployMutation.isPending || powerShellMutation.isPending || transactionsMutation.isPending || printImageMutation.isPending || isResolvingVersionUrl}
                  className={
                    panelMode === 'powershell'
                      ? 'w-full h-11 px-5 rounded-lg bg-success text-on-primary font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-[filter] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed'
                      : 'btn-primary w-full h-11'
                  }
                >
                  {deployMutation.isPending || multiDeployMutation.isPending || powerShellMutation.isPending || printImageMutation.isPending || isResolvingVersionUrl ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : panelMode === 'deploy' ? (
                    <ClipboardList className="w-4 h-4" />
                  ) : panelMode === 'print' ? (
                    <Printer className="w-4 h-4" />
                  ) : powerShellMode === 'inline' ? (
                    <Terminal className="w-4 h-4" />
                  ) : (
                    <FileCode2 className="w-4 h-4" />
                  )}
                  {deployMutation.isPending || multiDeployMutation.isPending || powerShellMutation.isPending || printImageMutation.isPending || isResolvingVersionUrl
                    ? isResolvingVersionUrl ? 'Đang lấy file...' : 'Đang gửi...'
                    : panelMode === 'deploy'
                      ? isMultiDeploy
                        ? `Triển khai ${activeMachines.length} booth`
                        : `Gửi: ${endpointLabels[taskType]}`
                      : panelMode === 'print'
                        ? 'In ảnh'
                        : `Chạy PowerShell (${powerShellRunAs === 'admin' ? 'Admin' : 'User'})`}
                </button>
              </div>

              {multiDeployResults.length > 0 && (
                <div className="border border-outline-variant rounded-xl overflow-hidden">
                  <div className="bg-surface-2/60 border-b border-outline-variant px-4 py-3">
                    <p className="font-semibold text-on-surface">Kết quả triển khai</p>
                    <p className="text-[11px] text-on-surface-variant">
                      Thành công {multiDeployResults.filter(result => result.ok).length}/{multiDeployResults.length} booth
                    </p>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full min-w-[620px] text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-surface-2 text-on-surface-variant font-medium sticky top-0 z-10">
                          <th className="py-2.5 px-3 border-b border-r border-outline-variant">Mã máy</th>
                          <th className="py-2.5 px-3 border-b border-r border-outline-variant">Tên booth</th>
                          <th className="py-2.5 px-3 border-b border-r border-outline-variant">Trạng thái</th>
                          <th className="py-2.5 px-3 border-b border-r border-outline-variant">Task ID / lỗi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {multiDeployResults.map(result => (
                          <tr key={result.machineCode} className={result.ok ? 'bg-success-container/40' : 'bg-error-container/40'}>
                            <td className="py-2 px-3 border-b border-r border-outline-variant font-mono font-medium text-primary">{result.machineCode}</td>
                            <td className="py-2 px-3 border-b border-r border-outline-variant text-on-surface-variant">{result.boothName || '—'}</td>
                            <td className="py-2 px-3 border-b border-r border-outline-variant">
                              <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${result.ok ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'}`}>
                                {result.ok ? (result.response?.completed?.status || result.response?.status || 'SENT') : 'FAILED'}
                              </span>
                            </td>
                            <td className="py-2 px-3 border-b border-r border-outline-variant font-mono text-on-surface-variant">
                              {result.ok ? getTaskId(result.response) || result.response?.message || 'N/A' : result.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {deployResult && (
                <div className="border border-outline-variant rounded-xl overflow-hidden">
                  <div className="bg-surface-2/60 border-b border-outline-variant px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-on-surface">Kết quả tác vụ</p>
                      <p className="text-[11px] text-on-surface-variant font-mono">
                        {currentTaskId || 'Không có task ID'}
                        {deployResult.taskType ? ` · ${deployResult.taskType}` : ''}
                      </p>
                    </div>
                    {currentTaskId && (
                      <button
                        type="button"
                        onClick={() => taskStatusMutation.mutate(currentTaskId)}
                        disabled={taskStatusMutation.isPending}
                        className="h-8 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface hover:bg-surface-2 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {taskStatusMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SearchCheck className="w-3.5 h-3.5" />}
                        Kiểm tra
                      </button>
                    )}
                  </div>
                  <dl className="p-4 space-y-3 text-xs">
                    <div>
                      <dt className="font-medium text-on-surface-variant">Trạng thái</dt>
                      <dd className="mt-1 font-semibold text-on-surface">{resultStatus ? String(resultStatus) : 'N/A'}</dd>
                    </div>
                    {deployResult.message && (
                      <div>
                        <dt className="font-medium text-on-surface-variant">Thông báo</dt>
                        <dd className="mt-1 font-semibold text-on-surface">{deployResult.message}</dd>
                      </div>
                    )}
                    {deployResult.completed?.exitCode !== undefined && (
                      <div>
                        <dt className="font-medium text-on-surface-variant">Exit code</dt>
                        <dd className="mt-1 font-mono font-semibold text-on-surface">{deployResult.completed.exitCode}</dd>
                      </div>
                    )}
                    {deployResult.completed?.stdOut && (
                      <div>
                        <dt className="font-medium text-on-surface-variant">StdOut</dt>
                        <dd className="mt-1">
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words bg-surface-2 border border-outline-variant rounded-lg p-3 text-[11px] text-on-surface">
                            {deployResult.completed.stdOut}
                          </pre>
                        </dd>
                      </div>
                    )}
                    {deployResult.completed?.stdErr && (
                      <div>
                        <dt className="font-medium text-on-surface-variant">StdErr</dt>
                        <dd className="mt-1">
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words bg-error-container border border-error/20 rounded-lg p-3 text-[11px] text-on-error-container">
                            {deployResult.completed.stdErr}
                          </pre>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-medium text-on-surface-variant">Mã máy</dt>
                      <dd className="mt-1 font-mono font-semibold text-on-surface">{deployResult.machineCode || deployResult.state?.machineCode || activeMachines[0]?.machineCode}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-on-surface-variant">Dữ liệu gốc</dt>
                      <dd className="mt-1">
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words bg-surface-2 border border-outline-variant rounded-lg p-3 text-[11px] text-on-surface">
                          {JSON.stringify(resultPayload, null, 2)}
                        </pre>
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
