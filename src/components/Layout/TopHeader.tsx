import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  Clock,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  LogOut,
  Menu,
  Palette,
  Search,
  Send,
  Sun,
  UserCog,
} from 'lucide-react';
import { formatNotificationTime, useNotificationStore } from '../../stores/useNotificationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLogsStore } from '../../stores/useLogsStore';
import { useUsersStore } from '../../stores/useUsersStore';
import { useBoothsStore } from '../../stores/useBoothsStore';

type TopHeaderProps = {
  onOpenSidebar: () => void;
};

type WeatherState = {
  temperature: number;
  code: number;
  isDay: boolean;
};

type LunarDate = {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
};

const LOCAL_TIME_ZONE = 7;
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

function jdFromDate(day: number, month: number, year: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  if (jd < 2299161) {
    jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }

  return jd;
}

function newMoon(k: number) {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = Math.PI / 180;
  let jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  jd += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);
  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  let c1 = (0.1734 - 0.000393 * t) * Math.sin(m * dr) + 0.0021 * Math.sin(2 * dr * m);
  c1 -= 0.4068 * Math.sin(mpr * dr) + 0.0161 * Math.sin(2 * dr * mpr);
  c1 -= 0.0004 * Math.sin(3 * dr * mpr);
  c1 += 0.0104 * Math.sin(2 * dr * f) - 0.0051 * Math.sin((m + mpr) * dr);
  c1 -= 0.0074 * Math.sin((m - mpr) * dr) + 0.0004 * Math.sin((2 * f + m) * dr);
  c1 -= 0.0004 * Math.sin((2 * f - m) * dr) - 0.0006 * Math.sin((2 * f + mpr) * dr);
  c1 += 0.0010 * Math.sin((2 * f - mpr) * dr) + 0.0005 * Math.sin((2 * mpr + m) * dr);
  const deltaT = t < -11
    ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
    : -0.000278 + 0.000265 * t + 0.000262 * t2;

  return jd + c1 - deltaT;
}

function sunLongitude(jdn: number) {
  const t = (jdn - 2451545.5) / 36525;
  const t2 = t * t;
  const dr = Math.PI / 180;
  const m = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t2 * t;
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  let dl = (1.914600 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * m);
  dl += (0.019993 - 0.000101 * t) * Math.sin(2 * dr * m) + 0.000290 * Math.sin(3 * dr * m);
  let l = l0 + dl;
  l *= dr;
  l -= Math.PI * 2 * Math.floor(l / (Math.PI * 2));

  return Math.floor(l / Math.PI * 6);
}

function getNewMoonDay(k: number, timeZone: number) {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

function getSunLongitude(dayNumber: number, timeZone: number) {
  return sunLongitude(dayNumber - 0.5 - timeZone / 24);
}

function getLunarMonth11(year: number, timeZone: number) {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);

  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }

  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number) {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);

  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);

  return i - 1;
}

function solarToLunar(date: Date): LunarDate {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const dayNumber = jdFromDate(day, month, year);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, LOCAL_TIME_ZONE);

  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, LOCAL_TIME_ZONE);
  }

  let a11 = getLunarMonth11(year, LOCAL_TIME_ZONE);
  let b11 = a11;
  let lunarYear: number;

  if (a11 >= monthStart) {
    lunarYear = year;
    a11 = getLunarMonth11(year - 1, LOCAL_TIME_ZONE);
  } else {
    lunarYear = year + 1;
    b11 = getLunarMonth11(year + 1, LOCAL_TIME_ZONE);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, LOCAL_TIME_ZONE);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) lunarLeap = true;
    }
  }

  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    isLeap: lunarLeap,
  };
}

function getLunarYearName(year: number) {
  return `${CAN[(year + 6) % 10]} ${CHI[(year + 8) % 12]}`;
}

