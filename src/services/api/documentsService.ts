import {
  KnowledgeDocumentDto,
  KnowledgeDocumentImageDto,
  KnowledgeDocumentImageSummaryDto,
  KnowledgeDocumentSummaryDto,
  SaveKnowledgeDocumentRequest,
  UploadKnowledgeDocumentImageRequest,
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

  listImages: (documentId: number) =>
    apiClient.get<KnowledgeDocumentImageDto[]>(`/api/documents/${documentId}/images`),

  uploadImage: (documentId: number, request: UploadKnowledgeDocumentImageRequest) =>
    apiClient.post<KnowledgeDocumentImageSummaryDto>(`/api/documents/${documentId}/images`, request),

  deleteImage: (documentId: number, imageId: number) =>
    apiClient.delete<boolean>(`/api/documents/${documentId}/images/${imageId}`),
};
