import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Copy, Plus, AlertCircle, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useScheduleStore } from '../../../stores/useScheduleStore';
import { useUsersStore } from '../../../stores/useUsersStore';

export default function ScheduleTab() {
  const navigate = useNavigate();

  // Zustand State subscriptions
  const {
    shifts,
    isLoading,
    scheduleTeamMode,
    scheduleSearchQuery,
    scheduleRoleFilter,
    isCreateShiftModalOpen,
    setScheduleTeamMode,
    setScheduleSearchQuery,
    setScheduleRoleFilter,
    setIsCreateShiftModalOpen,
    saveShift
  } = useScheduleStore();

  const { users, setSelectedUserProfileUser } = useUsersStore();

  const currentUserName = users[0]?.name || 'Admin User';

  // Form states for creating a new shift
  const [newShiftDay, setNewShiftDay] = useState<'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'>('T2');
  const [newShiftType, setNewShiftType] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [newShiftStaffName, setNewShiftStaffName] = useState(currentUserName);
  const [newShiftStatus, setNewShiftStatus] = useState<'scheduled' | 'on_duty' | 'confirmed' | 'empty'>('scheduled');

  const handleOpenCreateShiftModal = (day: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN', type: 'morning' | 'afternoon' | 'evening') => {
    setNewShiftDay(day);
    setNewShiftType(type);
    setNewShiftStaffName(currentUserName);
    setNewShiftStatus('scheduled');
    setIsCreateShiftModalOpen(true);
  };

  const handleSaveShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignedUser = users.find(u => u.name === newShiftStaffName);
    const newShiftObj = {
      id: `SFT-${Date.now().toString().slice(-4)}`,
      dayOfWeek: newShiftDay,
      shiftType: newShiftType,
      userName: newShiftStaffName,
      userAvatar: assignedUser?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCf19wuTp7sv6x9pADPruTII3g4UFBNu_m17cE7ZShyK5gMM7wx5BRgQxa_JX_QigzNPtZ0Hsvanp0yPYNQrJYLHjyhSNdlbMxZMMB7fDcZzOfZUOBQPkFkr-C-3KkXGAIk94Ff4GaLV6hU5nGzC5XKj16Cj3C-Pzscz6_DEnDMQuBMtGWBPfmeKB4yZF2aK0xshp2wSitcu2Tr0xQuk6tvQrdaEeW347dLPZBhzq4N2z3oClFluj1ONP9T5sjYirKxp84SzbKM2SM',
      status: newShiftStatus
    };
    
    try {
      await saveShift(newShiftObj);
      setIsCreateShiftModalOpen(false);
      toast.success(`Đã điều phối ca trực thành công cho ${newShiftStaffName}.`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lập ca trực.');
    }
  };

  const exportSchedule = () => {
    toast.success('Đã xuất lịch làm việc dạng báo cáo Excel (XLSX) thành công.');
  };

  const copyScheduleLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Đã sao chép liên kết chia sẻ lịch tuần này vào bộ nhớ tạm.');
  };

  return (
    <div className="space-y-6 text-[#191b23] text-left animate-fadeIn">
      {/* Screen header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 font-sans">
            <span>Lịch làm việc IT Support</span>
            <span className="text-[10px] font-bold bg-[#ffebe6] text-[#7d2d00] tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-orange-200">Tuần này</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý ca trực theo giờ, phân rạp kỹ thuật hỗ trợ và theo dõi sự hiện diện của nhân sự.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={exportSchedule}
            className="px-3 py-2 border border-outline-variant hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            type="button"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất lịch</span>
          </button>
          <button 
            onClick={copyScheduleLink}
            className="px-3 py-2 border border-outline-variant hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            type="button"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Sao chép lịch tuần</span>
          </button>
          <button 
            onClick={() => handleOpenCreateShiftModal('T2', 'morning')}
            className="px-4 py-2 bg-[#004ac6] text-white hover:bg-primary-container rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo ca trực</span>
          </button>
        </div>
      </div>

      {/* Bento summaries grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-outline-variant hover:shadow-sm transition-all relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-16 bg-[#ebefff] rounded-full filter blur-2xl opacity-50 pointer-events-none"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Tổng ca trong tuần</span>
          <h3 className="text-xl font-extrabold text-[#191b23] mt-1">{shifts.filter(s => s.status !== 'empty').length} Ca trực</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-outline-variant hover:shadow-sm transition-all relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-16 bg-[#eefdeb] rounded-full filter blur-2xl opacity-50 pointer-events-none"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Tổng giờ trực kỹ thuật</span>
          <h3 className="text-xl font-extrabold text-[#191b23] mt-1">{shifts.filter(s => s.status !== 'empty').length * 4} Giờ hoạt động</h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-outline-variant hover:shadow-sm transition-all relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-16 bg-[#fffbea] rounded-full filter blur-2xl opacity-50 pointer-events-none"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Lực lượng bảo đảm</span>
          <h3 className="text-xl font-extrabold text-[#191b23] mt-1">
            {Array.from(new Set(shifts.filter(s => s.status !== 'empty' && s.userName).map(s => s.userName))).length} Nhân sự
          </h3>
        </div>

        <div className="bg-white p-4 rounded-xl border border-outline-variant hover:shadow-sm transition-all relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-16 bg-[#fdf2f2] rounded-full filter blur-2xl opacity-50 pointer-events-none"></div>
          <span className="text-[10px] font-bold text-[#ba1a1a] uppercase tracking-widest font-sans">Trống ca trực</span>
          <h3 className="text-xl font-extrabold text-[#ba1a1a] mt-1">
            {shifts.filter(s => s.status === 'empty' || !s.userName).length} Điểm trống
          </h3>
        </div>
      </div>

      {/* Tool Filters row */}
      <div className="bg-white rounded-xl border border-outline-variant p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Mode Team toggler */}
          <div className="flex rounded-lg border border-outline-variant p-1 bg-[#f3f3fe] select-none text-xs">
            <button 
              onClick={() => setScheduleTeamMode('team')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                scheduleTeamMode === 'team' ? 'bg-white text-[#004ac6] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              type="button"
            >
              Lịch team
            </button>
            <button 
              onClick={() => {
                setScheduleTeamMode('my');
                toast.info('Đang lọc ca cá nhân của người dùng hiện tại.');
              }}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                scheduleTeamMode === 'my' ? 'bg-white text-[#004ac6] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              type="button"
            >
              Lịch của tôi
            </button>
          </div>

          {/* Week selector card UI */}
          <div className="flex items-center gap-1.5 bg-[#f3f3fe] border border-outline-variant px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            <button type="button" onClick={() => toast.info('Chuyển sang tuần trước.')} className="hover:text-[#004ac6] transition-colors"><ChevronLeft className="w-4 h-4 cursor-pointer" /></button>
            <span className="px-1 font-mono">12/10 - 18/10</span>
            <button type="button" onClick={() => toast.info('Chuyển sang tuần sau.')} className="hover:text-[#004ac6] transition-colors"><ChevronRight className="w-4 h-4 cursor-pointer" /></button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input 
              type="text" 
              placeholder="Tìm nhân sự..."
              value={scheduleSearchQuery}
              onChange={e => setScheduleSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#f3f3fe] border border-outline-variant rounded-lg font-medium text-slate-800 focus:outline-[#004ac6]"
            />
          </div>

          <select 
            value={scheduleRoleFilter}
            onChange={e => setScheduleRoleFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-[#f3f3fe] border border-outline-variant rounded-lg cursor-pointer text-slate-700 font-semibold"
          >
            <option value="Tất cả vai trò">Tất cả vai trò</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="IT Support">IT Support</option>
            <option value="Staff">Staff</option>
          </select>
        </div>
      </div>

      {/* Dynamic Calendar Grid */}
      <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden select-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-outline-variant text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center font-sans">
                <th className="py-4 px-2 w-36 border-r border-[#ececf7] text-left pl-5">Ca / Thời gian</th>
                <th className="py-4 px-2 border-r border-[#ececf7]">Thứ 2 (12/10)</th>
                <th className="py-4 px-2 border-r border-[#ececf7] bg-[#f0f4ff] text-slate-950 relative">
                  <span className="absolute left-1/2 -translate-x-1/2 top-1 bg-[#004ac6] text-white text-[8px] px-1 py-0.25 rounded font-black font-sans">Hôm nay</span>
                  Thứ 3 (13/10)
                </th>
                <th className="py-4 px-2 border-r border-[#ececf7]">Thứ 4 (14/10)</th>
                <th className="py-4 px-2 border-r border-[#ececf7]">Thứ 5 (15/10)</th>
                <th className="py-4 px-2 border-r border-[#ececf7]">Thứ 6 (16/10)</th>
                <th className="py-4 px-2 border-r border-[#ececf7]">Thứ 7 (17/10)</th>
                <th className="py-4 px-2 text-[#ba1a1a] font-sans">CN (18/10)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ededf9]">
              {/* Rows */}
              {(['morning', 'afternoon', 'evening'] as const).map((sTime) => (
                <tr key={sTime}>
                  <td className="p-4 border-r border-[#ececf7] align-middle bg-slate-50/30">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900 font-sans">
                        {sTime === 'morning' ? 'Ca Sáng' : sTime === 'afternoon' ? 'Ca Chiều' : 'Ca Tối'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {sTime === 'morning' ? '08:00 - 12:00' : sTime === 'afternoon' ? '12:00 - 17:00' : '17:00 - 22:00'}
                      </p>
                    </div>
                  </td>
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => {
                    const currentDayShifts = shifts.filter(s => s.dayOfWeek === day && s.shiftType === sTime);
                    const activeDayAndHighlighted = day === 'T3';
                    
                    // Match search query or filters
                    const matchingShifts = currentDayShifts.filter(s => {
                      if (scheduleTeamMode === 'my' && currentUserName && s.userName !== currentUserName) return false;
                      if (scheduleSearchQuery && !s.userName.toLowerCase().includes(scheduleSearchQuery.toLowerCase())) return false;
                      if (scheduleRoleFilter !== 'Tất cả vai trò') {
                        const linkedUser = users.find(u => u.name === s.userName);
                        if (linkedUser && linkedUser.role !== scheduleRoleFilter) return false;
                      }
                      return true;
                    });

                    return (
                      <td key={day} className={`p-3 border-r border-[#ededf9] align-top min-h-[140px] ${activeDayAndHighlighted ? 'bg-[#f8f9ff]/50' : ''}`}>
                        {matchingShifts.length > 0 ? (
                          <div className="space-y-2">
                            {matchingShifts.map(s => {
                              if (s.status === 'empty' || !s.userName) return (
                                <div key={s.id} className="border border-dashed border-red-200 bg-red-50/50 rounded-xl p-2.5 text-center flex flex-col items-center gap-1 font-sans">
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                  <p className="text-[10px] font-bold text-red-500">Trống ca trực</p>
                                  <button 
                                    onClick={() => handleOpenCreateShiftModal(day as any, sTime)}
                                    className="text-[9px] hover:underline font-black text-red-600 mt-1 cursor-pointer flex items-center gap-0.5"
                                    type="button"
                                  >
                                    <Plus className="w-2.5 h-2.5" /> Gán luôn
                                  </button>
                                </div>
                              );
                              
                              return (
                                <div key={s.id} className={`border rounded-xl p-2.5 text-xs shadow-sm bg-white space-y-2.5 ${
                                  s.status === 'on_duty' ? 'border-emerald-500 hover:ring-2 hover:ring-emerald-250 shadow-emerald-50' : 
                                  s.status === 'confirmed' ? 'border-[#004ac6] hover:ring-2 hover:ring-blue-150 shadow-blue-50' : 
                                  'border-slate-200 hover:shadow'
                                }`}>
                                  <div className="flex items-center gap-1.5 shrink-0 select-none text-left">
                                    {s.userAvatar ? (
                                      <img src={s.userAvatar} alt="staff avatar" className="w-6 h-6 rounded-full object-cover border border-slate-100" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-100 text-[#004ac6] font-extrabold flex items-center justify-center text-[9px]">
                                        {s.userName.split(' ').pop()?.substring(0, 2).toUpperCase() || 'IT'}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-extrabold text-[#191b23] truncate">{s.userName}</p>
                                      <p className="text-[8px] text-[#434655] font-semibold font-sans">IT Specialist</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 font-sans">
                                    <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.25 rounded-md ${
                                      s.status === 'on_duty' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700 font-black' :
                                      s.status === 'confirmed' ? 'bg-[#dcfce7] border border-emerald-100 text-[#166534]' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {s.status === 'on_duty' ? 'Đang trực' : s.status === 'confirmed' ? 'Xác nhận' : 'Lên lịch'}
                                    </span>

                                    <button 
                                      onClick={() => {
                                        const staffUser = users.find(u => u.name === s.userName);
                                        if (staffUser) {
                                          setSelectedUserProfileUser(staffUser);
                                          navigate('/users');
                                        } else {
                                          toast.info('Dữ liệu nhân sự chi tiết sẽ được tải vào hồ sơ.');
                                        }
                                      }}
                                      className="text-[9px] text-[#004ac6] font-bold hover:underline cursor-pointer"
                                      type="button"
                                    >
                                      Hồ sơ
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleOpenCreateShiftModal(day as any, sTime)}
                            className="w-full py-4 border-2 border-dashed border-slate-150 hover:bg-[#fafbff] text-slate-400 hover:text-slate-600 rounded-xl transition-all text-[10px] text-center flex flex-col items-center justify-center gap-1 cursor-pointer font-sans"
                            type="button"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-350" />
                            <span>Trống ca</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shift Modal */}
      {isCreateShiftModalOpen && (
        <div className="fixed inset-0 bg-[#191b23]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900">Lên ca trực mới cho hệ thống</h3>
              </div>
              <button 
                onClick={() => setIsCreateShiftModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-655 transition-colors cursor-pointer"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShiftSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1.5">Ngày trực trong tuần</label>
                <select
                  value={newShiftDay}
                  onChange={e => setNewShiftDay(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-outline-variant rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-[#004ac6] cursor-pointer"
                >
                  <option value="T2">Thứ Hai (T2)</option>
                  <option value="T3">Thứ Ba (T3)</option>
                  <option value="T4">Thứ Tư (T4)</option>
                  <option value="T5">Thứ Năm (T5)</option>
                  <option value="T6">Thứ Sáu (T6)</option>
                  <option value="T7">Thứ Bảy (T7)</option>
                  <option value="CN">Chủ Nhật (CN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1.5">Khung giờ ca trực</label>
                <select
                  value={newShiftType}
                  onChange={e => setNewShiftType(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-outline-variant rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-[#004ac6] cursor-pointer"
                >
                  <option value="morning">Ca Sáng (07:00 - 12:00)</option>
                  <option value="afternoon">Ca Chiều (12:00 - 17:00)</option>
                  <option value="evening">Ca Tối (17:00 - 22:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1.5">Nhân sự gán trực</label>
                <select
                  value={newShiftStaffName}
                  onChange={e => setNewShiftStaffName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-outline-variant rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-[#004ac6] cursor-pointer"
                >
                  {users.map((item) => (
                    <option key={item.id} value={item.name}>{item.name} ({item.department || 'Phần mềm'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1.5">Trạng thái ca trực ban đầu</label>
                <select
                  value={newShiftStatus}
                  onChange={e => setNewShiftStatus(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-outline-variant rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-[#004ac6] cursor-pointer"
                >
                  <option value="scheduled">Lập lịch trực (Scheduled)</option>
                  <option value="on_duty">Đang làm việc (On Duty)</option>
                  <option value="confirmed">Đã hoàn thành bàn giao (Confirmed)</option>
                </select>
              </div>

              <div className="flex gap-2.5 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateShiftModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#004ac6] hover:bg-primary-container text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> {isLoading ? 'Đang lập...' : 'Lập ca trực'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
