import {
  CreateListDictionaryRequest,
  ImportListDictionaryRequest,
  ListDictionaryDto,
  ListDictionaryItemDto,
  ListDictionarySidebarDto,
  SaveListDictionaryItemRequest,
  UpdateListDictionarySidebarRequest,
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

  getSidebar: () =>
    apiClient.get<ListDictionarySidebarDto[]>('/api/list-dictionaries/navigation/sidebar'),

  create: (request: CreateListDictionaryRequest) =>
    apiClient.post<ListDictionaryDto>('/api/list-dictionaries', request),

  importExcel: (request: ImportListDictionaryRequest) =>
    apiClient.post<ListDictionaryDto>('/api/list-dictionaries/import', request),

  updateSidebarDisplay: (request: UpdateListDictionarySidebarRequest) =>
    apiClient.put<string[]>('/api/list-dictionaries/display', request),

  deleteDictionary: (code: string) =>
    apiClient.delete<boolean>(`/api/list-dictionaries/${encodeCode(code)}`),

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
