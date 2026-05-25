import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Users,
  Bell,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  Check,
  Send,
  Paperclip,
  FileText,
  X
} from 'lucide-react';
import {
  INITIAL_ERROR_LOGS,
  INITIAL_USERS,
  INITIAL_ROLES,
  INITIAL_BOOTHS,
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITIES
} from './initialData';
import { ErrorLog, User, Role, Booth, Task, SystemNotification, TabType, TaskAttachment } from './types';

// Tab components separated cleanly
import OverviewTab from './components/OverviewTab';
import ErrorLogsTab from './components/ErrorLogsTab';
import TasksTab from './components/TasksTab';
import UsersTab from './components/UsersTab';
import RolesTab from './components/RolesTab';
import BoothsTab from './components/BoothsTab';
import NotificationsTab from './components/NotificationsTab';
import ScheduleTab from './components/ScheduleTab';
import SettingsTab from './components/SettingsTab';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';

export default function App() {
  // Password / OTP Security states
  const [settingsStage, setSettingsStage] = useState<'password' | 'otp' | 'success'>('password');
  const [settingsPasswordCurrent, setSettingsPasswordCurrent] = useState('');
  const [settingsPasswordNew, setSettingsPasswordNew] = useState('');
  const [settingsPasswordConfirm, setSettingsPasswordConfirm] = useState('');
  const [settingsOTPValues, setSettingsOTPValues] = useState<string[]>(['', '', '', '', '', '']);
  const [settingsOTPTimer, setSettingsOTPTimer] = useState(59);

  // Active profile user (Người dùng > Hồ sơ chi tiết)
  const [selectedUserProfileUser, setSelectedUserProfileUser] = useState<User | null>(null);

  // Schedule Shift states
  const [shifts, setShifts] = useState<any[]>([
    {
      id: 'SFT-001',
      dayOfWeek: 'T2',
      shiftType: 'morning',
      userName: 'Trần Văn Nam',
      userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCf19wuTp7sv6x9pADPruTII3g4UFBNu_m17cE7ZShyK5gMM7wx5BRgQxa_JX_QigzNPtZ0Hsvanp0yPYNQrJYLHjyhSNdlbMxZMMB7fDcZzOfZUOBQPkFkr-C-3KkXGAIk94Ff4GaLV6hU5nGzC5XKj16Cj3C-Pzscz6_DEnDMQuBMtGWBPfmeKB4yZF2aK0xshp2wSitcu2Tr0xQuk6tvQrdaEeW347dLPZBhzq4N2z3oClFluj1ONP9T5sjYirKxp84SzbKM2SM',
      status: 'scheduled'
    },
    {
      id: 'SFT-002',
      dayOfWeek: 'T2',
      shiftType: 'morning',
      userName: 'Lê Hoàng Bách',
      userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKBCqL7m8zbjvWQvLyo8Vq8aa2tj2gmUHKNQBgYITpfs9Ip8PNqta59i57WH3NBOeH0FtLHBJgzY_RHJmY8zTb3y9IJo0agzhNRHAxbdriSIyCEXjBFd0AmypgnFEC7MGGxezRQM-ZfPwJAJVNp5bZWKhuNy0zv4DaJ3e2IMDDC6Q6wotVcgCk5lM3Ec9mcaGH4-d8-Pi2SYXXexNNZIYlbTAle6UL0ThIDu2TrTKbJ4OUO7QG2hz1KLSO5j708n8-GTsfdXak3LU',
      status: 'scheduled'
    },
    {
      id: 'SFT-003',
      dayOfWeek: 'T2',
      shiftType: 'afternoon',
      userName: 'Nguyễn Văn A',
      userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC703_rsdHDf1TAbvoC45iFKVX4rcr3oh8immWJwqXOeRrFTHcLvjwbCBiOIm0ZtI9RTmsyih80Ow8IElEpdtzXZTuHwz8AuyIvUxbMm8_OezAoHT7jODhsg1tWGlG_1IOO9jn60IrzMWV8ntE7ASPHI06e08mJ6zQfpbbL7UyznoqJGsWbdLXbGO-qu5JIfJZby5C-r09jDddC0Na9d-RelWmO03qBS7IfCOFCh_ewaHJw_dcUwhwqaSru4KGPLD_sWIHTuKJROUY',
      status: 'on_duty'
    },
    {
      id: 'SFT-004',
      dayOfWeek: 'T2',
      shiftType: 'evening',
      userName: 'Nguyễn Thị Mai',
      userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0ZTvgebGJmFrSzydrtfDNfXBHVWh7w1RLXUEvuCrFNjfzsb1u6nrgxxTsynOXg17slJ5h6oT-ZSLquSa9dVvn8SOS9qiEkMu4aB-WGsGTuW_FOqPgld30zRq8kMuXkiKntXv33r0jemWx_am7rc5bmg5L5prdd0GAVO9PopF75axxsXIw4KdaRBiCy0SQojPP5P3kGWVbPYmwm59epAMcavpSoKSqPX6FO468VSl9IMIzx7Hg2QVf3TwPhmG6MhpRcl_E_14hTHA',
      status: 'confirmed'
    },
    {
      id: 'SFT-005',
      dayOfWeek: 'T2',
      shiftType: 'evening',
      userName: 'Nguyễn Văn A',
      userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC703_rsdHDf1TAbvoC45iFKVX4rcr3oh8immWJwqXOeRrFTHcLvjwbCBiOIm0ZtI9RTmsyih80Ow8IElEpdtzXZTuHwz8AuyIvUxbMm8_OezAoHT7jODhsg1tWGlG_1IOO9jn60IrzMWV8ntE7ASPHI06e08mJ6zQfpbbL7UyznoqJGsWbdLXbGO-qu5JIfJZby5C-r09jDddC0Na9d-RelWmO03qBS7IfCOFCh_ewaHJw_dcUwhwqaSru4KGPLD_sWIHTuKJROUY',
      status: 'confirmed'
    },
    {
      id: 'SFT-006',
      dayOfWeek: 'T3',
      shiftType: 'morning',
      userName: 'Đặng Quốc Huy',
      userAvatar: undefined,
      status: 'scheduled'
    },
    {
      id: 'SFT-007',
      dayOfWeek: 'T3',
      shiftType: 'afternoon',
      userName: 'Phạm Hương',
      userAvatar: undefined,
      status: 'scheduled'
    },
    {
      id: 'SFT-008',
      dayOfWeek: 'T3',
      shiftType: 'evening',
      userName: '',
      userAvatar: undefined,
      status: 'empty'
    }
  ]);

  const [scheduleTeamMode, setScheduleTeamMode] = useState<'team' | 'my'>('team');
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [scheduleRoleFilter, setScheduleRoleFilter] = useState('Tất cả vai trò');
  const [isCreateShiftModalOpen, setIsCreateShiftModalOpen] = useState(false);
  const [newShiftDay, setNewShiftDay] = useState<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'>('T2');
  const [newShiftType, setNewShiftType] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [newShiftStaffName, setNewShiftStaffName] = useState('Nguyễn Văn A');
  const [newShiftStatus, setNewShiftStatus] = useState<'scheduled' | 'on_duty' | 'confirmed' | 'empty'>('scheduled');

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(INITIAL_ERROR_LOGS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [booths, setBooths] = useState<Booth[]>(INITIAL_BOOTHS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);

  // Drag and Drop States for Kanban
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'pending' | 'progress' | 'done' | null>(null);

  // Filter States
  const [logStoreFilter, setLogStoreFilter] = useState('');
  const [logBoothFilter, setLogBoothFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Modals & Forms States
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [currentEditingLog, setCurrentEditingLog] = useState<ErrorLog | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentEditingUser, setCurrentEditingUser] = useState<User | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [currentEditingTask, setCurrentEditingTask] = useState<Task | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [currentEditingRole, setCurrentEditingRole] = useState<Role | null>(null);

  const [isBoothModalOpen, setIsBoothModalOpen] = useState(false);
  const [currentEditingBooth, setCurrentEditingBooth] = useState<Booth | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);
  const [isQuickNotifModalOpen, setIsQuickNotifModalOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [taskNotesInput, setTaskNotesInput] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const quickNotifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickNotifRef.current && !quickNotifRef.current.contains(event.target as Node)) {
        setIsQuickNotifModalOpen(false);
      }
    }
    if (isQuickNotifModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuickNotifModalOpen]);

  useEffect(() => {
    let interval: any = null;
    if (activeTab === 'settings' && settingsStage === 'otp' && settingsOTPTimer > 0) {
      interval = setInterval(() => {
        setSettingsOTPTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTab, settingsStage, settingsOTPTimer]);

  // Form Field States
  // 1. Log Form
  const [logTitle, setLogTitle] = useState('');
  const [logReporter, setLogReporter] = useState('');
  const [logStore, setLogStore] = useState('');
  const [logBooth, setLogBooth] = useState('');
  const [logStatus, setLogStatus] = useState<'Mới' | 'Đang xử lý' | 'Đã đóng'>('Mới');
  const [logSeverity, setLogSeverity] = useState<'Lỗi nghiêm trọng' | 'Bình thường' | 'Cảnh báo'>('Cảnh báo');

  // 2. User Form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'Admin' | 'Manager' | 'IT Support' | 'Staff'>('Staff');
  const [userStatus, setUserStatus] = useState<'Hoạt động' | 'Vô hiệu hóa'>('Hoạt động');

  // Profile Detail Form states
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileRole, setProfileRole] = useState<'Admin' | 'Manager' | 'IT Support' | 'Staff'>('IT Support');
  const [profileDept, setProfileDept] = useState('');

  useEffect(() => {
    if (selectedUserProfileUser) {
      setProfileName(selectedUserProfileUser.name);
      setProfilePhone(selectedUserProfileUser.phone || '+84 987 654 321');
      setProfileRole(selectedUserProfileUser.role);
      setProfileDept(selectedUserProfileUser.department || 'IT Operations');
    }
  }, [selectedUserProfileUser]);

  // 3. Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatusField, setTaskStatusField] = useState<'pending' | 'progress' | 'done'>('pending');
  const [taskDue, setTaskDue] = useState('Hôm nay');
  const [taskAssignee, setTaskAssignee] = useState('Nguyễn Văn A');
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [isDetailDragging, setIsDetailDragging] = useState(false);
  const [isFormDragging, setIsFormDragging] = useState(false);

  // 4. Role Form
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleSecurity, setRoleSecurity] = useState<'Cao' | 'Trung bình' | 'Thấp'>('Thấp');

  // 5. Booth Form
  const [boothIdField, setBoothIdField] = useState('');
  const [boothNameField, setBoothNameField] = useState('');
  const [boothUltraviewField, setBoothUltraviewField] = useState('');
  const [boothStoresField, setBoothStoresField] = useState('');

  // 6. Alert Notification Form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifClass, setNotifClass] = useState<'warning' | 'update' | 'success'>('warning');
  const [notifTag, setNotifTag] = useState('IT Admin');
  const [notifAllUsers, setNotifAllUsers] = useState(true);
  const [notifSelectedUsers, setNotifSelectedUsers] = useState<string[]>([]);

  // Helper trigger Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Clipboard Copier
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`Đã sao chép UltraView ID: ${text}`);
  };

  // Calculations for dashboard
  const totalLogs = errorLogs.length;
  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'progress').length;
  const completedTasksCount = tasks.filter(t => t.status === 'done').length;
  const overdueTasksCount = tasks.filter(t => t.isOverdue).length;
  const totalUsers = users.length;
  const totalBooths = booths.length;

  // 1. Error Log Handlers
  const handleOpenLogModal = (log: ErrorLog | null = null) => {
    if (log) {
      setCurrentEditingLog(log);
      setLogTitle(log.title);
      setLogReporter(log.reporter);
      setLogStore(log.store);
      setLogBooth(log.booth);
      setLogStatus(log.status);
      setLogSeverity(log.severity);
    } else {
      setCurrentEditingLog(null);
      setLogTitle('');
      setLogReporter('');
      setLogStore('CH Quận 1');
      setLogBooth('Quầy Thu Ngân 1');
      setLogStatus('Mới');
      setLogSeverity('Cảnh báo');
    }
    setIsLogModalOpen(true);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim() || !logReporter.trim()) {
      triggerToast('Vui lòng điền đủ tên lỗi và người báo.');
      return;
    }

    if (currentEditingLog) {
      setErrorLogs(prev =>
        prev.map(l =>
          l.id === currentEditingLog.id
            ? {
                ...l,
                title: logTitle,
                reporter: logReporter,
                store: logStore,
                booth: logBooth,
                status: logStatus,
                severity: logSeverity,
              }
            : l
        )
      );
      triggerToast(`Đã cập nhật lỗi ${currentEditingLog.id}`);
    } else {
      const nextId = `ERR-2023-0${errorLogs.length + 1}`;
      const newLog: ErrorLog = {
        id: nextId,
        title: logTitle,
        reporter: logReporter,
        reportTime: new Date().toLocaleString('vi-VN'),
        store: logStore,
        booth: logBooth,
        attachment: Math.random() > 0.5,
        status: logStatus,
        severity: logSeverity,
      };
      setErrorLogs([newLog, ...errorLogs]);
      triggerToast(`Đã thêm mới lỗi ${nextId}`);
    }
    setIsLogModalOpen(false);
  };

  const handleDeleteLog = (id: string) => {
    if (confirm(`Bạn chắc chắn muốn xóa log lỗi này không? ID: ${id}`)) {
      setErrorLogs(prev => prev.filter(l => l.id !== id));
      triggerToast(`Đã xóa log lỗi ${id}`);
    }
  };

  // 2. User Handlers
  const handleOpenUserModal = (u: User | null = null) => {
    if (u) {
      setCurrentEditingUser(u);
      setUserName(u.name);
      setUserEmail(u.email);
      setUserRole(u.role);
      setUserStatus(u.status);
    } else {
      setCurrentEditingUser(null);
      setUserName('');
      setUserEmail('');
      setUserRole('Staff');
      setUserStatus('Hoạt động');
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      triggerToast('Vui lòng điền đủ tên và địa chỉ email.');
      return;
    }

    if (currentEditingUser) {
      setUsers(prev =>
        prev.map(u =>
          u.id === currentEditingUser.id
            ? { ...u, name: userName, email: userEmail, role: userRole, status: userStatus }
            : u
        )
      );
      triggerToast(`Đã cập nhật thành viên ${currentEditingUser.id}`);
    } else {
      const nextId = `USR-0${users.length + 12}`;
      const newUser: User = {
        id: nextId,
        name: userName,
        email: userEmail,
        role: userRole,
        status: userStatus,
      };
      setUsers([...users, newUser]);
      triggerToast(`Đã thêm thành viên ${nextId}`);
    }
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm(`Bạn chắc chắn muốn loại bỏ người dùng này không? ID: ${id}`)) {
      setUsers(prev => prev.filter(u => u.id !== id));
      triggerToast(`Đã xóa thành viên ${id}`);
    }
  };

  // 3. Task Handlers
  const handleOpenTaskModal = (t: Task | null = null) => {
    if (t) {
      setCurrentEditingTask(t);
      setTaskTitle(t.title);
      setTaskStatusField(t.status);
      setTaskDue(t.dueText);
      setTaskAssignee(t.assigneeName);
      setTaskAttachments(t.attachments || []);
    } else {
      setCurrentEditingTask(null);
      setTaskTitle('');
      setTaskStatusField('pending');
      setTaskDue('Hôm nay');
      setTaskAssignee('Trần Văn Nam');
      setTaskAttachments([]);
    }
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      triggerToast('Vui lòng điền tiêu đề công việc.');
      return;
    }

    if (currentEditingTask) {
      setTasks(prev =>
        prev.map(t =>
          t.id === currentEditingTask.id
            ? {
                ...t,
                title: taskTitle,
                status: taskStatusField,
                dueText: taskDue,
                assigneeName: taskAssignee,
                isOverdue: taskDue.includes('Hôm qua'),
                attachments: taskAttachments,
              }
            : t
        )
      );
      triggerToast(`Đã cập nhật công việc ${currentEditingTask.id}`);
    } else {
      const nextId = `IT-10${tasks.length + 43}`;
      const newTask: Task = {
        id: nextId,
        title: taskTitle,
        status: taskStatusField,
        dueText: taskDue,
        assigneeName: taskAssignee,
        commentsCount: 0,
        isOverdue: taskDue.includes('Hôm qua'),
        assigneeAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOuRg0-tkfASYWUBN5aUWfZc6iS1pybXdH43ZywRcOn3XNo-CCAeA50DluBLbgtgeofaPyVBz75GCxHhvnPSt9N_Bo7IPnH9hr68tSRvh1g5uygrL7M-bj-BSxUi15r0YN07rNjpvX5TOmss4w4Vix2ThDL_iIFBVCSyNo-xqqYyrj0f-vaSBEojSmEGSIYnzzkUHgEq0iCHW9ifHEzzjlptvyXvDrZBFDU9GWWtTvIAXn-lldKx61NHt4W6xFMVyBmeu2TeypMc8',
        attachments: taskAttachments,
      };
      setTasks([...tasks, newTask]);
      triggerToast(`Đã thêm công việc ${nextId}`);
    }
    setIsTaskModalOpen(false);
  };

  const handleUpdateTaskNotes = (id: string, notes: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notes } : t));
    setSelectedTaskDetails(prev => prev && prev.id === id ? { ...prev, notes } : prev);
    triggerToast(`Đã lưu ghi chú cho công việc ${id}`);
  };

  const handleAddAttachment = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: TaskAttachment[] = Array.from(fileList).map(file => ({
      name: file.name,
      size: (file.size / 1024 > 1024) 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`,
      type: file.type,
      url: URL.createObjectURL(file)
    }));
    
    if (selectedTaskDetails) {
      const updatedAttachments = [...(selectedTaskDetails.attachments || []), ...newFiles];
      setTasks(prev => prev.map(t => t.id === selectedTaskDetails.id ? { ...t, attachments: updatedAttachments } : t));
      setSelectedTaskDetails(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
      triggerToast(`Đã đính kèm ${newFiles.length} tài liệu vào tác vụ ${selectedTaskDetails.id}`);
    }
  };

  const handleDeleteAttachment = (fileName: string) => {
    if (selectedTaskDetails) {
      const updated = (selectedTaskDetails.attachments || []).filter(item => item.name !== fileName);
      setTasks(prev => prev.map(t => t.id === selectedTaskDetails.id ? { ...t, attachments: updated } : t));
      setSelectedTaskDetails(prev => prev ? { ...prev, attachments: updated } : null);
      triggerToast(`Đã gỡ bỏ đính kèm ${fileName}`);
    }
  };

  const handleAddFormAttachment = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: TaskAttachment[] = Array.from(fileList).map(file => ({
      name: file.name,
      size: (file.size / 1024 > 1024) 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`,
      type: file.type,
      url: URL.createObjectURL(file)
    }));
    setTaskAttachments(prev => [...prev, ...newFiles]);
    triggerToast(`Đã chuẩn bị đính kèm ${newFiles.length} tài liệu`);
  };

  const handleDeleteFormAttachment = (fileName: string) => {
    setTaskAttachments(prev => prev.filter(item => item.name !== fileName));
    triggerToast(`Đã gỡ bỏ ${fileName}`);
  };

  const moveTaskStatus = (id: string, newStat: 'pending' | 'progress' | 'done') => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: newStat } : t)));
    triggerToast(`Đã chuyển công việc sang cột: ${newStat === 'pending' ? 'Chờ xử lý' : newStat === 'progress' ? 'Đang thực hiện' : 'Hoàn thành'}`);
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, column: 'pending' | 'progress' | 'done') => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, column: 'pending' | 'progress' | 'done') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (id) {
      moveTaskStatus(id, column);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // 4. Role Handlers
  const handleOpenRoleModal = (r: Role | null = null) => {
    if (r) {
      setCurrentEditingRole(r);
      setRoleName(r.name);
      setRoleDesc(r.description);
      setRoleSecurity(r.securityLevel);
    } else {
      setCurrentEditingRole(null);
      setRoleName('');
      setRoleDesc('');
      setRoleSecurity('Thấp');
    }
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || !roleDesc.trim()) {
      triggerToast('Vui lòng điền đủ tên vai trò và mô tả.');
      return;
    }

    if (currentEditingRole) {
      setRoles(prev =>
        prev.map(r =>
          r.name === currentEditingRole.name
            ? { ...r, name: roleName, description: roleDesc, securityLevel: roleSecurity }
            : r
        )
      );
      triggerToast(`Đã sửa đổi vai trò ${roleName}`);
    } else {
      const newRole: Role = {
        name: roleName,
        userCount: 0,
        description: roleDesc,
        securityLevel: roleSecurity,
      };
      setRoles([...roles, newRole]);
      triggerToast(`Đã thêm vai trò mới: ${roleName}`);
    }
    setIsRoleModalOpen(false);
  };

  // 5. Booth Handlers
  const handleOpenBoothModal = (b: Booth | null = null) => {
    if (b) {
      setCurrentEditingBooth(b);
      setBoothIdField(b.id);
      setBoothNameField(b.name);
      setBoothUltraviewField(b.ultraviewId);
      setBoothStoresField(b.relatedStores);
    } else {
      setCurrentEditingBooth(null);
      setBoothIdField(`BTH-00${booths.length + 1}`);
      setBoothNameField('');
      setBoothUltraviewField('');
      setBoothStoresField('CH Quận 1');
    }
    setIsBoothModalOpen(true);
  };

  const handleSaveBooth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boothNameField.trim() || !boothUltraviewField.trim()) {
      triggerToast('Vui lòng điền đủ Tên Booth và ID Ultraview.');
      return;
    }

    if (currentEditingBooth) {
      setBooths(prev =>
        prev.map(b =>
          b.id === currentEditingBooth.id
            ? { ...b, name: boothNameField, ultraviewId: boothUltraviewField, relatedStores: boothStoresField }
            : b
        )
      );
      triggerToast(`Đã cập nhật trạm ${currentEditingBooth.id}`);
    } else {
      const newBooth: Booth = {
        id: boothIdField,
        name: boothNameField,
        ultraviewId: boothUltraviewField,
        relatedStores: boothStoresField,
      };
      setBooths([...booths, newBooth]);
      triggerToast(`Đã khởi tạo trạm hỗ trợ ${boothIdField}`);
    }
    setIsBoothModalOpen(false);
  };

  const handleDeleteBooth = (id: string) => {
    if (confirm(`Bạn chắc chắn muốn loại bỏ trạm/booth hỗ trợ này? ID: ${id}`)) {
      setBooths(prev => prev.filter(b => b.id !== id));
      triggerToast(`Đã xóa booth ${id}`);
    }
  };

  // 6. Send Alert Notifications Handler
  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifContent.trim()) {
      triggerToast('Vui lòng nhập tối thiểu Tiêu đề và Nội dung thông báo.');
      return;
    }

    if (!notifAllUsers && notifSelectedUsers.length === 0) {
      triggerToast('Vui lòng chọn ít nhất một người nhận hoặc chọn Thông báo toàn thể.');
      return;
    }

    const nextId = `NOT-00${notifications.length + 1}`;
    const audience = notifAllUsers ? 'Toàn thể user' : notifSelectedUsers.join(', ');
    const newNotif: SystemNotification = {
      id: nextId,
      type: notifClass,
      title: notifTitle,
      content: notifContent,
      time: 'Vừa xong',
      tagName: audience,
      tagType: notifClass === 'warning' ? 'Urgent' : 'Info',
      isRead: false,
    };
    setNotifications([newNotif, ...notifications]);
    triggerToast(`Đã gửi thông báo đến: ${audience}`);
    setIsNotificationModalOpen(false);
    setNotifTitle('');
    setNotifContent('');
    setNotifAllUsers(true);
    setNotifSelectedUsers([]);
  };

  const toggleNotifReadState = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  // Filters application
  const filteredLogs = errorLogs.filter(log => {
    const sQuery = searchQuery.toLowerCase();
    const titleMatch = log.title.toLowerCase().includes(sQuery) || log.id.toLowerCase().includes(sQuery) || log.reporter.toLowerCase().includes(sQuery);
    const storeMatch = logStoreFilter ? log.store === logStoreFilter : true;
    const boothMatch = logBoothFilter ? log.booth === logBoothFilter : true;
    return titleMatch && storeMatch && boothMatch;
  });

  const filteredUsers = users.filter(user => {
    const sQuery = searchQuery.toLowerCase();
    const infoMatch = user.name.toLowerCase().includes(sQuery) || user.email.toLowerCase().includes(sQuery) || user.id.toLowerCase().includes(sQuery);
    const roleMatch = userRoleFilter ? user.role === userRoleFilter : true;
    return infoMatch && roleMatch;
  });

  const filteredBooths = booths.filter(b => {
    const sQuery = searchQuery.toLowerCase();
    return b.name.toLowerCase().includes(sQuery) || b.id.toLowerCase().includes(sQuery) || b.ultraviewId.includes(sQuery);
  });

  const processedRecentActivities = INITIAL_ACTIVITIES;

  return (
    <div className="bg-[#faf8ff] text-[#191b23] min-h-screen flex font-sans antialiased">
      {/* Toast Warning */}
      {toastMessage && (
        <div id="toast" className="fixed bottom-5 right-5 z-50 bg-[#191b23] text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 border border-outline-variant transition-all duration-300 transform translate-y-0">
          <Sparkles className="text-yellow-400 w-5 h-5 animate-pulse" />
          <span className="font-medium text-xs md:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Overlay Modals */}

      {/* Modal 1: Log lỗi */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingLog ? `Chỉnh sửa Log lỗi [${currentEditingLog.id}]` : 'Khai báo lỗi hệ thống mới'}
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">&#x2715;</button>
            </div>
            <form onSubmit={handleSaveLog} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Mô tả sự cố / Tên lỗi *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lỗi kết nối máy in bill"
                  value={logTitle}
                  onChange={e => setLogTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Người báo cáo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={logReporter}
                    onChange={e => setLogReporter(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Độ nghiêm trọng</label>
                  <select
                    value={logSeverity}
                    onChange={e => setLogSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Lỗi nghiêm trọng">Lỗi nghiêm trọng (Critical)</option>
                    <option value="Cảnh báo">Cảnh báo (Warning)</option>
                    <option value="Bình thường">Bình thường (Normal)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Cửa hàng xảy ra</label>
                  <select
                    value={logStore}
                    onChange={e => setLogStore(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="CH Quận 1">CH Quận 1</option>
                    <option value="CH Quận 3">CH Quận 3</option>
                    <option value="CH Gò Vấp">CH Gò Vấp</option>
                    <option value="CH Quận 10">CH Quận 10</option>
                    <option value="Kho Tổng Bình Dương">Kho Tổng Bình Dương</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Trạm Booth hỗ trợ</label>
                  <select
                    value={logBooth}
                    onChange={e => setLogBooth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Quầy Thu Ngân 1">Quầy Thu Ngân 1</option>
                    <option value="Quầy Thu Ngân 2">Quầy Thu Ngân 2</option>
                    <option value="Kiosk Tự Phục Vụ">Kiosk Tự Phục Vụ</option>
                    <option value="Kho hàng">Kho hàng</option>
                    <option value="Phòng kỹ thuật">Phòng kỹ thuật</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Trạng thái xử lý</label>
                <div className="flex gap-4">
                  {(['Mới', 'Đang xử lý', 'Đã đóng'] as const).map(st => (
                    <label key={st} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="logStatusGroup"
                        checked={logStatus === st}
                        onChange={() => setLogStatus(st)}
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Người dùng */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingUser ? 'Cập nhật thành viên' : 'Đăng ký thành viên mới'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">&#x2715;</button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Thị Mai"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Địa chỉ Email doanh nghiệp *</label>
                <input
                  type="email"
                  required
                  placeholder="mai.nguyen@company.vn"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Vai trò quyền hạn</label>
                  <select
                    value={userRole}
                    onChange={e => setUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="IT Support">IT Support</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Trạng thái tài khoản</label>
                  <select
                    value={userStatus}
                    onChange={e => setUserStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Vô hiệu hóa">Vô hiệu hóa</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Vai trò */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingRole ? 'Thay đổi thông tin Vai trò' : 'Phát triển nhóm Vai trò hệ thống'}
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">&#x2715;</button>
            </div>
            <form onSubmit={handleSaveRole} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Tên nhóm vai trò *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Devops, Security officer"
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  disabled={!!currentEditingRole}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mô tả tác vụ & phân quyền *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Quy định quyền truy cập bảng thông tin..."
                  value={roleDesc}
                  onChange={e => setRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mức bảo mật / Độ tin cậy</label>
                <select
                  value={roleSecurity}
                  onChange={e => setRoleSecurity(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="Thấp">Thấp (Low Trust)</option>
                  <option value="Trung bình">Trung bình (Medium Trust)</option>
                  <option value="Cao">Cao (Highly Confidential)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container"
                >
                  Lưu dữ liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Booth */}
      {isBoothModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingBooth ? `Chỉnh sửa Booth: ${currentEditingBooth.id}` : 'Đăng ký trạm hỗ trợ (Booth) mới'}
              </h3>
              <button onClick={() => setIsBoothModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">&#x2715;</button>
            </div>
            <form onSubmit={handleSaveBooth} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Mã trạm (ID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="BTH-00X"
                    value={boothIdField}
                    onChange={e => setBoothIdField(e.target.value)}
                    disabled={!!currentEditingBooth}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6] bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">UltraView / TeamView ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 12 345 678"
                    value={boothUltraviewField}
                    onChange={e => setBoothUltraviewField(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Tên Booth / Vị trí phân công *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kiosk Tự Phục Vụ Tầng G"
                  value={boothNameField}
                  onChange={e => setBoothNameField(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Địa điểm / Cửa hàng liên quan</label>
                <input
                  type="text"
                  placeholder="Store Quận 1, Store Quận 3..."
                  value={boothStoresField}
                  onChange={e => setBoothStoresField(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBoothModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Gửi thông báo phát thanh */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">Kênh phát thanh & Cảnh báo khẩn</h3>
              <button onClick={() => setIsNotificationModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">&#x2715;</button>
            </div>
            <form onSubmit={handleSendNotification} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Chủ đề phát hành *</label>
                <input
                  type="text"
                  required
                  placeholder="Chủ đề cảnh báo hạ tầng hoặc nâng cấp..."
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Chi tiết nội dung thông báo *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Viết hướng dẫn chi tiết cho đội kỹ thuật xử lý..."
                  value={notifContent}
                  onChange={e => setNotifContent(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>

              {/* Audience targeting configuration */}
              <div className="border border-outline-variant rounded-xl p-4 bg-[#f8fafc] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-gray-800">Cấu hình đối tượng nhận</span>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-primary bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={notifAllUsers}
                      onChange={(e) => {
                        setNotifAllUsers(e.target.checked);
                        if (e.target.checked) setNotifSelectedUsers([]);
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Thông báo toàn thể user</span>
                  </label>
                </div>

                {!notifAllUsers && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Chọn người nhận ({notifSelectedUsers.length})</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNotifSelectedUsers(users.map(u => u.name))}
                          className="text-[10px] text-primary hover:underline font-bold"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-gray-300 text-xs">|</span>
                        <button
                          type="button"
                          onClick={() => setNotifSelectedUsers([])}
                          className="text-[10px] text-red-600 hover:underline font-bold"
                        >
                          Bỏ chọn hết
                        </button>
                      </div>
                    </div>
                    {users.length === 0 ? (
                      <p className="text-gray-400 text-xs text-center py-2">Không có người dùng nào trong hệ thống</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        {users.map(u => {
                          const isChecked = notifSelectedUsers.includes(u.name);
                          return (
                            <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked ? 'bg-primary/5 border-primary/40 text-[#00174b]' : 'bg-white border-outline-variant hover:bg-gray-50'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNotifSelectedUsers([...notifSelectedUsers, u.name]);
                                  } else {
                                    setNotifSelectedUsers(notifSelectedUsers.filter(name => name !== u.name));
                                  }
                                }}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <div className="truncate flex-1">
                                <p className="font-bold text-gray-900 truncate">{u.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{u.role}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {notifAllUsers && (
                  <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200/50 p-2.5 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="font-medium">Hệ thống sẽ phát thông báo này cho <strong>tất cả người dùng</strong>.</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Phân loại & Cấp độ</label>
                  <select
                    value={notifClass}
                    onChange={e => setNotifClass(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white font-medium"
                  >
                    <option value="warning">Cảnh báo khẩn (Warning)</option>
                    <option value="update">Bản cập nhật mới (Update)</option>
                    <option value="success">Thông tin giải quyết (Resolved)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Gán Thẻ quản trị viên (Tag)</label>
                  <input
                    type="text"
                    value={notifTag}
                    onChange={e => setNotifTag(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Gửi thông báo ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Tạo ca trực mới */}
      {isCreateShiftModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-outline-variant animate-fadeIn">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900">Lên ca trực mới cho hệ thống</h3>
              </div>
              <button 
                onClick={() => setIsCreateShiftModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const assignedUser = users.find(u => u.name === newShiftStaffName);
              const newShiftObj = {
                id: `SFT-${Date.now().toString().slice(-4)}`,
                dayOfWeek: newShiftDay,
                shiftType: newShiftType,
                userName: newShiftStaffName,
                userAvatar: assignedUser?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCf19wuTp7sv6x9pADPruTII3g4UFBNu_m17cE7ZShyK5gMM7wx5BRgQxa_JX_QigzNPtZ0Hsvanp0yPYNQrJYLHjyhSNdlbMxZMMB7fDcZzOfZUOBQPkFkr-C-3KkXGAIk94Ff4GaLV6hU5nGzC5XKj16Cj3C-Pzscz6_DEnDMQuBMtGWBPfmeKB4yZF2aK0xshp2wSitcu2Tr0xQuk6tvQrdaEeW347dLPZBhzq4N2z3oClFluj1ONP9T5sjYirKxp84SzbKM2SM',
                status: newShiftStatus
              };
              
              setShifts(prev => [...prev, newShiftObj]);
              setIsCreateShiftModalOpen(false);
              triggerToast(`Đã điều phối ca trực thành công cho ${newShiftStaffName}!`);
            }} className="space-y-4 text-left">
              
              {/* Day of week selection */}
              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1.5">Ngày trực trong tuần</label>
                <select
                  value={newShiftDay}
                  onChange={e => setNewShiftDay(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-outline-variant rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-[#004ac6] cursor-pointer"
                >
                  <option value="T2">Thứ Hai (T2)</option>
                  <option value="T3">Thứ Ba (T3)</option>
                  <option value="T4">Thứ Tư (T4)</option>
                  <option value="T5">Thứ Năm (T5)</option>
                  <option value="T6">Thứ Sáu (T6)</option>
                  <option value="T7">Thứ Bảy (T7)</option>
                  <option value="CN">Chủ Nhật (CN)</option>
                </select>
              </div>

              {/* Shift type selection */}
              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1.5">Khung giờ ca trực</label>
                <select
                  value={newShiftType}
                  onChange={e => setNewShiftType(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-outline-variant rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-[#004ac6] cursor-pointer"
                >
                  <option value="morning">Ca Sáng (07:00 - 12:00)</option>
                  <option value="afternoon">Ca Chiều (12:00 - 17:00)</option>
                  <option value="evening">Ca Tối (17:00 - 22:00)</option>
                </select>
              </div>

              {/* Assigned Staff Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1.5">Nhân sự gán trực</label>
                <select
                  value={newShiftStaffName}
                  onChange={e => setNewShiftStaffName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-outline-variant rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-[#004ac6] cursor-pointer"
                >
                  {users.map((item) => (
                    <option key={item.id} value={item.name}>{item.name} ({item.department || 'Phần mềm'})</option>
                  ))}
                </select>
              </div>

              {/* Status selection */}
              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1.5">Trạng thái ca trực ban đầu</label>
                <select
                  value={newShiftStatus}
                  onChange={e => setNewShiftStatus(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-outline-variant rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-[#004ac6] cursor-pointer"
                >
                  <option value="scheduled">Lập lịch trực (Scheduled)</option>
                  <option value="on_duty">Đang làm việc (On Duty)</option>
                  <option value="confirmed">Đã hoàn thành bàn giao (Confirmed)</option>
                </select>
              </div>

              {/* Footer buttons */}
              <div className="flex gap-2.5 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateShiftModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#004ac6] hover:bg-primary-container text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Lập ca trực
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết thông báo */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-outline-variant animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${
                  selectedNotification.type === 'warning'
                    ? 'bg-red-50 text-red-600'
                    : selectedNotification.type === 'update'
                    ? 'bg-blue-50 text-primary'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <Bell className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {selectedNotification.id}
                </span>
                <span className="text-xs text-gray-500 font-medium">Chi tiết thông báo</span>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                &#x2715;
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#191b23]">
              <div>
                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2 ${
                  selectedNotification.type === 'warning'
                    ? 'bg-red-100 text-red-800'
                    : selectedNotification.type === 'update'
                    ? 'bg-blue-100 text-primary'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedNotification.type === 'warning'
                    ? 'Cảnh báo khẩn'
                    : selectedNotification.type === 'update'
                    ? 'Bản cập nhật mới'
                    : 'Đã giải quyết'}
                </span>
                <h3 className="text-base font-bold text-gray-900 leading-snug">
                  {selectedNotification.title}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Gửi lúc: {selectedNotification.time}
                </p>
              </div>

              {/* Recipient box */}
              <div className="bg-[#f8fafc] border border-outline-variant p-3.5 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5" /> Đối tượng nhận
                </div>
                <p className="text-xs font-bold text-[#00174b] break-words">
                  {selectedNotification.tagName}
                </p>
              </div>

              {/* Body/Message content */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Nội dung chi tiết</div>
                <div className="bg-slate-50 border border-[#f1f5f9] p-4 rounded-xl text-xs text-gray-700 leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedNotification.content}
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      toggleNotifReadState(selectedNotification.id);
                      setSelectedNotification(prev => prev ? { ...prev, isRead: !prev.isRead } : null);
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition-all select-none ${
                      selectedNotification.isRead
                        ? 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10'
                        : 'border-slate-300 text-gray-600 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {selectedNotification.isRead ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Đánh dấu chưa đọc
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Đánh dấu đã đọc
                      </>
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (confirm('Bạn có chắc chắn muốn xóa thông báo này khỏi lịch sử hệ thống?')) {
                        setNotifications(prev => prev.filter(n => n.id !== selectedNotification.id));
                        setSelectedNotification(null);
                        triggerToast('Đã xóa thông báo thành công');
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-red-650 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa bản tin
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="px-5 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-transform active:scale-95 text-xs font-medium"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5.5: Xem chi tiết công việc hoặc tác vụ */}
      {selectedTaskDetails && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-outline-variant animate-fadeIn">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                  <ClipboardList className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {selectedTaskDetails.id}
                </span>
                <span className="text-xs text-gray-500 font-medium font-bold">Chi tiết tác vụ IT</span>
              </div>
              <button
                onClick={() => setSelectedTaskDetails(null)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                type="button"
              >
                &#x2715;
              </button>
            </div>

            {/* Layout */}
            <div className="space-y-4 text-sm text-[#191b23]">
              
              {/* Task Title */}
              <div>
                <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                  {selectedTaskDetails.title}
                </h3>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Status Column */}
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Trạng thái</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedTaskDetails.status === 'pending'
                        ? 'bg-gray-100 text-gray-800'
                        : selectedTaskDetails.status === 'progress'
                        ? 'bg-blue-100 text-primary'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedTaskDetails.status === 'pending'
                          ? 'bg-gray-500'
                          : selectedTaskDetails.status === 'progress'
                          ? 'bg-primary animate-pulse'
                          : 'bg-emerald-500'
                      }`}></span>
                      {selectedTaskDetails.status === 'pending'
                        ? 'Chờ xử lý (Pending)'
                        : selectedTaskDetails.status === 'progress'
                        ? 'Đang thực hiện (Progress)'
                        : 'Hoàn thành (Done)'}
                    </span>
                  </div>
                </div>

                {/* Due text / Overdue indicator Column */}
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Do Date / Hạn chót</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-4 h-4 ${selectedTaskDetails.isOverdue ? 'text-red-600 animate-pulse' : 'text-gray-500'}`} />
                    <span className={`text-xs font-bold ${selectedTaskDetails.isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                      {selectedTaskDetails.dueText}
                    </span>
                    {selectedTaskDetails.isOverdue && (
                      <span className="bg-red-100 text-red-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ml-1">TRỄ</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Assignee Details */}
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Nhân sự phụ trách</span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#004ac6]/10 text-primary flex items-center justify-center font-extrabold text-sm border border-primary/20">
                    {selectedTaskDetails.assigneeName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{selectedTaskDetails.assigneeName}</p>
                    <p className="text-[10px] text-gray-500">Kỹ thuật viên phòng IT</p>
                  </div>
                </div>
              </div>

              {/* Status transition swift controls */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Chuyển trạng thái nhanh</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      moveTaskStatus(selectedTaskDetails.id, 'pending');
                      setSelectedTaskDetails(prev => prev ? { ...prev, status: 'pending' } : null);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                      selectedTaskDetails.status === 'pending'
                        ? 'bg-gray-200 border-gray-300 text-gray-800'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Chờ xử lý
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      moveTaskStatus(selectedTaskDetails.id, 'progress');
                      setSelectedTaskDetails(prev => prev ? { ...prev, status: 'progress' } : null);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                      selectedTaskDetails.status === 'progress'
                        ? 'bg-blue-50 border-primary/40 text-primary'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Đang thực hiện
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      moveTaskStatus(selectedTaskDetails.id, 'done');
                      setSelectedTaskDetails(prev => prev ? { ...prev, status: 'done' } : null);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                      selectedTaskDetails.status === 'done'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Hoàn thành
                  </button>
                </div>
              </div>

              {/* Write/Edit Task Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Ghi chú & Nhật ký công việc</span>
                  <button
                    onClick={() => handleUpdateTaskNotes(selectedTaskDetails.id, taskNotesInput)}
                    className="text-[10px] text-primary hover:underline font-bold"
                    type="button"
                  >
                    Lưu ghi chú
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={taskNotesInput}
                  onChange={e => setTaskNotesInput(e.target.value)}
                  placeholder="Nhập ghi chú xử lý lỗi kỹ thuật, tài khoản cấp, biên bản phần cứng..."
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-primary focus:ring-1 focus:ring-primary h-24 placeholder:text-gray-400"
                ></textarea>
              </div>

              {/* Task Attachments Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-primary" /> Tài liệu đính kèm ({(selectedTaskDetails.attachments || []).length})
                  </span>
                </div>

                {/* Attachments list */}
                {(selectedTaskDetails.attachments || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {(selectedTaskDetails.attachments || []).map((attach, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs gap-2 group hover:bg-slate-100 transition-all select-none">
                        <a
                          href={attach.url || '#'}
                          download={attach.name}
                          onClick={(e) => {
                            if (!attach.url) {
                              e.preventDefault();
                              triggerToast(`Tải xuống tài liệu: ${attach.name}`);
                            }
                          }}
                          title="Click để tải tệp"
                          className="flex items-center gap-1.5 min-w-0 flex-1 hover:text-primary transition-colors font-medium text-gray-700 truncate"
                        >
                          <FileText className="w-4 h-4 text-gray-450 shrink-0" />
                          <div className="truncate text-left">
                            <p className="truncate font-semibold text-gray-800 leading-tight text-[11px]">{attach.name}</p>
                            <p className="text-[9px] text-gray-450 font-mono mt-0.5">{attach.size || 'N/A'}</p>
                          </div>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(attach.name)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-slate-100 transition-colors shrink-0 font-bold"
                          title="Xóa tệp đính kèm"
                        >
                          &#x2715;
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Tác vụ chưa có tệp đính kèm nào.</p>
                )}

                {/* Drag-and-Drop Dropzone area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDetailDragging(true);
                  }}
                  onDragLeave={() => setIsDetailDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDetailDragging(false);
                    handleAddAttachment(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-xl p-3 text-center transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                    isDetailDragging 
                      ? 'border-primary bg-primary/5 scale-[0.99] shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    id="detail-file-upload-input"
                    className="hidden"
                    onChange={(e) => handleAddAttachment(e.target.files)}
                  />
                  <label htmlFor="detail-file-upload-input" className="cursor-pointer w-full flex flex-col items-center select-none">
                    <Paperclip className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-[11px] font-semibold text-slate-700">Kéo & thả tệp vào đây hoặc <span className="text-primary hover:underline font-bold">chọn dữ liệu</span></p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Hỗ trợ PDF, PNG, JPG, EXCEL... tối đa 15MB</p>
                  </label>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Bạn có chắc muốn xóa tác vụ: ${selectedTaskDetails.title}?`)) {
                      setTasks(prev => prev.filter(t => t.id !== selectedTaskDetails.id));
                      setSelectedTaskDetails(null);
                      triggerToast('Đã xóa tác vụ thành công');
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-red-650 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Xóa tác vụ
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenTaskModal(selectedTaskDetails);
                      setSelectedTaskDetails(null);
                    }}
                    className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" /> Sửa thông tin
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskDetails(null)}
                    className="px-5 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-transform active:scale-95 text-xs font-medium"
                  >
                    Đóng
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Tạo / Sửa Công việc Kanban */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingTask ? `Cấu hình Công việc ${currentEditingTask.id}` : 'Thêm nhiệm vụ trên Kanban'}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">&#x2715;</button>
            </div>
            <form onSubmit={handleSaveTask} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Mô tả tác vụ (Tiêu đề) *</label>
                <input
                  type="text"
                  required
                  placeholder="Kiểm tra hệ thống mạng, cài đặt phần mềm..."
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Độ ưu tiên / Hạn chót</label>
                  <select
                    value={taskDue}
                    onChange={e => setTaskDue(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Hôm nay">Giới hạn: Hôm nay (Khẩn)</option>
                    <option value="Hôm qua">Giới hạn: Hôm qua (Quá hạn)</option>
                    <option value="Trong tuần">Tuần này</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Phân công Nhân sự phụ trách</label>
                  <select
                    value={taskAssignee}
                    onChange={e => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Trạng thái phát triển</label>
                <select
                  value={taskStatusField}
                  onChange={e => setTaskStatusField(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="pending">Chờ xử lý (Pending)</option>
                  <option value="progress">Đang làm (Processing)</option>
                  <option value="done">Hoàn tất (Completed)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-xs text-slate-500 uppercase tracking-wide mb-1">Tài liệu đính kèm ({taskAttachments.length})</label>
                
                {/* Attached Files List during Form Creation/Editing */}
                {taskAttachments.length > 0 && (
                  <div className="space-y-1.5 mb-2 max-h-24 overflow-y-auto">
                    {taskAttachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-[#f8fafc] border border-slate-100 text-xs text-slate-700">
                        <span className="flex items-center gap-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-semibold text-slate-800">{f.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({f.size})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFormAttachment(f.name)}
                          className="text-gray-400 hover:text-red-500 font-bold px-1.5 rounded hover:bg-slate-200/50 transition-colors"
                        >
                          &#x2715;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form drag and drop dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsFormDragging(true);
                  }}
                  onDragLeave={() => setIsFormDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsFormDragging(false);
                    handleAddFormAttachment(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer relative ${
                    isFormDragging 
                      ? 'border-primary bg-primary/5 scale-[0.99]' 
                      : 'border-slate-200 hover:border-slate-350 bg-slate-50/20'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    id="form-file-upload-input"
                    className="hidden"
                    onChange={(e) => handleAddFormAttachment(e.target.files)}
                  />
                  <label htmlFor="form-file-upload-input" className="cursor-pointer w-full flex flex-col items-center select-none">
                    <Paperclip className="w-4 h-4 text-slate-400 mb-1" />
                    <p className="text-[11px] font-bold text-slate-700">Thả file vào đây hoặc <span className="text-primary hover:underline font-bold">chọn tệp</span></p>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Sidebar
        activeTab={activeTab}
        errorLogs={errorLogs}
        tasks={tasks}
        notifications={notifications}
        setActiveTab={setActiveTab}
        setSearchQuery={setSearchQuery}
        setSelectedUserProfileUser={setSelectedUserProfileUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-[280px] flex flex-col min-h-screen">
        <TopHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notifications={notifications}
          setNotifications={setNotifications}
          isQuickNotifModalOpen={isQuickNotifModalOpen}
          setIsQuickNotifModalOpen={setIsQuickNotifModalOpen}
          quickNotifRef={quickNotifRef}
          setSelectedNotification={setSelectedNotification}
          setIsNotificationModalOpen={setIsNotificationModalOpen}
          setActiveTab={setActiveTab}
          toggleNotifReadState={toggleNotifReadState}
          triggerToast={triggerToast}
        />


        {/* Main Canvas Segment */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* TAB 1: OVERVIEW SCREEN */}
          {activeTab === 'overview' && (
            <OverviewTab
              overdueTasksCount={overdueTasksCount}
              totalLogs={totalLogs}
              pendingTasksCount={pendingTasksCount}
              inProgressTasksCount={inProgressTasksCount}
              totalUsers={totalUsers}
              totalBooths={totalBooths}
              tasks={tasks}
              processedRecentActivities={processedRecentActivities}
              setActiveTab={setActiveTab}
              triggerToast={triggerToast}
            />
          )}


          {/* TAB 2: ERROR LOGS (Log lỗi) SCREEN */}
          {activeTab === 'error_logs' && (
            <ErrorLogsTab
              filteredLogs={filteredLogs}
              errorLogs={errorLogs}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              logStoreFilter={logStoreFilter}
              setLogStoreFilter={setLogStoreFilter}
              logBoothFilter={logBoothFilter}
              setLogBoothFilter={setLogBoothFilter}
              handleOpenLogModal={(log) => handleOpenLogModal(log)}
              handleDeleteLog={handleDeleteLog}
              triggerToast={triggerToast}
            />
          )}


          {/* TAB 3: KANBAN WORKFLOW (Công việc) SCREEN */}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              draggedTaskId={draggedTaskId}
              dragOverColumn={dragOverColumn}
              handleOpenTaskModal={handleOpenTaskModal}
              setSelectedTaskDetails={setSelectedTaskDetails}
              setTaskNotesInput={setTaskNotesInput}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              moveTaskStatus={moveTaskStatus}
            />
          )}


          {/* TAB 4: USERS LIST (Người dùng) SCREEN */}
          {activeTab === 'users' && (
            <UsersTab
              users={users}
              setUsers={setUsers}
              selectedUserProfileUser={selectedUserProfileUser}
              setSelectedUserProfileUser={setSelectedUserProfileUser}
              profileName={profileName}
              setProfileName={setProfileName}
              profilePhone={profilePhone}
              setProfilePhone={setProfilePhone}
              profileRole={profileRole}
              setProfileRole={setProfileRole}
              profileDept={profileDept}
              setProfileDept={setProfileDept}
              handleOpenUserModal={handleOpenUserModal}
              handleDeleteUser={handleDeleteUser}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              userRoleFilter={userRoleFilter}
              setUserRoleFilter={setUserRoleFilter}
              filteredUsers={filteredUsers}
              triggerToast={triggerToast}
            />
          )}


          {/* TAB 5: ROLES SCREEN */}
          {activeTab === 'roles' && (
            <RolesTab
              roles={roles}
              handleOpenRoleModal={handleOpenRoleModal}
            />
          )}


          {/* TAB 6: BOOTHS MANAGEMENT SCREEN */}
          {activeTab === 'booths' && (
            <BoothsTab
              filteredBooths={filteredBooths}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              copyToClipboard={copyToClipboard}
              handleOpenBoothModal={handleOpenBoothModal}
              handleDeleteBooth={handleDeleteBooth}
            />
          )}


          {/* TAB 7: SYSTEM NOTIFICATIONS (Thông báo) SCREEN */}
          {activeTab === 'notifications' && (
            <NotificationsTab
              notifications={notifications}
              toggleNotifReadState={toggleNotifReadState}
              setSelectedNotification={setSelectedNotification}
              setIsNotificationModalOpen={setIsNotificationModalOpen}
              triggerToast={triggerToast}
            />
          )}


          {/* TAB 9: SETTINGS (Cài đặt bảo mật) SCREEN */}
          {activeTab === 'settings' && (
            <SettingsTab
              settingsStage={settingsStage}
              setSettingsStage={setSettingsStage}
              settingsPasswordCurrent={settingsPasswordCurrent}
              setSettingsPasswordCurrent={setSettingsPasswordCurrent}
              settingsPasswordNew={settingsPasswordNew}
              setSettingsPasswordNew={setSettingsPasswordNew}
              settingsPasswordConfirm={settingsPasswordConfirm}
              setSettingsPasswordConfirm={setSettingsPasswordConfirm}
              showCurrentPassword={showCurrentPassword}
              setShowCurrentPassword={setShowCurrentPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
              showConfirmNewPassword={showConfirmNewPassword}
              setShowConfirmNewPassword={setShowConfirmNewPassword}
              settingsOTPValues={settingsOTPValues}
              setSettingsOTPValues={setSettingsOTPValues}
              settingsOTPTimer={settingsOTPTimer}
              setSettingsOTPTimer={setSettingsOTPTimer}
              triggerToast={triggerToast}
            />
          )}


          {/* TAB 8: SCHEDULE (Lịch làm việc / Shift Planner) SCREEN */}
          {activeTab === 'schedule' && (
            <ScheduleTab
              shifts={shifts}
              users={users}
              scheduleTeamMode={scheduleTeamMode}
              setScheduleTeamMode={setScheduleTeamMode}
              scheduleSearchQuery={scheduleSearchQuery}
              setScheduleSearchQuery={setScheduleSearchQuery}
              scheduleRoleFilter={scheduleRoleFilter}
              setScheduleRoleFilter={setScheduleRoleFilter}
              setNewShiftDay={setNewShiftDay}
              setNewShiftType={setNewShiftType}
              setNewShiftStaffName={setNewShiftStaffName}
              setNewShiftStatus={setNewShiftStatus}
              setIsCreateShiftModalOpen={setIsCreateShiftModalOpen}
              setSelectedUserProfileUser={setSelectedUserProfileUser}
              setActiveTab={setActiveTab}
              triggerToast={triggerToast}
            />
          )}
        </main>
      </div>

    </div>
  );
}
