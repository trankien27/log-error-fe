import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

const markdownSchema: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div || []), ['align', 'left', 'center', 'right']],
    p: [...(defaultSchema.attributes?.p || []), ['align', 'left', 'center', 'right']],
  },
};

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content.trim()) {
    return <p className="py-12 text-center text-sm italic text-on-surface-variant">Tài liệu chưa có nội dung.</p>;
  }

  return (
    <article className={`min-w-0 break-words text-[15px] leading-7 text-on-surface ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
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
          hr: () => <hr className="my-7 border-outline-variant" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
