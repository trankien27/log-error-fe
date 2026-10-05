import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { themeToolsService } from '../../../services/api/themeToolsService';
import type { SaveThemeUploadProfile, ThemeCategory, ThemeList, ThemeUploadProfile, ThemeUploadValues } from '../types';

type UploadProfile = Pick<
  ThemeUploadValues,
  'color' | 'themeCategoryId' | 'themeListIds' | 'orderNo' | 'layoutListId' | 'isDisplayOnLiveview'
>;

type ThemeUploadDialogProps = {
  open: boolean;
  loading: boolean;
  categories: ThemeCategory[];
  themeLists: ThemeList[];
  fallbackThumbnailName?: string;
  onClose: () => void;
  onSubmit: (values: ThemeUploadValues) => Promise<void>;
};

const PROFILE_STORAGE_KEY = 'theme-image-tools:upload-profiles:v1';

function readProfiles(): Record<string, UploadProfile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}') as Record<string, UploadProfile>;
  } catch {
    return {};
  }
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export default function ThemeUploadDialog({
  open,
  loading,
  categories,
  themeLists,
  fallbackThumbnailName,
  onClose,
  onSubmit,
}: ThemeUploadDialogProps) {
  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const categorySearchRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#f16d94');
  const [categoryId, setCategoryId] = useState(0);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [selectedThemeListIds, setSelectedThemeListIds] = useState<number[]>([]);
  const [orderNo, setOrderNo] = useState('');
  const [layoutListId, setLayoutListId] = useState('61');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [isLiveView, setIsLiveView] = useState(true);
  const [themeListSearch, setThemeListSearch] = useState('');
  const [profiles, setProfiles] = useState<ThemeUploadProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState(0);
  const [newProfileName, setNewProfileName] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!open) {
      setCategoryPickerOpen(false);
      setCategorySearch('');
      return;
    }
    let active = true;
    const loadProfiles = async () => {
      setLoadingProfiles(true);
      try {
        const shared = await themeToolsService.getUploadProfiles();
        if (!active) return;
        const local = readProfiles();
        const localEntries = Object.entries(local);
        let skipped = 0;
        for (const [name, profile] of localEntries) {
          if (!active) break;
          const existing = shared.find(item => item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
          if (existing && existing.color === profile.color &&
              existing.themeCategoryId === profile.themeCategoryId &&
              existing.themeListIds.join(',') === profile.themeListIds.join(',') &&
              existing.orderNo === (profile.orderNo ?? null) &&
              existing.layoutListId === (profile.layoutListId ?? null) &&
              existing.isDisplayOnLiveview === profile.isDisplayOnLiveview) {
            delete local[name];
            continue;
          }
          let uploadName = name.trim();
          let suffix = 2;
          while (shared.some(item => item.name.toLocaleLowerCase('vi') === uploadName.toLocaleLowerCase('vi'))) {
            const ending = ` (${suffix++})`;
            uploadName = `${name.trim().slice(0, 100 - ending.length)}${ending}`;
          }
          try {
            const created = await themeToolsService.createUploadProfile({
              name: uploadName,
              color: profile.color,
              themeCategoryId: profile.themeCategoryId,
              themeListIds: profile.themeListIds,
              orderNo: profile.orderNo ?? null,
              layoutListId: profile.layoutListId ?? null,
              isDisplayOnLiveview: profile.isDisplayOnLiveview,
            });
            shared.push(created);
            delete local[name];
          } catch {
            skipped++;
          }
        }
        if (localEntries.length > 0) {
          try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(local));
          } catch {
            // Các profile đã chuyển vẫn được lưu trên server.
          }
        }
        if (active) {
          setProfiles([...shared].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
          setSelectedProfile(current => shared.some(item => item.id === current) ? current : 0);
          if (skipped) toast.warning(`${skipped} profile cũ chưa thể chuyển lên hệ thống; dữ liệu vẫn còn trên trình duyệt này.`);
        }
      } catch (error) {
        if (active) toast.error(error instanceof Error ? error.message : 'Không thể tải profile dùng chung.');
      } finally {
        if (active) setLoadingProfiles(false);
      }
    };
    void loadProfiles();
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!categoryPickerOpen) return;
    categorySearchRef.current?.focus();
    const onOutsideClick = (event: MouseEvent) => {
      if (!categoryPickerRef.current?.contains(event.target as Node)) {
        setCategoryPickerOpen(false);
        setCategorySearch('');
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [categoryPickerOpen]);

  const visibleCategories = useMemo(() => {
    const query = normalizeSearch(categorySearch.trim());
    if (!query) return categories;
    return categories.filter(item => normalizeSearch(item.name).includes(query));
  }, [categories, categorySearch]);

  useEffect(() => {
    if (!categoryPickerOpen) return;
    const activeCategory = visibleCategories[activeCategoryIndex];
    if (activeCategory) {
      document.getElementById(`theme-category-option-${activeCategory.id}`)?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [categoryPickerOpen, activeCategoryIndex, visibleCategories]);

  const visibleThemeLists = useMemo(() => {
    const query = themeListSearch.trim().toLocaleLowerCase('vi');
    return themeLists.filter(item => !query || item.name.toLocaleLowerCase('vi').includes(query));
  }, [themeListSearch, themeLists]);

  if (!open) return null;

  const saveProfile = async () => {
    const profileName = newProfileName.trim();
    if (!profileName) {
      toast.error('Vui lòng nhập tên profile.');
      return;
    }
    if (!categoryId) {
      toast.error('Vui lòng chọn danh mục theme trước khi lưu profile.');
      return;
    }
    const parsedOrderNo = orderNo.trim() === '' ? null : Number(orderNo);
    if (parsedOrderNo !== null && (!Number.isInteger(parsedOrderNo) || parsedOrderNo < 0)) {
      toast.error('Thứ tự hiển thị phải là số nguyên không âm.');
      return;
    }
    const existing = profiles.find(item => item.name.toLocaleLowerCase('vi') === profileName.toLocaleLowerCase('vi'));
    if (existing && !existing.canManage) {
      toast.error('Profile này do người khác tạo. Hãy đặt tên khác để lưu profile riêng.');
      return;
    }
    const payload: SaveThemeUploadProfile = {
      name: profileName,
      color,
      themeCategoryId: categoryId,
      themeListIds: selectedThemeListIds,
      orderNo: parsedOrderNo,
      layoutListId: layoutListId.trim() === '' ? null : Number(layoutListId),
      isDisplayOnLiveview: isLiveView,
    };
    setSavingProfile(true);
    try {
      const saved = existing
        ? await themeToolsService.updateUploadProfile(existing.id, payload)
        : await themeToolsService.createUploadProfile(payload);
      setProfiles(current => [...current.filter(item => item.id !== saved.id), saved]
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')));
      setSelectedProfile(saved.id);
      setNewProfileName(saved.name);
      toast.success(`Đã lưu profile dùng chung “${saved.name}”.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadProfile = (id: number) => {
    setSelectedProfile(id);
    const profile = profiles.find(item => item.id === id);
    if (!profile) return;

    setNewProfileName(profile.name);
    setColor(profile.color);
    setCategoryId(profile.themeCategoryId);
    setCategoryPickerOpen(false);
    setCategorySearch('');
    setSelectedThemeListIds(profile.themeListIds);
    setOrderNo(profile.orderNo?.toString() || '');
    setLayoutListId(profile.layoutListId?.toString() || '');
    setIsLiveView(profile.isDisplayOnLiveview);
  };

  const deleteProfile = async () => {
    if (!selectedProfile) return;
    const profile = profiles.find(item => item.id === selectedProfile);
    if (!profile?.canManage) return;
    setSavingProfile(true);
    try {
      await themeToolsService.deleteUploadProfile(profile.id);
      setProfiles(current => current.filter(item => item.id !== profile.id));
      setSelectedProfile(0);
      setNewProfileName('');
      toast.success('Đã xóa profile dùng chung.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleThemeList = (id: number) => {
    setSelectedThemeListIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  const chooseCategory = (id: number) => {
    setCategoryId(id);
    setCategoryPickerOpen(false);
    setCategorySearch('');
    categoryButtonRef.current?.focus();
  };

  const handleCategorySearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && visibleCategories.length > 0) {
      event.preventDefault();
      setActiveCategoryIndex(index => Math.min(index + 1, visibleCategories.length - 1));
    } else if (event.key === 'ArrowUp' && visibleCategories.length > 0) {
      event.preventDefault();
      setActiveCategoryIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && visibleCategories[activeCategoryIndex]) {
      event.preventDefault();
      chooseCategory(visibleCategories[activeCategoryIndex].id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setCategoryPickerOpen(false);
      setCategorySearch('');
      categoryButtonRef.current?.focus();
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên theme.');
      return;
    }
    if (!categoryId) {
      toast.error('Vui lòng chọn danh mục theme.');
      return;
    }
    if (!thumbnail && !fallbackThumbnailName) {
      toast.error('Vui lòng chọn thumbnail hoặc thêm một ảnh chưa map layout.');
      return;
    }
    const parsedOrderNo = orderNo.trim() === '' ? undefined : Number(orderNo);
    if (parsedOrderNo !== undefined && (!Number.isInteger(parsedOrderNo) || parsedOrderNo < 0)) {
      toast.error('Thứ tự hiển thị phải là số nguyên không âm.');
      return;
    }

    await onSubmit({
      name: name.trim(),
      color,
      themeCategoryId: categoryId,
      themeListIds: selectedThemeListIds,
      orderNo: parsedOrderNo,
      layoutListId: Number(layoutListId) || undefined,
      thumbnail,
      isDisplayOnLiveview: isLiveView,
    });
  };

  return (
    <div className="modal-overlay !z-[100]">
      <div role="dialog" aria-modal="true" aria-labelledby="theme-upload-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-elevated">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4 sm:px-6">
          <div>
            <h2 id="theme-upload-title" className="text-lg font-semibold text-on-surface">Tải theme lên FunStudio</h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">Ảnh đã khớp layout sẽ được gửi kèm thumbnail.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer" aria-label="Đóng" title="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-5 rounded-xl border border-outline-variant bg-surface-2/60 p-4">
            <p className="mb-1 text-sm font-medium text-on-surface">Profile dùng chung</p>
            <p className="mb-3 text-xs text-on-surface-variant">Ai cũng dùng được profile đã lưu. Người tạo hoặc Admin có thể sửa, xóa.</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select value={selectedProfile} onChange={event => loadProfile(Number(event.target.value))} disabled={loadingProfiles} className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50">
                <option value={0}>{loadingProfiles ? 'Đang tải profile…' : 'Chọn profile đã lưu'}</option>
                {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
              <button type="button" disabled={savingProfile || !profiles.find(item => item.id === selectedProfile)?.canManage} onClick={() => void deleteProfile()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-error/30 bg-surface px-3 text-sm font-medium text-error hover:bg-error-container cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">
                <Trash2 className="h-4 w-4" /> Xóa
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input value={newProfileName} onChange={event => setNewProfileName(event.target.value)} placeholder="Tên profile mới" aria-label="Tên profile" className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              <button type="button" onClick={() => void saveProfile()} disabled={savingProfile || loadingProfiles} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-secondary-container px-3 text-sm font-medium text-on-secondary-container hover:brightness-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
                <Save className="h-4 w-4" /> {savingProfile ? 'Đang lưu…' : 'Lưu profile'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-on-surface">Tên theme <span className="text-error">*</span></span>
              <input value={name} onChange={event => setName(event.target.value)} className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-on-surface">Màu chủ đạo</span>
              <div className="flex gap-2">
                <input type="color" value={color} onChange={event => setColor(event.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-outline-variant bg-surface p-1" />
                <input value={color} onChange={event => setColor(event.target.value)} aria-label="Mã màu" className="h-10 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 font-mono text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
            </label>

            <div
              ref={categoryPickerRef}
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setCategoryPickerOpen(false);
                  setCategorySearch('');
                }
              }}
              className="sm:col-span-2"
            >
              <span id="theme-category-label" className="mb-1.5 block text-sm font-medium text-on-surface">Danh mục *</span>
              <button
                ref={categoryButtonRef}
                type="button"
                aria-labelledby="theme-category-label theme-category-value"
                aria-haspopup="listbox"
                aria-expanded={categoryPickerOpen}
                onClick={() => {
                  setCategoryPickerOpen(current => !current);
                  setCategorySearch('');
                  setActiveCategoryIndex(0);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface h-10 px-3 text-left text-sm text-on-surface cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <span id="theme-category-value" className={categoryId ? 'truncate' : 'truncate text-on-surface-variant'}>
                  {categories.find(category => category.id === categoryId)?.name ||
                    (categoryId ? `Danh mục #${categoryId} không còn khả dụng` : 'Chọn danh mục')}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-on-surface-variant" />
              </button>
              {categoryPickerOpen && (
                <div className="mt-1 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-elevated">
                  <div className="relative border-b border-outline-variant p-2">
                    <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      ref={categorySearchRef}
                      type="search"
                      role="combobox"
                      aria-label="Tìm danh mục"
                      aria-autocomplete="list"
                      aria-expanded="true"
                      aria-controls="theme-category-options"
                      aria-activedescendant={visibleCategories[activeCategoryIndex] ? `theme-category-option-${visibleCategories[activeCategoryIndex].id}` : undefined}
                      value={categorySearch}
                      onChange={event => { setCategorySearch(event.target.value); setActiveCategoryIndex(0); }}
                      onKeyDown={handleCategorySearchKeyDown}
                      placeholder="Gõ tên danh mục…"
                      className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-9 pr-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div id="theme-category-options" role="listbox" aria-label="Danh mục" className="max-h-56 overflow-y-auto p-1">
                    {visibleCategories.map((category, index) => (
                      <button
                        key={category.id}
                        id={`theme-category-option-${category.id}`}
                        role="option"
                        aria-selected={category.id === categoryId}
                        type="button"
                        onMouseEnter={() => setActiveCategoryIndex(index)}
                        onClick={() => chooseCategory(category.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-on-surface cursor-pointer ${index === activeCategoryIndex ? 'bg-primary-subtle' : 'hover:bg-surface-2'}`}
                      >
                        <span className="truncate">{category.name}</span>
                        {category.id === categoryId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    ))}
                    {visibleCategories.length === 0 && (
                      <p className="px-3 py-4 text-center text-sm text-on-surface-variant">Không tìm thấy danh mục.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-on-surface">Thứ tự hiển thị</span>
              <input type="number" min={0} step={1} value={orderNo} onChange={event => setOrderNo(event.target.value)} placeholder="Để trống nếu không cần" className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium text-on-surface">Layout List ID</span>
              <input type="number" min={1} value={layoutListId} onChange={event => setLayoutListId(event.target.value)} className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-on-surface">Thumbnail</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setThumbnail(event.target.files?.[0] || null)} className="block w-full text-xs text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-container file:px-3 file:py-2 file:text-sm file:font-medium file:text-on-secondary-container file:cursor-pointer" />
              {!thumbnail && fallbackThumbnailName && <span className="mt-1 block text-xs text-primary">Sẽ dùng ảnh chưa khớp layout: {fallbackThumbnailName}</span>}
            </label>

            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-on-surface">Danh sách theme</span>
                <span className="text-xs text-on-surface-variant">Đã chọn {selectedThemeListIds.length}</span>
              </div>
              <input value={themeListSearch} onChange={event => setThemeListSearch(event.target.value)} placeholder="Tìm danh sách theme…" aria-label="Tìm danh sách theme" className="mb-2 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-outline-variant p-2 sm:grid-cols-2">
                {visibleThemeLists.map(item => {
                  const selected = selectedThemeListIds.includes(item.id);
                  return (
                    <button key={item.id} type="button" onClick={() => toggleThemeList(item.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm cursor-pointer ${selected ? 'bg-primary-subtle font-medium text-on-surface' : 'text-on-surface hover:bg-surface-2'}`}>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-on-primary' : 'border-on-surface-variant/50 bg-surface'}`}>
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
                {visibleThemeLists.length === 0 && <p className="p-3 text-sm text-on-surface-variant">Không tìm thấy danh sách theme.</p>}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-on-surface cursor-pointer sm:col-span-2">
              <input type="checkbox" checked={isLiveView} onChange={event => setIsLiveView(event.target.checked)} className="h-4 w-4 accent-primary" />
              Hiển thị trên Liveview
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-outline-variant px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">Hủy</button>
          <button type="button" onClick={() => void submit()} disabled={loading} className="btn-primary">
            <Upload className="h-4 w-4" /> {loading ? 'Đang tải lên…' : 'Tải theme lên'}
          </button>
        </div>
      </div>
    </div>
  );
}
