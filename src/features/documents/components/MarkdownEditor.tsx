import React, { ChangeEvent, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Rows3,
  Strikethrough,
  Table2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createKnowledgeDocumentExtensions,
} from '../utils/richTextMarkdown';
import {
  readFileAsDataUri,
  sanitizeAltText,
  validateImageFile,
} from '../utils/documentImages';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onImageInserted?: (dataUri: string, file: File) => void;
};

type ToolbarButtonProps = {
  children: ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const MIN_IMAGE_WIDTH_PERCENT = 20;
const MAX_IMAGE_WIDTH_PERCENT = 100;
const IMAGE_ZOOM_STEP = 10;

function normalizeImageWidthPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MAX_IMAGE_WIDTH_PERCENT;
  return Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, Math.round(numeric)));
}

function ToolbarButton({ children, title, active = false, disabled = false, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-black transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? 'bg-primary-subtle text-primary'
          : 'text-on-surface-variant hover:bg-surface-2 hover:text-on-surface'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-outline-variant" />;
}

/**
 * Collects image files from a paste or drop payload. Some browsers expose a pasted
 * screenshot only through `items`, so `files` alone is not enough.
 */
function getImageFiles(dataTransfer: DataTransfer | null | undefined): File[] {
  if (!dataTransfer) return [];

  const droppedFiles = Array.from(dataTransfer.files || []).filter(file =>
    file.type.startsWith('image/'),
  );
  if (droppedFiles.length > 0) return droppedFiles;

  return Array.from(dataTransfer.items || [])
    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null);
}

