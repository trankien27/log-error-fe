import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeUploadDialog from './ThemeUploadDialog';

vi.mock('../../../services/api/themeToolsService', () => ({
  themeToolsService: {
    getUploadProfiles: vi.fn().mockResolvedValue([]),
  },
}));

const categories = [
  { id: 1, name: 'Tết Trung Thu', orderNo: 1, isActive: true },
  { id: 2, name: 'Sinh nhật', orderNo: 2, isActive: true },
];

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function renderDialog() {
  render(
    <ThemeUploadDialog
      open
      loading={false}
      categories={categories}
      themeLists={[]}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );
}

describe('Up frame category picker', () => {
  it('finds a Vietnamese category without accents and selects it in one click', async () => {
    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: /Danh mục.*Chọn danh mục/ })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Danh mục.*Chọn danh mục/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Tìm danh mục' }), {
      target: { value: 'tet trung' },
    });

    const options = within(screen.getByRole('listbox', { name: 'Danh mục' }));
    expect(options.getByRole('option', { name: 'Tết Trung Thu' })).toBeTruthy();
    expect(options.queryByRole('option', { name: 'Sinh nhật' })).toBeNull();

    fireEvent.click(options.getByRole('option', { name: 'Tết Trung Thu' }));
    expect(screen.getByRole('button', { name: /Danh mục.*Tết Trung Thu/ })).toBeTruthy();
    expect(screen.queryByRole('listbox', { name: 'Danh mục' })).toBeNull();
  });

  it('selects the highlighted search result with Enter', async () => {
    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: /Danh mục.*Chọn danh mục/ })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Danh mục.*Chọn danh mục/ }));
    const search = screen.getByRole('combobox', { name: 'Tìm danh mục' });
    fireEvent.change(search, { target: { value: 'sinh nhat' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(screen.getByRole('button', { name: /Danh mục.*Sinh nhật/ })).toBeTruthy();
  });
});
