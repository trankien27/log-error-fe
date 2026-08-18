import React from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { isSafeImageSrc } from '../utils/documentImages';

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

const MIN_IMAGE_WIDTH_PERCENT = 20;
const MAX_IMAGE_WIDTH_PERCENT = 100;

function normalizeImageWidthPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MAX_IMAGE_WIDTH_PERCENT;
  return Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, Math.round(numeric)));
}

const markdownSchema: Options = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    // Document images are stored as base64 and hydrated into `data:` URIs before
    // rendering. `defaultSchema.protocols.src` is `['http', 'https']` only, so without
    // this every embedded image would be silently stripped and render blank.
    // `javascript:` stays excluded; the data URIs themselves are rebuilt from an
    // allowlisted content type in `documentImages.buildDataUri`.
    src: [...(defaultSchema.protocols?.src || []), 'data'],
  },
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img || []), 'alt', 'title', 'width', 'height', 'data-width-percent'],
    div: [...(defaultSchema.attributes?.div || []), ['align', 'left', 'center', 'right']],
    p: [...(defaultSchema.attributes?.p || []), ['align', 'left', 'center', 'right']],
    h1: [...(defaultSchema.attributes?.h1 || []), ['align', 'left', 'center', 'right']],
    h2: [...(defaultSchema.attributes?.h2 || []), ['align', 'left', 'center', 'right']],
    h3: [...(defaultSchema.attributes?.h3 || []), ['align', 'left', 'center', 'right']],
    h4: [...(defaultSchema.attributes?.h4 || []), ['align', 'left', 'center', 'right']],
  },
};

/**
 * `react-markdown` runs its own URL allowlist over every `href`/`src` before the sanitizer
 * schema is ever consulted, and its default rejects `data:` — so loosening the sanitizer
 * alone leaves every stored image blank. Vetted image data URIs are allowed through here;
 * everything else, including every `href`, keeps the library's default treatment.
 */
const transformUrl = (url: string, key: string) =>
  key === 'src' && isSafeImageSrc(url) ? url : defaultUrlTransform(url);

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content.trim()) {
    return <p className="py-12 text-center text-sm italic text-on-surface-variant">Tài liệu chưa có nội dung.</p>;
  }

  return (
    <article className={`min-w-0 break-words text-[15px] leading-7 text-on-surface ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
        urlTransform={transformUrl}
        components={{
          h1: ({ children }) => <h1 className="mb-4 mt-8 text-3xl font-black tracking-tight first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-7 border-b border-outline-variant pb-2 text-2xl font-black">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-6 text-xl font-extrabold">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-2 mt-5 text-lg font-extrabold">{children}</h4>,
          p: ({ children, node: _node, ...props }) => <p className="my-3" {...props}>{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-7">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-7">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-primary bg-primary-subtle px-4 py-1 text-on-surface-variant">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-lg border border-outline-variant">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
          th: ({ children, style }) => <th style={style} className="border-b border-r border-outline-variant px-3 py-2 font-extrabold last:border-r-0">{children}</th>,
          td: ({ children, style }) => <td style={style} className="border-b border-r border-outline-variant px-3 py-2 align-top last:border-r-0">{children}</td>,
          code: ({ children, className: codeClassName }) => {
            const isBlock = Boolean(codeClassName?.startsWith('language-'));
            return isBlock
              ? <code className={`${codeClassName || ''} text-sm`}>{children}</code>
              : <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-primary">{children}</code>;
          },
          pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-xl bg-on-surface p-4 font-mono text-sm text-surface">{children}</pre>,
          // The sanitizer's protocol allowlist permits any `data:` URI on `src`, including
          // ones the upload path never vetted (a `data:` URI without `;base64,` is never
          // uploaded, so it reaches stored content verbatim). Re-check the exact shape here,
          // at the render boundary, so this holds whatever is already in the database.
          img: ({ src, alt, title, node, width }) => {
            if (!isSafeImageSrc(src)) return null;

            const widthPercent = normalizeImageWidthPercent(
              String(width || (node?.properties as Record<string, unknown> | undefined)?.width || '')
                .replace('%', ''),
            );

            return (
              <img
                src={src}
                alt={alt || ''}
                title={title}
                loading="lazy"
                style={widthPercent < MAX_IMAGE_WIDTH_PERCENT ? { width: `${widthPercent}%` } : undefined}
                className="my-4 h-auto max-w-full rounded-lg border border-outline-variant"
              />
            );
          },
          hr: () => <hr className="my-7 border-outline-variant" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