export default function MarkdownEditor({ value, onChange, onImageInserted }: MarkdownEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Inserts images at `startPos`, advancing past each one so a multi-file paste keeps
   * document order. Validation and its toast run before any FileReader work, so an
   * oversized or unsupported file never gets read.
   */
  const insertImageFiles = useCallback(async (files: File[], startPos: number) => {
    let position = startPos;

    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }

      try {
        const dataUri = await readFileAsDataUri(file);
        const currentEditor = editorRef.current;
        if (!currentEditor) return;

        onImageInserted?.(dataUri, file);

        // The document may have changed while the file was being read.
        const safePosition = Math.min(position, currentEditor.state.doc.content.size);
        currentEditor
          .chain()
          .focus()
          .insertContentAt(safePosition, {
            type: 'image',
            attrs: { src: dataUri, alt: sanitizeAltText(file.name) },
          })
          .run();

        position = currentEditor.state.selection.from;
      } catch {
        toast.error(`Không thể đọc tệp ảnh ${file.name}.`);
      }
    }
  }, [onImageInserted]);

  const editor = useEditor({
    extensions: createKnowledgeDocumentExtensions(),
    content: value || '',
    contentType: 'markdown',
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'tiptap',
        spellcheck: 'true',
        'aria-label': 'Nội dung tài liệu',
      },
      handlePaste: (view, event) => {
        const imageFiles = getImageFiles(event.clipboardData);
        if (imageFiles.length === 0) return false;

        void insertImageFiles(imageFiles, view.state.selection.from);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        // `moved` means an internal node drag (e.g. repositioning an existing image).
        // Consuming it would break in-document drag and drop.
        if (moved) return false;

        const imageFiles = getImageFiles(event.dataTransfer);
        if (imageFiles.length === 0) return false;

        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
        void insertImageFiles(imageFiles, coordinates?.pos ?? view.state.selection.from);
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getMarkdown());
    },
  }, []);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Reset so picking the same file twice in a row still fires a change event.
    event.target.value = '';

    const currentEditor = editorRef.current;
    if (files.length === 0 || !currentEditor) return;

    void insertImageFiles(files, currentEditor.state.selection.from);
  };

  if (!editor) {
    return <div className="min-h-[520px] animate-pulse rounded-xl bg-surface-2" />;
  }

  const setLink = () => {
    const previousUrl = String(editor.getAttributes('link').href || '');
    const url = window.prompt('Nhập đường dẫn liên kết:', previousUrl || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const isInTable = editor.isActive('table');
  const isImageSelected = editor.isActive('image');
  const selectedImageWidthPercent = normalizeImageWidthPercent(editor.getAttributes('image').widthPercent);

  const updateSelectedImageWidth = (nextWidthPercent: number) => {
    const normalizedWidth = normalizeImageWidthPercent(nextWidthPercent);
    editor
      .chain()
      .focus()
      .updateAttributes('image', { widthPercent: normalizedWidth })
      .run();
  };

  return (
    <div className="document-rich-editor overflow-hidden rounded-xl border border-outline-variant bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-outline-variant bg-surface px-2 py-1.5">
        <ToolbarButton title="Đoạn văn" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Tiêu đề cấp 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarButton>
        <ToolbarButton title="Tiêu đề cấp 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton title="Tiêu đề cấp 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
        <ToolbarSeparator />

        <ToolbarButton title="In đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="In nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Gạch ngang" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Mã trong dòng" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Braces className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Liên kết" active={editor.isActive('link')} onClick={setLink}><Link2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarSeparator />

        <ToolbarButton title="Căn trái" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Căn giữa" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Căn phải" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></ToolbarButton>
        <ToolbarSeparator />

        <ToolbarButton title="Danh sách" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Danh sách đánh số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Khối mã" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Rows3 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Đường phân cách" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
        <ToolbarSeparator />

        <ToolbarButton
          title="Chèn bảng 3 × 3"
          active={isInTable}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <Table2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Chèn ảnh" onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={false}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleImageInputChange}
        />
        {isImageSelected && (
          <>
            <ToolbarSeparator />
            <ToolbarButton
              title="Thu nhỏ ảnh"
              onClick={() => updateSelectedImageWidth(selectedImageWidthPercent - IMAGE_ZOOM_STEP)}
            >
              <ZoomOut className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Phóng to ảnh"
              onClick={() => updateSelectedImageWidth(selectedImageWidthPercent + IMAGE_ZOOM_STEP)}
            >
              <ZoomIn className="h-4 w-4" />
            </ToolbarButton>
            <input
              type="range"
              min={MIN_IMAGE_WIDTH_PERCENT}
              max={MAX_IMAGE_WIDTH_PERCENT}
              step={5}
              value={selectedImageWidthPercent}
              onChange={event => updateSelectedImageWidth(Number(event.target.value))}
              className="mx-1 h-2 w-28 cursor-pointer accent-primary"
              aria-label="Kích thước ảnh"
            />
            <span className="min-w-12 text-center text-[10px] font-extrabold text-on-surface-variant">
              {selectedImageWidthPercent}%
            </span>
          </>
        )}
        {isInTable && (
          <>
            <ToolbarButton title="Thêm hàng bên dưới" onClick={() => editor.chain().focus().addRowAfter().run()}>+H</ToolbarButton>
            <ToolbarButton title="Thêm cột bên phải" onClick={() => editor.chain().focus().addColumnAfter().run()}>+C</ToolbarButton>
            <ToolbarButton title="Xoá hàng" onClick={() => editor.chain().focus().deleteRow().run()}>−H</ToolbarButton>
            <ToolbarButton title="Xoá cột" onClick={() => editor.chain().focus().deleteColumn().run()}>−C</ToolbarButton>
            <ToolbarButton title="Xoá bảng" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="h-4 w-4" /></ToolbarButton>
          </>
        )}

        <span className="ml-auto flex items-center gap-0.5 pl-2">
          <ToolbarButton title="Hoàn tác" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton title="Làm lại" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
        </span>
      </div>

      <div className="relative">
        {editor.isEmpty && (
          <p className="pointer-events-none absolute left-6 top-5 z-[1] text-sm text-on-surface-variant/55">
            Bắt đầu viết tài liệu...
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant bg-surface-2 px-4 py-2 text-[10px] font-semibold text-on-surface-variant">
        <span>Soạn thảo trực quan — dán, kéo-thả và đổi kích thước ảnh từ các góc (tối đa 1MB)</span>
        <span>Hệ thống tự chuyển đổi và lưu dưới dạng Markdown</span>
      </div>
    </div>
  );
}
