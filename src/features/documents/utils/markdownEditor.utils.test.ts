import { describe, expect, it } from 'vitest';
import {
  insertMarkdownSnippet,
  prefixMarkdownLines,
  wrapMarkdownSelection,
} from './markdownEditor.utils';

describe('markdown editor utilities', () => {
  it('wraps the selected text and keeps it selected', () => {
    expect(wrapMarkdownSelection('xin chao', 4, 8, '**', '**', 'văn bản')).toEqual({
      value: 'xin **chao**',
      selectionStart: 6,
      selectionEnd: 10,
    });
  });

  it('prefixes every selected line', () => {
    expect(prefixMarkdownLines('một\nhai', 0, 7, '- ', 'Mục')).toEqual({
      value: '- một\n- hai',
      selectionStart: 0,
      selectionEnd: 11,
    });
  });

  it('inserts a markdown snippet at the cursor', () => {
    expect(insertMarkdownSnippet('ab', 1, 1, '| A | B |')).toEqual({
      value: 'a| A | B |b',
      selectionStart: 10,
      selectionEnd: 10,
    });
  });
});
