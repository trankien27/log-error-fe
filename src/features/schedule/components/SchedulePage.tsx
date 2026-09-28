import { useState } from 'react';
import { CalendarDays, UserRound } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import MyScheduleTab from './MyScheduleTab';
import ScheduleTab from './ScheduleTab';

type ScheduleView = 'team' | 'mine';

export default function SchedulePage() {
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole([1, 'Admin']);
  const [activeView, setActiveView] = useState<ScheduleView>(isAdmin ? 'team' : 'mine');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-outline-variant bg-surface px-4 pt-3 sm:px-6">
        <div className="inline-flex gap-1 rounded-t-xl bg-surface-2 p-1 pb-0">
          <button
            type="button"
            onClick={() => setActiveView('team')}
            className={`inline-flex h-11 items-center gap-2 rounded-t-lg px-4 text-sm font-bold transition-colors ${activeView === 'team' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <CalendarDays className="h-4 w-4" /> Lịch tổng
          </button>
          <button
            type="button"
            onClick={() => setActiveView('mine')}
            className={`inline-flex h-11 items-center gap-2 rounded-t-lg px-4 text-sm font-bold transition-colors ${activeView === 'mine' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <UserRound className="h-4 w-4" /> Lịch làm việc của tôi
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView === 'team' ? <ScheduleTab /> : <MyScheduleTab />}
      </div>
    </div>
  );
}
