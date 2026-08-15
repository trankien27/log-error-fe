import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
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

  const filteredDocuments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('vi-VN');
    if (!normalizedKeyword) return documents;
    return documents.filter(document =>
      document.title.toLocaleLowerCase('vi-VN').includes(normalizedKeyword) ||
      document.preview.toLocaleLowerCase('vi-VN').includes(normalizedKeyword),
    );
  }, [documents, keyword]);

  const loadDocument = async (id: number) => {
    setIsLoadingDocument(true);
    try {
      const document = await documentsService.getById(id);
      setSelectedDocument(document);
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
        if (items.length > 0) {
          const firstDocument = await documentsService.getById(items[0].id);
          if (isMounted) setSelectedDocument(firstDocument);
        }
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
    const firstDocument = documents[0];
    if (firstDocument) await loadDocument(firstDocument.id);
  };

  const saveDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    setIsSaving(true);
    try {
      const savedDocument = isCreating
        ? await documentsService.create({ ...draft, title: draft.title.trim() })
        : await documentsService.update(selectedDocument!.id, { ...draft, title: draft.title.trim() });

      setSelectedDocument(savedDocument);
      setIsCreating(false);
      setIsEditing(false);
      await refreshDocuments();
      toast.success(isCreating ? 'Đã tạo tài liệu.' : 'Đã lưu thay đổi.');
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
      const remainingDocuments = await refreshDocuments();
      setSelectedDocument(null);
      if (remainingDocuments.length > 0) await loadDocument(remainingDocuments[0].id);
      toast.success('Đã xoá tài liệu.');
    } catch (error: any) {
      toast.error(error.message || 'Không thể xoá tài liệu.');
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-112px)] w-full max-w-[1680px] flex-col gap-4 p-3 sm:p-5 xl:flex-row">
      <aside className="flex max-h-[360px] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-card xl:max-h-none xl:w-[330px]">
        <div className="border-b border-outline-variant p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-black text-on-surface">
                <BookOpenText className="h-5 w-5 text-primary" /> Tài liệu
              </h1>
              <p className="mt-1 text-[11px] font-medium text-on-surface-variant">Kho Markdown dùng chung và cá nhân</p>
            </div>
            <button type="button" onClick={startCreating} className="btn-primary h-9 px-3" title="Tạo tài liệu mới">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline xl:hidden 2xl:inline">Thêm</span>
            </button>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm trong tài liệu..."
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface-2 pl-9 pr-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {isLoadingList ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText className="mx-auto mb-3 h-9 w-9 text-on-surface-variant/40" />
              <p className="text-sm font-bold text-on-surface">Chưa có tài liệu</p>
              <p className="mt-1 text-xs text-on-surface-variant">Tạo tài liệu đầu tiên để bắt đầu ghi chú.</p>
            </div>
          ) : (
            filteredDocuments.map(document => {
              const isSelected = !isCreating && selectedDocument?.id === document.id;
              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => void loadDocument(document.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-primary/25 bg-primary-subtle'
                      : 'border-transparent hover:border-outline-variant hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`line-clamp-2 text-sm font-extrabold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{document.title}</p>
                    {document.visibility === 1
                      ? <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      : <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-surface-variant" />}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-on-surface-variant">
                    {document.preview || 'Tài liệu chưa có nội dung'}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant/80">
                    <Clock3 className="h-3 w-3" /> {formatDateTime(document.updatedAt || document.createdAt)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-card">
        {isLoadingDocument ? (
          <div className="flex min-h-[560px] items-center justify-center gap-2 text-sm font-semibold text-on-surface-variant">
            <Loader2 className="h-5 w-5 animate-spin" /> Đang mở tài liệu...
          </div>
        ) : isEditing ? (
          <form onSubmit={saveDocument} className="min-h-full">
            <div className="border-b border-outline-variant px-4 py-4 sm:px-7">
              <div className="mx-auto max-w-6xl">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <select
                    value={draft.visibility}
                    onChange={event => setDraft(current => ({
                      ...current,
                      visibility: Number(event.target.value) as KnowledgeDocumentVisibility,
                    }))}
                    className="h-9 rounded-lg border border-outline-variant bg-surface-2 px-3 text-xs font-extrabold text-on-surface outline-none focus:border-primary"
                    aria-label="Phạm vi tài liệu"
                  >
                    <option value={2}>🔒 Personal — chỉ mình tôi</option>
                    <option value={1}>🌐 Global — tất cả người dùng</option>
                  </select>

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
                  Nội dung được lưu dưới dạng Markdown. {draft.visibility === 1 ? 'Tất cả tài khoản có thể xem.' : 'Chỉ tài khoản của bạn có thể xem.'}
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-6">
              <div className="mx-auto max-w-6xl">
                <MarkdownEditor
                  value={draft.contentMarkdown}
                  onChange={contentMarkdown => setDraft(current => ({ ...current, contentMarkdown }))}
                />
              </div>
            </div>
          </form>
        ) : selectedDocument ? (
          <div className="min-h-full">
            <header className="border-b border-outline-variant px-5 py-5 sm:px-8">
              <div className="mx-auto max-w-5xl">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                    selectedDocument.visibility === 1
                      ? 'bg-primary-subtle text-primary'
                      : 'bg-surface-2 text-on-surface-variant'
                  }`}>
                    {selectedDocument.visibility === 1 ? <Globe2 className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                    {visibilityLabel(selectedDocument.visibility)}
                  </span>

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
    </div>
  );
}
