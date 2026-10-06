import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Check, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { aiChatService, AiChatPendingAction } from '../../../services/api/aiChatService';
import { useLogsStore } from '../../../stores/useLogsStore';

type ActionState = 'pending' | 'saving' | 'saved' | 'cancelled';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: AiChatPendingAction;
  actionState?: ActionState;
  actionResult?: string;
};

const SUGGESTIONS = [
  'Log lỗi hôm nay booth LUMI01: camera không lên, tắt bật lại là được',
  'Tuần này có lỗi phần cứng nào chưa xử lý xong?',
  'Tuần này ai trực ca sáng?',
  'Chia lịch tuần sau cho Việt Anh và Quốc, Quốc nghỉ thứ 4',
  'Thứ 5 cho Việt Anh làm thay ca sáng của Quốc',
];

const ACTION_ICONS: Record<string, string> = {
  create_error_log: '📝',
  confirm_schedule: '📅',
  shift_change: '🔁',
};

const newId = () => Math.random().toString(36).slice(2);

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const fetchLogs = useLogsStore(state => state.fetchLogs);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    if (available === null) {
      aiChatService.getStatus().then(x => setAvailable(x.available)).catch(() => setAvailable(false));
    }
  }, [isOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const updateMessage = (id: string, patch: Partial<ChatMessage>) =>
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || isSending) return;

    setInput('');
    setMessages(prev => [...prev, { id: newId(), role: 'user', text: message }]);
    setIsSending(true);
    try {
      const reply = await aiChatService.send(conversationId, message);
      setConversationId(reply.conversationId);
      setMessages(prev => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          text: reply.message,
          action: reply.pendingAction ?? undefined,
          actionState: reply.pendingAction ? 'pending' : undefined,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: newId(), role: 'assistant', text: err?.message || 'Không gửi được tin nhắn, bạn thử lại nhé.' }]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const confirm = async (msg: ChatMessage) => {
    if (!msg.action) return;
    updateMessage(msg.id, { actionState: 'saving' });
    try {
      const result = await aiChatService.confirm(msg.action.id);
      if (result.success) {
        updateMessage(msg.id, { actionState: 'saved', actionResult: result.message });
        toast.success(result.message);
        fetchLogs().catch(() => undefined);
      } else {
        updateMessage(msg.id, { actionState: 'pending' });
        toast.error(result.message);
      }
    } catch (err: any) {
      updateMessage(msg.id, { actionState: 'pending' });
      toast.error(err?.message || 'Không lưu được, bạn thử lại nhé.');
    }
  };

  const cancel = (msg: ChatMessage) => {
    if (!msg.action) return;
    updateMessage(msg.id, { actionState: 'cancelled' });
    aiChatService.cancel(msg.action.id).catch(() => undefined);
  };

  const reset = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 h-12 pl-4 pr-5 rounded-full bg-primary text-on-primary shadow-elevated hover:bg-primary-hover transition-colors cursor-pointer"
          aria-label="Mở trợ lý AI"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium">Trợ lý AI</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed z-50 inset-x-2 bottom-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px] h-[min(600px,calc(100dvh-1rem))] flex flex-col bg-surface border border-outline-variant rounded-2xl shadow-elevated animate-fadeIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 inline-flex items-center justify-center rounded-xl bg-primary-subtle text-primary">
                <Bot className="w-4 h-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-on-surface leading-tight">Trợ lý AI</p>
                <p className="text-xs text-on-surface-variant leading-tight">Log lỗi · Xếp lịch · Đổi ca</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={reset} title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Đóng"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-2 hover:text-on-surface cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {available === false && (
              <div className="text-sm bg-warning-container text-on-surface rounded-xl p-3">
                Trợ lý AI chưa được bật trên máy chủ. Liên hệ admin để cấu hình khóa AI.
              </div>
            )}

            {messages.length === 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-on-surface-variant">
                  Gõ tự nhiên như khi nhắn tin, ví dụ:
                </p>
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => send(s)} disabled={isSending}
                    className="block w-full text-left text-sm px-3 py-2 rounded-xl border border-outline-variant hover:bg-surface-2 text-on-surface cursor-pointer">
                    {s}
                  </button>
                ))}
                <p className="text-xs text-on-surface-variant">
                  Trợ lý sẽ hỏi lại nếu thiếu thông tin và chỉ lưu khi bạn bấm <strong>Lưu</strong>.
                </p>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[88%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                  <div className={msg.role === 'user'
                    ? 'px-3 py-2 rounded-2xl rounded-br-md bg-primary text-on-primary text-sm whitespace-pre-wrap break-words'
                    : 'px-3 py-2 rounded-2xl rounded-bl-md bg-surface-2 text-on-surface text-sm break-words ai-chat-markdown'}>
                    {msg.role === 'user' ? msg.text : <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>}
                  </div>

                  {msg.action && (
                    <ActionCard
                      action={msg.action}
                      state={msg.actionState ?? 'pending'}
                      result={msg.actionResult}
                      onConfirm={() => confirm(msg)}
                      onCancel={() => cancel(msg)}
                    />
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" /> Trợ lý đang xử lý…
              </div>
            )}
          </div>

          <div className="p-3 border-t border-outline-variant">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mô tả lỗi, hỏi lịch, hoặc nhờ xếp lịch…"
                maxLength={2000}
                className="flex-1 resize-none max-h-32 min-h-10 px-3 py-2 bg-surface border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <button type="button" onClick={() => send(input)} disabled={isSending || !input.trim()} aria-label="Gửi"
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type ActionCardProps = {
  action: AiChatPendingAction;
  state: ActionState;
  result?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ActionCard({ action, state, result, onConfirm, onCancel }: ActionCardProps) {
  const lines = action.summary.split('\n').filter(Boolean);

  return (
    <div className={`rounded-xl border p-3 text-sm bg-surface ${state === 'saved' ? 'border-success' : 'border-primary/40'} ${state === 'cancelled' ? 'opacity-60' : ''}`}>
      <p className="font-semibold text-on-surface mb-1.5">{ACTION_ICONS[action.type] ?? '📝'} {action.title}</p>
      <ul className="space-y-0.5 text-on-surface">
        {lines.map(line => <li key={line}>{line}</li>)}
      </ul>

      {action.sections.length > 0 && (
        <div className="mt-2 max-h-72 overflow-y-auto space-y-2 pr-1">
          {action.sections.map(section => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-on-surface-variant">{section.title}</p>
              {section.items.length === 0 ? (
                <p className="text-xs text-on-surface-variant/70">Nghỉ / chưa xếp ca</p>
              ) : (
                <ul className="text-xs text-on-surface space-y-0.5">
                  {section.items.map((item, index) => <li key={`${section.title}-${index}`}>• {item}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {action.assumptions.length > 0 && state === 'pending' && (
        <div className="mt-2 text-xs text-on-surface-variant space-y-0.5">
          <p className="font-medium">Hệ thống tự suy ra:</p>
          {action.assumptions.map(a => <p key={a}>• {a}</p>)}
        </div>
      )}

      <div className="mt-3">
        {state === 'saved' && (
          <p className="flex items-center gap-1.5 text-success font-medium"><Check className="w-4 h-4" /> {result}</p>
        )}
        {state === 'cancelled' && <p className="text-on-surface-variant">Đã huỷ, chưa ghi gì.</p>}
        {(state === 'pending' || state === 'saving') && (
          <div className="flex gap-2">
            <button type="button" onClick={onConfirm} disabled={state === 'saving'} className="btn-primary h-9 px-4">
              {state === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lưu
            </button>
            <button type="button" onClick={onCancel} disabled={state === 'saving'} className="btn-secondary h-9 px-4">
              Huỷ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
