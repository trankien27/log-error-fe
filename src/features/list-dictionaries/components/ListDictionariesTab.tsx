import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  Edit3,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { listDictionariesService } from '../../../services/api/listDictionariesService';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  CreateListDictionaryRequest,
  ListDictionaryDto,
  ListDictionaryFieldDto,
  ListDictionaryFieldType,
  ListDictionaryItemDto,
  SaveListDictionaryItemRequest,
} from '../../../types';

const FIELD_TYPES: Array<{ value: ListDictionaryFieldType; label: string }> = [
  { value: 1, label: 'Văn bản' },
  { value: 2, label: 'Số' },
  { value: 3, label: 'Đúng / Sai' },
  { value: 4, label: 'Ngày' },
  { value: 5, label: 'Ngày giờ' },
  { value: 6, label: 'Một lựa chọn' },
];

type FieldDraft = {
  key: string;
  code: string;
  name: string;
  dataType: ListDictionaryFieldType;
  isRequired: boolean;
  optionsText: string;
};

type DefinitionDraft = {
  code: string;
  name: string;
  description: string;
  fields: FieldDraft[];
};

function newField(): FieldDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    code: '',
    name: '',
    dataType: 1,
    isRequired: false,
    optionsText: '',
  };
}

function newDefinition(): DefinitionDraft {
  return { code: '', name: '', description: '', fields: [newField()] };
}

function toCode(value: string) {
  const code = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return /^[A-Z]/.test(code) ? code : code ? `F_${code}` : '';
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function formatValue(field: ListDictionaryFieldDto, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (field.dataType === 3) return value ? 'Có' : 'Không';
  if (field.dataType === 2 && typeof value === 'number') return value.toLocaleString('vi-VN');
  if (field.dataType === 4) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN');
  }
  if (field.dataType === 5) return formatDateTime(String(value));
  return String(value);
}

