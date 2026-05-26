import { useState } from 'react';
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
    setDragOverColumn(column);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, column: 'pending' | 'progress' | 'done') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (id) {
      await updateTaskStatus(id, column);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
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
