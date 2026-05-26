import type { ErrorLog } from '@/features/errors/types/error.type';
import type { User, Role } from '@/features/users/types/user.type';
import type { Booth } from '@/features/booths/types/booth.type';
import type { Task } from '@/features/tasks/types/task.type';
import type { SystemNotification } from '@/features/notifications/types/notification.type';
import type { Activity } from '@/shared/types/common.type';

export const INITIAL_ERROR_LOGS: ErrorLog[] = [
  {
    id: 'ERR-2023-01',
    title: 'Lỗi đồng bộ hóa hóa đơn với máy chủ Thuế',
    reporter: 'Nguyễn Văn Hùng',
    reportTime: '2026-05-25 08:30:15',
    store: 'CH Quận 1',
    booth: 'Quầy Thu Ngân 1',
    attachment: true,
    status: 'Mới',
    severity: 'Lỗi nghiêm trọng',
  },
  {
    id: 'ERR-2023-02',
    title: 'Không thể kết nối thiết bị thanh toán POS máy mPOS-02',
    reporter: 'Lê Thị Mai',
    reportTime: '2026-05-25 10:15:30',
    store: 'CH Gò Vấp',
    booth: 'Kiosk Tự Phục Vụ',
    attachment: false,
    status: 'Đang xử lý',
    severity: 'Bình thường',
  },
  {
    id: 'ERR-2023-03',
    title: 'Màn hình hiển thị giá phụ bị nhấp nháy liên tục',
    reporter: 'Trần Minh Tâm',
    reportTime: '2026-05-24 14:20:00',
    store: 'CH Quận 10',
    booth: 'Quầy Thu Ngân 2',
    attachment: true,
    status: 'Đã đóng',
    severity: 'Cảnh báo',
  },
  {
    id: 'ERR-2023-04',
    title: 'Máy in hóa đơn nhiệt hết giấy hoặc kẹt dao cắt tự động',
    reporter: 'Phạm Thanh Sơn',
    reportTime: '2026-05-25 11:45:10',
    store: 'CH Quận 3',
    booth: 'Quầy Thu Ngân 1',
    attachment: false,
    status: 'Mới',
    severity: 'Cảnh báo',
  },
  {
    id: 'ERR-2023-05',
    title: 'Lỗi phân quyền tài khoản thu ngân không áp dụng được giảm giá mã coupon',
    reporter: 'Hoàng Hải Yến',
    reportTime: '2026-05-25 13:05:00',
    store: 'CH Quận 1',
    booth: 'Quầy Thu Ngân 2',
    attachment: false,
    status: 'Đang xử lý',
    severity: 'Bình thường',
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    name: 'Trần Quốc Bảo',
    email: 'bao.tran@company.vn',
    role: 'Admin',
    status: 'Hoạt động',
    phone: '+84 901 234 567',
    department: 'Ban Giám Đốc IT',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCf19wuTp7sv6x9pADPruTII3g4UFBNu_m17cE7ZShyK5gMM7wx5BRgQxa_JX_QigzNPtZ0Hsvanp0yPYNQrJYLHjyhSNdlbMxZMMB7fDcZzOfZUOBQPkFkr-C-3KkXGAIk94Ff4GaLV6hU5nGzC5XKj16Cj3C-Pzscz6_DEnDMQuBMtGWBPfmeKB4yZF2aK0xshp2wSitcu2Tr0xQuk6tvQrdaEeW347dLPZBhzq4N2z3oClFluj1ONP9T5sjYirKxp84SzbKM2SM',
  },
  {
    id: 'USR-002',
    name: 'Nguyễn Thị Hồng',
    email: 'hong.nguyen@company.vn',
    role: 'Manager',
    status: 'Hoạt động',
    phone: '+84 902 345 678',
    department: 'Vận Hành Hệ Thống',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOuRg0-tkfASYWUBN5aUWfZc6iS1pybXdH43ZywRcOn3XNo-CCAeA50DluBLbgtgeofaPyVBz75GCxHhvnPSt9N_Bo7IPnH9hr68tSRvh1g5uygrL7M-bj-BSxUi15r0YN07rNjpvX5TOmss4w4Vix2ThDL_iIFBVCSyNo-xqqYyrj0f-vaSBEojSmEGSIYnzzkUHgEq0iCHW9ifHEzzjlptvyXvDrZBFDU9GWWtTvIAXn-lldKx61NHt4W6xFMVyBmeu2TeypMc8',
  },
  {
    id: 'USR-003',
    name: 'Đặng Tuấn Anh',
    email: 'anh.dang@company.vn',
    role: 'IT Support',
    status: 'Hoạt động',
    phone: '+84 903 456 789',
    department: 'IT Operations',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOuRg0-tkfASYWUBN5aUWfZc6iS1pybXdH43ZywRcOn3XNo-CCAeA50DluBLbgtgeofaPyVBz75GCxHhvnPSt9N_Bo7IPnH9hr68tSRvh1g5uygrL7M-bj-BSxUi15r0YN07rNjpvX5TOmss4w4Vix2ThDL_iIFBVCSyNo-xqqYyrj0f-vaSBEojSmEGSIYnzzkUHgEq0iCHW9ifHEzzjlptvyXvDrZBFDU9GWWtTvIAXn-lldKx61NHt4W6xFMVyBmeu2TeypMc8',
  },
  {
    id: 'USR-004',
    name: 'Vũ Hoàng Nam',
    email: 'nam.vu@company.vn',
    role: 'IT Support',
    status: 'Hoạt động',
    phone: '+84 904 567 890',
    department: 'Kỹ Thuật Hạ Tầng',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOuRg0-tkfASYWUBN5aUWfZc6iS1pybXdH43ZywRcOn3XNo-CCAeA50DluBLbgtgeofaPyVBz75GCxHhvnPSt9N_Bo7IPnH9hr68tSRvh1g5uygrL7M-bj-BSxUi15r0YN07rNjpvX5TOmss4w4Vix2ThDL_iIFBVCSyNo-xqqYyrj0f-vaSBEojSmEGSIYnzzkUHgEq0iCHW9ifHEzzjlptvyXvDrZBFDU9GWWtTvIAXn-lldKx61NHt4W6xFMVyBmeu2TeypMc8',
  },
  {
    id: 'USR-005',
    name: 'Mai Thanh Thúy',
    email: 'thuy.mai@company.vn',
    role: 'Staff',
    status: 'Hoạt động',
    phone: '+84 905 678 901',
    department: 'Thu Ngân Quận 1',
  }
];

