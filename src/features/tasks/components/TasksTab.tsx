import React, { useEffect, useRef, useState } from 'react';
import { Plus, Clock, Paperclip, Edit2, Paperclip as PaperclipIcon, Columns3, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ArrowRight, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { useTasksStore } from '../../../stores/useTasksStore';
import { useUsersStore } from '../../../stores/useUsersStore';
import { useKanbanDragDrop } from '../hooks/useKanbanDragDrop';
import { Task, TaskAttachment } from '../../../types';

const MAX_ATTACHMENT_FILES_PER_UPLOAD = 10;
const MAX_ATTACHMENT_FILE_SIZE = 20 * 1024 * 1024;
const MAX_ATTACHMENT_UPLOAD_SIZE = 50 * 1024 * 1024;

const formatAttachmentSize = (sizeBytes: number) => sizeBytes >= 1024 * 1024
  ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;

export default function TasksTab() {
  const {
    tasks,
    isLoading,
    saveTask,
    updateTaskStatus,
    updateTaskNotes,
    addAttachments,
    deleteAttachment,
    getAttachmentDownloadUrl,
    isTaskModalOpen,
    setIsTaskModalOpen,
    currentEditingTask,
    setCurrentEditingTask,
    selectedTaskDetails,
    setSelectedTaskDetails
  } = useTasksStore();
  const { users } = useUsersStore();

  const {
    draggedTaskId,
    dragOverColumn,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useKanbanDragDrop();

  // Local Form states for creating/editing task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatusField, setTaskStatusField] = useState<'pending' | 'progress' | 'done'>('pending');
  const [taskDue, setTaskDue] = useState('Hôm nay');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [pendingTaskFiles, setPendingTaskFiles] = useState<File[]>([]);
  const [taskNotesInput, setTaskNotesInput] = useState('');
  const [activeTaskView, setActiveTaskView] = useState<'kanban' | 'calendar' | 'month'>('calendar');
  const [calendarZoom, setCalendarZoom] = useState(1);
  const [calendarDraggedTaskId, setCalendarDraggedTaskId] = useState<string | null>(null);
  const [calendarDragOverSlot, setCalendarDragOverSlot] = useState<string | null>(null);
  const [calendarDeadlineOverrides, setCalendarDeadlineOverrides] = useState<Record<string, string>>({});
  const [calendarSlotDetails, setCalendarSlotDetails] = useState<{
    title: string;
    tasks: Task[];
  } | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement | null>(null);
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const toLocalDateTimeInputValue = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const getTodayInputValue = () => toLocalDateTimeInputValue(new Date());
  const getTodayDateKey = () => getDateKey(new Date());
  const toDateInputValue = (dateValue?: string) => {
    if (!dateValue) return getTodayDateKey();
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? dateValue.slice(0, 10) : getDateKey(date);
  };
  const toDateTimeInputValue = (dateValue?: string) => {
    if (!dateValue) return getTodayInputValue();
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return dateValue.length >= 16 ? dateValue.slice(0, 16) : `${dateValue.slice(0, 10)}T09:00`;
    }
    return toLocalDateTimeInputValue(date);
  };
  const isTaskAssigneeRole = (role: unknown) => {
    const normalizedRole = String(role).toLowerCase();
    return role === 2 || normalizedRole === 'itsupport' || normalizedRole === 'it support';
  };
  const assigneeUsers = users.filter(user => isTaskAssigneeRole(user.role));

  const getDefaultAssignee = () => assigneeUsers[0] || null;
  const findAssigneeUser = (assigneeId?: string, assigneeName?: string) => {
    return users.find(user => user.id === assigneeId)
      || users.find(user => user.name === assigneeName)
      || null;
  };
  const getTaskAssigneeName = (task: Task) => findAssigneeUser(task.assigneeId, task.assigneeName)?.name || task.assigneeName || 'Chưa gán';
  const getTaskAssigneeInitial = (task: Task) => getTaskAssigneeName(task).charAt(0).toUpperCase();
  const getTaskStatusLabel = (status: Task['status']) => {
    if (status === 'pending') return 'Chờ xử lý';
    if (status === 'progress') return 'Đang làm';
    return 'Hoàn thành';
  };
  const openTaskDetails = (task: Task) => {
    setSelectedTaskDetails(task);
    setTaskNotesInput(task.description || '');
  };

  const formatDueText = (dateValue: string) => {
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleString('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const isOverdueDate = (dateValue: string) => Boolean(dateValue) && new Date(dateValue).getTime() < Date.now();

  const handleOpenTaskModal = (t: Task | null = null, defaultDueDate?: string) => {
    if (t) {
      const assigneeUser = findAssigneeUser(t.assigneeId, t.assigneeName);
      setCurrentEditingTask(t);
      setTaskTitle(t.title);
      setTaskDescription(t.description || '');
      setTaskStatusField(t.status);
      setTaskDue(toDateTimeInputValue(t.dueDate || t.dueText));
      setTaskAssigneeId(assigneeUser?.id || t.assigneeId || '');
      setTaskAssignee(assigneeUser?.name || t.assigneeName);
      setTaskAttachments(t.attachments || []);
      setPendingTaskFiles([]);
    } else {
      const defaultAssignee = getDefaultAssignee();
      setCurrentEditingTask(null);
      setTaskTitle('');
      setTaskDescription('');
      setTaskStatusField('pending');
      setTaskDue(defaultDueDate || getTodayInputValue());
      setTaskAssigneeId(defaultAssignee?.id || '');
      setTaskAssignee(defaultAssignee?.name || '');
      setTaskAttachments([]);
      setPendingTaskFiles([]);
    }
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('Vui lòng điền tiêu đề công việc.');
      return;
    }
    if (!taskAssigneeId) {
      toast.error('Vui lòng chọn người đảm nhận.');
      return;
    }

    const selectedAssignee = findAssigneeUser(taskAssigneeId, taskAssignee);

    const payload = {
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      priority: currentEditingTask?.priority ?? 1,
      status: taskStatusField,
      dueDate: taskDue,
      dueText: taskDue ? formatDueText(taskDue) : 'Hôm nay',
      assigneeId: selectedAssignee?.id || taskAssigneeId || undefined,
      assigneeName: selectedAssignee?.name || taskAssignee.trim(),
      isOverdue: isOverdueDate(taskDue),
      attachments: taskAttachments,
      notes: currentEditingTask?.notes || ''
    };

    try {
      const savedTask = currentEditingTask
        ? await saveTask({ ...payload, id: currentEditingTask.id })
        : await saveTask(payload);

      let attachmentUploadFailed = false;
      if (pendingTaskFiles.length > 0) {
        try {
          await addAttachments(savedTask.id, pendingTaskFiles);
        } catch (err: any) {
          attachmentUploadFailed = true;
          toast.error(err.message || 'Tác vụ đã lưu nhưng không thể tải tệp lên R2.');
        }
      }

      if (!attachmentUploadFailed) {
        toast.success(currentEditingTask ? 'Cập nhật tác vụ thành công.' : 'Tạo tác vụ thành công.');
      }
      setIsTaskModalOpen(false);
      setCurrentEditingTask(null);
      setTaskTitle('');
      setTaskDescription('');
      setTaskStatusField('pending');
      setTaskDue(getTodayInputValue());
      const defaultAssignee = getDefaultAssignee();
      setTaskAssigneeId(defaultAssignee?.id || '');
      setTaskAssignee(defaultAssignee?.name || '');
      setTaskAttachments([]);
      setPendingTaskFiles([]);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu tác vụ.');
    }
  };

  const handleAddAttachmentClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    e.target.value = '';

    if (files.length > MAX_ATTACHMENT_FILES_PER_UPLOAD) {
      toast.error(`Mỗi lần chỉ được tải tối đa ${MAX_ATTACHMENT_FILES_PER_UPLOAD} tệp.`);
      return;
    }

    const oversizedFile = files.find(file => file.size <= 0 || file.size > MAX_ATTACHMENT_FILE_SIZE);
    if (oversizedFile) {
      toast.error(`Tệp "${oversizedFile.name}" phải có dung lượng từ 1 byte đến 20 MB.`);
      return;
    }

    if (files.reduce((total, file) => total + file.size, 0) > MAX_ATTACHMENT_UPLOAD_SIZE) {
      toast.error('Tổng dung lượng một lần tải không được vượt quá 50 MB.');
      return;
    }

    if (selectedTaskDetails) {
      try {
        await addAttachments(selectedTaskDetails.id, files);
        toast.success(`Đã tải ${files.length} tệp lên R2.`);
      } catch (err: any) {
        toast.error(err.message || 'Không thể tải tệp lên R2.');
      }
    } else {
      if (pendingTaskFiles.length + files.length > MAX_ATTACHMENT_FILES_PER_UPLOAD) {
        toast.error(`Mỗi lần lưu task chỉ được tải tối đa ${MAX_ATTACHMENT_FILES_PER_UPLOAD} tệp.`);
        return;
      }

      const pendingSize = pendingTaskFiles.reduce((total, file) => total + file.size, 0);
      const selectedSize = files.reduce((total, file) => total + file.size, 0);
      if (pendingSize + selectedSize > MAX_ATTACHMENT_UPLOAD_SIZE) {
        toast.error('Tổng dung lượng tệp chờ tải không được vượt quá 50 MB.');
        return;
      }

      setPendingTaskFiles(prev => [...prev, ...files]);
      toast.success(`Đã chọn ${files.length} tệp. Tệp sẽ được tải lên R2 khi lưu task.`);
    }
  };

  const handleDeleteAttachmentClick = async (attachmentId: string) => {
    const taskId = selectedTaskDetails?.id || currentEditingTask?.id;
    if (!taskId) return;

    try {
      await deleteAttachment(taskId, attachmentId);
      setTaskAttachments(prev => prev.filter(att => att.id !== attachmentId));
      toast.success('Đã xóa tệp khỏi R2.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tệp đính kèm.');
    }
  };

  const handleOpenAttachment = async (taskId: string, attachment: TaskAttachment) => {
    try {
      const url = await getAttachmentDownloadUrl(taskId, attachment.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err.message || 'Không thể mở tệp từ R2.');
    }
  };

  const handleUpdateTaskStatus = async (id: string, status: 'pending' | 'progress' | 'done') => {
    try {
      await updateTaskStatus(id, status);
      toast.success('Đã cập nhật trạng thái tác vụ.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTaskDetails) return;
    try {
      await updateTaskNotes(selectedTaskDetails.id, taskNotesInput);
      toast.success('Đã lưu ghi chú.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu ghi chú.');
    }
  };

  const handleCalendarTaskDragStart = (event: React.DragEvent, taskId: string) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
    setCalendarDraggedTaskId(taskId);
  };

  const handleCalendarTaskDragEnd = () => {
    setCalendarDraggedTaskId(null);
    setCalendarDragOverSlot(null);
  };

  const handleCalendarSlotDragOver = (event: React.DragEvent, slotKey: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setCalendarDragOverSlot(current => (current === slotKey ? current : slotKey));
  };

  const handleCalendarSlotDrop = async (event: React.DragEvent, slotKey: string, slotDateTime: string) => {
    event.preventDefault();
    event.stopPropagation();

    const taskId = event.dataTransfer.getData('text/plain') || calendarDraggedTaskId;
    setCalendarDraggedTaskId(null);
    setCalendarDragOverSlot(null);

    const task = calendarTasks.find(item => item.id === taskId);
    if (!task) return;

    const currentSlotKey = `${getTaskDateKey(task)}-${String(new Date(task.dueDate || task.dueText).getHours()).padStart(2, '0')}`;
    if (currentSlotKey === slotKey) return;

    setCalendarDeadlineOverrides(prev => ({
      ...prev,
      [task.id]: slotDateTime,
    }));

    try {
      await saveTask({
        id: task.id,
        code: task.code,
        title: task.title,
        description: task.description || '',
        priority: task.priority ?? 1,
        status: task.status,
        dueDate: slotDateTime,
        dueText: formatDueText(slotDateTime),
        assigneeId: task.assigneeId,
        assigneeName: task.assigneeName,
        assigneeAvatar: task.assigneeAvatar,
        isOverdue: isOverdueDate(slotDateTime),
        notes: task.notes || '',
        attachments: task.attachments || [],
      });
      setCalendarDeadlineOverrides(prev => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      toast.success('Đã cập nhật deadline tác vụ.');
    } catch (err: any) {
      setCalendarDeadlineOverrides(prev => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      toast.error(err.message || 'Không thể cập nhật deadline tác vụ.');
    }
  };

  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTaskDateKey = (task: Task) => {
    const rawDate = task.dueDate || task.dueText;
    if (!rawDate) return '';
    return toDateInputValue(rawDate);
  };

  const calendarTasks = tasks.map(task => {
    const overriddenDeadline = calendarDeadlineOverrides[task.id];
    if (!overriddenDeadline) return task;

    return {
      ...task,
      dueDate: overriddenDeadline,
      dueText: formatDueText(overriddenDeadline),
      isOverdue: isOverdueDate(overriddenDeadline),
    };
  });

  const calendarDays = (() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(calendarWeekStart);
      date.setDate(calendarWeekStart.getDate() + index);
      return {
        date,
        key: getDateKey(date),
        isToday: getDateKey(date) === getTodayDateKey(),
      };
    });
  })();

  const calendarHours = Array.from({ length: 24 }, (_, index) => index);

  const tasksByDateHour = calendarTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = getTaskDateKey(task);
    if (!key) return acc;
    const date = new Date(task.dueDate || task.dueText);
    const hour = Number.isNaN(date.getTime()) ? 9 : date.getHours();
    const slotKey = `${key}-${String(hour).padStart(2, '0')}`;
    acc[slotKey] = acc[slotKey] || [];
    acc[slotKey].push(task);
    return acc;
  }, {});

  const tasksByDate = calendarTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = getTaskDateKey(task);
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(task);
    return acc;
  }, {});

  const monthCalendarDays = (() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return {
        date,
        key: getDateKey(date),
        isToday: getDateKey(date) === getTodayDateKey(),
        isCurrentMonth: date.getMonth() === calendarMonth.getMonth(),
      };
    });
  })();

  const moveCalendarWeek = (offset: number) => {
    setCalendarWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + offset * 7);
      return next;
    });
  };

  const resetCalendarWeek = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    setCalendarWeekStart(start);
  };

  const moveCalendarMonth = (offset: number) => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const resetCalendarMonth = () => {
    const today = new Date();
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const getMonthTaskDateTime = (task: Task, dateKey: string) => {
    const currentDate = new Date(task.dueDate || task.dueText);
    const hour = Number.isNaN(currentDate.getTime()) ? 9 : currentDate.getHours();
    const minute = Number.isNaN(currentDate.getTime()) ? 0 : currentDate.getMinutes();
    return `${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const handleMonthDayDrop = (event: React.DragEvent, dateKey: string) => {
    const taskId = event.dataTransfer.getData('text/plain') || calendarDraggedTaskId;
    const task = calendarTasks.find(item => item.id === taskId);
    if (!task) return;

    const dateTime = getMonthTaskDateTime(task, dateKey);
    const hour = new Date(dateTime).getHours();
    void handleCalendarSlotDrop(event, `${dateKey}-${String(hour).padStart(2, '0')}`, dateTime);
  };

  const statusClassByTask = (status: Task['status']) => {
    if (status === 'pending') return 'border-outline-variant bg-surface-2 text-on-surface-variant';
    if (status === 'progress') return 'border-primary/30 bg-primary/10 text-primary';
    return 'border-success/30 bg-success-container text-success';
  };

  const getTaskDisplayPriority = (status: Task['status']) => {
    if (status === 'progress') return 0;
    if (status === 'pending') return 1;
    return 2;
  };

  const sortTasksForCalendarSlot = (slotTasks: Task[]) => {
    return [...slotTasks].sort((first, second) => {
      const priorityDiff = getTaskDisplayPriority(first.status) - getTaskDisplayPriority(second.status);
      if (priorityDiff !== 0) return priorityDiff;

      return (first.title || '').localeCompare(second.title || '', 'vi');
    });
  };

  const getSlotDateTime = (dateKey: string, hour: number) => `${dateKey}T${String(hour).padStart(2, '0')}:00`;
  const getSlotTitle = (date: Date, hour: number) => {
    return `${String(hour).padStart(2, '0')}:00 - ${date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })}`;
  };
  const getTaskTimeText = (task: Task) => {
    const date = new Date(task.dueDate || task.dueText);
    if (Number.isNaN(date.getTime())) return '09:00';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };
  const calendarDayColumnWidth = Math.round(140 + (calendarZoom - 1) * 120);
  const calendarSlotHeight = Math.round(82 + (calendarZoom - 1) * 70);
  const calendarTaskPaddingClass = calendarZoom >= 1.35 ? 'px-3 py-2' : calendarZoom <= 0.8 ? 'px-1.5 py-1' : 'px-2 py-1.5';
  const calendarTaskTitleClass = calendarZoom >= 1.35 ? 'text-xs' : 'text-[11px]';

  const preferredCalendarHour = (() => {
    let bestHour = 7;
    let bestCount = 0;

    calendarHours.forEach(hour => {
      const hourKey = String(hour).padStart(2, '0');
      const taskScore = calendarDays.reduce((total, day) => {
        const slotTasks = tasksByDateHour[`${day.key}-${hourKey}`] || [];
        const openTaskCount = slotTasks.filter(task => task.status !== 'done').length;
        return total + openTaskCount * 10 + slotTasks.length;
      }, 0);

      if (taskScore > bestCount) {
        bestHour = hour;
        bestCount = taskScore;
      }
    });

    return bestHour;
  })();

  useEffect(() => {
    if (activeTaskView !== 'calendar') return;

    const scrollContainer = calendarScrollRef.current;
    if (!scrollContainer) return;

    window.requestAnimationFrame(() => {
      const headerOffset = 58;
      const contextHour = Math.max(0, preferredCalendarHour - 1);
      scrollContainer.scrollTop = Math.max(0, headerOffset + contextHour * calendarSlotHeight - 12);
    });
  }, [activeTaskView, calendarSlotHeight, preferredCalendarHour, tasks.length, calendarWeekStart]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-sans">
            {activeTaskView === 'kanban' ? 'Bảng Kanban điều phối nhiệm vụ IT' : 'Lịch công việc IT'}
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            {activeTaskView === 'kanban'
              ? 'Phân bổ công việc bằng cách kéo thả hoặc thao tác nhanh.'
              : activeTaskView === 'calendar'
                ? 'Theo dõi và sắp xếp thời hạn công việc theo tuần.'
                : 'Theo dõi tổng quan thời hạn công việc theo tháng.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="inline-flex rounded-lg border border-outline-variant bg-surface p-1">
            <button
              type="button"
              onClick={() => setActiveTaskView('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                activeTaskView === 'kanban' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-2'
              }`}
            >
              <Columns3 className="w-4 h-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setActiveTaskView('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                activeTaskView === 'calendar' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-2'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Tuần
            </button>
            <button
              type="button"
              onClick={() => setActiveTaskView('month')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                activeTaskView === 'month' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-2'
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              Tháng
            </button>
          </div>
          <button
            onClick={() => handleOpenTaskModal()}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Khởi tạo Tác vụ
          </button>
        </div>
      </div>

      {/* Kanban columns grid wrapper */}
      {activeTaskView === 'kanban' ? (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch text-left">
        
        {/* Column 1: CHỜ XỬ LÝ (pending) */}
        <div className="bg-surface rounded-xl border border-outline-variant flex flex-col">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-2 rounded-t-xl select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-on-surface-variant"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant font-sans">Chờ xử lý</h4>
              <span className="bg-surface-2 text-on-surface-variant text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'pending').length}
              </span>
            </div>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, 'pending')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'pending')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] max-h-[350px] overflow-y-auto pr-2 transition-all duration-200 ${
              dragOverColumn === 'pending' ? 'bg-primary/10 border-2 border-dashed border-primary shadow-inner' : 'bg-surface-2'
            }`}
          >
            {tasks.filter(t => t.status === 'pending').length === 0 ? (
              <p className="text-[11px] text-on-surface-variant text-center py-10">Cột trống</p>
            ) : (
              tasks.filter(t => t.status === 'pending').map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => {
                    setSelectedTaskDetails(task);
                    setTaskNotesInput(task.description || '');
                  }}
                  className={`bg-surface p-4 rounded-lg border border-outline-variant hover:shadow-md hover:border-primary/40 shadow-sm space-y-3 transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    draggedTaskId === task.id ? 'opacity-30 border-primary' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                     <h5 className="text-xs font-bold text-on-surface leading-snug">{task.title}</h5>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTaskModal(task);
                      }}
                      className="p-1 text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-2 transition-colors"
                      title="Sửa tác vụ"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                 

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-error font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{task.dueText}</span>
                    </div>
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="flex items-center gap-1 bg-surface-2 px-1.5 py-0.5 rounded text-on-surface-variant font-semibold text-[9px]" title={`${task.attachments.length} tệp đính kèm`}>
                        <Paperclip className="w-3 h-3 text-primary shrink-0" />
                        <span>{task.attachments.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center font-bold text-[9px] text-primary">
                        {getTaskAssigneeInitial(task)}
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-medium truncate">{getTaskAssigneeName(task)}</span>
                    </div>
                    
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'progress')}
                        disabled={isLoading}
                        className="text-[10px] border border-primary/30 text-primary hover:bg-primary/10 px-2 py-0.5 rounded font-bold whitespace-nowrap active:scale-95 transition-transform cursor-pointer inline-flex items-center gap-1"
                      >
                        Bắt đầu <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: ĐANG THỰC HIỆN (progress) */}
        <div className="bg-surface rounded-xl border border-outline-variant flex flex-col">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-2 rounded-t-xl select-none font-sans">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Đang thực hiện</h4>
              <span className="bg-secondary-container text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'progress').length}
              </span>
            </div>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, 'progress')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'progress')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] max-h-[350px] overflow-y-auto pr-2 transition-all duration-200 ${
              dragOverColumn === 'progress' ? 'bg-primary/10 border-2 border-dashed border-primary shadow-inner' : 'bg-surface-2'
            }`}
          >
            {tasks.filter(t => t.status === 'progress').length === 0 ? (
              <p className="text-[11px] text-on-surface-variant text-center py-10">Cột trống</p>
            ) : (
              tasks.filter(t => t.status === 'progress').map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => {
                    setSelectedTaskDetails(task);
                    setTaskNotesInput(task.description || '');
                  }}
                  className={`bg-surface p-4 rounded-lg border shadow-sm space-y-3 transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    task.isOverdue ? 'border-error/40 bg-error-container/40' : 'border-outline-variant'
                  } ${draggedTaskId === task.id ? 'opacity-30 border-primary' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-secondary-container text-primary text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTaskModal(task);
                        }}
                        className="p-1 text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-2 transition-colors cursor-pointer"
                        title="Sửa tác vụ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h5 className="text-xs font-bold text-on-surface leading-snug">{task.title}</h5>

                  <div className="flex items-center justify-between mt-2">
                    <div className={`flex items-center gap-1 text-xs ${task.isOverdue ? "text-error font-bold" : "text-on-surface-variant font-medium"}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{task.dueText}</span>
                    </div>
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="flex items-center gap-1 bg-surface-2 px-1.5 py-0.5 rounded text-on-surface-variant font-semibold text-[9px]" title={`${task.attachments.length} tệp đính kèm`}>
                        <Paperclip className="w-3 h-3 text-primary shrink-0" />
                        <span>{task.attachments.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-error-container flex items-center justify-center font-bold text-[9px] text-on-error-container">
                        {getTaskAssigneeInitial(task)}
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-medium truncate">{getTaskAssigneeName(task)}</span>
                    </div>
                    
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
                        disabled={isLoading}
                        className="text-[10px] text-on-surface-variant hover:text-on-surface font-medium cursor-pointer"
                      >
                        Hoãn
                      </button>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'done')}
                        disabled={isLoading}
                        className="text-[10px] bg-success text-on-primary font-bold hover:bg-on-success-container px-2 py-1 rounded whitespace-nowrap shadow-sm active:scale-95 transition-transform cursor-pointer inline-flex items-center gap-1"
                      >
                        Đã xong <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: HOÀN THÀNH (done) */}
        <div className="bg-surface rounded-xl border border-outline-variant flex flex-col opacity-90">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-2 rounded-t-xl select-none font-sans">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-success">Hoàn thành</h4>
              <span className="bg-success-container text-on-success-container text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'done').length}
              </span>
            </div>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, 'done')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'done')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] max-h-[350px] overflow-y-auto pr-2 transition-all duration-200 ${
              dragOverColumn === 'done' ? 'bg-success-container border-2 border-dashed border-success shadow-inner' : 'bg-surface-2'
            }`}
          >
            {tasks.filter(t => t.status === 'done').length === 0 ? (
              <p className="text-[11px] text-on-surface-variant text-center py-10">Cột trống</p>
            ) : (
              tasks.filter(t => t.status === 'done').map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => {
                    setSelectedTaskDetails(task);
                    setTaskNotesInput(task.description || '');
                  }}
                  className={`bg-surface p-4 rounded-lg border border-outline-variant hover:shadow-md shadow-sm space-y-3 min-h-[90px] transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    draggedTaskId === task.id ? 'opacity-30 border-success' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-surface-2 text-on-surface-variant line-through text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleOpenTaskModal(task)}
                        className="p-1 text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-2 transition-colors cursor-pointer"
                        title="Sửa tác vụ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h5 className="text-xs text-on-surface-variant leading-snug line-through font-medium">{task.title}</h5>

                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] text-on-surface-variant font-sans">{task.dueText}</span>
                      {task.attachments && task.attachments.length > 0 && (
                        <span className="flex items-center gap-0.5 bg-surface-2 border border-outline-variant px-1 py-0.5 rounded text-on-surface-variant font-semibold text-[8px]" title={`${task.attachments.length} tệp đính kèm`}>
                          <Paperclip className="w-2.5 h-2.5 text-on-surface-variant shrink-0" />
                          <span>{task.attachments.length}</span>
                        </span>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'progress')}
                        disabled={isLoading}
                        className="text-[10px] border border-outline-variant text-on-surface-variant hover:bg-surface-2 hover:text-on-surface-variant px-1.5 py-0.5 rounded font-bold whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
                      >
                        Mở lại
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      ) : activeTaskView === 'calendar' ? (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden text-left">
          <div className="p-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-on-surface">
                {calendarDays[0]?.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                {' - '}
                {calendarDays[6]?.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">Cột ngang là ngày, cột dọc là giờ. Click vào ô giờ để tạo task, click vào task để sửa hoặc đổi trạng thái.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => moveCalendarWeek(-1)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-2"
                aria-label="Tuần trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={resetCalendarWeek}
                className="h-9 px-3 rounded-lg border border-outline-variant text-xs font-bold hover:bg-surface-2"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => moveCalendarWeek(1)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-2"
                aria-label="Tuần sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="h-9 inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-2">
                <button
                  type="button"
                  onClick={() => setCalendarZoom(prev => Math.max(0.7, Number((prev - 0.1).toFixed(1))))}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-surface-2 text-on-surface-variant"
                  aria-label="Thu nhỏ calendar"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0.7"
                  max="1.6"
                  step="0.1"
                  value={calendarZoom}
                  onChange={event => setCalendarZoom(Number(event.target.value))}
                  className="w-24 accent-primary"
                  aria-label="Calendar zoom"
                />
                <button
                  type="button"
                  onClick={() => setCalendarZoom(prev => Math.min(1.6, Number((prev + 0.1).toFixed(1))))}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-surface-2 text-on-surface-variant"
                  aria-label="Phóng to calendar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="w-10 text-right text-[11px] font-bold text-on-surface-variant">{Math.round(calendarZoom * 100)}%</span>
              </div>
            </div>
          </div>

          <div ref={calendarScrollRef} className="max-h-[calc(100dvh-300px)] min-h-[420px] overflow-auto overscroll-contain">
            <div style={{ minWidth: 72 + calendarDayColumnWidth * 7 }}>
              <div
                className="grid bg-surface-2 border-b border-outline-variant sticky top-0 z-20 shadow-sm"
                style={{ gridTemplateColumns: `72px repeat(7, minmax(${calendarDayColumnWidth}px, 1fr))` }}
              >
                <div className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-on-surface-variant border-r border-outline-variant bg-surface-2">
                  Giờ
                </div>
                {calendarDays.map(day => (
                  <div key={day.key} className="px-3 py-2 text-center border-r border-outline-variant bg-surface-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                      {day.date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </p>
                    <p className={`mt-1 inline-flex min-w-8 h-8 items-center justify-center rounded-full text-xs font-bold ${
                      day.isToday ? 'bg-primary text-on-primary' : 'text-on-surface'
                    }`}>
                      {day.date.getDate()}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                {calendarHours.map(hour => (
                  <div
                    key={hour}
                    className="grid border-b border-outline-variant"
                    style={{ gridTemplateColumns: `72px repeat(7, minmax(${calendarDayColumnWidth}px, 1fr))` }}
                  >
                    <div className="px-3 py-2 text-center text-xs font-bold text-on-surface-variant bg-surface-2 border-r border-outline-variant">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    {calendarDays.map(day => {
                      const slotKey = `${day.key}-${String(hour).padStart(2, '0')}`;
                      const slotTasks = sortTasksForCalendarSlot(tasksByDateHour[slotKey] || []);
                      const slotDateTime = getSlotDateTime(day.key, hour);
                      const visibleSlotTasks = slotTasks.slice(0, 2);
                      const hiddenSlotTasksCount = Math.max(0, slotTasks.length - visibleSlotTasks.length);

                      return (
                        <div
                          key={slotKey}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenTaskModal(null, slotDateTime)}
                          onDragOver={(event) => handleCalendarSlotDragOver(event, slotKey)}
                          onDragLeave={() => setCalendarDragOverSlot(null)}
                          onDrop={(event) => handleCalendarSlotDrop(event, slotKey, slotDateTime)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleOpenTaskModal(null, slotDateTime);
                            }
                          }}
                          className={`border-r border-outline-variant p-1.5 hover:bg-surface-2 focus:outline-primary cursor-pointer overflow-y-auto transition-colors ${
                            calendarDragOverSlot === slotKey ? 'bg-primary/10 ring-2 ring-inset ring-primary/40' : 'bg-surface'
                          }`}
                          style={{ minHeight: calendarSlotHeight }}
                        >
                          <div className="space-y-1">
                            {visibleSlotTasks.map(task => (
                              <button
                                key={task.id}
                                type="button"
                                draggable
                                onDragStart={(event) => handleCalendarTaskDragStart(event, task.id)}
                                onDragEnd={handleCalendarTaskDragEnd}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenTaskModal(task);
                                }}
                                className={`w-full text-left rounded-lg border ${calendarTaskPaddingClass} shadow-sm hover:shadow transition-all cursor-grab active:cursor-grabbing ${
                                  calendarDraggedTaskId === task.id ? 'opacity-40 scale-[0.98]' : ''
                                } ${statusClassByTask(task.status)}`}
                                title="Sửa tác vụ"
                              >
                                <span className={`block ${calendarTaskTitleClass} font-bold truncate`}>{task.title}</span>
                                <span className="mt-0.5 flex items-center justify-between gap-2 text-[10px] opacity-80">
                                  <span className="truncate">{getTaskAssigneeName(task)}</span>
                                  <span className="shrink-0">{getTaskStatusLabel(task.status)}</span>
                                </span>
                              </button>
                            ))}
                            {hiddenSlotTasksCount > 0 && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCalendarSlotDetails({
                                    title: getSlotTitle(day.date, hour),
                                    tasks: slotTasks,
                                  });
                                }}
                                className="inline-flex max-w-full rounded-md border border-dashed border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-primary hover:bg-primary/20 transition-colors"
                              >
                                +{hiddenSlotTasksCount} task khác
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden text-left">
          <div className="p-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-on-surface capitalize">
                {calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">Click vào ngày để tạo task. Kéo task sang ngày khác để đổi deadline và giữ nguyên giờ.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveCalendarMonth(-1)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-2"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={resetCalendarMonth}
                className="h-9 px-3 rounded-lg border border-outline-variant text-xs font-bold hover:bg-surface-2"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => moveCalendarMonth(1)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-2"
                aria-label="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overscroll-contain">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-7 bg-surface-2 border-b border-outline-variant">
                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(dayLabel => (
                  <div key={dayLabel} className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-on-surface-variant border-r last:border-r-0 border-outline-variant">
                    {dayLabel}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthCalendarDays.map(day => {
                  const dayTasks = sortTasksForCalendarSlot(tasksByDate[day.key] || []);
                  const visibleTasks = dayTasks.slice(0, 3);
                  const hiddenTasksCount = Math.max(0, dayTasks.length - visibleTasks.length);

                  return (
                    <div
                      key={day.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenTaskModal(null, `${day.key}T09:00`)}
                      onDragOver={event => handleCalendarSlotDragOver(event, day.key)}
                      onDragLeave={() => setCalendarDragOverSlot(null)}
                      onDrop={event => handleMonthDayDrop(event, day.key)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleOpenTaskModal(null, `${day.key}T09:00`);
                        }
                      }}
                      className={`min-h-36 border-r border-b border-outline-variant p-2 cursor-pointer focus:outline-primary transition-colors ${
                        day.isCurrentMonth ? 'bg-surface hover:bg-surface-2' : 'bg-surface-2/70 text-on-surface-variant'
                      } ${calendarDragOverSlot === day.key ? 'bg-primary/10 ring-2 ring-inset ring-primary/40' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${
                          day.isToday ? 'bg-primary text-on-primary' : day.isCurrentMonth ? 'text-on-surface' : 'text-on-surface-variant'
                        }`}>
                          {day.date.getDate()}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="text-[10px] font-bold text-on-surface-variant">{dayTasks.length} task</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {visibleTasks.map(task => (
                          <button
                            key={task.id}
                            type="button"
                            draggable
                            onDragStart={event => handleCalendarTaskDragStart(event, task.id)}
                            onDragEnd={handleCalendarTaskDragEnd}
                            onClick={event => {
                              event.stopPropagation();
                              handleOpenTaskModal(task);
                            }}
                            className={`w-full text-left rounded-md border px-2 py-1.5 shadow-sm hover:shadow cursor-grab active:cursor-grabbing transition-all ${
                              calendarDraggedTaskId === task.id ? 'opacity-40 scale-[0.98]' : ''
                            } ${statusClassByTask(task.status)}`}
                            title={`${formatDueText(task.dueDate || task.dueText)} - ${getTaskAssigneeName(task)}`}
                          >
                            <span className="block text-[11px] font-bold truncate">{task.title}</span>
                            <span className="mt-0.5 flex items-center justify-between gap-1 text-[9px] opacity-80">
                              <span className="truncate">{getTaskAssigneeName(task)}</span>
                              <span className="shrink-0">
                                {getTaskTimeText(task)}
                              </span>
                            </span>
                          </button>
                        ))}
                        {hiddenTasksCount > 0 && (
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              setCalendarSlotDetails({
                                title: day.date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
                                tasks: dayTasks,
                              });
                            }}
                            className="inline-flex rounded-md border border-dashed border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20"
                          >
                            +{hiddenTasksCount} task khác
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Edit/Create Form Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingTask ? `Chỉnh sửa Tác vụ IT [${currentEditingTask.id}]` : 'Tạo Tác vụ công việc IT mới'}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer">&#x2715;</button>
            </div>
            <form onSubmit={handleSaveTaskSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Tiêu đề / Tên công việc *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Fix lỗi đồng bộ hóa POS CH Q1"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-primary"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mô tả</label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả chi tiết cho nhiệm vụ"
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Người đảm nhận *</label>
                  <select
                    required
                    value={taskAssigneeId}
                    disabled={assigneeUsers.length === 0}
                    onChange={e => {
                      const selectedUser = assigneeUsers.find(user => user.id === e.target.value);
                      setTaskAssigneeId(selectedUser?.id || '');
                      setTaskAssignee(selectedUser?.name || '');
                    }}
                    className="w-full px-3 py-2 border rounded-lg bg-surface focus:outline-primary disabled:bg-surface-2 disabled:text-on-surface-variant disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>
                      {assigneeUsers.length === 0 ? 'Không có user role 2' : 'Chọn người đảm nhận'}
                    </option>
                    {assigneeUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Hạn xử lý</label>
                  <input
                    type="datetime-local"
                    value={taskDue}
                    onChange={e => setTaskDue(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Trạng thái hiện tại</label>
                <select
                  value={taskStatusField}
                  onChange={e => setTaskStatusField(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-surface"
                >
                  <option value="pending">Chờ xử lý (Pending)</option>
                  <option value="progress">Đang thực hiện (In Progress)</option>
                  <option value="done">Hoàn thành (Done)</option>
                </select>
              </div>

              {/* Attachments Section */}
              <div className="border border-outline-variant rounded-xl p-3 bg-surface-2 text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-on-surface-variant text-xs">Đính kèm tài liệu hỗ trợ ({taskAttachments.length + pendingTaskFiles.length})</span>
                  <label className="text-[10px] text-primary hover:underline font-bold cursor-pointer select-none bg-surface border border-outline-variant px-2 py-1 rounded shadow-sm hover:bg-surface-2 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    <span>Thêm tệp</span>
                    <input
                      type="file"
                      multiple
                      disabled={isLoading}
                      className="hidden"
                      onChange={handleAddAttachmentClick}
                    />
                  </label>
                </div>
                {taskAttachments.length === 0 && pendingTaskFiles.length === 0 ? (
                  <p className="text-[10px] text-on-surface-variant italic text-center py-2">Chưa đính kèm tài liệu nào.</p>
                ) : (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {taskAttachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between bg-surface border border-outline-variant p-1.5 rounded-lg text-xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                          <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                          <button
                            type="button"
                            disabled={!currentEditingTask}
                            onClick={() => currentEditingTask && handleOpenAttachment(currentEditingTask.id, att)}
                            className="truncate font-medium text-primary hover:underline disabled:text-on-surface-variant disabled:no-underline text-left cursor-pointer disabled:cursor-default"
                          >
                            {att.name}
                          </button>
                          <span className="text-[9px] text-on-surface-variant">({att.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachmentClick(att.id)}
                          className="text-[10px] text-error hover:text-error font-bold px-1.5 py-0.5 rounded hover:bg-error-container cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                    {pendingTaskFiles.map((file, index) => (
                      <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between bg-primary-container/30 border border-primary/20 p-1.5 rounded-lg text-xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                          <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate font-medium text-on-surface-variant">{file.name}</span>
                          <span className="text-[9px] text-on-surface-variant">({formatAttachmentSize(file.size)} · chờ tải)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingTaskFiles(prev => prev.filter((_, pendingIndex) => pendingIndex !== index))}
                          className="text-[10px] text-error hover:text-error font-bold px-1.5 py-0.5 rounded hover:bg-error-container cursor-pointer"
                        >
                          Bỏ
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Đang lưu...' : 'Lưu tác vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {calendarSlotDetails && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-hidden border border-outline-variant text-left">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-outline-variant">
              <div>
                <h3 className="text-base font-bold text-on-surface">Danh sách tác vụ</h3>
                <p className="text-xs text-on-surface-variant mt-1">{calendarSlotDetails.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setCalendarSlotDetails(null)}
                className="text-on-surface-variant hover:text-on-surface font-bold cursor-pointer px-2 py-1 rounded hover:bg-surface-2"
              >
                &#x2715;
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[70dvh] overflow-y-auto bg-surface-2">
              {calendarSlotDetails.tasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    setCalendarSlotDetails(null);
                    handleOpenTaskModal(task);
                  }}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 shadow-sm hover:shadow transition-shadow bg-surface ${statusClassByTask(task.status)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{task.title}</p>
                      <p className="text-xs opacity-80 mt-1 truncate">{getTaskAssigneeName(task)}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold">{getTaskStatusLabel(task.status)}</span>
                  </div>
                  {task.description && (
                    <p className="text-xs opacity-80 mt-2 line-clamp-2">{task.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Details Panel Modal */}
      {selectedTaskDetails && (
        <div className="modal-overlay">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-warning-container text-warning">
                  <Plus className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-bold text-on-surface-variant bg-surface-2 px-2 py-0.5 rounded">
                  {selectedTaskDetails.id}
                </span>
                <span className="text-xs text-on-surface-variant font-bold">Chi tiết tác vụ IT</span>
              </div>
              <button
                onClick={() => setSelectedTaskDetails(null)}
                className="text-on-surface-variant hover:text-on-surface font-bold px-2 py-1 rounded hover:bg-surface-2 transition-colors cursor-pointer"
                type="button"
              >
                &#x2715;
              </button>
            </div>

            <div className="space-y-4 text-sm text-on-surface">
              <div>
                <h3 className="text-base font-extrabold text-on-surface leading-snug">
                  {selectedTaskDetails.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-surface-2 border border-outline-variant p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide block mb-1">Trạng thái</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedTaskDetails.status === 'pending'
                        ? 'bg-surface-2 text-on-surface'
                        : selectedTaskDetails.status === 'progress'
                        ? 'bg-secondary-container text-primary'
                        : 'bg-success-container text-on-success-container'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedTaskDetails.status === 'pending'
                          ? 'bg-on-surface-variant'
                          : selectedTaskDetails.status === 'progress'
                          ? 'bg-primary'
                          : 'bg-success'
                      }`}></span>
                      {selectedTaskDetails.status === 'pending' ? 'Chờ xử lý' : selectedTaskDetails.status === 'progress' ? 'Đang làm' : 'Hoàn thành'}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-2 border border-outline-variant p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide block mb-1">Hạn xử lý</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-error">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{selectedTaskDetails.dueText}</span>
                  </div>
                </div>
              </div>

              {/* Assignee details */}
              <div className="flex items-center gap-3 bg-surface-2 border border-outline-variant p-3.5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {getTaskAssigneeInitial(selectedTaskDetails)}
                </div>
                <div className="text-xs">
                  <p className="font-extrabold text-on-surface leading-snug">Phụ trách kỹ thuật</p>
                  <p className="text-on-surface-variant font-medium mt-0.5">{getTaskAssigneeName(selectedTaskDetails)}</p>
                </div>
              </div>

              {/* Notes Area */}
              <div className="space-y-1.5 text-left">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">Nhật ký xử lý & Ghi chú</span>
                <textarea
                  rows={3}
                  value={taskNotesInput}
                  onChange={e => setTaskNotesInput(e.target.value)}
                  placeholder="Ghi chú chi tiết linh kiện máy thay thế, tiến trình..."
                  className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:border-primary bg-surface-2/50 hover:bg-surface-2 focus:bg-surface transition-all resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={isLoading}
                    className="btn-primary text-[11px]"
                  >
                    {isLoading ? 'Đang lưu...' : 'Lưu ghi chú'}
                  </button>
                </div>
              </div>

              {/* Attachments Section in detail */}
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">Tài liệu đính kèm</span>
                  <label className="text-[10px] text-primary hover:underline font-bold cursor-pointer select-none flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Gửi tệp mới
                    <input
                      type="file"
                      multiple
                      disabled={isLoading}
                      className="hidden"
                      onChange={handleAddAttachmentClick}
                    />
                  </label>
                </div>

                <div className="border border-outline-variant rounded-xl p-3 bg-surface-2/30 space-y-2">
                  {!selectedTaskDetails.attachments || selectedTaskDetails.attachments.length === 0 ? (
                    <p className="text-[11px] text-on-surface-variant italic text-center py-2">Không có tệp đính kèm nào.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {selectedTaskDetails.attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between bg-surface border border-outline-variant p-2 rounded-xl text-xs">
                          <div className="flex items-center gap-2 truncate max-w-[80%]">
                            <PaperclipIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(selectedTaskDetails.id, att)}
                              className="truncate font-semibold text-primary hover:underline text-left cursor-pointer"
                            >
                              {att.name}
                            </button>
                            <span className="text-[10px] text-on-surface-variant">({att.size})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteAttachmentClick(att.id)}
                            className="text-[10px] text-error hover:text-error font-bold px-2 py-1 rounded hover:bg-error-container cursor-pointer"
                          >
                            Xóa tệp
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex sm:justify-end gap-2.5 pt-4 border-t border-outline-variant">
                <button
                  onClick={() => setSelectedTaskDetails(null)}
                  className="btn-secondary w-full sm:w-auto px-5 py-2 text-xs"
                >
                  Hoàn tất xem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
