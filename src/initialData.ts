import { ErrorLog, User, Role, Booth, Task, SystemNotification, Activity } from './types';

export const INITIAL_ERROR_LOGS: ErrorLog[] = [
  {
    id: 'ERR-2023-001',
    title: 'Lỗi kết nối máy in bill',
    reporter: 'Nguyễn Văn A',
    reportTime: '24/10/2023 09:30',
    store: 'CH Quận 1',
    booth: 'Quầy Thu Ngân 1',
    attachment: true,
    status: 'Mới',
    severity: 'Cảnh báo',
  },
  {
    id: 'ERR-2023-002',
    title: 'Màn hình POS chớp tắt',
    reporter: 'Trần Thị B',
    reportTime: '23/10/2023 14:15',
    store: 'CH Quận 3',
    booth: 'Kiosk Tự Phục Vụ',
    attachment: false,
    status: 'Đang xử lý',
    severity: 'Bình thường',
  },
  {
    id: 'ERR-2023-003',
    title: 'Lỗi phần mềm quét mã vạch',
    reporter: 'Lê Văn C',
    reportTime: '22/10/2023 10:00',
    store: 'CH Gò Vấp',
    booth: 'Kho hàng',
    attachment: true,
    status: 'Đã đóng',
    severity: 'Bình thường',
  },
  {
    id: 'ERR-2023-004',
    title: 'Không thể kết nối Wifi nội bộ',
    reporter: 'Phạm Hương',
    reportTime: '21/10/2023 08:45',
    store: 'CH Quận 10',
    booth: 'Quầy Thu Ngân 2',
    attachment: false,
    status: 'Mới',
    severity: 'Cảnh báo',
  },
  {
    id: 'ERR-2023-005',
    title: 'Mất kết nối server DB chính',
    reporter: 'Nguyễn Văn A',
    reportTime: '20/10/2023 11:20',
    store: 'CH Quận 1',
    booth: 'Phòng kỹ thuật',
    attachment: true,
    status: 'Đang xử lý',
    severity: 'Lỗi nghiêm trọng',
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    name: 'Nguyễn Thị Mai',
    email: 'mai.nguyen@company.vn',
    role: 'Admin',
    status: 'Hoạt động',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0ZTvgebGJmFrSzydrtfDNfXBHVWh7w1RLXUEvuCrFNjfzsb1u6nrgxxTsynOXg17slJ5h6oT-ZSLquSa9dVvn8SOS9qiEkMu4aB-WGsGTuW_FOqPgld30zRq8kMuXkiKntXv33r0jemWx_am7rc5bmg5L5prdd0GAVO9PopF75axxsXIw4KdaRBiCy0SQojPP5P3kGWVbPYmwm59epAMcavpSoKSqPX6FO468VSl9IMIzx7Hg2QVf3TwPhmG6MhpRcl_E_14hTHA',
  },
  {
    id: 'USR-042',
    name: 'Trần Văn Nam',
    email: 'nam.tran@company.vn',
    role: 'IT Support',
    status: 'Hoạt động',
  },
  {
    id: 'USR-089',
    name: 'Lê Hoàng Bách',
    email: 'bach.le@company.vn',
    role: 'Manager',
    status: 'Vô hiệu hóa',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKBCqL7m8zbjvWQvLyo8Vq8aa2tj2gmUHKNQBgYITpfs9Ip8PNqta59i57WH3NBOeH0FtLHBJgzY_RHJmY8zTb3y9IJo0agzhNRHAxbdriSIyCEXjBFd0AmypgnFEC7MGGxezRQM-ZfPwJAJVNp5bZWKhuNy0zv4DaJ3e2IMDDC6Q6wotVcgCk5lM3Ec9mcaGH4-d8-Pi2SYXXexNNZIYlbTAle6UL0ThIDu2TrTKbJ4OUO7QG2hz1KLSO5j708n8-GTsfdXak3LU',
  },
  {
    id: 'USR-112',
    name: 'Phạm Hương',
    email: 'huong.pham@company.vn',
    role: 'Staff',
    status: 'Hoạt động',
  },
  {
    id: 'USR-115',
    name: 'Đặng Quốc Huy',
    email: 'huy.dang@company.vn',
    role: 'IT Support',
    status: 'Hoạt động',
  },
  {
    id: 'USR-010',
    name: 'Nguyễn Văn A',
    email: 'nva@itadmin.company.com',
    role: 'IT Support',
    status: 'Hoạt động',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC703_rsdHDf1TAbvoC45iFKVX4rcr3oh8immWJwqXOeRrFTHcLvjwbCBiOIm0ZtI9RTmsyih80Ow8IElEpdtzXZTuHwz8AuyIvUxbMm8_OezAoHT7jODhsg1tWGlG_1IOO9jn60IrzMWV8ntE7ASPHI06e08mJ6zQfpbbL7UyznoqJGsWbdLXbGO-qu5JIfJZby5C-r09jDddC0Na9d-RelWmO03qBS7IfCOFCh_ewaHJw_dcUwhwqaSru4KGPLD_sWIHTuKJROUY',
    phone: '+84 987 654 321',
    department: 'IT Operations'
  },
];

