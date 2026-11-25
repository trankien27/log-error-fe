import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import ConfirmDialogHost from './components/ui/ConfirmDialogHost';
import { useThemeStore } from './stores/useThemeStore';
import { useColorModeStore } from './stores/useColorModeStore';
import './index.css';

const queryClient = new QueryClient();

function ApplicationRoot() {
  const loadTheme = useThemeStore(state => state.loadTheme);
  const colorMode = useColorModeStore(state => state.resolved);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <ConfirmDialogHost />
        <Toaster richColors position="top-right" duration={2500} theme={colorMode} closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicationRoot />
  </StrictMode>,
);
