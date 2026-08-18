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

  it('round-trips a doc-image placeholder through markdown unchanged', () => {
    const editor = new Editor({
      extensions: createKnowledgeDocumentExtensions(),
      content: '![Ảnh minh hoạ](doc-image://5)',
      contentType: 'markdown',
    });

    expect(editor.getMarkdown()).toContain('![Ảnh minh hoạ](doc-image://5)');
    editor.destroy();
  });

  it('keeps a base64 data URI image source through a markdown round trip', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const editor = new Editor({
      extensions: createKnowledgeDocumentExtensions(),
      content: `![anh.png](${dataUri})`,
      contentType: 'markdown',
    });

    const storedMarkdown = editor.getMarkdown();
    expect(storedMarkdown).toContain(dataUri);
    editor.destroy();

    const reopenedEditor = new Editor({
      extensions: createKnowledgeDocumentExtensions(),
      content: storedMarkdown,
      contentType: 'markdown',
    });
    expect(reopenedEditor.getMarkdown()).toContain(dataUri);
    reopenedEditor.destroy();
  });

  it('keeps a reopened document containing an image editable', () => {
    // The markdown parser hoists a standalone image to a direct child of `doc`. If the
    // image node were configured as inline that would be an invalid document, and the
    // first align or keystroke after reopening would throw.
    const editor = new Editor({
      extensions: createKnowledgeDocumentExtensions(),
      content: '# Hướng dẫn\n\n![anh](doc-image://5)\n\nKết thúc',
      contentType: 'markdown',
    });

    expect(() => {
      editor.commands.selectAll();
      editor.commands.setTextAlign('center');
    }).not.toThrow();
    expect(editor.getMarkdown()).toContain('![anh](doc-image://5)');
    editor.destroy();
  });

  it('inserts an image at the drop position rather than appending it', () => {
    const dataUri = 'data:image/png;base64,AAAA';
    const editor = new Editor({
      extensions: createKnowledgeDocumentExtensions(),
      content: 'Hello world',
      contentType: 'markdown',
    });

    editor.chain().focus().insertContentAt(4, { type: 'image', attrs: { src: dataUri, alt: 'a' } }).run();

    const storedMarkdown = editor.getMarkdown();
    expect(storedMarkdown).toContain(`![a](${dataUri})`);
    expect(storedMarkdown.indexOf('Hel')).toBeLessThan(storedMarkdown.indexOf(dataUri));
    expect(storedMarkdown.indexOf(dataUri)).toBeLessThan(storedMarkdown.indexOf('lo world'));
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