export const INITIAL_ROLES: Role[] = [
  {
    name: 'Admin',
    userCount: 1,
    description: 'Quyền quản trị tối cao, cho phép quản lý nhân sự, cấu hình vai trò, cài đặt hệ thống và bảo mật OTP.',
    securityLevel: 'Cao',
  },
  {
    name: 'Manager',
    userCount: 1,
    description: 'Quản lý vận hành, lập lịch ca trực, xem toàn bộ log lỗi và báo cáo tổng quan hiệu năng.',
    securityLevel: 'Cao',
  },
  {
    name: 'IT Support',
    userCount: 2,
    description: 'Đội kỹ thuật giải quyết sự cố, tiếp nhận log lỗi, quản lý Kanban board nhiệm vụ và trạm hỗ trợ UltraView.',
    securityLevel: 'Trung bình',
  },
  {
    name: 'Staff',
    userCount: 1,
    description: 'Tài khoản nhân viên cửa hàng, được quyền tạo báo cáo log lỗi mới và xem lịch làm việc cá nhân.',
    securityLevel: 'Thấp',
  }
];

export const INITIAL_BOOTHS: Booth[] = [
  {
    id: 'BTH-001',
    name: 'Quầy Thu Ngân 1 - G tầng',
    ultraviewId: '65 412 879',
    relatedStores: 'CH Quận 1',
  },
  {
    id: 'BTH-002',
    name: 'Quầy Thu Ngân 2 - Lầu 1',
    ultraviewId: '23 098 765',
    relatedStores: 'CH Quận 1',
  },
  {
    id: 'BTH-003',
    name: 'Kiosk Tự Phục Vụ - Sảnh lớn',
    ultraviewId: '98 765 432',
    relatedStores: 'CH Gò Vấp',
  },
  {
    id: 'BTH-004',
    name: 'Máy Kho Quét Mã Vạch',
    ultraviewId: '45 321 098',
    relatedStores: 'CH Quận 10',
  },
  {
    id: 'BTH-005',
    name: 'Quầy Thu Ngân 1 - Trung tâm',
    ultraviewId: '12 890 567',
    relatedStores: 'CH Quận 3',
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'IT-101',
    title: 'Xử lý lỗi kẹt dao cắt của máy in bill Quầy Thu Ngân 1',
    status: 'pending',
    dueText: 'Hôm nay',
    assigneeName: 'Đặng Tuấn Anh',
    commentsCount: 2,
    isOverdue: false,
    notes: 'Đã báo với bên bảo hành máy in để thay linh kiện nếu kẹt nghiêm trọng.',
    attachments: [
      { name: 'log_in_loi.txt', size: '12 KB', type: 'text/plain' }
    ]
  },
  {
    id: 'IT-102',
    title: 'Kiểm tra hạ tầng mạng Wi-Fi chập chờn tại CH Gò Vấp',
    status: 'progress',
    dueText: 'Hôm qua',
    assigneeName: 'Vũ Hoàng Nam',
    commentsCount: 5,
    isOverdue: true,
    notes: 'Đang theo dõi băng thông mạng qua router Mikrotik.',
    attachments: []
  },
  {
    id: 'IT-103',
    title: 'Cài đặt và đồng bộ hóa POS mới cho Kiosk tự phục vụ',
    status: 'done',
    dueText: 'Hôm nay',
    assigneeName: 'Trần Quốc Bảo',
    commentsCount: 0,
    isOverdue: false,
    notes: 'Đã đồng bộ dữ liệu hóa đơn thuế thành công.',
    attachments: []
  }
];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'NOT-001',
    type: 'warning',
    title: 'Cảnh báo: Bảo trì hệ thống mạng nội bộ',
    content: 'Hệ thống mạng VPN kết nối các cửa hàng sẽ được bảo trì vào lúc 23:00 hôm nay. Vui lòng hoàn tất kết ca và đồng bộ hóa đơn trước thời gian này.',
    time: '5 phút trước',
    tagName: 'Toàn thể user',
    tagType: 'Urgent',
    isRead: false,
  },
  {
    id: 'NOT-002',
    type: 'update',
    title: 'Cập nhật: Phiên bản phần mềm POS v4.2',
    content: 'Đã tối ưu hóa tốc độ in bill và sửa lỗi tích điểm coupon. Đề nghị các cửa hàng thực hiện khởi động lại máy POS để nhận cập nhật tự động.',
    time: '2 giờ trước',
    tagName: 'IT Operations',
    tagType: 'Info',
    isRead: true,
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'ACT-001',
    type: 'log',
    title: 'Báo lỗi: Lỗi đồng bộ hóa hóa đơn với máy chủ Thuế',
    location: 'CH Quận 1',
    timeText: '08:30',
    statusText: 'Mới',
    statusType: 'error',
  },
  {
    id: 'ACT-002',
    type: 'task',
    title: 'Phân công nhiệm vụ: Xử lý lỗi kẹt dao cắt máy in bill',
    location: 'Quầy Thu Ngân 1',
    timeText: '09:12',
    statusText: 'Chờ xử lý',
    statusType: 'pending',
  },
  {
    id: 'ACT-003',
    type: 'task',
    title: 'Hoàn thành nhiệm vụ: Cài đặt và đồng bộ hóa POS mới',
    location: 'Kiosk Tự Phục Vụ',
    timeText: '11:00',
    statusText: 'Đã Xong',
    statusType: 'success',
  }
];
