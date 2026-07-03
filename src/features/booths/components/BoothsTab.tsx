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
    if (viewAgentKeyMutation.isPending) return;
    setAgentKeyBooth(null);
    setViewAgentKey('');
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
          <h2 className="text-xl font-bold text-gray-900 font-sans">Quản trị danh sách Trạm Booth hỗ trợ</h2>
          <p className="text-xs text-gray-500 mt-1">Danh sách điều kiểm mẫu máy tại hiện trường. Đi kèm ID đăng nhập UltraView để nhân viên kỹ thuật kết nối lập tức.</p>
        </div>
        <button
          onClick={() => handleOpenBoothModal()}
          className="bg-primary text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Booth
        </button>
      </div>

      {/* Page Filters or search */}
      <div className="bg-white rounded-xl border border-outline-variant p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc code booth..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg text-xs"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium text-center md:text-left">
            {boothTotalItems} booth
          </span>
          <button
            type="button"
            onClick={() => fetchBooths()}
            disabled={isLoading}
            className="h-9 px-3 border border-outline-variant rounded-lg hover:bg-[#f3f3fe] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Data table booths */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500 font-bold select-none font-sans">
                <th className="py-4 px-5">Mã Trạm Booth</th>
                <th className="py-4 px-5">Tên Trạm Kỹ Thuật</th>
                <th className="py-4 px-5">ID Kết Nối Từ Xa</th>
                <th className="py-4 px-5">Cửa hàng/Chi nhánh liên quan</th>
                <th className="py-4 px-5 text-right w-36">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-sans font-bold text-gray-400">
                    Đang tải dữ liệu Booth...
                  </td>
                </tr>
              ) : booths.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-sans font-bold text-gray-400">
                    Không tìm thấy booth nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                booths.map(b => (
                  <tr key={b.id} className="hover:bg-[#faf8ff] transition-colors group">
                    <td className="py-4 px-5 font-mono font-bold text-[#004ac6] text-sm">{b.code || b.id}</td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-gray-900 text-sm block">{b.name}</span>
                      <span className="text-[10px] text-gray-400">Hỗ trợ UltraView tự động kết nối</span>
                    </td>
                    <td className="py-4 px-5 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#f0f0fb] px-2.5 py-1 rounded text-xs text-gray-800 font-bold select-all tracking-wider font-mono">
                          {b.ultraviewId}
                        </span>
                        <button
                          onClick={() => copyToClipboard(b.ultraviewId, `Đã sao chép UltraView ID: ${b.ultraviewId}`)}
                          className="p-1 rounded text-gray-400 hover:text-primary hover:bg-[#ededf9] transition-all outline-none cursor-pointer"
                          title="Sao chép ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-600 font-medium">{b.relatedStores}</td>
                    <td className="py-4 px-5 text-right w-36">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleViewAgentKey(b)}
                          className="p-1 px-1.5 border rounded hover:bg-amber-50 hover:text-amber-600 transition-colors border-outline-variant cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          title="View Agent Key"
                          disabled={viewAgentKeyMutation.isPending}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenBoothModal(b)}
                          className="p-1 px-1.5 border rounded hover:bg-blue-50 hover:text-primary transition-colors border-outline-variant cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBoothClick(b.id)}
                          className="p-1 px-1.5 border rounded hover:bg-red-50 hover:text-red-500 transition-colors border-outline-variant cursor-pointer"
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

        <div className="border-t border-outline-variant bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Hiển thị</span>
            <select
              value={boothPageSize}
              onChange={event => setBoothPageSize(Number(event.target.value))}
              className="h-8 px-2 border border-outline-variant rounded-lg bg-white text-xs font-bold focus:outline-[#004ac6]"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>mỗi trang</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs font-semibold text-gray-500">
              Trang {boothTotalPages === 0 ? 0 : boothPageIndex + 1}/{boothTotalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBoothPageIndex(Math.max(boothPageIndex - 1, 0))}
                disabled={isLoading || boothPageIndex <= 0}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-white hover:bg-[#f3f3fe] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setBoothPageIndex(boothPageIndex + 1)}
                disabled={isLoading || boothTotalPages === 0 || boothPageIndex + 1 >= boothTotalPages}
                className="h-8 w-8 inline-flex items-center justify-center border border-outline-variant rounded-lg bg-white hover:bg-[#f3f3fe] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingBooth ? `Chỉnh sửa Booth: ${currentEditingBooth.id}` : 'Đăng ký trạm hỗ trợ (Booth) mới'}
              </h3>
              <button onClick={() => setIsBoothModalOpen(false)} className="text-gray-400 hover:text-gray-655 font-bold cursor-pointer">&#x2715;</button>
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6] bg-gray-50"
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
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
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {agentKeyBooth && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-start gap-4 mb-4 pb-2 border-b border-[#e2e8f0]">
              <div>
                <h3 className="text-lg font-bold text-on-surface">View AgentKey cho {agentKeyBooth.code || agentKeyBooth.id}</h3>
                <p className="text-xs text-gray-500 mt-1">{agentKeyBooth.name}</p>
              </div>
              <button
                type="button"
                onClick={closeAgentKeyModal}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant text-gray-500 hover:bg-gray-50 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Key này dùng cấu hình local agent tại booth trong appsettings.json, không public.</span>
            </div>

            {viewAgentKeyMutation.isPending ? (
              <div className="py-8 text-center text-sm font-bold text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Đang tải AgentKey...
              </div>
            ) : viewAgentKey ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">AgentKey</label>
                  <div className="rounded-lg border border-outline-variant bg-[#f3f3fe] p-3 font-mono text-xs text-gray-900 break-all select-all">
                    {viewAgentKey}
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAgentKeyModal}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(viewAgentKey, 'Đã sao chép AgentKey.')}
                    className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container cursor-pointer inline-flex items-center justify-center gap-2 font-bold"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm font-bold text-red-500">
                Không có AgentKey để hiển thị.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
