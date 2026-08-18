import { useEffect, useRef } from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

const MIN_IMAGE_WIDTH_PERCENT = 20;
const MAX_IMAGE_WIDTH_PERCENT = 100;

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function normalizeImageWidthPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MAX_IMAGE_WIDTH_PERCENT;
  return Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, Math.round(numeric)));
}

/**
 * Editor-only image view with four drag handles. The persisted value remains a
 * percentage so images keep their relative size when the document area changes width.
 */
export default function ResizableImageNodeView({
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const widthPercent = normalizeImageWidthPercent(node.attrs.widthPercent);

  useEffect(() => () => removeDragListenersRef.current?.(), []);

  const startResize = (event: React.PointerEvent<HTMLSpanElement>, corner: Corner) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    removeDragListenersRef.current?.();

    const startX = event.clientX;
    const startWidth = wrapper.getBoundingClientRect().width;
    // Since the wrapper already uses a percentage, deriving the available width
    // from its rendered size avoids counting the editor's horizontal padding.
    const editorWidth = startWidth / (widthPercent / 100);
    if (startWidth <= 0 || editorWidth <= 0) return;
    const direction = corner.endsWith('right') ? 1 : -1;
    const minWidth = editorWidth * MIN_IMAGE_WIDTH_PERCENT / 100;
    let nextWidth = startWidth;

    wrapper.classList.add('is-resizing');
    wrapper.style.width = `${startWidth}px`;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      nextWidth = Math.min(
        editorWidth,
        Math.max(minWidth, startWidth + ((moveEvent.clientX - startX) * direction)),
      );
      wrapper.style.width = `${nextWidth}px`;
    };

    const finishResize = (commit = true) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', commitResize);
      window.removeEventListener('pointercancel', cancelResize);
      removeDragListenersRef.current = null;

      wrapper.classList.remove('is-resizing');
      if (!commit) {
        wrapper.style.width = `${widthPercent}%`;
        return;
      }

      const nextWidthPercent = normalizeImageWidthPercent((nextWidth / editorWidth) * 100);
      wrapper.style.width = `${nextWidthPercent}%`;
      updateAttributes({ widthPercent: nextWidthPercent });
    };

    const commitResize = () => finishResize(true);
    const cancelResize = () => finishResize(false);

    removeDragListenersRef.current = cancelResize;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', commitResize);
    window.addEventListener('pointercancel', cancelResize);
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`document-resizable-image${selected ? ' is-selected' : ''}`}
      style={{ width: `${widthPercent}%` }}
    >
      <img
        src={String(node.attrs.src || '')}
        alt={String(node.attrs.alt || '')}
        title={node.attrs.title ? String(node.attrs.title) : undefined}
        draggable={false}
        data-drag-handle
      />
      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as Corner[]).map(corner => (
        <span
          key={corner}
          className="document-image-resize-handle"
          data-corner={corner}
          aria-hidden="true"
          onPointerDown={event => startResize(event, corner)}
        />
      ))}
    </NodeViewWrapper>
  );
}
