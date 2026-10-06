import React, { useEffect, useState } from 'react';
import { Bot, Check, Copy, KeyRound, Loader2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, ListSkeleton, SectionCard, confirmAction } from '../../../components/ui';
import { AccessToken, MCP_SERVER_URL, accessTokenService } from '../../../services/api/accessTokenService';

type ClientKey = 'claude-plugin' | 'codex' | 'claude-manual';

/** GitHub repo hosting the it-support-ai plugin marketplace. */
const PLUGIN_MARKETPLACE_REPO = 'trankien27/it-support-ai';

const EXPIRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '30', label: '30 ngày' },
  { value: '90', label: '90 ngày' },
  { value: '365', label: '1 năm' },
  { value: 'never', label: 'Không hết hạn' },
];

const CLIENT_TABS: Array<{ key: ClientKey; label: string }> = [
  { key: 'claude-plugin', label: 'Claude (plugin)' },
  { key: 'codex', label: 'Codex' },
  { key: 'claude-manual', label: 'Claude Code (thủ công)' },
];

const EXAMPLE_PROMPTS = [
  'Log cho tôi lỗi ngày 20/10: camera không lên, tắt đi bật lại là được.',
  'Chia lịch tuần sau cho Việt Anh và Quốc, mỗi ca 1 người.',
  'Tuần này ai trực ca sáng thứ 7?',
  'Liệt kê các lỗi phần cứng ở Vincom trong tháng này.',
];

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

function buildSetupSnippet(client: ClientKey, token: string) {
  switch (client) {
    case 'claude-plugin':
      return [
        '# Cài plugin (Claude Code hoặc tab Code của Claude Desktop):',
        `claude plugin marketplace add ${PLUGIN_MARKETPLACE_REPO}`,
        'claude plugin install it-support@it-support-tools',
        '',
        '# Khi được hỏi "Token kết nối", dán token:',
        `# ${token}`,
      ].join('\n');
    case 'claude-manual':
      return `claude mcp add --transport http it-support ${MCP_SERVER_URL} --header "Authorization: Bearer ${token}"`;
    case 'codex':
      return [
        '# ~/.codex/config.toml',
        '[mcp_servers.it-support]',
        `url = "${MCP_SERVER_URL}"`,
        'bearer_token_env_var = "IT_SUPPORT_TOKEN"',
        '',
        '# Đặt biến môi trường (PowerShell):',
        `setx IT_SUPPORT_TOKEN "${token}"`,
      ].join('\n');
  }
}

function CopyButton({ text, label = 'Sao chép' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không sao chép được. Hãy bôi đen và sao chép thủ công.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer"
      aria-label={label}
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Đã chép' : label}
    </button>
  );
}

export default function AiConnectionSection() {
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [expiry, setExpiry] = useState('90');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [client, setClient] = useState<ClientKey>('claude-plugin');

  const loadTokens = async () => {
    try {
      setTokens(await accessTokenService.getAll());
    } catch (error: any) {
      toast.error(error.message || 'Không tải được danh sách token.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTokens();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = tokenName.trim();
    if (!name) {
      toast.error('Hãy đặt tên cho token, ví dụ "Claude trên laptop".');
      return;
    }

    setIsCreating(true);
    try {
      const created = await accessTokenService.create(name, expiry === 'never' ? null : Number(expiry));
      setNewToken(created.plainToken);
      setTokenName('');
      setTokens(current => [created.token, ...current]);
      toast.success('Đã tạo token. Hãy sao chép ngay, token chỉ hiện một lần.');
    } catch (error: any) {
      toast.error(error.message || 'Không tạo được token.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (token: AccessToken) => {
    const confirmed = await confirmAction({
      title: `Thu hồi token "${token.name}"?`,
      content: 'Trợ lý AI đang dùng token này sẽ mất kết nối ngay lập tức.',
      okText: 'Thu hồi',
    });
    if (!confirmed) return;

    try {
      await accessTokenService.revoke(token.id);
      setTokens(current => current.filter(item => item.id !== token.id));
      toast.success('Đã thu hồi token.');
    } catch (error: any) {
      toast.error(error.message || 'Không thu hồi được token.');
    }
  };

  const snippet = buildSetupSnippet(client, newToken ?? 'itsp_TOKEN_CUA_BAN');

  return (
    <SectionCard
      title="Kết nối AI"
      description="Cho Claude, Codex… ghi log lỗi, xem và chia lịch thay bạn bằng câu lệnh tự nhiên."
      icon={Bot}
    >
      <div className="space-y-6">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-on-surface">
            Tên token
            <input
              value={tokenName}
              onChange={event => setTokenName(event.target.value)}
              placeholder="Ví dụ: Claude trên laptop"
              maxLength={100}
              className="mt-1.5 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <label className="text-sm font-medium text-on-surface sm:w-40">
            Thời hạn
            <select
              value={expiry}
              onChange={event => setExpiry(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            >
              {EXPIRY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={isCreating} className="btn-primary">
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo token
          </button>
        </form>

        {newToken && (
          <div className="rounded-xl border border-warning/30 bg-warning-container p-4 space-y-3">
            <p className="flex items-start gap-2 text-sm text-on-warning-container">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Token chỉ hiện <strong className="mx-1">một lần</strong>. Hãy sao chép và cất giữ cẩn thận; ai có token này có thể thao tác dưới tên bạn.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
              <code className="flex-1 truncate font-mono text-sm text-on-surface">{newToken}</code>
              <CopyButton text={newToken} />
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-medium text-on-surface">Cài đặt cho trợ lý AI</h4>
          <div className="mb-3 inline-flex rounded-lg bg-surface-2 p-1">
            {CLIENT_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setClient(tab.key)}
                className={`h-8 rounded-md px-3 text-sm font-medium transition-colors cursor-pointer ${
                  client === tab.key ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative rounded-xl bg-surface-2/70">
            <div className="absolute right-2 top-2">
              <CopyButton text={snippet} />
            </div>
            <pre className="overflow-x-auto p-4 pr-28 font-mono text-xs leading-relaxed text-on-surface whitespace-pre">{snippet}</pre>
          </div>
          {!newToken && (
            <p className="mt-2 text-xs text-on-surface-variant">Tạo token mới để lệnh cài đặt tự điền token của bạn.</p>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-on-surface">Thử nói với trợ lý</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {EXAMPLE_PROMPTS.map(prompt => (
              <li key={prompt} className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm text-on-surface-variant">“{prompt}”</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-on-surface-variant">
            Trợ lý sẽ hỏi lại khi thiếu thông tin và luôn cho bạn xem trước, chỉ ghi vào hệ thống khi bạn đồng ý.
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-on-surface">Token đang hoạt động</h4>
          {isLoading ? (
            <ListSkeleton rows={2} />
          ) : tokens.length === 0 ? (
            <EmptyState compact icon={KeyRound} title="Chưa có token nào" description="Tạo token ở trên để kết nối trợ lý AI." />
          ) : (
            <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant">
              {tokens.map(token => (
                <li key={token.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">{token.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      <span className="font-mono">{token.tokenPrefix}…</span>
                      {' · '}Tạo {formatDate(token.createdAt)}
                      {' · '}{token.expiresAt ? `Hết hạn ${formatDate(token.expiresAt)}` : 'Không hết hạn'}
                      {' · '}{token.lastUsedAt ? `Dùng lần cuối ${formatDate(token.lastUsedAt)}` : 'Chưa dùng'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(token)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-error hover:bg-error-container cursor-pointer"
                    aria-label={`Thu hồi token ${token.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Thu hồi</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
