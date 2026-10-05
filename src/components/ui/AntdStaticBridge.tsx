import { useEffect } from 'react';
import { App } from 'antd';
import { registerModalApi } from './confirm';

/** Exposes the themed antd modal API to non-component code (see confirmAction). */
export default function AntdStaticBridge() {
  const { modal } = App.useApp();

  useEffect(() => {
    registerModalApi(modal);
  }, [modal]);

  return null;
}
