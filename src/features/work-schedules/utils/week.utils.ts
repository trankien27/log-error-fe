import dayjs, { Dayjs } from 'dayjs';

export function toIsoDate(date: string | Dayjs) {
  return dayjs(date).format('YYYY-MM-DD');
}

export function getWeekStartDate(date: string | Dayjs) {
  const value = dayjs(date);
  const day = value.day();
  const diff = day === 0 ? -6 : 1 - day;
  return value.add(diff, 'day').format('YYYY-MM-DD');
}

export function getWeekEndDate(date: string | Dayjs) {
  return dayjs(getWeekStartDate(date)).add(6, 'day').format('YYYY-MM-DD');
}

export function formatWeekRange(date: string | Dayjs) {
  const start = dayjs(getWeekStartDate(date)).format('DD/MM/YYYY');
  const end = dayjs(getWeekEndDate(date)).format('DD/MM/YYYY');
  return `Tuần ${start} - ${end}`;
}

export function formatShiftTime(startTime: string, endTime: string) {
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
}

export function formatWorkDateLabel(workDate: string) {
  return dayjs(workDate).format('DD/MM/YYYY');
}
