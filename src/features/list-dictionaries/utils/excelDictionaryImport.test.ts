import { describe, expect, it } from 'vitest';
import {
  buildExcelDictionaryDraft,
  buildImportItems,
  ExcelImportCell,
} from './excelDictionaryImport';

describe('excelDictionaryImport', () => {
  it('maps headers, infers field types and ignores empty rows', () => {
    const sheet: ExcelImportCell[][] = [
      [null, null, null, null],
      ['Tên thiết bị', 'Số lượng', 'Hoạt động', 'Ngày mua'],
      ['Máy in', 2, true, new Date(2026, 7, 15)],
      ['Máy quét', 1, false, new Date(2026, 7, 16)],
      [null, null, null, null],
    ];

    const draft = buildExcelDictionaryDraft('thiet-bi.xlsx', sheet);

    expect(draft.headerRowNumber).toBe(2);
    expect(draft.rows).toHaveLength(2);
    expect(draft.fields.map(field => ({ code: field.code, type: field.dataType, required: field.isRequired }))).toEqual([
      { code: 'TEN_THIET_BI', type: 1, required: true },
      { code: 'SO_LUONG', type: 2, required: true },
      { code: 'HOAT_DONG', type: 3, required: true },
      { code: 'NGAY_MUA', type: 4, required: true },
    ]);
  });

  it('creates unique field codes and converts rows for the API', () => {
    const draft = buildExcelDictionaryDraft('data.xlsx', [
      ['Mã SP', 'Ma SP', 'Kích hoạt'],
      ['A01', 'B01', 'Có'],
      ['A02', 'B02', 'Không'],
    ]);
    expect(draft.fields.map(field => field.code)).toEqual(['MA_SP', 'MA_SP_2', 'KICH_HOAT']);
    expect(draft.fields[2].dataType).toBe(3);
    expect(buildImportItems(draft.fields, draft.rows)).toEqual([
      { MA_SP: 'A01', MA_SP_2: 'B01', KICH_HOAT: true },
      { MA_SP: 'A02', MA_SP_2: 'B02', KICH_HOAT: false },
    ]);
  });

  it('keeps a blank-header column that has data and flags it for the user to name', () => {
    const draft = buildExcelDictionaryDraft('gap.xlsx', [
      ['Tên', null, 'Ghi chú'],
      ['A', 1, 'Test'],
    ]);
    expect(draft.fields.map(field => field.code)).toEqual(['TEN', 'FIELD_2', 'GHI_CHU']);
    expect(draft.fields[1].name).toBe('');
    expect(draft.rows).toHaveLength(1);
  });

  it('drops fully empty columns and allows a header-only file without throwing', () => {
    const draft = buildExcelDictionaryDraft('header-only.xlsx', [
      ['Tên', null, 'Ghi chú'],
    ]);
    expect(draft.fields.map(field => field.code)).toEqual(['TEN', 'GHI_CHU']);
    expect(draft.rows).toHaveLength(0);
  });
});
