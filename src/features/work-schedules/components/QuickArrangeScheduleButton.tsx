import { useState } from 'react';
import { ThunderboltOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { User } from '../../../types';
import AutoArrangeScheduleModal from './AutoArrangeScheduleModal';

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
      >
        Sắp xếp lịch nhanh
      </Button>
      <AutoArrangeScheduleModal
        open={open}
        users={users}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}