export const INITIAL_ROLES: Role[] = [
  {
    name: 'Admin',
    userCount: 3,
    description: 'Toàn quyền truy cập, chỉnh sửa hệ thống và cấu hình người dùng.',
    securityLevel: 'Cao',
  },
  {
    name: 'Manager',
    userCount: 12,
    description: 'Quản lý đội ngũ, xem báo cáo tổng hợp và duyệt yêu cầu.',
    securityLevel: 'Cao',
  },
  {
    name: 'IT Support',
    userCount: 45,
    description: 'Xử lý ticket, xem log lỗi và hỗ trợ người dùng cuối.',
    securityLevel: 'Trung bình',
  },
  {
    name: 'Staff',
    userCount: 68,
    description: 'Quyền truy cập cơ bản, tạo ticket yêu cầu hỗ trợ.',
    securityLevel: 'Thấp',
  },
];

export const INITIAL_BOOTHS: Booth[] = [
  {
    id: 'BTH-001',
    name: 'Quầy Hỗ Trợ Kỹ Thuật T1',
    ultraviewId: '12 345 678',
    relatedStores: 'Store Quận 1, Store Quận 3',
  },
  {
    id: 'BTH-002',
    name: 'Trạm Xử Lý Nhanh Sảnh A',
    ultraviewId: '98 765 432',
    relatedStores: 'Store Gò Vấp',
  },
  {
    id: 'BTH-003',
    name: 'Booth Kho Trung Tâm',
    ultraviewId: '55 443 221',
    relatedStores: 'Kho Tổng Bình Dương',
  },
  {
    id: 'BTH-004',
    name: 'Quầy Tiếp Nhận Bảo Hành',
    ultraviewId: '11 223 344',
    relatedStores: 'Store Quận 10, Store Quận 5',
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'IT-1042',
    title: 'Cài đặt phần mềm thiết kế cho phòng Marketing mới',
    status: 'pending',
    dueText: 'Hôm nay',
    assigneeName: 'Trần Văn Nam',
    assigneeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOuRg0-tkfASYWUBN5aUWfZc6iS1pybXdH43ZywRcOn3XNo-CCAeA50DluBLbgtgeofaPyVBz75GCxHhvnPSt9N_Bo7IPnH9hr68tSRvh1g5uygrL7M-bj-BSxUi15r0YN07rNjpvX5TOmss4w4Vix2ThDL_iIFBVCSyNo-xqqYyrj0f-vaSBEojSmEGSIYnzzkUHgEq0iCHW9ifHEzzjlptvyXvDrZBFDU9GWWtTvIAXn-lldKx61NHt4W6xFMVyBmeu2TeypMc8',
    commentsCount: 2,
    isOverdue: false,
    notes: 'Đã trao đổi với trưởng phòng Marketing về danh sách phần mềm bản quyền (Adobe CC, Figma Desktop, Canva PRO). Cần triển khai sớm trong chiều nay.',
    attachments: [
      { name: 'Adobe_CC_Installer_Guide.pdf', size: '1.4 MB', type: 'application/pdf' },
      { name: 'Marketing_Office_Layout.png', size: '2.1 MB', type: 'image/png' }
    ]
  },
  {
    id: 'IT-1038',
    title: 'Kiểm tra lỗi kết nối mạng tầng 3 Tòa nhà A',
    status: 'progress',
    dueText: 'Hôm qua',
    assigneeName: 'Nguyễn Thị Mai',
    assigneeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDF4P3NuPhMQq6Xu0TGYgCyj03XoJIcAeOnDekfjr6JMLm12X_2LaZggfnxmJzqiNs3OBB_hmeoeCEzCp0tu7_4ZU4-ovYL6PO3JWdPslVmHEk88487pbBBZ0CmCMbdalY8BzdpbfVkZ-C907VN3he1_ZjFkvwQTRIKHbGaRLoOxp4MiQjWo_eeeGEC5yGS8yMhrxlhCX6BHqdZ1sxkbb8qYoweiU3L_jJtH2l3bIH4Ps0SOpXnlsUqlY9NiqK-NoV0_3NMcCdHuws',
    commentsCount: 0,
    isOverdue: true,
    notes: 'Đang theo dõi thiết bị Switch trung tâm tầng 3 bị sụt nguồn đột ngột. Một số node mạng chưa nhận IP từ máy chủ DHCP.',
    attachments: [
      { name: 'Network_Topology_Floor3.png', size: '3.8 MB', type: 'image/png' }
    ]
  },
  {
    id: 'IT-1035',
    title: 'Cập nhật license phần mềm diệt virus toàn hệ thống',
    status: 'done',
    dueText: 'Hoàn thành: 14/05/2024',
    assigneeName: 'Lê Hoàng Bách',
    commentsCount: 1,
    isOverdue: false,
    notes: 'Đã hoàn tất cài đặt bản quyền Kaspersky Endpoint Security cho 120 máy tính trạm và 5 máy chủ nội bộ.',
    attachments: []
  },
];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'NOT-001',
    type: 'warning',
    title: 'Cảnh báo: Server DB-01 tải cao (>90%)',
    content: 'Hệ thống ghi nhận mức sử dụng CPU trên server DB-01 vượt ngưỡng 90% trong 15 phút qua. Yêu cầu kiểm tra ngay lập tức các query đang chạy.',
    time: 'Vừa xong',
    tagName: 'Team DBA',
    tagType: 'Urgent',
    isRead: false,
  },
  {
    id: 'NOT-002',
    type: 'update',
    title: 'Cập nhật phần mềm hệ thống v2.4.1',
    content: 'Bản cập nhật v2.4.1 đã được triển khai thành công trên tất cả các node. Chi tiết release notes đính kèm.',
    time: '2 giờ trước',
    tagName: 'All Users',
    tagType: 'Info',
    isRead: false,
  },
  {
    id: 'NOT-003',
    type: 'success',
    title: 'Ticket #1024 đã được giải quyết',
    content: 'Vấn đề kết nối VPN của Nguyễn Văn A đã được xử lý xong bởi Support Team T1.',
    time: 'Hôm qua, 14:30',
    tagName: 'Nguyễn Văn A',
    tagType: 'None',
    isRead: true,
  },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: '#LOG-892',
    type: 'log',
    title: 'Mất kết nối server DB chính',
    location: 'Booth Quận 1',
    timeText: '10 phút trước',
    statusText: 'Lỗi nghiêm trọng',
    statusType: 'error',
  },
  {
    id: '#TSK-401',
    type: 'task',
    title: 'Cài đặt phần mềm kế toán mới',
    location: 'Phòng Tài chính',
    timeText: '1 giờ trước',
    statusText: 'Đang xử lý',
    statusType: 'pending',
  },
  {
    id: '#LOG-891',
    type: 'log',
    title: 'Máy in tầng 3 kẹt giấy',
    location: 'Tòa nhà A',
    timeText: '3 giờ trước',
    statusText: 'Hoàn thành',
    statusType: 'success',
  },
  {
    id: '#TSK-400',
    type: 'task',
    title: 'Tạo tài khoản email nhân viên mới',
    location: 'Phòng Nhân sự',
    timeText: 'Hôm qua',
    statusText: 'Hoàn thành',
    statusType: 'success',
  },
];
