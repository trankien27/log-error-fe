import React from 'react';
import { Plus, Clock, Paperclip, CheckCircle } from 'lucide-react';
import { Task } from '../types';

interface TasksTabProps {
  tasks: Task[];
  draggedTaskId: string | null;
  dragOverColumn: 'pending' | 'progress' | 'done' | null;
  handleOpenTaskModal: (task?: Task | null) => void;
  setSelectedTaskDetails: (task: Task | null) => void;
  setTaskNotesInput: (val: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragOver: (e: React.DragEvent, column: 'pending' | 'progress' | 'done') => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, column: 'pending' | 'progress' | 'done') => void;
  moveTaskStatus: (id: string, newStat: 'pending' | 'progress' | 'done') => void;
}

export default function TasksTab({
  tasks,
  draggedTaskId,
  dragOverColumn,
  handleOpenTaskModal,
  setSelectedTaskDetails,
  setTaskNotesInput,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  moveTaskStatus,
}: TasksTabProps) {
  return (
    <div className="space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Bảng Kanban điều phối nhiệm vụ IT</h2>
          <p className="text-xs text-gray-500 mt-1">Hệ thống hỗ trợ IT phân bổ công việc bằng cách kéo thả hoặc click thao tác nhanh.</p>
        </div>
        <button
          onClick={() => handleOpenTaskModal()}
          className="bg-primary text-white hover:bg-primary-container px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Khởi tạo Tác vụ
        </button>
      </div>

      {/* Kanban columns grid wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-left">
        
        {/* Column 1: CHỜ XỬ LÝ (pending) */}
        <div className="bg-white rounded-xl border border-outline-variant flex flex-col">
          {/* Title category */}
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-gray-50 rounded-t-xl select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 font-sans">Chờ xử lý</h4>
              <span className="bg-gray-200 text-gray-700 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'pending').length}
              </span>
            </div>
          </div>

          {/* Body task list */}
          <div
            onDragOver={(e) => handleDragOver(e, 'pending')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'pending')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] transition-all duration-200 ${
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
                    setTaskNotesInput(task.notes || '');
                  }}
                  className={`bg-white p-4 rounded-lg border border-outline-variant hover:shadow-md hover:border-primary/40 shadow-sm space-y-3 transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    draggedTaskId === task.id ? 'opacity-30 border-primary' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-[#f0f0fb] text-[#191b23] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 leading-snug">{task.title}</h5>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-red-600 font-medium">
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
                        {task.assigneeName.charAt(0)}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium truncate">{task.assigneeName}</span>
                    </div>
                    
                    {/* Fast status actions */}
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveTaskStatus(task.id, 'progress')}
                        className="text-[10px] border border-blue-200 text-[#004ac6] hover:bg-blue-50 px-2 py-0.5 rounded font-bold whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
                        title="Chuyển sang Đang làm"
                      >
                        Bắt đầu &rarr;
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
          {/* Title category */}
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-gray-50 rounded-t-xl select-none font-sans">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#004ac6]">Đang thực hiện</h4>
              <span className="bg-[#dbe1ff] text-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'progress').length}
              </span>
            </div>
          </div>

          {/* Body task list */}
          <div
            onDragOver={(e) => handleDragOver(e, 'progress')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'progress')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] transition-all duration-200 ${
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
                    setTaskNotesInput(task.notes || '');
                  }}
                  className={`bg-white p-4 rounded-lg border shadow-sm space-y-3 transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    task.isOverdue ? 'border-red-400 bg-red-50/50' : 'border-outline-variant'
                  } ${draggedTaskId === task.id ? 'opacity-30 border-primary' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-blue-50 text-blue-600 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                    {task.isOverdue && (
                      <span className="bg-red-600 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-sans">TRỄ</span>
                    )}
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
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center font-bold text-[9px] text-red-600">
                        {task.assigneeName.charAt(0)}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium truncate">{task.assigneeName}</span>
                    </div>
                    
                    {/* Fast status actions */}
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveTaskStatus(task.id, 'pending')}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium cursor-pointer"
                        title="Trở lại Chờ xử lý"
                      >
                        Hoãn
                      </button>
                      <button
                        onClick={() => moveTaskStatus(task.id, 'done')}
                        className="text-[10px] bg-emerald-600 text-white font-bold hover:bg-emerald-700 px-2 py-1 rounded whitespace-nowrap shadow-sm active:scale-95 transition-transform cursor-pointer"
                        title="Chuyển sang Đã xong"
                      >
                        Đã xong &check;
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
          {/* Title category */}
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-gray-50 rounded-t-xl select-none font-sans">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800">Hoàn thành</h4>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status === 'done').length}
              </span>
            </div>
          </div>

          {/* Body task list */}
          <div
            onDragOver={(e) => handleDragOver(e, 'done')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'done')}
            className={`p-4 space-y-3 rounded-b-xl min-h-[350px] transition-all duration-200 ${
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
                    setTaskNotesInput(task.notes || '');
                  }}
                  className={`bg-white p-4 rounded-lg border border-outline-variant hover:shadow-md shadow-sm space-y-3 min-h-[90px] transition-all cursor-pointer hover:-translate-y-0.5 select-none ${
                    draggedTaskId === task.id ? 'opacity-30 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-gray-400 line-through text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                    <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <h5 className="text-xs text-gray-400 leading-snug line-through font-medium">{task.title}</h5>

                  <div className="flex justify-between items-center pt-2 border-t border-[#f1f5f9]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] text-gray-400 font-sans">{task.dueText}</span>
                      {task.attachments && task.attachments.length > 0 && (
                        <span className="flex items-center gap-0.5 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded text-gray-400 font-semibold text-[8px]" title={`${task.attachments.length} tệp đính kèm`}>
                          <Paperclip className="w-2.5 h-2.5 text-slate-350 shrink-0" />
                          <span>{task.attachments.length}</span>
                        </span>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveTaskStatus(task.id, 'progress')}
                        className="text-[10px] border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
                        type="button"
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
    </div>
  );
}
