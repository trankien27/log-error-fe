export type ErrorGroup = 1 | 2 | 3;
export type ProcessingFlow = 1 | 2 | 3;
export type ErrorLogStatus = 1 | 2 | 3;
export type Severity = 1 | 2 | 3;

export interface ErrorLogAttachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  telegramFilePath: string;
  downloadUrl: string;
  storageProvider?: string;
  createdTime: string;
}

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
  attachments: ErrorLogAttachment[];
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
  role: 'Admin' | 'ITSupport' | 'IT Support' | 'ITSupportManager' | 'Manager' | 1 | 2 | 3;
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

export interface Store {
  id: number;
  name: string;
  lastSyncedAt: string;
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
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  type: string;
  createdAt?: string;
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
  notificationId?: string;
  type: 'warning' | 'update' | 'success';
  category?: string;
  title: string;
  content: string;
  time: string;
  tagName: string;
  tagType: 'Urgent' | 'Info' | 'None';
  isRead: boolean;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
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
  shiftType?: number;
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
  shiftType?: number;
}

export type ListDictionaryFieldType = 1 | 2 | 3 | 4 | 5 | 6;

export interface ListDictionaryFieldDto {
  id: number;
  code: string;
  name: string;
  dataType: ListDictionaryFieldType;
  isRequired: boolean;
  sortOrder: number;
  options: string[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface ListDictionaryDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isVisibleInSidebar: boolean;
  itemCount: number;
  fields: ListDictionaryFieldDto[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface ListDictionaryItemDto {
  id: number;
  code: string;
  values: Record<string, string | number | boolean | null>;
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface CreateListDictionaryRequest {
  code: string;
  name: string;
  description?: string;
  fields: Array<{
    code: string;
    name: string;
    dataType: ListDictionaryFieldType;
    isRequired: boolean;
    options: string[];
  }>;
}

export interface SaveListDictionaryItemRequest {
  values: Record<string, string | number | boolean>;
}

export interface UpdateListDictionarySidebarRequest {
  visibleDictionaryCodes: string[];
}

export interface RenameListDictionaryRequest {
  name: string;
}

export interface ImportListDictionaryRequest extends CreateListDictionaryRequest {
  isVisibleInSidebar: boolean;
  items: Array<Record<string, string | number | boolean>>;
}

export interface ListDictionarySidebarDto {
  id: number;
  code: string;
  name: string;
}

export type KnowledgeDocumentVisibility = 1 | 2;
export type KnowledgeDocumentEditAccess = 1 | 2 | 3;

export interface KnowledgeDocumentSummaryDto {
  id: number;
  title: string;
  preview: string;
  visibility: KnowledgeDocumentVisibility;
  editAccess: KnowledgeDocumentEditAccess;
  canEdit: boolean;
  canManageAccess: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface KnowledgeDocumentDto {
  id: number;
  title: string;
  contentMarkdown: string;
  visibility: KnowledgeDocumentVisibility;
  editAccess: KnowledgeDocumentEditAccess;
  canEdit: boolean;
  canManageAccess: boolean;
  editorIds: string[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface SaveKnowledgeDocumentRequest {
  title: string;
  contentMarkdown: string;
  visibility: KnowledgeDocumentVisibility;
  editAccess: KnowledgeDocumentEditAccess;
  editorIds: string[];
}

export interface KnowledgeDocumentImageDto {
  id: number;
  documentId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  /** null khi ảnh nằm trên R2 — dùng `url` khi đó. */
  base64Data: string | null;
  /** URL tải ảnh khi ảnh nằm trên R2; null khi ảnh lưu inline base64. */
  url: string | null;
  /** Tên enum `FileStorageProvider` phía backend ("R2" | "InlineBase64"), không phải số. */
  storageProvider: string;
  position: number;
  createdAt: string;
}

export interface KnowledgeDocumentImageSummaryDto {
  id: number;
  documentId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  url: string | null;
  storageProvider: string;
  position: number;
  createdAt: string;
}

export interface WorkScheduleDto {
  id: number;
  workDate: string;
  userId: string;
  userName?: string;
  shiftId?: number | null;
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
  shiftId?: number | null;
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
  shiftId?: number | null;
  shiftCode?: string | null;
  shiftName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  endDayOffset?: number;
  paidWorkingHours?: number;
  workingHours?: number;
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
  shiftId?: number | null;
  shiftCode?: string | null;
  shiftName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  endDayOffset?: number;
  paidWorkingHours?: number;
  workingHours?: number;
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

export interface MonthlyUnwantedShiftRuleRequest {
  shiftId: number;
  weekdays: number[];
  dates: string[];
}

export interface MonthlyEmployeeRuleRequest {
  userId: string;
  unavailableWeekdays: number[];
  unavailableDates: string[];
  unwantedShiftRules: MonthlyUnwantedShiftRuleRequest[];
}

export interface MonthlySuggestionPreviewRequest {
  year: number;
  month: number;
  userIds: string[];
  shiftIds: number[];
  monthlyOffDays: number;
  monthlyTargetHours?: number | null;
  overwriteExisting: boolean;
  allowFlexibleShifts: boolean;
  employeeRules: MonthlyEmployeeRuleRequest[];
}

export interface MonthlySuggestionDay {
  date: string;
  shiftId?: number | null;
  shiftCode?: string | null;
  shiftName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  totalHours: number;
  isOff: boolean;
  isExisting: boolean;
  isGenerated: boolean;
  isTemporaryShift: boolean;
  warnings: string[];
}

export interface MonthlySuggestionUser {
  userId: string;
  userName: string;
  days: MonthlySuggestionDay[];
  summary: {
    workingDays: number;
    offDays: number;
    totalHours: number;
    warningCount: number;
  };
  warnings: string[];
}

export interface MonthlySuggestionPreviewResponse {
  year: number;
  month: number;
  monthlyOffDays: number;
  monthlyTargetHours?: number | null;
  users: MonthlySuggestionUser[];
  warnings: string[];
}

export interface MonthlySuggestionApplyRequest {
  year: number;
  month: number;
  monthlyOffDays?: number | null;
  monthlyTargetHours?: number | null;
  overwriteExisting: boolean;
  items: Array<{
    userId: string;
    workDate: string;
    shiftId?: number | null;
    shiftCode?: string | null;
    shiftName?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    endDayOffset?: number;
    totalHours?: number;
    isTemporaryShift?: boolean;
  }>;
}

export interface MonthlySuggestionApplyResponse {
  created: number;
  deletedExisting: number;
  items: WorkScheduleDto[];
  warnings: string[];
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
  | 'stores'
  | 'booths'
  | 'remote_booth'
  | 'print_image'
  | 'recreate_image'
  | 'shifts'
  | 'list_dictionaries'
  | 'documents'
  | 'notifications'
  | 'schedule'
  | 'overtime_approval'
  | 'r2_usage'
  | 'settings';
