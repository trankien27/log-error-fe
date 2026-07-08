import { ApiError } from '../../../services/api/apiClient';
import { AutoArrangePreviewItem, AutoArrangePreviewResponse } from '../types/workScheduleArrange.types';

export function mapAutoArrangeError(error: unknown) {
  if (error instanceof ApiError) {
    const details = typeof error.data === 'string' ? error.data : error.message;
    if (error.code === 'COVERAGE_BROKEN' || error.message.includes('COVERAGE_BROKEN')) {
      return `Lịch sau chỉnh sửa bị hở khung giờ trực: ${details.replace('COVERAGE_BROKEN:', '').trim()}`;
    }

    switch (error.code) {
      case 'WORK_SCHEDULE_CONFLICT':
        return `Trùng lịch: ${error.message}`;
      case 'REST_TIME_VIOLATION':
        return `Không đủ thời gian nghỉ: ${error.message}`;
      case 'AUTO_ARRANGE_UNDERSTAFFED':
        return `Có ca thiếu người: ${error.message}`;
      case 'TARGET_HOURS_EXCEEDED':
        return `Có nhân viên vượt giờ: ${error.message}`;
      default:
        return error.message;
    }
  }

  return error instanceof Error ? error.message : 'Không thể tự động chia ca.';
}

export function normalizePreviewItems(response: AutoArrangePreviewResponse): AutoArrangePreviewItem[] {
  return (response.items || []).map((item, index) => ({
    ...item,
    clientId: item.clientId || item.itemId || `${item.userId}-${item.workDate}-${item.shiftId}-${index}`,
    warnings: item.warnings || [],
    conflicts: item.conflicts || [],
  }));
}