function getWeatherMeta(code: number, isDay: boolean) {
  if (code === 0) {
    return {
      label: 'Trời quang',
      icon: isDay ? Sun : CloudSun,
      iconClassName: isDay ? 'text-warning animate-pulse' : 'text-primary animate-pulse',
    };
  }

  if ([1, 2, 3].includes(code)) {
    return {
      label: 'Có mây',
      icon: CloudSun,
      iconClassName: 'text-primary animate-pulse',
    };
  }

  if ([45, 48].includes(code)) {
    return {
      label: 'Sương mù',
      icon: CloudFog,
      iconClassName: 'text-on-surface-variant animate-pulse',
    };
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return {
      label: 'Có mưa',
      icon: CloudRain,
      iconClassName: 'text-primary animate-bounce',
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      label: 'Có tuyết',
      icon: CloudSnow,
      iconClassName: 'text-info animate-pulse',
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      label: 'Dông sét',
      icon: CloudLightning,
      iconClassName: 'text-warning animate-pulse',
    };
  }

  return {
    label: 'Thời tiết',
    icon: Cloud,
    iconClassName: 'text-on-surface-variant animate-pulse',
  };
}

export default function TopHeader({ onOpenSidebar }: TopHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Zustand stores
  const { 
    notifications, 
    toggleReadState, 
    markAllRead,
    setSelectedNotification, 
    setIsNotificationModalOpen 
  } = useNotificationStore();
  const { logout, hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole([1, 'Admin']);
  const canBroadcast = hasAnyRole([1, 3, 'Admin', 'ITSupportManager']);

  // Search queries for all views
  const logSearch = useLogsStore(s => s.searchQuery);
  const userSearch = useUsersStore(s => s.searchQuery);
  const boothSearch = useBoothsStore(s => s.searchQuery);

  // Dynamic active search query based on location
  const getSearchQuery = () => {
    if (location.pathname === '/error-logs') return logSearch;
    if (location.pathname === '/users') return userSearch;
    if (location.pathname === '/booths') return boothSearch;
    return '';
  };
  const currentUser = useAuthStore(s => s.currentUser);
  
  const setSearchQuery = (query: string) => {
    useLogsStore.getState().setSearchQuery(query);
    useUsersStore.getState().setSearchQuery(query);
    useBoothsStore.getState().setSearchQuery(query);
  };

  // Local UI States for quick notifications panel
  const [isQuickNotifModalOpen, setIsQuickNotifModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const quickNotifRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDate(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!navigator.geolocation) {
      setWeatherStatus('error');
      return () => {
        isMounted = false;
      };
    }

    setWeatherStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const { latitude, longitude } = position.coords;
          const params = new URLSearchParams({
            latitude: latitude.toFixed(4),
            longitude: longitude.toFixed(4),
            current: 'temperature_2m,weather_code,is_day',
            timezone: 'auto',
          });
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

          if (!response.ok) {
            throw new Error(`Weather request failed: ${response.status}`);
          }

          const payload = await response.json();
          const current = payload?.current;

          if (!isMounted) return;
          if (!current) {
            setWeatherStatus('error');
            return;
          }

          setWeather({
            temperature: Number(current.temperature_2m),
            code: Number(current.weather_code),
            isDay: Number(current.is_day) === 1,
          });
          setWeatherStatus('idle');
        } catch {
          if (isMounted) setWeatherStatus('error');
        }
      },
      () => {
        if (isMounted) setWeatherStatus('error');
      },
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 8000,
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  // Click outside to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickNotifRef.current && !quickNotifRef.current.contains(event.target as Node)) {
        setIsQuickNotifModalOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isQuickNotifModalOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuickNotifModalOpen, isUserMenuOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const weatherMeta = weather ? getWeatherMeta(weather.code, weather.isDay) : null;
  const WeatherIcon = weatherMeta?.icon;
  const lunarDate = solarToLunar(currentDate);
  const solarDateText = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(currentDate);
  const currentTimeText = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(currentDate);
  const lunarDateText = `${lunarDate.day}/${lunarDate.month}${lunarDate.isLeap ? ' nhuận' : ''}`;
  const calendarTitle = `${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(currentDate)} · Âm lịch ${lunarDate.day}/${lunarDate.month}/${lunarDate.year}${lunarDate.isLeap ? ' nhuận' : ''} (${getLunarYearName(lunarDate.year)})`;

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate('/auth');
  };

  const openAccountSettings = () => {
    setIsUserMenuOpen(false);
    navigate('/settings');
  };

  const openAppearanceSettings = () => {
    setIsUserMenuOpen(false);
    navigate('/appearance');
  };

  return (
    <header className="h-[64px] bg-surface border-b border-outline-variant flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-6 sticky top-0 z-10 w-full shrink-0">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-2 cursor-pointer shrink-0"
        aria-label="Mở menu điều hướng"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 max-w-sm min-w-0" />

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div
          className="flex h-9 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-2 px-2.5 text-xs font-bold text-on-surface shadow-sm sm:px-3"
          title={`Giờ hiện tại: ${currentTimeText}`}
        >
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          <span className="tabular-nums tracking-wide">{currentTimeText}</span>
        </div>

        <div
          className="hidden md:flex h-9 items-center gap-2 rounded-full border border-outline-variant bg-surface-2 px-3 text-xs font-bold text-on-surface shadow-sm"
          title={calendarTitle}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span>{solarDateText}</span>
          <span className="h-4 w-px bg-outline-variant" />
          <span className="text-on-surface-variant">Âm {lunarDateText}</span>
        </div>

        <div
          className="hidden sm:flex h-9 items-center gap-2 rounded-full border border-outline-variant bg-surface-2 px-3 text-xs font-bold text-on-surface shadow-sm"
          title={weather ? `${weatherMeta?.label} tại vị trí hiện tại` : weatherStatus === 'loading' ? 'Đang lấy thời tiết tại vị trí hiện tại' : 'Không lấy được thời tiết tại vị trí hiện tại'}
        >
          {WeatherIcon ? (
            <WeatherIcon className={`h-4 w-4 shrink-0 ${weatherMeta.iconClassName}`} />
          ) : (
            <CloudSun className={`h-4 w-4 shrink-0 text-primary ${weatherStatus === 'loading' ? 'animate-pulse' : ''}`} />
          )}
          <span className="tabular-nums">
            {weather ? `${Math.round(weather.temperature)}°C` : weatherStatus === 'loading' ? '...' : '--°'}
          </span>
          {weatherMeta && <span className="hidden lg:inline text-on-surface-variant">{weatherMeta.label}</span>}
        </div>

        {/* Notification Bell Dropdown Container */}
        <div className="relative" ref={quickNotifRef}>
          <button
            onClick={() => setIsQuickNotifModalOpen(prev => !prev)}
            className={`relative p-2 rounded-full transition-all duration-200 select-none ${
              isQuickNotifModalOpen ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:bg-surface-2'
            }`}
            title="Thông báo hệ thống"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
            )}
          </button>

          {isQuickNotifModalOpen && (
            <div className="fixed left-3 right-3 top-[60px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 bg-surface rounded-2xl shadow-elevated border border-outline-variant sm:w-96 md:w-[420px] z-50 flex flex-col max-h-[calc(100dvh-5rem)] sm:max-h-[460px] transition-all overflow-hidden animate-fadeIn">
              <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between bg-surface-2/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-xs text-on-surface">Trung tâm thông báo</h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">
                      {unreadCount > 0 ? `Bạn có ${unreadCount} tin mới` : 'Không có tin mới chưa đọc'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuickNotifModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface font-bold p-1 rounded hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  &#x2715;
                </button>
              </div>

              <div className="px-4 py-2 border-b border-outline-variant/60 flex items-center justify-between bg-surface text-xs select-none">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Danh sách tin nhận được</span>
                {notifications.some(n => !n.isRead) && (
                  <button
                    type="button"
                    onClick={() => markAllRead().catch(() => undefined)}
                    className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Đánh dấu đọc hết
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/40 p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="empty-state py-10 border-none bg-transparent">
                    <Bell className="w-8 h-8 text-on-surface-variant/50 mb-2" />
                    <p className="text-on-surface-variant text-xs font-bold">Hộp thư trống</p>
                    <p className="text-[10px] text-on-surface-variant/70 mt-1">Hệ thống chưa phát thanh thông báo nào.</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) {
                          toggleReadState(notif.id);
                        }
                        setSelectedNotification(notif.isRead ? notif : { ...notif, isRead: true });
                        setIsQuickNotifModalOpen(false);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex gap-3 ${
                        notif.isRead
                          ? 'border-outline-variant/60 bg-surface hover:bg-surface-2 opacity-75'
                          : 'border-primary/20 bg-primary/5 hover:bg-primary/10 shadow-sm'
                      }`}
                    >
                      {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"></div>}

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        notif.type === 'warning'
                          ? 'bg-error-container text-on-error-container'
                          : notif.type === 'update'
                          ? 'bg-secondary-container text-primary'
                          : 'bg-success-container text-on-success-container'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs truncate ${notif.isRead ? 'text-on-surface-variant font-normal' : 'text-on-surface font-extrabold'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[9px] text-on-surface-variant font-mono tabular-nums whitespace-nowrap shrink-0">{formatNotificationTime(notif.time)}</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant line-clamp-2 mt-0.5 whitespace-pre-wrap">{notif.content}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[9px] text-on-surface-variant font-bold bg-surface-2 px-1.5 py-0.5 rounded truncate max-w-[180px]">
                            Gửi đến: {notif.tagName}
                          </span>
                          {notif.tagType === 'Urgent' && (
                            <span className="badge-error font-mono">
                              Khẩn cấp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-outline-variant/60 bg-surface-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 select-none">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/notifications');
                    setIsQuickNotifModalOpen(false);
                  }}
                  className="text-[10px] text-on-surface-variant hover:text-on-surface font-bold hover:underline text-left shrink-0 cursor-pointer"
                >
                  Trang lưu trữ thông báo
                </button>

                <div className="flex gap-1.5 shrink-0">
                  {canBroadcast && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickNotifModalOpen(false);
                        setIsNotificationModalOpen(true);
                      }}
                      className="bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-brand cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Gửi phát thanh
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsQuickNotifModalOpen(false)}
                    className="bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-outline-variant"></div>

        <div className="relative pl-1" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(current => !current)}
            className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-surface-2 transition-all cursor-pointer"
            aria-label="Mở thiết lập tài khoản"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Profile Avatar"
                className="w-8 h-8 rounded-full border border-outline-variant object-cover hover:ring-2 hover:ring-primary transition-all"
              />
            ) : (
              <span className="w-8 h-8 rounded-full border border-outline-variant bg-primary/10 flex items-center justify-center hover:ring-2 hover:ring-primary transition-all">
                <span className="text-xs font-black text-primary select-none">
                  {(currentUser?.name || '?')[0].toUpperCase()}
                </span>
              </span>
            )}
            <span className="text-xs font-semibold text-on-surface hidden md:inline">{currentUser?.name}</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-elevated z-50 animate-fadeIn">
              <div className="border-b border-outline-variant/60 px-4 py-3">
                <p className="truncate text-sm font-black text-on-surface">{currentUser?.name || 'Tài khoản'}</p>
                <p className="truncate text-xs font-medium text-on-surface-variant">{currentUser?.email || 'Đang đăng nhập'}</p>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={openAccountSettings}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-on-surface hover:bg-surface-2 cursor-pointer"
                >
                  <UserCog className="h-4 w-4 text-primary" />
                  <span>Thiết lập tài khoản</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openAppearanceSettings}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-on-surface hover:bg-surface-2 cursor-pointer"
                  >
                    <Palette className="h-4 w-4 text-primary" />
                    <span>Cài đặt giao diện</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-error hover:bg-error-container cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
