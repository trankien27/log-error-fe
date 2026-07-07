import { useState } from 'react';
import { ThunderboltOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { User } from '../../../types';
import QuickArrangeScheduleModal from './QuickArrangeScheduleModal';

type Props = {
  users: User[];
  disabled?: boolean;
  onSuccess: () => Promise<void> | void;
};

export default function QuickArrangeScheduleButton({ users, disabled = false, onSuccess }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="primary"
        icon={<ThunderboltOutlined />}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="Đề xuất nhanh"
      >
        Đề xuất nhanh
      </Button>
      <QuickArrangeScheduleModal
        open={open}
        users={users}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}
