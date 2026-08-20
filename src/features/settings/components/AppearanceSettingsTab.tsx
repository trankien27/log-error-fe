import ThemeSettingsSection from './ThemeSettingsSection';

export default function AppearanceSettingsTab() {
  return (
    <div className="space-y-6 text-left text-on-surface animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-on-surface font-sans">Cài đặt giao diện hệ thống</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          Chọn bộ giao diện, màu sắc và font chữ áp dụng chung (global) cho toàn hệ thống — mọi người dùng sẽ thấy sau khi tải lại trang.
        </p>
      </div>

      <ThemeSettingsSection />
    </div>
  );
}
