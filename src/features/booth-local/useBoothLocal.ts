import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  LocalBoothInfo,
  LocalTransactionItem,
  NOT_BOOTH_DEVICE_MESSAGE,
  localBoothPrintService,
} from '../../services/api/localBoothPrintService';

// Trang thai kiem tra may dang mo trang nay co phai booth khong.
export type BoothLocalStatus = 'checking' | 'available' | 'unavailable';

export type BoothActionOutcome = {
  ok: boolean;
  message: string;
  raw: unknown;
};

export const getErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

export const isNotBoothDeviceError = (error: unknown) => (
  error instanceof Error && error.name === 'NotBoothDeviceError'
);

// State dung chung cho cac tab lam viec voi app booth local:
// nhan dien booth + doc danh sach giao dich tu SQLite + chon giao dich.
export function useBoothLocal() {
  const [boothLocalStatus, setBoothLocalStatus] = useState<BoothLocalStatus>('checking');
  const [boothInfo, setBoothInfo] = useState<LocalBoothInfo | null>(null);
  const [boothError, setBoothError] = useState('');
  const [transactions, setTransactions] = useState<LocalTransactionItem[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [formError, setFormError] = useState('');

  const transactionsMutation = useMutation({
    mutationFn: () => localBoothPrintService.getTransactions(),
    onError: error => {
      const message = getErrorMessage(error, 'Không thể tải danh sách giao dịch.');
      if (isNotBoothDeviceError(error)) {
        setBoothLocalStatus('unavailable');
        setBoothError(message);
      }
      setTransactions([]);
      setSelectedTransactionId('');
      setFormError(message);
      toast.error(message);
    },
  });

  const { mutate: runLoadTransactions } = transactionsMutation;

  const loadTransactions = useCallback((onLoaded?: (items: LocalTransactionItem[]) => void) => {
    runLoadTransactions(undefined, {
      onSuccess: items => {
        setTransactions(items);
        setSelectedTransactionId(items[0]?.transactionId ?? '');
        setFormError('');
        onLoaded?.(items);
      },
    });
  }, [runLoadTransactions]);

  // /api/booth/getbooth vua xac nhan day la booth, vua tra ve boothCode de hien thi.
  const detectBooth = useCallback(async () => {
    setBoothLocalStatus('checking');
    setBoothError('');
    try {
      const info = await localBoothPrintService.getBoothInfo();
      setBoothInfo(info);
      setBoothLocalStatus('available');
      return info;
    } catch (error) {
      const message = getErrorMessage(error, NOT_BOOTH_DEVICE_MESSAGE);
      setBoothInfo(null);
      setBoothLocalStatus('unavailable');
      setBoothError(message);
      return null;
    }
  }, []);

  useEffect(() => {
    void detectBooth();
  }, [detectBooth]);

  const filteredTransactions = useMemo(() => {
    const keyword = transactionSearch.trim().toLowerCase();
    if (!keyword) return transactions;
    return transactions.filter(item => (
      item.code.toLowerCase().includes(keyword)
      || item.transactionId.toLowerCase().includes(keyword)
    ));
  }, [transactions, transactionSearch]);

  const selectedTransaction = transactions.find(item => item.transactionId === selectedTransactionId);

  // Truoc khi goi API ghi (in / tao anh) phai chac chan may nay la booth.
  const ensureBooth = useCallback(async (
    onNotBooth: (message: string) => void,
  ) => {
    if (boothLocalStatus === 'available') return true;

    const info = await detectBooth();
    if (info) return true;

    setFormError(NOT_BOOTH_DEVICE_MESSAGE);
    onNotBooth(NOT_BOOTH_DEVICE_MESSAGE);
    toast.error(NOT_BOOTH_DEVICE_MESSAGE);
    return false;
  }, [boothLocalStatus, detectBooth]);

  return {
    boothLocalStatus,
    setBoothLocalStatus,
    boothInfo,
    boothError,
    setBoothError,
    detectBooth,
    ensureBooth,
    transactions,
    filteredTransactions,
    selectedTransaction,
    selectedTransactionId,
    setSelectedTransactionId,
    transactionSearch,
    setTransactionSearch,
    isLoadingTransactions: transactionsMutation.isPending,
    loadTransactions,
    formError,
    setFormError,
  };
}
