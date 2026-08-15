import {
  KnowledgeDocumentDto,
  KnowledgeDocumentSummaryDto,
  SaveKnowledgeDocumentRequest,
} from '../../types';
import { apiClient } from './apiClient';

export const documentsService = {
  getAll: (keyword?: string) => {
    const query = keyword?.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : '';
    return apiClient.get<KnowledgeDocumentSummaryDto[]>(`/api/documents${query}`);
  },

  getById: (id: number) => apiClient.get<KnowledgeDocumentDto>(`/api/documents/${id}`),

  create: (request: SaveKnowledgeDocumentRequest) =>
    apiClient.post<KnowledgeDocumentDto>('/api/documents', request),

  update: (id: number, request: SaveKnowledgeDocumentRequest) =>
    apiClient.put<KnowledgeDocumentDto>(`/api/documents/${id}`, request),

  delete: (id: number) => apiClient.delete<boolean>(`/api/documents/${id}`),
};
