import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ClipboardList, FileCode2, Images, Loader2, Play, Printer, RefreshCw, RadioTower, Search, SearchCheck, Terminal, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  RemoteDeployRequest,
  RemoteDeployResponse,
  RemoteDeployTaskType,
  RemoteMachine,
  RemotePowerShellMode,
  RemotePowerShellRunAs,
  RemoteTransactionListItem,
  remoteDeployService,
} from '../../../services/api/remoteDeployService';
import { boothsService } from '../../../services/api/boothsService';

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
  { value: 'update-version', label: 'Update Version' },
  { value: 'fs-async-transaction', label: 'Deploy FSAsyncTransaction' },
  { value: 'fs-update-sync', label: 'Deploy FSUpdateSync' },
  { value: 'app-form', label: 'Deploy AppForm' },
];

const updateAgentServiceScript = `# Link GitHub Release
$url = "https://github.com/trankien27/fun-agent/releases/download/Fun-agent/agent.zip"

# Duong dan luu file tai ve
$downloadPath = "D:\\FunStudio\\agent.zip"

# Thu muc giai nen
$extractPath = "D:\\FunStudio\\agent"

# Ten service
$serviceName = "FunStudioWindowsMaintenanceAgent"

Write-Host "Dang tai agent.zip..."
curl.exe -L $url -o $downloadPath

Write-Host "Dang dung service $serviceName..."
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue

if (!(Test-Path $extractPath)) {
    New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
}

Write-Host "Dang xoa file cu trong folder agent..."
Get-ChildItem -Path $extractPath -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

Write-Host "Dang giai nen agent.zip..."
Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force

Write-Host "Dang chay lai service $serviceName..."
Start-Service -Name $serviceName

Write-Host "Hoan tat update agent."`;

