import { describe, expect, it } from 'vitest';
import type { KnowledgeDocumentImageDto } from '../../../types';
import {
  ALLOWED_IMAGE_TYPES,
  DOC_IMAGE_PREFIX,
  MAX_IMAGE_BYTES,
  buildDataUri,
  extractDataUriImages,
  extractPlaceholderIds,
  hydratePlaceholders,
  isSafeImageSrc,
  replaceDataUri,
  sanitizeAltText,
  stripImageMarkdown,
  validateImageFile,
} from './documentImages';

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUg==';

function makeImage(overrides: Partial<KnowledgeDocumentImageDto> = {}): KnowledgeDocumentImageDto {
  return {
    id: 1,
    documentId: 10,
    fileName: 'anh.png',
    contentType: 'image/png',
    fileSize: 1024,
    base64Data: PNG_BASE64,
    position: 0,
    createdAt: '2026-08-18T00:00:00Z',
    ...overrides,
  };
}

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateImageFile', () => {
  it('accepts every allowlisted image type at the size limit', () => {
    for (const type of ALLOWED_IMAGE_TYPES) {
      expect(validateImageFile(makeFile('a.img', type, MAX_IMAGE_BYTES))).toBeNull();
    }
  });

  it('rejects a non-image mime type', () => {
    expect(validateImageFile(makeFile('tailieu.pdf', 'application/pdf', 1024)))
      .toBe('Định dạng ảnh không được hỗ trợ.');
  });

  it('rejects an svg, which is not on the allowlist', () => {
    expect(validateImageFile(makeFile('icon.svg', 'image/svg+xml', 1024)))
      .toBe('Định dạng ảnh không được hỗ trợ.');
  });

  it('rejects a file over 1MB', () => {
    expect(validateImageFile(makeFile('to.png', 'image/png', MAX_IMAGE_BYTES + 1)))
      .toBe('Ảnh vượt quá dung lượng cho phép (1MB).');
  });

  it('rejects an empty file', () => {
    expect(validateImageFile(makeFile('rong.png', 'image/png', 0)))
      .toBe('Dữ liệu ảnh không hợp lệ.');
  });
});

describe('buildDataUri', () => {
  it('builds a data URI from an allowlisted content type', () => {
    expect(buildDataUri('image/png', PNG_BASE64)).toBe(`data:image/png;base64,${PNG_BASE64}`);
  });

  it('falls back to image/png when the server content type is not allowlisted', () => {
    expect(buildDataUri('text/html', PNG_BASE64)).toBe(`data:image/png;base64,${PNG_BASE64}`);
  });

  it('does not interpolate a hostile content type into the URI', () => {
    const built = buildDataUri('image/png"><script>alert(1)</script>', PNG_BASE64);
    expect(built).toBe(`data:image/png;base64,${PNG_BASE64}`);
    expect(built).not.toContain('script');
  });

  it('strips characters outside the base64 alphabet from the payload', () => {
    expect(buildDataUri('image/png', 'AAA")<script>')).toBe('data:image/png;base64,AAAscript');
  });

  it('tolerates a payload that already carries a data URI prefix', () => {
    expect(buildDataUri('image/jpeg', `data:image/jpeg;base64,${PNG_BASE64}`))
      .toBe(`data:image/jpeg;base64,${PNG_BASE64}`);
  });
});

describe('hydratePlaceholders', () => {
  it('replaces a placeholder with the matching image data URI', () => {
    const markdown = `# Tiêu đề\n\n![Ảnh](${DOC_IMAGE_PREFIX}1)`;
    expect(hydratePlaceholders(markdown, [makeImage({ id: 1 })]))
      .toBe(`# Tiêu đề\n\n![Ảnh](data:image/png;base64,${PNG_BASE64})`);
  });

  it('does not corrupt a multi-digit id when a shorter id is also present', () => {
    const markdown = `![a](${DOC_IMAGE_PREFIX}1) ![b](${DOC_IMAGE_PREFIX}12)`;
    const hydrated = hydratePlaceholders(markdown, [
      makeImage({ id: 1, base64Data: 'AAAA' }),
      makeImage({ id: 12, base64Data: 'BBBB' }),
    ]);

    expect(hydrated).toBe('![a](data:image/png;base64,AAAA) ![b](data:image/png;base64,BBBB)');
  });

  it('leaves a placeholder with no matching image untouched', () => {
    const markdown = `![Ảnh](${DOC_IMAGE_PREFIX}99)`;
    expect(hydratePlaceholders(markdown, [makeImage({ id: 1 })])).toBe(markdown);
  });

  it('returns content without placeholders unchanged', () => {
    expect(hydratePlaceholders('Không có ảnh', [makeImage()])).toBe('Không có ảnh');
  });
});

describe('extractDataUriImages', () => {
  it('extracts the data URI, content type and payload', () => {
    const markdown = `![anh.png](data:image/png;base64,${PNG_BASE64})`;
    expect(extractDataUriImages(markdown)).toEqual([
      { dataUri: `data:image/png;base64,${PNG_BASE64}`, contentType: 'image/png', base64: PNG_BASE64 },
    ]);
  });

  it('deduplicates the same image inserted twice', () => {
    const dataUri = `data:image/png;base64,${PNG_BASE64}`;
    const markdown = `![a](${dataUri})\n\n![b](${dataUri})`;
    expect(extractDataUriImages(markdown)).toHaveLength(1);
  });

  it('ignores already-uploaded placeholders and remote images', () => {
    const markdown = `![a](${DOC_IMAGE_PREFIX}3) ![b](https://example.com/a.png)`;
    expect(extractDataUriImages(markdown)).toEqual([]);
  });

  it('extracts several distinct pending images', () => {
    const markdown = '![a](data:image/png;base64,AAAA) ![b](data:image/jpeg;base64,BBBB)';
    expect(extractDataUriImages(markdown).map(image => image.contentType))
      .toEqual(['image/png', 'image/jpeg']);
  });
});

