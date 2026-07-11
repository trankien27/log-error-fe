import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ConfigProvider} from 'antd';
import {Toaster} from 'sonner';
import App from './App.tsx';
import 'antd/dist/reset.css';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          colorPrimaryHover: '#0958d9',
          colorPrimaryActive: '#003eb3',
          fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
          borderRadius: 8,
        },
        components: {
          Button: {
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
  </StrictMode>,
);
