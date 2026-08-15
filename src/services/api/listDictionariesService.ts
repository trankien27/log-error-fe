import {
  CreateListDictionaryRequest,
  ListDictionaryDto,
  ListDictionaryItemDto,
  SaveListDictionaryItemRequest,
  UpdateListDictionaryDisplayRequest,
} from '../../types';
import { apiClient } from './apiClient';

function queryString(params: Record<string, string | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

function encodeCode(code: string) {
  return encodeURIComponent(code);
}

export const listDictionariesService = {
  getAll: (keyword = '') =>
    apiClient.get<ListDictionaryDto[]>(`/api/list-dictionaries${queryString({ keyword })}`),

  getByCode: (code: string) =>
    apiClient.get<ListDictionaryDto>(`/api/list-dictionaries/${encodeCode(code)}`),

  create: (request: CreateListDictionaryRequest) =>
    apiClient.post<ListDictionaryDto>('/api/list-dictionaries', request),

  updateDisplay: (code: string, request: UpdateListDictionaryDisplayRequest) =>
    apiClient.patch<ListDictionaryDto>(
      `/api/list-dictionaries/${encodeCode(code)}/display`,
      request,
    ),

  getItems: (code: string, keyword = '') =>
    apiClient.get<ListDictionaryItemDto[]>(
      `/api/list-dictionaries/${encodeCode(code)}/items${queryString({ keyword })}`,
    ),

  getItemByCode: (code: string, itemCode: string) =>
    apiClient.get<ListDictionaryItemDto>(
      `/api/list-dictionaries/${encodeCode(code)}/items/${encodeCode(itemCode)}`,
    ),

  createItem: (code: string, request: SaveListDictionaryItemRequest) =>
    apiClient.post<ListDictionaryItemDto>(
      `/api/list-dictionaries/${encodeCode(code)}/items`,
      request,
    ),

  updateItem: (code: string, itemId: number, request: SaveListDictionaryItemRequest) =>
    apiClient.put<ListDictionaryItemDto>(
      `/api/list-dictionaries/${encodeCode(code)}/items/${itemId}`,
      request,
    ),

  deleteItem: (code: string, itemId: number) =>
    apiClient.delete<boolean>(`/api/list-dictionaries/${encodeCode(code)}/items/${itemId}`),
};
