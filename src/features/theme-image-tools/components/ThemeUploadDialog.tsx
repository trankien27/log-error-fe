import { useEffect, useMemo, useState } from 'react';
import { Check, Save, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ThemeCategory, ThemeList, ThemeUploadValues } from '../types';

type UploadProfile = Pick<
  ThemeUploadValues,
  'color' | 'themeCategoryId' | 'themeListIds' | 'layoutListId' | 'isDisplayOnLiveview'
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

export default function ThemeUploadDialog({
  open,
  loading,
  categories,
  themeLists,
  fallbackThumbnailName,
  onClose,
  onSubmit,
}: ThemeUploadDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#f16d94');
  const [categoryId, setCategoryId] = useState(0);
  const [selectedThemeListIds, setSelectedThemeListIds] = useState<number[]>([]);
  const [layoutListId, setLayoutListId] = useState('61');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [isLiveView, setIsLiveView] = useState(true);
  const [themeListSearch, setThemeListSearch] = useState('');
  const [profiles, setProfiles] = useState<Record<string, UploadProfile>>({});
  const [selectedProfile, setSelectedProfile] = useState('');
  const [newProfileName, setNewProfileName] = useState('');

  useEffect(() => {
    if (open) setProfiles(readProfiles());
  }, [open]);

  const visibleThemeLists = useMemo(() => {
    const query = themeListSearch.trim().toLocaleLowerCase('vi');
    return themeLists.filter(item => !query || item.name.toLocaleLowerCase('vi').includes(query));
  }, [themeListSearch, themeLists]);

  if (!open) return null;

  const persistProfiles = (nextProfiles: Record<string, UploadProfile>) => {
    setProfiles(nextProfiles);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles));
  };

  const saveProfile = () => {
    const profileName = newProfileName.trim();
    if (!profileName) {
      toast.error('Vui lòng nhập tên profile.');
      return;
    }

    persistProfiles({
      ...profiles,
      [profileName]: {
        color,
        themeCategoryId: categoryId,
        themeListIds: selectedThemeListIds,
        layoutListId: Number(layoutListId) || undefined,
        isDisplayOnLiveview: isLiveView,
      },
    });
    setSelectedProfile(profileName);
    setNewProfileName('');
    toast.success(`Đã lưu profile “${profileName}”.`);
  };

  const loadProfile = (profileName: string) => {
    setSelectedProfile(profileName);
    const profile = profiles[profileName];
    if (!profile) return;

    setColor(profile.color);
    setCategoryId(profile.themeCategoryId);
    setSelectedThemeListIds(profile.themeListIds);
    setLayoutListId(profile.layoutListId?.toString() || '');
    setIsLiveView(profile.isDisplayOnLiveview);
  };

  const deleteProfile = () => {
    if (!selectedProfile) return;
    const nextProfiles = { ...profiles };
    delete nextProfiles[selectedProfile];
    persistProfiles(nextProfiles);
    setSelectedProfile('');
    toast.success('Đã xóa profile.');
  };

  const toggleThemeList = (id: number) => {
    setSelectedThemeListIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
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

    await onSubmit({
      name: name.trim(),
      color,
      themeCategoryId: categoryId,
      themeListIds: selectedThemeListIds,
      layoutListId: Number(layoutListId) || undefined,
      thumbnail,
      isDisplayOnLiveview: isLiveView,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="theme-upload-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <div>
            <h2 id="theme-upload-title" className="text-lg font-black text-on-surface">Upload theme lên FunStudio</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Ảnh đã map layout sẽ được gửi cùng thumbnail.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-2" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="mb-5 rounded-xl border border-outline-variant bg-surface-2 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-on-surface-variant">Profile upload</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select value={selectedProfile} onChange={event => loadProfile(event.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface">
                <option value="">Chọn profile đã lưu</option>
                {Object.keys(profiles).sort().map(profileName => <option key={profileName} value={profileName}>{profileName}</option>)}
              </select>
              <button type="button" disabled={!selectedProfile} onClick={deleteProfile} className="inline-flex items-center justify-center gap-2 rounded-lg border border-error/30 px-3 py-2 text-sm font-bold text-error disabled:opacity-40">
                <Trash2 className="h-4 w-4" /> Xóa
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input value={newProfileName} onChange={event => setNewProfileName(event.target.value)} placeholder="Tên profile mới" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
              <button type="button" onClick={saveProfile} className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-container px-3 py-2 text-sm font-bold text-on-secondary-container">
                <Save className="h-4 w-4" /> Lưu profile
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-bold text-on-surface">Tên theme *</span>
              <input value={name} onChange={event => setName(event.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface" />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-bold text-on-surface">Màu chủ đạo</span>
              <div className="flex gap-2">
                <input type="color" value={color} onChange={event => setColor(event.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-outline-variant bg-surface p-1" />
                <input value={color} onChange={event => setColor(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-bold text-on-surface">Danh mục *</span>
              <select value={categoryId} onChange={event => setCategoryId(Number(event.target.value))} className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface">
                <option value={0}>Chọn danh mục</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-bold text-on-surface">Layout List ID</span>
              <input type="number" min={1} value={layoutListId} onChange={event => setLayoutListId(event.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface" />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-bold text-on-surface">Thumbnail</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setThumbnail(event.target.files?.[0] || null)} className="block w-full text-xs text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-container file:px-3 file:py-2 file:font-bold file:text-on-secondary-container" />
              {!thumbnail && fallbackThumbnailName && <span className="mt-1 block text-xs text-primary">Dùng ảnh chưa map: {fallbackThumbnailName}</span>}
            </label>

            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-on-surface">Theme lists</span>
                <span className="text-xs text-on-surface-variant">Đã chọn {selectedThemeListIds.length}</span>
              </div>
              <input value={themeListSearch} onChange={event => setThemeListSearch(event.target.value)} placeholder="Tìm theme list..." className="mb-2 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
              <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-outline-variant p-2 sm:grid-cols-2">
                {visibleThemeLists.map(item => {
                  const selected = selectedThemeListIds.includes(item.id);
                  return (
                    <button key={item.id} type="button" onClick={() => toggleThemeList(item.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${selected ? 'bg-secondary-container font-bold text-on-secondary-container' : 'text-on-surface hover:bg-surface-2'}`}>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-on-primary' : 'border-outline'}`}>
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
                {visibleThemeLists.length === 0 && <p className="p-3 text-sm text-on-surface-variant">Không tìm thấy theme list.</p>}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-on-surface sm:col-span-2">
              <input type="checkbox" checked={isLiveView} onChange={event => setIsLiveView(event.target.checked)} className="h-4 w-4 accent-primary" />
              Hiển thị trên Liveview
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-outline-variant px-6 py-4">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-bold text-on-surface disabled:opacity-50">Hủy</button>
          <button type="button" onClick={() => void submit()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-sm disabled:opacity-50">
            <Upload className="h-4 w-4" /> {loading ? 'Đang upload...' : 'Upload theme'}
          </button>
        </div>
      </div>
    </div>
  );
}
