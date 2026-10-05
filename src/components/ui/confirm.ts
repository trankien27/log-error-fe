import type { ReactNode } from 'react';
import { Modal } from 'antd';
import type { HookAPI } from 'antd/es/modal/useModal';

let modalApi: HookAPI | null = null;

/** Called once by <AntdStaticBridge/> so confirm dialogs inherit the app theme. */
export function registerModalApi(api: HookAPI) {
  modalApi = api;
}

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
export function confirmAction({ title, content, okText, cancelText = 'Hủy', danger = true }: ConfirmOptions): Promise<boolean> {
  const api = modalApi ?? Modal;
  return new Promise(resolve => {
    api.confirm({
      title,
      content,
      okText: okText ?? (danger ? 'Xóa' : 'Đồng ý'),
      cancelText,
      okButtonProps: { danger },
      centered: true,
      autoFocusButton: 'cancel',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}
