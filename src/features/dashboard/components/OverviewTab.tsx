import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, AlertTriangle, ClipboardList, Users, Store, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useLogsStore } from '../../../stores/useLogsStore';
import { useTasksStore } from '../../../stores/useTasksStore';
import { useUsersStore } from '../../../stores/useUsersStore';
import { useBoothsStore } from '../../../stores/useBoothsStore';
import { Activity } from '../../../types';
import { activitiesService } from '../../../services/api/activitiesService';

export default function OverviewTab() {
  const navigate = useNavigate();

  // Zustand State subscriptions
  const { logs } = useLogsStore();
  const { tasks } = useTasksStore();
  const { users } = useUsersStore();
  const { booths } = useBoothsStore();

  // Calculations for dashboard
  const totalLogs = logs.length;
  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'progress').length;
  const overdueTasksCount = tasks.filter(t => t.isOverdue).length;
  const totalUsers = users.length;
  const totalBooths = booths.length;

  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    activitiesService
      .getRecent()
      .then(setRecentActivities)
      .catch(() => setRecentActivities([]));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner with Local Info */}
      <div className="bg-gradient-to-r from-[#004ac6] to-[#2563eb] text-white p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm animate-fadeIn">
        <div>
          <h2 className="text-xl font-bold font-sans">Xin chào, Admin User!</h2>
          <p className="text-xs text-white/80 mt-1">Hệ thống ghi nhận hoạt động trơn tru. Có {overdueTasksCount} công việc quá hạn cần lưu tâm.</p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 select-none">
          <Clock className="w-4 h-4 text-yellow-300" />
          <span className="text-xs font-mono font-bold text-white/90">2026-05-25 (GMT+7)</span>
        </div>
      </div>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 shadow-sm animate-fadeIn">
        {/* Metric 1 */}
        <div
          onClick={() => navigate('/error-logs')}
          className="bg-white border border-outline-variant rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Tổng Log Lỗi</span>
            <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-[#191b23]">{totalLogs}</h3>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-0.5 font-medium">
              <ArrowUp className="w-3 h-3" /> +12% so với hôm qua
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => navigate('/tasks')}
          className="bg-white border border-outline-variant rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Việc Đang Có</span>
            <div className="p-1.5 rounded-lg bg-blue-100 text-[#004ac6]">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-[#191b23]">{pendingTasksCount + inProgressTasksCount}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Cần triển khai gấp</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => navigate('/tasks')}
          className="bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase text-red-700 tracking-wider">Công việc trễ</span>
            <div className="p-1.5 rounded-lg bg-red-600 text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-red-700">{overdueTasksCount}</h3>
            <p className="text-[10px] text-red-600 mt-1 font-semibold">Yêu cầu ưu tiên xử lý ngay</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => navigate('/users')}
          className="bg-white border border-outline-variant rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Người Dùng</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-[#191b23]">{totalUsers}</h3>
            <p className="text-[10px] text-[#434655] mt-1 font-medium">Tài khoản quản trị</p>
          </div>
        </div>

        {/* Metric 5 */}
        <div
          onClick={() => navigate('/booths')}
          className="bg-white border border-outline-variant rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Tổng Booth Trạm</span>
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-[#191b23]">{totalBooths}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Đang trực tuyến: {totalBooths}</p>
          </div>
        </div>
      </div>

      {/* Interactive Performance Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1 */}
        <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-6 flex flex-col justify-between animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-[#191b23]">Tần suất Log lỗi tuần qua</h3>
            <span className="text-xs text-primary hover:underline cursor-pointer font-bold" onClick={() => navigate('/error-logs')}>Chi tiết</span>
          </div>
          {/* Styled pure CSS graph */}
          <div className="h-56 bg-[#f3f3fe] rounded-lg p-4 flex items-end justify-between gap-1 relative overflow-hidden border border-[#e2e8f0]">
            {/* Horizontal helper graph lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none opacity-20">
              <div className="w-full border-t border-gray-400"></div>
              <div className="w-full border-t border-gray-400"></div>
              <div className="w-full border-t border-gray-400"></div>
              <div className="w-full border-t border-gray-400"></div>
            </div>

            {[
              { day: 'Thứ 2', val: '40%' },
              { day: 'Thứ 3', val: '65%' },
              { day: 'Thứ 4', val: '30%' },
              { day: 'Thứ 5', val: '80%' },
              { day: 'Thứ 6', val: '50%' },
              { day: 'Thứ 7', val: '95%' },
              { day: 'Chủ Nhật', val: '45%' },
            ].map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative z-10 cursor-pointer">
                <div
                  className="w-full bg-primary hover:bg-[#2563eb] rounded-t transition-all duration-500 shadow-sm"
                  style={{ height: item.val }}
                >
                  {/* Tooltip prompt */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all bg-[#191b23] text-white text-[10px] py-1 px-2 rounded font-mono font-bold whitespace-nowrap z-50">
                    {item.val}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-500 font-sans">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut diagram: Status of Tasks */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col justify-between animate-fadeIn">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-[#191b23]">Trạng thái công việc</h3>
          </div>

          {/* Circle graphic */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner" style={{
              background: 'conic-gradient(#004ac6 0% 45%, #ba1a1a 45% 65%, #c3c6d7 65% 100%)'
            }}>
              <div className="absolute w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                <span className="text-2xl font-bold font-sans text-gray-800">{tasks.length}</span>
                <span className="text-[9px] text-[#434655] uppercase font-bold tracking-wider">Tổng số việc</span>
              </div>
            </div>

            {/* Legend badges */}
            <div className="w-full grid grid-cols-3 gap-2 mt-5 text-[11px] font-medium text-gray-500">
              <div className="flex flex-col items-center border-r border-[#ededf9]">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary mb-1"></span>
                <span>Đã Xong (45%)</span>
              </div>
              <div className="flex flex-col items-center border-r border-[#ededf9]">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 mb-1"></span>
                <span>Trễ Hạn (20%)</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#c3c6d7] mb-1"></span>
                <span>Đang Làm (35%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm animate-fadeIn">
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-gray-50">
          <h3 className="text-sm font-bold text-[#191b23]">Hoạt động gần đây</h3>
          <button 
            onClick={() => toast.info('Tất cả lịch sử tác vụ đã được đồng bộ chuẩn chỉnh.')} 
            className="text-xs font-bold text-[#004ac6] hover:underline cursor-pointer"
          >
            Xem tất cả &rarr;
          </button>
        </div>
        <div className="divide-y divide-[#f1f5f9]">
          {recentActivities.map(item => (
            <div key={item.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-[#faf8ff] transition-colors">
              <div className="flex items-center gap-3">
                {item.type === 'log' ? (
                  <div className="w-9 h-9 bg-red-50 text-red-600 flex items-center justify-center rounded-full shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-9 h-9 bg-blue-50 text-[#004ac6] flex items-center justify-center rounded-full shrink-0">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-[#191b23]">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-gray-100 text-gray-500 font-sans px-1.5 py-0.5 rounded-md">{item.id}</span>
                    <span className="text-[10px] text-gray-500 font-sans font-medium">{item.location}</span>
                  </div>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                <span className="text-[11px] text-gray-400 font-mono font-medium">{item.timeText}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase transition-all ${
                  item.statusType === 'error'
                    ? 'bg-red-100 text-red-600'
                    : item.statusType === 'pending'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {item.statusText}
                </span>
              </div>
            </div>
          ))}
          {recentActivities.length === 0 && (
            <div className="p-8 text-center text-xs font-bold text-gray-400">
              Chưa có hoạt động gần đây từ hệ thống.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
