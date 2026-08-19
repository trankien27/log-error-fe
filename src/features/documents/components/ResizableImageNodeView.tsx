import { useEffect, useRef } from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

const MIN_IMAGE_WIDTH_PERCENT = 20;
const MAX_IMAGE_WIDTH_PERCENT = 100;
const MIN_IMAGE_HEIGHT_PX = 40;

function normalizeImageWidthPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MAX_IMAGE_WIDTH_PERCENT;
  return Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, Math.round(numeric)));
}

function normalizeImageAspectRatio(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.min(20, Math.max(0.05, Number(numeric.toFixed(4))));
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
  const aspectRatio = normalizeImageAspectRatio(node.attrs.aspectRatio);

  useEffect(() => () => removeDragListenersRef.current?.(), []);

  const startResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    removeDragListenersRef.current?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const { width: startWidth, height: startHeight } = wrapper.getBoundingClientRect();
    // Since the wrapper already uses a percentage, deriving the available width
    // from its rendered size avoids counting the editor's horizontal padding.
    const editorWidth = startWidth / (widthPercent / 100);
    if (startWidth <= 0 || startHeight <= 0 || editorWidth <= 0) return;
    const minWidth = editorWidth * MIN_IMAGE_WIDTH_PERCENT / 100;
    let nextWidth = startWidth;
    let nextHeight = startHeight;

    wrapper.classList.add('is-resizing');
    wrapper.style.width = `${startWidth}px`;
    wrapper.style.height = `${startHeight}px`;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      nextWidth = Math.min(
        editorWidth,
        Math.max(minWidth, startWidth + (moveEvent.clientX - startX)),
      );
      nextHeight = Math.max(MIN_IMAGE_HEIGHT_PX, startHeight + (moveEvent.clientY - startY));
      wrapper.style.width = `${nextWidth}px`;
      wrapper.style.height = `${nextHeight}px`;
    };

    const finishResize = (commit = true) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', commitResize);
      window.removeEventListener('pointercancel', cancelResize);
      removeDragListenersRef.current = null;

      wrapper.classList.remove('is-resizing');
      if (!commit) {
        wrapper.style.width = `${widthPercent}%`;
        wrapper.style.height = '';
        return;
      }

      const nextWidthPercent = normalizeImageWidthPercent((nextWidth / editorWidth) * 100);
      const nextAspectRatio = normalizeImageAspectRatio(nextWidth / nextHeight);
      wrapper.style.width = `${nextWidthPercent}%`;
      wrapper.style.height = '';
      updateAttributes({
        widthPercent: nextWidthPercent,
        aspectRatio: nextAspectRatio,
      });
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
      style={{
        width: `${widthPercent}%`,
        aspectRatio: aspectRatio || undefined,
      }}
    >
      <img
        src={String(node.attrs.src || '')}
        alt={String(node.attrs.alt || '')}
        title={node.attrs.title ? String(node.attrs.title) : undefined}
        draggable={false}
        data-drag-handle
      />
      <span
        className="document-image-resize-handle"
        data-corner="bottom-right"
        aria-hidden="true"
        onPointerDown={startResize}
      />
    </NodeViewWrapper>
  );
}
