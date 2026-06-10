import { useState } from 'react';
import { toast } from 'sonner';
import { useTasksStore } from '@/stores/useTasksStore';

export function useKanbanDragDrop() {
  const { updateTaskStatus } = useTasksStore();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'pending' | 'progress' | 'done' | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, column: 'pending' | 'progress' | 'done') => {
    e.preventDefault();
    setDragOverColumn((current) => (current === column ? current : column));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, column: 'pending' | 'progress' | 'done') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverColumn(null);

    if (id) {
      updateTaskStatus(id, column).catch((err: any) => {
        toast.error(err.message || 'Không thể cập nhật trạng thái.');
      });
    }
  };

  return {
    draggedTaskId,
    dragOverColumn,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
