import { useState } from 'react';
import { Zap } from 'lucide-react';
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
        icon={<Zap className="h-4 w-4" />}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="Xếp lịch nhanh"
      >
        Xếp lịch nhanh
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
