import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

const release = {
  // Give each new announcement a unique ID so it can be shown once per account.
  id: 'similar-error-logs',
  title: 'Điền nhanh từ lỗi tương tự',
  steps: [
    {
      title: 'Nhập mô tả lỗi',
      description: 'Trong Log lỗi → Thêm log lỗi, chọn cửa hàng và booth rồi nhập mô tả, ví dụ “in ảnh trắng”. Danh sách gợi ý sẽ mở ngay bên dưới.',
    },
    {
      title: 'Chọn lỗi tương tự',
      image: 'similar-logs-dropdown.png',
      imageAlt: 'Dropdown Lỗi tương tự đang mở bên dưới ô Mô tả lỗi trong form Thêm log lỗi.',
      description: 'Xem mô tả và cách xử lý trong danh sách, rồi bấm vào gợi ý phù hợp với sự cố đang gặp.',
    },
    {
      title: 'Kiểm tra các ô đã điền',
      description: 'Form điền nhóm lỗi, mức độ, nguyên nhân và cách xử lý từ gợi ý. Hãy kiểm tra trước khi lưu. Cửa hàng và booth vẫn theo lựa chọn ban đầu.',
    },
  ],
};

const seenThisSession = new Set<string>();

function ReleaseDialog({ storageKey }: { storageKey: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const step = release.steps[stepIndex];
  const isLastStep = stepIndex === release.steps.length - 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || seenThisSession.has(storageKey)) return;

    try {
      if (window.localStorage.getItem(storageKey) === 'hidden') return;
    } catch {
      // The in-memory record still works when browser storage is disabled.
    }

    dialog.showModal();
  }, [storageKey]);

  const handleClose = () => {
    if (!dontShowAgain) return;
    seenThisSession.add(storageKey);
    try {
      window.localStorage.setItem(storageKey, 'hidden');
    } catch {
      // The in-memory record remains available until the page reloads.
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      aria-labelledby="whats-new-title"
      aria-describedby="whats-new-description"
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface p-5 text-on-surface shadow-elevated backdrop:bg-black/50 open:flex sm:p-6"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
        Có gì mới?
      </div>
      <h2 id="whats-new-title" className="text-xl font-semibold">{release.title}</h2>
      <div aria-live="polite" className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <p className="shrink-0 text-xs text-on-surface-variant">Bước {stepIndex + 1}/{release.steps.length}</p>
        <h3 className="mt-1 shrink-0 font-semibold">{step.title}</h3>
        <p id="whats-new-description" className="mt-1 shrink-0 text-sm leading-relaxed text-on-surface-variant">
          {step.description}
        </p>
        {step.image && (
          <img
            src={`${import.meta.env.BASE_URL}${step.image}`}
            alt={step.imageAlt}
            width={1306}
            height={896}
            className="mx-auto mt-3 h-auto max-h-[50dvh] w-auto max-w-full object-contain"
          />
        )}
      </div>
      <label className="mt-4 flex w-fit shrink-0 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={event => setDontShowAgain(event.target.checked)}
          className="accent-primary"
        />
        Không hiện lại
      </label>
      <div className="mt-5 flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary mr-auto" onClick={() => dialogRef.current?.close()}>
          Bỏ qua
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex(index => index - 1)}
        >
          Trước đó
        </button>
        {isLastStep ? (
          <button type="button" className="btn-primary" onClick={() => dialogRef.current?.close()}>
            Hoàn tất
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setStepIndex(index => index + 1)}>
            Kế tiếp
          </button>
        )}
      </div>
    </dialog>
  );
}

export default function WhatsNewDialog() {
  const userId = useAuthStore(state => state.currentUser?.id);
  if (userId == null) return null;

  const storageKey = `logerror:whats-new:${release.id}:${userId}`;
  return <ReleaseDialog key={storageKey} storageKey={storageKey} />;
}
