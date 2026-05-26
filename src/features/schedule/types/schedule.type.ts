export interface Shift {
  id: string;
  dayOfWeek: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  shiftType: 'morning' | 'afternoon' | 'evening';
  userName: string;
  userAvatar?: string;
  status: 'scheduled' | 'on_duty' | 'completed' | 'absent';
}
