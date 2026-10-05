import { useState } from 'react';
import { Calendar, CalendarDays, UserRound } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { PageHeader } from '../../../components/ui';
import MyScheduleTab from './MyScheduleTab';
import ScheduleTab from './ScheduleTab';

type ScheduleView = 'team' | 'mine';

const viewTabs: { value: ScheduleView; label: string; icon: typeof CalendarDays }[] = [
  { value: 'team', label: 'Lịch tổng', icon: CalendarDays },
  { value: 'mine', label: 'Lịch của tôi', icon: UserRound },
];

export default function SchedulePage() {
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole([1, 'Admin']);
  const [activeView, setActiveView] = useState<ScheduleView>(isAdmin ? 'team' : 'mine');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Lịch làm việc"
          description="Xem và sắp xếp ca làm việc của cả nhóm."
          icon={Calendar}
          className="mb-4"
        >
          <div role="tablist" aria-label="Chế độ xem lịch" className="inline-flex gap-1 rounded-xl border border-outline-variant bg-surface-2 p-1">
            {viewTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeView === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveView(tab.value)}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors cursor-pointer ${isActive ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <Icon className="h-4 w-4" /> {tab.label}
                </button>
              );
            })}
          </div>
        </PageHeader>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView === 'team' ? (
          <div className="lg:h-full">
            <div className="card-surface overflow-hidden lg:h-full lg:min-h-[720px]">
              <ScheduleTab />
            </div>
          </div>
        ) : (
          <MyScheduleTab />
        )}
      </div>
    </div>
  );
}