const endpointLabels: Record<RemoteDeployTaskType, string> = {
  'update-version': 'Update Version',
  'fs-async-transaction': 'FSAsyncTransaction',
  'fs-update-sync': 'FSUpdateSync',
  'app-form': 'AppForm',
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

  const boothsByCode = useMemo(() => {
    const map = new Map<string, string>();
    (boothsQuery.data ?? []).forEach(booth => {
      if (booth.id) map.set(String(booth.id).toLowerCase(), booth.name);
      if (booth.code) map.set(String(booth.code).toLowerCase(), booth.name);
      if (booth.ultraviewId) map.set(String(booth.ultraviewId).toLowerCase(), booth.name);
    });
    return map;
  }, [boothsQuery.data]);

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
  const getMachineBoothName = (machine: RemoteMachine) => boothsByCode.get(machine.machineCode.toLowerCase()) || '';
  const getMachineBooth = (machine: RemoteMachine) => boothsByMachineCode.get(machine.machineCode.toLowerCase());
  const filteredMachines = useMemo(() => {
    const keyword = machineSearch.trim().toLowerCase();

    return machines.filter(machine => {
      const booth = getMachineBooth(machine);
      if (storeFilter) {
        const boothStore = booth?.storeId ?? booth?.relatedStores ?? '';
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
  const selectedMachineCodeSet = useMemo(() => new Set(selectedMachineCodes), [selectedMachineCodes]);
  const selectedMachines = useMemo(
    () => machines.filter(machine => selectedMachineCodeSet.has(machine.machineCode)),
    [machines, selectedMachineCodeSet],
  );
  const allFilteredSelected = filteredMachines.length > 0
    && filteredMachines.every(machine => selectedMachineCodeSet.has(machine.machineCode));
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
      toast.success('Đã gửi task deploy.');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể gửi task deploy.');
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
              error: getErrorMessage(error, 'Không thể gửi task deploy.'),
            } satisfies MultiDeployResult;
          }
        }),
      );
    },
    onSuccess: results => {
      setMultiDeployResults(results);
      setDeployResult(null);
      setDeployError('');
      const okCount = results.filter(result => result.ok).length;
      toast.success(`Đã gửi deploy tới ${okCount}/${results.length} booth.`);
    },
    onError: error => {
      const message = getErrorMessage(error, 'Không thể gửi multi deploy.');
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
      toast.success('Đã gửi task PowerShell.');
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
      toast.success('Đã tải trạng thái task.');
    },
    onError: error => {
      toast.error(getErrorMessage(error, 'Không thể kiểm tra trạng thái task.'));
    },
  });

  const syncBoothsMutation = useMutation({
    mutationFn: boothsService.syncBooths,
    onSuccess: result => {
      boothsQuery.refetch();
      machinesQuery.refetch();
      toast.success(`Đã sync booth: +${result.added}, cập nhật ${result.updated}, xóa ${result.deleted}.`);
    },
    onError: error => {
      toast.error(getErrorMessage(error, 'Không thể sync booth.'));
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

  const openUpdateAgentServiceTask = (machine: RemoteMachine) => {
    setSelectedMachine(machine);
    setMultiDeployMachines([]);
    setPanelMode('powershell');
    resetDeployForm();
    resetPrintForm();
    setPowerShellMode('inline');
    setPowerShellRunAs('admin');
    setPowerShellScript(updateAgentServiceScript);
    setPowerShellScriptPath('');
    setPowerShellArguments('');
    setPowerShellWorkingDirectory('');
    setPowerShellEnvironmentText('TASK_NAME=update agent service');
    setPowerShellTimeoutSeconds(600);
    setWaitForResult(true);
    setWaitTimeoutSeconds(900);
    setDeployResult(null);
    setDeployError('');
  };

  const handleMachineAction = (machine: RemoteMachine, action: string) => {
    if (!action) return;

    if (action === 'deploy') {
      openRemotePanel(machine, 'deploy');
      return;
    }

    if (action === 'powershell') {
      openRemotePanel(machine, 'powershell');
      return;
    }

    if (action === 'update-agent') {
      openUpdateAgentServiceTask(machine);
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
    setSelectedMachineCodes(current => (
      current.includes(machineCode)
        ? current.filter(code => code !== machineCode)
        : [...current, machineCode]
    ));
  };

  const toggleAllFilteredMachines = () => {
    const filteredCodes = filteredMachines.map(machine => machine.machineCode);
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

  return (
    <div className="space-y-5 sm:space-y-6 text-left animate-fadeIn">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Remote Booth</h2>
          <p className="text-xs text-gray-500 mt-1">Theo dõi agent booth đang online và gửi gói deploy từ xa.</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(260px,420px)_minmax(180px,240px)]">
            <label className="relative block w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={machineSearch}
                onChange={event => setMachineSearch(event.target.value)}
                placeholder="Tìm tên booth hoặc mã booth..."
                className="w-full h-11 sm:h-10 pl-9 pr-9 border border-outline-variant rounded-lg focus:outline-[#004ac6] text-sm sm:text-xs font-medium"
              />
              {machineSearch && (
                <button
                  type="button"
                  onClick={() => setMachineSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-6 sm:w-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 inline-flex items-center justify-center"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>
            <select
              value={storeFilter}
              onChange={event => setStoreFilter(event.target.value)}
              className="h-11 sm:h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm sm:text-xs font-bold text-gray-700 focus:outline-primary cursor-pointer"
            >
              <option value="">Tất cả store</option>
              {storeOptions.map(store => (
                <option key={store.value} value={store.value}>
                  {store.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => syncBoothsMutation.mutate()}
              disabled={syncBoothsMutation.isPending}
              className="h-11 sm:h-10 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 rounded-lg text-sm sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncBoothsMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Booth
            </button>
            <button
              type="button"
              onClick={openMultiDeployPanel}
              disabled={selectedMachines.length === 0}
              className="h-11 sm:h-10 bg-primary text-white hover:bg-primary-container px-4 rounded-lg text-sm sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardList className="w-4 h-4" />
              Deploy ({selectedMachines.length})
            </button>
          </div>
        </div>
      </div>

      {selectedMachines.length > 0 && (
        <div className="bg-[#f3f3fe] border border-outline-variant rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="font-bold text-gray-700">Đã chọn {selectedMachines.length} booth để multi deploy.</span>
          <button
            type="button"
            onClick={() => setSelectedMachineCodes([])}
            className="text-gray-500 hover:text-gray-800 font-bold cursor-pointer"
          >
            Bỏ chọn tất cả
          </button>
        </div>
      )}

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 font-bold select-none font-sans">
                <th className="py-4 px-5 w-12">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFilteredMachines}
                    disabled={filteredMachines.length === 0}
                    className="h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Chọn tất cả booth đang lọc"
                  />
                </th>
                <th className="py-4 px-5">MachineCode</th>
                <th className="py-4 px-5">Tên Booth</th>
                <th className="py-4 px-5">AgentVersion</th>
                <th className="py-4 px-5">ConnectedAt</th>
                <th className="py-4 px-5">ConnectionId</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right w-64">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {machinesQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center font-sans font-bold text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Đang tải danh sách Booth Agent...
                  </td>
                </tr>
              ) : machinesQuery.isError ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center font-sans font-bold text-red-500">
                    <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                    {getErrorMessage(machinesQuery.error, 'Không thể tải danh sách Booth Agent.')}
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <RadioTower className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <p className="font-bold text-gray-700">Chưa có Booth Agent online.</p>
                    <p className="text-xs text-gray-400 mt-1">Kiểm tra agent tại booth hoặc bấm Refresh để tải lại trạng thái kết nối.</p>
                  </td>
                </tr>
              ) : filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <p className="font-bold text-gray-700">Không tìm thấy booth phù hợp.</p>
                    <p className="text-xs text-gray-400 mt-1">Thử tìm theo tên booth, MachineCode hoặc phiên bản agent.</p>
                  </td>
                </tr>
              ) : (
                filteredMachines.map(machine => (
                  <tr key={machine.connectionId || machine.machineCode} className="hover:bg-[#faf8ff] transition-colors group">
                    <td className="py-4 px-5">
                      <input
                        type="checkbox"
                        checked={selectedMachineCodeSet.has(machine.machineCode)}
                        onChange={() => toggleMachineSelection(machine.machineCode)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                        aria-label={`Chọn booth ${machine.machineCode}`}
                      />
                    </td>
                    <td className="py-4 px-5 font-mono font-bold text-[#004ac6] text-sm">{machine.machineCode}</td>
                    <td className="py-4 px-5 font-semibold text-gray-800">
                      {getMachineBoothName(machine) || <span className="text-gray-400 font-medium">N/A</span>}
                    </td>
                    <td className="py-4 px-5 font-mono text-gray-700">{machine.agentVersion || 'N/A'}</td>
                    <td className="py-4 px-5 text-gray-600 font-medium">{formatDateTime(machine.connectedAt)}</td>
                    <td className="py-4 px-5 font-mono text-[11px] text-gray-500 max-w-[280px] truncate" title={machine.connectionId}>
                      {machine.connectionId}
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {machine.status || 'Online'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <select
                        value=""
                        onChange={event => {
                          handleMachineAction(machine, event.target.value);
                          event.currentTarget.value = '';
                        }}
                        className="h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-xs font-bold text-gray-700 focus:outline-primary cursor-pointer"
                        aria-label={`Chọn thao tác cho booth ${machine.machineCode}`}
                      >
                        <option value="">Chọn thao tác</option>
                        <option value="deploy">Deploy</option>
                        <option value="powershell">PowerShell</option>
                        <option value="update-agent">Update Agent Service</option>
                        <option value="print">Print Image</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-outline-variant bg-gray-50">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAllFilteredMachines}
                disabled={filteredMachines.length === 0}
                className="h-5 w-5 accent-primary cursor-pointer disabled:cursor-not-allowed"
                aria-label="Chọn tất cả booth đang lọc"
              />
              Chọn tất cả
            </label>
            <span className="text-xs font-bold text-gray-500">{filteredMachines.length}/{machines.length} booth</span>
          </div>

          {machinesQuery.isLoading ? (
            <div className="py-10 text-center font-sans font-bold text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Đang tải danh sách Booth Agent...
            </div>
          ) : machinesQuery.isError ? (
            <div className="py-10 text-center font-sans font-bold text-red-500 px-4">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              {getErrorMessage(machinesQuery.error, 'Không thể tải danh sách Booth Agent.')}
            </div>
          ) : machines.length === 0 ? (
            <div className="py-12 text-center px-4">
              <RadioTower className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="font-bold text-gray-700">Chưa có Booth Agent online.</p>
              <p className="text-xs text-gray-400 mt-1">Kiểm tra agent tại booth hoặc bấm Refresh để tải lại trạng thái kết nối.</p>
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="py-12 text-center px-4">
              <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="font-bold text-gray-700">Không tìm thấy booth phù hợp.</p>
              <p className="text-xs text-gray-400 mt-1">Thử tìm theo tên booth, MachineCode hoặc phiên bản agent.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {filteredMachines.map(machine => (
                <article key={machine.connectionId || machine.machineCode} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedMachineCodeSet.has(machine.machineCode)}
                        onChange={() => toggleMachineSelection(machine.machineCode)}
                        className="h-5 w-5 mt-0.5 accent-primary cursor-pointer shrink-0"
                        aria-label={`Chọn booth ${machine.machineCode}`}
                      />
                      <span className="min-w-0">
                        <span className="block font-mono font-bold text-[#004ac6] text-sm truncate">{machine.machineCode}</span>
                        <span className="block text-sm font-semibold text-gray-800 truncate">
                          {getMachineBoothName(machine) || 'N/A'}
                        </span>
                      </span>
                    </label>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {machine.status || 'Online'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-gray-50 border border-outline-variant p-2 min-w-0">
                      <p className="text-gray-400 font-bold uppercase">Version</p>
                      <p className="font-mono font-semibold text-gray-700 truncate">{machine.agentVersion || 'N/A'}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-outline-variant p-2 min-w-0">
                      <p className="text-gray-400 font-bold uppercase">Connected</p>
                      <p className="font-semibold text-gray-700 truncate">{formatDateTime(machine.connectedAt)}</p>
                    </div>
                  </div>

                  <select
                    value=""
                    onChange={event => {
                      handleMachineAction(machine, event.target.value);
                      event.currentTarget.value = '';
                    }}
                    className="h-11 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm font-bold text-gray-700 focus:outline-primary cursor-pointer"
                    aria-label={`Chọn thao tác cho booth ${machine.machineCode}`}
                  >
                    <option value="">Chọn thao tác</option>
                    <option value="deploy">Deploy</option>
                    <option value="powershell">PowerShell</option>
                    <option value="update-agent">Update Agent Service</option>
                    <option value="print">Print Image</option>
                  </select>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeMachines.length > 0 && (
        <div
          className={`fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm z-50 flex animate-fadeIn ${
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
                ? 'relative z-10 h-[92dvh] w-full max-w-6xl overflow-hidden rounded-lg border border-[#3a3a3a] bg-[#0b0b0b] shadow-2xl'
                : `bg-white h-[92dvh] sm:h-full w-full shadow-2xl border-t sm:border-t-0 sm:border-l border-outline-variant overflow-y-auto rounded-t-2xl sm:rounded-none ${panelMode === 'print' ? 'sm:max-w-5xl' : 'sm:max-w-xl'}`
            }
          >
            {panelMode === 'powershell' ? (
              <div className="bg-[#2b2b2b] border-b border-[#3a3a3a]">
                <div className="flex h-11 items-center justify-between gap-3 px-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 min-w-0 items-center gap-2 rounded-t-md bg-[#111111] px-3 text-slate-100">
                      <Terminal className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-mono text-xs font-bold">
                        C:\WINDOWS\system32\cmd... · {isMultiDeploy ? `${activeMachines.length} booth` : activeMachines[0].machineCode}
                      </span>
                      <button type="button" onClick={closeDeployPanel} className="ml-2 text-slate-400 hover:text-white" aria-label="Đóng tab">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button type="button" className="hidden h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-white/10 sm:inline-flex" aria-label="Tab mới">
                      +
                    </button>
                  </div>
                  <div className="flex h-11 items-center text-slate-200">
                    <button type="button" className="h-11 w-11 hover:bg-white/10" aria-label="Thu nhỏ">-</button>
                    <button type="button" className="h-11 w-11 hover:bg-white/10" aria-label="Phóng to">□</button>
                    <button type="button" onClick={closeDeployPanel} className="h-11 w-11 hover:bg-red-600" aria-label="Đóng">×</button>
                  </div>
                </div>
              </div>
            ) : (
            <div className="sticky top-0 bg-white border-b border-outline-variant p-4 sm:p-5 flex items-start justify-between gap-4 z-20">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-on-surface truncate">
                  {panelMode === 'deploy' ? 'Deploy tới' : 'In ảnh tại'}{' '}
                  {isMultiDeploy ? `${activeMachines.length} booth` : activeMachines[0].machineCode}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {isMultiDeploy
                    ? activeMachines.map(machine => getMachineBoothName(machine) || machine.machineCode).join(', ')
                    : `Agent ${activeMachines[0].agentVersion || 'N/A'} · ${formatDateTime(activeMachines[0].connectedAt)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeployPanel}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant text-gray-500 hover:bg-gray-50 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            )}

            <form
              onSubmit={panelMode === 'deploy' ? handleSubmit : panelMode === 'powershell' ? handlePowerShellSubmit : handlePrintSubmit}
              className={
                panelMode === 'powershell'
                  ? 'flex h-[calc(92dvh-45px)] flex-col overflow-y-auto bg-[#0b0b0b] p-3 sm:p-4 pb-0 text-sm text-slate-100'
                  : 'p-4 sm:p-5 pb-6 space-y-5 text-sm'
              }
            >
              {panelMode !== 'powershell' && (
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 border border-outline-variant p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode('deploy');
                    setDeployError('');
                    setDeployResult(null);
                  }}
                  className={`h-10 sm:h-9 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    panelMode === 'deploy' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Deploy
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
                  className={`h-10 sm:h-9 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-gray-500 hover:text-gray-800 ${
                    isMultiDeploy ? 'opacity-40 cursor-not-allowed hover:text-gray-500' : ''
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
                  className={`h-10 sm:h-9 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    panelMode === 'print' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  } ${isMultiDeploy ? 'opacity-40 cursor-not-allowed hover:text-gray-500' : ''
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
              )}

              {panelMode === 'deploy' ? (
              <>
                {isMultiDeploy && (
                  <div className="rounded-xl border border-outline-variant bg-[#f3f3fe] p-3">
                    <p className="text-xs font-bold text-gray-700 mb-2">Target deploy ({activeMachines.length} booth)</p>
                    <div className="flex flex-wrap gap-2">
                      {activeMachines.map(machine => (
                        <span key={machine.machineCode} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-outline-variant text-[11px] font-bold text-gray-700">
                          <span className="font-mono text-[#004ac6]">{machine.machineCode}</span>
                          {getMachineBoothName(machine) && <span className="text-gray-400">· {getMachineBoothName(machine)}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Loại task</label>
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
                  className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] bg-white"
                >
                  {taskOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {taskType === 'update-version' && (
                <div className="rounded-xl border border-outline-variant bg-gray-50 p-3 space-y-3">
                  <div className="inline-flex rounded-lg border border-outline-variant bg-white p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUpdateVersionMode('api');
                        setDeployError('');
                      }}
                      className={`h-8 px-3 rounded-md text-xs font-bold transition-colors ${
                        updateVersionMode === 'api' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Update version
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUpdateVersionMode('manual');
                        setDeployError('');
                      }}
                      className={`h-8 px-3 rounded-md text-xs font-bold transition-colors ${
                        updateVersionMode === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Thủ công
                    </button>
                  </div>

                  {updateVersionMode === 'api' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Version fileType 2 *</label>
                      <select
                        required
                        value={selectedUpdateVersionId}
                        onChange={event => {
                          setSelectedUpdateVersionId(event.target.value);
                          setDeployError('');
                        }}
                        disabled={updateVersionsQuery.isLoading}
                        className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">
                          {updateVersionsQuery.isLoading ? 'Đang tải version...' : 'Chọn version'}
                        </option>
                        {(updateVersionsQuery.data ?? []).map(version => (
                          <option key={version.id} value={version.id}>
                            {version.version} - {version.name}
                          </option>
                        ))}
                      </select>
                      {updateVersionsQuery.isError && (
                        <p className="mt-1.5 text-[11px] font-medium text-red-600">Không thể tải danh sách version từ FunStudio.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(taskType !== 'update-version' || updateVersionMode === 'manual') && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    {taskType === 'update-version' ? 'DownloadUrl thủ công *' : 'DownloadUrl *'}
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
                    className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] font-mono text-xs"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 min-h-11 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waitForResult}
                  onChange={event => setWaitForResult(event.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
                Wait for result
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">TimeoutSeconds</label>
                  <input
                    type="number"
                    min={1}
                    value={timeoutSeconds}
                    onChange={event => setTimeoutSeconds(Number(event.target.value))}
                    className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">WaitTimeoutSeconds</label>
                  <input
                    type="number"
                    min={1}
                    value={waitTimeoutSeconds}
                    onChange={event => setWaitTimeoutSeconds(Number(event.target.value))}
                    disabled={!waitForResult}
                    className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 min-h-11 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanTargetBeforeExtract}
                  onChange={event => setCleanTargetBeforeExtract(event.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
                Clean target before extract
              </label>
              </>
              ) : panelMode === 'powershell' ? (
              <>
                {powerShellScript === updateAgentServiceScript && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                    Task: <span className="font-black">update agent service</span> · chạy PowerShell quyền Admin để tải, giải nén và restart service agent.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Kiểu chạy</label>
                    <select
                      value={powerShellMode}
                      onChange={event => setPowerShellMode(event.target.value as RemotePowerShellMode)}
                      className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] bg-white text-xs font-bold"
                    >
                      <option value="inline">Inline script</option>
                      <option value="file">File .ps1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Run as</label>
                    <select
                      value={powerShellRunAs}
                      onChange={event => setPowerShellRunAs(event.target.value as RemotePowerShellRunAs)}
                      className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] bg-white text-xs font-bold"
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                </div>

                {powerShellMode === 'inline' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Command</label>
                    <textarea
                      required
                      value={powerShellScript}
                      onChange={event => {
                        setPowerShellScript(event.target.value);
                        setDeployError('');
                      }}
                      className="min-h-72 w-full resize-y rounded-lg border border-outline-variant px-3 py-2 font-mono text-xs leading-relaxed focus:outline-[#004ac6]"
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">ScriptPath</label>
                      <input
                        required
                        placeholder="D:\\FunStudio\\scripts\\test.ps1"
                        value={powerShellScriptPath}
                        onChange={event => {
                          setPowerShellScriptPath(event.target.value);
                          setDeployError('');
                        }}
                        className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Arguments</label>
                      <input
                        placeholder="-Name booth01"
                        value={powerShellArguments}
                        onChange={event => setPowerShellArguments(event.target.value)}
                        className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">WorkingDirectory</label>
                  <input
                    placeholder="D:\\FunStudio"
                    value={powerShellWorkingDirectory}
                    onChange={event => setPowerShellWorkingDirectory(event.target.value)}
                    className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Environment Variables</label>
                  <textarea
                    placeholder={'KEY=VALUE\nTEST=123'}
                    value={powerShellEnvironmentText}
                    onChange={event => {
                      setPowerShellEnvironmentText(event.target.value);
                      setDeployError('');
                    }}
                    className="min-h-24 w-full resize-y rounded-lg border border-outline-variant px-3 py-2 font-mono text-xs focus:outline-[#004ac6]"
                    spellCheck={false}
                  />
                </div>

                <label className="flex items-center gap-2 min-h-11 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waitForResult}
                    onChange={event => setWaitForResult(event.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                  Wait for result
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">TimeoutSeconds</label>
                    <input
                      type="number"
                      min={1}
                      value={powerShellTimeoutSeconds}
                      onChange={event => setPowerShellTimeoutSeconds(Number(event.target.value))}
                      className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">WaitTimeoutSeconds</label>
                    <input
                      type="number"
                      min={1}
                      value={waitTimeoutSeconds}
                      onChange={event => setWaitTimeoutSeconds(Number(event.target.value))}
                      disabled={!waitForResult}
                      className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>
              </>
              ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Layout ID</label>
                      <input
                        type="number"
                        min={0}
                        value={printLayoutId}
                        onChange={event => setPrintLayoutId(Number(event.target.value))}
                        className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Number of image</label>
                      <input
                        type="number"
                        min={1}
                        value={printNumberOfImage}
                        onChange={event => setPrintNumberOfImage(Number(event.target.value))}
                        className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshTransactions}
                    disabled={transactionsMutation.isPending}
                    className="h-11 sm:h-10 px-4 border border-outline-variant rounded-lg hover:bg-[#f3f3fe] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {transactionsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh transactions
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Code giao dịch</label>
                  <select
                    value={selectedTransactionId}
                    onChange={event => {
                      const nextTransactionId = event.target.value;
                      const nextTransaction = transactions.find(item => item.transactionId === nextTransactionId);
                      setSelectedTransactionId(nextTransactionId);
                      applyPrintDefaultsFromTransaction(nextTransaction, setPrintLayoutId, setPrintNumberOfImage);
                    }}
                    className="w-full h-11 sm:h-10 px-3 border border-outline-variant rounded-lg focus:outline-[#004ac6] bg-white font-mono text-xs"
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
                  <div className="bg-gray-50 border-b border-outline-variant px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">Danh sách giao dịch</p>
                      <p className="text-[11px] text-gray-500">{transactions.length} giao dịch từ booth</p>
                    </div>
                    {transactionsMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  </div>
                  <div className="max-h-[420px] overflow-auto">
                    {transactionsMutation.isPending ? (
                      <div className="py-12 text-center text-xs font-bold text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Đang tải giao dịch...
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="py-12 text-center text-xs font-bold text-gray-400">
                        <Images className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                        Chưa có giao dịch để hiển thị.
                      </div>
                    ) : (
                      <>
                        <div className="sm:hidden divide-y divide-[#f1f5f9]">
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
                                className={`w-full text-left p-3 space-y-2 ${selected ? 'bg-[#eef2ff]' : 'bg-white hover:bg-[#f3f3fe]'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <span className="font-mono font-bold text-[#004ac6] text-xs break-all">{item.code || item.transactionId}</span>
                                  {selected && (
                                    <span className="shrink-0 rounded-full bg-primary text-white px-2 py-0.5 text-[10px] font-bold">Đang chọn</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                                  <span>
                                    <span className="block text-gray-400 font-bold">Layout</span>
                                    <span className="font-semibold">{formatCellValue(getTransactionValue(item, 'LayoutId')) || 'N/A'}</span>
                                  </span>
                                  <span>
                                    <span className="block text-gray-400 font-bold">Số ảnh</span>
                                    <span className="font-semibold">{formatCellValue(getTransactionValue(item, 'PrintNumber')) || 'N/A'}</span>
                                  </span>
                                  <span className="col-span-2">
                                    <span className="block text-gray-400 font-bold">Thời gian</span>
                                    <span className="font-semibold">{formatCellValue(getTransactionValue(item, 'RecordAt') ?? getTransactionValue(item, 'CreatedTime')) || 'N/A'}</span>
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <table className="hidden sm:table w-max min-w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider sticky top-0 z-10">
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
                                className={`cursor-pointer hover:bg-[#f3f3fe] ${selectedTransactionId === item.transactionId ? 'bg-[#eef2ff]' : ''}`}
                              >
                                <td className="py-2 px-3 border-b border-r border-outline-variant font-mono font-bold text-[#004ac6] whitespace-nowrap">
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
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deployError}</span>
                </div>
              )}

              <div
                className={
                  panelMode === 'powershell'
                    ? 'sticky bottom-0 -mx-3 sm:-mx-4 mt-auto border-t border-[#252525] bg-[#0b0b0b]/95 px-3 py-3 backdrop-blur sm:px-4 z-10'
                    : 'sticky bottom-0 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 bg-white/95 backdrop-blur border-t border-outline-variant z-10'
                }
              >
                <button
                  type="submit"
                  disabled={deployMutation.isPending || multiDeployMutation.isPending || powerShellMutation.isPending || transactionsMutation.isPending || printImageMutation.isPending || isResolvingVersionUrl}
                  className={`w-full h-12 px-5 text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 font-bold ${
                    panelMode === 'powershell'
                      ? 'rounded-md bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-primary rounded-lg hover:bg-primary-container'
                  }`}
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
                    ? isResolvingVersionUrl ? 'Đang lấy fileUrl...' : 'Đang gửi...'
                    : panelMode === 'deploy'
                      ? isMultiDeploy
                        ? `Deploy ${activeMachines.length} booth`
                        : `Submit ${endpointLabels[taskType]}`
                      : panelMode === 'print'
                        ? 'Print Image'
                        : `Run PowerShell ${powerShellRunAs === 'admin' ? 'Admin' : 'User'}`}
                </button>
              </div>

              {multiDeployResults.length > 0 && (
                <div className="border border-outline-variant rounded-xl overflow-hidden">
                  <div className="bg-gray-50 border-b border-outline-variant px-4 py-3">
                    <p className="font-bold text-gray-900">Kết quả multi deploy</p>
                    <p className="text-[11px] text-gray-500">
                      Thành công {multiDeployResults.filter(result => result.ok).length}/{multiDeployResults.length} booth
                    </p>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full min-w-[620px] text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                          <th className="py-2.5 px-3 border-b border-r border-outline-variant">MachineCode</th>
                          <th className="py-2.5 px-3 border-b border-r border-outline-variant">Tên Booth</th>
                          <th className="py-2.5 px-3 border-b border-r border-outline-variant">Status</th>
                          <th className="py-2.5 px-3 border-b border-r border-outline-variant">TaskId / Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {multiDeployResults.map(result => (
                          <tr key={result.machineCode} className={result.ok ? 'bg-emerald-50/40' : 'bg-red-50/40'}>
                            <td className="py-2 px-3 border-b border-r border-outline-variant font-mono font-bold text-[#004ac6]">{result.machineCode}</td>
                            <td className="py-2 px-3 border-b border-r border-outline-variant font-semibold text-gray-700">{result.boothName || 'N/A'}</td>
                            <td className="py-2 px-3 border-b border-r border-outline-variant">
                              <span className={`inline-flex px-2 py-0.5 rounded-full font-bold ${result.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {result.ok ? (result.response?.completed?.status || result.response?.status || 'SENT') : 'FAILED'}
                              </span>
                            </td>
                            <td className="py-2 px-3 border-b border-r border-outline-variant font-mono text-gray-700">
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
                  <div className="bg-gray-50 border-b border-outline-variant px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">Kết quả task</p>
                      <p className="text-[11px] text-gray-500 font-mono">
                        {currentTaskId || 'Backend không trả taskId'}
                        {deployResult.taskType ? ` · ${deployResult.taskType}` : ''}
                      </p>
                    </div>
                    {currentTaskId && (
                      <button
                        type="button"
                        onClick={() => taskStatusMutation.mutate(currentTaskId)}
                        disabled={taskStatusMutation.isPending}
                        className="px-3 py-1.5 border border-outline-variant rounded-lg hover:bg-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {taskStatusMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SearchCheck className="w-3.5 h-3.5" />}
                        Check status
                      </button>
                    )}
                  </div>
                  <dl className="p-4 space-y-3 text-xs">
                    <div>
                      <dt className="font-bold text-gray-500 uppercase tracking-wider">Status</dt>
                      <dd className="mt-1 font-semibold text-gray-900">{resultStatus ? String(resultStatus) : 'N/A'}</dd>
                    </div>
                    {deployResult.message && (
                      <div>
                        <dt className="font-bold text-gray-500 uppercase tracking-wider">Message</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{deployResult.message}</dd>
                      </div>
                    )}
                    {deployResult.completed?.exitCode !== undefined && (
                      <div>
                        <dt className="font-bold text-gray-500 uppercase tracking-wider">ExitCode</dt>
                        <dd className="mt-1 font-mono font-semibold text-gray-900">{deployResult.completed.exitCode}</dd>
                      </div>
                    )}
                    {deployResult.completed?.stdOut && (
                      <div>
                        <dt className="font-bold text-gray-500 uppercase tracking-wider">StdOut</dt>
                        <dd className="mt-1">
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words bg-[#f3f3fe] border border-outline-variant rounded-lg p-3 text-[11px] text-gray-800">
                            {deployResult.completed.stdOut}
                          </pre>
                        </dd>
                      </div>
                    )}
                    {deployResult.completed?.stdErr && (
                      <div>
                        <dt className="font-bold text-gray-500 uppercase tracking-wider">StdErr</dt>
                        <dd className="mt-1">
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words bg-red-50 border border-red-100 rounded-lg p-3 text-[11px] text-red-800">
                            {deployResult.completed.stdErr}
                          </pre>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-bold text-gray-500 uppercase tracking-wider">MachineCode</dt>
                      <dd className="mt-1 font-mono font-semibold text-gray-900">{deployResult.machineCode || deployResult.state?.machineCode || activeMachines[0]?.machineCode}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-gray-500 uppercase tracking-wider">Raw result</dt>
                      <dd className="mt-1">
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words bg-[#f3f3fe] border border-outline-variant rounded-lg p-3 text-[11px] text-gray-800">
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
