import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

function renderMarkdown(content: string) {
  return render(<MarkdownRenderer content={content} />).container;
}

describe('MarkdownRenderer image sources', () => {
  it('renders an uploaded base64 image', () => {
    const image = renderMarkdown(`![anh](${PNG_DATA_URI})`).querySelector('img');

    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe(PNG_DATA_URI);
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('alt')).toBe('anh');
  });

  it('applies persisted width percentage for resized images', () => {
    const image = renderMarkdown(`<img src="${PNG_DATA_URI}" alt="anh" width="65%" />`).querySelector('img');

    expect(image).not.toBeNull();
    expect(image?.style.width).toBe('65%');
  });

  it('applies the aspect ratio saved by freeform corner resizing', () => {
    const image = renderMarkdown(
      `<img src="${PNG_DATA_URI}" alt="anh" width="65%" data-aspect-ratio="1.5" />`,
    ).querySelector('img');

    expect(image?.style.width).toBe('65%');
    expect(image?.style.aspectRatio).toBe('1.5 / 1');
  });

  it('renders a remote https image', () => {
    const image = renderMarkdown('![anh](https://example.com/a.png)').querySelector('img');
    expect(image?.getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('does not render a percent-encoded data URI that the upload path never vetted', () => {
    // No raw spaces: this is the shape that actually survives markdown parsing as an image.
    const container = renderMarkdown(
      '![x](data:image/svg+xml,%3Csvg%20onload%3D%22alert(1)%22%3E%3C/svg%3E)',
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('onload');
  });

  it('does not render a non-image data URI', () => {
    const container = renderMarkdown('![x](data:text/html,<h1>hi</h1>)');
    expect(container.querySelector('img')).toBeNull();
  });

  it('does not render a base64 data URI whose type is not allowlisted', () => {
    const container = renderMarkdown('![x](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)');
    expect(container.querySelector('img')).toBeNull();
  });

  it('does not render a javascript: source', () => {
    const container = renderMarkdown('![x](javascript:alert(1))');

    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('does not render an unhydrated placeholder, and does not crash', () => {
    const container = renderMarkdown('Trước ![anh](doc-image://99) sau');

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('Trước');
    expect(container.textContent).toContain('sau');
  });

  it('still renders surrounding content when an image is rejected', () => {
    const container = renderMarkdown('# Tiêu đề\n\n![x](data:text/html,evil)\n\nNội dung');

    expect(container.querySelector('h1')?.textContent).toBe('Tiêu đề');
    expect(container.textContent).toContain('Nội dung');
    expect(container.querySelector('img')).toBeNull();
  });
});
