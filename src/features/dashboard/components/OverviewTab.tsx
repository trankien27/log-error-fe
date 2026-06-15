import { useEffect, useState } from 'react';
import { logsService, ErrorLogByStore, ErrorLogStats, ErrorLogStatsByGroup } from '../../../services/api/logsService';

const STATS_FROM_DATE = '2026-01-01';
const STATS_TO_DATE = '2026-12-31';
const STORE_RANKING_MONTH = 6;
const STORE_RANKING_YEAR = 2026;

const statRows: Array<{ key: keyof ErrorLogStats; label: string }> = [
  { key: 'inProgress', label: 'Đang xử lý' },
  { key: 'sentToDev', label: 'Đã gửi Dev' },
  { key: 'monitoringAfterFix', label: 'Theo dõi sau fix' },
];

const statColors: Record<keyof ErrorLogStats, string> = {
  total: '#191b23',
  inProgress: '#004ac6',
  sentToDev: '#f97316',
  monitoringAfterFix: '#10b981',
};

const groupColors = ['#004ac6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#64748b'];

function buildDonutGradient(items: Array<{ value: number; color: string }>) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let progress = 0;

  if (total <= 0) {
    return 'conic-gradient(#e5e7eb 0% 100%)';
  }

  return `conic-gradient(${items.map(item => {
    const start = progress;
    progress += (item.value / total) * 100;
    return `${item.color} ${start}% ${progress}%`;
  }).join(', ')})`;
}

