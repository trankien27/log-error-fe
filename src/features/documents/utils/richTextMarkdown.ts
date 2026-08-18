import { mergeAttributes, type JSONContent } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Paragraph from '@tiptap/extension-paragraph';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

const ALLOWED_ALIGNMENTS = ['left', 'center', 'right', 'justify'];
const MIN_IMAGE_WIDTH_PERCENT = 20;
const MAX_IMAGE_WIDTH_PERCENT = 100;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function applyInlineMarks(content: string, node: JSONContent) {
  return (node.marks || []).reduce((result, mark) => {
    switch (mark.type) {
      case 'bold':
        return `<strong>${result}</strong>`;
      case 'italic':
        return `<em>${result}</em>`;
      case 'strike':
        return `<del>${result}</del>`;
      case 'underline':
        return `<u>${result}</u>`;
      case 'code':
        return `<code>${result}</code>`;
      case 'link': {
        const href = escapeHtml(String(mark.attrs?.href || '#'));
        const title = mark.attrs?.title
          ? ` title="${escapeHtml(String(mark.attrs.title))}"`
          : '';
        return `<a href="${href}"${title}>${result}</a>`;
      }
      default:
        return result;
    }
  }, content);
}

export function renderInlineContentAsHtml(content: JSONContent[] = []): string {
  return content.map(node => {
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'text') return applyInlineMarks(escapeHtml(node.text || ''), node);
    return renderInlineContentAsHtml(node.content || []);
  }).join('');
}

function getAlignment(node: JSONContent) {
  const alignment = String(node.attrs?.textAlign || '');
  return ALLOWED_ALIGNMENTS.includes(alignment) ? alignment : '';
}

function normalizeImageWidthPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MAX_IMAGE_WIDTH_PERCENT;
  return Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, Math.round(numeric)));
}

function escapeMarkdownImageSrc(value: string) {
  return value.replace(/\)/g, '\\)');
}

export const KnowledgeDocumentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      widthPercent: {
        default: MAX_IMAGE_WIDTH_PERCENT,
        parseHTML: element => {
          const dataWidth = element.getAttribute('data-width-percent');
          if (dataWidth) return normalizeImageWidthPercent(dataWidth);

          const widthAttribute = element.getAttribute('width');
          if (widthAttribute?.endsWith('%')) {
            return normalizeImageWidthPercent(widthAttribute.slice(0, -1));
          }

          const styleWidth = element.style.width;
          if (styleWidth?.endsWith('%')) {
            return normalizeImageWidthPercent(styleWidth.slice(0, -1));
          }

          return MAX_IMAGE_WIDTH_PERCENT;
        },
        renderHTML: attributes => {
          const widthPercent = normalizeImageWidthPercent(attributes.widthPercent);
          if (widthPercent >= MAX_IMAGE_WIDTH_PERCENT) return {};

          return {
            width: `${widthPercent}%`,
            style: `width: ${widthPercent}%;`,
          };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },
  renderMarkdown: (node, helpers) => {
    const src = String(node.attrs.src || '');
    if (!src) return '';

    const widthPercent = normalizeImageWidthPercent(node.attrs.widthPercent);
    const altText = escapeHtml(String(node.attrs.alt || ''));
    const escapedSrc = escapeMarkdownImageSrc(src);

    if (widthPercent >= MAX_IMAGE_WIDTH_PERCENT) {
      return `![${altText}](${escapedSrc})`;
    }

    const title = node.attrs.title
      ? ` title="${escapeHtml(String(node.attrs.title))}"`
      : '';

    return `<img src="${escapeHtml(src)}" alt="${altText}" width="${widthPercent}%"${title} />`;
  },
});

export const MarkdownParagraph = Paragraph.extend({
  renderMarkdown: (node, helpers, context) => {
    const content = Array.isArray(node.content) ? node.content : [];
    const alignment = getAlignment(node);

    if (alignment && alignment !== 'left') {
      return `<p align="${alignment}">${renderInlineContentAsHtml(content)}</p>`;
    }

    if (content.length === 0) {
      const previousContent = Array.isArray(context?.previousNode?.content)
        ? context.previousNode.content
        : [];
      return context?.previousNode?.type === 'paragraph' && previousContent.length === 0
        ? '&nbsp;'
        : '';
    }

    return helpers.renderChildren(content);
  },
});

export const MarkdownHeading = Heading.extend({
  renderMarkdown: (node, helpers) => {
    const content = Array.isArray(node.content) ? node.content : [];
    const alignment = getAlignment(node);
    const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));

    if (alignment && alignment !== 'left') {
      return `<h${level} align="${alignment}">${renderInlineContentAsHtml(content)}</h${level}>`;
    }

    return `${'#'.repeat(level)} ${helpers.renderChildren(content)}`;
  },
});

export const MarkdownTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: element => {
              const alignment = element.style.textAlign || element.getAttribute('align') || '';
              return this.options.alignments.includes(alignment)
                ? alignment
                : this.options.defaultAlignment;
            },
            renderHTML: attributes => attributes.textAlign
              ? { style: `text-align: ${attributes.textAlign}` }
              : {},
          },
        },
      },
    ];
  },
});

export function createKnowledgeDocumentExtensions() {
  return [
    StarterKit.configure({
      paragraph: false,
      heading: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      },
    }),
    MarkdownParagraph,
    MarkdownHeading.configure({ levels: [1, 2, 3, 4] }),
    MarkdownTextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    TableKit.configure({
      table: {
        resizable: true,
        lastColumnResizable: true,
      },
    }),
    // `allowBase64` is mandatory: without it `parseHTML` matches
    // `img[src]:not([src^="data:"])` and every pasted data: image is dropped on the
    // markdown -> HTML -> node round trip.
    //
    // `inline: false` is deliberate. The markdown parser hoists a standalone image line
    // to a direct child of `doc` regardless of this setting, and an `inline` node in that
    // position is a schema violation — reopening a saved document that contains an image
    // and then aligning or typing throws "Invalid content for node doc". As a block node
    // the hoisted image is valid, and `insertContentAt` still honours the exact drop
    // position by splitting the paragraph there, so positioning accuracy is unaffected.
    //
    // The extension ships its own `renderMarkdown` (`![alt](src)`), so no `.extend()` is
    // needed here — locked by the round-trip tests in richTextMarkdown.test.ts.
    KnowledgeDocumentImage.configure({ inline: false, allowBase64: true }),
    Markdown.configure({
      markedOptions: { gfm: true, breaks: true },
    }),
  ];
}
