import {
  KnowledgeDocumentDto,
  KnowledgeDocumentImageDto,
  KnowledgeDocumentImageSummaryDto,
  KnowledgeDocumentSummaryDto,
  SaveKnowledgeDocumentRequest,
} from '../../types';
import { apiClient, API_BASE_URL, AUTH_TOKEN_KEY } from './apiClient';

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

  listImages: (documentId: number) =>
    apiClient.get<KnowledgeDocumentImageDto[]>(`/api/documents/${documentId}/images`),

  uploadImage: async (documentId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new Headers();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/images`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || payload?.Message || `Không thể tải ảnh lên Cloudflare R2. Status: ${response.status}`);
    }

    return (payload?.data ?? payload) as KnowledgeDocumentImageSummaryDto;
  },

  deleteImage: (documentId: number, imageId: number) =>
    apiClient.delete<boolean>(`/api/documents/${documentId}/images/${imageId}`),
};
