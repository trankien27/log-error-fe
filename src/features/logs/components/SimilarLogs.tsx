import { useEffect, useState } from 'react';
import { logsService } from '../../../services/api/logsService';
import type { ErrorLog } from '../../../types';

type Props = {
  store: string;
  booth: string;
  description: string;
  formatDate: (value: string) => string;
  onSelect: (log: ErrorLog) => void;
  dismissed: boolean;
};

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
}

function words(value: string) {
  return normalize(value).match(/[a-z0-9]+/g) ?? [];
}

export default function SimilarLogs({ store, booth, description, formatDate, onSelect, dismissed }: Props) {
  const enabled = description.trim().length > 0;
  const scope = JSON.stringify([store, booth]);
  const [history, setHistory] = useState<{ scope: string; logs: ErrorLog[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      const recent = logsService.getAll({ pageSize: 50 });
      const sameBooth = booth ? logsService.getAll({ store, booth, pageSize: 20 }) : null;
      const results = await Promise.allSettled(sameBooth ? [recent, sameBooth] : [recent]);
      const logs = new Map<string, ErrorLog>();
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const log of result.value.items) logs.set(log.id, log);
        }
      }
      if (active) {
        setHistory({
          scope,
          logs: [...logs.values()],
          failed: results.every(result => result.status === 'rejected'),
        });
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [enabled, scope, store, booth]);

  if (!enabled || dismissed) return null;

  const currentHistory = history?.scope === scope ? history : null;
  const normalizedDescription = normalize(description);
  const tokens = [...new Set(words(description).filter(word => word.length >= 2 && word !== 'loi'))];
  const suggestions = (currentHistory?.logs ?? [])
    .map(log => {
      const code = normalize(log.errorCode?.trim() || '');
      const exactCode = code.length >= 4 && normalizedDescription.includes(code);
      const logWords = new Set(words(log.description || ''));
      const matches = tokens.filter(word => logWords.has(word)).length;
      const sameBooth = Boolean(booth && log.booth === booth && log.store === store);
      const symptomMatch = matches > 0 && matches >= Math.min(2, tokens.length);
      return {
        log,
        score: (exactCode ? 100 : 0) + (symptomMatch ? 10 + Math.min(matches, 10) : 0) + (sameBooth ? 1 : 0),
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.log.receivedDate) - Date.parse(a.log.receivedDate))
    .slice(0, 3);

  let message = '';
  if (!currentHistory) {
    message = 'Đang tìm lỗi tương tự…';
  } else if (currentHistory.failed) {
    message = 'Không tải được gợi ý.';
  } else if (!suggestions.length) {
    message = 'Không tìm thấy lỗi tương tự.';
  }

  return (
    <section
      aria-label="Lỗi tương tự"
      className="absolute inset-x-0 top-full z-30 mt-1 hidden max-h-52 overflow-y-auto rounded-lg border border-outline-variant bg-surface p-2 shadow-elevated group-focus-within/similar-logs:block"
      onMouseDown={event => event.preventDefault()}
    >
      <h4 className="text-sm font-semibold text-on-surface">Lỗi tương tự</h4>
      {message && <p role="status" className="px-2 py-2 text-sm text-on-surface-variant">{message}</p>}
      <ul className="mt-2 space-y-2">
        {suggestions.map(({ log }) => (
          <li key={log.id} className="text-sm">
            <button type="button" onClick={() => onSelect(log)} className="block w-full rounded-md p-2 text-left hover:bg-surface-2 focus-visible:bg-surface-2">
              <span className="block font-medium text-primary">{log.description || log.errorCode}</span>
              <span className="block text-xs text-on-surface-variant">
                {formatDate(log.receivedDate)} · {log.store}{log.booth ? ` · ${log.booth}` : ''}
              </span>
              <span className="line-clamp-2 text-on-surface-variant">Cách xử lý: {log.solution?.trim() || 'Chưa ghi nhận'}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
