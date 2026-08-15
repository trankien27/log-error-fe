import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ConfigProvider} from 'antd';
import {Toaster} from 'sonner';
import App from './App.tsx';
import {useThemeStore} from './stores/useThemeStore';
import {getContrastColor, mixHexColors} from './features/theme/theme.utils';
import 'antd/dist/reset.css';
import './index.css';

const queryClient = new QueryClient();

function ApplicationRoot() {
  const theme = useThemeStore(state => state.theme);
  const loadTheme = useThemeStore(state => state.loadTheme);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  const primaryButtonText = getContrastColor(theme.primaryButtonColor);
  const secondaryButtonText = getContrastColor(theme.secondaryButtonColor);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: theme.primaryColor,
          colorPrimaryHover: mixHexColors(theme.primaryColor, '#000000', 0.12),
          colorPrimaryActive: mixHexColors(theme.primaryColor, '#000000', 0.24),
          colorText: theme.primaryTextColor,
          colorTextSecondary: theme.secondaryTextColor,
          fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
          borderRadius: 8,
        },
        components: {
          Button: {
            colorPrimary: theme.primaryButtonColor,
            colorPrimaryHover: mixHexColors(theme.primaryButtonColor, '#000000', 0.12),
            colorPrimaryActive: mixHexColors(theme.primaryButtonColor, '#000000', 0.24),
            primaryColor: primaryButtonText,
            defaultBg: theme.secondaryButtonColor,
            defaultColor: secondaryButtonText,
            defaultBorderColor: mixHexColors(theme.secondaryButtonColor, secondaryButtonText === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.35),
            defaultHoverBg: mixHexColors(theme.secondaryButtonColor, secondaryButtonText === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.1),
            defaultHoverColor: secondaryButtonText,
            defaultHoverBorderColor: mixHexColors(theme.secondaryButtonColor, secondaryButtonText === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.45),
            defaultActiveBg: mixHexColors(theme.secondaryButtonColor, secondaryButtonText === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.18),
            defaultActiveColor: secondaryButtonText,
            defaultActiveBorderColor: mixHexColors(theme.secondaryButtonColor, secondaryButtonText === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.5),
            controlHeight: 44,
            controlHeightLG: 48,
            fontWeight: 600,
            paddingInline: 20,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster richColors position="top-right" duration={2000} />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicationRoot />
  </StrictMode>,
);
