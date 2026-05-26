export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'IT Support' | 'Staff';
  status: 'Hoạt động' | 'Vô hiệu hóa';
  avatar?: string;
  phone?: string;
  department?: string;
}

export interface Role {
  name: string;
  userCount: number;
  description: string;
  securityLevel: 'Cao' | 'Trung bình' | 'Thấp';
}
