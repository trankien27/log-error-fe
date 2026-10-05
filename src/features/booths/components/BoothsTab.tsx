import React, { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Plus, Search, Copy, Edit2, KeyRound, Loader2, RefreshCw, Store, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import LazySearchDropdown from '../../../components/Shared/LazySearchDropdown';
import { boothsService } from '../../../services/api/boothsService';
import { lookupService } from '../../../services/api/lookupService';
import { useBoothsStore } from '../../../stores/useBoothsStore';
import { Booth } from '../../../types';
import { EmptyState, FilterBar, PageHeader, SectionCard, Skeleton, TableSkeletonRows, confirmAction } from '../../../components/ui';

const syncedAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatSyncedAt(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : syncedAtFormatter.format(date);
}

export default function BoothsTab() {
  const {
    booths,
    searchQuery,
    boothPageIndex,
    boothPageSize,
    boothTotalItems,
    boothTotalPages,
    latestBoothSyncedAt,
    error,
    isLoading,
    isBoothModalOpen,
    currentEditingBooth,
    setSearchQuery,
    setBoothPageIndex,
    setBoothPageSize,
    setIsBoothModalOpen,
    setCurrentEditingBooth,
    fetchBooths,
    saveBooth,
    deleteBooth,
  } = useBoothsStore();

  // Local Form states for edit/create booth
  const [boothIdField, setBoothIdField] = useState('');
  const [boothNameField, setBoothNameField] = useState('');
  const [boothUltraviewField, setBoothUltraviewField] = useState('');
  const [boothStoresField, setBoothStoresField] = useState('');
  const [agentKeyBooth, setAgentKeyBooth] = useState<Booth | null>(null);
  const [viewAgentKey, setViewAgentKey] = useState('');

  const viewAgentKeyMutation = useMutation({
    mutationFn: boothsService.getAgentKey,
    onSuccess: response => {
      const key = String(response.agentKey || response.AgentKey || response.key || '');
      if (!key) {
        toast.error('Booth này chưa có AgentKey.');
        return;
      }
      setViewAgentKey(key);
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Không thể xem AgentKey.');
    },
  });

  const generateAgentKeyMutation = useMutation({
    mutationFn: boothsService.generateAgentKey,
    onSuccess: response => {
      const key = String(response.agentKey || response.AgentKey || response.key || '');
      if (!key) {
        toast.error('Không tạo được AgentKey.');
        return;
      }

      setViewAgentKey(key);
      toast.success('Đã tạo AgentKey.');
      fetchBooths();
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo AgentKey.');
    },
  });

  const syncBoothsMutation = useMutation({
    mutationFn: boothsService.syncBooths,
    onSuccess: result => {
      toast.success(`Đã đồng bộ booth: +${result.added}, cập nhật ${result.updated}, xóa ${result.deleted}.`);
      fetchBooths();
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Không thể đồng bộ booth.');
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchBooths();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [fetchBooths, searchQuery, boothPageIndex, boothPageSize]);

  const loadBooths = useCallback((query: { search: string; pageIndex: number; pageSize: number }) => {
    return lookupService.searchBooths(query);
  }, []);
  const loadStores = useCallback((query: { search: string; pageIndex: number; pageSize: number }) => {
    return lookupService.searchStores(query);
  }, []);

  const handleOpenBoothModal = (b: Booth | null = null) => {
    if (b) {
      setCurrentEditingBooth(b);
      setBoothIdField(b.code || b.id);
      setBoothNameField(b.name);
      setBoothUltraviewField(b.ultraviewId);
      setBoothStoresField(b.relatedStores);
    } else {
      setCurrentEditingBooth(null);
      setBoothIdField(`BTH-00${booths.length + 1}`);
      setBoothNameField('');
      setBoothUltraviewField('');
      setBoothStoresField('');
    }
    setIsBoothModalOpen(true);
  };

  const handleSaveBoothSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boothNameField.trim() || !boothUltraviewField.trim()) {
      toast.error('Vui lòng nhập tên booth và ID UltraView.');
      return;
    }

    const payload: Booth = {
      id: currentEditingBooth?.id || boothIdField,
      code: boothIdField.trim(),
      name: boothNameField.trim(),
      ultraviewId: boothUltraviewField.trim(),
      relatedStores: boothStoresField.trim()
    };

    try {
      await saveBooth(payload, !!currentEditingBooth);
      toast.success(currentEditingBooth ? 'Đã cập nhật booth.' : 'Đã thêm booth.');
      setIsBoothModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu booth.');
    }
  };

  const handleDeleteBoothClick = async (id: string) => {
    if (!(await confirmAction({ title: `Xóa booth ${id}?`, content: 'Thao tác không thể hoàn tác.' }))) return;
    try {
      await deleteBooth(id);
      toast.success('Đã xóa booth.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa booth.');
    }
  };

  const handleViewAgentKey = (booth: Booth) => {
    setAgentKeyBooth(booth);
    setViewAgentKey('');
    viewAgentKeyMutation.mutate(booth.id);
  };

  const closeAgentKeyModal = () => {
    if (viewAgentKeyMutation.isPending || generateAgentKeyMutation.isPending) return;
    setAgentKeyBooth(null);
    setViewAgentKey('');
  };

  const handleGenerateAgentKey = () => {
    if (!agentKeyBooth) return;
    generateAgentKeyMutation.mutate(agentKeyBooth.id);
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error('Không thể sao chép vào clipboard.');
    }
  };

  const iconButtonClass =
    'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const inputClass =
    'w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface disabled:bg-surface-2 disabled:text-on-surface-variant';
  const labelClass = 'block text-sm font-medium text-on-surface mb-1.5';

  return (
    <div className="space-y-5 text-left animate-fadeIn">
      <PageHeader
        title="Booth"
        icon={Store}
        description="Danh sách booth tại cửa hàng kèm ID UltraView để kết nối hỗ trợ nhanh."
        actions={
          <>
            <button
              type="button"
              onClick={() => fetchBooths()}
              disabled={isLoading || syncBoothsMutation.isPending}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => syncBoothsMutation.mutate()}
              disabled={syncBoothsMutation.isPending || isLoading}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${syncBoothsMutation.isPending ? 'animate-spin' : ''}`} />
              Đồng bộ booth
            </button>
            <button type="button" onClick={() => handleOpenBoothModal()} className="btn-primary">
              <Plus className="w-4 h-4" /> Thêm booth
            </button>
          </>
        }
      />

      <FilterBar
        actions={
          <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
            <span className="font-medium">{boothTotalItems} booth</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Cập nhật: {formatSyncedAt(latestBoothSyncedAt)}
            </span>
          </div>
        }
      >
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã booth..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 w-full pl-9 pr-3 bg-surface border border-outline-variant rounded-lg text-sm text-on-surface"
            aria-label="Tìm booth"
          />
        </div>
      </FilterBar>

      {error && (
        <div className="rounded-xl border border-error/30 bg-error-container p-3 text-sm text-on-error-container flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <SectionCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant select-none">
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Mã booth</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Tên booth</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">ID UltraView</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60">Cửa hàng</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60 w-48">Đồng bộ lần cuối</th>
                <th className="px-4 py-3 text-xs font-medium text-on-surface-variant bg-surface-2/60 text-right w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <TableSkeletonRows rows={6} columns={6} />
              ) : booths.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      compact
                      icon={Store}
                      title="Không tìm thấy booth"
                      description="Thử đổi từ khóa tìm kiếm hoặc đồng bộ lại."
                    />
                  </td>
                </tr>
              ) : (
                booths.map(b => (
                  <tr key={b.id} className="hover:bg-surface-2/50 transition-colors group">
                    <td className="px-4 py-3 font-mono font-medium text-primary text-sm">{b.code || b.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-on-surface text-sm block">{b.name}</span>
                      <span className="text-[11px] text-on-surface-variant">Kết nối qua UltraView</span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-secondary-container px-2 py-0.5 rounded-md text-xs text-on-secondary-container font-medium select-all font-mono">
                          {b.ultraviewId}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(b.ultraviewId, `Đã sao chép ID: ${b.ultraviewId}`)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-primary hover:bg-primary-subtle transition-colors cursor-pointer"
                          title="Sao chép ID"
                          aria-label="Sao chép ID UltraView"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{b.relatedStores}</td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {formatSyncedAt(b.lastSyncedAt)}
                    </td>
                    <td className="px-4 py-3 text-right w-36">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewAgentKey(b)}
                          className={`${iconButtonClass} hover:bg-warning-container hover:text-on-warning-container`}
                          title="Xem AgentKey"
                          aria-label="Xem AgentKey"
                          disabled={viewAgentKeyMutation.isPending}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenBoothModal(b)}
                          className={`${iconButtonClass} hover:bg-primary-subtle hover:text-primary`}
                          title="Sửa"
                          aria-label="Sửa booth"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBoothClick(b.id)}
                          className={`${iconButtonClass} hover:bg-error-container hover:text-error`}
                          title="Xóa"
                          aria-label="Xóa booth"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-outline-variant px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>Hiển thị</span>
            <select
              value={boothPageSize}
              onChange={event => setBoothPageSize(Number(event.target.value))}
              className="h-8 px-2 border border-outline-variant rounded-lg bg-surface text-sm text-on-surface"
              aria-label="Số booth mỗi trang"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>mỗi trang</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-sm text-on-surface-variant tabular-nums">
              Trang {boothTotalPages === 0 ? 0 : boothPageIndex + 1}/{boothTotalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBoothPageIndex(Math.max(boothPageIndex - 1, 0))}
                disabled={isLoading || boothPageIndex <= 0}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang trước"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setBoothPageIndex(boothPageIndex + 1)}
                disabled={isLoading || boothTotalPages === 0 || boothPageIndex + 1 >= boothTotalPages}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang sau"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {isBoothModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto border border-outline-variant text-left">
            <div className="flex justify-between items-center gap-3 px-5 py-4 border-b border-outline-variant">
              <h3 className="text-lg font-semibold text-on-surface truncate">
                {currentEditingBooth ? `Sửa booth ${currentEditingBooth.id}` : 'Thêm booth'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBoothModalOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
                aria-label="Đóng"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBoothSubmit} className="space-y-4 text-sm p-5">
              <div>
                <label className={labelClass}>Chọn booth từ hệ thống</label>
                <LazySearchDropdown
                  value={boothNameField}
                  placeholder="Tìm booth theo mã hoặc tên..."
                  emptyText="Không tìm thấy booth."
                  loadOptions={loadBooths}
                  onSelect={item => {
                    setBoothIdField(item.code || String(item.id));
                    setBoothNameField(item.name);
                    setBoothUltraviewField(item.code || boothUltraviewField);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Mã booth <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="BTH-00X"
                    value={boothIdField}
                    onChange={e => setBoothIdField(e.target.value)}
                    disabled={!!currentEditingBooth}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>ID UltraView <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 12 345 678"
                    value={boothUltraviewField}
                    onChange={e => setBoothUltraviewField(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Tên booth <span className="text-error">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kiosk tự phục vụ tầng G"
                  value={boothNameField}
                  onChange={e => setBoothNameField(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cửa hàng</label>
                <LazySearchDropdown
                  value={boothStoresField}
                  placeholder="Chọn cửa hàng..."
                  emptyText="Không tìm thấy cửa hàng."
                  loadOptions={loadStores}
                  pageSize={20}
                  onSelect={item => setBoothStoresField(item.name)}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBoothModalOpen(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {agentKeyBooth && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto border border-outline-variant text-left">
            <div className="flex justify-between items-start gap-4 px-5 py-4 border-b border-outline-variant">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-on-surface">AgentKey · {agentKeyBooth.code || agentKeyBooth.id}</h3>
                <p className="text-sm text-on-surface-variant mt-0.5 truncate">{agentKeyBooth.name}</p>
              </div>
              <button
                type="button"
                onClick={closeAgentKeyModal}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer transition-colors"
                aria-label="Đóng"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-xl border border-warning/30 bg-warning-container p-3 text-sm text-on-warning-container flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Key dùng để cấu hình agent tại booth (appsettings.json). Vui lòng không chia sẻ công khai.</span>
              </div>

              {viewAgentKeyMutation.isPending ? (
                <div className="space-y-2 py-2" aria-busy="true" aria-label="Đang tải AgentKey">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ) : viewAgentKey ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1.5">AgentKey</label>
                    <div className="rounded-lg border border-outline-variant bg-surface-2 p-3 font-mono text-xs text-on-surface break-all select-all">
                      {viewAgentKey}
                    </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeAgentKeyModal}
                      disabled={generateAgentKeyMutation.isPending}
                      className="btn-secondary"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAgentKey}
                      disabled={generateAgentKeyMutation.isPending}
                      className="btn-secondary"
                    >
                      {generateAgentKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      Tạo nếu chưa có
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(viewAgentKey, 'Đã sao chép AgentKey.')}
                      disabled={generateAgentKeyMutation.isPending}
                      className="btn-primary"
                    >
                      <Copy className="w-4 h-4" />
                      Sao chép
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={KeyRound}
                  title="Booth này chưa có AgentKey"
                  action={
                    <button
                      type="button"
                      onClick={handleGenerateAgentKey}
                      disabled={generateAgentKeyMutation.isPending}
                      className="btn-primary"
                    >
                      {generateAgentKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      Tạo AgentKey
                    </button>
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
