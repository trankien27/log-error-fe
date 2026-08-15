import React, { ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
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
} from 'lucide-react';
import {
  createKnowledgeDocumentExtensions,
} from '../utils/richTextMarkdown';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type ToolbarButtonProps = {
  children: ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

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

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
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
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getMarkdown());
    },
  }, []);

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
        <span>Soạn thảo trực quan — định dạng hiển thị ngay khi gõ</span>
        <span>Hệ thống tự chuyển đổi và lưu dưới dạng Markdown</span>
      </div>
    </div>
  );
}
