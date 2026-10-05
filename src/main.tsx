import React, {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {App as AntdApp, ConfigProvider, theme as antdTheme} from 'antd';
import {Toaster} from 'sonner';
import App from './App.tsx';
import {useThemeStore} from './stores/useThemeStore';
import {useColorModeStore} from './stores/useColorModeStore';
import {getContrastColor, getEffectiveTheme, mixHexColors} from './features/theme/theme.utils';
import AntdStaticBridge from './components/ui/AntdStaticBridge';
import 'antd/dist/reset.css';
import './index.css';

const queryClient = new QueryClient();

function ApplicationRoot() {
  const sourceTheme = useThemeStore(state => state.theme);
  const loadTheme = useThemeStore(state => state.loadTheme);
  const colorMode = useColorModeStore(state => state.resolved);
  const theme = React.useMemo(() => getEffectiveTheme(sourceTheme), [sourceTheme, colorMode]);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  const primaryButtonText = theme.onPrimaryColor;
  const secondaryButtonText = getContrastColor(theme.secondaryButtonColor);

  return (
    <ConfigProvider
      theme={{
        algorithm: colorMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
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
          borderRadius: 10,
          controlHeight: 38,
          fontSize: 14,
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
            controlHeight: 38,
            controlHeightLG: 44,
            fontWeight: 500,
            paddingInline: 16,
          },
        },
      }}
    >
      <AntdApp component={false}>
        <AntdStaticBridge />
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <Toaster richColors position="top-right" duration={2500} theme={colorMode} closeButton />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicationRoot />
  </StrictMode>,
);
