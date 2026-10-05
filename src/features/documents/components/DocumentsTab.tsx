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
  Users,
  NotebookTabs,
} from 'lucide-react';
import { toast } from 'sonner';
import { documentsService } from '../../../services/api/documentsService';
import { usersService } from '../../../services/api/usersService';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  KnowledgeDocumentDto,
  KnowledgeDocumentEditAccess,
  KnowledgeDocumentSummaryDto,
  KnowledgeDocumentVisibility,
  SaveKnowledgeDocumentRequest,
  User,
} from '../../../types';
import { PageHeader, SectionCard, FilterBar, EmptyState, ListSkeleton, Skeleton, confirmAction } from '../../../components/ui';
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
  editAccess: 1,
  editorIds: [],
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function visibilityLabel(visibility: KnowledgeDocumentVisibility) {
  return visibility === 1 ? 'Công khai' : 'Riêng tư';
}

function editAccessLabel(editAccess: KnowledgeDocumentEditAccess) {
  if (editAccess === 3) return 'Mọi người có thể sửa';
  if (editAccess === 2) return 'Người được chọn có thể sửa';
  return 'Chỉ chủ tài liệu có thể sửa';
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
  const currentUser = useAuthStore(state => state.currentUser);
  const [documents, setDocuments] = useState<KnowledgeDocumentSummaryDto[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocumentDto | null>(null);
  const [draft, setDraft] = useState<SaveKnowledgeDocumentRequest>(EMPTY_DRAFT);
  const [keyword, setKeyword] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [availableEditors, setAvailableEditors] = useState<User[]>([]);
  const [editorSearch, setEditorSearch] = useState('');
  const [isLoadingEditors, setIsLoadingEditors] = useState(false);

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

  const filteredEditors = useMemo(() => {
    const normalizedSearch = editorSearch.trim().toLocaleLowerCase('vi-VN');
    return availableEditors.filter(user => {
      if (user.id === currentUser?.id) return false;
      if (!normalizedSearch) return true;
      return user.name.toLocaleLowerCase('vi-VN').includes(normalizedSearch) ||
        user.email.toLocaleLowerCase('vi-VN').includes(normalizedSearch);
    });
  }, [availableEditors, currentUser?.id, editorSearch]);

  const loadAvailableEditors = async () => {
    if (availableEditors.length > 0 || isLoadingEditors) return;
    setIsLoadingEditors(true);
    try {
      const users = await usersService.getUsers({ isActive: true, pageSize: 200 });
      setAvailableEditors(users);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setIsLoadingEditors(false);
    }
  };

  const toggleEditor = (userId: string) => {
    setDraft(current => ({
      ...current,
      editorIds: current.editorIds.includes(userId)
        ? current.editorIds.filter(id => id !== userId)
        : [...current.editorIds, userId],
    }));
  };

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
    setEditorSearch('');
    void loadAvailableEditors();
  };

  const startEditing = () => {
    if (!selectedDocument?.canEdit) return;
    setDraft({
      title: selectedDocument.title,
      contentMarkdown: selectedDocument.contentMarkdown,
      visibility: selectedDocument.visibility,
      editAccess: selectedDocument.editAccess,
      editorIds: selectedDocument.editorIds,
    });
    setIsCreating(false);
    setIsEditing(true);
    setEditorSearch('');
    if (selectedDocument.canManageAccess) void loadAvailableEditors();
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

    if ((isCreating || selectedDocument?.canManageAccess) && draft.editAccess === 2 && draft.editorIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người được chỉnh sửa tài liệu.');
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
          editAccess: draft.editAccess,
          editorIds: draft.editorIds,
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
          throw new Error('Không nhận được đường dẫn ảnh vừa tải lên.');
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
          toast.warning('Không thể xóa một ảnh không còn dùng.');
        }
      }

      const savedDocument = await documentsService.update(documentId, {
        title,
        contentMarkdown: content,
        visibility: draft.visibility,
        editAccess: draft.editAccess,
        editorIds: draft.editorIds,
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
    if (!selectedDocument?.canManageAccess) return;
    if (!(await confirmAction({
      title: 'Xóa tài liệu này?',
      content: `“${selectedDocument.title}” sẽ bị xóa vĩnh viễn và không thể hoàn tác.`,
    }))) return;

    try {
      await documentsService.delete(selectedDocument.id);
      await refreshDocuments();
      setSelectedDocument(null);
      toast.success('Đã xóa tài liệu.');
    } catch (error: any) {
      toast.error(error.message || 'Không thể xóa tài liệu.');
    }
  };

  const selectClassName = 'h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary';

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 animate-fadeIn">
      {!selectedDocument && !isEditing && !isLoadingDocument ? (
        <>
          <PageHeader
            title="Tài liệu"
            description="Hướng dẫn, quy trình và ghi chú dùng chung."
            icon={NotebookTabs}
            actions={
              <button type="button" onClick={startCreating} className="btn-primary">
                <Plus className="h-4 w-4" /> Tạo tài liệu
              </button>
            }
          />

          <FilterBar>
            <label className="relative block w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="Tìm theo tiêu đề hoặc nội dung…"
                aria-label="Tìm tài liệu"
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface pl-9 pr-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </FilterBar>

          <SectionCard bodyClassName="p-0">
            {isLoadingList ? (
              <div className="p-4 sm:p-5">
                <ListSkeleton rows={6} />
              </div>
            ) : filteredDocuments.length === 0 ? (
              keyword.trim() ? (
                <EmptyState
                  icon={Search}
                  title="Không tìm thấy tài liệu"
                  description="Thử tìm với từ khóa khác."
                />
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Chưa có tài liệu"
                  description="Tạo tài liệu đầu tiên để bắt đầu ghi chú."
                  action={
                    <button type="button" onClick={startCreating} className="btn-primary">
                      <Plus className="h-4 w-4" /> Tạo tài liệu
                    </button>
                  }
                />
              )
            ) : (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_130px_180px] gap-4 border-b border-outline-variant bg-surface-2/60 px-4 py-3 text-xs font-medium text-on-surface-variant max-md:hidden">
                  <span>Tiêu đề</span>
                  <span>Phạm vi</span>
                  <span>Cập nhật</span>
                </div>
                <div className="divide-y divide-outline-variant">
                  {filteredDocuments.map(document => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => void loadDocument(document.id)}
                      className="grid w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-2/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/25 md:grid-cols-[minmax(0,1fr)_130px_180px] md:items-center md:gap-4"
                    >
                      <span className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-on-surface">{document.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                            {document.preview || 'Chưa có nội dung'}
                          </span>
                        </span>
                      </span>
                      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium max-md:ml-11 ${
                        document.visibility === 1
                          ? 'bg-primary-subtle text-primary'
                          : 'bg-surface-2 text-on-surface-variant'
                      }`}>
                        {document.visibility === 1 ? <Globe2 className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
                        {visibilityLabel(document.visibility)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-on-surface-variant max-md:ml-11">
                        <Clock3 className="h-3.5 w-3.5" /> {formatDateTime(document.updatedAt || document.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        </>
      ) : (
      <main className="card-surface min-w-0 overflow-hidden">
        {isLoadingDocument ? (
          <div className="mx-auto max-w-5xl space-y-4 px-5 py-8 sm:px-8" aria-busy="true" aria-label="Đang mở tài liệu">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="space-y-3 pt-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : isEditing ? (
          <form onSubmit={saveDocument} className="min-h-full">
            <div className="border-b border-outline-variant px-4 py-4 sm:px-7">
              <div className="mx-auto max-w-6xl">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={goBackToList} disabled={isSaving} className="btn-ghost h-9 px-3">
                      <ArrowLeft className="h-4 w-4" /> Danh sách
                    </button>
                    {(isCreating || selectedDocument?.canManageAccess) ? (
                      <>
                        <select
                          value={draft.visibility}
                          onChange={event => setDraft(current => ({
                            ...current,
                            visibility: Number(event.target.value) as KnowledgeDocumentVisibility,
                          }))}
                          className={selectClassName}
                          aria-label="Ai có thể xem"
                        >
                          <option value={2}>Chỉ người được cấp quyền xem</option>
                          <option value={1}>Mọi người đều xem được</option>
                        </select>
                        <select
                          value={draft.editAccess}
                          onChange={event => setDraft(current => ({
                            ...current,
                            editAccess: Number(event.target.value) as KnowledgeDocumentEditAccess,
                            editorIds: Number(event.target.value) === 2 ? current.editorIds : [],
                          }))}
                          className={selectClassName}
                          aria-label="Ai có thể sửa"
                        >
                          <option value={1}>Chỉ mình tôi được sửa</option>
                          <option value={2}>Chọn người được sửa</option>
                          <option value={3}>Mọi người đều sửa được</option>
                        </select>
                      </>
                    ) : (
                      <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-subtle px-3 text-xs font-medium text-primary">
                        <Users className="h-3.5 w-3.5" /> {editAccessLabel(draft.editAccess)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void cancelEditing()} disabled={isSaving} className="btn-secondary h-9 px-3">
                      Hủy
                    </button>
                    <button type="submit" disabled={isSaving} className="btn-primary h-9 px-4">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isSaving ? 'Đang lưu…' : 'Lưu tài liệu'}
                    </button>
                  </div>
                </div>

                {(isCreating || selectedDocument?.canManageAccess) && draft.editAccess === 2 && (
                  <div className="mb-4 rounded-xl border border-outline-variant bg-surface-2/60 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-on-surface">
                          <Users className="h-4 w-4 text-primary" /> Người được sửa
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Đã chọn {draft.editorIds.length} người. Họ sửa được nội dung nhưng không thể xóa hay đổi quyền.
                        </p>
                      </div>
                      <input
                        value={editorSearch}
                        onChange={event => setEditorSearch(event.target.value)}
                        placeholder="Tìm theo tên hoặc email…"
                        aria-label="Tìm người dùng"
                        className="h-9 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary sm:w-72"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto rounded-lg border border-outline-variant bg-surface">
                      {isLoadingEditors ? (
                        <ListSkeleton rows={3} className="p-4" />
                      ) : filteredEditors.length === 0 ? (
                        <EmptyState compact icon={Users} title="Không tìm thấy người dùng" />
                      ) : (
                        <div className="divide-y divide-outline-variant">
                          {filteredEditors.map(user => (
                            <label key={user.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-surface-2/50">
                              <input
                                type="checkbox"
                                checked={draft.editorIds.includes(user.id)}
                                onChange={() => toggleEditor(user.id)}
                                className="h-4 w-4 rounded border-outline-variant accent-primary"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-on-surface">{user.name}</span>
                                <span className="block truncate text-xs text-on-surface-variant">{user.email}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <input
                  autoFocus
                  value={draft.title}
                  onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
                  maxLength={250}
                  placeholder="Tiêu đề tài liệu"
                  aria-label="Tiêu đề tài liệu"
                  className="w-full border-none bg-transparent py-2 text-2xl font-semibold tracking-tight text-on-surface outline-none placeholder:text-on-surface-variant/50 sm:text-3xl"
                />
                <p className="mt-1 text-xs text-on-surface-variant">
                  {draft.visibility === 1
                    ? 'Mọi người đều xem được tài liệu này.'
                    : draft.editAccess === 1
                      ? 'Chỉ bạn xem được tài liệu này.'
                      : 'Bạn và những người được sửa xem được tài liệu này.'}
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
                    <button type="button" onClick={goBackToList} className="btn-ghost h-9 px-3">
                      <ArrowLeft className="h-4 w-4" /> Danh sách
                    </button>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedDocument.visibility === 1
                        ? 'bg-primary-subtle text-primary'
                        : 'bg-surface-2 text-on-surface-variant'
                    }`}>
                      {selectedDocument.visibility === 1 ? <Globe2 className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                      {visibilityLabel(selectedDocument.visibility)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                      <Users className="h-3.5 w-3.5" /> {editAccessLabel(selectedDocument.editAccess)}
                    </span>
                  </div>

                  {selectedDocument.canEdit && (
                    <div className="flex items-center gap-2">
                      {selectedDocument.canManageAccess && (
                        <button type="button" onClick={() => void deleteDocument()} className="btn-danger h-9 px-3">
                          <Trash2 className="h-4 w-4" /> Xóa
                        </button>
                      )}
                      <button type="button" onClick={startEditing} className="btn-primary h-9 px-4">
                        <Edit3 className="h-4 w-4" /> Chỉnh sửa
                      </button>
                    </div>
                  )}
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">{selectedDocument.title}</h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
                  <Clock3 className="h-3.5 w-3.5" />
                  Cập nhật {formatDateTime(selectedDocument.updatedAt || selectedDocument.createdAt)}
                  {selectedDocument.canEdit && !selectedDocument.canManageAccess && <span>• Bạn có quyền chỉnh sửa</span>}
                  {!selectedDocument.canEdit && <span>• Bạn chỉ có quyền xem</span>}
                </p>
              </div>
            </header>

            <div className="px-5 py-7 sm:px-8 sm:py-10">
              <MarkdownRenderer content={selectedDocument.contentMarkdown} className="mx-auto max-w-5xl" />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={BookOpenText}
            title="Chưa chọn tài liệu"
            description="Quay lại danh sách để mở hoặc tạo tài liệu mới."
            action={
              <button type="button" onClick={startCreating} className="btn-primary">
                <Plus className="h-4 w-4" /> Tạo tài liệu
              </button>
            }
            className="min-h-[560px]"
          />
        )}
      </main>
      )}
    </div>
  );
}
