import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import AuthPage from './features/auth/components/AuthPage';
import OverviewTab from './features/dashboard/components/OverviewTab';
import ErrorLogsTab from './features/logs/components/ErrorLogsTab';
import TasksTab from './features/tasks/components/TasksTab';
import ChatTab from './features/chat/components/ChatTab';
import UsersTab from './features/users/components/UsersTab';
import RolesTab from './features/users/components/RolesTab';
import BoothsTab from './features/booths/components/BoothsTab';
import NotificationsTab from './features/notifications/components/NotificationsTab';
import ScheduleTab from './features/schedule/components/ScheduleTab';
import SettingsTab from './features/settings/components/SettingsTab';
import { useAuthStore } from './stores/useAuthStore';

// ProtectedRoute helper to guard routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore();
  return isLoggedIn ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/auth" element={<AuthPage />} />

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
        <Route path="tasks" element={<TasksTab />} />
        <Route path="chat" element={<ChatTab />} />
        <Route path="users" element={<UsersTab />} />
        <Route path="roles" element={<RolesTab />} />
        <Route path="booths" element={<BoothsTab />} />
        <Route path="notifications" element={<NotificationsTab />} />
        <Route path="schedule" element={<ScheduleTab />} />
        <Route path="settings" element={<SettingsTab />} />
      </Route>

      {/* Catch-all redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