export default function OverviewTab() {
  const [fromDate, setFromDate] = useState(STATS_FROM_DATE);
  const [toDate, setToDate] = useState(STATS_TO_DATE);
  const [storeRankingMonth, setStoreRankingMonth] = useState(String(STORE_RANKING_MONTH));
  const [storeRankingYear, setStoreRankingYear] = useState(String(STORE_RANKING_YEAR));
  const [stats, setStats] = useState<ErrorLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupStats, setGroupStats] = useState<ErrorLogStatsByGroup | null>(null);
  const [isGroupStatsLoading, setIsGroupStatsLoading] = useState(false);
  const [groupStatsError, setGroupStatsError] = useState<string | null>(null);
  const [storeRanking, setStoreRanking] = useState<ErrorLogByStore[]>([]);
  const [isStoreRankingLoading, setIsStoreRankingLoading] = useState(false);
  const [storeRankingError, setStoreRankingError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromDate || !toDate) return;

    setIsLoading(true);
    setError(null);

    logsService
      .getStats({ fromDate, toDate })
      .then(setStats)
      .catch((err: any) => setError(err.message || 'Không thể tải thống kê log lỗi.'))
      .finally(() => setIsLoading(false));
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!fromDate || !toDate) return;

    setIsGroupStatsLoading(true);
    setGroupStatsError(null);

    logsService
      .getStatsByGroup({ fromDate, toDate })
      .then(setGroupStats)
      .catch((err: any) => setGroupStatsError(err.message || 'Không thể tải thống kê lỗi theo nhóm.'))
      .finally(() => setIsGroupStatsLoading(false));
  }, [fromDate, toDate]);

  useEffect(() => {
    const month = Number(storeRankingMonth);
    const year = Number(storeRankingYear);

    if (!month || !year) return;

    setIsStoreRankingLoading(true);
    setStoreRankingError(null);

    logsService
      .getByStore({ month, year, ascending: false })
      .then(setStoreRanking)
      .catch((err: any) => setStoreRankingError(err.message || 'Không thể tải ranking lỗi theo cửa hàng.'))
      .finally(() => setIsStoreRankingLoading(false));
  }, [storeRankingMonth, storeRankingYear]);

  const totalSegments = stats
    ? stats.inProgress + stats.sentToDev + stats.monitoringAfterFix
    : 0;
  const chartGradient = buildDonutGradient(statRows.map(row => ({
    value: stats?.[row.key] ?? 0,
    color: statColors[row.key],
  })));
  const groupChartGradient = buildDonutGradient((groupStats?.byGroup ?? []).map((item, index) => ({
    value: item.count,
    color: groupColors[index % groupColors.length],
  })));

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={event => setFromDate(event.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={event => setToDate(event.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tháng ranking</label>
            <select
              value={storeRankingMonth}
              onChange={event => setStoreRankingMonth(event.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6] cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map(month => (
                <option key={month} value={month}>Tháng {month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Năm ranking</label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={storeRankingYear}
              onChange={event => setStoreRankingYear(event.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#f3f3fe] border border-outline-variant rounded-lg focus:outline-[#004ac6]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-outline-variant bg-gray-50">
          <h2 className="text-sm font-bold text-[#191b23]">Thống kê log lỗi</h2>
          <p className="text-xs text-gray-500 mt-1">
            Từ {fromDate} đến {toDate}
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="py-10 text-center text-xs font-bold text-gray-400">
              Đang tải thống kê log lỗi...
            </div>
          ) : error ? (
            <div className="py-10 text-center text-xs font-bold text-red-500">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-center">
              <div className="flex justify-center">
                <div
                  className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full flex items-center justify-center shadow-inner"
                  style={{ background: chartGradient }}
                >
                  <div className="absolute w-28 h-28 sm:w-36 sm:h-36 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                    <span className="text-2xl sm:text-3xl font-bold text-[#191b23]">{stats?.total ?? 0}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tổng số lỗi</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {statRows.map(row => (
                  <div key={row.key} className="border border-outline-variant rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: statColors[row.key] }}
                      />
                      <span className="text-xs font-bold text-gray-600">{row.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-[#191b23] mt-3">{stats?.[row.key] ?? 0}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {totalSegments > 0 ? Math.round(((stats?.[row.key] ?? 0) / totalSegments) * 100) : 0}% trong luồng xử lý
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-outline-variant bg-gray-50">
          <h2 className="text-sm font-bold text-[#191b23]">Thống kê lỗi theo nhóm</h2>
          <p className="text-xs text-gray-500 mt-1">
            Từ {fromDate} đến {toDate}
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {isGroupStatsLoading ? (
            <div className="py-10 text-center text-xs font-bold text-gray-400">
              Đang tải thống kê lỗi theo nhóm...
            </div>
          ) : groupStatsError ? (
            <div className="py-10 text-center text-xs font-bold text-red-500">
              {groupStatsError}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-center">
              <div className="flex justify-center">
                <div
                  className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full flex items-center justify-center shadow-inner"
                  style={{ background: groupChartGradient }}
                >
                  <div className="absolute w-28 h-28 sm:w-36 sm:h-36 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                    <span className="text-2xl sm:text-3xl font-bold text-[#191b23]">{groupStats?.total ?? 0}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tổng số lỗi</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(groupStats?.byGroup ?? []).map((item, index) => (
                  <div key={item.errorGroup} className="border border-outline-variant rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: groupColors[index % groupColors.length] }}
                      />
                      <span className="text-xs font-bold text-gray-600">{item.errorGroup}</span>
                    </div>
                    <p className="text-2xl font-bold text-[#191b23] mt-3">{item.count}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {groupStats?.total ? Math.round((item.count / groupStats.total) * 100) : 0}% tổng số lỗi
                    </p>
                  </div>
                ))}
                {!groupStats?.byGroup.length && (
                  <div className="sm:col-span-3 py-10 text-center text-xs font-bold text-gray-400">
                    Chưa có dữ liệu thống kê lỗi theo nhóm.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-outline-variant bg-gray-50">
          <h2 className="text-sm font-bold text-[#191b23]">Ranking lỗi theo cửa hàng</h2>
          <p className="text-xs text-gray-500 mt-1">
            Tháng {storeRankingMonth}/{storeRankingYear}, sắp xếp giảm dần
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-outline-variant text-[11px] uppercase tracking-wider text-gray-500">
                <th className="py-4 px-5 font-bold w-20">Hạng</th>
                <th className="py-4 px-5 font-bold">Cửa hàng</th>
                <th className="py-4 px-5 font-bold text-right">Số lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isStoreRankingLoading ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center font-bold text-gray-400">
                    Đang tải ranking lỗi theo cửa hàng...
                  </td>
                </tr>
              ) : storeRankingError ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center font-bold text-red-500">
                    {storeRankingError}
                  </td>
                </tr>
              ) : storeRanking.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center font-bold text-gray-400">
                    Chưa có dữ liệu ranking lỗi theo cửa hàng.
                  </td>
                </tr>
              ) : (
                storeRanking.map((item, index) => (
                  <tr key={`${item.store}-${index}`} className="hover:bg-[#faf8ff] transition-colors">
                    <td className="py-4 px-5">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-blue-50 text-[#004ac6] font-bold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-semibold text-gray-800">{item.store}</td>
                    <td className="py-4 px-5 text-right text-lg font-bold text-[#191b23]">{item.errorCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
