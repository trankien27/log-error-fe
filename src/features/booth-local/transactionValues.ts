type TransactionLike = { values?: Record<string, unknown> };

export const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

export const getTransactionValue = (item: TransactionLike, key: string) => item.values?.[key];

export const toNumberOrDefault = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};
