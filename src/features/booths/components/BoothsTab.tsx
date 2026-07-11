import React, { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Search, Copy, Edit2, KeyRound, Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import LazySearchDropdown from '../../../components/Shared/LazySearchDropdown';
import { boothsService } from '../../../services/api/boothsService';
import { lookupService } from '../../../services/api/lookupService';
import { useBoothsStore } from '../../../stores/useBoothsStore';
import { Booth } from '../../../types';

export default function BoothsTab() {
  const {
    booths,
    searchQuery,
    boothPageIndex,
    boothPageSize,
    boothTotalItems,
    boothTotalPages,
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
      toast.success(`Đã sync booth: +${result.added}, cập nhật ${result.updated}, xóa ${result.deleted}.`);
      fetchBooths();
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Không thể sync booth.');
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
      toast.error('Vui lòng điền đủ Tên Booth và ID Ultraview.');
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
      toast.success(currentEditingBooth ? 'Cập nhật Booth thành công.' : 'Thêm Booth thành công.');
      setIsBoothModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu Booth.');
    }
  };

  const handleDeleteBoothClick = async (id: string) => {
    toast.warning(`Xóa Booth ${id}?`, {
      action: {
        label: 'Xóa',
        onClick: async () => {
          try {
            await deleteBooth(id);
            toast.success('Đã xóa Booth.');
          } catch (err: any) {
            toast.error(err.message || 'Không thể xóa Booth.');
          }
        },
      },
    });
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

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Screen title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">Quản trị danh sách Trạm Booth hỗ trợ</h2>
          <p className="text-xs text-on-surface-variant mt-1">Danh sách điều kiểm mẫu máy tại hiện trường. Đi kèm ID đăng nhập UltraView để nhân viên kỹ thuật kết nối lập tức.</p>
        </div>
        <button
          onClick={() => handleOpenBoothModal()}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Thêm Booth
        </button>
      </div>

      {/* Page Filters or search */}
      <div className="card-surface p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc code booth..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-xs"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant font-medium text-center md:text-left">
            {boothTotalItems} booth
          </span>
          <button
            type="button"
            onClick={() => syncBoothsMutation.mutate()}
            disabled={syncBoothsMutation.isPending || isLoading}
            className="h-9 px-3 border border-success/30 rounded-lg bg-surface text-success hover:bg-success-container text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncBoothsMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Booth
          </button>
          <button
            type="button"
            onClick={() => fetchBooths()}
            disabled={isLoading || syncBoothsMutation.isPending}
            className="h-9 px-3 border border-outline-variant rounded-lg hover:bg-surface-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error-container p-3 text-xs font-medium text-on-error-container flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Data table booths */}
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-outline-variant text-[11px] uppercase tracking-wider text-on-surface-variant font-bold select-none font-sans">
                <th className="py-4 px-5">Mã Trạm Booth</th>
                <th className="py-4 px-5">Tên Trạm Kỹ Thuật</th>
                <th className="py-4 px-5">ID Kết Nối Từ Xa</th>
                <th className="py-4 px-5">Cửa hàng/Chi nhánh liên quan</th>
                <th className="py-4 px-5 text-right w-36">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-sans font-bold text-on-surface-variant">
                    Đang tải dữ liệu Booth...
                  </td>
                </tr>
              ) : booths.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-sans font-bold text-on-surface-variant">
                    Không tìm thấy booth nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                booths.map(b => (
                  <tr key={b.id} className="hover:bg-surface-2/60 transition-colors group">
                    <td className="py-4 px-5 font-mono font-bold text-primary text-sm">{b.code || b.id}</td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-on-surface text-sm block">{b.name}</span>
                      <span className="text-[10px] text-on-surface-variant">Hỗ trợ UltraView tự động kết nối</span>
                    </td>
                    <td className="py-4 px-5 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="bg-secondary-container px-2.5 py-1 rounded text-xs text-on-secondary-container font-bold select-all tracking-wider font-mono">
                          {b.ultraviewId}
                        </span>
                        <button
                          onClick={() => copyToClipboard(b.ultraviewId, `Đã sao chép UltraView ID: ${b.ultraviewId}`)}
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all outline-none cursor-pointer"
                          title="Sao chép ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-on-surface-variant font-medium">{b.relatedStores}</td>
                    <td className="py-4 px-5 text-right w-36">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleViewAgentKey(b)}
                          className="p-1 px-1.5 border rounded hover:bg-warning-container hover:text-warning transition-colors border-outline-variant cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          title="View Agent Key"
                          disabled={viewAgentKeyMutation.isPending}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenBoothModal(b)}
                          className="p-1 px-1.5 border rounded hover:bg-primary/10 hover:text-primary transition-colors border-outline-variant cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBoothClick(b.id)}
                          className="p-1 px-1.5 border rounded hover:bg-error-container hover:text-error transition-colors border-outline-variant cursor-pointer"
                          title="Xóa Booth"
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

        <div className="border-t border-outline-variant bg-surface-2 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span>Hiển thị</span>
            <select
              value={boothPageSize}
              onChange={event => setBoothPageSize(Number(event.target.value))}
              className="h-8 px-2 border border-outline-variant rounded-lg bg-surface text-xs font-bold focus:outline-primary"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>mỗi trang</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs font-semibold text-on-surface-variant">
              Trang {boothTotalPages === 0 ? 0 : boothPageIndex + 1}/{boothTotalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBoothPageIndex(Math.max(boothPageIndex - 1, 0))}
                disabled={isLoading || boothPageIndex <= 0}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setBoothPageIndex(boothPageIndex + 1)}
                disabled={isLoading || boothTotalPages === 0 || boothPageIndex + 1 >= boothTotalPages}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-surface hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Booth CRUD Modal */}
      {isBoothModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingBooth ? `Chỉnh sửa Booth: ${currentEditingBooth.id}` : 'Đăng ký trạm hỗ trợ (Booth) mới'}
              </h3>
              <button onClick={() => setIsBoothModalOpen(false)} className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">&#x2715;</button>
            </div>
            <form onSubmit={handleSaveBoothSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Chọn Booth từ hệ thống</label>
                <LazySearchDropdown
                  value={boothNameField}
                  placeholder="Tìm Booth theo mã hoặc tên..."
                  emptyText="Không tìm thấy Booth."
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
                  <label className="block font-medium mb-1">Mã trạm (ID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="BTH-00X"
                    value={boothIdField}
                    onChange={e => setBoothIdField(e.target.value)}
                    disabled={!!currentEditingBooth}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary bg-surface-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">UltraView / TeamView ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 12 345 678"
                    value={boothUltraviewField}
                    onChange={e => setBoothUltraviewField(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Tên Booth / Vị trí phân công *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kiosk Tự Phục Vụ Tầng G"
                  value={boothNameField}
                  onChange={e => setBoothNameField(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-primary"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Địa điểm / Cửa hàng liên quan</label>
                <LazySearchDropdown
                  value={boothStoresField}
                  placeholder="Chọn cửa hàng..."
                  emptyText="Không tìm thấy cửa hàng."
                  loadOptions={loadStores}
                  pageSize={20}
                  onSelect={item => setBoothStoresField(item.name)}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBoothModalOpen(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary px-5 py-2"
                >
                  {isLoading ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {agentKeyBooth && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-start gap-4 mb-4 pb-2 border-b border-outline-variant">
              <div>
                <h3 className="text-lg font-bold text-on-surface">View AgentKey cho {agentKeyBooth.code || agentKeyBooth.id}</h3>
                <p className="text-xs text-on-surface-variant mt-1">{agentKeyBooth.name}</p>
              </div>
              <button
                type="button"
                onClick={closeAgentKeyModal}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-2 cursor-pointer transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning-container p-3 text-xs font-medium text-on-warning-container flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Key này dùng cấu hình local agent tại booth trong appsettings.json, không public.</span>
            </div>

            {viewAgentKeyMutation.isPending ? (
              <div className="py-8 text-center text-sm font-bold text-on-surface-variant">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Đang tải AgentKey...
              </div>
            ) : viewAgentKey ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1.5">AgentKey</label>
                  <div className="rounded-lg border border-outline-variant bg-surface-2 p-3 font-mono text-xs text-on-surface break-all select-all">
                    {viewAgentKey}
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAgentKeyModal}
                    disabled={generateAgentKeyMutation.isPending}
                    className="btn-secondary px-4 py-2"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAgentKey}
                    disabled={generateAgentKeyMutation.isPending}
                    className="px-5 py-2 border border-warning/30 bg-warning-container text-on-warning-container rounded-lg hover:brightness-95 cursor-pointer inline-flex items-center justify-center gap-2 font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {generateAgentKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    Tạo nếu chưa có
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(viewAgentKey, 'Đã sao chép AgentKey.')}
                    disabled={generateAgentKeyMutation.isPending}
                    className="btn-primary px-5 py-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm font-bold text-error">Booth này chưa có AgentKey.</p>
                <button
                  type="button"
                  onClick={handleGenerateAgentKey}
                  disabled={generateAgentKeyMutation.isPending}
                  className="btn-primary mt-4 px-5 py-2 text-sm"
                >
                  {generateAgentKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Gen key
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
