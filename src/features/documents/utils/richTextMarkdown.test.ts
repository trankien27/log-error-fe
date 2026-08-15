import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import {
  createKnowledgeDocumentExtensions,
  renderInlineContentAsHtml,
} from './richTextMarkdown';

describe('rich text markdown serialization', () => {
  it('keeps visual inline formatting when an aligned block is stored as markdown HTML', () => {
    expect(renderInlineContentAsHtml([
      { type: 'text', text: 'Quan trọng', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' & an toàn', marks: [{ type: 'italic' }] },
    ])).toBe('<strong>Quan trọng</strong><em> &amp; an toàn</em>');
  });

  it('escapes link attributes before serializing', () => {
    expect(renderInlineContentAsHtml([
      {
        type: 'text',
        text: 'Liên kết',
        marks: [{ type: 'link', attrs: { href: 'https://example.com?a=1&b=2' } }],
      },
    ])).toBe('<a href="https://example.com?a=1&amp;b=2">Liên kết</a>');
  });

  it('round-trips visual formatting through raw markdown', () => {
    const editor = new Editor({
      extensions: createKnowledgeDocumentExtensions(),
      content: '# Hướng dẫn\n\nĐây là **nội dung quan trọng**.',
      contentType: 'markdown',
    });

    expect(editor.getText()).toContain('Hướng dẫn');
    expect(editor.getText()).toContain('nội dung quan trọng');
    expect(editor.getMarkdown()).toContain('**nội dung quan trọng**');
    editor.destroy();
  });

  it('preserves center alignment after saving and reopening markdown', () => {
    const editor = new Editor({
      extensions: createKnowledgeDocumentExtensions(),
      content: 'Nội dung căn giữa',
      contentType: 'markdown',
    });
    editor.commands.selectAll();
    editor.commands.setTextAlign('center');

    const storedMarkdown = editor.getMarkdown();
    expect(storedMarkdown).toBe('<p align="center">Nội dung căn giữa</p>');
    editor.destroy();

    const reopenedEditor = new Editor({
      extensions: createKnowledgeDocumentExtensions(),
      content: storedMarkdown,
      contentType: 'markdown',
    });
    expect(reopenedEditor.getAttributes('paragraph').textAlign).toBe('center');
    reopenedEditor.destroy();
  });
});
