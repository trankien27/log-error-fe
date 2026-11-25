import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import ConfirmDialogHost from './ConfirmDialogHost';
import { confirmAction } from './confirm';

afterEach(cleanup);

it('resolves queued requests in order and treats Escape as cancellation', async () => {
  const user = userEvent.setup();
  render(<ConfirmDialogHost />);

  let requests: Promise<boolean>[] = [];
  act(() => {
    requests = [
      confirmAction({ title: 'Xóa lỗi?' }),
      confirmAction({ title: 'Áp dụng lịch?', content: 'Kiểm tra lịch mới.', danger: false }),
    ];
  });
  const [first, second] = requests;

  expect(screen.getByRole('alertdialog', { name: 'Xóa lỗi?' })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hủy' }));
  await user.keyboard('{Escape}');
  await expect(first).resolves.toBe(false);

  expect(screen.getByRole('alertdialog', { name: 'Áp dụng lịch?' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Đồng ý' }));
  await expect(second).resolves.toBe(true);
  expect(screen.queryByRole('alertdialog')).toBeNull();
});
