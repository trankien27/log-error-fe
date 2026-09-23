import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Archive,
  Download,
  Expand,
  FolderOpen,
  ImagePlus,
  Images,
  RefreshCw,
  Rocket,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { themeToolsService } from '../../../services/api/themeToolsService';
import ThemeUploadDialog from './ThemeUploadDialog';
import type {
  ResizedThemeImage,
  ThemeCategory,
  ThemeLayout,
  ThemeList,
  ThemeUploadValues,
} from '../types';

const IMAGE_FILE_PATTERN = /\.(png|jpe?g|webp)$/i;
const MAX_DIMENSION = 12000;

const readImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Không thể đọc ảnh.'));
  image.src = src;
});

async function renderToDataUrl(src: string, width: number, height: number) {
  const image = await readImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ canvas.');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

async function fileToThemeImage(file: File, layouts: ThemeLayout[]): Promise<ResizedThemeImage> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp.'));
    reader.readAsDataURL(file);
  });
  const original = await readImage(source);
  const baseName = file.name.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'image';
  const upperName = baseName.toUpperCase();
  const layout = layouts.find(item => item.code && upperName.includes(item.code.toUpperCase()));
  const width = layout?.width || original.naturalWidth;
  const height = layout?.height || original.naturalHeight;

  if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(`Kích thước ảnh ${file.name} không hợp lệ.`);
  }

  return {
    id: crypto.randomUUID(),
    name: `${layout?.code || baseName}.png`,
    src: await renderToDataUrl(source, width, height),
    width,
    height,
    customWidth: width,
    customHeight: height,
    layout,
  };
}

async function dataUrlToBlob(src: string, width: number, height: number) {
  const resizedDataUrl = await renderToDataUrl(src, width, height);
  return fetch(resizedDataUrl).then(response => response.blob());
}

function finalSize(image: ResizedThemeImage) {
  return image.layout
    ? { width: image.width, height: image.height }
    : { width: image.customWidth, height: image.customHeight };
}

