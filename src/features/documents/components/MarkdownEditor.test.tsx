import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarkdownEditor from './MarkdownEditor';

const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

afterEach(cleanup);

describe('MarkdownEditor image resizing', () => {
  it('persists a width percentage after dragging a corner handle', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <MarkdownEditor value={`![anh](${PNG_DATA_URI})`} onChange={onChange} />,
    );

    const imageWrapper = await waitFor(() => {
      const element = container.querySelector<HTMLElement>('.document-resizable-image');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    const resizeHandle = imageWrapper.querySelector<HTMLElement>(
      '[data-corner="bottom-right"]',
    );
    expect(resizeHandle).not.toBeNull();

    imageWrapper.getBoundingClientRect = () => ({
      width: 600,
      height: 400,
      top: 0,
      right: 600,
      bottom: 400,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(resizeHandle as HTMLElement, { button: 0, clientX: 600 });
    fireEvent.pointerMove(window, { clientX: 300 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls.at(-1)?.[0]).toContain('width="50%"');
    });
  });
});
