import type { KnowledgeDocumentImageDto } from '../../../types';

/**
 * Cross-layer placeholder scheme for document images.
 *
 * Images are stored in a dedicated backend table and referenced from `ContentMarkdown`
 * as standard markdown image syntax pointing at `doc-image://{imageId}`. The backend
 * never parses or writes this string — it is opaque text inside the content — so the
 * whole scheme stays swappable from the frontend alone.
 *
 * This module is intentionally pure (no React, no API calls) so it can be unit-tested.
 */
export const DOC_IMAGE_PREFIX = 'doc-image://';

/** 1 MiB, matching the server-side `MaxImageBytes`. */
export const MAX_IMAGE_BYTES = 1024 * 1024;

/** Mirrors the server-side `AllowedContentTypes` allowlist. */
export const ALLOWED_IMAGE_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
];

const PLACEHOLDER_PATTERN = /doc-image:\/\/(\d+)/g;

const IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*\]\([^)]*\)/g;

const DATA_URI_IMAGE_PATTERN =
  /!\[[^\]]*\]\(\s*(data:([a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*\/[a-zA-Z0-9!#$&^_.+-]+);base64,([A-Za-z0-9+/=]+))\s*(?:"[^"]*")?\s*\)/g;

const BASE64_CHARS_PATTERN = /[^A-Za-z0-9+/=]/g;

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Derived from `ALLOWED_IMAGE_TYPES` so the render allowlist cannot drift from the upload
 * allowlist. Anchored at both ends for `data:` so only our exact shape
 * (`data:image/{allowed};base64,{base64}`) passes; `http(s)` stays prefix-matched.
 */
const SAFE_IMAGE_SRC_PATTERN = new RegExp(
  `^(?:https?://|data:(?:${ALLOWED_IMAGE_TYPES.map(type => escapeForRegExp(type)).join('|')});base64,[A-Za-z0-9+/=]*$)`,
  'i',
);

/**
 * Whether an image `src` is safe to put in the DOM.
 *
 * The read-only renderer permits the `data:` protocol on `img[src]` so stored images can
 * display, but that protocol allowlist alone admits any `data:` URI — including ones the
 * upload path never vetted. A `data:` URI without a literal `;base64,` is not matched by
 * `DATA_URI_IMAGE_PATTERN`, so it is never uploaded, never swapped for a placeholder, and
 * is persisted into the content verbatim; a shared document could then render
 * attacker-authored image content (e.g. percent-encoded SVG) to every other viewer.
 *
 * Enforcing the shape at the render boundary holds no matter what is already stored in the
 * database and no matter how the sanitizer schema changes later.
 */
export function isSafeImageSrc(src: unknown): src is string {
  return typeof src === 'string' && SAFE_IMAGE_SRC_PATTERN.test(src);
}

/**
 * Validates a picked/pasted/dropped file before any FileReader work happens.
 * Returns a Vietnamese error message, or `null` when the file is acceptable.
 * Checks run in the same order as the server-side validator.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Định dạng ảnh không được hỗ trợ.';
  }
  if (file.size <= 0) {
    return 'Dữ liệu ảnh không hợp lệ.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Ảnh vượt quá dung lượng cho phép (1MB).';
  }
  return null;
}

/** Reads a validated file into a `data:{mime};base64,{...}` URI. */
export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Không thể đọc tệp ảnh.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp ảnh.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Builds a `data:` URI from a server-supplied content type and base64 payload.
 *
 * Defense in depth: the content type is re-checked against the allowlist rather than
 * being interpolated straight into the URI, and the payload is reduced to the base64
 * alphabet. The read-only renderer permits the `data:` protocol on `img[src]`, so every
 * `data:` URI reaching the DOM must be one we constructed from vetted parts.
 */
export function buildDataUri(contentType: string, base64: string): string {
  const normalizedType = (contentType || '').trim().toLowerCase();
  const safeType = ALLOWED_IMAGE_TYPES.includes(normalizedType) ? normalizedType : 'image/png';

  // Tolerate a server that echoes back a full data: URI instead of raw base64 — the
  // payload is rebuilt from the validated content type either way.
  const withoutPrefix = base64.replace(/^data:[^;,]*;base64,/i, '');
  const safeBase64 = withoutPrefix.replace(BASE64_CHARS_PATTERN, '');

  return `data:${safeType};base64,${safeBase64}`;
}

/**
 * Resolves the src a hydrated image should render with: the server-supplied `url` when the
 * image lives on R2, otherwise a `data:` URI built from the inline base64 payload. Shared by
 * `hydratePlaceholders` and `mapHydratedImageSources` so the two can never disagree about
 * what a given image's rendered src looks like.
 */
function resolveHydratedSrc(image: KnowledgeDocumentImageDto): string | null {
  if (image.url) return image.url;
  if (image.base64Data) return buildDataUri(image.contentType, image.base64Data);
  return null;
}

/**
 * Replaces every `doc-image://{id}` placeholder with the matching image's rendered src —
 * a `url` for an R2-backed image, a `data:` URI for an inline-base64 one. Placeholders with
 * no matching image (deleted, or not visible to this user) are left untouched — the
 * sanitizer then drops the unknown protocol and the image simply does not render, rather
 * than the document failing to load.
 */
export function hydratePlaceholders(markdown: string, images: KnowledgeDocumentImageDto[]): string {
  if (!markdown || !markdown.includes(DOC_IMAGE_PREFIX)) return markdown;

  const srcById = new Map<number, string>();
  for (const image of images) {
    const src = resolveHydratedSrc(image);
    if (src) srcById.set(image.id, src);
  }

  return markdown.replace(PLACEHOLDER_PATTERN, (match, rawId: string) =>
    srcById.get(Number(rawId)) ?? match,
  );
}

/**
 * Maps each hydrated image's rendered src back to its id — the exact reverse of what
 * `hydratePlaceholders` just built. Used by `dehydrateKnownImages` right before a save.
 */
export function mapHydratedImageSources(images: KnowledgeDocumentImageDto[]): Map<string, number> {
  const bySrc = new Map<string, number>();
  for (const image of images) {
    const src = resolveHydratedSrc(image);
    if (src) bySrc.set(src, image.id);
  }
  return bySrc;
}

/**
 * Puts every KNOWN image (per `bySrc`) still present in the editor's content back to its
 * `doc-image://{id}` placeholder, before the save flow scans for pending uploads and
 * orphans.
 *
 * This matters differently for the two storage backends. For an inline-base64 image its
 * hydrated src is a `data:` URI, so without this step `extractDataUriImages` would treat an
 * untouched image as a brand-new pending upload on every save — wasteful, but at least the
 * bytes survive (re-uploaded under a new id, old id then deleted as an "orphan").
 * For an R2-backed image its hydrated src is a plain `https://` URL, which matches neither
 * `DATA_URI_IMAGE_PATTERN` (so it is never picked up as pending) nor `PLACEHOLDER_PATTERN`
 * (so the orphan diff sees its id as removed from the content) — an untouched R2 image would
 * silently be deleted server-side, both the DB row and the R2 object, on the very next save.
 * Running this first makes both backends behave identically: an image the user did not
 * touch keeps its id and is left alone.
 */
export function dehydrateKnownImages(markdown: string, bySrc: ReadonlyMap<string, number>): string {
  if (!markdown || bySrc.size === 0) return markdown;

  let result = markdown;
  for (const [src, id] of bySrc) {
    if (!src) continue;
    result = result.split(src).join(`${DOC_IMAGE_PREFIX}${id}`);
  }
  return result;
}

/**
 * Finds the distinct `data:` image URIs still embedded in the content — i.e. images the
 * user has inserted but which have not been uploaded to the server yet.
 */
export function extractDataUriImages(
  markdown: string,
): { dataUri: string; contentType: string; base64: string }[] {
  if (!markdown) return [];

  const found = new Map<string, { dataUri: string; contentType: string; base64: string }>();
  for (const match of markdown.matchAll(DATA_URI_IMAGE_PATTERN)) {
    const [, dataUri, contentType, base64] = match;
    if (!found.has(dataUri)) found.set(dataUri, { dataUri, contentType, base64 });
  }

  return [...found.values()];
}

/**
 * Swaps an uploaded image's `data:` URI for its permanent `doc-image://{id}` placeholder.
 * Uses split/join rather than a regex because a data URI contains `+` and `/`.
 */
export function replaceDataUri(markdown: string, dataUri: string, imageId: number): string {
  if (!markdown || !dataUri) return markdown;
  return markdown.split(dataUri).join(`${DOC_IMAGE_PREFIX}${imageId}`);
}

/** Replaces a temporary editor data URI with a permanent R2 URL. */
export function replaceDataUriWithSrc(markdown: string, dataUri: string, src: string): string {
  if (!markdown || !dataUri || !src) return markdown;
  return markdown.split(dataUri).join(src);
}

/** Distinct image ids referenced by the content, in first-seen order. */
export function extractPlaceholderIds(markdown: string): number[] {
  if (!markdown) return [];

  const ids = new Set<number>();
  for (const match of markdown.matchAll(PLACEHOLDER_PATTERN)) {
    const id = Number(match[1]);
    if (Number.isFinite(id)) ids.add(id);
  }

  return [...ids];
}

/**
 * Removes image markdown entirely.
 *
 * Used for the initial `create` call when saving a brand-new document: a single 1MB
 * image is ~1.37M base64 characters against the server's 500,000 character content
 * limit, so sending raw data URIs there would hard-fail. The final update call writes
 * the real content back with `doc-image://{id}` placeholders.
 */
export function stripImageMarkdown(markdown: string): string {
  if (!markdown) return markdown;
  return markdown.replace(IMAGE_MARKDOWN_PATTERN, '');
}

/**
 * Makes a file name safe to embed as markdown alt text. Square brackets would terminate
 * the alt span early and corrupt the image node on the next parse — Windows file names
 * like `screenshot [1].png` are common enough to be worth guarding.
 */
export function sanitizeAltText(fileName: string): string {
  return (fileName || 'image').replace(/[[\]]/g, '').trim() || 'image';
}