export default function ThemeImageToolsTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const referenceDataLoadedRef = useRef(false);
  const [layouts, setLayouts] = useState<ThemeLayout[]>([]);
  const [categories, setCategories] = useState<ThemeCategory[]>([]);
  const [themeLists, setThemeLists] = useState<ThemeList[]>([]);
  const [images, setImages] = useState<ResizedThemeImage[]>([]);
  const [preview, setPreview] = useState<ResizedThemeImage | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
  }, []);

  const loadReferenceData = async () => {
    setLoadingData(true);
    try {
      const [layoutItems, categoryItems, themeListItems] = await Promise.all([
        themeToolsService.getLayouts(),
        themeToolsService.getThemeCategories(),
        themeToolsService.getThemeLists(),
      ]);
      setLayouts(layoutItems.filter(item => item.code && item.width > 0 && item.height > 0));
      setCategories(categoryItems.filter(item => item.isActive).sort((a, b) => a.orderNo - b.orderNo));
      setThemeLists(themeListItems.filter(item => item.isActive).sort((a, b) => a.orderNo - b.orderNo));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải cấu hình FunStudio.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (referenceDataLoadedRef.current) return;
    referenceDataLoadedRef.current = true;
    void loadReferenceData();
  }, []);

  const orderedLayouts = useMemo(
    () => [...layouts].sort((left, right) => right.code.length - left.code.length),
    [layouts],
  );
  const mappedCount = images.filter(image => image.layout).length;
  const fallbackThumbnail = images.find(image => !image.layout);

  const processFiles = async (fileList: FileList | File[]) => {
    if (loadingData) {
      toast.info('Đang tải danh sách layout, vui lòng thử lại sau ít giây.');
      return;
    }

    setProcessing(true);
    try {
      const sourceFiles: File[] = [];
      for (const file of Array.from(fileList)) {
        if (file.name.toLowerCase().endsWith('.rar')) {
          toast.error('Chưa hỗ trợ RAR. Vui lòng dùng ZIP.');
          continue;
        }
        if (file.name.toLowerCase().endsWith('.zip')) {
          const archive = await JSZip.loadAsync(file);
          const entries = Object.values(archive.files).filter(entry => !entry.dir && IMAGE_FILE_PATTERN.test(entry.name));
          const extractedFiles = await Promise.all(entries.map(async entry => {
            const blob = await entry.async('blob');
            const extension = entry.name.split('.').pop()?.toLowerCase();
            const contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
            return new File([blob], entry.name, { type: contentType });
          }));
          sourceFiles.push(...extractedFiles);
          continue;
        }
        if (file.type.startsWith('image/') || IMAGE_FILE_PATTERN.test(file.name)) {
          sourceFiles.push(file);
        }
      }

      if (sourceFiles.length === 0) {
        toast.error('Không tìm thấy ảnh PNG, JPG hoặc WEBP hợp lệ.');
        return;
      }

      const results = await Promise.allSettled(sourceFiles.map(file => fileToThemeImage(file, orderedLayouts)));
      const added = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      const failed = results.length - added.length;
      setImages(current => [...current, ...added]);
      if (added.length) toast.success(`Đã xử lý ${added.length} ảnh.`);
      if (failed) toast.warning(`${failed} ảnh không thể xử lý.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xử lý tệp.');
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const updateImage = (id: string, changes: Partial<ResizedThemeImage>) => {
    setImages(current => current.map(image => image.id === id ? { ...image, ...changes } : image));
  };

  const downloadImage = async (image: ResizedThemeImage) => {
    const size = finalSize(image);
    saveAs(await dataUrlToBlob(image.src, size.width, size.height), image.name || 'image.png');
  };

  const downloadAll = async () => {
    setProcessing(true);
    try {
      const archive = new JSZip();
      for (const image of images) {
        const size = finalSize(image);
        archive.file(image.name || `${image.id}.png`, await dataUrlToBlob(image.src, size.width, size.height));
      }
      saveAs(await archive.generateAsync({ type: 'blob' }), 'theme-images.zip');
    } finally {
      setProcessing(false);
    }
  };

  const uploadTheme = async (values: ThemeUploadValues) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('ThemeCategoryId', values.themeCategoryId.toString());
      formData.append('Name', values.name);
      formData.append('Color', values.color);
      formData.append('ThemeListIds', values.themeListIds.join(','));
      if (values.layoutListId) formData.append('LayoutListId', values.layoutListId.toString());
      formData.append('IsDisplayOnLiveview', values.isDisplayOnLiveview.toString());

      let thumbnailFile = values.thumbnail;
      if (!thumbnailFile && fallbackThumbnail) {
        const size = finalSize(fallbackThumbnail);
        const blob = await dataUrlToBlob(fallbackThumbnail.src, size.width, size.height);
        thumbnailFile = new File([blob], fallbackThumbnail.name, { type: 'image/png' });
      }
      if (!thumbnailFile) throw new Error('Thiếu ảnh thumbnail.');
      formData.append('Thumbnail', thumbnailFile, thumbnailFile.name);

      const imagesByLayout = new Map<number, ResizedThemeImage>();
      images.forEach(image => {
        if (image.layout) imagesByLayout.set(image.layout.id, image);
      });

      let index = 0;
      for (const [layoutId, image] of imagesByLayout) {
        const size = finalSize(image);
        const blob = await dataUrlToBlob(image.src, size.width, size.height);
        formData.append(`LayoutThemes[${index}].LayoutId`, layoutId.toString());
        formData.append(`LayoutThemes[${index}].Image`, blob, image.name);
        index++;
      }

      await themeToolsService.uploadTheme(formData);
      toast.success('Upload theme thành công.');
      setUploadDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload theme thất bại.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Images className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-[0.16em]">FunStudio tools</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-on-surface">Resize ảnh & upload theme</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Tự nhận diện layout theo mã trong tên file, resize và upload trực tiếp.</p>
        </div>
        <button type="button" onClick={() => void loadReferenceData()} disabled={loadingData} className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-2 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} /> Làm mới cấu hình
        </button>
      </div>

      <div
        onDragEnter={event => { event.preventDefault(); setDragging(true); }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => { if (event.currentTarget === event.target) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); void processFiles(event.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${dragging ? 'border-primary bg-primary/10' : 'border-outline-variant bg-surface hover:border-primary/60'}`}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
          <ImagePlus className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-black text-on-surface">Kéo thả ảnh hoặc file ZIP vào đây</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Hỗ trợ PNG, JPG, WEBP, ZIP và cả thư mục.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={processing || loadingData} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-50">
            <Upload className="h-4 w-4" /> Chọn ảnh / ZIP
          </button>
          <button type="button" onClick={() => folderInputRef.current?.click()} disabled={processing || loadingData} className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-bold text-on-surface disabled:opacity-50">
            <FolderOpen className="h-4 w-4" /> Chọn thư mục
          </button>
        </div>
        <input ref={fileInputRef} hidden type="file" multiple accept=".zip,image/png,image/jpeg,image/webp" onChange={event => event.target.files && void processFiles(event.target.files)} />
        <input ref={folderInputRef} hidden type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={event => event.target.files && void processFiles(event.target.files)} />
      </div>

      {images.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 border-b border-outline-variant pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-on-surface">Danh sách ảnh ({images.length})</h2>
              <p className="mt-1 text-xs text-on-surface-variant">{mappedCount} ảnh đã map layout · {images.length - mappedCount} ảnh tùy chỉnh</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void downloadAll()} disabled={processing} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-bold text-on-surface">
                <Archive className="h-4 w-4" /> Tải ZIP
              </button>
              <button type="button" onClick={() => setUploadDialogOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">
                <Rocket className="h-4 w-4" /> Upload theme
              </button>
              <button type="button" onClick={() => setImages([])} className="inline-flex items-center gap-2 rounded-lg border border-error/30 px-3 py-2 text-sm font-bold text-error">
                <Trash2 className="h-4 w-4" /> Xóa tất cả
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map(image => {
              const size = finalSize(image);
              return (
                <article key={image.id} className="[content-visibility:auto] overflow-hidden rounded-xl border border-outline-variant bg-surface-1">
                  <button type="button" onClick={() => setPreview(image)} className="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-surface-2">
                    <img src={image.src} alt={image.name} className="h-full w-full object-contain transition group-hover:scale-[1.03]" />
                    <span className="absolute right-2 top-2 rounded-lg bg-black/55 p-1.5 text-white opacity-0 transition group-hover:opacity-100"><Expand className="h-4 w-4" /></span>
                  </button>
                  <div className="space-y-3 p-4">
                    <input value={image.name} onChange={event => updateImage(image.id, { name: event.target.value || 'image.png' })} className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-bold text-on-surface" />
                    {image.layout ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs font-bold text-success">
                        <span className="truncate">{image.layout.code} · {image.layout.name}</span>
                        <span className="shrink-0">{size.width} × {size.height}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs font-bold text-on-surface-variant">Rộng<input type="number" min={1} max={MAX_DIMENSION} value={image.customWidth} onChange={event => updateImage(image.id, { customWidth: Math.min(MAX_DIMENSION, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-2 py-2 text-sm text-on-surface" /></label>
                        <label className="text-xs font-bold text-on-surface-variant">Cao<input type="number" min={1} max={MAX_DIMENSION} value={image.customHeight} onChange={event => updateImage(image.id, { customHeight: Math.min(MAX_DIMENSION, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-2 py-2 text-sm text-on-surface" /></label>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void downloadImage(image)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-container px-3 py-2 text-sm font-bold text-on-secondary-container"><Download className="h-4 w-4" /> Tải</button>
                      <button type="button" onClick={() => setImages(current => current.filter(item => item.id !== image.id))} className="inline-flex items-center justify-center gap-2 rounded-lg border border-error/30 px-3 py-2 text-sm font-bold text-error"><Trash2 className="h-4 w-4" /> Xóa</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {(processing || loadingData) && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <div className="rounded-2xl bg-surface px-6 py-5 text-center shadow-2xl">
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-primary" />
            <p className="mt-3 text-sm font-bold text-on-surface">{loadingData ? 'Đang tải cấu hình FunStudio...' : 'Đang xử lý ảnh...'}</p>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-6" onClick={() => setPreview(null)}>
          <button type="button" onClick={() => setPreview(null)} className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white" aria-label="Đóng"><X className="h-6 w-6" /></button>
          <img src={preview.src} alt={preview.name} onClick={event => event.stopPropagation()} className="max-h-full max-w-full object-contain" />
        </div>
      )}

      <ThemeUploadDialog
        open={uploadDialogOpen}
        loading={uploading}
        categories={categories}
        themeLists={themeLists}
        fallbackThumbnailName={fallbackThumbnail?.name}
        onClose={() => setUploadDialogOpen(false)}
        onSubmit={uploadTheme}
      />
    </div>
  );
}
