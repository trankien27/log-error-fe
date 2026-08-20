import React, { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  Edit3,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Settings2,
  Table,
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
import {
  buildImportItems,
  ExcelDictionaryDraft,
  ExcelImportFieldDraft,
  formatExcelPreviewValue,
  parseExcelDictionaryFile,
} from '../utils/excelDictionaryImport';

const FIELD_TYPES: Array<{ value: ListDictionaryFieldType; label: string }> = [
  { value: 1, label: 'Văn bản' },
  { value: 2, label: 'Số' },
  { value: 3, label: 'Đúng / Sai' },
  { value: 4, label: 'Ngày' },
  { value: 5, label: 'Ngày giờ' },
  { value: 6, label: 'Một lựa chọn' },
];

const IMPORT_FIELD_TYPES = FIELD_TYPES.filter(type => type.value !== 6);

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

type ImportDefinitionDraft = {
  code: string;
  name: string;
  description: string;
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

function buildItemValues(
  fields: ListDictionaryFieldDto[],
  raw: Record<string, string>,
): { values: Record<string, string | number | boolean> } | { error: string } {
  const values: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    const rawValue = raw[field.code] ?? '';
    if (field.isRequired && rawValue === '') return { error: `Trường ${field.name} là bắt buộc.` };
    if (rawValue === '') continue;

    if (field.dataType === 2) {
      const numberValue = Number(rawValue);
      if (!Number.isFinite(numberValue)) return { error: `Trường ${field.name} phải là số.` };
      values[field.code] = numberValue;
    } else if (field.dataType === 3) {
      values[field.code] = rawValue === 'true';
    } else {
      values[field.code] = rawValue;
    }
  }
  return { values };
}

type EditableCellProps = {
  field: ListDictionaryFieldDto;
  rawValue: string;
  display: React.ReactNode;
  isEditing: boolean;
  isSaving: boolean;
  isSaved: boolean;
  onBegin: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

function EditableCell({
  field,
  rawValue,
  display,
  isEditing,
  isSaving,
  isSaved,
  onBegin,
  onCommit,
  onCancel,
}: EditableCellProps) {
  const [draft, setDraft] = useState(rawValue);
  const committedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    setDraft(rawValue);
    committedRef.current = false;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isEditing, rawValue]);

  const commit = (value: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(value);
  };

  if (!isEditing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onBegin}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            onBegin();
          }
        }}
        className={`flex min-h-[40px] w-full cursor-text items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40 ${
          isSaved ? 'ring-2 ring-inset ring-success/60' : ''
        }`}
        title="Bấm để sửa"
      >
        <span className="min-w-0 flex-1 truncate">{display}</span>
        {isSaving && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
      </div>
    );
  }

  const editorClass = 'h-[40px] w-full border-0 bg-primary/5 px-3 text-xs font-semibold text-on-surface ring-2 ring-inset ring-primary/60 focus:outline-none';
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  if (field.dataType === 3 || field.dataType === 6) {
    const options = field.dataType === 3
      ? [{ value: 'true', label: 'Có' }, { value: 'false', label: 'Không' }]
      : field.options.map(option => ({ value: option, label: option }));
    return (
      <select
        ref={element => { inputRef.current = element; }}
        value={draft}
        onChange={event => { setDraft(event.target.value); commit(event.target.value); }}
        onBlur={() => { if (!committedRef.current) onCancel(); }}
        onKeyDown={handleKeyDown}
        className={editorClass}
      >
        <option value="">—</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }

  const inputType = field.dataType === 2
    ? 'number'
    : field.dataType === 4
    ? 'date'
    : field.dataType === 5
    ? 'datetime-local'
    : 'text';
  return (
    <input
      ref={element => { inputRef.current = element; }}
      type={inputType}
      step={field.dataType === 2 ? 'any' : undefined}
      value={field.dataType === 5 ? draft.slice(0, 16) : draft}
      onChange={event => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => commit(draft)}
      className={editorClass}
    />
  );
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
  const [deletingDictionaryCode, setDeletingDictionaryCode] = useState<string | null>(null);
  const [renamingDictionary, setRenamingDictionary] = useState<ListDictionaryDto | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
  const [definitionDraft, setDefinitionDraft] = useState<DefinitionDraft>(newDefinition);
  const [editingItem, setEditingItem] = useState<ListDictionaryItemDto | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemValues, setItemValues] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [editingCell, setEditingCell] = useState<{ itemId: number; fieldCode: string } | null>(null);
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [savedCellKey, setSavedCellKey] = useState<string | null>(null);
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [displayDictionaryCodes, setDisplayDictionaryCodes] = useState<string[]>([]);
  const [displayFilter, setDisplayFilter] = useState('');
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelImportDraft, setExcelImportDraft] = useState<ExcelDictionaryDraft | null>(null);
  const [importDefinition, setImportDefinition] = useState<ImportDefinitionDraft>({
    code: '',
    name: '',
    description: '',
  });

  const selectedDictionary = useMemo(
    () => dictionaries.find(item => item.code === routeCode) || null,
    [dictionaries, routeCode],
  );

  const dataFields = useMemo(
    () => (selectedDictionary?.fields || [])
      .sort((left, right) => left.sortOrder - right.sortOrder),
    [selectedDictionary],
  );

  const filteredItems = useMemo(() => {
    const keyword = itemFilter.trim().toLocaleLowerCase('vi');
    if (!keyword) return items;
    return items.filter(item => dataFields.some(field =>
      String(item.values[field.code] ?? '').toLocaleLowerCase('vi').includes(keyword),
    ));
  }, [itemFilter, items, dataFields]);

  const filteredDictionaries = useMemo(() => {
    const keyword = dictionaryFilter.trim().toLocaleLowerCase('vi');
    if (!keyword) return dictionaries;
    return dictionaries.filter(item =>
      item.code.toLocaleLowerCase('vi').includes(keyword) ||
      item.name.toLocaleLowerCase('vi').includes(keyword),
    );
  }, [dictionaries, dictionaryFilter]);

  const filteredDisplayDictionaries = useMemo(() => {
    const keyword = displayFilter.trim().toLocaleLowerCase('vi');
    if (!keyword) return dictionaries;
    return dictionaries.filter(item =>
      item.code.toLocaleLowerCase('vi').includes(keyword) ||
      item.name.toLocaleLowerCase('vi').includes(keyword),
    );
  }, [dictionaries, displayFilter]);

  const displayCodeSet = useMemo(
    () => new Set(displayDictionaryCodes),
    [displayDictionaryCodes],
  );

  const isDisplayConfigurationDirty = useMemo(
    () => dictionaries.some(dictionary =>
      dictionary.isVisibleInSidebar !== displayCodeSet.has(dictionary.code),
    ),
    [dictionaries, displayCodeSet],
  );

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
    setEditingCell(null);
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
      toast.success('Đã tạo danh mục custom.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tạo danh mục.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setIsParsingExcel(true);
      const draft = await parseExcelDictionaryFile(file);
      const baseName = file.name.replace(/\.xlsx$/i, '').replace(/[_-]+/g, ' ').trim();
      setExcelImportDraft(draft);
      setImportDefinition({
        code: toCode(baseName).slice(0, 50).replace(/_+$/g, ''),
        name: (baseName || 'Danh mục import').slice(0, 150),
        description: `Import từ file ${file.name}`,
      });
      setIsImportModalOpen(true);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể đọc file Excel.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  const updateExcelImportField = (key: string, patch: Partial<ExcelImportFieldDraft>) => {
    setExcelImportDraft(current => current ? {
      ...current,
      fields: current.fields.map(field => field.key === key ? { ...field, ...patch } : field),
    } : current);
  };

  const submitExcelImport = async (event: FormEvent) => {
    event.preventDefault();
    if (!excelImportDraft) return;

    const dictionaryCode = toCode(importDefinition.code);
    if (!importDefinition.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục.');
      return;
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(dictionaryCode)) {
      toast.error('Mã danh mục không hợp lệ.');
      return;
    }

    const fieldCodes = new Set<string>();
    for (const field of excelImportDraft.fields) {
      const fieldCode = toCode(field.code);
      if (!field.name.trim() || !/^[A-Z][A-Z0-9_]*$/.test(fieldCode)) {
        toast.error(`Mapping của header “${field.sourceHeader}” chưa hợp lệ.`);
        return;
      }
      if (fieldCodes.has(fieldCode)) {
        toast.error(`Mã trường ${fieldCode} đang bị trùng.`);
        return;
      }
      fieldCodes.add(fieldCode);
    }

    const normalizedFields = excelImportDraft.fields.map(field => ({
      ...field,
      code: toCode(field.code),
      name: field.name.trim(),
    }));
    let items: Array<Record<string, string | number | boolean>>;
    try {
      items = buildImportItems(normalizedFields, excelImportDraft.rows);
    } catch (error: any) {
      toast.error(error?.message || 'Dữ liệu Excel không hợp lệ.');
      return;
    }

    try {
      setIsSaving(true);
      const created = await listDictionariesService.importExcel({
        code: dictionaryCode,
        name: importDefinition.name.trim(),
        description: importDefinition.description.trim() || undefined,
        isVisibleInSidebar: false,
        fields: normalizedFields.map(field => ({
          code: field.code,
          name: field.name,
          dataType: field.dataType,
          isRequired: field.isRequired,
          options: [],
        })),
        items,
      });

      setIsImportModalOpen(false);
      setExcelImportDraft(null);
      await loadDictionaries();
      window.dispatchEvent(new Event('list-dictionaries:sidebar-updated'));
      navigate(`/list-dictionaries/${encodeURIComponent(created.code)}`);
      toast.success(`Đã tạo danh mục và import ${created.itemCount} bản ghi.`);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể import danh mục từ Excel.');
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

  const cellKey = (itemId: number, fieldCode: string) => `${itemId}::${fieldCode}`;

  const beginCellEdit = (itemId: number, fieldCode: string) => {
    if (savingCellKey) return;
    setEditingCell({ itemId, fieldCode });
  };

  const commitCell = async (
    item: ListDictionaryItemDto,
    field: ListDictionaryFieldDto,
    rawValue: string,
  ) => {
    if (!selectedDictionary) return;

    const currentValue = item.values[field.code];
    const currentRaw = currentValue === null || currentValue === undefined ? '' : String(currentValue);
    if (rawValue === currentRaw) {
      setEditingCell(null);
      return;
    }

    const raw: Record<string, string> = {};
    selectedDictionary.fields.forEach(current => {
      const value = item.values[current.code];
      raw[current.code] = value === null || value === undefined ? '' : String(value);
    });
    raw[field.code] = rawValue;

    const built = buildItemValues(selectedDictionary.fields, raw);
    if ('error' in built) {
      toast.error(built.error);
      setEditingCell(null);
      return;
    }

    const key = cellKey(item.id, field.code);
    try {
      setSavingCellKey(key);
      const updated = await listDictionariesService.updateItem(selectedDictionary.code, item.id, { values: built.values });
      setItems(current => current.map(existing => existing.id === item.id ? updated : existing));
      setSavedCellKey(key);
      window.setTimeout(() => setSavedCellKey(current => (current === key ? null : current)), 1200);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể lưu ô dữ liệu.');
    } finally {
      setSavingCellKey(null);
      setEditingCell(null);
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

  const deleteDictionary = async (dictionary: ListDictionaryDto) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Xoá danh mục “${dictionary.name}”?\n\nToàn bộ ${dictionary.itemCount} bản ghi và các trường custom bên trong sẽ bị xoá khỏi hệ thống.`,
    );
    if (!confirmed) return;

    try {
      setDeletingDictionaryCode(dictionary.code);
      await listDictionariesService.deleteDictionary(dictionary.code);
      setDictionaries(current => current.filter(item => item.code !== dictionary.code));
      setDisplayDictionaryCodes(current => current.filter(code => code !== dictionary.code));
      window.dispatchEvent(new Event('list-dictionaries:sidebar-updated'));
      toast.success(`Đã xoá danh mục ${dictionary.name}.`);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể xoá danh mục.');
    } finally {
      setDeletingDictionaryCode(null);
    }
  };

  const openRenameModal = (dictionary: ListDictionaryDto) => {
    if (!isAdmin) return;
    setRenamingDictionary(dictionary);
    setRenameDraft(dictionary.name);
  };

  const submitRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!renamingDictionary) return;

    const name = renameDraft.trim();
    if (!name) {
      toast.error('Vui lòng nhập tên danh mục.');
      return;
    }
    if (name.length > 150) {
      toast.error('Tên danh mục không được vượt quá 150 ký tự.');
      return;
    }

    try {
      setIsRenaming(true);
      const updated = await listDictionariesService.rename(renamingDictionary.code, { name });
      setDictionaries(current => current.map(item => item.code === updated.code ? updated : item));
      setRenamingDictionary(null);
      window.dispatchEvent(new Event('list-dictionaries:sidebar-updated'));
      toast.success('Đã đổi tên danh mục.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể đổi tên danh mục.');
    } finally {
      setIsRenaming(false);
    }
  };

  const openDisplayModal = () => {
    if (!isAdmin) return;
    setDisplayDictionaryCodes(
      dictionaries.filter(dictionary => dictionary.isVisibleInSidebar).map(dictionary => dictionary.code),
    );
    setDisplayFilter('');
    setIsDisplayModalOpen(true);
  };

  const toggleDisplayDictionary = (code: string) => {
    setDisplayDictionaryCodes(current => current.includes(code)
      ? current.filter(item => item !== code)
      : [...current, code]);
  };

  const submitDisplayConfiguration = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      const savedCodes = await listDictionariesService.updateSidebarDisplay({
        visibleDictionaryCodes: displayDictionaryCodes,
      });
      const savedCodeSet = new Set(savedCodes);
      setDictionaries(current => current.map(item => ({
        ...item,
        isVisibleInSidebar: savedCodeSet.has(item.code),
      })));
      setIsDisplayModalOpen(false);
      window.dispatchEvent(new Event('list-dictionaries:sidebar-updated'));
      toast.success(`Đã cấu hình ${savedCodes.length} danh mục hiển thị trên sidebar.`);
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
              <h2 className="text-xl font-bold font-sans">Quản lý danh mục</h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                Chọn một danh mục để xem dữ liệu. Admin có thể cấu hình danh mục xuất hiện trong “Danh mục khác”.
              </p>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <input
                  ref={excelFileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleExcelFile}
                  className="hidden"
                />
                <button type="button" onClick={openDisplayModal} className="btn-secondary">
                  <Settings2 className="h-4 w-4" /> Cấu hình hiển thị
                </button>
                <button
                  type="button"
                  disabled={isParsingExcel}
                  onClick={() => excelFileInputRef.current?.click()}
                  className="btn-secondary"
                >
                  {isParsingExcel
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <FileSpreadsheet className="h-4 w-4" />}
                  {isParsingExcel ? 'Đang đọc file...' : 'Import Excel'}
                </button>
                <button type="button" onClick={openDefinitionModal} className="btn-primary">
                  <Plus className="h-4 w-4" /> Tạo danh mục
                </button>
              </div>
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
                <div
                  key={dictionary.id}
                  className="card-surface group relative min-h-32 overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/list-dictionaries/${encodeURIComponent(dictionary.code)}`)}
                    className="flex min-h-32 w-full items-center gap-4 p-5 pr-24 text-left"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-primary">
                      <Database className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-black">{dictionary.name}</span>
                      <span className="mt-1 block truncate font-mono text-[11px] font-bold text-primary">{dictionary.code}</span>
                      <span className="mt-2 block text-xs text-on-surface-variant">{dictionary.itemCount} bản ghi</span>
                      {isAdmin && (
                        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                          dictionary.isVisibleInSidebar
                            ? 'bg-success-container text-success'
                            : 'bg-surface-2 text-on-surface-variant'
                        }`}>
                          {dictionary.isVisibleInSidebar ? 'Đang hiện ở sidebar' : 'Đang ẩn ở sidebar'}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </button>
                  {isAdmin && (
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openRenameModal(dictionary)}
                        disabled={deletingDictionaryCode !== null}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-surface text-primary shadow-sm transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                        title={`Đổi tên danh mục ${dictionary.name}`}
                        aria-label={`Đổi tên danh mục ${dictionary.name}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDictionary(dictionary)}
                        disabled={deletingDictionaryCode !== null}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-error/20 bg-surface text-error shadow-sm transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
                        title={`Xoá danh mục ${dictionary.name}`}
                        aria-label={`Xoá danh mục ${dictionary.name}`}
                      >
                        {deletingDictionaryCode === dictionary.code
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-outline-variant bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-colors ${
                    viewMode === 'table' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-2'
                  }`}
                  title="Xem dạng bảng"
                >
                  <Table className="h-4 w-4" /> Bảng
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-2'
                  }`}
                  title="Sửa trực tiếp như Excel"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </button>
              </div>
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

            {viewMode === 'grid' && (
              <div className="flex items-center gap-2 border-b border-outline-variant bg-primary/5 px-4 py-2 text-[11px] font-semibold text-on-surface-variant">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                Chế độ Excel — bấm vào ô để sửa trực tiếp vào bản ghi. Enter để lưu, Esc để hủy.
              </div>
            )}
            <div className="overflow-x-auto">
              {viewMode === 'grid' ? (
                <table
                  className="w-full border-collapse text-left text-xs"
                  style={{ minWidth: Math.max(680, 120 + dataFields.length * 180) }}
                >
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-2 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                      <th className="w-12 px-2 py-3 text-center">#</th>
                      {dataFields.map(field => (
                        <th key={field.id} className="border-l border-outline-variant/40 px-3 py-3">
                          {field.name}{field.isRequired && <span className="text-error"> *</span>}
                        </th>
                      ))}
                      <th className="w-14 px-2 py-3 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {isLoadingItems ? (
                      <tr>
                        <td colSpan={dataFields.length + 2} className="py-12 text-center font-bold text-on-surface-variant">
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={dataFields.length + 2} className="py-12 text-center font-bold text-on-surface-variant">
                          {items.length === 0 ? 'Chưa có dữ liệu trong danh mục này.' : 'Không có dữ liệu phù hợp.'}
                        </td>
                      </tr>
                    ) : filteredItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-surface-2/20">
                        <td className="px-2 py-2 text-center font-mono text-[11px] text-on-surface-variant">{index + 1}</td>
                        {dataFields.map(field => {
                          const cellValue = item.values[field.code];
                          const rawValue = cellValue === null || cellValue === undefined ? '' : String(cellValue);
                          const key = cellKey(item.id, field.code);
                          return (
                            <td key={field.id} className="border-l border-outline-variant/40 p-0 align-middle">
                              <EditableCell
                                field={field}
                                rawValue={rawValue}
                                display={formatValue(field, cellValue)}
                                isEditing={editingCell?.itemId === item.id && editingCell?.fieldCode === field.code}
                                isSaving={savingCellKey === key}
                                isSaved={savedCellKey === key}
                                onBegin={() => beginCellEdit(item.id, field.code)}
                                onCommit={value => void commitCell(item, field, value)}
                                onCancel={() => setEditingCell(null)}
                              />
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => void deleteItem(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-error/30 text-error hover:bg-error-container"
                            title="Xóa bản ghi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
              <table
                className="w-full border-collapse text-left text-xs"
                style={{ minWidth: Math.max(680, 260 + dataFields.length * 180) }}
              >
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-2 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                    {dataFields.map(field => (
                      <th key={field.id} className="px-4 py-3">{field.name}</th>
                    ))}
                    <th className="px-4 py-3">Audit</th>
                    <th className="px-4 py-3 text-right">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {isLoadingItems ? (
                    <tr>
                      <td colSpan={dataFields.length + 2} className="py-12 text-center font-bold text-on-surface-variant">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={dataFields.length + 2} className="py-12 text-center font-bold text-on-surface-variant">
                        {items.length === 0 ? 'Chưa có dữ liệu trong danh mục này.' : 'Không có dữ liệu phù hợp.'}
                      </td>
                    </tr>
                  ) : filteredItems.map(item => (
                    <tr key={item.id} className="transition-colors hover:bg-surface-2/60">
                      {dataFields.map(field => (
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
              )}
            </div>
          </div>
        </>
      )}

      {isImportModalOpen && excelImportDraft && (
        <div className="modal-overlay">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface shadow-elevated">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface px-5 py-4">
              <div>
                <h3 className="text-lg font-black">Xác nhận import Excel</h3>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {excelImportDraft.fileName} · Header dòng {excelImportDraft.headerRowNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setExcelImportDraft(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitExcelImport} className="space-y-6 p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-outline-variant bg-surface-2 p-3">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant">Số cột</p>
                  <p className="mt-1 text-xl font-black text-primary">{excelImportDraft.fields.length}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-2 p-3">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant">Dòng dữ liệu</p>
                  <p className="mt-1 text-xl font-black text-success">{excelImportDraft.rows.length}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-2 p-3">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant">Trường bắt buộc</p>
                  <p className="mt-1 text-xl font-black">{excelImportDraft.fields.filter(field => field.isRequired).length}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-2 p-3">
                  <p className="text-[10px] font-black uppercase text-on-surface-variant">Sheet sử dụng</p>
                  <p className="mt-1 text-sm font-black">Sheet đầu tiên</p>
                </div>
              </div>

              <section className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Thông tin danh mục sẽ tạo</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold">
                    Tên danh mục *
                    <input
                      value={importDefinition.name}
                      maxLength={150}
                      onChange={event => setImportDefinition(current => ({ ...current, name: event.target.value }))}
                      className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm focus:outline-primary"
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Mã danh mục *
                    <input
                      value={importDefinition.code}
                      maxLength={50}
                      onChange={event => setImportDefinition(current => ({ ...current, code: toCode(event.target.value) }))}
                      className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 font-mono text-sm uppercase focus:outline-primary"
                    />
                  </label>
                </div>
                <label className="block text-sm font-bold">
                  Mô tả
                  <textarea
                    rows={2}
                    value={importDefinition.description}
                    onChange={event => setImportDefinition(current => ({ ...current, description: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-primary"
                  />
                </label>
              </section>

              <section className="space-y-3 border-t border-outline-variant pt-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Mapping header thành field</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Hệ thống đã tự suy luận kiểu dữ liệu; bạn có thể chỉnh trước khi xác nhận.</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-outline-variant">
                  <table className="w-full min-w-[920px] text-left text-xs">
                    <thead className="bg-surface-2 text-[10px] font-black uppercase text-on-surface-variant">
                      <tr>
                        <th className="px-3 py-3">Header Excel</th>
                        <th className="px-3 py-3">Tên field</th>
                        <th className="px-3 py-3">Mã field</th>
                        <th className="px-3 py-3">Kiểu dữ liệu</th>
                        <th className="px-3 py-3 text-center">Bắt buộc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/50">
                      {excelImportDraft.fields.map(field => (
                        <tr key={field.key}>
                          <td className="max-w-48 px-3 py-2 font-bold" title={field.sourceHeader}>{field.sourceHeader}</td>
                          <td className="px-3 py-2">
                            <input
                              value={field.name}
                              maxLength={150}
                              onChange={event => updateExcelImportField(field.key, { name: event.target.value })}
                              className="h-9 w-full rounded border border-outline-variant px-2 text-xs focus:outline-primary"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={field.code}
                              maxLength={50}
                              onChange={event => updateExcelImportField(field.key, { code: toCode(event.target.value) })}
                              className="h-9 w-full rounded border border-outline-variant px-2 font-mono text-xs uppercase focus:outline-primary"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={field.dataType}
                              onChange={event => updateExcelImportField(field.key, {
                                dataType: Number(event.target.value) as ListDictionaryFieldType,
                              })}
                              className="h-9 w-full rounded border border-outline-variant bg-surface px-2 text-xs focus:outline-primary"
                            >
                              {IMPORT_FIELD_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={field.isRequired}
                              onChange={event => updateExcelImportField(field.key, { isRequired: event.target.checked })}
                              className="h-4 w-4 accent-primary"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3 border-t border-outline-variant pt-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Xem trước dữ liệu</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Hiển thị tối đa 10 dòng đầu tiên sau header.</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-outline-variant">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="bg-surface-2 text-[10px] font-black uppercase text-on-surface-variant">
                      <tr>
                        <th className="px-3 py-3">Dòng</th>
                        {excelImportDraft.fields.map(field => <th key={field.key} className="px-3 py-3">{field.name}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/50">
                      {excelImportDraft.rows.slice(0, 10).map(row => (
                        <tr key={row.sourceRowNumber}>
                          <td className="px-3 py-2 font-mono text-on-surface-variant">{row.sourceRowNumber}</td>
                          {excelImportDraft.fields.map(field => (
                            <td key={field.key} className="max-w-60 truncate px-3 py-2" title={formatExcelPreviewValue(row.values[field.sourceIndex])}>
                              {formatExcelPreviewValue(row.values[field.sourceIndex])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-on-surface-variant">
                Chưa có dữ liệu nào được tạo. Khi bấm xác nhận, backend sẽ kiểm tra lại toàn bộ và tạo danh mục cùng dữ liệu trong một lần.
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setExcelImportDraft(null);
                  }}
                  className="btn-secondary h-10 px-4"
                >
                  Hủy
                </button>
                <button type="submit" disabled={isSaving} className="btn-primary h-10 px-5">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isSaving ? 'Đang import...' : `Xác nhận import ${excelImportDraft.rows.length} dòng`}
                </button>
              </div>
            </form>
          </div>
        </div>
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

      {renamingDictionary && isAdmin && (
        <div className="modal-overlay">
          <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface shadow-elevated">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-black">Đổi tên danh mục</h3>
                <p className="mt-1 text-xs text-on-surface-variant">Mã danh mục và dữ liệu bên trong không thay đổi.</p>
              </div>
              <button
                type="button"
                onClick={() => setRenamingDictionary(null)}
                disabled={isRenaming}
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface-2 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitRename} className="space-y-4 p-5">
              <label className="block text-sm font-bold">
                Tên danh mục mới *
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={event => setRenameDraft(event.target.value)}
                  maxLength={150}
                  className="mt-1.5 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-primary"
                />
              </label>
              <div className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-xs text-on-surface-variant">
                Mã giữ nguyên: <span className="font-mono font-black text-primary">{renamingDictionary.code}</span>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRenamingDictionary(null)}
                  disabled={isRenaming}
                  className="btn-secondary h-10 px-4"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !renameDraft.trim() || renameDraft.trim() === renamingDictionary.name}
                  className="btn-primary h-10 px-5"
                >
                  {isRenaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                  {isRenaming ? 'Đang lưu...' : 'Lưu tên mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDisplayModalOpen && isAdmin && (
        <div className="modal-overlay">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-outline-variant bg-surface shadow-elevated">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="text-lg font-black">Cấu hình hiển thị trên sidebar</h3>
                <p className="mt-1 text-xs text-on-surface-variant">Tích các danh mục sẽ xuất hiện trong nhóm “Danh mục khác”.</p>
              </div>
              <button type="button" onClick={() => setIsDisplayModalOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitDisplayConfiguration} className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black">
                  Đã chọn <span className="text-primary">{displayDictionaryCodes.length}/{dictionaries.length}</span> danh mục
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDisplayDictionaryCodes(dictionaries.map(dictionary => dictionary.code))}
                    className="btn-ghost h-9 px-3 text-xs"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayDictionaryCodes([])}
                    className="btn-ghost h-9 px-3 text-xs"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={displayFilter}
                  onChange={event => setDisplayFilter(event.target.value)}
                  placeholder="Tìm theo tên hoặc mã danh mục..."
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface-2 pl-9 pr-3 text-sm focus:outline-primary"
                />
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredDisplayDictionaries.map(dictionary => (
                  <label
                    key={dictionary.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                      displayCodeSet.has(dictionary.code)
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-outline-variant bg-surface hover:bg-surface-2'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={displayCodeSet.has(dictionary.code)}
                      onChange={() => toggleDisplayDictionary(dictionary.code)}
                      className="h-5 w-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{dictionary.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] font-bold text-on-surface-variant">
                        {dictionary.code}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant">{dictionary.itemCount} bản ghi</span>
                  </label>
                ))}
                {filteredDisplayDictionaries.length === 0 && (
                  <div className="rounded-xl border border-dashed border-outline-variant py-8 text-center text-sm font-bold text-on-surface-variant">
                    Không tìm thấy danh mục phù hợp.
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-on-surface-variant">
                Các thay đổi chỉ được áp dụng sau khi bấm “Lưu cấu hình”.
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsDisplayModalOpen(false)} className="btn-secondary h-10 px-4">Hủy</button>
                <button type="submit" disabled={isSaving || !isDisplayConfigurationDirty} className="btn-primary h-10 px-5">
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
