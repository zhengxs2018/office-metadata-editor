import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@/components/theme-provider.tsx';
import { APP_WINDOW_TITLE } from '@/lib/app-config';
import { loadConfiguration } from '@/lib/configuration';
import '@/style/base.css';
import '@/style/chrome.css';
import App from '@/App.tsx';

document.title = APP_WINDOW_TITLE;

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}

// 先拉取配置再挂载，避免首帧读到空配置导致开关闪烁；
// 拉取失败时降级为内置默认值，不阻断应用启动。
loadConfiguration()
  .catch(error => {
    console.error('加载配置失败，使用内置默认值:', error);
  })
  .finally(mount);
