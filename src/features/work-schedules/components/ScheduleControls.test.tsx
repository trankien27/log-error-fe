import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { Select } from './ScheduleControls';

afterEach(cleanup);

it('preserves numeric IDs and clears a filter without selecting another item', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Select allowClear placeholder="Tất cả cửa hàng" value={7} options={[{ value: 7, label: 'Cửa hàng A' }, { value: 42, label: 'Cửa hàng B' }]} onChange={onChange} />);
  const control = screen.getByRole('combobox', { name: 'Tất cả cửa hàng' });

  await user.selectOptions(control, screen.getByRole('option', { name: 'Cửa hàng B' }));
  await user.selectOptions(control, screen.getByRole('option', { name: 'Tất cả cửa hàng' }));

  expect(onChange.mock.calls).toEqual([[42], [undefined]]);
});

it('keeps earlier selections when filtering the list of employees', async () => {
  const user = userEvent.setup();
  function EmployeeSelection() {
    const [selected, setSelected] = useState(['an']);
    return <Select mode="multiple" showSearch value={selected} onChange={setSelected} options={[{ value: 'an', label: 'An' }, { value: 'linh', label: 'Linh' }]} />;
  }
  render(<EmployeeSelection />);

  await user.click(screen.getByText('1 mục đã chọn'));
  await user.type(screen.getByRole('textbox', { name: 'Tìm lựa chọn' }), 'Linh');
  await user.click(screen.getByRole('checkbox', { name: 'Linh' }));

  expect(screen.getByText('2 mục đã chọn')).toBeTruthy();
  expect(screen.getByText('An, Linh')).toBeTruthy();
});
