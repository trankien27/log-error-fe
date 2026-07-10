import { useState } from 'react';
import { Button, Select, Table, Tag, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import {
  AutoArrangeEmployeeRule,
  AutoArrangePreviewItem,
  AutoArrangeShiftOption,
} from '../../types/workScheduleArrange.types';
import { formatWorkDateLabel } from '../../utils/week.utils';
import AutoArrangeSummaryPanel from './AutoArrangeSummaryPanel';

type PreviewRow = {
  userId: string;
  userName: string;
  targetHours: number;
  itemsByDate: Record<string, AutoArrangePreviewItem[]>;
};

type Props = {
  employees: AutoArrangeEmployeeRule[];
  shifts: AutoArrangeShiftOption[];
  weekDates: string[];
  previewItems: AutoArrangePreviewItem[];
  summary: {
    coverageRate: number;
    enoughShiftCount: number;
    understaffedShiftCount: number;
    underTargetEmployeeCount: number;
    overTargetEmployeeCount: number;
  } | null;
  warnings: string[];
  conflicts: string[];
  onChangeItem: <K extends keyof AutoArrangePreviewItem>(clientId: string, field: K, value: AutoArrangePreviewItem[K]) => void;
  onRemoveItem: (clientId: string) => void;
};

export default function AutoArrangePreviewStep({
  employees,
  shifts,
  weekDates,
  previewItems,
  summary,
  warnings,
  conflicts,
  onChangeItem,
  onRemoveItem,
}: Props) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const rows: PreviewRow[] = employees.map(employee => ({
    userId: employee.userId,
    userName: employee.userName,
    targetHours: employee.targetHours,
    itemsByDate: weekDates.reduce<Record<string, AutoArrangePreviewItem[]>>((result, date) => {
      result[date] = previewItems.filter(item => item.userId === employee.userId && item.workDate === date);
      return result;
    }, {}),
  }));

  const userOptions = employees.map(employee => ({ value: employee.userId, label: employee.userName }));
  const shiftOptions = shifts.map(shift => ({ value: shift.id, label: `${shift.code} - ${shift.name}` }));

  const getCellKey = (userId: string, workDate: string) => `${userId}__${workDate}`;

  const handleDropItem = (targetUserId: string, targetWorkDate: string) => {
    const clientId = draggedItemId;
    setDraggedItemId(null);
    setDragOverCell(null);
    if (!clientId) return;

    const item = previewItems.find(candidate => candidate.clientId === clientId);
    const employee = employees.find(candidate => candidate.userId === targetUserId);
    if (!item || !employee) return;
    if (item.userId === targetUserId && item.workDate === targetWorkDate) return;

    onChangeItem(clientId, 'userId', targetUserId);
    onChangeItem(clientId, 'userName', employee.userName);
    onChangeItem(clientId, 'workDate', targetWorkDate);
  };

  const columns: ColumnsType<PreviewRow> = [
    {
      title: 'Nhân viên',
      dataIndex: 'userName',
      fixed: 'left',
      width: 180,
      render: (_, row) => {
        const totalHours = previewItems
          .filter(item => item.userId === row.userId)
          .reduce((total, item) => total + item.paidWorkingHours, 0);
        const diff = totalHours - row.targetHours;

        return (
          <div>
            <Typography.Text strong>{row.userName}</Typography.Text>
            <Typography.Text type={diff > 0 ? 'danger' : diff < 0 ? 'warning' : 'success'} className="block text-xs">
              {totalHours}h / {row.targetHours}h ({diff >= 0 ? '+' : ''}{diff}h)
            </Typography.Text>
          </div>
        );
      },
    },
    ...weekDates.map(date => ({
      title: formatWorkDateLabel(date),
      key: date,
      width: 180,
      render: (_: unknown, row: PreviewRow) => {
        const cellKey = getCellKey(row.userId, date);
        const isDragOver = dragOverCell === cellKey;

        return (
          <div
            className={`min-h-24 rounded-lg border border-dashed p-1.5 transition-colors ${
              isDragOver ? 'border-primary bg-blue-50' : 'border-transparent'
            }`}
            onDragOver={event => {
              if (!draggedItemId) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDragOverCell(cellKey);
            }}
            onDragLeave={() => setDragOverCell(current => (current === cellKey ? null : current))}
            onDrop={event => {
              event.preventDefault();
              handleDropItem(row.userId, date);
            }}
          >
            <div className="space-y-2">
              {(row.itemsByDate[date] || []).map(item => {
                const hasError = item.conflicts.length > 0;
                const hasWarning = item.warnings.length > 0;
                return (
                  <div
                    key={item.clientId}
                    draggable
                    onDragStart={event => {
                      setDraggedItemId(item.clientId);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.clientId);
                    }}
                    onDragEnd={() => {
                      setDraggedItemId(null);
                      setDragOverCell(null);
                    }}
                    className={`rounded border p-2 space-y-2 transition-all cursor-grab active:cursor-grabbing ${
                      draggedItemId === item.clientId ? 'opacity-40 ring-2 ring-primary/30' : ''
                    } ${hasError ? 'border-red-300 bg-red-50' : hasWarning ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}
                    title="Kéo thả sang ô nhân viên/ngày khác để đổi ca đề xuất"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Tag color={hasError ? 'red' : hasWarning ? 'gold' : 'blue'}>{item.shiftCode}</Tag>
                      <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => onRemoveItem(item.clientId)} />
                    </div>
                    <Select
                      size="small"
                      className="w-full"
                      value={item.userId}
                      options={userOptions}
                      onChange={value => {
                        const employee = employees.find(option => option.userId === value);
                        onChangeItem(item.clientId, 'userId', value);
                        onChangeItem(item.clientId, 'userName', employee?.userName || item.userName);
                      }}
                    />
                    <Select
                      size="small"
                      className="w-full"
                      value={item.shiftId}
                      options={shiftOptions}
                      onChange={value => {
                        const shift = shifts.find(option => option.id === value);
                        if (!shift) return;
                        onChangeItem(item.clientId, 'shiftId', shift.id);
                        onChangeItem(item.clientId, 'shiftCode', shift.code);
                        onChangeItem(item.clientId, 'shiftName', shift.name);
                        onChangeItem(item.clientId, 'startTime', shift.startTime);
                        onChangeItem(item.clientId, 'endTime', shift.endTime);
                        onChangeItem(item.clientId, 'paidWorkingHours', shift.paidWorkingHours);
                      }}
                    />
                    {(item.conflicts.length > 0 || item.warnings.length > 0) && (
                      <Typography.Text type={hasError ? 'danger' : 'warning'} className="block text-xs">
                        {[...item.conflicts, ...item.warnings].join('; ')}
                      </Typography.Text>
                    )}
                  </div>
                );
              })}
              {row.itemsByDate[date].length === 0 && (
                <div className="flex min-h-16 items-center justify-center rounded border border-dashed border-slate-200 text-[11px] font-semibold text-slate-400">
                  Thả ca vào đây
                </div>
              )}
            </div>
          </div>
        );
      },
    })),
    {
      title: 'Tổng giờ / lệch target',
      key: 'total',
      fixed: 'right',
      width: 150,
      render: (_, row) => {
        const totalHours = previewItems
          .filter(item => item.userId === row.userId)
          .reduce((total, item) => total + item.paidWorkingHours, 0);
        const diff = totalHours - row.targetHours;
        return <Tag color={diff > 0 ? 'red' : diff < 0 ? 'gold' : 'green'}>{totalHours}h ({diff >= 0 ? '+' : ''}{diff}h)</Tag>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Typography.Title level={5} className="!mb-0">4. Preview lịch tự động và xác nhận lưu</Typography.Title>
      <AutoArrangeSummaryPanel summary={summary} warnings={warnings} conflicts={conflicts} />
      {previewItems.length === 0 ? (
        <Typography.Text type="secondary">Bấm Preview để hệ thống tự động chia ca.</Typography.Text>
      ) : (
        <div className="space-y-2">
          <Typography.Text type="secondary" className="block text-xs">
            Có thể kéo thả thẻ ca sang ô nhân viên/ngày khác để đổi nhanh đề xuất trước khi xác nhận lưu.
          </Typography.Text>
          <Table
            size="small"
            rowKey="userId"
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 180 + weekDates.length * 180 + 150 }}
          />
        </div>
      )}
    </div>
  );
}