export default function ListDictionariesTab() {
  const navigate = useNavigate();
  const { code: routeCodeParam } = useParams<{ code?: string }>();
  const routeCode = (routeCodeParam || '').toUpperCase();
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole([1, 'Admin']);
  const [dictionaries, setDictionaries] = useState<ListDictionaryDto[]>([]);
  const [items, setItems] = useState<ListDictionaryItemDto[]>([]);
  const [dictionaryFilter, setDictionaryFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [isLoadingDictionaries, setIsLoadingDictionaries] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
  const [definitionDraft, setDefinitionDraft] = useState<DefinitionDraft>(newDefinition);
  const [editingItem, setEditingItem] = useState<ListDictionaryItemDto | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemValues, setItemValues] = useState<Record<string, string>>({});
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [displayFields, setDisplayFields] = useState<ListDictionaryFieldDto[]>([]);

  const selectedDictionary = useMemo(
    () => dictionaries.find(item => item.code === routeCode) || null,
    [dictionaries, routeCode],
  );

  const visibleFields = useMemo(
    () => (selectedDictionary?.fields || [])
      .filter(field => field.isVisible)
      .sort((left, right) => left.sortOrder - right.sortOrder),
    [selectedDictionary],
  );

  const filteredItems = useMemo(() => {
    const keyword = itemFilter.trim().toLocaleLowerCase('vi');
    if (!keyword) return items;
    return items.filter(item => visibleFields.some(field =>
      String(item.values[field.code] ?? '').toLocaleLowerCase('vi').includes(keyword),
    ));
  }, [itemFilter, items, visibleFields]);

  const filteredDictionaries = useMemo(() => {
    const keyword = dictionaryFilter.trim().toLocaleLowerCase('vi');
    if (!keyword) return dictionaries;
    return dictionaries.filter(item =>
      item.code.toLocaleLowerCase('vi').includes(keyword) ||
      item.name.toLocaleLowerCase('vi').includes(keyword),
    );
  }, [dictionaries, dictionaryFilter]);

  const totalFields = useMemo(
    () => dictionaries.reduce((total, item) => total + item.fields.length, 0),
    [dictionaries],
  );

  const loadDictionaries = async () => {
    try {
      setIsLoadingDictionaries(true);
      const data = await listDictionariesService.getAll();
      setDictionaries(data);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tải danh sách danh mục.');
    } finally {
      setIsLoadingDictionaries(false);
    }
  };

  const loadItems = async (code: string) => {
    if (!code) {
      setItems([]);
      return;
    }
    try {
      setIsLoadingItems(true);
      setItems(await listDictionariesService.getItems(code));
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tải dữ liệu danh mục.');
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    void loadDictionaries();
  }, []);

  useEffect(() => {
    setItemFilter('');
    void loadItems(routeCode);
  }, [routeCode]);

  const openDefinitionModal = () => {
    setDefinitionDraft(newDefinition());
    setIsDefinitionModalOpen(true);
  };

  const updateField = (key: string, patch: Partial<FieldDraft>) => {
    setDefinitionDraft(current => ({
      ...current,
      fields: current.fields.map(field => field.key === key ? { ...field, ...patch } : field),
    }));
  };

  const validateDefinition = () => {
    if (!definitionDraft.name.trim()) return 'Vui lòng nhập tên danh mục.';
    if (!/^[A-Z][A-Z0-9_]*$/.test(toCode(definitionDraft.code))) return 'Mã danh mục không hợp lệ.';
    if (definitionDraft.fields.length === 0) return 'Danh mục cần ít nhất một trường custom.';

    const codes = new Set<string>();
    for (const field of definitionDraft.fields) {
      const code = toCode(field.code);
      if (!field.name.trim() || !/^[A-Z][A-Z0-9_]*$/.test(code)) {
        return 'Vui lòng nhập đủ tên và mã hợp lệ cho tất cả các trường.';
      }
      if (codes.has(code)) return `Mã trường ${code} đang bị trùng.`;
      codes.add(code);
      if (field.dataType === 6) {
        const options = field.optionsText.split(',').map(item => item.trim()).filter(Boolean);
        if (options.length < 2) return `Trường ${field.name} cần ít nhất 2 lựa chọn.`;
      }
    }
    return null;
  };

  const submitDefinition = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateDefinition();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const request: CreateListDictionaryRequest = {
      code: toCode(definitionDraft.code),
      name: definitionDraft.name.trim(),
      description: definitionDraft.description.trim() || undefined,
      fields: definitionDraft.fields.map(field => ({
        code: toCode(field.code),
        name: field.name.trim(),
        dataType: field.dataType,
        isRequired: field.isRequired,
        options: field.dataType === 6
          ? field.optionsText.split(',').map(item => item.trim()).filter(Boolean)
          : [],
      })),
    };

    try {
      setIsSaving(true);
      const created = await listDictionariesService.create(request);
      setIsDefinitionModalOpen(false);
      await loadDictionaries();
      navigate(`/list-dictionaries/${encodeURIComponent(created.code)}`);
      setDisplayFields([...created.fields].sort((left, right) => left.sortOrder - right.sortOrder));
      setIsDisplayModalOpen(true);
      toast.success('Đã tạo danh mục custom.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tạo danh mục.');
    } finally {
      setIsSaving(false);
    }
  };

  const openItemModal = (item?: ListDictionaryItemDto) => {
    if (!selectedDictionary) return;
    setEditingItem(item || null);
    const values: Record<string, string> = {};
    selectedDictionary.fields.forEach(field => {
      const value = item?.values[field.code];
      values[field.code] = value === null || value === undefined ? '' : String(value);
    });
    setItemValues(values);
    setIsItemModalOpen(true);
  };

  const buildItemRequest = (): SaveListDictionaryItemRequest | null => {
    if (!selectedDictionary) return null;

    const values: Record<string, string | number | boolean> = {};
    for (const field of selectedDictionary.fields) {
      const rawValue = itemValues[field.code] ?? '';
      if (field.isRequired && rawValue === '') {
        toast.error(`Trường ${field.name} là bắt buộc.`);
        return null;
      }
      if (rawValue === '') continue;

      if (field.dataType === 2) {
        const numberValue = Number(rawValue);
        if (!Number.isFinite(numberValue)) {
          toast.error(`Trường ${field.name} phải là số.`);
          return null;
        }
        values[field.code] = numberValue;
      } else if (field.dataType === 3) {
        values[field.code] = rawValue === 'true';
      } else {
        values[field.code] = rawValue;
      }
    }
    return { values };
  };

  const submitItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDictionary) return;
    const request = buildItemRequest();
    if (!request) return;

    try {
      setIsSaving(true);
      if (editingItem) {
        await listDictionariesService.updateItem(selectedDictionary.code, editingItem.id, request);
        toast.success('Đã cập nhật bản ghi.');
      } else {
        await listDictionariesService.createItem(selectedDictionary.code, request);
        toast.success('Đã thêm bản ghi.');
      }
      setIsItemModalOpen(false);
      await Promise.all([
        loadDictionaries(),
        loadItems(selectedDictionary.code),
      ]);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể lưu bản ghi.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (item: ListDictionaryItemDto) => {
    if (!selectedDictionary || !window.confirm('Xóa bản ghi này?')) return;
    try {
      await listDictionariesService.deleteItem(selectedDictionary.code, item.id);
      await Promise.all([
        loadDictionaries(),
        loadItems(selectedDictionary.code),
      ]);
      toast.success('Đã xóa bản ghi.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể xóa bản ghi.');
    }
  };

  const openDisplayModal = (dictionary = selectedDictionary) => {
    if (!dictionary || !isAdmin) return;
    setDisplayFields([...dictionary.fields].sort((left, right) => left.sortOrder - right.sortOrder));
    setIsDisplayModalOpen(true);
  };

  const moveDisplayField = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= displayFields.length) return;
    setDisplayFields(current => {
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const submitDisplayConfiguration = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDictionary) return;
    if (!displayFields.some(field => field.isVisible)) {
      toast.error('Phải có ít nhất một trường được hiển thị.');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await listDictionariesService.updateDisplay(selectedDictionary.code, {
        fields: displayFields.map((field, index) => ({
          fieldId: field.id,
          isVisible: field.isVisible,
          sortOrder: index,
        })),
      });
      setDictionaries(current => current.map(item => item.code === updated.code ? updated : item));
      setIsDisplayModalOpen(false);
      toast.success('Đã lưu cấu hình hiển thị.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể lưu cấu hình hiển thị.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left text-on-surface animate-fadeIn">
      {!routeCode ? (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold font-sans">Danh mục custom</h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                Chọn một danh mục để xem dữ liệu. Admin có thể tạo danh mục và cấu hình các cột hiển thị.
              </p>
            </div>
            {isAdmin && (
              <button type="button" onClick={openDefinitionModal} className="btn-primary">
                <Plus className="h-4 w-4" /> Tạo danh mục
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card-surface p-4">
              <p className="text-xs font-semibold text-on-surface-variant">Tổng danh mục</p>
              <p className="mt-2 text-2xl font-black tabular-nums">{dictionaries.length}</p>
            </div>
            <div className="card-surface p-4">
              <p className="text-xs font-semibold text-on-surface-variant">Trường custom</p>
              <p className="mt-2 text-2xl font-black text-primary tabular-nums">{totalFields}</p>
            </div>
            <div className="card-surface p-4">
              <p className="text-xs font-semibold text-on-surface-variant">Tổng bản ghi</p>
              <p className="mt-2 text-2xl font-black text-success tabular-nums">
                {dictionaries.reduce((total, item) => total + item.itemCount, 0)}
              </p>
            </div>
          </div>

          <div className="card-surface p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={dictionaryFilter}
                onChange={event => setDictionaryFilter(event.target.value)}
                placeholder="Tìm theo tên hoặc mã danh mục..."
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface-2 pl-9 pr-3 text-sm focus:outline-primary"
              />
            </div>
          </div>

          {isLoadingDictionaries ? (
            <div className="card-surface py-16 text-center text-sm font-bold text-on-surface-variant">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải danh mục...
            </div>
          ) : filteredDictionaries.length === 0 ? (
            <div className="card-surface empty-state min-h-[320px]">
              <BookOpen className="mb-3 h-10 w-10 text-on-surface-variant/50" />
              <p className="font-bold text-on-surface-variant">Chưa có danh mục phù hợp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDictionaries.map(dictionary => (
                <button
                  key={dictionary.id}
                  type="button"
                  onClick={() => navigate(`/list-dictionaries/${encodeURIComponent(dictionary.code)}`)}
                  className="card-surface group flex min-h-32 items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-primary">
                    <Database className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-black">{dictionary.name}</span>
                    <span className="mt-1 block truncate font-mono text-[11px] font-bold text-primary">{dictionary.code}</span>
                    <span className="mt-2 block text-xs text-on-surface-variant">{dictionary.itemCount} bản ghi</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-on-surface-variant transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : isLoadingDictionaries ? (
        <div className="card-surface py-16 text-center text-sm font-bold text-on-surface-variant">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : !selectedDictionary ? (
        <div className="card-surface empty-state min-h-[420px]">
          <BookOpen className="mb-3 h-10 w-10 text-on-surface-variant/50" />
          <p className="font-bold text-on-surface-variant">Không tìm thấy danh mục.</p>
          <button type="button" onClick={() => navigate('/list-dictionaries')} className="btn-secondary mt-4">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => navigate('/list-dictionaries')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-2"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-black">{selectedDictionary.name}</h2>
                  <span className={selectedDictionary.isActive ? 'badge-success' : 'badge-error'}>
                    {selectedDictionary.isActive ? 'Đang hoạt động' : 'Đã tắt'}
                  </span>
                </div>
                {selectedDictionary.description && (
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">{selectedDictionary.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <button type="button" onClick={() => openDisplayModal()} className="btn-secondary h-10 px-4">
                  <Settings2 className="h-4 w-4" /> Cấu hình hiển thị
                </button>
              )}
              <button type="button" onClick={() => openItemModal()} className="btn-primary h-10 px-4">
                <Plus className="h-4 w-4" /> Thêm dữ liệu
              </button>
            </div>
          </div>

          <div className="card-surface overflow-hidden">
            <div className="border-b border-outline-variant p-4">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={itemFilter}
                  onChange={event => setItemFilter(event.target.value)}
                  placeholder="Tìm trong dữ liệu đang hiển thị..."
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface-2 pl-9 pr-3 text-sm focus:outline-primary"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-left text-xs"
                style={{ minWidth: Math.max(680, 260 + visibleFields.length * 180) }}
              >
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-2 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                    {visibleFields.map(field => (
                      <th key={field.id} className="px-4 py-3">{field.name}</th>
                    ))}
                    <th className="px-4 py-3">Audit</th>
                    <th className="px-4 py-3 text-right">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {isLoadingItems ? (
                    <tr>
                      <td colSpan={visibleFields.length + 2} className="py-12 text-center font-bold text-on-surface-variant">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={visibleFields.length + 2} className="py-12 text-center font-bold text-on-surface-variant">
                        {items.length === 0 ? 'Chưa có dữ liệu trong danh mục này.' : 'Không có dữ liệu phù hợp.'}
                      </td>
                    </tr>
                  ) : filteredItems.map(item => (
                    <tr key={item.id} className="transition-colors hover:bg-surface-2/60">
                      {visibleFields.map(field => (
                        <td key={field.id} className="max-w-[280px] truncate px-4 py-3 font-semibold" title={String(item.values[field.code] ?? '')}>
                          {formatValue(field, item.values[field.code])}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-[11px] text-on-surface-variant">
                        <span className="block">Tạo: {formatDateTime(item.createdAt)}</span>
                        {item.updatedAt && <span className="mt-1 block">Sửa: {formatDateTime(item.updatedAt)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openItemModal(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-outline-variant hover:bg-primary/10 hover:text-primary"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteItem(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-error/30 text-error hover:bg-error-container"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isDefinitionModalOpen && (
        <div className="modal-overlay">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface shadow-elevated">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface px-5 py-4">
              <div>
                <h3 className="text-lg font-black">Tạo danh mục custom</h3>
                <p className="mt-1 text-xs text-on-surface-variant">Định nghĩa thông tin chung và schema dữ liệu.</p>
              </div>
              <button type="button" onClick={() => setIsDefinitionModalOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitDefinition} className="space-y-6 p-5">
              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Thông tin danh mục</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold">
                    Tên danh mục *
                    <input
                      value={definitionDraft.name}
                      onChange={event => setDefinitionDraft(current => ({ ...current, name: event.target.value }))}
                      onBlur={() => setDefinitionDraft(current => ({ ...current, code: current.code || toCode(current.name) }))}
                      placeholder="Loại thiết bị"
                      className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Mã danh mục *
                    <input
                      value={definitionDraft.code}
                      onChange={event => setDefinitionDraft(current => ({ ...current, code: toCode(event.target.value) }))}
                      placeholder="DEVICE_TYPE"
                      className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 font-mono text-sm uppercase focus:outline-primary"
                    />
                  </label>
                </div>
                <label className="block text-sm font-bold">
                  Mô tả
                  <textarea
                    rows={2}
                    value={definitionDraft.description}
                    onChange={event => setDefinitionDraft(current => ({ ...current, description: event.target.value }))}
                    placeholder="Mục đích sử dụng của danh mục..."
                    className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-primary"
                  />
                </label>
              </section>

              <section className="space-y-3 border-t border-outline-variant pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Các trường custom</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Mã trường dùng làm key khi gọi API.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDefinitionDraft(current => ({ ...current, fields: [...current.fields, newField()] }))}
                    className="btn-secondary h-9 px-3"
                  >
                    <Plus className="h-4 w-4" /> Thêm trường
                  </button>
                </div>

                <div className="space-y-3">
                  {definitionDraft.fields.map((field, index) => (
                    <div key={field.key} className="rounded-xl border border-outline-variant bg-surface-2 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black text-on-surface-variant">Trường #{index + 1}</span>
                        <button
                          type="button"
                          disabled={definitionDraft.fields.length === 1}
                          onClick={() => setDefinitionDraft(current => ({
                            ...current,
                            fields: current.fields.filter(item => item.key !== field.key),
                          }))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded text-error hover:bg-error-container disabled:opacity-30"
                          title="Xóa trường"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="text-xs font-bold">
                          Tên hiển thị *
                          <input
                            value={field.name}
                            onChange={event => updateField(field.key, { name: event.target.value })}
                            onBlur={() => !field.code && updateField(field.key, { code: toCode(field.name) })}
                            placeholder="Tên thiết bị"
                            className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                          />
                        </label>
                        <label className="text-xs font-bold">
                          Mã trường *
                          <input
                            value={field.code}
                            onChange={event => updateField(field.key, { code: toCode(event.target.value) })}
                            placeholder="DEVICE_NAME"
                            className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 font-mono text-sm focus:outline-primary"
                          />
                        </label>
                        <label className="text-xs font-bold">
                          Kiểu dữ liệu *
                          <select
                            value={field.dataType}
                            onChange={event => updateField(field.key, { dataType: Number(event.target.value) as ListDictionaryFieldType })}
                            className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                          >
                            {FIELD_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                          </select>
                        </label>
                        <label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 text-xs font-bold">
                          <input
                            type="checkbox"
                            checked={field.isRequired}
                            onChange={event => updateField(field.key, { isRequired: event.target.checked })}
                            className="h-4 w-4 accent-primary"
                          />
                          Bắt buộc nhập
                        </label>
                      </div>
                      {field.dataType === 6 && (
                        <label className="mt-3 block text-xs font-bold">
                          Danh sách lựa chọn *
                          <input
                            value={field.optionsText}
                            onChange={event => updateField(field.key, { optionsText: event.target.value })}
                            placeholder="Đang dùng, Bảo trì, Ngừng dùng"
                            className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                          />
                          <span className="mt-1 block font-medium text-on-surface-variant">Phân tách các lựa chọn bằng dấu phẩy.</span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsDefinitionModalOpen(false)} className="btn-secondary h-10 px-4">Hủy</button>
                <button type="submit" disabled={isSaving} className="btn-primary h-10 px-5">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isSaving ? 'Đang tạo...' : 'Tạo danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDisplayModalOpen && selectedDictionary && (
        <div className="modal-overlay">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface shadow-elevated">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-black">Cấu hình hiển thị</h3>
                <p className="mt-1 text-xs text-on-surface-variant">Chọn và sắp xếp các cột xuất hiện trong bảng dữ liệu.</p>
              </div>
              <button type="button" onClick={() => setIsDisplayModalOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitDisplayConfiguration} className="space-y-4 p-5">
              <div className="space-y-2">
                {displayFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-2 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface font-mono text-xs font-black text-on-surface-variant">
                      {index + 1}
                    </span>
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={field.isVisible}
                        onChange={event => setDisplayFields(current => current.map(item =>
                          item.id === field.id ? { ...item, isVisible: event.target.checked } : item,
                        ))}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{field.name}</span>
                        <span className="block truncate font-mono text-[10px] text-on-surface-variant">{field.code}</span>
                      </span>
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveDisplayField(index, -1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-outline-variant bg-surface hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                        title="Đưa lên"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === displayFields.length - 1}
                        onClick={() => moveDisplayField(index, 1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-outline-variant bg-surface hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                        title="Đưa xuống"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-on-surface-variant">
                Mã bản ghi không hiển thị trên giao diện và được hệ thống tự động cấp theo số thứ tự.
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsDisplayModalOpen(false)} className="btn-secondary h-10 px-4">Hủy</button>
                <button type="submit" disabled={isSaving} className="btn-primary h-10 px-5">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isItemModalOpen && selectedDictionary && (
        <div className="modal-overlay">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface shadow-elevated">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-black">{editingItem ? 'Sửa bản ghi' : 'Thêm bản ghi'}</h3>
                <p className="mt-1 font-mono text-xs font-bold text-primary">{selectedDictionary.code}</p>
              </div>
              <button type="button" onClick={() => setIsItemModalOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitItem} className="space-y-4 p-5">
              <div>
                <p className="mb-4 text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Dữ liệu custom</p>
                <div className="space-y-4">
                  {selectedDictionary.fields.map(field => (
                    <label key={field.id} className="block text-sm font-bold">
                      {field.name} {field.isRequired && <span className="text-error">*</span>}
                      <span className="ml-2 font-mono text-[10px] font-medium text-on-surface-variant">{field.code}</span>
                      {field.dataType === 3 ? (
                        <select
                          value={itemValues[field.code] ?? ''}
                          onChange={event => setItemValues(current => ({ ...current, [field.code]: event.target.value }))}
                          className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                        >
                          {!field.isRequired && <option value="">Chưa chọn</option>}
                          <option value="true">Có</option>
                          <option value="false">Không</option>
                        </select>
                      ) : field.dataType === 6 ? (
                        <select
                          value={itemValues[field.code] ?? ''}
                          onChange={event => setItemValues(current => ({ ...current, [field.code]: event.target.value }))}
                          className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                        >
                          <option value="">Chọn giá trị</option>
                          {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.dataType === 2 ? 'number' : field.dataType === 4 ? 'date' : field.dataType === 5 ? 'datetime-local' : 'text'}
                          step={field.dataType === 2 ? 'any' : undefined}
                          value={itemValues[field.code] ?? ''}
                          onChange={event => setItemValues(current => ({ ...current, [field.code]: event.target.value }))}
                          className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="btn-secondary h-10 px-4">Hủy</button>
                <button type="submit" disabled={isSaving} className="btn-primary h-10 px-5">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Thêm bản ghi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
