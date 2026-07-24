// Service goi truc tiep app FunStudio chay tren chinh may booth (localhost).
// Khong di qua backend/agent: browser phai dang mo tren may booth thi moi goi duoc.
// Neu khong ket noi duoc => coi nhu thiet bi dang dung khong phai booth.

const DEFAULT_BOOTH_LOCAL_BASE_URL = 'http://localhost:8088';

export const BOOTH_LOCAL_BASE_URL = (
  import.meta.env.VITE_BOOTH_LOCAL_URL || DEFAULT_BOOTH_LOCAL_BASE_URL
).replace(/\/+$/, '');

export const NOT_BOOTH_DEVICE_MESSAGE =
  `Thiết bị không phải booth (không gọi được ${BOOTH_LOCAL_BASE_URL}).`;

export class NotBoothDeviceError extends Error {
  constructor(message: string = NOT_BOOTH_DEVICE_MESSAGE) {
    super(message);
    this.name = 'NotBoothDeviceError';
  }
}

export interface LocalPrintImageRequest {
  transactionId: string;
  layoutId: number;
  numberOfImage: number;
}

export interface LocalBoothApiResult {
  status: number;
  raw: unknown;
}

const createTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeoutId),
  };
};

// Anh preview cua giao dich nam tren chinh may booth:
// {base}/api/file/image/{transactionId}/{transactionId}.png
const getPreviewImageUrl = (transactionId: string) => {
  const id = encodeURIComponent(transactionId);
  return `${BOOTH_LOCAL_BASE_URL}/api/file/image/${id}/${id}.png`;
};

const getQrImageUrl = (transactionId: string) => {
  const id = encodeURIComponent(transactionId);
  return `${BOOTH_LOCAL_BASE_URL}/api/file/image/${id}/${id}_QR.png`;
};

