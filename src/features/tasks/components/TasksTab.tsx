import React, { useEffect, useRef, useState } from 'react';
import { Plus, Clock, Paperclip, Edit2, Paperclip as PaperclipIcon, Columns3, CalendarDays, ChevronLeft, ChevronRight, ArrowRight, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { useTasksStore } from '../../../stores/useTasksStore';
import { useUsersStore } from '../../../stores/useUsersStore';
import { useKanbanDragDrop } from '../hooks/useKanbanDragDrop';
import { Task, TaskAttachment } from '../../../types';

export default function TasksTab() {
  const {
    tasks,
    isLoading,
    saveTask,
    updateTaskStatus,
    updateTaskNotes,
    addAttachment,
    deleteAttachment,
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
  const [taskNotesInput, setTaskNotesInput] = useState('');
  const [activeTaskView, setActiveTaskView] = useState<'kanban' | 'calendar'>('calendar');
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
  const isTaskAssigneeRole = (role: unknown) => role === 2 || String(role).toLowerCase() === 'it support';
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
      if (currentEditingTask) {
        await saveTask({ ...payload, id: currentEditingTask.id });
        toast.success('Cập nhật tác vụ thành công.');
      } else {
        await saveTask(payload);
        toast.success('Tạo tác vụ thành công.');
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
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu tác vụ.');
    }
  };

  const handleAddAttachmentClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const newFile: TaskAttachment = {
      name: file.name,
      size: (file.size / 1024 > 1024) 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`,
      type: file.type,
      url: URL.createObjectURL(file)
    };

    if (selectedTaskDetails) {
      try {
        await addAttachment(selectedTaskDetails.id, newFile);
        toast.success('Đã thêm tệp đính kèm.');
      } catch (err: any) {
        toast.error(err.message || 'Không thể thêm tệp đính kèm.');
      }
    } else {
      setTaskAttachments(prev => [...prev, newFile]);
      toast.success('Đã thêm tệp vào form.');
    }
  };

  const handleDeleteAttachmentClick = async (fileName: string) => {
    if (selectedTaskDetails) {
      try {
        await deleteAttachment(selectedTaskDetails.id, fileName);
        toast.success('Đã xóa tệp đính kèm.');
      } catch (err: any) {
        toast.error(err.message || 'Không thể xóa tệp đính kèm.');
      }
    } else {
      setTaskAttachments(prev => prev.filter(att => att.name !== fileName));
      toast.success('Đã xóa tệp khỏi form.');
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

  const statusClassByTask = (status: Task['status']) => {
    if (status === 'pending') return 'border-gray-200 bg-gray-50 text-gray-700';
    if (status === 'progress') return 'border-blue-200 bg-blue-50 text-[#004ac6]';
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
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
          <h2 className="text-xl font-bold text-gray-900 font-sans">Bảng Kanban điều phối nhiệm vụ IT</h2>
          <p className="text-xs text-gray-500 mt-1">Hệ thống hỗ trợ IT phân bổ công việc bằng cách kéo thả hoặc click thao tác nhanh.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="inline-flex rounded-lg border border-outline-variant bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTaskView('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                activeTaskView === 'kanban' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Columns3 className="w-4 h-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setActiveTaskView('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                activeTaskView === 'calendar' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Calendar
            </button>
          </div>
          <button
            onClick={() => handleOpenTaskModal()}
            className="bg-primary text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Khởi tạo Tác vụ
          </button>
        </div>
      </div>

      {/* Kanban columns grid wrapper */}
      {activeTaskView === 'kanban' ? (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-left">
        
        {/* Column 1: CHỜ XỬ LÝ (pending) */}
        <div className="bg-white rounded-xl border border-outline-variant flex flex-col">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-gray-50 rounded-t-xl select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 font-sans">Chờ xử lý</h4>
              <span className="bg-gray-200 text-gray-700 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'pending').length}
              </span>
            </div>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, 'pending')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'pending')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] max-h-[350px] overflow-y-auto pr-2 transition-all duration-200 ${
              dragOverColumn === 'pending' ? 'bg-[#e0e7ff] border-2 border-dashed border-primary shadow-inner' : 'bg-[#f8fafc]'
            }`}
          >
            {tasks.filter(t => t.status === 'pending').length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-10">Cột trống</p>
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
                  className={`bg-white p-4 rounded-lg border border-outline-variant hover:shadow-md hover:border-primary/40 shadow-sm space-y-3 transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    draggedTaskId === task.id ? 'opacity-30 border-primary' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                     <h5 className="text-xs font-bold text-gray-900 leading-snug">{task.title}</h5>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTaskModal(task);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                      title="Sửa tác vụ"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                 

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-red-650 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{task.dueText}</span>
                    </div>
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="flex items-center gap-1 bg-[#f1f5f9] px-1.5 py-0.5 rounded text-gray-500 font-semibold text-[9px]" title={`${task.attachments.length} tệp đính kèm`}>
                        <Paperclip className="w-3 h-3 text-primary shrink-0" />
                        <span>{task.attachments.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#f1f5f9]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center font-bold text-[9px] text-[#004ac6]">
                        {getTaskAssigneeInitial(task)}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium truncate">{getTaskAssigneeName(task)}</span>
                    </div>
                    
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'progress')}
                        disabled={isLoading}
                        className="text-[10px] border border-blue-200 text-[#004ac6] hover:bg-blue-50 px-2 py-0.5 rounded font-bold whitespace-nowrap active:scale-95 transition-transform cursor-pointer inline-flex items-center gap-1"
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
        <div className="bg-white rounded-xl border border-outline-variant flex flex-col">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-gray-50 rounded-t-xl select-none font-sans">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#004ac6]">Đang thực hiện</h4>
              <span className="bg-[#dbe1ff] text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'progress').length}
              </span>
            </div>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, 'progress')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'progress')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] max-h-[350px] overflow-y-auto pr-2 transition-all duration-200 ${
              dragOverColumn === 'progress' ? 'bg-[#e0e7ff] border-2 border-dashed border-primary shadow-inner' : 'bg-[#f8fafc]'
            }`}
          >
            {tasks.filter(t => t.status === 'progress').length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-10">Cột trống</p>
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
                  className={`bg-white p-4 rounded-lg border shadow-sm space-y-3 transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    task.isOverdue ? 'border-red-400 bg-red-50/50' : 'border-outline-variant'
                  } ${draggedTaskId === task.id ? 'opacity-30 border-primary' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-blue-50 text-blue-600 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTaskModal(task);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Sửa tác vụ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 leading-snug">{task.title}</h5>

                  <div className="flex items-center justify-between mt-2">
                    <div className={`flex items-center gap-1 text-xs ${task.isOverdue ? 'text-red-700 font-bold' : 'text-gray-500 font-medium'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{task.dueText}</span>
                    </div>
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="flex items-center gap-1 bg-[#f1f5f9] px-1.5 py-0.5 rounded text-gray-500 font-semibold text-[9px]" title={`${task.attachments.length} tệp đính kèm`}>
                        <Paperclip className="w-3 h-3 text-primary shrink-0" />
                        <span>{task.attachments.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#f1f5f9]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center font-bold text-[9px] text-red-650">
                        {getTaskAssigneeInitial(task)}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium truncate">{getTaskAssigneeName(task)}</span>
                    </div>
                    
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
                        disabled={isLoading}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium cursor-pointer"
                      >
                        Hoãn
                      </button>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'done')}
                        disabled={isLoading}
                        className="text-[10px] bg-emerald-600 text-white font-bold hover:bg-emerald-700 px-2 py-1 rounded whitespace-nowrap shadow-sm active:scale-95 transition-transform cursor-pointer inline-flex items-center gap-1"
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
        <div className="bg-white rounded-xl border border-outline-variant flex flex-col opacity-90">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-gray-50 rounded-t-xl select-none font-sans">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800">Hoàn thành</h4>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'done').length}
              </span>
            </div>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, 'done')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'done')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] max-h-[350px] overflow-y-auto pr-2 transition-all duration-200 ${
              dragOverColumn === 'done' ? 'bg-[#e2f1e9] border-2 border-dashed border-emerald-500 shadow-inner' : 'bg-[#f8fafc]'
            }`}
          >
            {tasks.filter(t => t.status === 'done').length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-10">Cột trống</p>
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
                  className={`bg-white p-4 rounded-lg border border-outline-variant hover:shadow-md shadow-sm space-y-3 min-h-[90px] transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    draggedTaskId === task.id ? 'opacity-30 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-gray-400 line-through text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleOpenTaskModal(task)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Sửa tác vụ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h5 className="text-xs text-gray-400 leading-snug line-through font-medium">{task.title}</h5>

                  <div className="flex justify-between items-center pt-2 border-t border-[#f1f5f9]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] text-gray-400 font-sans">{task.dueText}</span>
                      {task.attachments && task.attachments.length > 0 && (
                        <span className="flex items-center gap-0.5 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded text-gray-400 font-semibold text-[8px]" title={`${task.attachments.length} tệp đính kèm`}>
                          <Paperclip className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span>{task.attachments.length}</span>
                        </span>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'progress')}
                        disabled={isLoading}
                        className="text-[10px] border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
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
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden text-left">
          <div className="p-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900">
                {calendarDays[0]?.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                {' - '}
                {calendarDays[6]?.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Cột ngang là ngày, cột dọc là giờ. Click vào ô giờ để tạo task, click vào task để sửa hoặc đổi trạng thái.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => moveCalendarWeek(-1)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant hover:bg-gray-50"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={resetCalendarWeek}
                className="h-9 px-3 rounded-lg border border-outline-variant text-xs font-bold hover:bg-gray-50"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => moveCalendarWeek(1)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-outline-variant hover:bg-gray-50"
                aria-label="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="h-9 inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-2">
                <button
                  type="button"
                  onClick={() => setCalendarZoom(prev => Math.max(0.7, Number((prev - 0.1).toFixed(1))))}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-50 text-gray-600"
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
                  className="w-24 accent-[#004ac6]"
                  aria-label="Calendar zoom"
                />
                <button
                  type="button"
                  onClick={() => setCalendarZoom(prev => Math.min(1.6, Number((prev + 0.1).toFixed(1))))}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-50 text-gray-600"
                  aria-label="Phóng to calendar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="w-10 text-right text-[11px] font-bold text-gray-500">{Math.round(calendarZoom * 100)}%</span>
              </div>
            </div>
          </div>

          <div ref={calendarScrollRef} className="max-h-[calc(100dvh-300px)] min-h-[420px] overflow-auto overscroll-contain">
            <div style={{ minWidth: 72 + calendarDayColumnWidth * 7 }}>
              <div
                className="grid bg-gray-50 border-b border-outline-variant sticky top-0 z-20 shadow-sm"
                style={{ gridTemplateColumns: `72px repeat(7, minmax(${calendarDayColumnWidth}px, 1fr))` }}
              >
                <div className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-500 border-r border-outline-variant bg-gray-50">
                  Giờ
                </div>
                {calendarDays.map(day => (
                  <div key={day.key} className="px-3 py-2 text-center border-r border-outline-variant bg-gray-50">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      {day.date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </p>
                    <p className={`mt-1 inline-flex min-w-8 h-8 items-center justify-center rounded-full text-xs font-bold ${
                      day.isToday ? 'bg-primary text-white' : 'text-gray-800'
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
                    <div className="px-3 py-2 text-center text-xs font-bold text-gray-500 bg-gray-50 border-r border-outline-variant">
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
                          className={`border-r border-outline-variant p-1.5 hover:bg-[#f8fafc] focus:outline-[#004ac6] cursor-pointer overflow-y-auto transition-colors ${
                            calendarDragOverSlot === slotKey ? 'bg-blue-50 ring-2 ring-inset ring-[#004ac6]/40' : 'bg-white'
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
                                className="inline-flex max-w-full rounded-md border border-dashed border-[#004ac6]/30 bg-blue-50/70 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-[#004ac6] hover:bg-blue-100 transition-colors"
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
      )}

      {/* Task Edit/Create Form Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-lg font-bold text-on-surface">
                {currentEditingTask ? `Chỉnh sửa Tác vụ IT [${currentEditingTask.id}]` : 'Tạo Tác vụ công việc IT mới'}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">&#x2715;</button>
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mô tả</label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả chi tiết cho nhiệm vụ"
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6] resize-none"
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
                    className="w-full px-3 py-2 border rounded-lg bg-white focus:outline-[#004ac6] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#004ac6]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Trạng thái hiện tại</label>
                <select
                  value={taskStatusField}
                  onChange={e => setTaskStatusField(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="pending">Chờ xử lý (Pending)</option>
                  <option value="progress">Đang thực hiện (In Progress)</option>
                  <option value="done">Hoàn thành (Done)</option>
                </select>
              </div>

              {/* Attachments Section */}
              <div className="border border-outline-variant rounded-xl p-3 bg-[#f8fafc] text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700 text-xs">Đính kèm tài liệu hỗ trợ ({taskAttachments.length})</span>
                  <label className="text-[10px] text-primary hover:underline font-bold cursor-pointer select-none bg-white border border-outline-variant px-2 py-1 rounded shadow-sm hover:bg-gray-50 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    <span>Thêm tệp</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAddAttachmentClick}
                    />
                  </label>
                </div>
                {taskAttachments.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic text-center py-2">Chưa đính kèm tài liệu nào.</p>
                ) : (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {taskAttachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-gray-150 p-1.5 rounded-lg text-xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                          <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate font-medium text-gray-700">{att.name}</span>
                          <span className="text-[9px] text-gray-400">({att.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachmentClick(att.name)}
                          className="text-[10px] text-red-600 hover:text-red-700 font-bold px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer"
                        >
                          Xóa
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
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Đang lưu...' : 'Lưu tác vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {calendarSlotDetails && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-hidden border border-outline-variant text-left">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-outline-variant">
              <div>
                <h3 className="text-base font-bold text-gray-900">Task trong khung giờ</h3>
                <p className="text-xs text-gray-500 mt-1">{calendarSlotDetails.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setCalendarSlotDetails(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer px-2 py-1 rounded hover:bg-gray-100"
              >
                &#x2715;
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[70dvh] overflow-y-auto bg-[#f8fafc]">
              {calendarSlotDetails.tasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    setCalendarSlotDetails(null);
                    handleOpenTaskModal(task);
                  }}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 shadow-sm hover:shadow transition-shadow bg-white ${statusClassByTask(task.status)}`}
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
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 border border-outline-variant text-left">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                  <Plus className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {selectedTaskDetails.id}
                </span>
                <span className="text-xs text-gray-550 font-bold">Chi tiết tác vụ IT</span>
              </div>
              <button
                onClick={() => setSelectedTaskDetails(null)}
                className="text-gray-400 hover:text-gray-650 font-bold px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                type="button"
              >
                &#x2715;
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#191b23]">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                  {selectedTaskDetails.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          ? 'bg-primary'
                          : 'bg-emerald-500'
                      }`}></span>
                      {selectedTaskDetails.status === 'pending' ? 'Chờ xử lý' : selectedTaskDetails.status === 'progress' ? 'Đang làm' : 'Hoàn thành'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Hạn xử lý</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-650">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{selectedTaskDetails.dueText}</span>
                  </div>
                </div>
              </div>

              {/* Assignee details */}
              <div className="flex items-center gap-3 bg-[#f8fafc] border border-outline-variant p-3.5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {getTaskAssigneeInitial(selectedTaskDetails)}
                </div>
                <div className="text-xs">
                  <p className="font-extrabold text-gray-900 leading-snug">Phụ trách kỹ thuật</p>
                  <p className="text-gray-500 font-medium mt-0.5">{getTaskAssigneeName(selectedTaskDetails)}</p>
                </div>
              </div>

              {/* Notes Area */}
              <div className="space-y-1.5 text-left">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Nhật ký xử lý & Ghi chú</span>
                <textarea
                  rows={3}
                  value={taskNotesInput}
                  onChange={e => setTaskNotesInput(e.target.value)}
                  placeholder="Ghi chú chi tiết linh kiện máy thay thế, tiến trình..."
                  className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:border-[#004ac6] bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={isLoading}
                    className="bg-[#004ac6] hover:bg-primary-container text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer select-none active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Đang lưu...' : 'Lưu ghi chú'}
                  </button>
                </div>
              </div>

              {/* Attachments Section in detail */}
              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Tài liệu đính kèm</span>
                  <label className="text-[10px] text-primary hover:underline font-bold cursor-pointer select-none flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Gửi tệp mới
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAddAttachmentClick}
                    />
                  </label>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/30 space-y-2">
                  {!selectedTaskDetails.attachments || selectedTaskDetails.attachments.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic text-center py-2">Không có tệp đính kèm nào.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {selectedTaskDetails.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-[#f1f5f9] p-2 rounded-xl text-xs">
                          <div className="flex items-center gap-2 truncate max-w-[80%]">
                            <PaperclipIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate font-semibold text-gray-800">{att.name}</span>
                            <span className="text-[10px] text-gray-400">({att.size})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteAttachmentClick(att.name)}
                            className="text-[10px] text-red-600 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 cursor-pointer"
                          >
                            Xóa tệp
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex sm:justify-end gap-2.5 pt-4 border-t border-gray-150">
                <button
                  onClick={() => setSelectedTaskDetails(null)}
                  className="w-full sm:w-auto px-5 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-transform active:scale-95 text-xs cursor-pointer"
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
