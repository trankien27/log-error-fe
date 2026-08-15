import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import AuthPage from './features/auth/components/AuthPage';
import OverviewTab from './features/dashboard/components/OverviewTab';
import ErrorLogsTab from './features/logs/components/ErrorLogsTab';
import TransactionErrorQueueTab from './features/transaction-error-queue/components/TransactionErrorQueueTab';
import TasksTab from './features/tasks/components/TasksTab';
import RecentActivities from './features/tasks/components/RecentActivities';
import ChatTab from './features/chat/components/ChatTab';
import UsersTab from './features/users/components/UsersTab';
import RolesTab from './features/users/components/RolesTab';
import BoothsTab from './features/booths/components/BoothsTab';
import RemoteBoothTab from './features/remote-booth/components/RemoteBoothTab';
import PrintImageTab from './features/print-image/components/PrintImageTab';
import RecreateImageTab from './features/recreate-image/components/RecreateImageTab';
import ShiftsTab from './features/shifts/components/ShiftsTab';
import ListDictionariesTab from './features/list-dictionaries/components/ListDictionariesTab';
import NotificationsTab from './features/notifications/components/NotificationsTab';
import ScheduleTab from './features/schedule/components/ScheduleTab';
import OvertimeApprovalTab from './features/overtime/components/OvertimeApprovalTab';
import SettingsTab from './features/settings/components/SettingsTab';
import BoothGuestLayout from './features/booth-guest/components/BoothGuestLayout';
import BoothPinPage from './features/booth-guest/components/BoothPinPage';
import { useAuthStore } from './stores/useAuthStore';
import { useBoothGuestStore } from './stores/useBoothGuestStore';

// ProtectedRoute helper to guard routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore();
  return isLoggedIn ? <>{children}</> : <Navigate to="/auth" replace />;
}

// Phien booth bang ma PIN: chua xac thuc thi quay ve man nhap PIN.
function BoothGuestRoute({ children }: { children: React.ReactNode }) {
  const { isBoothGuest } = useBoothGuestStore();
  return isBoothGuest ? <>{children}</> : <Navigate to="/booth/pin" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { hasAnyRole } = useAuthStore();
  return hasAnyRole([1, 'Admin']) ? <>{children}</> : <Navigate to="/overview" replace />;
}

function OvertimeApprovalRoute({ children }: { children: React.ReactNode }) {
  const { hasAnyRole } = useAuthStore();
  return hasAnyRole([1, 3, 'Admin', 'ITSupportManager']) ? <>{children}</> : <Navigate to="/schedule" replace />;
}

function NotITSupportRoute({ children }: { children: React.ReactNode }) {
  const { getCurrentRoleNumber } = useAuthStore();
  return getCurrentRoleNumber() !== 2 ? <>{children}</> : <Navigate to="/overview" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Che do booth: xac thuc bang ma PIN, chi vao 2 man in anh / tao lai anh */}
      <Route path="/booth/pin" element={<BoothPinPage />} />
      <Route
        path="/booth"
        element={(
          <BoothGuestRoute>
            <BoothGuestLayout />
          </BoothGuestRoute>
        )}
      >
        <Route index element={<Navigate to="/booth/print-image" replace />} />
        <Route path="print-image" element={<PrintImageTab />} />
        <Route path="recreate-image" element={<RecreateImageTab />} />
      </Route>

      {/* Protected Dashboard Layout Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Default route redirects to overview */}
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<OverviewTab />} />
        <Route path="error-logs" element={<ErrorLogsTab />} />
        <Route path="transaction-error-queue" element={<TransactionErrorQueueTab />} />
        <Route path="tasks" element={<TasksTab />} />
        <Route
          path="recent-activities"
          element={(
            <AdminRoute>
              <RecentActivities />
            </AdminRoute>
          )}
        />
        <Route path="chat" element={<ChatTab />} />
        <Route
          path="users"
          element={(
            <AdminRoute>
              <UsersTab />
            </AdminRoute>
          )}
        />
        <Route
          path="roles"
          element={(
            <AdminRoute>
              <RolesTab />
            </AdminRoute>
          )}
        />
        <Route path="booths" element={<BoothsTab />} />
        <Route path="remote-booth" element={<RemoteBoothTab />} />
        <Route path="print-image" element={<PrintImageTab />} />
        <Route path="recreate-image" element={<RecreateImageTab />} />
        <Route
          path="shifts"
          element={(
            <NotITSupportRoute>
              <ShiftsTab />
            </NotITSupportRoute>
          )}
        />
        <Route path="list-dictionaries" element={<ListDictionariesTab />} />
        <Route path="list-dictionaries/:code" element={<ListDictionariesTab />} />
        <Route path="notifications" element={<NotificationsTab />} />
        <Route path="schedule" element={<ScheduleTab />} />
        <Route
          path="overtime-approval"
          element={(
            <OvertimeApprovalRoute>
              <OvertimeApprovalTab />
            </OvertimeApprovalRoute>
          )}
        />
        <Route path="settings" element={<SettingsTab />} />
      </Route>

      {/* Catch-all redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
