import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  Bold,
  Braces,
  Code2,
  Eye,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Rows3,
  SeparatorHorizontal,
  Table2,
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import {
  insertMarkdownSnippet,
  MarkdownSelectionResult,
  prefixMarkdownLines,
  wrapMarkdownSelection,
} from '../utils/markdownEditor.utils';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type EditorMode = 'write' | 'split' | 'preview';

const toolButtonClass = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-black text-on-surface-variant transition-colors hover:bg-surface-2 hover:text-on-surface cursor-pointer';

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<EditorMode>('split');

  const applyResult = (result: MarkdownSelectionResult) => {
    onChange(result.value);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const selection = () => {
    const textarea = textareaRef.current;
    return {
      start: textarea?.selectionStart ?? value.length,
      end: textarea?.selectionEnd ?? value.length,
    };
  };

  const wrap = (before: string, after: string, placeholder: string) => {
    const { start, end } = selection();
    applyResult(wrapMarkdownSelection(value, start, end, before, after, placeholder));
  };

  const prefix = (marker: string, placeholder: string) => {
    const { start, end } = selection();
    applyResult(prefixMarkdownLines(value, start, end, marker, placeholder));
  };

  const insert = (snippet: string) => {
    const { start, end } = selection();
    applyResult(insertMarkdownSnippet(value, start, end, snippet));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          <button type="button" title="Tiêu đề cấp 1" className={toolButtonClass} onClick={() => prefix('# ', 'Tiêu đề')}><Heading1 className="h-4 w-4" /></button>
          <button type="button" title="Tiêu đề cấp 2" className={toolButtonClass} onClick={() => prefix('## ', 'Tiêu đề')}><Heading2 className="h-4 w-4" /></button>
          <button type="button" title="Đoạn văn" className={toolButtonClass} onClick={() => insert('\n\n')}><Pilcrow className="h-4 w-4" /></button>
          <span className="mx-1 h-5 w-px bg-outline-variant" />
          <button type="button" title="In đậm" className={toolButtonClass} onClick={() => wrap('**', '**', 'văn bản in đậm')}><Bold className="h-4 w-4" /></button>
          <button type="button" title="In nghiêng" className={toolButtonClass} onClick={() => wrap('_', '_', 'văn bản in nghiêng')}><Italic className="h-4 w-4" /></button>
          <button type="button" title="Căn giữa" className={toolButtonClass} onClick={() => wrap('<p align="center">', '</p>', 'Nội dung căn giữa')}><AlignCenter className="h-4 w-4" /></button>
          <button type="button" title="Liên kết" className={toolButtonClass} onClick={() => wrap('[', '](https://)', 'tên liên kết')}><Link2 className="h-4 w-4" /></button>
          <span className="mx-1 h-5 w-px bg-outline-variant" />
          <button type="button" title="Danh sách" className={toolButtonClass} onClick={() => prefix('- ', 'Mục danh sách')}><List className="h-4 w-4" /></button>
          <button type="button" title="Danh sách đánh số" className={toolButtonClass} onClick={() => prefix('1. ', 'Mục danh sách')}><ListOrdered className="h-4 w-4" /></button>
          <button type="button" title="Trích dẫn" className={toolButtonClass} onClick={() => prefix('> ', 'Nội dung trích dẫn')}><Quote className="h-4 w-4" /></button>
          <button type="button" title="Mã trong dòng" className={toolButtonClass} onClick={() => wrap('`', '`', 'code')}><Code2 className="h-4 w-4" /></button>
          <button type="button" title="Khối mã" className={toolButtonClass} onClick={() => wrap('```\n', '\n```', 'code')}><Braces className="h-4 w-4" /></button>
          <button
            type="button"
            title="Chèn bảng"
            className={toolButtonClass}
            onClick={() => insert('\n\n| Cột 1 | Cột 2 | Cột 3 |\n| :--- | :---: | ---: |\n| Dữ liệu | Căn giữa | Dữ liệu |\n\n')}
          >
            <Table2 className="h-4 w-4" />
          </button>
          <button type="button" title="Đường phân cách" className={toolButtonClass} onClick={() => insert('\n\n---\n\n')}><SeparatorHorizontal className="h-4 w-4" /></button>
        </div>

        <div className="flex rounded-lg bg-surface-2 p-0.5 text-[11px] font-bold">
          <button type="button" onClick={() => setMode('write')} className={`rounded-md px-2.5 py-1.5 cursor-pointer ${mode === 'write' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'}`}><Rows3 className="mr-1 inline h-3.5 w-3.5" />Soạn</button>
          <button type="button" onClick={() => setMode('split')} className={`hidden rounded-md px-2.5 py-1.5 sm:block cursor-pointer ${mode === 'split' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'}`}>Chia đôi</button>
          <button type="button" onClick={() => setMode('preview')} className={`rounded-md px-2.5 py-1.5 cursor-pointer ${mode === 'preview' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'}`}><Eye className="mr-1 inline h-3.5 w-3.5" />Xem</button>
        </div>
      </div>

      <div className={`grid min-h-[520px] ${mode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {mode !== 'preview' && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={event => onChange(event.target.value)}
            spellCheck
            maxLength={500000}
            placeholder="Bắt đầu viết tài liệu bằng Markdown..."
            className={`min-h-[520px] w-full resize-y bg-surface px-5 py-5 font-mono text-sm leading-6 text-on-surface outline-none placeholder:text-on-surface-variant/60 ${mode === 'split' ? 'border-b border-outline-variant md:border-b-0 md:border-r' : ''}`}
          />
        )}
        {mode !== 'write' && (
          <div className="min-h-[520px] overflow-auto bg-surface px-6 py-6">
            <MarkdownRenderer content={value} />
          </div>
        )}
      </div>
    </div>
  );
}