// Probe bang mode 'no-cors': chi can biet cong 8088 co ai lang nghe hay khong,
// khong doc duoc response nen khong phu thuoc vao CORS header cua app booth.
const checkBoothAvailable = async (timeoutMs = 4000): Promise<boolean> => {
  const { signal, clear } = createTimeoutSignal(timeoutMs);
  try {
    await fetch(`${BOOTH_LOCAL_BASE_URL}/`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clear();
  }
};

export interface LocalBoothInfo {
  boothCode: string;
  boothId: string;
}

// GET /api/booth/getbooth tra ve thong tin booth cua chinh may nay
// => vua dung de xac dinh "co phai booth khong", vua lay duoc boothCode.
const getBoothInfo = async (timeoutMs = 6000): Promise<LocalBoothInfo> => {
  const { signal, clear } = createTimeoutSignal(timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${BOOTH_LOCAL_BASE_URL}/api/booth/getbooth`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
  } catch {
    throw new NotBoothDeviceError();
  } finally {
    clear();
  }

  if (!response.ok) {
    throw new NotBoothDeviceError();
  }

  const payload = await response.json() as {
    response?: { boothCode?: unknown; boothId?: unknown };
    boothCode?: unknown;
    boothId?: unknown;
  };
  const booth = payload.response ?? payload;
  const boothCode = String(booth.boothCode ?? '').trim();

  if (!boothCode) {
    throw new NotBoothDeviceError(
      `Không đọc được boothCode từ ${BOOTH_LOCAL_BASE_URL}/api/booth/getbooth.`,
    );
  }

  return { boothCode, boothId: String(booth.boothId ?? '') };
};

export interface LocalTransactionItem {
  transactionId: string;
  code: string;
  values: Record<string, unknown>;
}

const DEFAULT_TRANSACTION_LIMIT = 300;

// App booth phuc vu file trong D:\Work\PhotoBooth\<entity>\<filename> qua endpoint resource,
// nen tai duoc nguyen file SQLite ma khong can cai them gi tren may booth.
const getDatabaseUrl = () => `${BOOTH_LOCAL_BASE_URL}/api/file/image/resource/Data/Funstudio.db`;

let sqlEnginePromise: Promise<import('sql.js').SqlJsStatic> | null = null;

const loadSqlEngine = () => {
  if (!sqlEnginePromise) {
    sqlEnginePromise = (async () => {
      const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import('sql.js'),
        import('sql.js/dist/sql-wasm.wasm?url'),
      ]);
      return initSqlJs({ locateFile: () => wasmUrl });
    })().catch(error => {
      sqlEnginePromise = null;
      throw error;
    });
  }

  return sqlEnginePromise;
};

// Doc bang Transactions trong Funstudio.db bang SQLite WASM ngay tren trinh duyet.
// Id la GUID dung cho anh preview va API in; Code la ma giao dich hien thi cho user.
const getTransactions = async (
  limit = DEFAULT_TRANSACTION_LIMIT,
  timeoutMs = 30000,
): Promise<LocalTransactionItem[]> => {
  const { signal, clear } = createTimeoutSignal(timeoutMs);

  let buffer: ArrayBuffer;
  try {
    const response = await fetch(getDatabaseUrl(), { cache: 'no-store', signal });
    if (!response.ok) {
      throw new NotBoothDeviceError(
        `Không tải được database booth (HTTP ${response.status}) từ ${getDatabaseUrl()}.`,
      );
    }
    buffer = await response.arrayBuffer();
  } catch (error) {
    if (error instanceof NotBoothDeviceError) throw error;
    throw new NotBoothDeviceError();
  } finally {
    clear();
  }

  const engine = await loadSqlEngine();
  const database = new engine.Database(new Uint8Array(buffer));

  try {
    const [result] = database.exec(
      `SELECT * FROM Transactions ORDER BY datetime(RecordAt) DESC LIMIT ${Number(limit) || DEFAULT_TRANSACTION_LIMIT}`,
    );
    if (!result) return [];

    const idIndex = result.columns.indexOf('Id');
    const codeIndex = result.columns.indexOf('Code');

    return result.values
      .map(row => {
        const values: Record<string, unknown> = {};
        result.columns.forEach((column, index) => {
          values[column] = row[index];
        });

        return {
          transactionId: String(row[idIndex] ?? ''),
          code: String(row[codeIndex] ?? ''),
          values,
        };
      })
      .filter(item => Boolean(item.transactionId));
  } finally {
    database.close();
  }
};

export interface ProcessImageListItem {
  fileName: string;
  rotate: number;
  flip: unknown;
  isDigitalBackground: boolean;
  digitalBackgroundId: number;
}

export interface ProcessImageRequest {
  frameId: number;
  layoutId: number;
  themeId: number;
  themeDetailId: number;
  transactionId: string;
  filterId: number;
  listImages: ProcessImageListItem[];
  isFile: boolean;
  isVideo: boolean;
  voucherCode: string;
  purchaseDuration: number;
  captureDuration: number;
  editDuration: number;
  captureMode: number;
  printNumber: number;
  layoutAmount: number;
  printAmount: number;
  discount: number;
  deposit: number;
  listSticker: unknown[];
  isDigitalBackground: boolean;
  digitalBackgroundId: number;
  isConfirmPolicy: boolean;
  isSelfBooth: boolean;
  paymentMethod: number;
}

const toInt = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const toBool = (value: unknown) => value === true || value === 1 || value === '1';

// Cot Images luu san JSON dung dang listImages cua API processimage.
const parseListImages = (value: unknown): ProcessImageListItem[] => {
  if (typeof value !== 'string' || !value.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map(entry => ({
      fileName: String(entry.fileName ?? ''),
      rotate: toInt(entry.rotate, 0),
      flip: entry.flip ?? null,
      isDigitalBackground: toBool(entry.isDigitalBackground),
      digitalBackgroundId: toInt(entry.digitalBackgroundId, 0),
    }))
    .filter(entry => Boolean(entry.fileName));
};

// Cot ImageTheme co dang "/LayoutTheme/4444.png" -> themeDetailId = 4444.
const parseThemeDetailId = (value: unknown) => {
  if (typeof value !== 'string') return 0;
  const matched = value.match(/(\d+)(?:\.[a-z0-9]+)?$/i);
  return matched ? toInt(matched[1], 0) : 0;
};

// Dung payload processimage tu dung mot dong trong bang Transactions.
const buildProcessImagePayload = (item: LocalTransactionItem): ProcessImageRequest => {
  const values = item.values ?? {};
  const listImages = parseListImages(values.Images);
  const digitalImage = listImages.find(entry => entry.isDigitalBackground && entry.digitalBackgroundId > 0);

  return {
    frameId: toInt(values.FrameId, 0),
    layoutId: toInt(values.LayoutId, 0),
    themeId: toInt(values.ThemeId, 0),
    themeDetailId: parseThemeDetailId(values.ImageTheme),
    transactionId: item.transactionId,
    filterId: toInt(values.FilterId, 0),
    listImages,
    isFile: toBool(values.IsFile),
    isVideo: false,
    voucherCode: typeof values.VoucherCode === 'string' ? values.VoucherCode : '',
    purchaseDuration: toInt(values.PurchaseDuration, 0),
    captureDuration: toInt(values.CaptureDuration, 0),
    editDuration: toInt(values.EditDuration, 0),
    captureMode: toInt(values.CaptureMode, 0),
    printNumber: toInt(values.PrintNumber, 0),
    layoutAmount: toInt(values.LayoutAmount, 0),
    printAmount: toInt(values.PrintAmount, 0),
    discount: toInt(values.Discount, 0),
    deposit: toInt(values.Deposit, 0),
    listSticker: [],
    isDigitalBackground: Boolean(digitalImage),
    digitalBackgroundId: digitalImage?.digitalBackgroundId ?? toInt(values.BackgroundId, 0),
    isConfirmPolicy: toBool(values.IsConfirmPolicy),
    isSelfBooth: toBool(values.IsSelfBooth),
    paymentMethod: toInt(values.PaymentMethod, 0),
  };
};

const postToBooth = async (
  path: string,
  body: unknown,
  timeoutMs: number,
  failureLabel: string,
): Promise<LocalBoothApiResult> => {
  const { signal, clear } = createTimeoutSignal(timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${BOOTH_LOCAL_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Booth không phản hồi sau ${Math.round(timeoutMs / 1000)} giây.`);
    }
    throw new NotBoothDeviceError();
  } finally {
    clear();
  }

  const text = await response.text();
  let raw: unknown = text;
  if (text) {
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text;
    }
  }

  if (!response.ok) {
    const detail = typeof raw === 'string' ? raw : JSON.stringify(raw);
    throw new Error(`${failureLabel} (HTTP ${response.status})${detail ? `: ${detail}` : ''}`);
  }

  return { status: response.status, raw };
};

const processImage = (payload: ProcessImageRequest, timeoutMs = 120000) => (
  postToBooth('/api/file/processimage', payload, timeoutMs, 'Tạo ảnh thất bại')
);

const printImage = (body: LocalPrintImageRequest, timeoutMs = 20000) => (
  postToBooth(
    '/api/print/printimage',
    {
      transactionId: body.transactionId,
      layoutId: body.layoutId,
      numberOfImage: body.numberOfImage,
    },
    timeoutMs,
    'In ảnh thất bại',
  )
);

export const localBoothPrintService = {
  baseUrl: BOOTH_LOCAL_BASE_URL,
  getPreviewImageUrl,
  getQrImageUrl,
  checkBoothAvailable,
  getBoothInfo,
  getTransactions,
  buildProcessImagePayload,
  processImage,
  printImage,
};
