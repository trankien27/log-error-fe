import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpenText,
  Clock3,
  Edit3,
  FileText,
  Globe2,
  Loader2,
  LockKeyhole,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { documentsService } from '../../../services/api/documentsService';
import {
  KnowledgeDocumentDto,
  KnowledgeDocumentSummaryDto,
  KnowledgeDocumentVisibility,
  SaveKnowledgeDocumentRequest,
} from '../../../types';
import MarkdownEditor from './MarkdownEditor';
import MarkdownRenderer from './MarkdownRenderer';
import {
  DOC_IMAGE_PREFIX,
  extractDataUriImages,
  extractPlaceholderIds,
  hydratePlaceholders,
  mapHydratedImageSources,
  replaceDataUriWithSrc,
  stripImageMarkdown,
} from '../utils/documentImages';

const EMPTY_DRAFT: SaveKnowledgeDocumentRequest = {
  title: '',
  contentMarkdown: '',
  visibility: 2,
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function visibilityLabel(visibility: KnowledgeDocumentVisibility) {
  return visibility === 1 ? 'Global' : 'Personal';
}

/**
 * The editor only carries a content type for pasted images, not a file name, so the
 * server-side metadata name is derived from it.
 */
function fileNameForContentType(contentType: string) {
  const extension = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
  return `image.${extension}`;
}

function dataUriToFile(dataUri: string, contentType: string) {
  const [, base64 = ''] = dataUri.split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileNameForContentType(contentType), { type: contentType });
}

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<KnowledgeDocumentSummaryDto[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocumentDto | null>(null);
  const [draft, setDraft] = useState<SaveKnowledgeDocumentRequest>(EMPTY_DRAFT);
  const [keyword, setKeyword] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * The last content we know the server holds. Older documents may still contain
   * `doc-image://{id}` placeholders; new saves write R2 URLs directly.
   */
  const savedPlaceholderContentRef = useRef<string>('');

  /**
   * Reverse of the src map `hydratePlaceholders` just applied: R2 URL back to image id.
   * This keeps cleanup working for old placeholder-backed documents after they are saved
   * in the new URL-backed format.
   */
  const hydratedImageSrcByIdRef = useRef<Map<string, number>>(new Map());

  /** Data URI shown temporarily in the editor -> original File to upload as multipart. */
  const pendingImageFilesByDataUriRef = useRef<Map<string, File>>(new Map());

  const filteredDocuments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('vi-VN');
    if (!normalizedKeyword) return documents;
    return documents.filter(document =>
      document.title.toLocaleLowerCase('vi-VN').includes(normalizedKeyword) ||
      document.preview.toLocaleLowerCase('vi-VN').includes(normalizedKeyword),
    );
  }, [documents, keyword]);

  /**
   * Records the server's placeholder content as the orphan-diff baseline and swaps every
   * `doc-image://{id}` for a real data URI so both the renderer and the editor receive
   * displayable content.
   *
   * `MarkdownEditor` builds its editor once at mount and never re-reads its `value` prop,
   * so hydration has to finish here — before `isEditing` is ever set to true.
   */
  const hydrateDocument = async (document: KnowledgeDocumentDto): Promise<KnowledgeDocumentDto> => {
    savedPlaceholderContentRef.current = document.contentMarkdown;
    hydratedImageSrcByIdRef.current = new Map();
    pendingImageFilesByDataUriRef.current = new Map();

    try {
      const images = await documentsService.listImages(document.id);
      hydratedImageSrcByIdRef.current = mapHydratedImageSources(images);
      if (!document.contentMarkdown.includes(DOC_IMAGE_PREFIX)) return document;

      return {
        ...document,
        contentMarkdown: hydratePlaceholders(document.contentMarkdown, images),
      };
    } catch {
      // A failed image fetch must not blank the document — show it without its images.
      toast.error('Không thể tải ảnh trong tài liệu.');
      return document;
    }
  };

  const loadDocument = async (id: number) => {
    setIsLoadingDocument(true);
    try {
      const document = await documentsService.getById(id);
      setSelectedDocument(await hydrateDocument(document));
      setIsCreating(false);
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải tài liệu.');
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const refreshDocuments = async () => {
    const items = await documentsService.getAll();
    setDocuments(items);
    return items;
  };

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      setIsLoadingList(true);
      try {
        const items = await documentsService.getAll();
        if (!isMounted) return;
        setDocuments(items);
      } catch (error: any) {
        if (isMounted) toast.error(error.message || 'Không thể tải danh sách tài liệu.');
      } finally {
        if (isMounted) setIsLoadingList(false);
      }
    };

    void initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  const startCreating = () => {
    setDraft({ ...EMPTY_DRAFT });
    setSelectedDocument(null);
    savedPlaceholderContentRef.current = '';
    hydratedImageSrcByIdRef.current = new Map();
    pendingImageFilesByDataUriRef.current = new Map();
    setIsCreating(true);
    setIsEditing(true);
  };

  const startEditing = () => {
    if (!selectedDocument?.canEdit) return;
    setDraft({
      title: selectedDocument.title,
      contentMarkdown: selectedDocument.contentMarkdown,
      visibility: selectedDocument.visibility,
    });
    setIsCreating(false);
    setIsEditing(true);
  };

  const cancelEditing = async () => {
    setIsEditing(false);
    if (!isCreating) return;

    setIsCreating(false);
    setSelectedDocument(null);
  };

  const goBackToList = () => {
    if (isSaving) return;
    setSelectedDocument(null);
    setIsCreating(false);
    setIsEditing(false);
    setDraft({ ...EMPTY_DRAFT });
    savedPlaceholderContentRef.current = '';
    hydratedImageSrcByIdRef.current = new Map();
    pendingImageFilesByDataUriRef.current = new Map();
  };

  /**
   * Saves the draft, moving any newly inserted images out of the content and into the
   * image table:
   *
   *   1. create (new documents only) with image markdown stripped — a single 1MB image is
   *      ~1.37M base64 characters against the server's 500,000 character content limit,
   *      so raw data URIs would hard-fail the create.
   *   2. upload each pending `data:` image, swapping it for its `doc-image://{id}`.
   *   3. delete images the user removed from the content since the last save.
   *   4. update with the placeholder-only content.
   *
   * There is no transaction across these calls. On any failure the editor stays open with
   * the draft intact so nothing the user wrote is lost; `isCreating` flips to false only
   * once the create has actually succeeded, so a retry updates rather than duplicating.
   */
  const saveDocument = async (event: FormEvent) => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      toast.error('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    const wasCreating = isCreating;
    if (!wasCreating && !selectedDocument) return;

    setIsSaving(true);
    try {
      let documentId = selectedDocument?.id ?? 0;

      if (wasCreating) {
        const createdDocument = await documentsService.create({
          title,
          contentMarkdown: stripImageMarkdown(draft.contentMarkdown),
          visibility: draft.visibility,
        });
        documentId = createdDocument.id;
        savedPlaceholderContentRef.current = createdDocument.contentMarkdown;
        setSelectedDocument(createdDocument);
        setIsCreating(false);
      }

      let content = draft.contentMarkdown;
      for (const pendingImage of extractDataUriImages(content)) {
        const uploadedImage = await documentsService.uploadImage(
          documentId,
          pendingImageFilesByDataUriRef.current.get(pendingImage.dataUri) ??
            dataUriToFile(pendingImage.dataUri, pendingImage.contentType),
        );
        if (!uploadedImage.url) {
          throw new Error('Backend chưa trả URL Cloudflare R2 cho ảnh vừa tải lên.');
        }

        content = replaceDataUriWithSrc(content, pendingImage.dataUri, uploadedImage.url);
        hydratedImageSrcByIdRef.current.set(uploadedImage.url, uploadedImage.id);
        pendingImageFilesByDataUriRef.current.delete(pendingImage.dataUri);
      }

      const referencedImageIds = new Set(extractPlaceholderIds(content));
      for (const [src, imageId] of hydratedImageSrcByIdRef.current) {
        if (content.includes(src)) referencedImageIds.add(imageId);
      }

      const previousImageIds = new Set(extractPlaceholderIds(savedPlaceholderContentRef.current));
      for (const [src, imageId] of hydratedImageSrcByIdRef.current) {
        if (savedPlaceholderContentRef.current.includes(src)) previousImageIds.add(imageId);
      }

      const orphanImageIds = [...previousImageIds]
        .filter(imageId => !referencedImageIds.has(imageId));

      for (const orphanImageId of orphanImageIds) {
        try {
          await documentsService.deleteImage(documentId, orphanImageId);
        } catch {
          // Non-fatal: a leftover image row must not fail the save.
          toast.warning('Không thể xoá một ảnh không còn được sử dụng.');
        }
      }

      const savedDocument = await documentsService.update(documentId, {
        title,
        contentMarkdown: content,
        visibility: draft.visibility,
      });

      savedPlaceholderContentRef.current = savedDocument.contentMarkdown;
      const hydratedSavedDocument = await hydrateDocument(savedDocument);
      setSelectedDocument(hydratedSavedDocument);
      setIsEditing(false);
      await refreshDocuments();
      toast.success(wasCreating ? 'Đã tạo tài liệu.' : 'Đã lưu thay đổi.');
    } catch (error: any) {
      toast.error(error.message || 'Không thể lưu tài liệu.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = async () => {
    if (!selectedDocument?.canEdit) return;
    if (!window.confirm(`Xoá tài liệu “${selectedDocument.title}”?`)) return;

    try {
      await documentsService.delete(selectedDocument.id);
      await refreshDocuments();
      setSelectedDocument(null);
      toast.success('Đã xoá tài liệu.');
    } catch (error: any) {
      toast.error(error.message || 'Không thể xoá tài liệu.');
    }
  };

  return (
    <div className="mx-auto min-h-[calc(100dvh-112px)] w-full max-w-[1280px] p-3 sm:p-5">
      {!selectedDocument && !isEditing ? (
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-card">
          <div className="border-b border-outline-variant px-4 py-4 sm:px-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black text-on-surface">
                  <BookOpenText className="h-5 w-5 text-primary" /> Tài liệu
                </h1>
                <p className="mt-1 text-xs font-medium text-on-surface-variant">Chọn một tài liệu để mở nội dung chi tiết.</p>
              </div>
              <button type="button" onClick={startCreating} className="btn-primary h-10 px-4" title="Tạo tài liệu mới">
                <Plus className="h-4 w-4" /> Thêm tài liệu
              </button>
            </div>

            <label className="relative block max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="Tìm trong tài liệu..."
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface-2 pl-9 pr-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <div className="p-3 sm:p-5">
            {isLoadingList ? (
              <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm font-semibold text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách tài liệu...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                <FileText className="mb-3 h-10 w-10 text-on-surface-variant/40" />
                <p className="text-base font-bold text-on-surface">Chưa có tài liệu</p>
                <p className="mt-1 text-sm text-on-surface-variant">Tạo tài liệu đầu tiên để bắt đầu ghi chú.</p>
                <button type="button" onClick={startCreating} className="btn-primary mt-5">
                  <Plus className="h-4 w-4" /> Tạo tài liệu
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-outline-variant">
                <div className="grid grid-cols-[minmax(0,1fr)_120px_180px] gap-4 border-b border-outline-variant bg-surface-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant max-md:hidden">
                  <span>Tiêu đề</span>
                  <span>Phạm vi</span>
                  <span>Cập nhật</span>
                </div>
                <div className="divide-y divide-outline-variant/70">
                  {filteredDocuments.map(document => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => void loadDocument(document.id)}
                      className="grid w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/25 md:grid-cols-[minmax(0,1fr)_120px_180px] md:items-center md:gap-4"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold text-on-surface">{document.title}</span>
                        <span className="mt-1 block truncate text-xs text-on-surface-variant">
                          {document.preview || 'Tài liệu chưa có nội dung'}
                        </span>
                      </span>
                      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold ${
                        document.visibility === 1
                          ? 'bg-primary-subtle text-primary'
                          : 'bg-surface-2 text-on-surface-variant'
                      }`}>
                        {document.visibility === 1 ? <Globe2 className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
                        {visibilityLabel(document.visibility)}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant/80">
                        <Clock3 className="h-3.5 w-3.5" /> {formatDateTime(document.updatedAt || document.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
      <main className="min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-card">
        {isLoadingDocument ? (
          <div className="flex min-h-[560px] items-center justify-center gap-2 text-sm font-semibold text-on-surface-variant">
            <Loader2 className="h-5 w-5 animate-spin" /> Đang mở tài liệu...
          </div>
        ) : isEditing ? (
          <form onSubmit={saveDocument} className="min-h-full">
            <div className="border-b border-outline-variant px-4 py-4 sm:px-7">
              <div className="mx-auto max-w-6xl">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={goBackToList} disabled={isSaving} className="btn-secondary h-9 px-3">
                      <ArrowLeft className="h-4 w-4" /> Danh sách
                    </button>
                    <select
                      value={draft.visibility}
                      onChange={event => setDraft(current => ({
                        ...current,
                        visibility: Number(event.target.value) as KnowledgeDocumentVisibility,
                      }))}
                      className="h-9 rounded-lg border border-outline-variant bg-surface-2 px-3 text-xs font-extrabold text-on-surface outline-none focus:border-primary"
                      aria-label="Phạm vi tài liệu"
                    >
                      <option value={2}>Personal - chỉ mình tôi</option>
                      <option value={1}>Global - tất cả người dùng</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void cancelEditing()} disabled={isSaving} className="btn-secondary h-9 px-3">
                      <X className="h-4 w-4" /> Huỷ
                    </button>
                    <button type="submit" disabled={isSaving} className="btn-primary h-9 px-4">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isSaving ? 'Đang lưu' : 'Lưu tài liệu'}
                    </button>
                  </div>
                </div>

                <input
                  autoFocus
                  value={draft.title}
                  onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
                  maxLength={250}
                  placeholder="Tiêu đề tài liệu"
                  className="w-full border-none bg-transparent py-2 text-3xl font-black tracking-tight text-on-surface outline-none placeholder:text-on-surface-variant/40 sm:text-4xl"
                />
                <p className="mt-1 text-xs text-on-surface-variant">
                  Soạn thảo trực quan; hệ thống tự lưu dưới dạng Markdown. {draft.visibility === 1 ? 'Tất cả tài khoản có thể xem.' : 'Chỉ tài khoản của bạn có thể xem.'}
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-6">
              <div className="mx-auto max-w-6xl">
                <MarkdownEditor
                  value={draft.contentMarkdown}
                  onChange={contentMarkdown => setDraft(current => ({ ...current, contentMarkdown }))}
                  onImageInserted={(dataUri, file) => {
                    pendingImageFilesByDataUriRef.current.set(dataUri, file);
                  }}
                />
              </div>
            </div>
          </form>
        ) : selectedDocument ? (
          <div className="min-h-full">
            <header className="border-b border-outline-variant px-5 py-5 sm:px-8">
              <div className="mx-auto max-w-5xl">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={goBackToList} className="btn-secondary h-9 px-3">
                      <ArrowLeft className="h-4 w-4" /> Danh sách
                    </button>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                      selectedDocument.visibility === 1
                        ? 'bg-primary-subtle text-primary'
                        : 'bg-surface-2 text-on-surface-variant'
                    }`}>
                      {selectedDocument.visibility === 1 ? <Globe2 className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                      {visibilityLabel(selectedDocument.visibility)}
                    </span>
                  </div>

                  {selectedDocument.canEdit && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void deleteDocument()} className="btn-danger h-9 px-3">
                        <Trash2 className="h-4 w-4" /> Xoá
                      </button>
                      <button type="button" onClick={startEditing} className="btn-primary h-9 px-4">
                        <Edit3 className="h-4 w-4" /> Chỉnh sửa
                      </button>
                    </div>
                  )}
                </div>

                <h1 className="text-3xl font-black tracking-tight text-on-surface sm:text-4xl">{selectedDocument.title}</h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-on-surface-variant">
                  <Clock3 className="h-3.5 w-3.5" />
                  Cập nhật {formatDateTime(selectedDocument.updatedAt || selectedDocument.createdAt)}
                  {!selectedDocument.canEdit && <span>• Tài liệu được chia sẻ toàn hệ thống</span>}
                </p>
              </div>
            </header>

            <div className="px-5 py-7 sm:px-8 sm:py-10">
              <MarkdownRenderer content={selectedDocument.contentMarkdown} className="mx-auto max-w-5xl" />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[560px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
              <BookOpenText className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black text-on-surface">Kho tài liệu Markdown</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
              Viết hướng dẫn, quy trình và ghi chú. Bạn có thể giữ riêng tư hoặc chia sẻ cho toàn bộ người dùng.
            </p>
            <button type="button" onClick={startCreating} className="btn-primary mt-5">
              <Plus className="h-4 w-4" /> Tạo tài liệu đầu tiên
            </button>
          </div>
        )}
      </main>
      )}
    </div>
  );
}
