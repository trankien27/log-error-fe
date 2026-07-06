export type ErrorGroup = 1 | 2 | 3;
export type ProcessingFlow = 1 | 2 | 3;
export type ErrorLogStatus = 1 | 2 | 3;
export type Severity = 1 | 2 | 3;

export interface ErrorLog {
  id: string;
  errorCode: string;
  receivedDate: string;
  month: number;
  store: string;
  booth?: string | null;
  errorGroup: ErrorGroup;
  description: string;
  processingFlow: ProcessingFlow;
  preliminaryCause?: string | null;
  solution?: string | null;
  status: ErrorLogStatus;
  severity: Severity;
  assignedToId: string;
  assignedToName?: string | null;
  note?: string | null;
  createdTime: string;
  lastUpdatedTime?: string | null;
}

export type TransactionErrorQueueStatus = 1 | 2 | 3;

export interface TransactionErrorQueueItem {
  id: string;
  boothCode: string;
  boothName: string;
  storeName: string;
  transactionId: string;
  transactionCode: string;
  transactionStatus?: number | null;
  values?: Record<string, unknown> | null;
  detectedAt: string;
  lastSeenAt: string;
  queueStatus: TransactionErrorQueueStatus;
  errorLogId?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'IT Support' | 'ITSupportManager' | 'Staff' | 'User' | 1 | 2 | 3 | 4 | 5;
  status: 'Hoạt động' | 'Vô hiệu hóa';
  avatar?: string;
  phone?: string;
  department?: string;
}

export interface ChatUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  sender?: ChatUser | null;
}

export interface ChatConversation {
  id: number;
  type: 'Direct' | string;
  createdAt: string;
  updatedAt: string;
  otherUser?: ChatUser | null;
  lastMessage?: ChatMessage | null;
  unreadCount: number;
}

export interface Role {
  name: string;
  userCount: number;
  description: string;
  securityLevel: 'Cao' | 'Trung bình' | 'Thấp';
}

export interface Booth {
  id: string;
  code?: string;
  agentKey?: string | null;
  name: string;
  storeId?: number | string | null;
  storeName?: string | null;
  lastSyncedAt?: string | null;
  ultraviewId: string;
  relatedStores: string;
}

export interface LookupItem {
  id: string | number;
  code?: string;
  agentKey?: string | null;
  name: string;
  storeId?: number | string | null;
  storeName?: string | null;
  relatedStores?: string | null;
  lastSyncedAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  pageIndex: number;
  pageSize: number;
}

export interface TaskAttachment {
  name: string;
  url?: string;
  size?: string;
  type?: string;
}

export interface Task {
  id: string;
  code?: string;
  title: string;
  description?: string;
  priority?: number;
  status: 'pending' | 'progress' | 'done';
  dueText: string;
  dueDate?: string;
  assigneeId?: string;
  assigneeName: string;
  assigneeAvatar?: string;
  commentsCount: number;
  isOverdue: boolean;
  notes?: string;
  attachments?: TaskAttachment[];
}

export interface SystemNotification {
  id: string;
  type: 'warning' | 'update' | 'success';
  title: string;
  content: string;
  time: string;
  tagName: string;
  tagType: 'Urgent' | 'Info' | 'None';
  isRead: boolean;
}

export interface Activity {
  id: string;
  type: 'log' | 'task';
  title: string;
  location: string;
  timeText: string;
  statusText: string;
  statusType: 'error' | 'pending' | 'success';
}

export interface RecentActivity {
  id: string;
  activityType: number;
  activityTypeLabel: string;
  entityId: string;
  entityCode: string;
  description: string;
  occurredAt: string;
}

export interface ShiftDto {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  endDayOffset?: number;
  paidWorkingHours?: number;
  workingHours?: number;
  isExtraShift: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateShiftRequest {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  endDayOffset: 0 | 1;
  paidWorkingHours: number;
  isExtraShift?: boolean;
}

export interface WorkScheduleDto {
  id: number;
  workDate: string;
  userId: string;
  userName?: string;
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  endDayOffset?: number;
  paidWorkingHours?: number;
  workingHours?: number;
  status: number;
  statusName: string;
  note?: string | null;
}

export interface WorkScheduleWeekDayDto {
  date: string;
  dayOfWeek: number;
  dayName: string;
}

export interface WorkScheduleWeekUserDto {
  userId: string;
  userName: string;
  departmentName?: string | null;
  avatarUrl?: string | null;
  totalWorkingHours: number;
  schedules: WorkScheduleDto[];
}

export interface WorkScheduleWeekResponse {
  startDate: string;
  endDate: string;
  totalWorkingHours: number;
  days: WorkScheduleWeekDayDto[];
  users: WorkScheduleWeekUserDto[];
}

export interface MonthlyWorkScheduleShiftBreakdown {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  scheduleCount: number;
  totalHours: number;
}

export interface MonthlyWorkScheduleStats {
  userId: string;
  userFullName: string;
  year: number;
  month: number;
  totalSchedules: number;
  completedSchedules: number;
  absentSchedules: number;
  cancelledSchedules: number;
  totalPlannedHours: number;
  totalWorkedHours: number;
  totalAbsentHours: number;
  shiftBreakdowns: MonthlyWorkScheduleShiftBreakdown[];
}

export type OvertimeStatus = 1 | 2 | 3 | 4;

export interface OvertimeRequestDto {
  id: number;
  userId: string;
  userFullName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  reason: string;
  status: OvertimeStatus;
  statusName: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
}

export interface CreateOvertimeRequest {
  userId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface OvertimeMonthlyReportRow {
  userId: string;
  userFullName: string;
  workDate: string;
  shiftTime: string;
  monthlyWorkingHours: number;
  approvedOvertimeHours: number;
}

export interface CalendarDayDto {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isWeekendRule: boolean;
  isValid: boolean;
  requiredShifts: string[];
  requiredExtraShiftGroups: string[][];
  assignedShifts: string[];
  missingShifts: string[];
  missingExtraShiftGroups: string[][];
  schedules: WorkScheduleDto[];
}

export interface CalendarResponseDto {
  fromDate: string;
  toDate: string;
  days: CalendarDayDto[];
}

export interface CreateWorkScheduleRequest {
  workDate: string;
  userId: string;
  shiftId: number;
  note?: string | null;
}

export interface BulkCreateWorkScheduleRequest {
  items: CreateWorkScheduleRequest[];
}

export interface BulkAssignWorkScheduleRequest {
  workDate: string;
  shiftId: number;
  userIds: string[];
  note?: string | null;
  skipInvalidUsers?: boolean;
}

export interface CopyWeekWorkScheduleRequest {
  sourceDate: string;
  targetDate: string;
  overwriteExisting: boolean;
  userIds: string[];
  storeId?: string | number | null;
  departmentId?: string | number | null;
}

export interface UpdateWorkScheduleRequest {
  workDate: string;
  userId: string;
  shiftId: number;
  status?: number;
  note?: string | null;
}

export interface ChangeShiftRequest {
  shiftId: number;
  note?: string | null;
}

export interface ChangeUserRequest {
  userId: string;
  note?: string | null;
}

export interface UpdateWorkScheduleStatusRequest {
  status: number;
  note?: string | null;
}

export type TabType =
  | 'overview'
  | 'error_logs'
  | 'transaction_error_queue'
  | 'tasks'
  | 'recent_activities'
  | 'chat'
  | 'users'
  | 'roles'
  | 'booths'
  | 'remote_booth'
  | 'shifts'
  | 'notifications'
  | 'schedule'
  | 'overtime_approval'
  | 'settings';
