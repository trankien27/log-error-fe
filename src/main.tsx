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

  const primaryButtonText = theme.onPrimaryColor;
  const secondaryButtonText = getContrastColor(theme.secondaryButtonColor);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: theme.primaryColor,
          colorPrimaryHover: theme.primaryHoverColor,
          colorPrimaryActive: theme.primaryActiveColor,
          colorText: theme.primaryTextColor,
          colorTextSecondary: theme.secondaryTextColor,
          colorTextDisabled: theme.secondaryTextColor,
          colorBgBase: theme.backgroundColor,
          colorBgLayout: theme.backgroundColor,
          colorBgContainer: theme.surfaceColor,
          colorBgElevated: theme.surfaceColor,
          colorBgContainerDisabled: theme.surface2Color,
          colorFillSecondary: theme.surface2Color,
          colorBorder: theme.outlineVariantColor,
          colorBorderSecondary: theme.outlineVariantColor,
          colorError: theme.errorColor,
          colorErrorBg: theme.errorContainerColor,
          colorSuccess: theme.successColor,
          colorSuccessBg: theme.successContainerColor,
          colorWarning: theme.warningColor,
          colorWarningBg: theme.warningContainerColor,
          fontFamily: theme.fontSans,
          fontFamilyCode: theme.fontMono,
          borderRadius: 8,
        },
        components: {
          Button: {
            colorPrimary: theme.primaryButtonColor,
            colorPrimaryHover: theme.primaryHoverColor,
            colorPrimaryActive: theme.primaryActiveColor,
            colorBgContainerDisabled: theme.primaryDisabledColor,
            colorTextDisabled: getContrastColor(theme.primaryDisabledColor),
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
