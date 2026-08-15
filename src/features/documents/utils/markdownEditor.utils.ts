export type MarkdownSelectionResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function wrapMarkdownSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
  placeholder: string,
): MarkdownSelectionResult {
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const replacement = `${before}${selected}${after}`;

  return {
    value: `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`,
    selectionStart: selectionStart + before.length,
    selectionEnd: selectionStart + before.length + selected.length,
  };
}

export function prefixMarkdownLines(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  placeholder: string,
): MarkdownSelectionResult {
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const replacement = selected
    .split('\n')
    .map(line => `${prefix}${line}`)
    .join('\n');

  return {
    value: `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`,
    selectionStart,
    selectionEnd: selectionStart + replacement.length,
  };
}

export function insertMarkdownSnippet(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  snippet: string,
): MarkdownSelectionResult {
  return {
    value: `${value.slice(0, selectionStart)}${snippet}${value.slice(selectionEnd)}`,
    selectionStart: selectionStart + snippet.length,
    selectionEnd: selectionStart + snippet.length,
  };
}
