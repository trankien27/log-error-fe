import { ListDictionaryFieldType } from '../../../types';

export const MAX_EXCEL_IMPORT_ROWS = 2000;
export const MAX_EXCEL_IMPORT_FIELDS = 30;
export const MAX_EXCEL_FILE_SIZE = 10 * 1024 * 1024;

export type ExcelImportCell = string | number | boolean | Date | null;

export interface ExcelImportFieldDraft {
  key: string;
  sourceIndex: number;
  sourceHeader: string;
  name: string;
  code: string;
  dataType: ListDictionaryFieldType;
  isRequired: boolean;
}

export interface ExcelImportRow {
  sourceRowNumber: number;
  values: ExcelImportCell[];
}

export interface ExcelDictionaryDraft {
  fileName: string;
  headerRowNumber: number;
  fields: ExcelImportFieldDraft[];
  rows: ExcelImportRow[];
}

function isEmptyCell(value: ExcelImportCell | undefined) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

export function toImportCode(value: string) {
  const code = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return /^[A-Z]/.test(code) ? code : code ? `F_${code}` : '';
}

function uniqueCode(header: string, columnIndex: number, usedCodes: Set<string>) {
  const baseCode = (toImportCode(header) || `FIELD_${columnIndex + 1}`)
    .slice(0, 50)
    .replace(/_+$/g, '');
  let code = baseCode;
  let suffix = 2;
  while (usedCodes.has(code)) {
    const suffixText = `_${suffix}`;
    code = `${baseCode.slice(0, 50 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  usedCodes.add(code);
  return code;
}

function inferDataType(values: ExcelImportCell[]): ListDictionaryFieldType {
  if (values.length === 0) return 1;
  if (values.every(value => typeof value === 'boolean')) return 3;
  if (values.every(value => typeof value === 'number' && Number.isFinite(value))) return 2;
  if (values.every(value => typeof value === 'string' && parseBoolean(value) !== null)) return 3;
  if (values.every(value => value instanceof Date && !Number.isNaN(value.getTime()))) {
    const hasTime = values.some(value => {
      const date = value as Date;
      return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
    });
    return hasTime ? 5 : 4;
  }
  return 1;
}

export function buildExcelDictionaryDraft(fileName: string, sheetData: ExcelImportCell[][]): ExcelDictionaryDraft {
  const headerRowIndex = sheetData.findIndex(row => row.some(value => !isEmptyCell(value)));
  if (headerRowIndex < 0) throw new Error('File Excel không có dữ liệu.');

  const headerRow = sheetData[headerRowIndex];
  let lastHeaderIndex = headerRow.length - 1;
  while (lastHeaderIndex >= 0 && isEmptyCell(headerRow[lastHeaderIndex])) lastHeaderIndex -= 1;
  if (lastHeaderIndex < 0) throw new Error('Không tìm thấy header trong file Excel.');
  if (lastHeaderIndex + 1 > MAX_EXCEL_IMPORT_FIELDS) {
    throw new Error(`File chỉ được có tối đa ${MAX_EXCEL_IMPORT_FIELDS} cột.`);
  }

  const headers = headerRow.slice(0, lastHeaderIndex + 1).map((value, index) => {
    if (isEmptyCell(value)) throw new Error(`Cột ${index + 1} đang thiếu header.`);
    return String(value).trim();
  });

  const rows: ExcelImportRow[] = sheetData
    .slice(headerRowIndex + 1)
    .map((values, index) => ({
      sourceRowNumber: headerRowIndex + index + 2,
      values: values.slice(0, headers.length),
    }))
    .filter(row => row.values.some(value => !isEmptyCell(value)));

  if (rows.length === 0) throw new Error('File Excel chỉ có header, chưa có dòng dữ liệu.');
  if (rows.length > MAX_EXCEL_IMPORT_ROWS) {
    throw new Error(`Mỗi lần chỉ được import tối đa ${MAX_EXCEL_IMPORT_ROWS} dòng dữ liệu.`);
  }

  const usedCodes = new Set<string>();
  const headerOccurrences = new Map<string, number>();
  const fields = headers.map((header, sourceIndex) => {
    const occurrence = (headerOccurrences.get(header.toLocaleLowerCase('vi')) || 0) + 1;
    headerOccurrences.set(header.toLocaleLowerCase('vi'), occurrence);
    const occurrenceLabel = occurrence === 1 ? '' : ` (${occurrence})`;
    const name = `${header.slice(0, 150 - occurrenceLabel.length)}${occurrenceLabel}`;
    const nonEmptyValues = rows
      .map(row => row.values[sourceIndex])
      .filter(value => !isEmptyCell(value)) as ExcelImportCell[];

    return {
      key: `${sourceIndex}-${header}`,
      sourceIndex,
      sourceHeader: header,
      name,
      code: uniqueCode(header, sourceIndex, usedCodes),
      dataType: inferDataType(nonEmptyValues),
      isRequired: nonEmptyValues.length === rows.length,
    } satisfies ExcelImportFieldDraft;
  });

  return {
    fileName,
    headerRowNumber: headerRowIndex + 1,
    fields,
    rows,
  };
}

export async function parseExcelDictionaryFile(file: File): Promise<ExcelDictionaryDraft> {
  if (!file.name.toLocaleLowerCase('vi').endsWith('.xlsx')) {
    throw new Error('Chỉ hỗ trợ file Excel định dạng .xlsx.');
  }
  if (file.size > MAX_EXCEL_FILE_SIZE) {
    throw new Error('File Excel không được vượt quá 10 MB.');
  }

  const { readSheet } = await import('read-excel-file/browser');
  const sheetData = await readSheet(file);
  return buildExcelDictionaryDraft(file.name, sheetData as unknown as ExcelImportCell[][]);
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatExcelPreviewValue(value: ExcelImportCell | undefined) {
  if (isEmptyCell(value)) return '—';
  if (value instanceof Date) {
    return value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0
      ? formatDateOnly(value)
      : value.toLocaleString('vi-VN');
  }
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return String(value);
}

function parseBoolean(value: ExcelImportCell) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && (value === 0 || value === 1)) return value === 1;
  const normalized = String(value).trim().toLocaleLowerCase('vi');
  if (['true', 'yes', 'y', 'có', 'co', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', 'không', 'khong', '0'].includes(normalized)) return false;
  return null;
}

function convertCell(value: ExcelImportCell, field: ExcelImportFieldDraft) {
  if (field.dataType === 1) {
    const text = value instanceof Date ? value.toISOString() : String(value).trim();
    if (text.length > 4000) throw new Error(`Trường ${field.name} vượt quá 4000 ký tự.`);
    return text;
  }
  if (field.dataType === 2) {
    const numberValue = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(numberValue)) throw new Error(`Trường ${field.name} phải là số.`);
    return numberValue;
  }
  if (field.dataType === 3) {
    const booleanValue = parseBoolean(value);
    if (booleanValue === null) throw new Error(`Trường ${field.name} phải là Có/Không hoặc true/false.`);
    return booleanValue;
  }
  if (field.dataType === 4) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new Error(`Trường ${field.name} phải là ngày hợp lệ.`);
    return formatDateOnly(date);
  }
  if (field.dataType === 5) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new Error(`Trường ${field.name} phải là ngày giờ hợp lệ.`);
    return date.toISOString();
  }
  throw new Error(`Kiểu dữ liệu của trường ${field.name} không hỗ trợ import.`);
}

export function buildImportItems(fields: ExcelImportFieldDraft[], rows: ExcelImportRow[]) {
  return rows.map(row => {
    const values: Record<string, string | number | boolean> = {};
    fields.forEach(field => {
      const value = row.values[field.sourceIndex];
      if (isEmptyCell(value)) {
        if (field.isRequired) throw new Error(`Dòng ${row.sourceRowNumber}: trường ${field.name} là bắt buộc.`);
        return;
      }
      try {
        values[field.code] = convertCell(value as ExcelImportCell, field);
      } catch (error: any) {
        throw new Error(`Dòng ${row.sourceRowNumber}: ${error?.message || 'giá trị không hợp lệ.'}`);
      }
    });
    return values;
  });
}