describe('replaceDataUri', () => {
  it('swaps a data URI for its placeholder', () => {
    const dataUri = `data:image/png;base64,${PNG_BASE64}`;
    expect(replaceDataUri(`![anh.png](${dataUri})`, dataUri, 7))
      .toBe(`![anh.png](${DOC_IMAGE_PREFIX}7)`);
  });

  it('replaces every occurrence, including payloads with regex-special characters', () => {
    const dataUri = 'data:image/png;base64,a+b/c=';
    const markdown = `![a](${dataUri}) ![b](${dataUri})`;
    expect(replaceDataUri(markdown, dataUri, 4))
      .toBe(`![a](${DOC_IMAGE_PREFIX}4) ![b](${DOC_IMAGE_PREFIX}4)`);
  });
});

describe('extractPlaceholderIds', () => {
  it('returns distinct ids in first-seen order', () => {
    const markdown = `![a](${DOC_IMAGE_PREFIX}3) ![b](${DOC_IMAGE_PREFIX}1) ![c](${DOC_IMAGE_PREFIX}3)`;
    expect(extractPlaceholderIds(markdown)).toEqual([3, 1]);
  });

  it('returns an empty list when there are no placeholders', () => {
    expect(extractPlaceholderIds('Không có ảnh')).toEqual([]);
  });

  it('diffs saved against current content to find orphaned images', () => {
    const saved = `![a](${DOC_IMAGE_PREFIX}1) ![b](${DOC_IMAGE_PREFIX}2) ![c](${DOC_IMAGE_PREFIX}3)`;
    const current = `![a](${DOC_IMAGE_PREFIX}1) ![c](${DOC_IMAGE_PREFIX}3)`;

    const currentIds = new Set(extractPlaceholderIds(current));
    const orphans = extractPlaceholderIds(saved).filter(id => !currentIds.has(id));

    expect(orphans).toEqual([2]);
  });
});

describe('stripImageMarkdown', () => {
  it('removes a data URI image so the create call stays under the content limit', () => {
    const markdown = `# Tiêu đề\n\n![anh.png](data:image/png;base64,${PNG_BASE64})\n\nNội dung`;
    expect(stripImageMarkdown(markdown)).toBe('# Tiêu đề\n\n\n\nNội dung');
  });

  it('removes every image while keeping surrounding text', () => {
    const markdown = `Trước ![a](data:image/png;base64,AAAA) giữa ![b](${DOC_IMAGE_PREFIX}2) sau`;
    expect(stripImageMarkdown(markdown)).toBe('Trước  giữa  sau');
  });

  it('leaves content without images unchanged', () => {
    expect(stripImageMarkdown('Không có ảnh')).toBe('Không có ảnh');
  });
});

describe('hydrate / dehydrate round trip', () => {
  it('returns to the original placeholder content after hydrating and replacing back', () => {
    const original = `# Hướng dẫn\n\n![anh.png](${DOC_IMAGE_PREFIX}5)\n\nKết thúc.`;
    const images = [makeImage({ id: 5, base64Data: 'AAAA' })];

    const hydrated = hydratePlaceholders(original, images);
    expect(hydrated).toContain('data:image/png;base64,AAAA');

    const pending = extractDataUriImages(hydrated);
    expect(pending).toHaveLength(1);

    const dehydrated = replaceDataUri(hydrated, pending[0].dataUri, 5);
    expect(dehydrated).toBe(original);
  });
});

describe('isSafeImageSrc', () => {
  it('accepts a data URI for every allowlisted type', () => {
    for (const type of ALLOWED_IMAGE_TYPES) {
      expect(isSafeImageSrc(`data:${type};base64,${PNG_BASE64}`)).toBe(true);
    }
  });

  it('accepts http and https sources', () => {
    expect(isSafeImageSrc('https://example.com/a.png')).toBe(true);
    expect(isSafeImageSrc('http://example.com/a.png')).toBe(true);
  });

  it('rejects a percent-encoded data URI that the upload path never vets', () => {
    expect(isSafeImageSrc('data:image/svg+xml,%3Csvg onload%3D%22alert(1)%22%3E')).toBe(false);
  });

  it('rejects a non-image data URI', () => {
    expect(isSafeImageSrc('data:text/html,<h1>hi</h1>')).toBe(false);
    expect(isSafeImageSrc('data:text/html;base64,PGgxPmhpPC9oMT4=')).toBe(false);
  });

  it('rejects a base64 data URI whose type is not allowlisted', () => {
    expect(isSafeImageSrc('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
  });

  it('rejects trailing content smuggled after a valid base64 payload', () => {
    expect(isSafeImageSrc(`data:image/png;base64,${PNG_BASE64},<svg>`)).toBe(false);
  });

  it('rejects javascript and other protocols', () => {
    expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
    expect(isSafeImageSrc('doc-image://5')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isSafeImageSrc(undefined)).toBe(false);
    expect(isSafeImageSrc(null)).toBe(false);
  });
});

describe('sanitizeAltText', () => {
  it('removes square brackets that would break the alt span', () => {
    expect(sanitizeAltText('screenshot [1].png')).toBe('screenshot 1.png');
  });

  it('keeps parentheses, which are safe inside an alt span', () => {
    expect(sanitizeAltText('screenshot (1).png')).toBe('screenshot (1).png');
  });

  it('falls back to a default name when nothing usable remains', () => {
    expect(sanitizeAltText('[]')).toBe('image');
    expect(sanitizeAltText('')).toBe('image');
  });
});
