import type { ReactNode } from 'react';

export type ConfirmOptions = {
  title: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  /** Destructive action: red confirm button. Defaults to true. */
  danger?: boolean;
};

/**
 * Promise-based confirmation dialog.
 * Usage: `if (!(await confirmAction({ title: 'Xóa log này?' }))) return;`
 */
type ConfirmRequest = ConfirmOptions & { resolve: (confirmed: boolean) => void };

const queue: ConfirmRequest[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

export function subscribeConfirm(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getConfirmRequest() {
  return queue[0] ?? null;
}

export function finishConfirm(request: ConfirmRequest, confirmed: boolean) {
  if (queue[0] !== request) return;
  queue.shift();
  request.resolve(confirmed);
  notify();
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    queue.push({ ...options, resolve });
    notify();
  });
}
