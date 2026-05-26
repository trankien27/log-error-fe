export interface ErrorLog {
  id: string;
  title: string;
  reporter: string;
  reportTime: string;
  store: string;
  booth: string;
  attachment: boolean;
  status: 'Mới' | 'Đang xử lý' | 'Đã đóng';
  severity: 'Lỗi nghiêm trọng' | 'Bình thường' | 'Cảnh báo';
}
