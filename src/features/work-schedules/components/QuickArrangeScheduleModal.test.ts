import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../services/api/apiClient';
import { mapQuickArrangeApiError } from './QuickArrangeScheduleModal';

describe('mapQuickArrangeApiError', () => {
  it('maps conflict error specifically', () => {
    const message = mapQuickArrangeApiError(
      new ApiError('Nhân viên đã có ca làm việc bị trùng giờ.', 409, 'WORK_SCHEDULE_CONFLICT'),
    );

    expect(message).toContain('Xung đột lịch làm việc');
    expect(message).toContain('Nhân viên đã có ca làm việc bị trùng giờ.');
  });

  it('maps incomplete quick arrange error specifically', () => {
    const message = mapQuickArrangeApiError(
      new ApiError(
        'Requested 8, arranged 6. S: 1 shift(s) - No valid day satisfies max shifts, overlap, rest time and consecutive-day rules.',
        400,
        'QUICK_ARRANGE_INCOMPLETE',
      ),
    );

    expect(message).toContain('Không thể xếp đủ lịch');
    expect(message).toContain('Cho phép lưu một phần');
    expect(message).toContain('Thời gian nghỉ tối thiểu');
  });
});
